# ThinLine Radio — personal fork notes

Ian's fork of ThinLine Radio (itself an Rdio Scanner fork), front-end for a
trunk_recorder setup. Two systems (EBRCS, LBNL), ~64 talkgroups, one user. Runs
on the local network; reached remotely over Tailscale. Not a multi-tenant
deployment — the user-management, registration and Stripe machinery inherited
from upstream is unused but still load-bearing enough to leave alone.

Branded **SCANOPTICON by AirplaneIan** in the browser tab and PWA manifest; the
in-app logo comes from server-side branding config.

## Working rules

- **Front end only.** Templates, component display logic and SCSS are fair game.
  Services that make HTTP calls, server routes, backend config, and data models
  that mirror server schemas are off limits.
- Don't rip out user management. `alert_engine.go` alone has ~47 `UserID`
  references, and device tokens, push notifications and transfer requests hang
  off the same identity. Scan lists and favorites are client-side and unaffected,
  but there is no `allowAnonymous` option to fall back to.

## Previewing changes

`ng serve` on port 4200, proxied to the production server. Ian runs it in his own
terminal; Claude edits files and webpack hot-reloads.

```
cd client && npx ng serve --port 4200
```

Two things that will waste an hour if forgotten:

1. **The proxy target lives in `client/src/proxy.conf.local.js`, which is
   gitignored.** `proxy.conf.js` defaults to `localhost:3000` and picks that file
   up if present. Use the **IPv4 literal** (`192.168.1.226`) there — Node
   resolves `tiverton.local` to public IPv6 addresses first via mDNS and they
   aren't routable, so proxying by hostname dies with `EHOSTUNREACH`. curl masks
   this by falling back to IPv4.
2. **macOS Local Network privacy** blocks LAN connections from a `node` spawned
   under Claude Code — every LAN address returns `EHOSTUNREACH` while loopback
   and the public internet work fine. Hence Ian running the dev server himself.

Auth is a bearer token in `localStorage`, no cookies, so login works through the
proxy. The server injects `window.initialConfig` into *its own* `index.html`,
which the dev server doesn't serve — so in dev the auth screen is unbranded and
Turnstile is off. Expected, not a bug.

Deploying is still the old loop: `npm run build` in `client/` (output goes to
`server/webapp`), build the exe, copy to the Windows box, restart.

```
cd client && npm run build
cd server && GOOS=windows GOARCH=amd64 go build -o ../thinline-radio.exe .
```

The Angular build is not optional — `server/webapp.go` has `//go:embed all:webapp`,
so the binary bakes in whatever is in `server/webapp/` at compile time. Skip it
and you ship an exe with a stale front end.

On the Windows box, launch the exe **from its install folder** (double-click it
there). `BaseDir` is the directory containing the *executable*, not the working
directory, so running a copy from somewhere else finds no `thinline-radio.ini`
and drops into the interactive setup wizard. If that ever happens, Ctrl+C out —
completing the wizard rewrites the ini and can clobber the real database
credentials.

## UI architecture

- Design tokens in `client/src/styles/_thinline-tokens.scss`, mixins in
  `_thinline-mixins.scss`. Dark by default, `.thinline-skin--light` for light.
  The neon/scanline/glow variables from the original skin are deliberately
  neutered — `tlr-scanlines()` is a no-op kept so call sites still compile.
- `.thinline-skin` is applied to `rdio-scanner-chassis`, so component
  `:host-context(.thinline-skin)` blocks *are* live. Restyling a component means
  porting its skin overrides too, or they silently rot.
- **The global Angular Material theme is LIGHT** (`styles.scss`), with dark
  scoped to `.admin-dark-theme`. Any Material component in the scanner UI needs
  its own dark styling or it renders white-on-white.
- Text selection: content is selectable app-wide; only chrome opts out. The
  global rule lives at the bottom of `styles.scss` (buttons, labels, icons,
  Material tabs/sliders/checkboxes, `[role="button"]`, `[role="tab"]`), with
  per-component rules for click targets that aren't `<button>`. Don't
  reintroduce `user-select: none` on a component `:host` — it inherits into
  everything, including embedded child components, and was why transcripts
  couldn't be copied.

## Recent work (2026-09-08)

- **Channels pane rebuilt as a button grid.** The systems sidebar and the
  expand-then-click-a-radio-button rows are gone. Systems stack full-width, tag
  sections inside them, and a wrapping grid of channel tiles that toggle on
  click — closer to how classic Rdio Scanner worked. Favorite star sits in each
  tile's corner, always visible, dimmed when off. Tag sections default to
  expanded (`isTagExpanded` returns `?? true`). Scan Lists untouched.
- **Classic view removed entirely** — button, the `useClassicView` localStorage
  flag, the whole `mat-sidenav` layout, `main-legacy` and `select-legacy`
  (`select-legacy` was already orphaned), the classic-only alerts inner tab, and
  ~72 lines of sidenav SCSS. Removing the flag rather than just the button
  matters: anyone with the key still set to `true` would have been stranded.
- **Toolbar carries live status.** LINK pill, time, users, queue moved off their
  own row into the toolbar's centre zone as a two-line stack, reclaiming vertical
  space. The zone is `flex: 1 1 0` — a zero basis keeps it from forcing Admin /
  Sign Out onto a second line. Deliberate break at 1400px (`.toolbar-break`
  spacer) and icon-only transport buttons below 900px; both thresholds were
  estimated from content widths, not measured.

## Gotchas worth remembering

- `<mat-panel-title>` / `<mat-panel-description>` render with classes
  `mat-expansion-panel-header-title` / `-description`. Styling `.mat-panel-title`
  matches nothing.
- The group class on the alerts expansion panels sits *on* the
  `<mat-expansion-panel>` element, so `.tone-alert-group .mat-expansion-panel`
  (descendant) never matched — it needs to be a compound selector. This is what
  made the alert cards render as blank white blocks.
- `styles.scss` references `docs/THINLINE_SKIN.md`, which doesn't exist.
