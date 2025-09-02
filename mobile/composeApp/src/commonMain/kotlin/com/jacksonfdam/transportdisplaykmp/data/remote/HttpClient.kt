package com.jacksonfdam.transportdisplaykmp.data.remote

import io.ktor.client.*
import io.ktor.client.plugins.websocket.*

expect fun createHttpClient(): HttpClient

fun provideHttpClient(): HttpClient = createHttpClient().config {
    install(WebSockets)
}