#!/usr/bin/env node
import { connectMongo } from '../config/mongo.js';
import { createServer } from '../presentation/server.js';
import { VehicleSimulator } from '../application/VehicleSimulator.js';

async function main() {
  await connectMongo();
  const { server } = await createServer();
  const sim = new VehicleSimulator();
  sim.start();
}

main().catch(e => { console.error(e); process.exit(1); });
