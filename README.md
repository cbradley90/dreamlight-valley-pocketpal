# Dreamlight Valley PocketPal

A progress tracker for Disney Dreamlight Valley's **Dreamlight Duties**. Enter
how far you've got on each task tier and the app works out your completion
percentage across every expansion you own — and grows a wishing well tree
through six stages as you go.

Progress is saved in your browser by default. Sign in to sync it to your
account and pick it up on another device.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Cloud sync is optional — the app works fully offline with no setup. To enable
it locally, copy `.env.example` to `.env.local` and fill in your Supabase
project's URL and anon key (Settings → API in the Supabase dashboard), then
run `supabase/schema.sql` once in that project's SQL editor.

## Other commands

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Unit tests for the progress maths |
| `npm run test:smoke` | Boot the built app in jsdom and check it works (needs `build` first) |
| `npm run test:all` | Unit tests, build, then smoke tests |
| `npm run validate:data` | Check `tasks.json` invariants |

## Features

- **Own only what you own.** Toggle expansions off and they drop out of your
  percentage entirely, so the number reflects your actual game.
- **Six-stage tree.** Hits Stage 1 at 10% and Stage 5 at 90%.
- **Search** across task names, categories and requirement text.
- **Add your own tasks** for expansions where the tier data is incomplete.
- **Export / import** your save as JSON to move between browsers or devices.
- **Optional account sync.** Sign in with email + password to save progress to
  your account instead of just this browser.

## Where your data lives

Signed out: in `localStorage`, under the key `dlv-tracker-progress`, in the
browser you're using. Clearing site data wipes it — use **Export save** first,
or before switching devices.

Signed in: in Supabase, in a `progress` row scoped to your account and
protected by Row Level Security — only you can read or write it. The first
time you sign in on a device with existing local progress, you'll be offered
the chance to import it into your account.

## Deploying

Live at **https://dreamlight-valley-pocketpal.netlify.app**.

`netlify.toml` holds the build settings. The repo is linked to Netlify through
its GitHub app, so pushes to `main` build and deploy automatically, and pull
requests get deploy previews.

CI runs on every push and PR: task data validation, unit tests, and a
production build.

## Contributing task data

`src/data/tasks.json` is the source of truth for tier requirements. Honeyglow
Woods and Wishblossom Ranch were the hardest to verify, so corrections there are
especially welcome — open an issue with a screenshot of the in-game entry.

One hard rule: task `id` values are the keys players' saved progress is stored
under. **Never renumber or remove an existing id** — doing so silently destroys
progress for that task. Append new entries instead. `npm run validate:data`
enforces this against `scripts/task-ids.json`, and CI will fail the build if an
id disappears. If a removal really is intended, re-record the manifest:

```bash
npm run validate:data -- --write-manifest
```

See `CLAUDE.md` for the full data contract.

## Licence

MIT — see [LICENSE](LICENSE). Disney Dreamlight Valley is a trademark of Disney
and Gameloft; this is an unofficial fan tool with no affiliation.
