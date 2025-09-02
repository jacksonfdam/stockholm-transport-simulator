package com.jacksonfdam.transportdisplaykmp

import androidx.compose.runtime.*
import com.jacksonfdam.transportdisplaykmp.di.initKoin
import com.jacksonfdam.transportdisplaykmp.ui.TripScreen
import com.jacksonfdam.transportdisplaykmp.theme.AppTheme
import org.jetbrains.compose.ui.tooling.preview.Preview

@Preview
@Composable
internal fun App() = AppTheme {

    initKoin()

    TripScreen(lineId = "T19")
}
