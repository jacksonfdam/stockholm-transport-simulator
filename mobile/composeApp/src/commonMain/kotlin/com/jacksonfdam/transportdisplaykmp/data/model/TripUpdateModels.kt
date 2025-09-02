package com.jacksonfdam.transportdisplaykmp.data.model

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.protobuf.ProtoNumber

@Serializable
data class Station(
    val name: String = ""
)

@Serializable
data class LineInfo(
    @SerialName("line_number") val lineNumber: String = "",
    @SerialName("transport_mode") val transportMode: String = ""
)

@Serializable
data class TripUpdate(
    @SerialName("current_station") val currentStation: Station,
    @SerialName("line_info") val lineInfo: LineInfo,
    @SerialName("next_stations") val nextStations: List<Station>,
    @SerialName("final_destination") val finalDestination: Station
)

@Serializable
data class WebSocketMessage(
    val type: String,
    val tripId: String,
    @SerialName("currentStop") val currentStation: Station,
    val nextThreeStops: List<Station>,
    val finalDestination: Station
)
