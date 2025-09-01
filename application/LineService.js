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
}
