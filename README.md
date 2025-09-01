# Stockholm Transport Simulator (Bus/Tram)

A layered Node.js (ESM) app that simulates Stockholm public transport using static JSON exports from Trafiklab (SL). Import is guided by an OpenAPI schema provided by the user.

Key points
- Layers: domain, application, infrastructure, presentation (API), config, scripts
- Express REST API
- MongoDB with Mongoose
- OpenAPI-driven importer with basic validations
- Vehicle simulator ticking every 5 seconds
- ES modules, async/await

Data rules (Trafiklab/SL)
- Only import objects where transport_authority.id === 1 (Storstockholms Lokaltrafik)
- JSONs: lines, sites, stop_points, departures
- Map transport_mode → mode ("bus" | "tram" | "train" | "metro" | "ship" | "ferry" | "taxi"); use designation or name as code
- Stops map from sites and stop_points; include sourceId/sourceType plus externalId and isStopPoint; preserve raw in openApiMeta
- Departures: stop_area.id and stop_point.id refer to sites and stop points respectively; line.id refers to Line.externalId
- Timetable is built from departures; if missing, derive durations using geography and average speed

Project structure
- config/: env and Mongo connection
- domain/models/: Mongoose models (Stop, Line, Timetable, Vehicle)
  - Note: We use a single Stop collection for both Sites and Stop Points. Fields:
    - sourceType: 'site' | 'stop_point'
    - sourceId/externalId: original numeric id from Trafiklab files (departures.stop_point.id refers to Stop.externalId where sourceType='stop_point').
- infrastructure/openApiImporter.js: importer factory using AJV
- application/: services (RouteEngine, VehicleSimulator, LineService, StopBoardService)
- presentation/server.js: Express API
- scripts/: seed and dev start
- tests/: unit tests (Jest)

Prerequisites
- Node.js LTS (>=18)
- MongoDB running locally or a connection URI

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
