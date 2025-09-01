import Ajv from 'ajv';
import addFormats from 'ajv-formats';

function extractSchema(schema, nameCandidates) {
  const comps = schema.components?.schemas || {};
  const keys = Object.keys(comps);
  // 1) prefer exact (case-insensitive) matches
  for (const cand of nameCandidates) {
    const target = String(cand).toLowerCase();
    const exactKey = keys.find(k => k.toLowerCase() === target);
    if (exactKey) return { key: exactKey, schema: comps[exactKey] };
  }
  // 2) fallback to substring matches (case-insensitive)
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (nameCandidates.some(n => lower.includes(String(n).toLowerCase()))) return { key, schema: comps[key] };
  }
  return null;
}

export function createOpenApiImporter(openApiSchema) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  // Register entire OpenAPI schema with an $id so Ajv can resolve cross-refs like #/components/schemas/...
  const rootId = 'openapi://schema';
  if (!openApiSchema.$id) openApiSchema.$id = rootId;
  ajv.addSchema(openApiSchema, rootId);

  const linesSchema = extractSchema(openApiSchema, ['Line', 'line']); // prefer Line over lineResponse
  const lineResponseSchema = extractSchema(openApiSchema, ['lineResponse']);
  const siteSchema = extractSchema(openApiSchema, ['siteResponse', 'Site', 'site']);
  const stopPointSchema = extractSchema(openApiSchema, ['StopPoint', 'stopPoint', 'stop_point', 'stoppoint']);
  const departureSchema = extractSchema(openApiSchema, ['departureResponse', 'Departure', 'departure']);
  const siteDeparturesResponseSchema = extractSchema(openApiSchema, ['siteDeparturesResponse']);

  // Helper to compile a validator that references the component by pointer from the registered root schema
  const refFromRoot = (key) => ({ $ref: `${rootId}#/components/schemas/${key}` });

  const validators = {
    line: linesSchema ? ajv.compile(refFromRoot(linesSchema.key)) : null,
    lineResponse: lineResponseSchema ? ajv.compile(refFromRoot(lineResponseSchema.key)) : null,
    site: siteSchema ? ajv.compile(refFromRoot(siteSchema.key)) : null,
    stopPoint: stopPointSchema ? ajv.compile(refFromRoot(stopPointSchema.key)) : null,
    departure: departureSchema ? ajv.compile(refFromRoot(departureSchema.key)) : null,
    siteDeparturesResponse: siteDeparturesResponseSchema ? ajv.compile(refFromRoot(siteDeparturesResponseSchema.key)) : null,
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
      // Proceed leniently even if validation fails; data files may contain extra fields
    }
    const ta = raw.transport_authority || raw.transportAuthority || {};
    if (Number(ta.id) !== 1) return { skip: true };
    const modeSrc = (raw.transport_mode || raw.transportMode || '').toString().toUpperCase();
    let mode = null;
    if (modeSrc.includes('BUS')) mode = 'bus';
    else if (modeSrc.includes('TRAM')) mode = 'tram';
    else if (modeSrc.includes('METRO')) mode = 'metro';
    else if (modeSrc.includes('TRAIN')) mode = 'train';
    else if (modeSrc.includes('FERRY')) mode = 'ferry';
    else if (modeSrc.includes('SHIP')) mode = 'ship';
    else if (modeSrc.includes('TAXI')) mode = 'taxi';
    if (!mode) return { skip: true };
    const code = raw.designation || raw.name || raw.code || String(raw.id || raw.line_id || '');
    const name = raw.name || raw.public_name || code;
    const isCircular = !!raw?.is_circular || !!raw?.circular;
    return { value: { code, name, mode, isCircular, externalId: String(raw.id ?? raw.line_id ?? ''), openApiMeta: { schemaRef: linesSchema?.key, raw } } };
  }

  function validateAndMapSite(raw) {
    if (validators.site && !validators.site(raw)) {
      // Proceed leniently even if validation fails; data files may contain extra fields
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
        externalId: String(raw.id || raw.site_id),
        isStopPoint: false,
        abbreviation: raw.abbreviation,
        designation: raw.designation,
        openApiMeta: { schemaRef: siteSchema?.key, raw },
      }
    };
  }

  function validateAndMapStopPoint(raw) {
    if (validators.stopPoint && !validators.stopPoint(raw)) {
      // Proceed leniently even if validation fails; data files may contain extra fields
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
        externalId: String(raw.id || raw.stop_point_id),
        isStopPoint: true,
        designation: raw.designation,
        openApiMeta: { schemaRef: stopPointSchema?.key, raw },
      }
    };
  }

  function validateAndMapDeparture(raw) {
    if (validators.departure && !validators.departure(raw)) {
      // Proceed leniently even if validation fails; data files may contain extra fields
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
      const keys = ['bus', 'tram', 'train', 'metro', 'ship', 'ferry', 'taxi'];
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
