import { Vehicle } from '../domain/models/Vehicle.js';
import { Timetable } from '../domain/models/Timetable.js';

export class StopBoardService {
  static async getStopBoard(stopId) {
    // vehicles present or arriving in next 5s
    const now = Date.now();
    const windowMs = 5000;
    const vehicles = await Vehicle.find({}).populate('line');
    const results = [];
    for (const v of vehicles) {
      if (!v.line) continue;
      const tt = await Timetable.findOne({ line: v.line._id, direction: v.direction });
      if (!tt) continue;
      const stopIndex = tt.stopTimes.findIndex(st => String(st.stop) === String(stopId));
      if (stopIndex < 0) continue;
      // estimate vehicle time to reach stop
      let etaSec = 0;
      if (v.currentStopIndex <= stopIndex) {
        // ahead in route
        const cur = tt.stopTimes[v.currentStopIndex];
        const nextIdx = Math.min(stopIndex, tt.stopTimes.length - 1);
        let t = Math.round(cur.segmentDurationSec * (1 - v.progressBetweenStops));
        for (let i = v.currentStopIndex + 1; i < nextIdx; i++) {
          t += (tt.stopTimes[i].segmentDurationSec + (tt.stopTimes[i].departureOffsetSec - tt.stopTimes[i].arrivalOffsetSec));
        }
        etaSec = Math.max(t, 0);
      } else {
        // will reach after loop/cycle; approximate large number
        etaSec = 3600; // beyond window
      }
      if (etaSec * 1000 <= windowMs) {
        results.push({ vehicleId: v._id, line: v.line.code, mode: v.mode, etaSec });
      }
    }
    return { now, windowMs, arriving: results };
  }
}
