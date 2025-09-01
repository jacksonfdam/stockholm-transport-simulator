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
- Map transport_mode → mode ("bus" | "tram" | "train"); use designation or name as code
- Stops map from sites and stop_points; include sourceId and sourceType; preserve raw in openApiMeta
- Timetable is built from departures; if missing, derive durations using geography and average speed

Project structure
- config/: env and Mongo connection
- domain/models/: Mongoose models (Stop, Line, Timetable, Vehicle)
- infrastructure/openApiImporter.js: importer factory using AJV
- application/: services (RouteEngine, VehicleSimulator, LineService, StopBoardService)
- presentation/server.js: Express API
- scripts/: seed and dev start
- tests/: unit tests (Jest)

Setup
1. Install deps: `npm install`
2. Set Mongo URI if needed: `export MONGO_URI="mongodb://127.0.0.1:27017/stockholm_transport"`
3. Start dev server: `npm run dev`

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
- GET /api/stops/:id/board
- POST /api/admin/import-trafiklab

Tests
- Run unit tests: `npm test`

Notes
- The importer is schema-agnostic and uses simple heuristics to locate schemas in components.schemas by name. It validates basic types with AJV and filters SL authority.
- Timetables use departures when possible; otherwise build durations from stop distances. Circular lines detected from data or first==last stop.
