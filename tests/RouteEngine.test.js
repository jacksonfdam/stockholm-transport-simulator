import { RouteEngine } from '../application/RouteEngine.js';

function mkStop(id, lat, lon) {
  return { _id: id, sourceId: String(id), location: { type: 'Point', coordinates: [lon, lat] } };
}

describe('RouteEngine', () => {
  it('builds stop times with distance heuristic when no departures', () => {
    const line = { mode: 'bus', isCircular: false };
    const stops = [ mkStop('a', 59.33, 18.06), mkStop('b', 59.34, 18.07), mkStop('c', 59.35, 18.08) ];
    const st = RouteEngine.buildStopTimesForLine(line, stops, []);
    expect(st.length).toBe(3);
    expect(st[0].arrivalOffsetSec).toBe(0);
    expect(st[1].arrivalOffsetSec).toBeGreaterThan(0);
  });
});
