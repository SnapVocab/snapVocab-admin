# SnapVocab Admin

## Environment setup

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

API configuration in `.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend origin, without `/api`. Empty means requests use the current origin. |
| `API_PROXY_TARGET` | Backend address for the Vite development proxy, e.g. `http://localhost:8080`. Server-side only. |

For local development, leave `VITE_API_BASE_URL` empty and set `API_PROXY_TARGET` to your backend. The frontend calls `/api/...`; Vite forwards those requests to the configured backend. There is no hardcoded backend address in the application or Vite config.

For a separate API domain, set `VITE_API_BASE_URL=https://api.example.com`. Login, refresh, and domain API requests all use this origin. The backend must allow the frontend origin through CORS. Presigned storage uploads continue to use the URL returned by the backend.

For production with a reverse proxy, leave `VITE_API_BASE_URL` empty and configure your web server to forward `/api` to the backend. `API_PROXY_TARGET` only affects the development server, not the built application.

Vite reads `.env`, `.env.local`, and mode-specific files such as `.env.production`. Local and mode-specific files can override `.env`; environment variables already set in the shell take precedence. Restart the dev server after changing values. `VITE_*` values are public and embedded at build time: rebuild for deployment changes and never store secrets in them.

`.env` is ignored by Git; `.env.example` documents the shared configuration. Existing feature and fixture flags are listed there. The current `.env.local` enables badges and sample overview/analytics data. Turning fixture flags off requires the corresponding backend endpoints to exist.

## Vite template notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
