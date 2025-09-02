package com.jacksonfdam.transportdisplaykmp

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import com.jacksonfdam.transportdisplaykmp.di.initKoin
import com.jacksonfdam.transportdisplaykmp.ui.TripScreen
import com.jacksonfdam.transportdisplaykmp.ui.TripSelectionScreen

@Composable
fun App() {
    initKoin()

    MaterialTheme {
        var currentScreen by remember { mutableStateOf<Screen>(Screen.TripSelection) }

        when (val screen = currentScreen) {
            is Screen.TripSelection -> {
                TripSelectionScreen(
                    onTripSelected = { tripId ->
                        currentScreen = Screen.TripDisplay(tripId)
                    }
                )
            }
            is Screen.TripDisplay -> {
                TripScreen(tripId = screen.tripId)
            }
        }
    }
}

// Define os estados de navegação
sealed class Screen {
    object TripSelection : Screen()
    data class TripDisplay(val tripId: String) : Screen()
}