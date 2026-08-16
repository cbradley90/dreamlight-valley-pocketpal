# Dreamlight Valley PocketPal

A progress tracker for Disney Dreamlight Valley's **Dreamlight Duties**. Enter
how far you've got on each task tier and the app works out your completion
percentage across every expansion you own — and grows a wishing well tree
through six stages as you go.

Progress is saved in your browser. Nothing is sent to a server.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Other commands

| Command | What it does |
| --- | --- |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm test` | Run unit tests |

## Features

- **Own only what you own.** Toggle expansions off and they drop out of your
  percentage entirely, so the number reflects your actual game.
- **Six-stage tree.** Hits Stage 1 at 10% and Stage 5 at 90%.
- **Search** across task names, categories and requirement text.
- **Add your own tasks** for expansions where the tier data is incomplete.
- **Export / import** your save as JSON to move between browsers or devices.

## Where your data lives

In `localStorage`, under the key `dlv-tracker-progress`, in the browser you're
using. Clearing site data wipes it. Use **Export save** before you do that, or
before switching devices — there's no account and no cloud sync.

## Deploying

Hosted on Netlify. `netlify.toml` has the build settings; connect the repo in
the Netlify dashboard and pushes to `main` deploy automatically.

## Contributing task data

`src/data/tasks.json` is the source of truth for tier requirements. Task `id`
values are the keys used in saved progress — **never renumber existing ids**, or
players lose their data. Append new entries instead. See `CLAUDE.md` for the
full data contract.

## Licence

Personal project. Disney Dreamlight Valley is a trademark of Disney and
Gameloft; this is an unofficial fan tool with no affiliation.
