#!/usr/bin/env node
import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { Line } from '../domain/models/Line.js';
import { Stop } from '../domain/models/Stop.js';
import { Timetable } from '../domain/models/Timetable.js';
import { RouteEngine } from '../application/RouteEngine.js';

// Definitive ordered routes
const routesData = {
    Pendeltåg: {
        "40": ["Uppsala centralstation", "Knivsta", "Arlanda central", "Upplands Väsby", "Rotebro", "Norrviken", "Häggvik", "Sollentuna", "Helenelund", "Ulriksdal", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Stuvsta", "Huddinge", "Flemingsberg", "Tullinge", "Tumba", "Rönninge", "Östertälje", "Södertälje hamn", "Södertälje centrum"],
        "41": ["Märsta", "Rosersberg", "Upplands Väsby", "Rotebro", "Norrviken", "Häggvik", "Sollentuna", "Helenelund", "Ulriksdal", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Stuvsta", "Huddinge", "Flemingsberg", "Tullinge", "Tumba", "Rönninge", "Östertälje", "Södertälje hamn", "Södertälje centrum"],
        "42": ["Märsta", "Rosersberg", "Upplands Väsby", "Rotebro", "Norrviken", "Häggvik", "Sollentuna", "Helenelund", "Ulriksdal", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Farsta strand", "Trångsund", "Skogås", "Vega", "Handen", "Jordbro", "Västerhaninge", "Krigslida", "Tungelsta", "Hemfosa", "Segersäng", "Ösmo", "Nynäsgård", "Gröndalsviken", "Nynäshamn"],
        "43": ["Bålsta", "Bro", "Kungsängen", "Kallhäll", "Jakobsberg", "Barkarby", "Spånga", "Sundbyberg", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Farsta strand", "Trångsund", "Skogås", "Vega", "Handen", "Jordbro", "Västerhaninge", "Krigslida", "Tungelsta", "Hemfosa", "Segersäng", "Ösmo", "Nynäsgård", "Gröndalsviken", "Nynäshamn"],
        "44": ["Bålsta", "Bro", "Kungsängen", "Kallhäll", "Jakobsberg", "Barkarby", "Spånga", "Sundbyberg", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Stuvsta", "Huddinge", "Flemingsberg", "Tullinge", "Tumba", "Rönninge", "Östertälje", "Södertälje hamn", "Södertälje centrum"],
        "45": ["Uppsala centralstation", "Knivsta", "Arlanda central", "Upplands Väsby", "Rotebro", "Norrviken", "Häggvik", "Sollentuna", "Helenelund", "Ulriksdal", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Farsta strand", "Trångsund", "Skogås", "Vega", "Handen", "Jordbro", "Västerhaninge", "Krigslida", "Tungelsta", "Hemfosa", "Segersäng", "Ösmo", "Nynäsgård", "Gröndalsviken", "Nynäshamn"],
        "48": ["Södertälje centrum", "Södertälje hamn", "Södertälje syd", "Järna", "Mölnbo", "Gnesta"]
    },
    Tunnelbana: {
        T10: ["Hjulsta", "Tensta", "Rinkeby", "Rissne", "Duvbo", "Sundbybergs centrum", "Solna strand", "Huvudsta", "Västra Skogen", "Stadshagen", "Fridhemsplan", "Rådhuset", "T-Centralen", "Kungsträdgården"],
        T11: ["Akalla", "Husby", "Kista", "Hallonbergen", "Näckrosen", "Solna centrum", "Västra Skogen", "Stadshagen", "Fridhemsplan", "Rådhuset", "T-Centralen", "Kungsträdgården"],
        T13: ["Norsborg", "Hallunda", "Alby", "Fittja", "Masmo", "Vårby gård", "Vårberg", "Skärholmen", "Sätra", "Bredäng", "Mälarhöjden", "Axelsberg", "Örnsberg", "Aspudden", "Liljeholmen", "Hornstull", "Zinkensdamm", "Mariatorget", "Slussen", "Gamla stan", "T-Centralen", "Östermalmstorg", "Karlaplan", "Gärdet", "Ropsten"],
        T14: ["Fruängen", "Västertorp", "Hägerstensåsen", "Telefonplan", "Midsommarkransen", "Liljeholmen", "Hornstull", "Zinkensdamm", "Mariatorget", "Slussen", "Gamla stan", "T-Centralen", "Östermalmstorg", "Stadion", "Tekniska högskolan", "Universitetet", "Bergshamra", "Danderyds sjukhus", "Mörby centrum"],
        T17: ["Hässelby strand", "Hässelby gård", "Johannelund", "Vällingby", "Råcksta", "Blackeberg", "Islandstorget", "Ängbyplan", "Åkeshov", "Brommaplan", "Abrahamsberg", "Stora mossen", "Alvik", "Kristineberg", "Thorildsplan", "Fridhemsplan", "S:t Eriksplan", "Odenplan", "Rådmansgatan", "Hötorget", "T-Centralen", "Gamla stan", "Slussen", "Medborgarplatsen", "Skanstull", "Gullmarsplan", "Skärmarbrink", "Hammarbyhöjden", "Björkhagen", "Kärrtorp", "Bagarmossen", "Skarpnäck"],
        T18: ["Hässelby strand", "Hässelby gård", "Johannelund", "Vällingby", "Råcksta", "Blackeberg", "Islandstorget", "Ängbyplan", "Åkeshov", "Brommaplan", "Abrahamsberg", "Stora mossen", "Alvik", "Kristineberg", "Thorildsplan", "Fridhemsplan", "S:t Eriksplan", "Odenplan", "Rådmansgatan", "Hötorget", "T-Centralen", "Gamla stan", "Slussen", "Medborgarplatsen", "Skanstull", "Gullmarsplan", "Skärmarbrink", "Blåsut", "Sandsborg", "Skogskyrkogården", "Tallkrogen", "Gubbängen", "Hökarängen", "Farsta", "Farsta strand"],
        T19: ["Hässelby strand", "Hässelby gård", "Johannelund", "Vällingby", "Råcksta", "Blackeberg", "Islandstorget", "Ängbyplan", "Åkeshov", "Brommaplan", "Abrahamsberg", "Stora mossen", "Alvik", "Kristineberg", "Thorildsplan", "Fridhemsplan", "S:t Eriksplan", "Odenplan", "Rådmansgatan", "Hötorget", "T-Centralen", "Gamla stan", "Slussen", "Medborgarplatsen", "Skanstull", "Gullmarsplan", "Globen", "Enskede gård", "Sockenplan", "Svedmyra", "Stureby", "Bandhagen", "Högdalen", "Rågsved", "Hagsätra"]
    },
    Tvärbanan: {
        "30": ["Solna station", "Solna centrum", "Solna Business Park", "Sundbybergs centrum", "Bällsta bro", "Karlsbodavägen", "Norra Ulvsunda", "Johannesfred", "Alvik", "Alviks strand", "Stora Essingen", "Gröndal", "Trekanten", "Liljeholmen", "Årstadal", "Årstaberg", "Årstafältet", "Valla torg", "Linde", "Globen", "Gullmarsplan", "Mårtensdal", "Luma", "Sickla kaj", "Sickla udde", "Sickla"],
        "31": ["Bromma flygplats", "Bromma Blocks", "Norra Ulvsunda", "Johannesfred", "Alvik", "Alviks strand"]
    },
    Spårvagn: {
        "7": ["T-Centralen", "Kungsträdgården", "Nybroplan", "Styrmansgatan", "Djurgårdsbron", "Nordiska Museet/Vasamuseet", "Liljevalchs/Gröna Lund", "Skansen"],
        "12": ["Alvik", "Alléparken", "Klövervägen", "Smedslätten", "Ålstensgatan", "Ålstens Gård", "Höglandstorget", "Olovslund", "Nockeby Torg", "Nockeby"],
        "21": ["Ropsten", "Torsvik", "Baggeby", "Bodal", "Larsberg", "Aga", "Skärsätra", "Kottla", "Högberga", "Brevik", "Käppala", "Gåshaga", "Gåshaga Brygga"]
    }
};

function groupToMode(group) {
  const g = group.toLowerCase();
  if (g.includes('tunnelbana')) return 'metro';
  if (g.includes('pendeltåg')) return 'train';
  if (g.includes('tvärbanan') || g.includes('spårvagn')) return 'tram';
  return 'bus';
}

function normalizeCode(group, code) {
  if (group.toLowerCase().includes('tunnelbana') && /^t\d+/i.test(code)) {
    return code.replace(/^t/i, ''); // T17 -> 17 matches designation
  }
  return code;
}

async function findStopIdByName(name) {
  // Prefer site, then stop_point, fallback regex
  const exactSite = await Stop.findOne({ name, sourceType: 'site' }).select('_id');
  if (exactSite) return exactSite._id;
  const exactPt = await Stop.findOne({ name, sourceType: 'stop_point' }).select('_id');
  if (exactPt) return exactPt._id;
  const re = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const fuzzy = await Stop.findOne({ name: re }).select('_id');
  return fuzzy?._id || null;
}

async function main() {
  await connectMongo();
  try {
    const summary = { linesUpdated: 0, stopsAssigned: 0, missingStops: [] };

    for (const group of Object.keys(routesData)) {
      const mode = groupToMode(group);
      const lines = routesData[group];
      for (const rawCode of Object.keys(lines)) {
        const code = normalizeCode(group, rawCode);
        const stopNames = lines[rawCode];

        // Find target line by code+mode
        const line = await Line.findOne({ code, mode });
        if (!line) {
          // If not found, skip but log
          summary.missingStops.push({ line: `${group} ${rawCode}`, reason: 'Line not found' });
          continue;
        }

        const stopIds = [];
        for (const name of stopNames) {
          const id = await findStopIdByName(name);
          if (!id) {
            summary.missingStops.push({ line: `${mode} ${code}`, stop: name, reason: 'Stop not found by name' });
            continue;
          }
          stopIds.push(id);
        }

        const isCircular = stopIds.length > 1 && String(stopIds[0]) === String(stopIds[stopIds.length-1]);
        line.stops = stopIds;
        line.isCircular = isCircular;
        await line.save();
        summary.linesUpdated += 1;
        summary.stopsAssigned += stopIds.length;

        // Build/update timetables for both directions
        const stopDocs = stopIds.length ? await Stop.find({ _id: { $in: stopIds } }) : [];
        // Preserve order of stopIds
        const ordered = stopIds.map(id => stopDocs.find(s => String(s._id) === String(id))).filter(Boolean);
        const stopTimes = RouteEngine.buildStopTimesForLine(line, ordered, []);
        for (const direction of [0, 1]) {
          await Timetable.findOneAndUpdate(
            { line: line._id, direction },
            { line: line._id, direction, stopTimes, openApiMeta: line.openApiMeta },
            { new: true, upsert: true }
          );
        }
      }
    }

    console.log(JSON.stringify({ summary }, null, 2));
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await disconnectMongo();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
