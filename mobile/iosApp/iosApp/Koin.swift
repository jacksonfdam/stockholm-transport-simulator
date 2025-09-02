import Foundation
import ComposeApp

func startKoin() {
    let koinApplication = KoinIOSKt.doInitKoinIOS()
    _koin = koinApplication.koin
}

private var _koin: Koin_coreKoin?
var koin: Koin_coreKoin {
    return _koin!
}