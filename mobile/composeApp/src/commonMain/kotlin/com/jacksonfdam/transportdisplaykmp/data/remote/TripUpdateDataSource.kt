package com.jacksonfdam.transportdisplaykmp.data.remote

import com.jacksonfdam.transportdisplaykmp.data.model.TripUpdate
import io.ktor.client.HttpClient
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.websocket.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.protobuf.ProtoBuf

class TripUpdateDataSource(private val httpClient: HttpClient) {
    private val protoBuf = ProtoBuf

    fun connect(lineId: String): Flow<TripUpdate> = flow {
        // ATENÇÃO: Hardcoded por enquanto. Idealmente, viria do BuildConfig.
        val host = "192.168.0.8"
        val port = 3000

        httpClient.webSocket(host = host, port = port, path = "/trip/$lineId") {
            for (frame in incoming) {
                if (frame is Frame.Binary) {
                    val bytes = frame.readBytes()
                    val tripUpdate = protoBuf.decodeFromByteArray(TripUpdate.serializer(), bytes)
                    emit(tripUpdate)
                }
            }
        }
    }
}