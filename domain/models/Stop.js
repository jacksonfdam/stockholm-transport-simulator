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
  // externalId mirrors sourceId for clarity when joining with departures stop_point.id
  externalId: { type: String },
  // isStopPoint makes it explicit whether this Stop originates from stop_points.json
  isStopPoint: { type: Boolean, default: false },
  abbreviation: { type: String },
  designation: { type: String },
  openApiMeta: {
    schemaRef: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
}, { timestamps: true });

StopSchema.index({ 'location': '2dsphere' });
StopSchema.index({ sourceId: 1, sourceType: 1 }, { unique: true });
StopSchema.index({ externalId: 1 });
StopSchema.index({ isStopPoint: 1 });

export const Stop = mongoose.model('Stop', StopSchema);
