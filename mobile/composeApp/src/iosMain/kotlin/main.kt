import androidx.compose.ui.window.ComposeUIViewController
import com.jacksonfdam.transportdisplaykmp.App
import platform.UIKit.UIViewController

fun MainViewController(): UIViewController = ComposeUIViewController { App() }
