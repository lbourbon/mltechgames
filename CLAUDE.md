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

Pages are static (`src/pages/`) and share `src/layouts/Base.astro`, which includes the header, footer and dialogs (`src/components/Janelas.astro`, behavior in `src/lib/interface.ts`). Its `voltar` prop swaps the logo for a back button, in the header so it costs no height on small phones. Any element with `data-abrir="<dialog id>"` opens that dialog.

`src/lib/firebase.ts` is the only entry point to Firebase, through dynamic imports. `src/lib/conta.ts` holds the account logic:

- `localStorage` is always the working copy of the active profile's progress, under `mltg:progresso:<jogoId>` (`src/lib/local.ts`). Firebase only loads on pages when the `mltg:sessao` marker is set, or when the login dialog opens.
- Firestore paths are `usuarios/{uid}/perfis/{perfilId}` (`{ avatar, criadoEm }`) and `.../progresso/{jogoId}` (`{ recorde, fase, atualizadoEm }`).
- On login, anonymous progress merges into the chosen profile with `mesclar` (`src/lib/progresso.ts`), which keeps the max of each field. Switching profiles clears the local copy so children's progress doesn't mix, and logout does the same for shared devices.
- Sync only writes what differs, so opening a page costs reads but no writes.

`firestore.rules` denies everything except an owner's own profiles and progress, and only lets `recorde` and `fase` go up. Avatar ids are duplicated between `src/lib/perfis.ts` and `perfilValido` in the rules, and a rules test keeps them aligned.

Browser popups must open directly from a click. Load the SDK before the click (`firebaseCarregado`), and don't put `confirm()` or other awaits before `signInWithPopup` or `reauthenticateWithPopup`.

The `apiKey` in `firebase.ts` is a Firebase web key, which is public by design.

### Games

Everything a game shares lives in one place, so a change reaches all games at once and a new game only writes its mechanic:

- `src/lib/jogos.ts` is the single source of each game's id and texts. It is read at build time only: don't import it from browser code, or every game ships every game's text.
- `src/layouts/Jogo.astro` renders the page shell: header stats (`.placa`), the slot for the game's scene, and `#painel` with the title and instructions in the static HTML.
- `src/jogos/kit/` has the browser side. `moldura.ts` owns the start and end screens, record, saving, the login invite and redrawing after login or a profile change. `tempo.ts` has `esperar` (respects reduced motion) and `criarLaco` (real-time loop with capped `dt`). `dom.ts` has `aoTocar`. `sorteio.ts` has `Rng`, `sortear` and `embaralhar` and is the only DOM-free kit file, so it's the only one `logica.ts` may import. `som.ts` synthesizes sound with Web Audio (`tom`, `chiado`, `melodia`), so there are no audio files or requests. Sounds only follow a child's action and there is no background music. `efeitos.ts` has throwaway visual effects (`flutuar`, `estourar`, `lancar`, `confete`, `animar`, `pular`, `tremer`), which are skipped under reduced motion. `moldura` owns the sound button and the end-of-game sound; each game's sounds live in its `sons.ts`.

`site.css` and `jogo.css` sit in the `compartilhado` cascade layer, so a game's unlayered `jogo.css` always wins. The build's CSS order can't be relied on: it changed just by moving an import into a layout.

Keep the kit small: move code there when a second game needs it, or when it holds a rule every game must get right, like the three above. Mechanics stay in each game, including similar ones, because forcing games into one mold costs more than some repetition. The kit loads on every game page, so heavy libraries never go in it. A game with its own engine, like Phaser, still uses the layout and `moldura`, and draws inside the slot.

### Adding a game

1. Add it to `JOGOS` in `src/lib/jogos.ts`. The `id` is the progress key and the page path, so it can't change after publishing. Its `pratica` text appears on the guardians' page. Add the card art at `public/img/jogos/<id>.svg` (640x400).
2. Put the code in `src/jogos/<id>/`, with the rules in a DOM-free `logica.ts` with an injectable `rng`, tested in `tests/unit/<id>.test.ts`.
3. Create `src/pages/jogos/<id>.astro` with `<Jogo id="<id>">` around the scene, importing the game's `jogo.css` and, in a `<script>`, its `jogo.ts`. Add heavy libraries such as Phaser only to games that need them, so they stay out of other pages.
4. In `jogo.ts`, call `criarMoldura({ aoComecar, aoSeguir })`. Use `placa` to draw, `salvar` at each phase, `mostrar` for the game's own screens (a button with `data-acao="seguir"` returns to the game) and `fim` to end. Only use `aoMudarConta` directly for progress drawn outside the panel.

`tests/unit/catalogo.test.ts` fails if a page, folder or test is missing or isn't in the catalog. `tests/e2e/site.spec.ts` loops over `JOGOS`, so each new game is already checked for opening from the home page, starting, JS errors, third-party requests and bundle size. Only write e2e tests for what's specific to the game.

`src/jogos/monstrinho/` is the simplest reference: children tap falling numbers to reach the monster's exact hunger, which practices addition, and `proximaBolha` guarantees a usable number is always available.

`src/jogos/robo/` is turn-based on purpose, with no timer, because the point is planning. Limited charges add up against enemy defense, and enemies are generated by splitting the charges among them, so every phase is solvable. Balance is tested: `tests/unit/robo.test.ts` simulates simple strategies and requires that "biggest that fits" stops being enough in high phases. Returning charges on exact hits made that strategy always win, so keep exact hits as points only.

`src/jogos/submarino/` is the most complex one: children assemble a route from cards, then watch it run, and a failed route stays on screen to be fixed. `rodar` in `logica.ts` is a small interpreter that returns every step, and `jogo.ts` only animates them. Phases are generated from a secret route whose trail becomes the map, so every phase is solvable. `gerarFase` rejects maps where the route would fit in the slots as plain moves, which is what makes the new card necessary. Only crashes cost a life: fixing mistakes is the game, so running out of treasure or walking in circles is free, and the map never changes between attempts. The 🔁 block is drawn in place of its card inside the route, so children see what comes before and after it, which is why a route holds only one. ⭐ stays in its own box because it can be used several times.

## Conventions

User-facing text, code comments and identifiers are in Brazilian Portuguese. The exception is this file. Touch targets must be large enough for small hands, and tap handlers on moving elements use `aoTocar`, which acts on `pointerdown`.

`PIX_COPIA_E_COLA` in `src/lib/site.ts` and `public/img/qrcode-pix.jpeg` hold the same payload and must change together.
