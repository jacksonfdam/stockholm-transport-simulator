package com.jacksonfdam.transportdisplaykmp.data.repository

import com.jacksonfdam.transportdisplaykmp.config.BuildConfig
import com.jacksonfdam.transportdisplaykmp.data.remote.TripUpdateDataSource
import com.jacksonfdam.transportdisplaykmp.domain.model.ActiveTrip
import com.jacksonfdam.transportdisplaykmp.domain.model.TripDisplayInfo
import com.jacksonfdam.transportdisplaykmp.domain.repository.TripRepository
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class TripRepositoryImpl(
    private val dataSource: TripUpdateDataSource,
    private val httpClient: HttpClient
) : TripRepository {
    override fun getTripUpdates(lineId: String): Flow<TripDisplayInfo> =
        dataSource.connect(lineId).map { message ->
            TripDisplayInfo(
                currentStation = message.currentStation.name,
                lineNumber = lineId,
                nextStations = message.nextThreeStops.map { it.name },
                finalDestination = message.finalDestination.name,
            )
        }

    override suspend fun getActiveTrips(): List<ActiveTrip> = httpClient.get("${BuildConfig.SERVER_HOST_URL}/api/trips/active").body()
}
