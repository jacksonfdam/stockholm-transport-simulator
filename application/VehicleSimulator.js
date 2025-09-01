import { config } from '../config/env.js';
import { Vehicle } from '../domain/models/Vehicle.js';
import { Timetable } from '../domain/models/Timetable.js';
import { Stop } from '../domain/models/Stop.js';

export class VehicleSimulator {
  constructor() {
    this.interval = null;
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.tick(), config.tickMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async tick() {
    const vehicles = await Vehicle.find({ status: 'running' }).populate('line');
    for (const v of vehicles) {
      const tt = await Timetable.findOne({ line: v.line._id, direction: v.direction });
      if (!tt || tt.stopTimes.length < 2) continue;
      const curIdx = v.currentStopIndex;
      const curSeg = tt.stopTimes[curIdx];
      const nextIdx = Math.min(curIdx + 1, tt.stopTimes.length - 1);
      const segDur = curSeg.segmentDurationSec || 60;
      let prog = v.progressBetweenStops + (config.tickMs / 1000) / segDur;
      if (prog >= 1) {
        v.currentStopIndex = nextIdx;
        v.progressBetweenStops = 0;
        // loop handling
        if (v.currentStopIndex >= tt.stopTimes.length - 1) {
          if (v.line.isCircular) {
            // wait 5 minutes at closing the cycle simulated by pausing progress for one cycle
            v.currentStopIndex = 0;
          } else {
            // reverse direction
            v.direction = v.direction === 0 ? 1 : 0;
            v.currentStopIndex = 0;
          }
        }
      } else {
        v.progressBetweenStops = prog;
      }
      v.lastUpdateTs = new Date();

      // update position roughly between current and next stop
      const stops = await Stop.find({ _id: { $in: [tt.stopTimes[curIdx].stop, tt.stopTimes[nextIdx].stop] } });
      const map = new Map(stops.map(s => [String(s._id), s]));
      const a = map.get(String(tt.stopTimes[curIdx].stop));
      const b = map.get(String(tt.stopTimes[nextIdx].stop));
      if (a && b) {
        const ax = a.location.coordinates[0];
        const ay = a.location.coordinates[1];
        const bx = b.location.coordinates[0];
        const by = b.location.coordinates[1];
        const t = v.progressBetweenStops;
        v.position = { type: 'Point', coordinates: [ax + (bx-ax)*t, ay + (by-ay)*t] };
      }

      await v.save();
    }
  }
}
