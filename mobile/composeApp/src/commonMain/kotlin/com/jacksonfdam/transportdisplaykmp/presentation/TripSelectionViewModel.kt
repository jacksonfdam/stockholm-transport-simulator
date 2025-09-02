package com.jacksonfdam.transportdisplaykmp.presentation

import com.jacksonfdam.transportdisplaykmp.domain.model.ActiveTrip
import com.jacksonfdam.transportdisplaykmp.domain.repository.TripRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class TripSelectionUiState(
    val isLoading: Boolean = true,
    val activeTrips: List<ActiveTrip> = emptyList(),
    val error: String? = null
)

class TripSelectionViewModel(
    private val tripRepository: TripRepository,
    private val coroutineScope: CoroutineScope
) {
    private val _uiState = MutableStateFlow(TripSelectionUiState())
    val uiState: StateFlow<TripSelectionUiState> = _uiState.asStateFlow()

    fun loadActiveTrips() {
        coroutineScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val trips = tripRepository.getActiveTrips()
                _uiState.update { it.copy(isLoading = false, activeTrips = trips) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}