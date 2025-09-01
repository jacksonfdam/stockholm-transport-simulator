# Stockholm Transport Simulator

A layered Node.js (ESM) app that simulates Stockholm public transport using static JSON exports from Trafiklab (SL). Import is guided by an OpenAPI schema provided by the user.

References

https://openstreetgs.stockholm.se/tkkarta/v3/preview_opendata/?isymap=api/ShowLayer/Cykelpump_P
https://www.trafiklab.se/sv/api/our-apis/sl/transport/#/
https://developers.google.com/transit/gtfs/reference/
https://www.trafiklab.se/api/our-apis/sl/transport/#/default/Departures
https://dataportalen.stockholm.se/dataportalen/
https://www.trafiklab.se/news/2025/2025-01-15-gtfs-booking-rules-areas/
https://www.trafiklab.se/api/gtfs-datasets/gtfs-sweden/
https://gtfs.org/documentation/schedule/reference/#agencytxt

Setup
1. Install deps: `npm install`
2. Configure environment (optional):
   - `export MONGO_URI="mongodb://127.0.0.1:27017/stockholm_transport"` (or use your URI)
   - `export PORT=3000` (default 3000)
3. Start dev server: `npm run dev` (uses nodemon for auto-restart)

Quick start with sample data
1. Place your Trafiklab OpenAPI schema at `./openapi.json`.
2. Put static JSONs under `./data` (or adjust paths):
   - `data/lines.json`
   - `data/sites.json`
   - `data/stop-points.json`
   - `data/departures.json` (optional)
3. Seed database: `npm run seed -- --schema ./openapi.json --data ./data`
4. Open http://localhost:3000 and use the API endpoints below.

Seed with static JSONs
- Files expected: lines.json, sites.json, stop-points.json, departures.json
- Provide OpenAPI schema path via `--schema` and data dir via `--data`:

```
node scripts/seed-from-trafiklab.js --schema ./openapi.json --data ./
```

Admin import route (dev)
- POST /api/admin/import-trafiklab
- Accepts multipart/form-data or JSON body.
- Fields:
  - schema: OpenAPI schema JSON (string or file upload)
  - lines, sites, stop_points, departures: JSON payloads or ...Path fields with server paths
- Returns counts per collection and validation logs.

API endpoints
- GET /api/vehicles
- GET /api/lines?mode=bus|tram|train|metro|ship|ferry|taxi
- GET /api/sites?limit=200&skip=0
- GET /api/stops/:id/board
- GET /api/lines/:code/sites?mode=bus|tram|train|metro|ship|ferry|taxi
- GET /api/lines/id/:id/sites
- POST /api/admin/import-trafiklab

Tests
- Run unit tests: `npm test`

Notes
- The importer is schema-agnostic and uses simple heuristics to locate schemas in components.schemas by name. It validates basic types with AJV and filters SL authority.
- Timetables use departures when possible; otherwise build durations from stop distances. Circular lines detected from data or first==last stop.

Docker (optional)
- Build and run with Docker Compose:
  - docker compose up --build
- Services:
  - MongoDB on localhost:27017 (volume persisted)
  - App on http://localhost:3000
- Live reload in Docker:
  - The app service mounts the project directory and starts with `npm run dev` which uses nodemon.
  - When you edit source files on the host, nodemon inside the container restarts the server automatically.
- Environment:
  - App connects using MONGO_URI=mongodb://mongo:27017/stockholm_transport defined in compose.
  - To seed inside running app container, you can exec:
    - Trafiklab import (base data):
      - docker compose exec app node scripts/seed-from-trafiklab.js --schema ./openapi.json --data ./data
    - Populate ordered stops per line from definitive routesData (after base seed completes):
      - docker compose exec app node scripts/seed-routes-to-lines.js
      - or using npm alias: docker compose exec app npm run seed:routes:lines
    - Optional simplified seed (separate simple collections, not needed if using existing Line/Stop):
      - docker compose exec app npm run seed:routes

## Demo
Select a line
<img width="714" height="424" alt="image" src="https://github.com/user-attachments/assets/eb25ddf9-e7e4-4f9b-983c-b337612ead87" />

Can run multiple:

<img width="737" height="545" alt="image" src="https://github.com/user-attachments/assets/2e0df622-4175-4420-a816-6aed88b4c2dc" />
<img width="705" height="385" alt="image" src="https://github.com/user-attachments/assets/dead6ff9-d397-45e0-a553-636873e77967" />


Watch the map:

// TODO: Fix the map elements and animations

<img width="1807" height="1277" alt="image" src="https://github.com/user-attachments/assets/772631ef-6133-4824-8510-a714ef1e716d" />


