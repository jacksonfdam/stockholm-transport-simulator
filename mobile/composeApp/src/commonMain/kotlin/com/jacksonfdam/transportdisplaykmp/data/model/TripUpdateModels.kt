package com.jacksonfdam.transportdisplaykmp.data.model

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.protobuf.ProtoNumber

@Serializable
@OptIn(ExperimentalSerializationApi::class)
data class Station(
    @ProtoNumber(1) val name: String = ""
)

@Serializable
@OptIn(ExperimentalSerializationApi::class)
data class LineInfo(
    @ProtoNumber(1) @SerialName("line_number") val lineNumber: String = "",
    @ProtoNumber(2) @SerialName("transport_mode") val transportMode: String = ""
)

@Serializable
@OptIn(ExperimentalSerializationApi::class)
data class TripUpdate(
    @ProtoNumber(1) @SerialName("current_station") val currentStation: Station,
    @ProtoNumber(2) @SerialName("line_info") val lineInfo: LineInfo,
    @ProtoNumber(3) @SerialName("next_stations") val nextStations: List<Station>,
    @ProtoNumber(4) @SerialName("final_destination") val finalDestination: Station
)