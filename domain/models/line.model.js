import mongoose from 'mongoose';

const LineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g., "T13", "40"
  transportType: { type: String, required: true, trim: true }, // e.g., "Tunnelbana", "Pendeltåg"
  route: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StopSimple', required: true }], // ordered
}, { timestamps: true });

LineSchema.index({ name: 1, transportType: 1 }, { unique: true });

export const LineSimple = mongoose.model('LineSimple', LineSchema);
