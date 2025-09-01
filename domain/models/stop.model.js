import mongoose from 'mongoose';

const StopSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
}, { timestamps: true });

StopSchema.index({ name: 1 }, { unique: true });

export const StopSimple = mongoose.model('StopSimple', StopSchema);
