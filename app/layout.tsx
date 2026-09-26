import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./theme-globals.css";
import "./fonts.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ScrollReveal from "../components/ScrollReveal";
import AccordionToggle from "../components/AccordionToggle";
import GalleryLoadMore from "../components/GalleryLoadMore";
import TestimonialsCarousel from "../components/TestimonialsCarousel";
import GetAQuote from "../components/GetAQuote";
import { DEFAULT_OG_IMAGE } from "../lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL("https://secure-house.co.uk"),
  title: "Secure House",
  description: "Bespoke Security Doors",
  openGraph: {
    siteName: "Secure House",
    type: "website",
    locale: "en_GB",
    title: "Secure House",
    description: "Bespoke Security Doors",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure House",
    description: "Bespoke Security Doors",
    images: [DEFAULT_OG_IMAGE.url],
  },
};

// Mobile-only white strip down the right edge of the hero.
//
// Avada's full-bleed rows (".fusion-builder-row", width:104% with -2%
// side margins - a deliberate negative-gutter technique, see Header.tsx)
// stick out ~2% past the viewport on each side. <html>/<body> already clip
// that so it can't be scrolled to, but Chrome/Safari on mobile compute the
// page's *shrink-to-fit* scale from the widest laid-out element, and that
// calculation ignores overflow clipping entirely (verified: switching
// <html> from overflow-x:hidden to overflow-x:clip changes nothing).
// With no minimum-scale declared, the default floor is 0.25, so the browser
// happily renders the page at ~0.98 to "fit" that 102%-wide content: the
// layout viewport ends up ~2% narrower than the visual viewport, and the
// uncovered band on the right paints as the page canvas - white, because
// that's <html>'s background colour. It's there on every page, but only
// visible where the content behind it is dark, i.e. the homepage hero,
// which is why scrolling past the hero "fixes" it.
//
// minimum-scale=1 pins the floor at 100%, so layout and visual viewport
// match and there is nothing left to paint. No maximum-scale and no
// user-scalable=no here on purpose - this only stops zooming *out* below
// 100%, pinch-to-zoom in stays unrestricted (WCAG 1.4.4).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      // Same reasoning as the inline overflow-x fix on <body> below:
      // app/globals.css's `html, body { overflow-x: hidden }` never ships
      // (globals.css isn't even imported anywhere - confirmed via grep), and
      // the browser's page-level horizontal scroll/swipe is governed by
      // <html>, not <body>. The <body> got this fix already; <html> never
      // did, which is exactly why the page could still be swiped left/right
      // even with <body> correctly clipped.
      //
      // overflowY: 'scroll' here is required, not optional: giving <html> an
      // explicit overflow-x stops the browser's normal "propagate the root
      // BODY's overflow to the viewport" behavior (a real CSS spec rule -
      // only happens while <html>'s own overflow is the default 'visible').
      // Avada's compiled CSS sets `body { overflow-y: scroll }` (a
      // permanently-reserved scrollbar gutter, avoiding layout shift between
      // short/tall pages). With propagation broken, that rule started
      // applying to <body> directly instead - making <body> its own nested
      // scroll container with its own reserved gutter, stacked on top of
      // <html>'s (now also its own scroll container, document.scrollingElement
      // is <html>) - two reserved gutters instead of one, which is exactly
      // the ~30px white vertical strip reported on the right edge on mobile.
      // Explicitly repeating the same overflow-y here (rather than leaving
      // it 'visible', its default) restores the single-scrollbar behavior
      // propagation used to give for free.
      style={{ overflowX: "hidden", overflowY: "scroll", maxWidth: "100vw" }}
    >
      <head>
        <meta name="google-site-verification" content="edxXEeyWtd6YDmc7jkuwID3cQnresUn5GIcq6hDwr_8" />
        <link rel="stylesheet" href="/fonts/fontawesome/all.min.css" />

        <style
          dangerouslySetInnerHTML={{
            __html: `
          /* Without this, mobile WebKit/Blink auto-inflates text size on
             narrow viewports (its own readability heuristic, layered on top
             of any font-size we set) - e.g. a 34px mobile heading rule was
             actually computing to 50px. Every responsive font-size fix
             assumes this is off. */
          html {
              -webkit-text-size-adjust: 100%;
              text-size-adjust: 100%;
          }
          body { font-family: 'Montserrat', sans-serif !important; }

          /* <html>'s overflow-y is forced to 'scroll' (not 'auto') in its
             inline style above - needed so it always owns the single real
             scroll container instead of leaving room for <body> to become
             its own nested one again (see the long comment there). 'scroll'
             means the browser reserves the gutter/draws the bar
             unconditionally, which is correct for layout but shows a bar
             users were never meant to see, especially on mobile. Hide it
             visually only - scrolling itself keeps working exactly the
             same, this is display only. */
          html {
              scrollbar-width: none; /* Firefox */
              -ms-overflow-style: none; /* old Edge/IE */
          }
          html::-webkit-scrollbar {
              display: none; /* Chrome/Safari/Blink */
          }

          /* Fix for Issue #2: Project card layout */
          .post-card-item {
              background-color: #333333 !important; /* Keep the grey backgound for the whole card */
          }

          /* /projects card redesign: text centered and pinned to the bottom of
             the card over a gradient scrim (was top-anchored, left-aligned,
             using per-card inline --awb-padding-top values of 200px+ inherited
             from the WordPress builder - those are zeroed out here so the text
             block's own flex/gradient layout controls position instead). */
          .post-card-item {
              padding: 0 !important;
              position: relative;
          }
          .post-card-item .fusion-column-wrapper {
              position: absolute !important;
              inset: 0 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: flex-end !important;
              align-items: center !important;
              text-align: center !important;
              padding: 30px !important;
              background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0) 75%) !important;
          }
          .post-card-item .fusion-title-heading,
          .post-card-item .project-category-subtitle {
              text-align: center !important;
          }

          /* Homepage "Our Projects" preview cards: scoped back OUT of the
             /projects redesign above. That redesign (centered text, dark
             gradient scrim) was built for /projects, where every card has a
             real photo behind the scrim - on the homepage these preview
             cards have no photo at all (a live-site data gap: WordPress's
             own post-cards widget never got real images on this specific
             homepage section either, confirmed against secure-house.co.uk),
             so the same treatment just produced a plain dark box with text
             stranded in the middle. Restored the live site's actual look
             instead: a lighter charcoal tone, bottom-left-aligned text, no
             heavy scrim (nothing to scrim against). Scoped to .home's own
             row so /projects and everything else is untouched. */
          .home .fusion-builder-row-10 .post-card-item {
              background-color: #55565a !important;
          }
          .home .fusion-builder-row-10 .post-card-item .fusion-column-wrapper {
              justify-content: flex-end !important;
              align-items: flex-start !important;
              text-align: left !important;
              padding: 32px 40px !important;
              background: linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 55%) !important;
          }
          .home .fusion-builder-row-10 .post-card-item .fusion-title-heading,
          .home .fusion-builder-row-10 .post-card-item .project-category-subtitle {
              text-align: left !important;
          }

          /* Fix for Issue #5: Navbar flexbox layout (Desktop) */
          .fusion-tb-header .fusion-builder-row-1 .fusion-builder-row-inner {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              flex-wrap: nowrap !important;
              width: 100% !important;
          }
          .fusion-tb-header .fusion-builder-row-1 .fusion-builder-row-inner > .fusion-layout-column {
              flex: 1 1 33.33% !important;
          }
          
          /* Fix for Issue #5: Navbar flexbox layout (Mobile) */
          .fusion-tb-header .fusion-builder-row-2 > .fusion-builder-row {
              display: flex !important;
              justify-content: space-between !important;
              align-items: center !important;
              flex-wrap: nowrap !important;
          }
          
          /* Force Swiper projects to display as static grid. Excludes
             .awb-image-carousel-wrapper (the homepage trust-logo marquee,
             styled separately below): this rule's transform: none
             !important was silently overriding the marquee's own
             @keyframes animation - the animation reported
             animationPlayState "running" the whole time, but !important
             beats a running CSS animation for the same property per spec,
             so the transform never visibly moved. Found 2026-09-12. */
          .swiper-wrapper:not(.awb-image-carousel-wrapper), .fusion-carousel-wrapper .fusion-carousel-inner {
              display: grid !important;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
              gap: 20px !important;
              transform: none !important;
              flex-wrap: wrap !important;
              opacity: 1 !important;
              visibility: visible !important;
          }
          .swiper-slide, .fusion-carousel-item {
              width: 100% !important;
              max-width: 100% !important;
              position: relative !important;
              display: block !important;
              opacity: 1 !important;
              visibility: visible !important;
          }

          /* Product-page "scroll section" cards (Communal Entrance Doors'
             "Versatility for every property type", grilles-shutters CX/SR
             rating cards, security-aluminium-windows benefit cards, etc.):
             this is a different Avada widget (awb-swiper-full-sections)
             from the generic .swiper-wrapper carousel handled above.
             Avada's own compiled CSS for this widget (see any page's
             fusion-styles/*.min.css) already ships a designed fallback for
             exactly this no-JS case, selected via a class
             (.fusion-full-scroll-disabled) that only real Swiper JS ever
             adds - so it never fires here. Replicating its 3 rules
             directly instead of guessing our own: (1) .swiper-wrapper
             starts at display:none until JS marks it .swiper-ready, so it
             needs unhiding; (2) each card's outer section carries
             .hundred-percent-height, which Avada's real CSS clamps to
             calc(100vh - adminbar-height) regardless of content - taller
             cards then overflowed that box and the next card started
             inside the clamped height, overlapping the overflow (this is
             what broke the first attempt at this fix - see
             CHANGES-NEEDED.md); height:auto here removes the clamp so each
             card is exactly as tall as its own content. Higher specificity
             than the generic .swiper-wrapper rule above. */
          .awb-swiper-full-sections {
              height: auto !important;
          }
          .awb-swiper-full-sections > .swiper-wrapper {
              display: block !important;
          }
          .awb-swiper-full-sections .hundred-percent-height {
              height: auto !important;
          }
          .awb-swiper-full-sections .swiper-slide {
              width: 100% !important;
              margin-bottom: 40px;
          }

          /* Homepage trust-logo carousel: CSS-only infinite marquee, scoped
             to just this one carousel (higher specificity than the generic
             .swiper-wrapper grid rule above, which every other carousel/
             slider on the site still needs). The real Swiper JS that would
             normally drive this never runs here (same root cause as the
             scroll-stack sections - see DECISIONS.md).

             Two-collection technique (source: stackoverflow.com/a/65485329,
             Albert Fernández Martínez, CC BY-SA 4.0) instead of a plain
             translateX(-50%) on one flat duplicated row: the outer track
             (.awb-image-carousel-wrapper) slides left continuously while
             item-collection-1 - the first of the two logo groups inside it,
             see TrustLogos.tsx - independently jumps from left:0% to
             left:100% at the exact halfway point of the same-length
             animation. The jump is timed to exactly cancel out the distance
             the track has already slid, so collection-1 reappears seamlessly
             right after collection-2, forever. Doesn't depend on the two
             collections being pixel-identical widths (the earlier -50%
             approach did, and a lazyload/srcSet width mismatch between the
             two logo sets broke it once already - see CHANGES-NEEDED.md). */
          .awb-image-carousel-wrapper {
              display: inline-flex !important;
              flex-wrap: nowrap !important;
              width: max-content !important;
              animation: awb-logo-marquee 22s linear infinite;
          }
          .awb-image-carousel-wrapper:hover,
          .awb-image-carousel-wrapper:hover .item-collection-1 {
              animation-play-state: paused;
          }
          .item-collection-1,
          .item-collection-2 {
              display: flex !important;
              flex-wrap: nowrap !important;
          }
          .item-collection-1 {
              position: relative;
              left: 0%;
              animation: awb-logo-swap 22s linear infinite;
          }
          .awb-image-carousel-wrapper .swiper-slide {
              width: auto !important;
              flex: 0 0 auto !important;
              padding: 0 34px;
              display: flex !important;
              align-items: center !important;
          }
          @keyframes awb-logo-marquee {
              from { transform: translateX(0); }
              to { transform: translateX(-100%); }
          }
          @keyframes awb-logo-swap {
              0%, 50% { left: 0%; }
              50.01%, 100% { left: 100%; }
          }

          /* CSS-only scroll-in reveal for Avada's "scroll-stack" Swiper
             sections (data-animation="stack") - the real Swiper-driven
             stack/rotate animation stays out of scope (see DECISIONS.md,
             "the Swiper carousel decision"), but this adds real motion on
             top of the static grid above instead of content just
             appearing. ScrollReveal.tsx (mounted in this layout) adds the
             .scroll-revealed class via IntersectionObserver as each card
             scrolls into view. */
          .fusion-scroll-section .swiper-slide {
              opacity: 0 !important;
              transform: translateY(48px) !important;
              transition: opacity 0.7s ease, transform 0.7s ease !important;
          }
          .fusion-scroll-section .swiper-slide.scroll-revealed {
              opacity: 1 !important;
              transform: translateY(0) !important;
          }

          /* Safety net for FAQ/"Read more" accordion toggles (AccordionToggle.tsx
             adds the click behavior). Each page's own compiled Avada CSS
             already defines these two rules, but this guarantees correct
             collapsed/expanded behavior even if a given page's bundle
             doesn't happen to include them. */
          .panel-collapse.collapse:not(.in) {
              display: none !important;
          }
          .panel-collapse.collapse.in {
              display: block !important;
          }

          /* Map missing Avada social icons to FontAwesome */
          .awb-icon-facebook:before, .fusion-icon-facebook:before { content: "\\f09a" !important; font-family: "Font Awesome 6 Brands" !important; }
          .awb-icon-instagram:before, .fusion-icon-instagram:before { content: "\\f16d" !important; font-family: "Font Awesome 6 Brands" !important; }
          .awb-icon-youtube:before, .fusion-icon-youtube:before { content: "\\f167" !important; font-family: "Font Awesome 6 Brands" !important; }
          .awb-icon-twitter:before, .fusion-icon-twitter:before { content: "\\f099" !important; font-family: "Font Awesome 6 Brands" !important; }
          .awb-icon-linkedin:before, .fusion-icon-linkedin:before { content: "\\f08c" !important; font-family: "Font Awesome 6 Brands" !important; }
          .awb-icon-pinterest:before, .fusion-icon-pinterest:before { content: "\\f0d2" !important; font-family: "Font Awesome 6 Brands" !important; }

          /* Fix for Issue #6: Avada "liftup" hover-image background never gets sized.
             The theme's own compiled CSS (never migrated) normally gives
             .fusion-column-inner-bg-image its box; without it the element is
             0x0 and its background-image never paints (seen on /products/ and
             other pages using this component). */
          .fusion-column-inner-bg-image {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
          }

          /* Fix: door/window/garage-door card titles were unreadable (black text
             directly on the photo). Each card already carries the real white
             scrim gradient in --awb-inner-bg-image (set inline by the scrape)
             for exactly this purpose, but nothing applied it as an actual
             background - only the photo itself got painted. Layer it onto the
             text wrapper that already sits on top of the photo. */
          .fusion-column-liftup-border > .fusion-column-wrapper {
            background-image: var(--awb-inner-bg-image) !important;
            background-size: var(--awb-inner-bg-size, cover) !important;
            background-repeat: no-repeat !important;
            background-position: bottom center !important;
          }

          /* Phase 2: Add missing hover states for product/door cards */
          .fusion-column-liftup-border {
            transition: transform 0.3s ease, box-shadow 0.3s ease !important;
          }
          .fusion-column-liftup-border:hover {
            transform: translateY(-10px) !important;
            box-shadow: 0 15px 30px rgba(0,0,0,0.15) !important;
            z-index: 10 !important;
          }
          .hover-type-liftup {
            transition: transform 0.3s ease, box-shadow 0.3s ease !important;
          }
          .hover-type-zoomin .fusion-column-inner-bg-image {
            transition: transform 0.5s ease !important;
          }
          .fusion-column-liftup-border:hover .hover-type-zoomin .fusion-column-inner-bg-image,
          .post-card-item:hover .fusion-column-inner-bg-image {
            transform: scale(1.05) !important;
          }

          /* Fix for Issue #7: Post-card filter tabs (All/Commercial/Residential)
             never appear. Avada's own CSS hides them by default (display:none)
             and only reveals them via a JS-added state on desktop - that JS
             never runs in this static migration, so the tabs stayed invisible
             on every page using a Fusion post-cards grid (e.g. /projects). */
          .fusion-filters {
            display: flex !important;
          }

          /* Fix: Fusion image galleries (Avada "fusion-gallery" widget, used on
             23 pages) never show any images. Avada's own CSS hides every
             .fusion-gallery-column by default and only reveals them via
             isotope/imagesloaded JS that never runs in this static migration -
             same root cause as the .fusion-filters issue above. */
          .fusion-gallery .fusion-gallery-column {
            display: block !important;
            float: left !important;
          }
          .fusion-gallery:after {
            content: "";
            display: table;
            clear: both;
          }

          /* Fix: Avada's scroll-triggered entrance animations (elements with
             data-animationtype, marked with class "fusion-animated") start
             visibility:hidden and are only revealed by an IntersectionObserver
             JS that never runs in this static migration, so any content using
             this feature stayed permanently invisible (found on 7 pages,
             including about-us and the sectional-garage-doors product-card
             section restored today). Same root cause as the two fixes above. */
          .fusion-animated {
            visibility: visible !important;
          }

          /* Phase 2: Add text-shadow/scrim to improve legibility on busy hero images */
          .fusion-column-has-bg-image .fusion-title-heading,
          .fusion-column-has-bg-image-small .fusion-title-heading,
          .fusion-builder-row-3 .fusion-title-heading,
          .fusion-builder-row-1 .fusion-title-heading {
            text-shadow: 0 4px 25px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6) !important;
          }
          /* The rule above is meant for real photo heroes; it was also
             matching two cases where it just adds an ugly dark glow:
             - door/window/garage-door card titles (now have their own white
               scrim background from the fix above, so a black shadow just
               looks wrong on top of it)
             - a small decorative logo image used as a card background on
               /projects (marked with .fusion-decorative-bg), not a photo */
          .fusion-column-liftup-border .fusion-title-heading,
          .fusion-decorative-bg .fusion-title-heading {
            text-shadow: none !important;
          }

          /* Fix: self-hosted YouTube embeds (6 pages) render on top of the
             section right after them. This is the standard responsive-iframe
             "padding-top: X%" trick (used by .fluid-width-video-wrapper) -
             it only works when the wrapper is positioned and the iframe is
             pulled out of flow with position:absolute; that CSS was never
             migrated, so the wrapper collapsed instead of reserving space. */
          .fluid-width-video-wrapper {
            position: relative !important;
          }
          .fluid-width-video-wrapper iframe {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }

          /* Fix: the footer's "Our Services" column (added alongside Quick
             Links/About Us) inherited the page's base 18px/bold-heading
             styling instead of matching the rest of the footer's nav menus
             (16px, weight 400, 24px line-height) - the compiled per-page
             Avada CSS sets font-size on <li>/<a> with !important, which
             beats a plain inline style, so this needs !important too. */
          nav[aria-label="Footer services menu"] li,
          nav[aria-label="Footer services menu"] a {
            font-size: 16px !important;
            font-weight: 400 !important;
            line-height: 24px !important;
            font-family: "Montserrat", Arial, Helvetica, sans-serif !important;
          }

          /* Fix: footer columns collapse to one full-width column at
             <=1024px (confirmed - matches secure-house.co.uk's own
             behavior at this width, not a migration bug), but only the
             logo column was ever centered (fusion-flex-justify-content-
             center). Every other column - phone/email/address, and all
             3 nav menus - kept its desktop flex-start alignment, so once
             stacked they hang off the left edge under a centered logo:
             lopsided, not "not aligned with each other" by accident but
             by an unfinished responsive rule. Centering everything so
             the stacked footer reads as one deliberate column. */
          @media (max-width: 1024px) {
            .fusion-tb-footer .fusion-builder-row-13 .fusion-column-wrapper {
              align-items: center !important;
              justify-content: center !important;
              text-align: center !important;
            }
            .fusion-tb-footer .fusion-builder-row-13 nav[aria-label="Footer services menu"] ul {
              align-items: center !important;
              text-align: center !important;
            }
            /* "Quick Links" and "Footer left menu" are Avada's awb-menu
               component - its compiled CSS reads justify-content off this
               custom property (set inline in Footer.tsx as flex-start for
               the desktop row layout) rather than a plain class, so
               align-items/text-align above never reached it. */
            .fusion-tb-footer .fusion-builder-row-13 nav[aria-label="Footer middle menu"],
            .fusion-tb-footer .fusion-builder-row-13 nav[aria-label="Footer left menu"] {
              --awb-main-justify-content: center !important;
            }
            .fusion-tb-footer .fusion-builder-row-13 nav[aria-label="Footer middle menu"] .awb-menu__main-ul,
            .fusion-tb-footer .fusion-builder-row-13 nav[aria-label="Footer left menu"] .awb-menu__main-ul {
              justify-content: center !important;
              text-align: center !important;
            }
          }

          /* Homepage mobile responsiveness pass. The hero heading has its
             own mobile rule (HeroSlider.module.css, @media max-width:782px,
             34px) but it never actually wins: this <h1> also matches a
             legacy Avada rule from the page's own compiled CSS
             (".post-content h1 { font-size: var(--h1_typography-font-size) }"),
             whose specificity (0,1,1 - a class + a type selector) beats the
             module's single class selector (0,1,0) regardless of source
             order, so the fixed 50px design-token value from that var()
             wins instead of the module's responsive size. Reinforcing the
             module's own already-correct intended value here, with
             sufficient specificity/!important to actually win - using an
             attribute-substring selector rather than the exact hashed class
             name, since CSS Modules class hashes aren't guaranteed stable
             across builds. */
          @media (max-width: 782px) {
            [class*="HeroSlider-module"][class*="__heading"] {
              font-size: 34px !important;
            }
          }

          /* Mobile menu trigger icon. Header.tsx's row-2 (the mobile-only
             header - logo + phone, already correctly shown/hidden per
             breakpoint by Avada's own real CSS, see DECISIONS.md-style note
             in the component) has a genuine, correctly-positioned off-canvas
             trigger anchor already scraped from the live site (3rd column,
             ordered after the logo and phone icon) - but it was only ever a
             bare anchor wrapping an empty "background-image" span, meant to
             get a hamburger icon graphic from Avada's off-canvas JS/CSS that
             this migration never pulls in, so it rendered as an invisible,
             zero-content tap target. Header.tsx's href was changed from its
             scraped value to #mobile-menu-trigger to reuse the click-wiring
             already built for the (desktop-only, still correctly hidden on
             mobile) "Products" button - see Header.tsx. This just sizes the
             tap target; the bars themselves are drawn in Header.tsx, and
             row-2's own existing responsive classes already handle showing
             it only on mobile. */
          a[href="#mobile-menu-trigger"] {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 44px !important;
            height: 44px !important;
            /* Two alignment problems this anchor can't solve on its own:
               1. Vertical. This anchor doesn't live in the column's in-flow
                  wrapper (that wrapper is empty) - it lives inside Avada's
                  absolutely-positioned .fusion-column-inner-bg overlay, and
                  the column itself collapses to 1px tall for want of in-flow
                  content. So a 44px anchor starting at the column's top edge
                  hung ~21px BELOW the row's centre line, while the logo and
                  the phone icon both sit on it. Pinning to top:50% of that
                  1px overlay puts it exactly on the centre line (verified:
                  all three now share a 40.1px centre y at 440px wide).
               2. Horizontal. Row-2 is one of the 104%-wide full-bleed rows
                  (see the white-strip note on the viewport export above), so
                  this last column's right edge sits ~2% of the viewport OFF
                  the right of the screen - and the icon, correctly centred
                  in that column, ended up ~3px from the screen edge. 2vw is
                  exactly that bleed (the row's parent is full-width, so 2%
                  of it and 2vw are the same number at every width), so
                  "2vw + 10px" backs the icon out of the bleed and leaves a
                  real ~20px gutter to the screen edge. */
            position: absolute !important;
            top: 50% !important;
            right: calc(2vw + 10px) !important;
            transform: translateY(-50%) !important;
          }
          /* The three bars are drawn by real <div>s in Header.tsx now, not by
             pseudo-elements on this leftover scraped span. This rule used to
             draw a second, older icon here (::before with a box-shadow clone
             plus ::after = 3 more bars) - and it never even got the geometry
             it asked for: Avada's own compiled CSS
             (.fusion-column-inner-bg .fusion-column-anchor span) forces this
             span to position:absolute/inset:0, beating the position:relative
             + 24x18 this rule declared, so it computed to 46x1 and collapsed
             its three bars into a ~2-bar smear sitting on top of the real
             icon - the "5 lines" hamburger. The span carries no content of
             its own (Avada fills it via a background-image this migration
             doesn't ship), so hiding it outright is the fix, not restyling it. */
          a[href="#mobile-menu-trigger"] .fusion-column-inner-bg-image {
            display: none !important;
          }

          /* Full-screen mobile menu panel: its 4-column layout
             (grid-template-columns: 25% 25% 22% 28%) and 50/100/90/130px
             padding are set as inline styles in Header.tsx, hard-coded for
             desktop off-canvas use (the source is a verbatim port of the
             real site's off-canvas menu markup - see the comment there) -
             there was never a mobile variant. !important is required to
             beat an inline style regardless of selector specificity. */
          @media (max-width: 640px) {
            .mobile-menu-active nav[aria-label="Mobile menu"] {
              padding: 80px 24px 40px !important;
            }
            .mobile-menu-active nav[aria-label="Mobile menu"] > div:first-child {
              display: flex !important;
              flex-direction: column !important;
              gap: 48px !important;
            }
            /* The email/phone contact bar is a separate sibling div, also
               absolutely positioned (bottom:40px) assuming a fixed-height
               desktop panel - on mobile the stacked content above is much
               taller, so it needs to flow after that content instead of
               floating at a fixed spot and getting overlapped. */
            .mobile-menu-active nav[aria-label="Mobile menu"] > div:last-child {
              position: static !important;
              left: auto !important;
              right: auto !important;
              bottom: auto !important;
              flex-direction: column !important;
              align-items: flex-start !important;
              margin-top: 40px !important;
              padding-bottom: 40px !important;
            }
          }

          /* Homepage "Luxurious Security Doors" video slide (.tfs-slider,
             the only element on the whole site using className="slides" -
             confirmed via grep). This is Avada's FlexSlider-pattern widget:
             its own real CSS hides every <li class="slides"> by default and
             only ever reveals the active one by adding a class via
             FlexSlider's JS, which this migration never loads - so the
             slide (and the video inside it) was permanently display:none,
             collapsing to 0x0 and showing nothing but the page's white
             background behind the "Loading..." spinner that (also JS-driven)
             never gets hidden either. This slider has exactly one slide, so
             forcing it visible is the correct fix, not a workaround. */
          .tfs-slider .slides li {
            display: block !important;
          }
        `,
          }}
        />
      </head>
      <body
        className="wp-singular page-template page-template-100-width page-template-100-width-php page wp-theme-Avada edd-js-none fusion-image-hovers fusion-pagination-sizing fusion-button_type-flat fusion-button_span-yes fusion-button_gradient-linear avada-image-rollover-circle-no avada-image-rollover-yes avada-image-rollover-direction-fade fusion-body ltr no-tablet-sticky-header no-mobile-sticky-header no-mobile-slidingbar fusion-disable-outline fusion-sub-menu-fade mobile-logo-pos-left layout-wide-mode avada-has-boxed-modal-shadow-none layout-scroll-offset-full avada-has-zero-margin-offset-top fusion-top-header menu-text-align-center mobile-menu-design-modern fusion-show-pagination-text fusion-header-layout-v6 avada-responsive avada-footer-fx-none avada-menu-highlight-style-bar fusion-search-form-classic fusion-main-menu-search-dropdown fusion-avatar-square avada-sticky-shrinkage avada-blog-layout-large avada-blog-archive-layout-large avada-header-shadow-no avada-menu-icon-position-left avada-has-mainmenu-dropdown-divider avada-has-header-100-width avada-has-mobile-menu-search avada-has-main-nav-search-icon avada-has-100-footer avada-has-titlebar-hide avada-header-border-color-full-transparent avada-social-full-transparent avada-has-pagination-padding avada-flyout-menu-direction-fade avada-ec-views-v1 awb-link-decoration"
        // Inline, not just app/globals.css's `html, body { overflow-x:
        // hidden }`: confirmed that rule is missing from the compiled CSS
        // chunk on routes with no Avada-ported page (industrial-style-doors,
        // /blog & /inspiration via BlogPostTemplate) - those pages never
        // had one of the per-page fusion-styles bundles that redundantly
        // re-declare this same reset, which is the only reason it was ever
        // masked elsewhere. The header's own row markup intentionally
        // overflows its box by ~4% (a real Avada full-bleed technique, see
        // Header.tsx) and relies on an ancestor clipping it - inline here so
        // it can never be dropped by CSS chunking again, on any route.
        //
        // overflowY: 'visible' is required here too - see the long comment
        // on <html>'s style above. Avada's own CSS sets `body { overflow-y:
        // scroll }`; left alone, that makes body its own independent
        // vertical scroll container (with its own reserved scrollbar
        // gutter) stacked on top of <html>'s, which is the actual root
        // scroller. Overriding it back to 'visible' here keeps body from
        // competing with <html> for that role - single scrollbar, not two.
        style={{ overflowX: "clip" as "hidden", overflowY: "visible", maxWidth: "100vw" }}
        suppressHydrationWarning
      >
        {/* Google Analytics 4 - Secure House LTD - GA4 property, measurement
            ID G-PC354BRBBF, confirmed real (unlike the GTM container ID
            below, still a placeholder pending Priyanka). */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-PC354BRBBF" strategy="afterInteractive" />
        <Script id="google-analytics-ga4" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PC354BRBBF');
          `}
        </Script>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-XXXXXXX'); // TODO: replace with real GTM container ID from Priyanka
          `}
        </Script>
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "ync7h4tu0m");
          `}
        </Script>
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
          }}
        />
        {/* TODO: replace GTM-XXXXXXX above with real GTM container ID from Priyanka */}
        {/* Tawk.to live chat - property ID confirmed from the live secure-house.co.uk
            site (embed.tawk.to/5dcaa5a1d96992700fc70d72/default), unlike the GTM/Clarity
            IDs above which are still placeholders. Loaded lazily since chat is not
            needed for first paint or interactivity. */}
        <Script id="tawk-to" strategy="lazyOnload">
          {`
            var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
            (function () {
              var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
              s1.async = true;
              s1.src = 'https://embed.tawk.to/5dcaa5a1d96992700fc70d72/default';
              s1.charset = 'UTF-8';
              s1.setAttribute('crossorigin', '*');
              s0.parentNode.insertBefore(s1, s0);
            })();
          `}
        </Script>
        <Header />
        {children}
        <Footer />
        <ScrollReveal />
        <AccordionToggle />
        <GalleryLoadMore />
        <TestimonialsCarousel />
        <GetAQuote />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
