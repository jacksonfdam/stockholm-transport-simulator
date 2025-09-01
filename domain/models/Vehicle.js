import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema({
  line: { type: mongoose.Schema.Types.ObjectId, ref: 'Line', required: true },
  mode: { type: String, enum: ['bus', 'tram', 'train', 'metro', 'ship', 'ferry', 'taxi'], required: true },
  status: { type: String, enum: ['running', 'stopped'], default: 'running' },
  currentStopIndex: { type: Number, default: 0 },
  progressBetweenStops: { type: Number, default: 0 }, // 0..1
  direction: { type: Number, enum: [0,1], default: 0 },
  lastUpdateTs: { type: Date, default: Date.now },
  position: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0,0] },
  },
}, { timestamps: true });

VehicleSchema.index({ line: 1 });

export const Vehicle = mongoose.model('Vehicle', VehicleSchema);
