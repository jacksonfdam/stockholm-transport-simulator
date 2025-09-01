import mongoose from 'mongoose';

const LineSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String },
  mode: { type: String, enum: ['bus', 'tram', 'train'], required: true },
  isCircular: { type: Boolean, default: false },
  stops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }],
  openApiMeta: {
    schemaRef: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
}, { timestamps: true });

LineSchema.index({ code: 1, mode: 1 }, { unique: true });

export const Line = mongoose.model('Line', LineSchema);
