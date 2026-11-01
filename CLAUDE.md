# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ML Tech Games is a site of free, browser-only educational games for children, in Brazilian Portuguese. It is built with Astro and TypeScript, hosted on Cloudflare Workers static assets, and uses Firebase Auth and Firestore (project `mltechgames`) only for optional saved progress.

Product rules that drive design decisions:

- **Learning stays hidden.** The skill must be the game mechanic, not a quiz between rounds. Kid-facing text never mentions learning or school.
- **Play first.** Nobody needs an account to play, and anonymous players load no Firebase code and make no third-party requests. A test enforces this.
- **The account belongs to the adult.** Children are profiles inside it, identified only by an avatar from a closed list. This is how the site approaches art. 24 of the ECA Digital (Lei 15.211/2025). Never add children's names, ages, photos or any free-text field.
- **Free, with donations from adults.** Donations never give in-game advantages.

Every game must avoid loot boxes, purchases, chat or user-to-user contact, public rankings, notifications, autoplay and rewards for time spent (ECA Digital arts. 17, 20 and 21). Scores come from the client and can be forged, so a leaderboard would also need server-side validation. `src/pages/responsaveis.astro` tells guardians what the site stores and does not do: update it whenever that changes.

## Commands

```sh
npm run dev            # Astro dev server
npm run preview        # serve dist/ with Wrangler, as in production (run build first)
npm run build
npm run check          # type-check
npm test               # unit tests
npx vitest run tests/unit/pix.test.ts   # one file
npm run test:regras    # Firestore rules, in the emulator (needs Java)
npm run test:e2e       # Playwright + Auth and Firestore emulators (needs Java)
npm run deploy         # build and publish to Cloudflare
npm run deploy:regras  # publish firestore.rules to Firebase
```

To run one e2e test: `npx firebase emulators:exec --only auth,firestore --project demo-mltg "playwright test conta.spec.ts"`.

E2e tests run against a separate build in `.dist-e2e/`, created with `PUBLIC_EMULADOR=1`, served by Wrangler. Don't use `astro preview` for them: it detached into the background and made Playwright's web server exit. The Auth emulator's popup is driven for real, because popups have browser restrictions that hooks would hide.

## Architecture

Pages are static (`src/pages/`) and share `src/layouts/Base.astro`, which includes the header, footer and dialogs (`src/components/Janelas.astro`, behavior in `src/lib/interface.ts`). Any element with `data-abrir="<dialog id>"` opens that dialog.

`src/lib/firebase.ts` is the only entry point to Firebase, through dynamic imports. `src/lib/conta.ts` holds the account logic:

- `localStorage` is always the working copy of the active profile's progress, under `mltg:progresso:<jogoId>` (`src/lib/local.ts`). Firebase only loads on pages when the `mltg:sessao` marker is set, or when the login dialog opens.
- Firestore paths are `usuarios/{uid}/perfis/{perfilId}` (`{ avatar, criadoEm }`) and `.../progresso/{jogoId}` (`{ recorde, fase, atualizadoEm }`).
- On login, anonymous progress merges into the chosen profile with `mesclar` (`src/lib/progresso.ts`), which keeps the max of each field. Switching profiles clears the local copy so children's progress doesn't mix, and logout does the same for shared devices.
- Sync only writes what differs, so opening a page costs reads but no writes.

`firestore.rules` denies everything except an owner's own profiles and progress, and only lets `recorde` and `fase` go up. Avatar ids are duplicated between `src/lib/perfis.ts` and `perfilValido` in the rules, and a rules test keeps them aligned.

Browser popups must open directly from a click. Load the SDK before the click (`firebaseCarregado`), and don't put `confirm()` or other awaits before `signInWithPopup` or `reauthenticateWithPopup`.

The `apiKey` in `firebase.ts` is a Firebase web key, which is public by design.

### Adding a game

1. Put the code in `src/jogos/<id>/`, with the rules in a DOM-free `logica.ts` with an injectable `rng`, tested in `tests/unit/`.
2. Create `src/pages/jogos/<id>.astro` using `Base.astro`. Add heavy libraries such as Phaser only to games that need them, so they stay out of other pages.
3. Save with `registrarResultado(id, { pontos, fase })` and read with `lerProgresso(id)`. Redraw in `aoMudarConta`, which fires after login sync and profile changes.
4. Add it to `src/lib/jogos.ts`. The `id` is the progress key, so it can't change after publishing.

`src/jogos/monstrinho/` is the reference implementation. Children tap falling numbers to reach the monster's exact hunger, which practices addition, and `proximaBolha` guarantees a usable number is always available.

## Conventions

User-facing text, code comments and identifiers are in Brazilian Portuguese. The exception is this file. Touch targets must be large enough for small hands, and tap handlers on moving elements act on `pointerdown` (see `jogo.ts`).

`PIX_COPIA_E_COLA` in `src/lib/site.ts` and `public/img/qrcode-pix.jpeg` hold the same payload and must change together.
