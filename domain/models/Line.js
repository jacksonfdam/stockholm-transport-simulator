import mongoose from 'mongoose';

const LineSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String },
  mode: { type: String, enum: ['bus', 'tram', 'train', 'metro', 'ship', 'ferry', 'taxi'], required: true },
  isCircular: { type: Boolean, default: false },
  stops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }],
  // externalId stores source Line.id from OpenAPI/data (used by departures.line.id)
  externalId: { type: String },
  openApiMeta: {
    schemaRef: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
}, { timestamps: true });

LineSchema.index({ code: 1, mode: 1 }, { unique: true });
LineSchema.index({ externalId: 1 });

export const Line = mongoose.model('Line', LineSchema);
