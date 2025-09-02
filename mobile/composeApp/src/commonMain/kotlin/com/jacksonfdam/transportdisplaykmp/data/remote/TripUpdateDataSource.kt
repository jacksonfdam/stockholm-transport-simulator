package com.jacksonfdam.transportdisplaykmp.data.remote

import com.jacksonfdam.transportdisplaykmp.config.BuildConfig
import com.jacksonfdam.transportdisplaykmp.models.TripUpdate
import io.ktor.client.HttpClient
import io.ktor.client.plugins.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

class TripUpdateDataSource(private val httpClient: HttpClient) {

    fun connect(lineId: String): Flow<TripUpdate> = flow {
        // 2. Use as constantes do BuildConfig
        httpClient.webSocket(
            host = BuildConfig.SERVER_HOST,
            port = BuildConfig.SERVER_PORT,
            path = "/trip/$lineId"
        ) {
            for (frame in incoming) {
                if (frame is Frame.Binary) {
                    val bytes = frame.readBytes()
                    val tripUpdate = TripUpdate.parseFrom(bytes)
                    emit(tripUpdate)
                }
            }
        }
    }
}