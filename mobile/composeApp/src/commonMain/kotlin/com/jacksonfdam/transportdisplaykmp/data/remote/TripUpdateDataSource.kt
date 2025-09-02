package com.jacksonfdam.transportdisplaykmp.data.remote

import com.jacksonfdam.transportdisplaykmp.config.BuildConfig
import com.jacksonfdam.transportdisplaykmp.data.model.TripUpdate
import com.jacksonfdam.transportdisplaykmp.util.AppLogger
import io.ktor.client.HttpClient
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.websocket.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.protobuf.ProtoBuf

@OptIn(ExperimentalSerializationApi::class)
class TripUpdateDataSource(
    private val httpClient: HttpClient,
) {
    private val protoBuf = ProtoBuf
    private val TAG = "TripUpdateDataSource"

    fun connect(lineId: String): Flow<TripUpdate> =
        flow {
            val host = BuildConfig.SERVER_HOST
            val port = BuildConfig.SERVER_PORT

            AppLogger.i(TAG, "Connecting to WebSocket = $host:$port")

            httpClient.webSocket(host = host, port = port) {
                for (frame in incoming) {
                    if (frame is Frame.Binary) {
                        try {
                            val bytes = frame.readBytes()
                            val tripUpdate = protoBuf.decodeFromByteArray(TripUpdate.serializer(), bytes)
                            emit(tripUpdate)
                        } catch (e: Exception) {
                            AppLogger.e(TAG, "Failed to parse incoming frame.", e)
                        }
                    }
                }
            }
        }.catch { e ->
            AppLogger.e(TAG, "WebSocket connection failed for line: $lineId", e)
            throw e
        }
}
