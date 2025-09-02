import { Trip } from '../domain/models/Trip.js';
import { VehicleState } from '../domain/models/VehicleState.js';
import { Line } from '../domain/models/Line.js';

class Engine {
    constructor() {
        this.wss = null;
        this.activeTrips = new Map();
    }
    initialize(wss) {
        this.wss = wss;
        this.wss.clientsByTrip = new Map();
        console.log('Simulation Engine Initialized.');
        this.wss.on('connection', (ws, req) => {
            const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
            const tripId = pathname.split('/').pop();

            if (tripId && this.activeTrips.has(tripId)) {
                if (!this.wss.clientsByTrip.has(tripId)) {
                    this.wss.clientsByTrip.set(tripId, new Set());
                }
                this.wss.clientsByTrip.get(tripId).add(ws);
                console.log(`Client connected to trip ${tripId}`);

                ws.on('close', () => {
                    this.wss.clientsByTrip.get(tripId)?.delete(ws);
                    console.log(`Client disconnected from trip ${tripId}`);
                });

                const tripData = this.activeTrips.get(tripId);
                if (tripData) {
                    this._tick(tripId, tripData.line, true);
                }

            } else {
                console.log(`Connection rejected for invalid tripId: ${tripId}`);
                ws.close(1011, 'Invalid Trip ID');
            }
        });
        console.log('Simulation Engine Initialized.');
    }

    getActiveTrips() {
        const tripsList = [];
        for (const [tripId, tripData] of this.activeTrips.entries()) {
            tripsList.push({
                tripId: tripId,
                lineId: tripData.line._id.toString(),
                lineNumber: tripData.line.code,
                transportMode: tripData.line.mode,
            });
        }
        return tripsList;
    }

    async startTrip(lineId) {
        const line = await Line.findById(lineId).populate('stops').lean();
        if (!line) throw new Error('Line not found');

        const trip = await Trip.create({ line: lineId });
        await VehicleState.create({ trip: trip._id, line: lineId });

        const tripId = trip._id.toString();

        const intervalId = setInterval(async () => {
            await this._tick(tripId, line);
        }, 5000);

        this.activeTrips.set(tripId, { intervalId, line, trip });
        console.log(`Trip ${tripId} started on line ${line.code}`);
        return trip;
    }

    async stopTrip(tripId) {
        if (this.activeTrips.has(tripId)) {
            clearInterval(this.activeTrips.get(tripId));
            this.activeTrips.delete(tripId);
            await Trip.findByIdAndUpdate(tripId, { status: 'STOPPED', endTime: new Date() });
            await VehicleState.deleteOne({ trip: tripId });
            console.log(`Trip ${tripId} stopped.`);
        }
    }

    async _tick(tripId, line, isInitialSend = false) {
        let state = await VehicleState.findOne({ trip: tripId });
        if (!state) {
            this.stopTrip(tripId);
            return;
        }

        if (state.status === 'WAITING_AT_TERMINAL') return;

        if (!isInitialSend) {
            const nextStopIndex = state.currentStopIndex + state.direction;
            const collisionCheck = await VehicleState.findOne({
                line: state.line,
                direction: state.direction,
                currentStopIndex: nextStopIndex,
            });

            if (collisionCheck) {
                console.log(`Trip ${tripId}: Collision detected. Waiting.`);
                return;
            }

            state.currentStopIndex = nextStopIndex;
            state.lastUpdate = new Date();

            const isAtEnd = state.direction === 1 && nextStopIndex >= line.stops.length - 1;
            const isAtStart = state.direction === -1 && nextStopIndex <= 0;

            if (isAtEnd || isAtStart) {
                state.status = 'WAITING_AT_TERMINAL';
                setTimeout(() => {
                    state.direction *= -1;
                    state.status = 'RUNNING';
                    state.save();
                }, 120000); // 2 minutos
            }
            await state.save();

            const payload = this._prepareDisplayPayload(state, line.stops);
            this._broadcast(tripId, payload);
        }

        const payload = this._prepareDisplayPayload(state, line.stops);
        this._broadcast(tripId, payload);
    }

    _prepareDisplayPayload(state, stops) {
        const currentStop = stops[state.currentStopIndex];
        const finalDestination = state.direction === 1 ? stops[stops.length - 1] : stops[0];
        const nextThreeStops = [];
        for (let i = 1; i <= 3; i++) {
            const nextIndex = state.currentStopIndex + (i * state.direction);
            if (nextIndex >= 0 && nextIndex < stops.length) {
                nextThreeStops.push(stops[nextIndex]);
            }
        }
        return {
            tripId: state.trip.toString(),
            currentStop: { name: currentStop.name },
            nextThreeStops: nextThreeStops.map(s => ({ name: s.name })),
            finalDestination: { name: finalDestination.name },
        };
    }

    _broadcast(tripId, payload) {
        if (!this.wss) return;
        const message = JSON.stringify({ type: 'update', ...payload });
        const clients = this.wss.clientsByTrip.get(tripId);
        if (clients) {
            clients.forEach(client => {
                if (client.readyState === client.OPEN) {
                    client.send(message);
                }
            });
        }
    }
}

export const SimulationEngine = new Engine();