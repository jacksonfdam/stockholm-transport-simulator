package com.jacksonfdam.transportdisplaykmp.domain.model

data class TripDisplayInfo(
    val currentStation: String,
    val lineNumber: String,
    val nextStations: List<String>,
    val finalDestination: String
)