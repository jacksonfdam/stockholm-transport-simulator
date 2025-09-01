import Ajv from 'ajv';
import addFormats from 'ajv-formats';

function extractSchema(schema, nameCandidates) {
  const comps = schema.components?.schemas || {};
  for (const key of Object.keys(comps)) {
    const lower = key.toLowerCase();
    if (nameCandidates.some(n => lower.includes(n))) return { key, schema: comps[key] };
  }
  return null;
}

export function createOpenApiImporter(openApiSchema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const linesSchema = extractSchema(openApiSchema, [' line"', '"Line"']); // prefer Line over lineResponse
  const lineResponseSchema = extractSchema(openApiSchema, ['lineresp', 'lineResponse']);
  const siteSchema = extractSchema(openApiSchema, ['siteResponse', 'site']);
  const stopPointSchema = extractSchema(openApiSchema, ['stopPoint', 'stop_point', 'stoppoint']);
  const departureSchema = extractSchema(openApiSchema, ['departure']);
  const siteDeparturesResponseSchema = extractSchema(openApiSchema, ['siteDeparturesResponse']);

  const validators = {
    line: linesSchema ? ajv.compile(linesSchema.schema) : null,
    lineResponse: lineResponseSchema ? ajv.compile(lineResponseSchema.schema) : null,
    site: siteSchema ? ajv.compile(siteSchema.schema) : null,
    stopPoint: stopPointSchema ? ajv.compile(stopPointSchema.schema) : null,
    departure: departureSchema ? ajv.compile(departureSchema.schema) : null,
    siteDeparturesResponse: siteDeparturesResponseSchema ? ajv.compile(siteDeparturesResponseSchema.schema) : null,
  };

  function basicLatLon(o, latKey = 'lat', lonKey = 'lon') {
    const lat = Number(o?.[latKey]);
    const lon = Number(o?.[lonKey]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (lat < -90 || lat > 90) return null;
    if (lon < -180 || lon > 180) return null;
    return { lat, lon };
  }

  function validateAndMapLine(raw) {
    if (validators.line && !validators.line(raw)) {
      return { error: validators.line.errors };
    }
    const ta = raw.transport_authority || raw.transportAuthority || {};
    if (Number(ta.id) !== 1) return { skip: true };
    const modeSrc = (raw.transport_mode || raw.transportMode || '').toString().toUpperCase();
    let mode = null;
    if (modeSrc.includes('BUS')) mode = 'bus';
    else if (modeSrc.includes('TRAM')) mode = 'tram';
    else if (modeSrc.includes('TRAIN') || modeSrc.includes('METRO')) mode = 'train';
    if (!mode) return { skip: true };
    const code = raw.designation || raw.name || raw.code || String(raw.id || raw.line_id || '');
    const name = raw.name || raw.public_name || code;
    const isCircular = !!raw?.is_circular || !!raw?.circular;
    return { value: { code, name, mode, isCircular, openApiMeta: { schemaRef: linesSchema?.key, raw } } };
  }

  function validateAndMapSite(raw) {
    if (validators.site && !validators.site(raw)) {
      return { error: validators.site.errors };
    }
    const ta = raw.transport_authority || raw.transportAuthority || {};
    if (ta && Object.keys(ta).length && Number(ta.id) !== 1) return { skip: true };
    const ll = basicLatLon(raw, 'lat', 'lon');
    if (!ll) return { error: 'Invalid lat/lon' };
    return {
      value: {
        name: raw.name,
        code: raw.abbreviation || raw.designation || String(raw.id || raw.site_id || ''),
        location: { type: 'Point', coordinates: [ll.lon, ll.lat] },
        sourceId: String(raw.id || raw.site_id),
        sourceType: 'site',
        abbreviation: raw.abbreviation,
        designation: raw.designation,
        openApiMeta: { schemaRef: siteSchema?.key, raw },
      }
    };
  }

  function validateAndMapStopPoint(raw) {
    if (validators.stopPoint && !validators.stopPoint(raw)) {
      return { error: validators.stopPoint.errors };
    }
    const ta = raw.transport_authority || raw.transportAuthority || {};
    if (ta && Object.keys(ta).length && Number(ta.id) !== 1) return { skip: true };
    const ll = basicLatLon(raw, 'lat', 'lon');
    if (!ll) return { error: 'Invalid lat/lon' };
    return {
      value: {
        name: raw.name,
        code: raw.designation || String(raw.id || raw.stop_point_id || ''),
        location: { type: 'Point', coordinates: [ll.lon, ll.lat] },
        sourceId: String(raw.id || raw.stop_point_id),
        sourceType: 'stop_point',
        designation: raw.designation,
        openApiMeta: { schemaRef: stopPointSchema?.key, raw },
      }
    };
  }

  function validateAndMapDeparture(raw) {
    if (validators.departure && !validators.departure(raw)) {
      return { error: validators.departure.errors };
    }
    const ta = raw.transport_authority || raw.transportAuthority || raw.line?.transport_authority || {};
    if (ta && Object.keys(ta).length && Number(ta.id) !== 1) return { skip: true };

    const scheduled = raw.scheduled_time || raw.scheduled || raw.time || raw.expected_time || raw.expected;
    const expected = raw.expected_time || raw.expected || scheduled;
    const lineId = raw.line?.id || raw.line_id || raw.lineId;
    const stopPointId = raw.stop_point?.id || raw.stop_point_id || raw.stopPointId;
    const journeyId = raw.journey?.id || raw.journey_id || raw.journeyId;

    // Local Stockholm time without timezone in schema; Date will parse as local, acceptable for offsets
    const time = (t) => (t ? new Date(t).getTime() : null);
    const st = time(scheduled);
    const et = time(expected);
    if (!Number.isFinite(st) && !Number.isFinite(et)) return { error: 'Invalid times' };

    return {
      value: {
        lineId: lineId != null ? String(lineId) : null,
        stopPointId: stopPointId != null ? String(stopPointId) : null,
        journeyId: journeyId != null ? String(journeyId) : null,
        scheduledTs: Number.isFinite(st) ? st : null,
        expectedTs: Number.isFinite(et) ? et : null,
        openApiMeta: { schemaRef: departureSchema?.key, raw },
      }
    };
  }

  function parseLinesPayload(linesPayload) {
    // Accept either array of Line or lineResponse wrapper with keys (bus, tram, train, metro, ...)
    if (Array.isArray(linesPayload)) return linesPayload;
    if (linesPayload && typeof linesPayload === 'object') {
      const keys = ['bus', 'tram', 'train', 'metro'];
      const arr = [];
      for (const k of keys) {
        if (Array.isArray(linesPayload[k])) arr.push(...linesPayload[k]);
      }
      return arr;
    }
    return [];
  }

  function parseDeparturesPayload(depPayload) {
    if (Array.isArray(depPayload)) return depPayload; // already array of departure
    if (depPayload && typeof depPayload === 'object' && Array.isArray(depPayload.departures)) return depPayload.departures;
    return [];
  }

  return {
    validateAndMapLine,
    validateAndMapSite,
    validateAndMapStopPoint,
    validateAndMapDeparture,
    parseLinesPayload,
    parseDeparturesPayload,
  };
}
