package com.jacksonfdam.transportdisplaykmp.data.repository

import com.jacksonfdam.transportdisplaykmp.data.remote.TripUpdateDataSource
import com.jacksonfdam.transportdisplaykmp.domain.model.TripDisplayInfo
import com.jacksonfdam.transportdisplaykmp.domain.repository.TripRepository
import com.jacksonfdam.transportdisplaykmp.models.TripUpdate
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class TripRepositoryImpl(private val dataSource: TripUpdateDataSource) : TripRepository {
    override fun getTripUpdates(lineId: String): Flow<TripDisplayInfo> {
        return dataSource.connect(lineId).map { proto ->
            // Mapeia do modelo Protobuf para o modelo de domínio/UI
            TripDisplayInfo(
                currentStation = proto.currentStation.name,
                lineNumber = proto.lineInfo.lineNumber,
                nextStations = proto.nextStationsList.map { it.name },
                finalDestination = proto.finalDestination.name
            )
        }
    }
}