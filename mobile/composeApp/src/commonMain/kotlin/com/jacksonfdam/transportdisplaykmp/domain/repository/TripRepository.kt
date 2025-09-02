package com.jacksonfdam.transportdisplaykmp.domain.repository

import com.jacksonfdam.transportdisplaykmp.domain.model.ActiveTrip
import com.jacksonfdam.transportdisplaykmp.domain.model.TripDisplayInfo
import kotlinx.coroutines.flow.Flow

interface TripRepository {
    fun getTripUpdates(lineId: String): Flow<TripDisplayInfo>
    suspend fun getActiveTrips(): List<ActiveTrip>
}