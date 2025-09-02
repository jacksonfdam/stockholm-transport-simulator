import express from 'express';
import morgan from 'morgan';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';
import http from 'http';
import nunjucks from 'nunjucks';
import {WebSocketServer} from 'ws';
import {SimulationEngine} from '../application/SimulationEngine.js';

import {connectMongo} from '../config/mongo.js';
import {config} from '../config/env.js';
import {createOpenApiImporter} from '../infrastructure/openApiImporter.js';
import {Line} from '../domain/models/Line.js';
import {Stop} from '../domain/models/Stop.js';
import {Timetable} from '../domain/models/Timetable.js';
import {Vehicle} from '../domain/models/Vehicle.js';
import {StopBoardService} from '../application/StopBoardService.js';

const upload = multer({storage: multer.memoryStorage()});

export async function createServer() {
    await connectMongo();

    const app = express();
    const server = http.createServer(app);
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    nunjucks.configure(path.join(__dirname, 'views'), {
        autoescape: true,
        express: app,
    });
    app.set('view engine', 'njk');
    app.use(express.json({limit: '10mb'}));
    app.use(morgan('dev'));
    app.use('/static', express.static(path.join(__dirname, '../../node_modules/bootstrap/dist')));

    const wss = new WebSocketServer({noServer: true});
    SimulationEngine.initialize(wss);

    server.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

        if (pathname.startsWith('/updates/')) {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });

    app.get('/map', (req, res) => {
        res.render('map-view-dom.njk'); // Usando um novo nome de arquivo
    });

    app.get('/', async (req, res) => {
        const lines = await Line.find().sort({mode: 1, code: 1}).lean();
        res.render('select-line.njk', {lines});
    });

    app.get('/trip/start/:lineId', async (req, res) => {
        try {
            const {lineId} = req.params;
            const trip = await SimulationEngine.startTrip(lineId);
            res.render('trip-view.njk', {tripId: trip._id.toString(), lineId});
        } catch (error) {
            console.error(error);
            res.status(500).send(error.message);
        }
    });

    app.post('/trip/stop/:tripId', async (req, res) => {
        try {
            const {tripId} = req.params;
            await SimulationEngine.stopTrip(tripId);
            res.json({message: 'Trip stopped successfully.'});
        } catch (error) {
            res.status(500).json({error: error.message});
        }
    });

    app.get('/api/trips/active', (req, res) => {
        try {
            const activeTrips = SimulationEngine.getActiveTrips();
            res.json(activeTrips);
        } catch (error) {
            res.status(500).send(error.message);
        }
    });


    // Vehicles endpoint
    app.get('/api/vehicles', async (req, res) => {
        const vehicles = await Vehicle.find({}).populate('line');
        res.json(vehicles);
    });

    // List all lines
    app.get('/api/lines', async (req, res) => {
        try {
            const {mode} = req.query;
            const query = mode ? {mode} : {};
            const lines = await Line.find(query).sort({mode: 1, code: 1});
            res.json(lines);
        } catch (e) {
            res.status(500).json({error: e.message});
        }
    });

    // List all sites (stops)
    app.get('/api/sites', async (req, res) => {
        try {
            const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
            const skip = parseInt(req.query.skip || '0', 10);
            const sites = await Stop.find({}).sort({name: 1}).skip(skip).limit(limit);
            res.json(sites);
        } catch (e) {
            res.status(500).json({error: e.message});
        }
    });

    // Stop board endpoint
    app.get('/api/stops/:id/board', async (req, res) => {
        const {id} = req.params;
        const stop = await Stop.findById(id);
        if (!stop) return res.status(404).json({error: 'Stop not found'});
        const board = await StopBoardService.getStopBoard(id);
        res.json(board);
    });

    // Get sites for a specific line by code (optionally filter by mode)
    app.get('/api/lines/:code/sites', async (req, res) => {
        const {code} = req.params;
        const {mode} = req.query; // bus | tram | train (optional)
        try {
            const {LineService} = await import('../application/LineService.js');
            const result = await LineService.getSitesForLine({code, mode});
            if (!result) return res.status(404).json({error: 'Line not found'});
            res.json(result);
        } catch (e) {
            res.status(500).json({error: e.message});
        }
    });

    // Get sites for a specific line by ObjectId
    app.get('/api/lines/id/:id/sites', async (req, res) => {
        const {id} = req.params;
        try {
            const {LineService} = await import('../application/LineService.js');
            const result = await LineService.getSitesForLine({id});
            if (!result) return res.status(404).json({error: 'Line not found'});
            res.json(result);
        } catch (e) {
            res.status(500).json({error: e.message});
        }
    });

    // Admin import endpoint
    app.post('/api/admin/import-trafiklab', upload.any(), async (req, res) => {
        try {
            const {schema, linesPath, sitesPath, stopPointsPath, departuresPath} = req.body;
            let schemaJson = null;
            if (schema && typeof schema === 'string') {
                schemaJson = JSON.parse(schema);
            } else if (req.files) {
                const sf = req.files.find(f => f.fieldname === 'schema');
                if (sf) schemaJson = JSON.parse(sf.buffer.toString('utf-8'));
            }
            if (!schemaJson) return res.status(400).json({error: 'OpenAPI schema required'});

            const importer = createOpenApiImporter(schemaJson);

            async function readJsonInput(bodyKey, uploadKey) {
                if (req.body[bodyKey]) return JSON.parse(req.body[bodyKey]);
                const f = req.files?.find(x => x.fieldname === uploadKey);
                if (f) return JSON.parse(f.buffer.toString('utf-8'));
                if (req.body[`${bodyKey}Path`]) {
                    const data = await fs.readFile(req.body[`${bodyKey}Path`], 'utf-8');
                    return JSON.parse(data);
                }
                if (req.body[uploadKey]) return JSON.parse(req.body[uploadKey]);
                return null;
            }

            const linesInput = await readJsonInput('lines', 'lines');
            const sitesRaw = await readJsonInput('sites', 'sites');
            const stopPointsRaw = await readJsonInput('stop_points', 'stop_points');
            const departuresInput = await readJsonInput('departures', 'departures');

            const counts = {stops: 0, lines: 0, timetables: 0, vehicles: 0};
            const logs = [];

            // map and insert stops (sites & stop_points)
            const stopsMapped = [];
            for (const src of [sitesRaw || [], stopPointsRaw || []]) {
                for (const r of src) {
                    const fn = r.abbreviation != null || r.site_id != null ? importer.validateAndMapSite : importer.validateAndMapStopPoint;
                    const out = fn(r);
                    if (out.skip) continue;
                    if (out.error) {
                        logs.push({type: 'stop', error: out.error});
                        continue;
                    }
                    stopsMapped.push(out.value);
                }
            }

            const stopDocs = [];
            for (const s of stopsMapped) {
                const doc = await Stop.findOneAndUpdate(
                    {sourceId: s.sourceId, sourceType: s.sourceType},
                    s,
                    {new: true, upsert: true}
                );
                stopDocs.push(doc);
            }
            counts.stops = stopDocs.length;

            // lines (handle lineResponse wrapper)
            const lineDocs = [];
            const linesRaw = importer.parseLinesPayload(linesInput || []);
            for (const r of linesRaw) {
                const out = importer.validateAndMapLine(r);
                if (out.skip) continue;
                if (out.error) {
                    logs.push({type: 'line', error: out.error});
                    continue;
                }
                const doc = await Line.findOneAndUpdate(
                    {code: out.value.code, mode: out.value.mode},
                    out.value,
                    {new: true, upsert: true}
                );
                lineDocs.push(doc);
            }
            counts.lines = lineDocs.length;

            // departures map (handle siteDeparturesResponse wrapper)
            const departuresMapped = [];
            const departuresRaw = importer.parseDeparturesPayload(departuresInput || []);
            for (const r of departuresRaw) {
                const out = importer.validateAndMapDeparture(r);
                if (out.skip) continue;
                if (out.error) {
                    logs.push({type: 'departure', error: out.error});
                    continue;
                }
                departuresMapped.push(out.value);
            }

            // For each line, build timetable using all stops that belong to that line's geography heuristic (fallback: all stops)
            // In this simplified implementation, we select a naive ordered list by proximity chaining starting at an arbitrary stop
            function orderStopsByProximity(stops) {
                if (stops.length <= 1) return stops;
                const remaining = [...stops];
                const ordered = [remaining.shift()];
                while (remaining.length) {
                    const last = ordered[ordered.length - 1];
                    remaining.sort((a, b) => {
                        const da = (a.location.coordinates[0] - last.location.coordinates[0]) ** 2 + (a.location.coordinates[1] - last.location.coordinates[1]) ** 2;
                        const db = (b.location.coordinates[0] - last.location.coordinates[0]) ** 2 + (b.location.coordinates[1] - last.location.coordinates[1]) ** 2;
                        return da - db;
                    });
                    ordered.push(remaining.shift());
                }
                return ordered;
            }

            for (const line of lineDocs) {
                const depsForLine = departuresMapped.filter(d => d.lineId == null || String(d.lineId) === String(line.externalId || ''));
                const allStops = stopDocs; // In real scenario, we would associate stops to lines via data; here we fallback
                const orderedStops = orderStopsByProximity(allStops).slice(0, Math.min(10, allStops.length)); // keep small for demo
                const stopTimes = orderedStops.length ? orderedStops : allStops;
                const ttStopTimes = [];
                if (orderedStops.length) {
                    const {RouteEngine} = await import('../application/RouteEngine.js');
                    const st = RouteEngine.buildStopTimesForLine(line, orderedStops, depsForLine);
                    ttStopTimes.push(...st);
                }
                for (const direction of [0, 1]) {
                    await Timetable.findOneAndUpdate(
                        {line: line._id, direction},
                        {line: line._id, direction, stopTimes: ttStopTimes, openApiMeta: line.openApiMeta},
                        {new: true, upsert: true}
                    );
                }
            }

            // create sample vehicles per line
            const vehicles = [];
            for (const line of lineDocs) {
                const v = await Vehicle.create({
                    line: line._id,
                    mode: line.mode,
                    status: 'running',
                    currentStopIndex: 0,
                    progressBetweenStops: 0,
                    direction: 0
                });
                vehicles.push(v);
            }
            counts.vehicles = vehicles.length;

            counts.timetables = await Timetable.countDocuments({});

            res.json({counts, logs});
        } catch (e) {
            console.error(e);
            res.status(500).json({error: e.message});
        }
    });

    server.listen(config.port, () => {
        console.log(`Server (API & Simulation) listening on :${config.port}`);
    });

    return {app, server};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    createServer();
}
