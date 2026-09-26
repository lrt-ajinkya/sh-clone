"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

export default function Header() {
	const [menuOpen, setMenuOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const [stuck, setStuck] = useState(false);
	const [hidden, setHidden] = useState(false);
	const [headerHeight, setHeaderHeight] = useState(0);
	const headerRef = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	// Pages with no hero photo directly under the header: the header's default
	// style floats transparently on top of a dark hero image, so on these
	// pages (plain cream background right at the top) it collided with the
	// breadcrumb/title instead of sitting on its own solid bar - same root
	// cause already fixed for /projects. Also covers pages that DO have a
	// hero photo but a bright one, where the floating white-on-transparent
	// header washes out into it - communal-entrance-doors and about-us,
	// flagged directly ("banner menu and logo is missing... add shadow to
	// make it visible", then confirmed the fix should be a dedicated white
	// bar above the photo, not an overlay - "space before the img in top
	// like a strip", same treatment as /projects, not a shadow/overlay
	// trick). The hero photo simply starts below the header's own bar
	// instead of behind it.
	// All door/window/garage-door/shutter product & category pages get the
	// light (white bar) header treatment together, even the ones whose hero
	// photo alone would have read fine with the default transparent header -
	// visual consistency across pages users click between directly, in the
	// same nav family, matters more than optimizing per-page for whatever a
	// given hero photo looks like.
	const LIGHT_PAGE_PREFIXES = ['/projects', '/doors', '/door-styles', '/garage-doors', '/grilles-shutters', '/windows', '/thank-you', '/about-us', '/blog/', '/inspiration/'];
	const isLightPage = LIGHT_PAGE_PREFIXES.some((p) => pathname?.startsWith(p));

	// The full-screen PRODUCTS panel is rendered via a portal straight into
	// <body> (see below) - an ancestor column div in the header has
	// position:relative + z-index:3, which creates its own CSS stacking
	// context. A position:fixed descendant does NOT escape an ancestor's
	// stacking context just because it's fixed, so the panel's z-index:999999
	// was only ever being compared within that trapped context and could
	// render underneath ordinary page content - clicks landed on whatever
	// was actually on top (e.g. the hero image), not the visible menu link.
	useEffect(() => {
		setMounted(true);
	}, []);

	// Real sticky header: dock as position:fixed once scrolled past the hero,
	// and hide/reveal based on scroll direction while docked - matching the
	// live site's own behavior (its compiled JS toggles a `scrolling-down`
	// class the same way; that JS never runs in this migration, so this had
	// stayed permanently `position: absolute` with no scroll listener at all
	// - see the "Sitewide header" entry in migration-log/CHANGES-NEEDED.md).
	// Runs for isLightPage routes too (initially scoped out, added back on
	// request): those pages have no hero to float over, so the header sits
	// in normal document flow at rest - once it docks as position:fixed it
	// stops reserving that space, which would jump page content up by the
	// header's own height. The spacer effect below measures and compensates
	// for exactly that, only while both isLightPage and stuck are true.
	useEffect(() => {
		const STUCK_AT = isLightPage ? 10 : 150; // light pages have no hero to scroll past
		const HIDE_DELTA = 10; // ignore sub-10px jitter (trackpads, momentum)
		let lastY = window.scrollY;

		const onScroll = () => {
			const y = window.scrollY;
			const delta = y - lastY;
			const nowStuck = y > STUCK_AT;

			setStuck(nowStuck);
			if (!nowStuck) {
				setHidden(false);
			} else if (delta > HIDE_DELTA) {
				setHidden(true);
			} else if (delta < -HIDE_DELTA) {
				setHidden(false);
			}
			lastY = y;
		};

		onScroll(); // set correct initial state if the page loads mid-scroll
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, [isLightPage]);

	// Measure the header's own in-flow height (only the currently-visible
	// row contributes, since the other is display:none at this breakpoint)
	// so the isLightPage spacer below can reserve exactly that much space
	// once the header docks as position:fixed and leaves the flow.
	// ResizeObserver rather than a one-time measurement: this height
	// differs across the responsive breakpoints (row-1 desktop/medium vs
	// row-2 mobile), so it needs to stay correct across a resize too.
	useEffect(() => {
		if (!isLightPage || !headerRef.current) return;
		const el = headerRef.current;
		const measure = () => setHeaderHeight(el.offsetHeight);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [isLightPage]);

	useEffect(() => {
		// Two separate elements both open this same shared panel (it doubles
		// as the desktop "PRODUCTS" mega-menu and the mobile off-canvas
		// menu - see the portal comment above): the desktop "Products"
		// button (href="#products-panel-trigger") and row-2's off-canvas
		// trigger anchor, the one actually shown on mobile (originally
		// scraped as href="#awb-oc__2708", renamed to the stable
		// "#mobile-menu-trigger" id so this listener doesn't depend on
		// Avada's generated off-canvas id staying the same across
		// scrapes/rebuilds). querySelector (singular) would only ever find
		// and wire up ONE of these two - querySelectorAll + attaching to
		// each is required so both actually open the panel.
		const triggerBtns = Array.from(
			document.querySelectorAll<HTMLElement>(
				'a[href="#mobile-menu-trigger"], a[href="#products-panel-trigger"]',
			),
		);

		const handleTriggerClick = (e: Event) => {
			e.preventDefault();
			setMenuOpen(prev => !prev);
		};

		triggerBtns.forEach(btn => btn.addEventListener('click', handleTriggerClick));

		// Handle clicks inside and outside the menu
		const handleGlobalClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;

			// If clicking a trigger button itself, let the trigger handler deal with it
			if (triggerBtns.some(btn => btn.contains(target))) return;

			const mobileNav = document.querySelector('nav[aria-label="Mobile menu"]');
			if (menuOpen && mobileNav) {
				// Close if clicking outside
				if (!mobileNav.contains(target)) {
					setMenuOpen(false);
				}
				// Close if clicking a link inside the menu
				else if (target.tagName.toLowerCase() === 'a' || target.closest('a')) {
					setMenuOpen(false);
				}
			}
		};

		// Listen on 'click', not 'mousedown': closing the menu on mousedown
		// collapses the panel before the browser's mouseup/click for the same
		// gesture lands, so a link's default navigation action never fires -
		// clicking a link would silently just close the menu.
		document.addEventListener('click', handleGlobalClick);

		return () => {
			triggerBtns.forEach(btn => btn.removeEventListener('click', handleTriggerClick));
			document.removeEventListener('click', handleGlobalClick);
		};
	}, [menuOpen]);

	return (
		<>
			<style dangerouslySetInnerHTML={{
				__html: `

        
        /* Full-screen overlay panel - targets only the Mobile menu nav.
           Background #847b73 and padding values (50px top, 130px left, 100px
           right) are the real values from the site's own off-canvas mega-menu
           (WordPress popup id 1349) that the user pasted verbatim; all column
           layout, colors and text below are driven by inline styles on the
           ported JSX rather than by these generic rules. */
        .mobile-menu-active nav[aria-label="Mobile menu"] {
          display: block !important;
          position: fixed !important;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          z-index: 999999 !important;
          background-color: #847b73;
          overflow-y: auto;
          padding: 50px 100px 90px 130px;
          animation: fadeIn 0.25s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .mobile-menu-active nav[aria-label="Mobile menu"] a:hover {
          opacity: 0.75;
        }

        /* Hide the regular toggle button since we use the Products button */
        .mobile-menu-active .awb-menu__toggle-button {
          display: none !important;
        }

        /* Force visibility of the mobile menu container on desktop when active */
        .mobile-menu-active .fusion-no-large-visibility,
        .mobile-menu-active .fusion-no-medium-visibility {
            display: block !important;
        }

        /* On an actual phone-width viewport the panel's desktop padding
           (50px 100px 90px 130px) and 4-column grid (25% 25% 22% 28%) leave
           almost no room per column, squeezing every column's text into a
           narrow sliver next to the others instead of stacking - reported
           after opening the menu on a real phone. Stack to a single column
           and cut the side padding down to something a phone screen can
           actually fit. */
        @media (max-width: 767px) {
          .mobile-menu-active nav[aria-label="Mobile menu"] {
            padding: 30px 24px 60px !important;
          }
          .mobile-menu-active .mobile-menu-grid {
            grid-template-columns: 1fr !important;
            row-gap: 40px !important;
          }
        }

        /* On a page with a light (white) background and no dark hero image behind
           it, the header's normal styling is unusable as-is:
           1) The nav row is positioned absolute (meant to float on top of a tall
              hero image), which collapses its parent to 0 height and lets page
              content paint over/behind it - the header effectively disappears.
           2) Its text/logo colors (--awb-color1, resolving to #ffffff) are made
              for sitting on a dark hero image, so even where it did render it
              would be invisible white-on-white.
           Fix: put the row back in normal document flow (so it reserves real
           space and pushes page content down instead of overlapping it), give
           it an opaque white bar, and swap the header-scoped color variable to
           a dark tone so nav text/buttons read as dark-on-white. The raster
           logo images are separately inverted so their light artwork reads as
           dark too. */
        ${isLightPage ? `
        /* !important on both declarations below: a page-specific compiled
           Avada CSS bundle (loaded via a <link> the page itself renders,
           later in the cascade than this <style> tag) can carry its own
           .fusion-tb-header background-color rule of equal specificity -
           found on /thank-you, whose bundle computes the header's
           background from var(--awb_header_bg_color), which in turn
           resolves from --awb-color1. Without !important, the bundle's
           later rule wins the tie and silently reverts the background to
           --awb-color1's own new dark value below, producing dark-on-dark
           (invisible) nav text. !important guarantees this wins regardless
           of which bundle a given page happens to load. */
        .fusion-tb-header {
            background-color: #ffffff !important;
            border-bottom: 1px solid #e7e6e6;
            --awb-color1: #1c1e36;
            --awb_header_bg_color: #ffffff;
        }
        .fusion-tb-header .fusion-imageframe img {
            filter: invert(1);
        }
        /* Same tie-breaking issue as the header background above, applied
           to nav link color - found on /thank-you. */
        .fusion-tb-header .awb-menu a {
            color: #1c1e36 !important;
        }
        /* Resting (not yet scrolled/docked) state only - the shared
           .header-stuck rule below overrides this back to fixed once
           docked. Same selector specificity + !important on both sides,
           so source order is the tie-breaker: this one has to come first. */
        .fusion-tb-header .fusion-builder-row-1,
        .fusion-tb-header .fusion-builder-row-2 {
            position: relative !important;
            top: auto !important;
        }
        ` : `
        /* Every other route floats this header transparently over whatever
           hero content sits behind it (see the isLightPage comment above),
           on the assumption that the hero is dark enough for the light
           logo/nav to read against. That's usually true, but as a safety
           net for any other page with an unexpectedly bright/busy hero, add
           a drop shadow that keeps the logo/nav readable regardless -
           negligible visual difference on the dark heroes this was
           originally designed for. (communal-entrance-doors and about-us
           got the full isLightPage treatment above instead, per direct
           request for a dedicated white bar rather than an overlay.) */
        .fusion-tb-header .fusion-imageframe img {
            filter: drop-shadow(0 1px 3px rgba(0,0,0,0.7)) drop-shadow(0 2px 10px rgba(0,0,0,0.55));
        }
        .fusion-tb-header .awb-menu a {
            text-shadow: 0 1px 3px rgba(0,0,0,0.7), 0 2px 10px rgba(0,0,0,0.55);
        }
        `}

        /* Real sticky header: dock as position:fixed once .header-stuck is
           applied (see the useEffect above), using the same translucent
           sticky background the site's own inline style already carries as
           --awb-sticky-background-color on isLightPage:false routes
           (hardcoded here rather than read via var() - that custom
           property's value literally includes the text "!important",
           which is only meaningful written directly after a declaration;
           substituted through var() it makes the whole background-color
           declaration invalid and the browser drops it, leaving the header
           transparent), or the same opaque white bar isLightPage already
           uses at rest otherwise - so docking never changes its color, only
           whether it's floating over the hero or fixed to the viewport top.
           .header-hidden slides it up out of view; the transition only
           animates transform, so it stays cheap. */
        .header-stuck .fusion-builder-row-1,
        .header-stuck .fusion-builder-row-2 {
            position: fixed !important;
            top: 0 !important;
            left: 0;
            right: 0;
            z-index: 10011;
            background-color: ${isLightPage ? '#ffffff' : 'rgba(132,123,115,0.7)'};
            ${isLightPage ? 'border-bottom: 1px solid #e7e6e6;' : ''}
            transition: transform 0.3s ease-out;
        }
        .fusion-builder-row-1,
        .fusion-builder-row-2 {
            transition: transform 0.3s ease-out;
        }
        .header-hidden .fusion-builder-row-1,
        .header-hidden .fusion-builder-row-2 {
            transform: translateY(-110%);
        }
      ` }} />

			{/* Close (X) button for the full-screen menu panel. Fixed at
			    top-right rather than top-left: at top:30/left:30 it used to
			    clear the panel's original 130px desktop left-padding, but
			    that padding is cut down to 24px on phone widths (see the
			    max-width: 767px rule above), which put the X directly on
			    top of the Gallery/Doors heading text - reported after
			    opening the menu on a real phone, both at open and while
			    scrolling since this stays fixed. Top-right has nothing else
			    near it at any content width, so it can't collide again. */}
			{menuOpen && (
				<div
					style={{
						position: 'fixed',
						top: '24px', right: '24px',
						color: '#fff', fontSize: '28px', fontWeight: 'bold',
						zIndex: 1000000,
						cursor: 'pointer'
					}}
					onClick={() => setMenuOpen(false)}
				>
					<i className="fa-solid fa-xmark"></i>
				</div>
			)}

			<div
				className={[
					menuOpen ? "mobile-menu-active" : "",
					stuck ? "header-stuck" : "",
					hidden ? "header-hidden" : "",
				].filter(Boolean).join(" ")}
			>
				{/* isLightPage keeps the header in normal document flow (see the
				   CSS below) so it reserves real space at rest; once it docks as
				   position:fixed that space collapses to 0 and page content
				   would jump up by the header's height. This spacer reserves the
				   same height only while docked, so nothing shifts either way.
				   Sits outside headerRef (attached to .fusion-tb-header just
				   below) so its own height never feeds back into the
				   measurement it's based on. */}
				{isLightPage && (
					<div style={{ height: stuck ? headerHeight : 0 }} />
				)}
				<div ref={headerRef} className="fusion-tb-header">
					<div className="fusion-fullwidth fullwidth-box fusion-builder-row-1 fusion-flex-container hundred-percent-fullwidth non-hundred-percent-height-scrolling fusion-no-small-visibility fusion-sticky-container fusion-absolute-container fusion-absolute-position-small fusion-absolute-position-medium fusion-absolute-position-large" data-scroll-offset="250" data-sticky-large-visibility="1" data-sticky-medium-visibility="1" data-sticky-small-visibility="1" data-transition-offset="0" style={{ "--awb-border-radius-top-left": "0px", "--awb-border-radius-top-right": "0px", "--awb-border-radius-bottom-right": "0px", "--awb-border-radius-bottom-left": "0px", "--awb-padding-top": "10px", "--awb-padding-right": "40px", "--awb-padding-bottom": "10px", "--awb-padding-left": "40px", "--awb-padding-top-small": "10px", "--awb-padding-right-small": "15px", "--awb-padding-bottom-small": "10px", "--awb-padding-left-small": "15px", "--awb-min-height": "100px", "--awb-sticky-background-color": "rgba(132,123,115,0.7) !important", "--awb-flex-wrap": "wrap" } as any}>
						<div className="fusion-builder-row fusion-row fusion-flex-align-items-center fusion-flex-content-wrap" style={{ "width": "104% !important", "maxWidth": "104% !important", "marginLeft": "calc(-4% / 2 )", "marginRight": "calc(-4% / 2 )" } as any}>
							<div className="fusion-layout-column fusion_builder_column fusion-builder-column-0 fusion_builder_column_1_1 1_1 fusion-flex-column fusion-flex-align-self-stretch" style={{ "--awb-bg-size": "cover", "--awb-width-large": "100%", "--awb-margin-top-large": "0px", "--awb-spacing-right-large": "1.92%", "--awb-margin-bottom-large": "0px", "--awb-spacing-left-large": "1.92%", "--awb-width-medium": "100%", "--awb-order-medium": "0", "--awb-spacing-right-medium": "1.92%", "--awb-spacing-left-medium": "1.92%", "--awb-width-small": "100%", "--awb-order-small": "0", "--awb-spacing-right-small": "1.92%", "--awb-spacing-left-small": "1.92%" } as any}>
								<div className="fusion-column-wrapper fusion-column-has-shadow fusion-flex-justify-content-flex-end fusion-content-layout-row fusion-flex-align-items-center">
									<div className="fusion-builder-row fusion-builder-row-inner fusion-row fusion-flex-align-items-center fusion-flex-content-wrap" style={{ "width": "104% !important", "maxWidth": "104% !important", "marginLeft": "calc(-4% / 2 )", "marginRight": "calc(-4% / 2 )" } as any}>
										<div className="fusion-layout-column fusion_builder_column_inner fusion-builder-nested-column-0 fusion_builder_column_inner_1_3 1_3 fusion-flex-column fusion-no-small-visibility" style={{ "--awb-bg-size": "cover", "--awb-width-large": "33.333333333333%", "--awb-margin-top-large": "0px", "--awb-spacing-right-large": "5.76%", "--awb-margin-bottom-large": "0px", "--awb-spacing-left-large": "0%", "--awb-width-medium": "100%", "--awb-order-medium": "0", "--awb-spacing-right-medium": "1.92%", "--awb-spacing-left-medium": "1.92%", "--awb-width-small": "100%", "--awb-order-small": "0", "--awb-spacing-right-small": "1.92%", "--awb-spacing-left-small": "1.92%" } as any}>
											<div className="fusion-column-wrapper fusion-column-has-shadow fusion-flex-justify-content-flex-start fusion-content-layout-row fusion-content-nowrap">
												<div>
													<a className="fusion-button button-flat fusion-button-default-size button-custom fusion-button-default button-1 fusion-button-default-span fusion-button-default-type" href="#products-panel-trigger" style={{ "--button_accent_color": "var(--awb-color1)", "--button_border_color": "var(--awb-color1)", "--button_accent_hover_color": "var(--awb-color2)", "--button_border_hover_color": "var(--awb-color2)", "--button_gradient_top_color": "rgba(255,255,255,0)", "--button_gradient_bottom_color": "rgba(255,255,255,0)", "--button_gradient_top_color_hover": "rgba(255,255,255,0)", "--button_gradient_bottom_color_hover": "rgba(255,255,255,0)", "--button_text_transform": "uppercase", "--button_font_size": "14px", "--button_typography-font-family": "\"Montserrat\"", "--button_typography-font-style": "normal", "--button_typography-font-weight": "600", "width": "calc(100%)" } as any} target="_self">
														<span className="fusion-button-text awb-button__text awb-button__text--default">
															Products
														</span>
														<i aria-hidden="true" className="fa-bars fas awb-button__icon awb-button__icon--default button-icon-right"></i>
													</a>
												</div>
											</div>
										</div>
										<div className="fusion-layout-column fusion_builder_column_inner fusion-builder-nested-column-1 fusion_builder_column_inner_1_3 1_3 fusion-flex-column" style={{ "--awb-bg-size": "cover", "--awb-width-large": "33.333333333333%", "--awb-margin-top-large": "0px", "--awb-spacing-right-large": "0%", "--awb-margin-bottom-large": "0px", "--awb-spacing-left-large": "0%", "--awb-width-medium": "100%", "--awb-order-medium": "0", "--awb-spacing-right-medium": "1.92%", "--awb-spacing-left-medium": "1.92%", "--awb-width-small": "100%", "--awb-order-small": "0", "--awb-spacing-right-small": "1.92%", "--awb-spacing-left-small": "1.92%" } as any}>
											<div className="fusion-column-wrapper fusion-column-has-shadow fusion-flex-justify-content-center fusion-content-layout-row fusion-content-nowrap">
												<div className="fusion-image-element" style={{ "textAlign": "center", "--awb-sticky-max-width": "200px", "--awb-max-width": "300x", "--awb-caption-title-font-family": "var(--h2_typography-font-family)", "--awb-caption-title-font-weight": "var(--h2_typography-font-weight)", "--awb-caption-title-font-style": "var(--h2_typography-font-style)", "--awb-caption-title-size": "var(--h2_typography-font-size)", "--awb-caption-title-transform": "var(--h2_typography-text-transform)", "--awb-caption-title-line-height": "var(--h2_typography-line-height)", "--awb-caption-title-letter-spacing": "var(--h2_typography-letter-spacing)" } as any}>
													<span className="fusion-imageframe imageframe-none imageframe-1 hover-type-none">
														<a aria-label="group_60" className="fusion-no-lightbox" href="/" target="_self">
															<img loading="lazy" alt="" className="img-responsive wp-image-1304 disable-lazyload" decoding="async" height="51" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPgAAAAzCAYAAAC6/sV8AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAA+WSURBVHgB7V3rddu4Eh7n5P/qVhCmgmgrWKSCeCswtwI7FYiuwE4FkiuwU4GUCqytQEwF9lYwlyMOxNFwAEIPvxJ85/BIBAbzAAZPEuAJCCDiqPk5by7XXOPmemyuurl+UnRz3ZycnCwg45dAU96n0JazxiNfI74em3K/Vmkp3WmAtU9f8P2sSV9DxsuhKbAr7LBqLqfii+aaNdeU/kPGmwdVUqrkzXWLNsgPSq7MOi35g2uuawyjYhkjyHg5GJW7iNBeD9FkvC1QBWyuB6OCusT0cyPtHWQcHdyoTrkO3nLdpbBbRTddlx+30FutboKQ+1zJfy1weWp8SExr9eIVZDwZsB1Nf+D/DsWom+v0+v5dc3+m0tYJ/L9CO79ykJHRzrczXhbfoF0/I1CdvqE/VMHHsDuWkAs1I+M1gerjN5ouQdsBr0EVXC+AnA1xalZEidkC9sQxh/Y8f3xTizj76vs7TIneYnkeA8coW37C9a35Xfqw99A9DvGg8fxZQ3QzwO9fSAQrT8OHU5ZXY7cyu2iuy9THKFz4ZXN9gW70sWzC6ZfiyMCZke6q+flPBH1g+nFD/3FfWqafND8nFn1zuSbNT7aX+DpOUzc/X5u4u4itREsNLuXbetSE7aOtZcjOtwbcfjRbQGsbCDsX0NpaB9I72J4q/gFd3v9o0l0IWv1YMEg7oKdjvWpo/WSt5y6PAllv8uFT5rNr2V5wR7uu2L5RFP507QXNjQWSBxYWU7BIaWlxe4W+Uun9yu0KjUcxBi+/mNDjp3iudIuI7eOayrAVDTnJtEP0DT401xm2C1GFyo8HKw+x7cXmgs6JuFKEr/BIvToetshm2V4lpDvHbR8oRJz0D8IkwIPyygX0n+5Lq9IVKs2FET9vrhKGbSYdpA+UIs6J8BUeo2yxv4oucQUHANuleo+5ES8dw3R2QXuqdKtUvC6EeYDPXBsZkblKpQ3xxrbQKo638vpiwI7pgJw5HAH4zBW8iZ8o+tKg0fk1ifBzhg7TQ2mZfo4D+Y1tIz+kI1Xu+5hMJWuFx5iuoO2YUoiDHYFpBagzugrw0q056VQomqmhu/WCRu+RTsSGWSot01uOPo3xw35DNVXxhSHnQtFER1spwGes4NhVBo9VhFY/n3c70IYq+MjQd5qo631E/u2ALVdDtuAej61jeMe//0D48VjRXHNWLqk1wdYpKxVszTWX6v4cbFCrKGVb8x1npLP0fe7Vf7lWURvxM/+HC7wUccvAvE6HlfC2oEeGsfWc7+p+AgfCz10TUeh7DA+dvwXCfZ2Qo7U68Nq3DvsLDsC6grMTfYb4yjgpR8OLwbky9Cvb0spUDpPh1LJu9RqcMaVKqgvdCquh34C8BDY6NPZW0DoBhdXN9Y+qwPoJxg8Y4Mn4BE+Dj9iOnqIXtItVSWB6p4IXkSTaVofhkcXhw9lhkIzbQGcX8zfdMIUaNV1PHByA9/6Pr+Q8JAi1kgW0lbxq6C8hDO2oPyO0ehX/o6J3RpraCKuYz18c/3XHlvqpsDVki63UQn/zRqr+BTwNzhN1SGn0Y7R1hN6K+xv8KvHTY2GEkQ1UDz7LBpr8rQn7O8DHqfvaImIeW2HUoNGTGNgD7w0BNJ+aNX9pMaEIpCMaiFRyXYifMLwYVKh73TJ+gb6OSyOMHLGENwoeGfVsb8KtIZq18r63E0RwkcKTO4XUSh7avRaCFfdUI5YeuMLJt8Q8iuZa6c7O8k3u7QsVTGX75Ha8twK5VaLhGfU2ev7rYVZyHoJp+n8bun0XgjSv19ArPwUKI+xGb9P8BVAYYbEyrY2w/8HzooJ2ZGg1ThX7/GXkObiV7vvAaO4oeBeLZOf6E8JDqArTVtgfYH/8LhX8NSwIvhR29Y/kOf8xwKNDWqMKvfxVQrsQvctU5VnK9h0OPEflVokqeWgBYd+eORW/i5NnvGJQJW+usvkbmpYW0M7LHbwiJG02ES1YbUSnLOMfc0hVwO+DAn4PxPzDGtn8By8EfhISG9XeGo/RrE4q6R2DQ7HebIIJLzRwJbee840UXQ19gw55ltdb5NlxKPRWYI2QnsUJnhmWnaMIvRVXwzMB25exShnGC2nU4YVs0XNrq4IX8Azwc/DPifSzRDpt+OiAoYuViQ5+MbDTaEd46unPS8AqzyJCb1XwBTwfCjA6KPHuiGXPF4O2VjQO8el3zfkKfpZCHHiubD2wt15E+QID4LfldO8825PXBBNe/h/Asy7mwJ4NI7avGj+5sxwJVkMWG5HpOEq7CNDWkADcfROHswK5PvwNabDqxMVQIvbjvUdyvoKP9zDa484Im0G/EC8w/h7xejupfo4Y2HvuUG3SULyowSrBdoTaoA9loIPnhbWAM8X4GXn0GLN+JS/1DCIw1Ys9D9a9590RbHWwG4qQj3DvrBvm2iC16sl5Qtm6g95vwG4DxG0CbalehI+9WK83RBAedK+K7Yv/E44vArz0ZhOPiey5cHsrXhngZe0kGht0E7Q34QR7yoDNDnYA2iecrtA+5faW86WAA4H2ZpOktQ60N5tcR+itQx6tl3cKIx+KCF+dd/cB2XND37sAzzHrWkXkan5lgM46u26Fdp3wflzAoRCCY1vdCtx2gtWQcAzvkX7gTLnHrqCrAV5jtCs5YncIpMf1AK+VSn+l4s9Z95khq4rwvTfod9rOif0thRIrzreVCDt4no79ijRoq0o/39Vu7JfnlUEzFfFEOx7geWro4ZSdc7TtDTaUQlerI9C8bgd0tHyKsMKuTngMDuGTgW3v7CtKyUb5DQUT7Apj3Zph+s6yEu3eQWZskiGigA7ixbat0M7gTWuN4cKY4rbjTHB4yy31LiUkAuPnjXueBz1NwLZCXGG44UTWuzLSFpz2fkBHoikC8nV5TjhMH4owx8SeDO1OZY6db4+ZLqSv6dvYjZgm2NUNh50fRXt5Q8cVxvPNwRFwYggvoF29pbmPN7SG9tnjAtqtmjvPgbDtaRx0860a2gW62a78sPuqBs2Lin14CTv9gt0j87j2PLBrLGrovtbx6GX6VxNZnxS5I+td5QEdHbRlUbAMmo/dHeMLM9i9/15HyCh+pOVh9351it2PsXIR5fkJOp/z5bHY1VauHJ4foYZ2kWshypZGeX7Bb0u3mDzlex47+7Eo27HSk3YQ3r2VNZWMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIxfD+vNJvwCvT/Vxb/gX2P/28uEO79hArtvdX/idHecrqBwPqAOmHa9rZG+X4z9zxHVIL43hu2uK/pPcqzdYRRecJqlkFFB+9J/LcK0rEevp2TIeeDYFvOFf7bBH0DwXW5KYJ0LQT6LnJMt9bqWcjjPC/l9aN70srZVbHbwqCHwbWpvkzxbXfISehDNTJURle2FtEPzY15y59UisCmlhDZffyp+G3mhPPG+kMpX6G3mj6EzKD910G1A+teXg1UuHE5p75Qf9vJd6Hzh5Vk2QOufls/vvOmG8I4zlTbGU2X/j40bc7yDwHFObMSK6Uk5cny/F5Z46r3lcueWjCcj6TSXudimdwb9hoVo5MkfIyHPO8KZ4eiF0oX0XKHY+47tCTD3HPeT6e85bzZ7tKH9aB7lE50Ceovb++fPoKv8n1iGVVAeE740jYP2FBcnwsh2XyZj2P7KxheWZZUT5dHmo5FszxVsf/xvIvSWZTTiuKmg1bJlmYxY77mSdw+djxRKV83PscxTpd9WhWRovqXSW/qS9C3tRxtweZJP+bowwe6row5UXWCfozR6L7u2C5RuQzbAkK7JQN6vHYirMPw95BX2P33rC9bRplYVN/OZFYjfnPbCTlIZ8kpLB+wOoygMPS1Z6zCuuP50kQtFM/e2Y3tSywq3T4/xPJylM+vVO1GE4wpvL6rvonO6BxQHEEjbrfISaax9zJuGhu24l7Qo9h6rMirYPqK9smTrMhHlUPH9FNUBCKzDA+e7l/FB5OG9yHfK4wew85BwGsjbDU8jD7Z0NtKNRdhI5FOvLni+bI8T4b0ykjKUPAcBhHTdBXQm20IwmxoMx5zxc5Hxfi/wnSTcdw8rdhVz1/T02WNq5cgBF7EhsQQPdYiWHGS9J/qk/4kg+opFwf+plb2R9gke44AYcrCQPQ7aL67OwJ6GUL7S/uU5ph2sQbr7MtG4ga5Xph7okvU69c41MPSjPC4x4SANzn/S2+fJKfS/BjJjXcdMvyAZ2O2PJnljtpv0vQuIo3PdbtkvSwwfKiH3l3ucC5+uOMxBOxVYCnuC+9ixm15cs43mSDcEtp1sIB1uYzYcgnckqLk+QpuxflhSCZoaWgP8JZHifB5/gDqwXjQa1NMt/VwsFeyYdJFDXcJuIN0f+QKjIvl4gP4XUCWkA5z5Xgha5/4aSEPDtEduTMmhrOHcBfMePCtP6GbpuID2kErKo4LzmMqRhuVnMHwEMdlCdlxB2vn2f4j/Vr7p+x/Ml/LrO1ewJd87sE8j9V9p/ZPj9RSPMGPfop60VnNn4u/9eRHRLQaSueQypF65TGyMLRsoD8gndjreKwXveKhABb9ggb7wPagVm/mLFaOCW0A7vysojIcz3lGXHOZ8HLSVcKnkX0JXMYMfTx8ALe7Vqb0367OuYNA2KqQTpZVz8gLaAvTORb9nsoVlHmTXQrCmgrrk3+WJ/aXJkv+S/M2pOdg/XJ/i6UjeAiLnhnPe+pNVFzpejDSoofANKIX5CnQDA+ByJ7vKGB2XdynkEO+J6pm0rjPW41yko/yjBmUUavRJFuUv96DUORWw3bjcsM6fG5rPKvkP4dMLDrtjvtIPzNOGxWhDlmENCccgR2xYl/WujUSKkJLnAuueh+cTpxxXcdxKXH4u4+dbDyLdXPCtBF8d5/xchO9PcXvOOceEObiQM4/Y55QND6jOMxO2rIQtM0MOYne214PisdGZG7tNXg3ZIW3g/1MRN2a5Jd+Xhj1zjJ826nU/VXroufwM+3NwOZe9xf4c/EHpciHiR9idazcXtIWSu44T9172NGDPSMj0fK9Dequ0WueNL2DrhyvhB4idv8symmrdkNcLWDddRivmrefgpg1K1xIOwInPMOjmTUvxiKKAfu9Rq8dQ6zkstD39Uino0z+qxwh+DrYQYc7zZp6PSo6TuikZwbPOlG09/RWti9FIe0CdRa519rTKxs1IRqXd5AenAyOP1/KMMhkcvQR0GbOcpWVDoIxGzGdrhMbo5YmWD4aPRHRxYJS3Sue8bPXodnwSWFdAe1FraTyq3AqXfhbxxXU42Osh3jbL77ds0PxO8vlsGRkZGRkZGRkZGRkZGRmvHv8HsxCq+TSHOSkAAAAASUVORK5CYII=" width="248" />
														</a>
													</span>
												</div>
											</div>
										</div>
										<div className="fusion-layout-column fusion_builder_column_inner fusion-builder-nested-column-2 fusion_builder_column_inner_1_3 1_3 fusion-flex-column" style={{ "--awb-bg-size": "cover", "--awb-width-large": "33.333333333333%", "--awb-margin-top-large": "0px", "--awb-spacing-right-large": "0%", "--awb-margin-bottom-large": "0px", "--awb-spacing-left-large": "5.76%", "--awb-width-medium": "100%", "--awb-order-medium": "0", "--awb-spacing-right-medium": "1.92%", "--awb-spacing-left-medium": "1.92%", "--awb-width-small": "100%", "--awb-order-small": "3", "--awb-spacing-right-small": "1.92%", "--awb-spacing-left-small": "1.92%" } as any}>
											<div className="fusion-column-wrapper fusion-column-has-shadow fusion-flex-justify-content-center fusion-content-layout-row">
												<nav aria-label="Main menu" className="awb-menu awb-menu_row awb-menu_em-hover mobile-mode-collapse-to-button awb-menu_icons-left awb-menu_dc-yes mobile-trigger-fullwidth-off awb-menu_mobile-toggle awb-menu_indent-left mobile-size-full-absolute loading mega-menu-loading awb-menu_desktop awb-menu_dropdown awb-menu_expand-right awb-menu_transition-fade fusion-no-small-visibility" data-breakpoint="0" data-count="0" data-expand="right" data-transition-time="300" data-transition-type="fade" style={{ "--awb-font-size": "14px", "--awb-text-transform": "uppercase", "--awb-gap": "20px", "--awb-justify-content": "space-between", "--awb-color": "var(--awb-color1)", "--awb-active-color": "var(--awb-color1)", "--awb-active-border-bottom": "1px", "--awb-active-border-color": "var(--awb-color1)", "--awb-main-justify-content": "flex-start", "--awb-mobile-justify": "flex-start", "--awb-mobile-caret-left": "auto", "--awb-mobile-caret-right": "0", "--awb-fusion-font-family-typography": "\"Montserrat\"", "--awb-fusion-font-style-typography": "normal", "--awb-fusion-font-weight-typography": "600", "--awb-fusion-font-family-submenu-typography": "inherit", "--awb-fusion-font-style-submenu-typography": "normal", "--awb-fusion-font-weight-submenu-typography": "400", "--awb-fusion-font-family-mobile-typography": "inherit", "--awb-fusion-font-style-mobile-typography": "normal", "--awb-fusion-font-weight-mobile-typography": "400" } as any}>
													<ul className="fusion-menu awb-menu__main-ul awb-menu__main-ul_row" id="menu-main-menu">
														<li className="menu-item menu-item-type-custom menu-item-object-custom menu-item-9978 awb-menu__li awb-menu__main-li awb-menu__main-li_regular" data-item-id="9978" id="menu-item-9978">
															<span className="awb-menu__main-background-default awb-menu__main-background-default_fade"></span>
															<span className="awb-menu__main-background-active awb-menu__main-background-active_fade"></span>
															<a className="awb-menu__main-a awb-menu__main-a_regular" href="https://gallery.secure-house.co.uk/">
																<span className="menu-text">
																	GALLERY
																</span>
															</a>
														</li>
														<li className="menu-item menu-item-type-post_type menu-item-object-page menu-item-2968 awb-menu__li awb-menu__main-li awb-menu__main-li_regular" data-item-id="2968" id="menu-item-2968">
															<span className="awb-menu__main-background-default awb-menu__main-background-default_fade"></span>
															<span className="awb-menu__main-background-active awb-menu__main-background-active_fade"></span>
															<a className="awb-menu__main-a awb-menu__main-a_regular" href="/projects/">
																<span className="menu-text">
																	OUR
																	PROJECTS
																</span>
															</a>
														</li>
														<li className="menu-item menu-item-type-post_type menu-item-object-page menu-item-3542 awb-menu__li awb-menu__main-li awb-menu__main-li_regular" data-item-id="3542" id="menu-item-3542">
															<span className="awb-menu__main-background-default awb-menu__main-background-default_fade"></span>
															<span className="awb-menu__main-background-active awb-menu__main-background-active_fade"></span>
															<a className="awb-menu__main-a awb-menu__main-a_regular" href="/about-us/">
																<span className="menu-text">
																	ABOUT
																	US
																</span>
															</a>
														</li>
													</ul>
												</nav>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
					<div className="fusion-fullwidth fullwidth-box fusion-builder-row-2 fusion-flex-container hundred-percent-fullwidth non-hundred-percent-height-scrolling fusion-no-medium-visibility fusion-no-large-visibility fusion-sticky-container fusion-absolute-container fusion-absolute-position-small fusion-absolute-position-medium fusion-absolute-position-large" data-scroll-offset="0" data-sticky-large-visibility="1" data-sticky-medium-visibility="1" data-sticky-small-visibility="1" data-transition-offset="0" style={{ "--awb-border-radius-top-left": "0px", "--awb-border-radius-top-right": "0px", "--awb-border-radius-bottom-right": "0px", "--awb-border-radius-bottom-left": "0px", "--awb-padding-top": "10px", "--awb-padding-right": "29px", "--awb-padding-bottom": "10px", "--awb-padding-left": "0px", "--awb-padding-top-small": "20px", "--awb-padding-right-small": "0px", "--awb-padding-bottom-small": "20px", "--awb-padding-left-small": "0px", "--awb-background-color-small": "rgba(157,149,142,0)", "--awb-sticky-background-color": "rgba(132,123,115,0.7) !important", "--awb-flex-wrap": "wrap", "--awb-flex-wrap-small": "nowrap" } as any}>
						<div className="fusion-builder-row fusion-row fusion-flex-align-items-flex-start fusion-flex-justify-content-center fusion-flex-content-wrap" style={{ "width": "104% !important", "maxWidth": "104% !important", "marginLeft": "calc(-4% / 2 )", "marginRight": "calc(-4% / 2 )" } as any}>
							<div className="fusion-layout-column fusion_builder_column fusion-builder-column-1 fusion_builder_column_1_1 1_1 fusion-flex-column fusion-flex-align-self-center" style={{ "--awb-bg-size": "cover", "--awb-width-large": "100%", "--awb-margin-top-large": "0px", "--awb-spacing-right-large": "1.92%", "--awb-margin-bottom-large": "0px", "--awb-spacing-left-large": "1.92%", "--awb-width-medium": "100%", "--awb-order-medium": "0", "--awb-spacing-right-medium": "1.92%", "--awb-spacing-left-medium": "1.92%", "--awb-width-small": "25%", "--awb-order-small": "0", "--awb-spacing-right-small": "0%", "--awb-spacing-left-small": "7.68%" } as any}>
								<div className="fusion-column-wrapper fusion-column-has-shadow fusion-flex-justify-content-center fusion-content-layout-row fusion-flex-align-items-stretch"></div>
							</div>
							<div className="fusion-layout-column fusion_builder_column fusion-builder-column-2 fusion_builder_column_1_1 1_1 fusion-flex-column fusion-flex-align-self-center" data-scroll-devices="small-visibility,medium-visibility,large-visibility" style={{ "--awb-bg-size": "cover", "--awb-width-large": "100%", "--awb-margin-top-large": "0px", "--awb-spacing-right-large": "1.92%", "--awb-margin-bottom-large": "0px", "--awb-spacing-left-large": "1.92%", "--awb-width-medium": "100%", "--awb-order-medium": "0", "--awb-spacing-right-medium": "1.92%", "--awb-spacing-left-medium": "1.92%", "--awb-width-small": "45%", "--awb-order-small": "1", "--awb-spacing-right-small": "0%", "--awb-spacing-left-small": "4.2666666666667%" } as any}>
								<div className="fusion-column-wrapper fusion-column-has-shadow fusion-flex-justify-content-center fusion-content-layout-row fusion-flex-align-items-stretch">
									<div className="fusion-image-element sm-text-align-right" style={{ "textAlign": "center", "--awb-caption-title-font-family": "var(--h2_typography-font-family)", "--awb-caption-title-font-weight": "var(--h2_typography-font-weight)", "--awb-caption-title-font-style": "var(--h2_typography-font-style)", "--awb-caption-title-size": "var(--h2_typography-font-size)", "--awb-caption-title-transform": "var(--h2_typography-text-transform)", "--awb-caption-title-line-height": "var(--h2_typography-line-height)", "--awb-caption-title-letter-spacing": "var(--h2_typography-letter-spacing)" } as any}>
										<span className="fusion-imageframe imageframe-none imageframe-2 hover-type-none">
											<a aria-label="securehouse_logo" className="fusion-no-lightbox" href="/" target="_self">
												<img loading="lazy" alt="" className="img-responsive wp-image-1903 disable-lazyload" decoding="async" height="101" src="data:image/png;base64,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" width="495" />
											</a>
										</span>
									</div>
								</div>
							</div>
							<div className="fusion-layout-column fusion_builder_column fusion-builder-column-3 fusion_builder_column_1_1 1_1 fusion-flex-column fusion-flex-align-self-center fusion-column-inner-bg-wrapper" data-scroll-devices="small-visibility,medium-visibility,large-visibility" style={{ "--awb-inner-bg-size": "cover", "--awb-width-large": "100%", "--awb-margin-top-large": "0px", "--awb-spacing-right-large": "1.92%", "--awb-margin-bottom-large": "0px", "--awb-spacing-left-large": "1.92%", "--awb-width-medium": "100%", "--awb-order-medium": "0", "--awb-spacing-right-medium": "1.92%", "--awb-spacing-left-medium": "1.92%", "--awb-width-small": "12%", "--awb-order-small": "3", "--awb-spacing-right-small": "0%", "--awb-spacing-left-small": "16%" } as any}>
								<span className="fusion-column-inner-bg hover-type-none">
									<a className="fusion-column-anchor" href="#mobile-menu-trigger" aria-label="Open menu" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
										<span className="fusion-column-inner-bg-image"></span>
										{/* divs, not spans - a compiled Avada rule
										    (.fusion-column-inner-bg .fusion-column-anchor span)
										    forces every span descendant here to position:absolute;
										    top:0;left:0;width:100%;height:100%, which stacked 3
										    span bars exactly on top of each other. Divs aren't
										    targeted by that selector at all. */}
										<div style={{ position: 'static', display: 'flex', flexDirection: 'column', gap: '5px', width: '24px' }}>
											<div style={{ position: 'static', display: 'block', height: '2px', width: '100%', backgroundColor: 'var(--awb-color1)' }} />
											<div style={{ position: 'static', display: 'block', height: '2px', width: '100%', backgroundColor: 'var(--awb-color1)' }} />
											<div style={{ position: 'static', display: 'block', height: '2px', width: '100%', backgroundColor: 'var(--awb-color1)' }} />
										</div>
									</a>
								</span>
								<div className="fusion-column-wrapper fusion-column-has-shadow fusion-flex-justify-content-flex-end fusion-content-layout-row fusion-flex-align-items-center">
								</div>
							</div>
							<div className="fusion-layout-column fusion_builder_column fusion-builder-column-4 fusion_builder_column_1_1 1_1 fusion-flex-column fusion-flex-align-self-center" data-scroll-devices="small-visibility,medium-visibility,large-visibility" style={{ "--awb-bg-size": "cover", "--awb-width-large": "100%", "--awb-margin-top-large": "0px", "--awb-spacing-right-large": "1.92%", "--awb-margin-bottom-large": "0px", "--awb-spacing-left-large": "1.92%", "--awb-width-medium": "100%", "--awb-order-medium": "0", "--awb-spacing-right-medium": "1.92%", "--awb-spacing-left-medium": "1.92%", "--awb-width-small": "12%", "--awb-order-small": "2", "--awb-spacing-right-small": "0%", "--awb-spacing-left-small": "16%" } as any}>
								<div className="fusion-column-wrapper fusion-column-has-shadow fusion-flex-justify-content-center fusion-content-layout-row fusion-flex-align-items-center">
									<a aria-label="Link to tel:%2002078594207" className="fb-icon-element-1 fb-icon-element fontawesome-icon fa-phone-alt fas circle-no fusion-link" href="tel: 02078594207" style={{ "--awb-iconcolor-hover": "var(--awb-color3)", "--awb-circlecolor": "#e1d8c0", "--awb-font-size": "18px", "--awb-margin-top": "0", "--awb-margin-right": "0", "--awb-margin-bottom": "0", "--awb-margin-left": "0", "--awb-align-self": "center" } as any} target="_self"></a>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			{mounted && createPortal(
				<div className={menuOpen ? "mobile-menu-active" : ""} style={menuOpen ? undefined : { display: 'none' }}>
										<nav aria-label="Mobile menu" className="awb-menu awb-menu_row awb-menu_em-hover mobile-mode-collapse-to-button awb-menu_icons-left awb-menu_dc-yes mobile-trigger-fullwidth-off awb-menu_mobile-toggle awb-menu_indent-left mobile-size-full-absolute loading mega-menu-loading awb-menu_desktop awb-menu_dropdown awb-menu_expand-right awb-menu_transition-fade" data-breakpoint="640" data-count="1" data-expand="right" data-transition-time="300" data-transition-type="fade" style={{ "--awb-font-size": "14px", "--awb-text-transform": "uppercase", "--awb-gap": "20px", "--awb-justify-content": "space-between", "--awb-color": "var(--awb-color1)", "--awb-active-color": "var(--awb-color1)", "--awb-active-border-bottom": "1px", "--awb-active-border-color": "var(--awb-color1)", "--awb-main-justify-content": "flex-start", "--awb-mobile-trigger-font-size": "24px", "--awb-mobile-trigger-color": "var(--awb-color1)", "--awb-mobile-trigger-background-color": "rgba(255,255,255,0)", "--awb-mobile-justify": "flex-start", "--awb-mobile-caret-left": "auto", "--awb-mobile-caret-right": "0", "--awb-fusion-font-family-typography": "\"Montserrat\"", "--awb-fusion-font-style-typography": "normal", "--awb-fusion-font-weight-typography": "600", "--awb-fusion-font-family-submenu-typography": "inherit", "--awb-fusion-font-style-submenu-typography": "normal", "--awb-fusion-font-weight-submenu-typography": "400", "--awb-fusion-font-family-mobile-typography": "inherit", "--awb-fusion-font-style-mobile-typography": "normal", "--awb-fusion-font-weight-mobile-typography": "400" } as any}>
											{/*
												Below: a direct port of the site's REAL "PRODUCTS" off-canvas mega-menu
												markup (WordPress off-canvas popup id 1349), pasted verbatim by the user
												from the live site. Text, hrefs, column grouping, and colors (#847b73,
												#dcd7ca, #635548) are taken 1:1 from that source, not invented. Inline
												styles are used (rather than relying on external Avada/Fusion CSS) because
												this Next.js migration does not load the theme's structural stylesheet
												site-wide for every route.

												Main-category links (Doors/Windows/Grilles/Garage doors/Projects/About
												Us/Trade/Blog/Contact us) are #fff here rather than the source's
												#dcd7ca: that pale cream only hits ~3.2:1 contrast against this panel's
												#847b73 background (vs. ~4.6:1 for the #fff sub-links right next to
												them), reading as washed out/low-contrast on a phone screen - this is
												the mobile menu (row-2's off-canvas trigger opens this same panel, see
												the wiring comment above). Left the sub-product links (UNICO SLIM LINE
												etc.) and the "Explore door styles" button at their original colors -
												not what was reported as illegible.
											*/}
											<div style={{ marginBottom: '30px' }}>
												<a href="https://gallery.secure-house.co.uk/" style={{ color: '#fff', fontWeight: 600, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em', textDecoration: 'none', display: 'block' }}>Gallery</a>
											</div>
											<div className="mobile-menu-grid" style={{ display: 'grid', gridTemplateColumns: '25% 25% 22% 28%', columnGap: '56px', rowGap: 0, alignItems: 'start', width: '100%' }}>
												{/* Column 1: DOORS */}
												<div>
													<div style={{ marginBottom: '30px' }}>
														<a href="/doors/" style={{ color: '#fff', fontWeight: 600, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em', textDecoration: 'none', display: 'block' }}>Doors</a>
													</div>
													<div style={{ color: '#635548', fontWeight: 500, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Residential doors</div>
													<ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
														<li><a href="/doors/panic-room-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Panic room doors</a></li>
														<li><a href="/doors/high-security-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>High security doors</a></li>
														<li><a href="/doors/bespoke-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Bespoke doors</a></li>
													</ul>
													<div style={{ color: '#635548', fontWeight: 500, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '40px' }}>Commercial doors</div>
													<ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
														<li><a href="/doors/communal-entrance-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Communal entrance doors</a></li>
														<li><a href="/doors/fire-resistant-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Fire resistant doors</a></li>
														<li><a href="/doors/bullet-proof-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Bullet proof doors</a></li>
														<li><a href="/doors/profile-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Profile doors</a></li>
													</ul>
													<ul style={{ listStyle: 'none', margin: '10px 0 0', padding: '0 0 0 35px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
														<li><a href="/doors/profile-doors/unico-slim-line/" style={{ color: '#dcd7ca', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>UNICO SLIM LINE</a></li>
														<li><a href="/doors/profile-doors/fuego-fire/" style={{ color: '#dcd7ca', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>FUEGO FIRE</a></li>
														<li><a href="/doors/profile-doors/presto-bullet-proof/" style={{ color: '#dcd7ca', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>PRESTO BULLET PROOF</a></li>
														<li><a href="/doors/profile-doors/stainless-steel/" style={{ color: '#dcd7ca', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>STAINLESS STEEL</a></li>
													</ul>
													<div style={{ color: '#635548', fontWeight: 500, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '40px' }}>Decorative doors</div>
													<ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
														<li><a href="/doors/arch-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Arch doors</a></li>
														<li><a href="/doors/curved-glass-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Curved glass doors</a></li>
														<li><a href="/doors/stained-glass-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Stained glass doors</a></li>
														<li><a href="/doors/industrial-style-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Industrial style doors</a></li>
													</ul>
													<div style={{ marginTop: '20px' }}>
														<a href="/door-styles/" style={{ display: 'inline-block', backgroundColor: '#dcd7ca', color: '#635548', fontSize: '14px', fontWeight: 400, padding: '14px 24px', textDecoration: 'none' }}>Explore door styles</a>
													</div>
													<ul style={{ listStyle: 'none', margin: '14px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
														<li><a href="/door-styles/victorian-doors/" style={{ color: '#dcd7ca', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Victorian doors</a></li>
														<li><a href="/door-styles/edwardian-doors/" style={{ color: '#dcd7ca', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Edwardian doors</a></li>
														<li><a href="/door-styles/georgian-doors/" style={{ color: '#dcd7ca', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Georgian doors</a></li>
														<li><a href="/door-styles/french-doors/" style={{ color: '#dcd7ca', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>French doors</a></li>
													</ul>
												</div>

												{/* Column 2: WINDOWS + GRILLES, SHUTTERS */}
												<div style={{ paddingTop: '40px' }}>
													<div style={{ marginBottom: '10px' }}>
														<a href="/windows/" style={{ color: '#fff', fontWeight: 600, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em', textDecoration: 'none', display: 'block' }}>Windows</a>
													</div>
													<ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
														<li><a href="/windows/high-security-steel-windows/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>High security steel windows</a></li>
														<li><a href="/windows/security-aluminium-windows/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Security aluminium windows</a></li>
													</ul>
													<div style={{ marginTop: '60px', marginBottom: '10px' }}>
														<a href="/grilles-shutters/" style={{ color: '#fff', fontWeight: 600, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em', textDecoration: 'none', display: 'block' }}>Grilles, shutters</a>
													</div>
													<ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
														<li><a href="/grilles-shutters/security-shutters/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Security shutters</a></li>
														<li><a href="/grilles-shutters/high-security-shutters/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>High security shutters</a></li>
														<li><a href="/grilles-shutters/colllabsible-grilles/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Collabsible grilles</a></li>
													</ul>
												</div>

												{/* Column 3: GARAGE DOORS */}
												<div style={{ paddingTop: '40px' }}>
													<div style={{ marginBottom: '10px' }}>
														<a href="/garage-doors/" style={{ color: '#fff', fontWeight: 600, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.02em', textDecoration: 'none', display: 'block' }}>Garage doors</a>
													</div>
													<ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
														<li><a href="/garage-doors/sectional-garage-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Sectional garage doors</a></li>
														<li><a href="/garage-doors/tracless-garage-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Tracless garage doors</a></li>
														<li><a href="/garage-doors/side-hinged-garage-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Side hinged garage doors</a></li>
														<li><a href="/garage-doors/sliding-garage-doors/" style={{ color: '#fff', fontWeight: 400, fontSize: '14px', textDecoration: 'none', display: 'block' }}>Sliding garage doors</a></li>
													</ul>
												</div>

												{/* Column 4: flat links (Products off-canvas menu) */}
												<div style={{ paddingTop: '30px' }}>
													<ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
														<li><a href="/products/" style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', textDecoration: 'none', display: 'block' }}>Products</a></li>
														<li><a href="/security-levels/" style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', textDecoration: 'none', display: 'block' }}>Security levels</a></li>
														<li><a href="https://gallery.secure-house.co.uk/" style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', textDecoration: 'none', display: 'block' }}>Gallery</a></li>
														<li><a href="/projects/" style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', textDecoration: 'none', display: 'block' }}>Projects</a></li>
														<li><a href="/about-us/" style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', textDecoration: 'none', display: 'block' }}>About Us</a></li>
														<li><a href="/trade/" style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', textDecoration: 'none', display: 'block' }}>Trade</a></li>
														<li><a href="/blog/" style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', textDecoration: 'none', display: 'block' }}>Blog</a></li>
														<li><a href="/contact-us/" style={{ color: '#fff', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', textDecoration: 'none', display: 'block' }}>Contact us</a></li>
													</ul>
												</div>
											</div>
											<div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
												<a href="mailto:info@secure-house.co.uk" style={{ color: '#635548', fontSize: '14px', fontWeight: 500, textDecoration: 'none' }}>info@secure-house.co.uk</a>
												<span style={{ color: '#635548', fontSize: '14px', fontWeight: 500 }}>
													Customer support: <a href="tel:+442078594207" style={{ color: '#635548', fontWeight: 500, textDecoration: 'none' }}>+44 20 7859 4207</a>
												</span>
											</div>
										</nav>
				</div>,
				document.body
			)}
		</>
	);
}
