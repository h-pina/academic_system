# Browser tests

Two suites drive a real browser against the built application:

| Suite | What it checks |
|-------|----------------|
| `visual` | Screenshots of the main screens, in light and dark, desktop and phone, compared with reference images |
| `flows` | The main journeys: sign-in by CPF and matrícula, access per profile, students (create, duplicate, search, edit), departments, the API's field errors, prerequisite cycles, curriculum, URL state, theme, phone layout |

## Running

```bash
npm run test:e2e            # visual, then flows
npm run test:visual         # only the screenshots
npm run test:visual:update  # rewrite the reference screenshots
node e2e/run.mjs --only flows
```

The runner builds `api` and `frontend` when a build is missing (`--build`
forces it), starts the API on a throwaway SQLite database seeded with the
sample data (port 3001) and the built web app (port 3005), runs the suites and
stops everything. Stop the dev servers first: those ports must be free.

## The browser

There is no bundled browser. Set `BROWSER_PATH` to a Firefox or
Chrome/Chromium executable, or have `firefox`, `chromium`, `google-chrome` on
the `PATH`. Firefox is driven through WebDriver BiDi, Chrome through the
DevTools protocol.

Without a browser the run is **skipped with a warning** and exits 0. Set
`E2E_REQUIRE_BROWSER=1` (for example in CI) to make that an error.

## Visual regression

- References live in `e2e/__screenshots__/<browser>-<platform>/`. They depend
  on the browser and operating system (fonts, anti-aliasing), so each
  environment keeps its own set; generate yours with `test:visual:update`.
- Everything that varies is frozen: animations, caret, scrollbars, fonts are
  awaited, and the data is the fixed seed.
- A screenshot fails when more than `E2E_MAX_DIFF` of its pixels differ
  (default `0.0002`, that is 0.02%). `E2E_PIXEL_THRESHOLD` (default `0.1`) is
  the per-pixel colour tolerance. The same environment reproduces at 0.000%,
  so the limit is strict on purpose: a changed brand colour moves 0.1% to 1.5%
  of a screen.
- On failure the actual image and a diff image are written to
  `e2e/__diffs__/<environment>/` (git-ignored).
- After an **intended** visual change: look at the diffs, then run
  `npm run test:visual:update` and commit the new references with the change.

## Adding a flow or a screen

- A flow is an object in `suites/flows.mjs` with a `name` and a `run(ctx,
  check)`. Use the helpers in `support/page.mjs` (they find controls by label
  and role, not by CSS class), and call `check(name, ok, detail)`.
- A screen is one entry in `CASES` in `suites/visual.mjs`: path, user, a text
  that proves the data is on screen, and the viewport. Each case is captured
  in both themes.
