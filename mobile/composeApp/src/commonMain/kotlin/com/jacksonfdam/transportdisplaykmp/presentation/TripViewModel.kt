package com.jacksonfdam.transportdisplaykmp.presentation

import com.jacksonfdam.transportdisplaykmp.domain.model.TripDisplayInfo
import com.jacksonfdam.transportdisplaykmp.domain.repository.TripRepository
import com.jacksonfdam.transportdisplaykmp.util.AppLogger
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
    private val TAG = "TripViewModel"

    fun startObservingTrip(lineId: String) {
        AppLogger.i(TAG, "Starting to observe trip for lineId: $lineId")
        tripJob?.cancel()

        tripJob =
            tripRepository
                .getTripUpdates(lineId)
                .onStart {
                    AppLogger.d(TAG, "State -> Loading")
                    _uiState.update { it.copy(isLoading = true, error = null) }
                }.onEach { displayInfo ->
                    AppLogger.d(TAG, "State -> Success. Current station: ${displayInfo.currentStation}")
                    _uiState.update {
                        it.copy(isLoading = false, displayInfo = displayInfo)
                    }
                }.catch { throwable ->
                    AppLogger.e(TAG, "State -> Error observing trip.", throwable)
                    _uiState.update {
                        it.copy(isLoading = false, error = "Connection failed: ${throwable.message}")
                    }
                }.launchIn(coroutineScope)
    }

    fun onCleared() {
        AppLogger.i(TAG, "ViewModel cleared, cancelling trip observation.")
        coroutineScope.launch {
            tripJob?.cancel()
        }
    }
}
