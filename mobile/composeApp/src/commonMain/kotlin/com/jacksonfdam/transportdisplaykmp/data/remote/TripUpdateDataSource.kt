package com.jacksonfdam.transportdisplaykmp.data.remote

import com.jacksonfdam.transportdisplaykmp.config.BuildConfig
import com.jacksonfdam.transportdisplaykmp.data.model.TripUpdate
import com.jacksonfdam.transportdisplaykmp.data.model.WebSocketMessage
import com.jacksonfdam.transportdisplaykmp.util.AppLogger
import io.ktor.client.HttpClient
import io.ktor.client.plugins.websocket.webSocket
import io.ktor.websocket.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.protobuf.ProtoBuf

@OptIn(ExperimentalSerializationApi::class)
class TripUpdateDataSource(
    private val httpClient: HttpClient,
) {
    private val json = Json { ignoreUnknownKeys = true }
    private val TAG = "TripUpdateDataSource"

    fun connect(tripId: String): Flow<WebSocketMessage> =
        flow {
            val host = BuildConfig.SERVER_HOST
            val port = BuildConfig.SERVER_PORT

            AppLogger.i(TAG, "Connecting to WebSocket = $host:$port")

            httpClient.webSocket(host = "192.168.0.8", port = 3000, path = "/trip/$tripId") {
                for (frame in incoming) {
                    if (frame is Frame.Text) {
                        val jsonString = frame.readText()
                        try {
                            val message = json.decodeFromString<WebSocketMessage>(jsonString)
                            emit(message)
                        } catch (e: Exception) {
                            AppLogger.e(TAG, "Failed to parse incoming frame.", e)
                        }
                    }
                }
            }
        }.catch { e ->
            AppLogger.e(TAG, "WebSocket connection failed for tripId: $tripId", e)
            throw e
        }
}
