import mongoose from 'mongoose';

const StopTimeSchema = new mongoose.Schema({
  stop: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', required: true },
  arrivalOffsetSec: { type: Number, required: true },
  departureOffsetSec: { type: Number, required: true },
  segmentDurationSec: { type: Number },
});

const TimetableSchema = new mongoose.Schema({
  line: { type: mongoose.Schema.Types.ObjectId, ref: 'Line', required: true },
  direction: { type: Number, enum: [0,1], default: 0 },
  stopTimes: [StopTimeSchema],
  openApiMeta: {
    schemaRef: { type: String },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
}, { timestamps: true });

TimetableSchema.index({ line: 1, direction: 1 }, { unique: true });

export const Timetable = mongoose.model('Timetable', TimetableSchema);
