<div align="center">

<img src="public/icons/icon-192.png" alt="Ponyo Rally" width="96" height="96" />

# Ponyo Rally

**Run Americano, Mexicano and Mixicano tennis sessions from your phone, courtside.**
<br />
_Atur sesi tenis Americano, Mexicano, dan Mixicano langsung dari HP, di pinggir lapangan._

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-495%20passing-52894C)
![Offline](https://img.shields.io/badge/works-offline-06402B)

</div>

---

Paste the player list from your WhatsApp group, pick a format, and Ponyo Rally draws the pairs, assigns courts, tracks scores and keeps a live leaderboard. No account, no server, no internet needed once it's open. Everything stays on the host's phone.

> 🏟️ **Built for my local tennis club.** Ponyo Rally started as a tool for our own weekend social sessions: hosts who aren't tech people, standing courtside, with a list of names pasted from the group chat. Every decision, from big score buttons to Bahasa Indonesia first, comes from those sessions.

## ✨ Highlights

- **Six formats, real algorithms**: rotating partners, ranking-based pairing, fixed teams and mixed doubles, each with its own engine (not one shuffle with six labels).
- **Paste a list, done**: one name per line; numbering like `1.` or `-` is stripped, duplicates are kept as different people (`Sam`, `Sam 2`).
- **Thumb-friendly scoring**: a big keypad that fills in the other score when it can (first to 4: `2` → `4–2`; total 24: `14` → `14–10`).
- **Fair by design**: whoever rested least sits out next; late arrivals play first; repeats of partners and opponents are kept to a minimum.
- **Fix anything courtside**: replace or swap players mid-round, correct old scores, skip a game, redraw a round, with Undo instead of nagging dialogs.
- **A leaderboard worth looking at**: podium, crown and medals, rank movement since last round, and a plain-language reason for every tie.
- **Built for daylight and non-tech hosts**: mobile-sized on every screen, large touch targets, light/dark/system theme, Bahasa Indonesia and English.
- **Yours and offline**: data lives in the browser with versioned backups (export/import), and the app installs to the home screen and opens with no signal.

## 🎾 Formats

| Format | Partners | Next round is decided by | Singles | Standings |
| --- | --- | --- | :---: | --- |
| **Americano** | Rotate every round | Round-robin rotation | ✅ | Per player |
| **Team Americano** | Fixed pairs | Round-robin of teams | – | Per team |
| **Mix Americano** | Rotate, always 1 man + 1 woman | Rotation | – | Per player |
| **Mexicano** | By ranking (1st & 4th vs 2nd & 3rd) | Current standings | ✅ | Per player |
| **Team Mexicano** | Fixed pairs | Swiss-style, closest unplayed team | – | Per team |
| **Mixicano** | By ranking, always mixed | Current standings | – | Per player |

**Two ways to win a match**, chosen per game:

- **First to N**: the first side to reach N wins (`4–2`, `4–3`).
- **Total N**: rally until both scores add up to N (`14–10` for 24).

**Ranking**: points → point difference → wins → fewer rests → name. Every tie shows _why_ one row sits above another.

## 🧠 How the engine works

```
generateRound(tournament) ─► pick who rests (fewest rests first, seeded tie-break)
                         ─► build pairs   (circle-method round-robin when it fits,
                         │                 otherwise bounded local search)
                         ─► place on courts (minimise repeats, spread courts)
```

- **Deterministic**: the same tournament always produces the same round (seeded RNG); _Redraw_ moves to a fresh rotation.
- **Priorities, in order**: valid round → fair rests → no repeated partners → few repeated opponents → court variety.
- **Proven by tests**: 8, 12 and 16 players get zero repeated partners over a full cycle; 9 players on 2 courts rest exactly once each; mixed teams are always one man and one woman, even with unequal numbers.

The engine is pure TypeScript with no React or browser APIs (`src/domain/engine`), so it's fully unit-tested on its own.

## 🚀 Getting started

Requires **Node.js 20.9+**.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Static production build into `out/` |
| `npm test` | Run the unit tests (Vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |
| `node scripts/generate-icons.mjs` | Rebuild app icons from the logo |

## 📦 Deploy

The app is a **static export**: `npm run build` produces a folder of plain HTML/CSS/JS in `out/`. Host it anywhere that serves static files (Vercel, Netlify, Cloudflare Pages, GitHub Pages, Nginx). No server, no database, no environment variables.

Serve over **HTTPS** so the offline service worker and "Add to Home Screen" work.

## 🗂️ Project structure

```
src/
├── app/            Routes only: /, /new, /tournament, /settings, 404, manifest
├── features/       Screens and their hooks
│   ├── home/           Game list
│   ├── wizard/         4-step game creation (format, details, players, teams, review)
│   ├── tournament/     Matches, score keypad, substitutions, leaderboard, players
│   └── settings/       Language, theme, backup / import / reset
├── components/     Design-system pieces: Button, Sheet, Segmented, Stepper, TabBar, Toaster…
├── domain/         Pure TypeScript, no React
│   ├── engine/         Round generation per format + shared scheduling
│   ├── operations/     Score, skip, substitute, next round, roster changes
│   ├── validation/     Setup rules for the wizard
│   └── roster/         Paste parsing, display names for duplicates
├── persistence/    localStorage repository, schema (zod), migrations, backup
├── store/          Zustand stores: open tournament, wizard draft, prefs, toasts
├── i18n/           Typed id/en dictionaries (a missing key is a type error)
├── theme/          Flash-free theme boot script + system theme sync
└── constants/      Formats, limits, routes, storage keys, motion
```

**The rule of thumb**: `app → features → components / store → domain`. Business rules live in `domain/` and never import React, so they can be tested and reasoned about on their own.

## 💾 Data & privacy

- **Local-first**: tournaments are stored in the browser's `localStorage`, one key per tournament (a 16-player, 15-round event is under 8 KB).
- **Nothing is sent anywhere**: there is no backend, analytics or account.
- **Safe storage**: every record is versioned and migrated on read; unreadable data is set aside for download instead of being deleted; a full storage shows a clear message instead of crashing.
- **Backups**: _Settings → Export backup_ saves everything to a `.json` file; _Import_ previews the file and lets you merge or replace. Browser storage is not a permanent backup, so export before switching phones.

## 🎨 Design system

Brand green `#06402B` with a supporting palette from `#2A643D` to `#F9F871`, exposed as semantic tokens (`bg`, `surface`, `primary`, `accent`, `danger`…) with light and dark variants. Funnel Display for type, Heroicons for icons, 48 px minimum touch targets, and short motion that respects _reduce motion_.

## 🧪 Testing

```bash
npm test
```

Unit tests cover the scoring rules, standings and tie-breakers, every format's engine (validity and fair rests across hundreds of player/court combinations), substitutions, the wizard's validation, paste parsing, persistence, migrations and backup import.

## 🗺️ Roadmap

- End-to-end tests (Playwright) and automated accessibility checks (axe)
- Optional shared live leaderboard for players' own phones (needs a small backend)
- Knockout finals after the group session

## 📝 Notes

- The splash artwork features a professional player and a tournament crest. Replace or license it before a public release.
- No license has been chosen yet; all rights reserved by the author until one is added.
