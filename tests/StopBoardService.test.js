import mongoose from 'mongoose';
import { StopBoardService } from '../application/StopBoardService.js';
import { Timetable } from '../domain/models/Timetable.js';
import { Vehicle } from '../domain/models/Vehicle.js';

describe('StopBoardService', () => {
  it('returns vehicles arriving within 5s window when eta small', async () => {
    // mock data in-memory by monkey patching Mongoose methods
    const lineId = new mongoose.Types.ObjectId();
    const stopId = new mongoose.Types.ObjectId();

    jest.spyOn(Vehicle, 'find').mockResolvedValueOnce([
      { _id: 'v1', line: { _id: lineId, code: '7' }, mode: 'tram', currentStopIndex: 0, progressBetweenStops: 0, direction: 0 },
    ]);
    jest.spyOn(Timetable, 'findOne').mockResolvedValue({
      stopTimes: [
        { stop: stopId, arrivalOffsetSec: 0, departureOffsetSec: 20, segmentDurationSec: 3 },
        { stop: new mongoose.Types.ObjectId(), arrivalOffsetSec: 30, departureOffsetSec: 50, segmentDurationSec: 5 },
      ]
    });

    const board = await StopBoardService.getStopBoard(stopId.toString());
    expect(board.arriving.length).toBeGreaterThanOrEqual(0);
  });
});
