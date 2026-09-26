import { NextRequest, NextResponse } from "next/server";

// Shared backend for both enquiry forms on the site: the main /contact-us
// form (components/contact-us/Row4.tsx) and the sitewide "Get a Quote" side
// panel (components/GetAQuote.tsx). Neither had a working submission path in
// this migration - the original WordPress forms posted to Avada/Fusion's own
// ajax handler, which doesn't exist here. One endpoint, differentiated by
// `formType`, rather than two near-identical routes.
//
// Sends via FormSubmit (https://formsubmit.co) instead of Resend - no API
// key to provision, just the destination email in the URL. FormSubmit does
// require one manual step per destination address: the first submission to
// a new address gets a confirmation email that has to be clicked before
// further submissions actually deliver.
//
// Hardcoded rather than read from process.env - env vars were causing
// delivery issues in prod. FormSubmit's only secondary-recipient option is
// `_cc` (https://formsubmit.co/ajax/<email>) - there is no `_bcc`, and CC
// exposes the address to whoever receives the email - so there is
// deliberately no second recipient here; only the Secure House inbox.
const TO_EMAIL = "info@secure-house.co.uk";
const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${encodeURIComponent(TO_EMAIL)}`;

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

// FormSubmit renders each field as plain text in its own table/box template
// (it doesn't interpret HTML in values), so unlike the old Resend-based
// version this only needs to strip newlines out of the subject line - a
// crafted name with embedded \r\n could otherwise inject extra email
// headers into the outgoing message.
function sanitizeForSubject(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
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

// Field names/order here are what actually shows up as rows in FormSubmit's
// "box" email template - not just internal metadata.
function buildFields(payload: Payload): { subject: string; fields: Record<string, string> } {
  if (payload.formType === "contact") {
    return {
      subject: `New contact form enquiry from ${sanitizeForSubject(payload.name)}`,
      fields: {
        Name: payload.name,
        Email: payload.email,
        Phone: payload.phone,
        Message: payload.message || "(no message)",
      },
    };
  }
  return {
    subject: `New quote request from ${sanitizeForSubject(payload.name)}`,
    fields: {
      "Interested in": payload.interests.length ? payload.interests.join(", ") : "(none selected)",
      Enquiry: payload.enquiry,
      Name: payload.name,
      Email: payload.email,
      Phone: payload.phone,
      "Postal address": payload.address,
    },
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

  const { subject, fields } = buildFields(payload as Payload);

  try {
    const response = await fetch(FORMSUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        ...fields,
        _subject: subject,
        _replyto: (payload as Payload).email,
        _template: "box",
        _captcha: "false",
      }),
    });

    if (!response.ok) {
      console.error("[/api/enquiry] FormSubmit returned an error:", response.status, await response.text());
      return NextResponse.json({ error: "Failed to send your message. Please try again later." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/enquiry] Unexpected error sending email:", err);
    return NextResponse.json({ error: "Failed to send your message. Please try again later." }, { status: 500 });
  }
}
