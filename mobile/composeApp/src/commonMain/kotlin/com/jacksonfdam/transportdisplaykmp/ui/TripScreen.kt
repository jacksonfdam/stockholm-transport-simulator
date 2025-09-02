package com.jacksonfdam.transportdisplaykmp.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jacksonfdam.transportdisplaykmp.presentation.TripViewModel
import org.koin.compose.koinInject

@Composable
fun TripScreen(
    lineId: String,
    viewModel: TripViewModel = koinInject() // Injeta o ViewModel compartilhado
) {
    val uiState by viewModel.uiState.collectAsState()

    // Inicia a observação quando a tela aparece
    LaunchedEffect(key1 = lineId) {
        viewModel.startObservingTrip(lineId)
    }

    Box(
        modifier = Modifier.fillMaxSize().background(Color(0xFFF0F2F5)),
        contentAlignment = Alignment.Center
    ) {
        when {
            uiState.isLoading -> {
                CircularProgressIndicator()
            }
            uiState.error != null -> {
                Text(text = uiState.error!!, color = Color.Red, modifier = Modifier.padding(16.dp))
            }
            uiState.displayInfo != null -> {
                val displayInfo = uiState.displayInfo!!
                PassengerInformationDisplay(
                    currentStation = displayInfo.currentStation,
                    lineNumber = displayInfo.lineNumber,
                    nextStations = displayInfo.nextStations,
                    finalDestination = displayInfo.finalDestination
                )
            }
        }
    }
}

@Composable
fun PassengerInformationDisplay(
    currentStation: String,
    lineNumber: String,
    nextStations: List<String>,
    finalDestination: String
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Line $lineNumber to $finalDestination",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.primary
            )

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = "Current Station", style = MaterialTheme.typography.bodyMedium)
                Text(
                    text = currentStation,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = "Next Stations", style = MaterialTheme.typography.bodyMedium)
                nextStations.take(3).forEach { station ->
                    Text(text = station, fontSize = 20.sp)
                }
            }
        }
    }
}