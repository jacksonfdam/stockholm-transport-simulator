import { getDistance } from 'geolib';

export class RouteEngine {
  // Build stopTimes from departures grouped by line and stopPoint, falling back to distance-based durations
  static buildStopTimesForLine(lineDoc, stops, departures) {
    // stops: array of Stop docs in order
    // departures: array of { journeyId, scheduledTs/expectedTs, stopPointId }
    const stopTimes = [];
    if (!stops || stops.length === 0) return stopTimes;

    // Try to infer ordering from departures if they include journey sequences
    const byJourney = new Map();
    for (const d of departures) {
      if (!d.journeyId) continue;
      if (!byJourney.has(d.journeyId)) byJourney.set(d.journeyId, []);
      byJourney.get(d.journeyId).push(d);
    }

    let offsets = new Array(stops.length).fill(null);
    if (byJourney.size > 0) {
      // pick the most complete journey
      const sequences = [...byJourney.values()].map(arr => arr.sort((a,b)=> (a.scheduledTs||a.expectedTs) - (b.scheduledTs||b.expectedTs)));
      const best = sequences.sort((a,b)=> b.length - a.length)[0];
      // map by stop index
      for (const d of best) {
        const idx = stops.findIndex(s => s.sourceId === d.stopPointId || s.sourceId === d.siteId);
        const t = d.scheduledTs || d.expectedTs;
        if (idx >= 0 && Number.isFinite(t)) {
          offsets[idx] = t;
        }
      }
      const t0 = offsets.find(t=>Number.isFinite(t));
      if (Number.isFinite(t0)) {
        offsets = offsets.map(t => Number.isFinite(t) ? Math.round((t - t0)/1000) : null);
      }
    }

    // fill missing with distance-based heuristic
    let lastKnown = 0;
    for (let i=0;i<stops.length;i++) {
      if (offsets[i] == null) {
        const prev = i>0 ? stops[i-1] : null;
        const cur = stops[i];
        if (!prev) { offsets[i] = 0; continue; }
        const meters = getDistance(
          { latitude: prev.location.coordinates[1], longitude: prev.location.coordinates[0] },
          { latitude: cur.location.coordinates[1], longitude: cur.location.coordinates[0] }
        );
        const speedMps = lineDoc.mode === 'tram' ? 8 : 6; // ~29km/h tram, 21.6km/h bus avg incl stops
        const dwell = 20; // seconds at stop
        lastKnown += Math.round(meters / speedMps) + dwell;
        offsets[i] = lastKnown;
      } else {
        lastKnown = offsets[i];
      }
    }

    for (let i=0;i<stops.length;i++) {
      const arrival = offsets[i];
      const departure = arrival + 20; // add dwell
      const seg = i<stops.length-1 ? (offsets[i+1] - departure) : 0;
      stopTimes.push({ stop: stops[i]._id, arrivalOffsetSec: arrival, departureOffsetSec: departure, segmentDurationSec: Math.max(seg,0) });
    }

    return stopTimes;
  }
}
