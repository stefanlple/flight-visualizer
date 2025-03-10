# 3D Flight Visualisation:

Immersive 3D Visualization of Real-time and Historical Flight Traffic Data sourced from The OpenSky Network. Built using Three.js, Express.js, Node.js, and JavaScript.

## Setup (realtime / live mode)

1. `npm install` in project root and `npm install` in `./backend`
2. Start API proxy: `cd backend && npm run dev` (default port 5001)
3. Start frontend: `npm run dev` — Vite proxies `/api` to the backend

If your backend uses another port (e.g. `PORT=3000` in `backend/.env`), create `.env` in the project root with `VITE_BACKEND_URL=http://localhost:3000`.

Optional: `backend/.env` — set `OPENSKY_USERNAME` / `OPENSKY_PASSWORD` for higher rate limits.

## Deploy

```bash
npm run build
npm start
```

Serves the built app and `/api/opensky/*` on one port. Set `PORT` as required by your host.

> Historical mode and MongoDB (`/api/flight`) are deprecated and disabled in `backend/server.js`.

## Manual - Realtime Visualisation

- Filter:
    1. Hover over the red squares to add filters
    2. Adjust the parameters
    3. Click on "Apply"
    4. Click on "Reset"

- Group:
    1. Group by continents or by on specific country
    2. Click on "Apply"
    3. Click on "Reset"
