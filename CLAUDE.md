# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ML Tech Games is a site of free, browser-only educational games for children, in Brazilian Portuguese, hosted on Firebase (project `mltechgames`). There are no downloads.

Product rules that drive design decisions:

- **Learning stays hidden.** The skill must be the game mechanic, not a quiz between rounds. Kid-facing text never mentions learning or school. Only the "Para os adultos" section does.
- **Play first, login later.** Nobody needs an account to play. Login only appears as an offer to keep progress across devices.
- **Free, with a donation button.** Donations go through the PIX QR code in `public/img/qrcode-pix.jpeg`, and the copy addresses adults.
- **Minimal data about children.** Don't write names, emails or ages to Firestore. The account name is only displayed from the auth session.

## Commands

There is no build step or package manager, and the directory is not a git repository. `public/` is deployed as is. Run from the repo root:

```sh
firebase serve --only hosting --port 5055  # preview locally
node --test "tests/*.test.js"              # all tests
node --test tests/monstrinho.test.js       # one file
firebase deploy --only hosting             # publish public/
firebase deploy --only firestore:rules     # publish firestore.rules
```

`tests/` is outside `public/`, so it isn't deployed.

## Architecture

Pages use root-absolute paths (`/js/...`, `/css/...`) and native ES modules. Each page loads `/js/topo.js`, which injects the shared header, footer and donation dialog.

`public/js/conta.js` is the only module that touches Firebase and localStorage:

- `localStorage` is always the working copy, under `mltg:progresso:<jogoId>`, for anonymous and logged-in players alike. There is no Firebase Anonymous Auth: an anonymous player simply has no Firebase user.
- On login (Google popup), local and remote progress are merged by `mesclar` in `public/js/progresso.js`, which keeps the max of each field, and written to `usuarios/{uid}/progresso/{jogoId}` as `{ recorde, fase, atualizadoEm }`.
- Logout clears local progress so it doesn't pass to the next child on a shared device.
- The Firebase SDK comes from the gstatic CDN through a dynamic import, so games still work if it fails to load. Subscribe with `aoMudarConta`, which fires again after the login sync, and redraw from `lerProgresso`.

`firestore.rules` allows each user to access only their own progress, validates the document shape and only lets `recorde` and `fase` go up. Scores come from the client, so they can be forged. A public leaderboard would need server-side validation.

The `apiKey` in `conta.js` is a Firebase web key, which is public by design.

### Adding a game

1. Create `public/jogos/<id>/` with `index.html` (loading `/css/site.css` and `/js/topo.js`), its CSS and JS.
2. Keep the rules in a DOM-free `logica.js` with an injectable `rng`, and test them in `tests/`.
3. Save with `registrarResultado(id, { pontos, fase })`. The returned and stored values are merged, so a worse run never lowers progress.
4. Add it to `public/js/jogos.js`. The `id` is the progress key, so it can't change after publishing.

`public/jogos/monstrinho/` is the reference implementation. Children tap falling numbers to reach the monster's exact hunger, which practices addition. `proximaBolha` guarantees a usable number is always available.

## Conventions

User-facing text, code comments and identifiers are in Brazilian Portuguese. Touch targets must be large enough for small hands, and any tap handler on a moving element should act on `pointerdown` (see `jogo.js`).
