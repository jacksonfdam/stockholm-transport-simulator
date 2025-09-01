import { createOpenApiImporter } from '../infrastructure/openApiImporter.js';

describe('openApiImporter', () => {
  const schema = {
    openapi: '3.0.0',
    components: {
      schemas: {
        Line: { type: 'object', properties: { id: { type: 'integer' }, transport_authority: { type: 'object', properties: { id: { type: 'integer' } } }, transport_mode: { type: 'string' }, designation: { type: 'string' }, name: { type: 'string' } } },
        Site: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, lat: { type: 'number' }, lon: { type: 'number' }, abbreviation: { type: 'string' } } },
        StopPoint: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, lat: { type: 'number' }, lon: { type: 'number' }, designation: { type: 'string' } } },
        Departure: { type: 'object', properties: { line: { type: 'object', properties: { id: { type: 'integer' }, transport_authority: { type: 'object', properties: { id: { type: 'integer' } } } } }, stop_point: { type: 'object', properties: { id: { type: 'integer' } } }, scheduled_time: { type: 'string', format: 'date-time' } } },
      }
    }
  };

  it('maps and filters only SL authority', () => {
    const importer = createOpenApiImporter(schema);
    const out1 = importer.validateAndMapLine({ id: 10, transport_authority: { id: 2 }, transport_mode: 'bus', name: 'X' });
    expect(out1.skip).toBe(true);
    const out2 = importer.validateAndMapLine({ id: 11, transport_authority: { id: 1 }, transport_mode: 'tram', designation: '7' });
    expect(out2.value.mode).toBe('tram');
    expect(out2.value.code).toBe('7');
  });

  it('validates lat/lon and builds stop mapping', () => {
    const importer = createOpenApiImporter(schema);
    const s = importer.validateAndMapSite({ id: 1, name: 'T-Centralen', lat: 59.33, lon: 18.06, abbreviation: 'TC' });
    expect(s.value.location.coordinates[0]).toBeCloseTo(18.06);
    const sp = importer.validateAndMapStopPoint({ id: 2, name: 'Platform A', lat: 59.34, lon: 18.07, designation: 'A' });
    expect(sp.value.sourceType).toBe('stop_point');
  });

  it('parses departures timestamps', () => {
    const importer = createOpenApiImporter(schema);
    const d = importer.validateAndMapDeparture({ line: { id: 11, transport_authority: { id: 1 } }, stop_point: { id: 2 }, scheduled_time: '2025-01-01T00:00:00Z' });
    expect(d.value.scheduledTs).toBeGreaterThan(0);
  });
});
