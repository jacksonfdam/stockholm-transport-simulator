import mongoose from 'mongoose';

const vehicleStateSchema = new mongoose.Schema({
    trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, unique: true },
    line: { type: mongoose.Schema.Types.ObjectId, ref: 'Line', required: true },
    direction: { type: Number, enum: [1, -1], default: 1 }, // 1: forward, -1: backward
    currentStopIndex: { type: Number, default: 0 },
    status: { type: String, enum: ['RUNNING', 'WAITING_AT_TERMINAL'], default: 'RUNNING' },
    lastUpdate: { type: Date, default: Date.now }
});

// Índice para garantir que não haja dois veículos no mesmo lugar/direção
vehicleStateSchema.index({ line: 1, direction: 1, currentStopIndex: 1 });

export const VehicleState = mongoose.model('VehicleState', vehicleStateSchema);