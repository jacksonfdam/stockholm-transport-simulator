// composeApp/src/commonMain/kotlin/com/jacksonfdam/transportdisplaykmp/ui/TripSelectionScreen.kt

package com.jacksonfdam.transportdisplaykmp.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.jacksonfdam.transportdisplaykmp.domain.model.ActiveTrip
import com.jacksonfdam.transportdisplaykmp.presentation.TripSelectionViewModel
import org.koin.compose.koinInject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TripSelectionScreen(
    onTripSelected: (tripId: String) -> Unit, // Callback para navegar para a próxima tela
    viewModel: TripSelectionViewModel = koinInject()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadActiveTrips()
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Select an Active Trip") })
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier.fillMaxSize().padding(paddingValues),
            contentAlignment = Alignment.Center
        ) {
            when {
                uiState.isLoading -> CircularProgressIndicator()
                uiState.error != null -> Text("Error: ${uiState.error}", color = MaterialTheme.colorScheme.error)
                uiState.activeTrips.isEmpty() -> Text("No active trips found.")
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(uiState.activeTrips) { trip ->
                            TripItem(trip = trip, onClick = { onTripSelected(trip.tripId) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TripItem(trip: ActiveTrip, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text("Line: ${trip.lineNumber}", style = MaterialTheme.typography.titleMedium)
                Text("Mode: ${trip.transportMode.capitalize()}", style = MaterialTheme.typography.bodyMedium)
            }
            Text("Trip ID: ...${trip.tripId.takeLast(6)}")
        }
    }
}