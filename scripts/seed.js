#!/usr/bin/env node
import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '../config/mongo.js';
import { StopSimple } from '../domain/models/stop.model.js';
import { LineSimple } from '../domain/models/line.model.js';
import { Vehicle } from '../domain/models/Vehicle.js';

// Definitive source of truth
const routesData = {
  Pendeltåg: {
    "40": ["Uppsala C", "Knivsta", "Arlanda C", "Upplands Väsby", "Rotebro", "Norrviken", "Häggvik", "Sollentuna", "Helenelund", "Ulriksdal", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Stuvsta", "Huddinge", "Flemingsberg", "Tullinge", "Tumba", "Rönninge", "Östertälje", "Södertälje hamn", "Södertälje C"],
    "41": ["Märsta", "Rosersberg", "Upplands Väsby", "Rotebro", "Norrviken", "Häggvik", "Sollentuna", "Helenelund", "Ulriksdal", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Stuvsta", "Huddinge", "Flemingsberg", "Tullinge", "Tumba", "Rönninge", "Östertälje", "Södertälje hamn", "Södertälje C"],
    "42": ["Märsta", "Rosersberg", "Upplands Väsby", "Rotebro", "Norrviken", "Häggvik", "Sollentuna", "Helenelund", "Ulriksdal", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Farsta strand", "Trångsund", "Skogås", "Vega", "Handen", "Jordbro", "Västerhaninge", "Krigslida", "Tungelsta", "Hemfosa", "Segersäng", "Ösmo", "Nynäsgård", "Gröndalsviken", "Nynäshamn"],
    "43": ["Bålsta", "Bro", "Kungsängen", "Kallhäll", "Jakobsberg", "Barkarby", "Spånga", "Sundbyberg", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Farsta strand", "Trångsund", "Skogås", "Vega", "Handen", "Jordbro", "Västerhaninge", "Krigslida", "Tungelsta", "Hemfosa", "Segersäng", "Ösmo", "Nynäsgård", "Gröndalsviken", "Nynäshamn"],
    "44": ["Bålsta", "Bro", "Kungsängen", "Kallhäll", "Jakobsberg", "Barkarby", "Spånga", "Sundbyberg", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Stuvsta", "Huddinge", "Flemingsberg", "Tullinge", "Tumba", "Rönninge", "Östertälje", "Södertälje hamn", "Södertälje C"],
    "45": ["Uppsala C", "Knivsta", "Arlanda C", "Upplands Väsby", "Rotebro", "Norrviken", "Häggvik", "Sollentuna", "Helenelund", "Ulriksdal", "Solna", "Stockholm Odenplan", "Stockholm City", "Stockholms södra", "Årstaberg", "Älvsjö", "Farsta strand", "Trångsund", "Skogås", "Vega", "Handen", "Jordbro", "Västerhaninge", "Krigslida", "Tungelsta", "Hemfosa", "Segersäng", "Ösmo", "Nynäsgård", "Gröndalsviken", "Nynäshamn"],
    "48": ["Södertälje C", "Södertälje hamn", "Södertälje syd", "Järna", "Mölnbo", "Gnesta"]
  },
  Tunnelbana: {
    T10: ["Hjulsta", "Tensta", "Rinkeby", "Rissne", "Duvbo", "Sundbybergs C.", "Solna strand", "Huvudsta", "Västra Skogen", "Stadshagen", "Fridhemsplan", "Rådhuset", "T-Centralen", "Kungsträdgården"],
    T11: ["Akalla", "Husby", "Kista", "Hallonbergen", "Näckrosen", "Solna centrum", "Västra Skogen", "Stadshagen", "Fridhemsplan", "Rådhuset", "T-Centralen", "Kungsträdgården"],
    T13: ["Norsborg", "Hallunda", "Alby", "Fittja", "Masmo", "Vårby gård", "Vårberg", "Skärholmen", "Sätra", "Bredäng", "Mälarhöjden", "Axelsberg", "Örnsberg", "Aspudden", "Liljeholmen", "Hornstull", "Zinkensdamm", "Mariatorget", "Slussen", "Gamla stan", "T-Centralen", "Östermalmstorg", "Karlaplan", "Gärdet", "Ropsten"],
    T14: ["Fruängen", "Västertorp", "Hägerstensåsen", "Telefonplan", "Midsommarkransen", "Liljeholmen", "Hornstull", "Zinkensdamm", "Mariatorget", "Slussen", "Gamla stan", "T-Centralen", "Östermalmstorg", "Stadion", "Tekniska högskolan", "Universitetet", "Bergshamra", "Danderyds sjukhus", "Mörby centrum"],
    T17: ["Åkeshov", "Brommaplan", "Abrahamsberg", "Stora mossen", "Alvik", "Kristineberg", "Thorildsplan", "Fridhemsplan", "S:t Eriksplan", "Odenplan", "Rådmansgatan", "Hötorget", "T-Centralen", "Gamla stan", "Slussen", "Medborgarplatsen", "Skanstull", "Gullmarsplan", "Skärmarbrink", "Hammarbyhöjden", "Björkhagen", "Kärrtorp", "Bagarmossen", "Skarpnäck"],
    T18: ["Alvik", "Kristineberg", "Thorildsplan", "Fridhemsplan", "S:t Eriksplan", "Odenplan", "Rådmansgatan", "Hötorget", "T-Centralen", "Gamla stan", "Slussen", "Medborgarplatsen", "Skanstull", "Gullmarsplan", "Skärmarbrink", "Blåsut", "Sandsborg", "Skogskyrkogården", "Tallkrogen", "Gubbängen", "Hökarängen", "Farsta", "Farsta strand"],
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

async function main() {
  await connectMongo();
  try {
    // Clear relevant collections
    await Promise.all([
      mongoose.connection.collection('stopsimples').deleteMany({}).catch(()=>{}),
      mongoose.connection.collection('linesimples').deleteMany({}).catch(()=>{}),
      Vehicle.deleteMany({}).catch(()=>{}),
    ]);

    // 1) Create all unique stops
    const stopNameSet = new Set();
    for (const transportType of Object.keys(routesData)) {
      const lines = routesData[transportType];
      for (const lineName of Object.keys(lines)) {
        for (const stopName of lines[lineName]) stopNameSet.add(stopName);
      }
    }
    const nameToId = new Map();
    for (const name of stopNameSet) {
      const doc = await StopSimple.create({ name });
      nameToId.set(name, doc._id);
    }

    // 2) Create lines with ordered route
    const lineDocs = [];
    for (const transportType of Object.keys(routesData)) {
      const lines = routesData[transportType];
      for (const lineName of Object.keys(lines)) {
        const stopIds = lines[lineName].map(n => nameToId.get(n)).filter(Boolean);
        const line = await LineSimple.create({ name: lineName, transportType, route: stopIds });
        lineDocs.push(line);
      }
    }

    // 3) Create a few initial vehicles per line (2 per line: one per direction)
    const vehicles = [];
    for (const line of lineDocs) {
      const modeGuess = (() => {
        const t = line.transportType.toLowerCase();
        if (t.includes('tunnelbana')) return 'metro';
        if (t.includes('pendeltåg')) return 'train';
        if (t.includes('spårvagn') || t.includes('tvärbanan')) return 'tram';
        return 'bus';
      })();
      const v1 = await Vehicle.create({ line: line._id, mode: modeGuess, status: 'running', currentStopIndex: 0, progressBetweenStops: 0, direction: 0 });
      const v2 = await Vehicle.create({ line: line._id, mode: modeGuess, status: 'running', currentStopIndex: 0, progressBetweenStops: 0, direction: 1 });
      vehicles.push(v1, v2);
    }

    console.log(JSON.stringify({ counts: {
      stops: await StopSimple.countDocuments({}),
      lines: await LineSimple.countDocuments({}),
      vehicles: await Vehicle.countDocuments({}),
    }}, null, 2));
  } finally {
    await disconnectMongo();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
