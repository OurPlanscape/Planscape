# Interface

Angular frontend for [Planscape](https://www.planscape.org/).

## Requirements

- **Node.js 20.19.0** — managed via [nodenv](https://github.com/nodenv/nodenv) or [nvm](https://github.com/nvm-sh/nvm).
  The required version is pinned in `.node-version`. Your version manager should pick it up automatically when you `cd` into this directory.
- **npm** — bundled with Node.js

## Setup

```bash
# From src/interface/
npm install
```

## Development server

```bash
npm start          # ng serve — app available at http://localhost:4200/
```

The app reloads automatically on source file changes.

## Build

```bash
npm run build       # development build
npm run build:prod  # production build (output in dist/)
```

## Tests

```bash
npm test            # unit tests via Karma
npm run test:prod   # headless unit tests with coverage
npm run e2e         # Playwright end-to-end tests
npm run e2e:ui      # Playwright UI mode
npm run e2e:headed  # Playwright headed mode
```

## Linting & formatting

```bash
npm run lint        # ESLint
npm run lint:fix    # ESLint with auto-fix
npm run format:styles  # Prettier for SCSS files
```

## Code scaffolding

```bash
npx ng generate component component-name
# Also: directive | pipe | service | class | guard | interface | enum | module
```

## Storybook

```bash
npm run storybook         # dev server
npm run build-storybook   # static build
```

## Further help

- [Angular CLI docs](https://angular.io/cli)
- See `docs/setup_planscape_locally.md` for full local environment setup.
