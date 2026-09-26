import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Shared backend for both enquiry forms on the site: the main /contact-us
// form (components/contact-us/Row4.tsx) and the sitewide "Get a Quote" side
// panel (components/GetAQuote.tsx). Neither had a working submission path in
// this migration - the original WordPress forms posted to Avada/Fusion's own
// ajax handler, which doesn't exist here. One endpoint, differentiated by
// `formType`, rather than two near-identical routes.
//
// RESEND_API_KEY and CONTACT_TO_EMAIL are not set yet (see .env.example) -
// until they are, this responds with a clear "not configured" error instead
// of crashing, so the forms can be wired up and tested end-to-end before the
// real key exists.

const TO_EMAIL = process.env.CONTACT_TO_EMAIL || "info@doorworldfactory.com";
const BCC_EMAIL = process.env.CONTACT_BCC_EMAIL || "info.thelotusroots@gmail.com";
const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL || "Secure House Website <onboarding@resend.dev>";

type ContactPayload = {
  formType: "contact";
  name: string;
  email: string;
  phone: string;
  message: string;
};

type QuotePayload = {
  formType: "quote";
  interests: string[];
  enquiry: string;
  name: string;
  email: string;
  phone: string;
  address: string;
};

type Payload = ContactPayload | QuotePayload;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Every field below comes straight from the request body and is interpolated
// into an HTML email - escape it first, or a submitter can inject arbitrary
// markup/links into emails the team actually reads. Doesn't touch newlines
// (message/enquiry are meant to be multi-line, converted to <br /> later).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The subject line is built from `payload.name` - strip newlines/control
// chars there specifically, or a crafted name could inject extra email
// headers rather than just render oddly.
function sanitizeForSubject(value: string): string {
  return escapeHtml(value.replace(/[\r\n]+/g, " ")).trim();
}

function validate(payload: Partial<Payload>): string | null {
  if (payload.formType === "contact") {
    if (!isNonEmptyString(payload.name)) return "Name is required.";
    if (!isNonEmptyString(payload.email)) return "Email is required.";
    if (!isNonEmptyString(payload.phone)) return "Contact phone is required.";
    return null;
  }
  if (payload.formType === "quote") {
    if (!isNonEmptyString(payload.enquiry)) return "Your enquiry is required.";
    if (!isNonEmptyString(payload.name)) return "Name is required.";
    if (!isNonEmptyString(payload.email)) return "Email is required.";
    if (!isNonEmptyString(payload.phone)) return "Phone number is required.";
    if (!isNonEmptyString(payload.address)) return "Full postal address is required.";
    return null;
  }
  return "Unknown form type.";
}

function renderEmail(payload: Payload): { subject: string; html: string } {
  if (payload.formType === "contact") {
    const message = escapeHtml(payload.message || "").replace(/\n/g, "<br />");
    return {
      subject: `New contact form enquiry from ${sanitizeForSubject(payload.name)}`,
      html: `
        <h2>New contact form enquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(payload.phone)}</p>
        <p><strong>Message:</strong></p>
        <p>${message || "(no message)"}</p>
      `,
    };
  }
  const interests = payload.interests.length
    ? payload.interests.map(escapeHtml).join(", ")
    : "(none selected)";
  const enquiry = escapeHtml(payload.enquiry).replace(/\n/g, "<br />");
  return {
    subject: `New quote request from ${sanitizeForSubject(payload.name)}`,
    html: `
      <h2>New "Get a Quote" request</h2>
      <p><strong>Interested in:</strong> ${interests}</p>
      <p><strong>Enquiry:</strong></p>
      <p>${enquiry}</p>
      <p><strong>Name:</strong> ${escapeHtml(payload.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(payload.phone)}</p>
      <p><strong>Postal address:</strong> ${escapeHtml(payload.address)}</p>
    `,
  };
}

export async function POST(request: NextRequest) {
  let payload: Partial<Payload>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const validationError = validate(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "[/api/enquiry] RESEND_API_KEY is not set - see .env.example. Form submission was validated but no email was sent.",
    );
    return NextResponse.json(
      { error: "Email sending is not configured yet. Please call us instead." },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);
  const { subject, html } = renderEmail(payload as Payload);

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      bcc: BCC_EMAIL,
      replyTo: (payload as Payload).email,
      subject,
      html,
    });

    if (error) {
      console.error("[/api/enquiry] Resend returned an error:", error);
      return NextResponse.json({ error: "Failed to send your message. Please try again later." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/enquiry] Unexpected error sending email:", err);
    return NextResponse.json({ error: "Failed to send your message. Please try again later." }, { status: 500 });
  }
}
