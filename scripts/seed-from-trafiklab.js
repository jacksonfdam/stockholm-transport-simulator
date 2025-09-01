#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { createOpenApiImporter } from '../infrastructure/openApiImporter.js';
import { Stop } from '../domain/models/Stop.js';
import { Line } from '../domain/models/Line.js';
import { Timetable } from '../domain/models/Timetable.js';
import { Vehicle } from '../domain/models/Vehicle.js';
import { RouteEngine } from '../application/RouteEngine.js';

const args = process.argv.slice(2);
const dataDirIdx = args.indexOf('--data');
const dataDir = dataDirIdx >= 0 ? args[dataDirIdx + 1] : './data';
const schemaPathIdx = args.indexOf('--schema');
const schemaPath = schemaPathIdx >= 0 ? args[schemaPathIdx + 1] : './openapi.json';

async function readJson(file) {
  const content = await fs.readFile(file, 'utf-8');
  return JSON.parse(content);
}

async function main() {
  await connectMongo();
  try {
    const [schema, linesInput, sites, stopPoints, departuresInput] = await Promise.all([
      readJson(path.resolve(schemaPath)),
      readJson(path.resolve(dataDir, 'lines.json')).catch(()=>[]),
      readJson(path.resolve(dataDir, 'sites.json')).catch(()=>[]),
      readJson(path.resolve(dataDir, 'stop-points.json')).catch(()=>[]),
      readJson(path.resolve(dataDir, 'departures.json')).catch(()=>[]),
    ]);

    const importer = createOpenApiImporter(schema);

    // Stops
    const stopsMapped = [];
    for (const r of sites) {
      const out = importer.validateAndMapSite(r);
      if (out.skip || out.error) continue;
      stopsMapped.push(out.value);
    }
    for (const r of stopPoints) {
      const out = importer.validateAndMapStopPoint(r);
      if (out.skip || out.error) continue;
      stopsMapped.push(out.value);
    }
    const stopDocs = [];
    for (const s of stopsMapped) {
      const doc = await Stop.findOneAndUpdate({ sourceId: s.sourceId, sourceType: s.sourceType }, s, { new: true, upsert: true });
      stopDocs.push(doc);
    }

    // Lines (handle lineResponse wrapper)
    const lineDocs = [];
    const lines = importer.parseLinesPayload(linesInput || []);
    for (const r of lines) {
      const out = importer.validateAndMapLine(r);
      if (out.skip || out.error) continue;
      const doc = await Line.findOneAndUpdate({ code: out.value.code, mode: out.value.mode }, out.value, { new: true, upsert: true });
      lineDocs.push(doc);
    }

    // Departures (handle siteDeparturesResponse wrapper)
    const departuresMapped = [];
    const departures = importer.parseDeparturesPayload(departuresInput || []);
    for (const r of departures) {
      const out = importer.validateAndMapDeparture(r);
      if (out.skip || out.error) continue;
      departuresMapped.push(out.value);
    }

    // Timetables
    for (const line of lineDocs) {
      const depsForLine = departuresMapped.filter(d => d.lineId == null || String(d.lineId) === String(line.externalId || ''));
      // naive ordered stops for demo
      const orderedStops = stopDocs.slice(0, Math.min(10, stopDocs.length));
      const stopTimes = RouteEngine.buildStopTimesForLine(line, orderedStops, depsForLine);
      for (const direction of [0,1]) {
        await Timetable.findOneAndUpdate(
          { line: line._id, direction },
          { line: line._id, direction, stopTimes, openApiMeta: line.openApiMeta },
          { new: true, upsert: true }
        );
      }
    }

    // Vehicles
    for (const line of lineDocs) {
      await Vehicle.create({ line: line._id, mode: line.mode, status: 'running', currentStopIndex: 0, progressBetweenStops: 0, direction: 0 });
    }

    console.log(JSON.stringify({ counts: {
      stops: await Stop.countDocuments({}),
      lines: await Line.countDocuments({}),
      timetables: await Timetable.countDocuments({}),
      vehicles: await Vehicle.countDocuments({}),
    }}, null, 2));
  } finally {
    await disconnectMongo();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
