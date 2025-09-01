import mongoose from 'mongoose';

const StopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lon, lat]
  },
  sourceId: { type: String, required: true },
  sourceType: { type: String, enum: ['site', 'stop_point'], required: true },
  abbreviation: { type: String },
  designation: { type: String },
  openApiMeta: {
    schemaRef: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
}, { timestamps: true });

StopSchema.index({ 'location': '2dsphere' });
StopSchema.index({ sourceId: 1, sourceType: 1 }, { unique: true });

export const Stop = mongoose.model('Stop', StopSchema);
