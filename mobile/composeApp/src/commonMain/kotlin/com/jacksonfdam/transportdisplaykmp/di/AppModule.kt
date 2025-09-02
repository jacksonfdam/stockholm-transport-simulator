package com.jacksonfdam.transportdisplaykmp.di

import com.jacksonfdam.transportdisplaykmp.data.remote.TripUpdateDataSource
import com.jacksonfdam.transportdisplaykmp.data.remote.provideHttpClient
import com.jacksonfdam.transportdisplaykmp.data.repository.TripRepositoryImpl
import com.jacksonfdam.transportdisplaykmp.domain.repository.TripRepository
import com.jacksonfdam.transportdisplaykmp.presentation.TripViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import org.koin.core.context.startKoin
import org.koin.core.module.Module
import org.koin.dsl.KoinAppDeclaration
import org.koin.dsl.module

fun initKoin(appDeclaration: KoinAppDeclaration = {}) = startKoin {
    appDeclaration()
    modules(
        dataModule,
        presentationModule
    )
}

val dataModule = module {
    single { provideHttpClient() }
    single { TripUpdateDataSource(get()) }
    single<TripRepository> { TripRepositoryImpl(get()) }
}

val presentationModule = module {
    factory {
        val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        TripViewModel(get(), scope)
    }
}