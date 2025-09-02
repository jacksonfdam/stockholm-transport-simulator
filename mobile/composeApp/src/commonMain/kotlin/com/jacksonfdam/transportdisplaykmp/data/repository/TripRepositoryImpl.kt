package com.jacksonfdam.transportdisplaykmp.data.repository

import com.jacksonfdam.transportdisplaykmp.data.remote.TripUpdateDataSource
import com.jacksonfdam.transportdisplaykmp.domain.model.TripDisplayInfo
import com.jacksonfdam.transportdisplaykmp.domain.repository.TripRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class TripRepositoryImpl(private val dataSource: TripUpdateDataSource) : TripRepository {
    override fun getTripUpdates(lineId: String): Flow<TripDisplayInfo> {
        return dataSource.connect(lineId).map { dataModel ->
            TripDisplayInfo(
                currentStation = dataModel.currentStation.name,
                lineNumber = dataModel.lineInfo.lineNumber,
                nextStations = dataModel.nextStations.map { it.name },
                finalDestination = dataModel.finalDestination.name
            )
        }
    }
}