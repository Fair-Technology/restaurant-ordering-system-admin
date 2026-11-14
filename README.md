# restaurant-ordering-system-admin

Owner and staff admin app for the restaurant ordering system (React + TypeScript + Vite).

## Running locally

```bash
npm ci
cp .env.example .env.local   # then fill in the values (see below)
npm run dev
```

`.env.local` holds the Vite build-time variables. The dev values come from this repo's
`dev` environment Actions variables (Settings -> Environments -> dev). They are
compile-time values and end up in the shipped bundle, so they are public — still, do
not commit `.env.local`.

| Variable | What it is |
| --- | --- |
| `VITE_API_BASE_URL` | dev API base including `/api`, e.g. `https://<dev-api-host>/api` |
| `VITE_MSAL_CLIENT_ID` | Entra External ID application (client) id |
| `VITE_MSAL_TENANT_ID` | Entra External ID tenant id |
| `VITE_MSAL_TENANT_NAME` | Entra External ID tenant subdomain (`https://<name>.ciamlogin.com`) |
| `VITE_MSAL_API_SCOPE` | API scope the access token is requested for |
| `VITE_SHOP_BASE_URL` | customer storefront base, used for preview/QR links |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key, used by Connect onboarding |

Without the `VITE_MSAL_*` values the app throws inside `msalInstance.initialize()` and
renders a blank page. There is no local or test sign-in: the admin portal signs in
through the Entra External ID tenant, and staff tablets sign in at `/<shopSlug>/staff`
with a shop staff account.

Gates before a PR: `npm run lint` -> `npm run typecheck` -> `npm test` -> `npm run build`.

## Template notes

This app was scaffolded from the Vite React + TypeScript template; the notes it shipped with follow.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Where the product spec is

The Restaurant Ordering System is one product across several repositories, and almost every rule that
matters — how money is represented, how orders move, who may see what — cuts
across all of them. Keeping one copy of the spec is what stops several copies
drifting apart.

The spec is shared and lives in the **rs-backend** repo:

- in a checkout with the standard layout: `rs-backend/docs/spec.md` (sibling checkout)
- on GitHub: https://github.com/Fair-Technology/restaurant-ordering-system-backend/blob/main/docs/spec.md

Don't restate product rules here — a frontend only hides controls a user cannot
use; the rules are enforced in the backend. If you learn something new about how
the product behaves, edit the spec, not this file.

## API drift gate

`src/services/api.ts` is generated from `openapi/swagger.json` (`npm run generate`).
`npm run check:api-types` regenerates to a temp file and diffs it against the committed client; it fails if they differ.

Enable the pre-push hook that runs it (once per clone; `npm install` also does this via `prepare`):

```
npm run hooks:install
```

It is intentionally not part of `npm run build`.

## Production promotion secret

The `Promote artifact to production` workflow (`.github/workflows/promote.yml`, runs on a `v*` tag after
approval on the `production` environment) deploys with a secret named **`AZURE_STATIC_WEB_APPS_API_TOKEN_PROD`**.
It must hold the **production** Static Web App's deployment token (Azure portal -> the production Static Web App
-> Overview -> Manage deployment token).

- **Where to add it:** GitHub repo -> Settings -> Environments -> `production` -> Environment secrets.
- **Dev is unaffected:** the dev workflow (`azure-static-web-apps.yml`) keeps using `AZURE_STATIC_WEB_APPS_API_TOKEN`.
- **Why a different name:** GitHub falls back to the repo-level secret when an environment has none of that name, so
  reusing the dev name would silently deploy production promotions to the DEV app.

> **Production promotion is EXPECTED TO FAIL until `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD` exists.**
> A guard step fails the run with a message naming the secret. This is fail-closed by design, not a fault.
> The owner supplies the secret value; it is never committed or handled by tooling.
