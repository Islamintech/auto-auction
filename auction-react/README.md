# AutoAuction

Customer-facing web app for **AutoAuction** — Korean cars at fixed prices, inspected, insured, and delivered door-to-door across Central Asia and the Caucasus.

Built with React, TypeScript, Redux Toolkit, and MUI. Bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Prerequisites

- Node.js >= 18
- Yarn (classic)

## Setup

```bash
yarn install
cp .env.example .env   # then edit values
```

### Environment variables

| Variable | Description |
| --- | --- |
| `REACT_APP_API_URL` | Base URL of the backend API (no trailing slash). For production set this to your deployed backend, e.g. `https://api.autoauction.kr`. |
| `PORT` | Port for the local dev server (defaults to `3000` if unset). |

> `.env` is gitignored — set `REACT_APP_API_URL` in your deployment environment.

## Scripts

| Command | Description |
| --- | --- |
| `yarn start` | Run the app in development mode. |
| `yarn build` | Produce an optimized production build in `build/`. |
| `yarn test` | Launch the test runner in watch mode. |

## Deployment

`yarn build` outputs static assets to `build/`. Serve them from any static host.

**Required host configuration:**

- **SPA fallback** — rewrite all routes to `index.html` (the app uses client-side routing), otherwise deep links and refreshes will 404.
- **Backend CORS** — the API is called with credentials, so the backend must allow the deployed origin with `Access-Control-Allow-Credentials: true` and an explicit origin.
- Set `REACT_APP_API_URL` to the production backend.

## Related projects

- `../auction` — backend API (Express, MongoDB) and admin panel.
