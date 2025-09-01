import { Line } from '../domain/models/Line.js';
import { Stop } from '../domain/models/Stop.js';
import { Timetable } from '../domain/models/Timetable.js';
import { RouteEngine } from './RouteEngine.js';

export class LineService {
  static async upsertLineWithStopsAndTimetable(lineMap, stopsRaw, departuresRaw) {
    // Create/Upsert Stops first
    const stopDocs = [];
    for (const sr of stopsRaw) {
      const found = await Stop.findOneAndUpdate(
        { sourceId: sr.sourceId, sourceType: sr.sourceType },
        sr,
        { new: true, upsert: true }
      );
      stopDocs.push(found);
    }

    // Detect circular if first==last
    let isCircular = !!lineMap.isCircular;
    if (stopDocs.length > 1 && stopDocs[0].sourceId === stopDocs[stopDocs.length-1].sourceId) isCircular = true;

    const line = await Line.findOneAndUpdate(
      { code: lineMap.code, mode: lineMap.mode },
      { ...lineMap, isCircular, stops: stopDocs.map(s => s._id) },
      { new: true, upsert: true }
    );

    // Build timetable
    const stopTimes = RouteEngine.buildStopTimesForLine(line, stopDocs, departuresRaw || []);

    for (const direction of [0,1]) {
      await Timetable.findOneAndUpdate(
        { line: line._id, direction },
        { line: line._id, direction, stopTimes, openApiMeta: line.openApiMeta },
        { new: true, upsert: true }
      );
    }

    return { line, stops: stopDocs };
  }

  // Fetch sites (stops) for a specific line. Supports lookup by id or by code+mode.
  static async getSitesForLine({ id = null, code = null, mode = null } = {}) {
    let query = null;
    if (id) {
      query = { _id: id };
    } else if (code) {
      // If mode provided, include it to disambiguate. Otherwise search by code only.
      query = mode ? { code, mode } : { code };
    } else {
      throw new Error('Must provide line id or code');
    }
      const line = await Line.findOne(query).lean();

      if (!line) {
          return null;
      }

      const stopsMap = new Map();
      const stopDocs = await Stop.find({ _id: { $in: line.stops } }).lean();
      stopDocs.forEach(stop => stopsMap.set(String(stop._id), stop));

      const orderedStops = line.stops
          .map(stopId => stopsMap.get(String(stopId)))
          .filter(Boolean);

      const sites = orderedStops.map(s => ({
          id: String(s._id),
          name: s.name,
          code: s.code,
          abbreviation: s.abbreviation,
          designation: s.designation,
          sourceId: s.sourceId,
          sourceType: s.sourceType,
          location: s.location,
      }));

      return {
          line: {
              id: String(line._id),
              code: line.code,
              mode: line.mode,
              isCircular: line.isCircular
          },
          sites
      };
  }
}
