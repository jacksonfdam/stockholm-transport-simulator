package com.jacksonfdam.transportdisplaykmp.util

import platform.Foundation.NSLog

actual object AppLogger {
    actual fun e(tag: String, message: String, throwable: Throwable?) {
        if (throwable != null) {
            // O throwable em Kotlin/Native pode não ter uma stack trace tão rica, mas o 'cause' é útil.
            NSLog("ERROR: [$tag] $message. Throwable: ${throwable.message}, Cause: ${throwable.cause}")
        } else {
            NSLog("ERROR: [$tag] $message")
        }
    }

    actual fun d(tag: String, message: String) {
        NSLog("DEBUG: [$tag] $message")
    }

    actual fun i(tag: String, message: String) {
        NSLog("INFO: [$tag] $message")
    }
}