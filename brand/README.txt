TRAINABILITY COACH - LOGO KIT

Colors
  Cerulean  #007BA7  (badge on light backgrounds, C on dark)
  Sky       #4FA8DC  (chevron and "COACH" on dark)
  Navy      #172A3A  (dark background, "TRAINABILITY" on light)
  White     #FFFFFF

Folders
  badge/     The mark on its own. "light" = for light backgrounds (cerulean badge),
             "dark" = for dark backgrounds (white badge). SVG + PNG 256-2048 px.
  lockup/    Stacked mark + TRAINABILITY® COACH. Transparent SVG/PNG for light and
             dark backgrounds, plus a version on navy.
             Also side by side, mark + COACH, as Studio's header logo
             (coach-horizontal-*): "dark" = white badge and COACH in Sky, for dark
             backgrounds; "light" = cerulean badge and COACH in Cerulean; plus
             one on navy with room around it. SVG + PNG 600/1500/3000 px wide.
  app-icon/  Full-bleed square on navy. iOS/Android round the corners themselves,
             so don't pre-round it. PNG 48-1024 px.
  favicon/   favicon.svg, favicon.ico (16/32/48), PNGs incl. 180 px apple-touch icon.

Notes
  SVGs are fully vector; the wordmark is converted to outlines (no font needed).
  Wordmark is set in Poppins Bold as a stand-in. Swap in the Studio wordmark font
  before final release so Coach and Studio match.

  Mark: soft hexagon badge, a C that follows the hexagon outline,
  and a chevron that picks up where the C stops. On light backgrounds the badge
  is cerulean with everything inside in white.
  The ® symbol should only be used where TRAINABILITY is a registered mark for
  this kind of product; confirm with your trademark attorney before release.

In the app (copied from this kit, 18 Oct 2026; replace them together with the kit)
  src/assets/coach-badge-light.svg, coach-badge-dark.svg   the header's logo badge
  src/assets/coach-lockup-light.svg, coach-lockup-dark.svg the sign-in screen
  src/assets/coach-app-icon.png                            app-icon 192, the apps panel
  public/apple-touch-icon.png                              app-icon 180, the iPhone home screen
  public/coach-app-icon-192.png, coach-app-icon-512.png    the manifest (Android, installs)
  public/favicon.svg, favicon.ico                          the browser tab
  src/chrome/CoachWordmark.jsx                             COACH cut from the lockup's outlines
  Whenever the icons change, raise the ?v= number on their addresses in
  index.html and public/manifest.webmanifest, so phones fetch the new picture.

The app icon's ground (20 Oct 2026, build 1.0.171; Glenn: "Can we get a more
defined gradient background on the app icon like the studio app icon? It looks
like one solid dark blue right now."): a gradient from the top left #1B6693 to
the bottom right #0E1B26, in place of the kit's flat Navy #172A3A, as Studio's
icon runs from a light purple to a dark one. Only the ground changed; the mark
is the kit's. app-icon/coach-app-icon.svg holds it, and every PNG of the icon
was drawn again from it (at 2048 px, then made smaller).

The side-by-side logo (23 Oct 2026; Glenn, with Studio's mark + STUDIO on
dark: "can we create something similar for Coach like this for Studio, with
coaches colors?"): built from this kit's own parts, the badge (badge/) and
COACH's outlines (as src/chrome/CoachWordmark.jsx has them), COACH 36% of the
badge's height and 32 units from it, as Studio's STUDIO sits beside its mark.

