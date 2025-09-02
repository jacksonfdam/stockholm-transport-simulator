package com.jacksonfdam.transportdisplaykmp.presentation

import com.jacksonfdam.transportdisplaykmp.domain.model.TripDisplayInfo
import com.jacksonfdam.transportdisplaykmp.domain.repository.TripRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

// Define o estado da UI, seguindo as melhores práticas do Android
data class TripUiState(
    val isLoading: Boolean = true,
    val displayInfo: TripDisplayInfo? = null,
    val error: String? = null,
)

class TripViewModel(
    private val tripRepository: TripRepository,
    private val coroutineScope: CoroutineScope,
) {
    private val _uiState = MutableStateFlow(TripUiState())
    val uiState: StateFlow<TripUiState> = _uiState.asStateFlow()

    private var tripJob: Job? = null

    fun startObservingTrip(lineId: String) {
        tripJob?.cancel()

        tripJob =
            tripRepository
                .getTripUpdates(lineId)
                .onStart {
                    _uiState.update { it.copy(isLoading = true, error = null) }
                }.onEach { displayInfo ->
                    _uiState.update {
                        it.copy(isLoading = false, displayInfo = displayInfo)
                    }
                }.catch { throwable ->
                    _uiState.update {
                        it.copy(isLoading = false, error = "Connection failed: ${throwable.message}")
                    }
                }.launchIn(coroutineScope)
    }

    fun onCleared() {
        coroutineScope.launch {
            tripJob?.cancel()
        }
    }
}
