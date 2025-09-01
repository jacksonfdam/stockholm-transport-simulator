import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
    line: { type: mongoose.Schema.Types.ObjectId, ref: 'Line', required: true },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'STOPPED'], default: 'ACTIVE' }
}, { timestamps: true });

export const Trip = mongoose.model('Trip', tripSchema);