import FirebaseAppCheck
import FirebaseCore
import SwiftUI

@main
struct LarkfieldApp: App {
    init() {
        #if DEBUG
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        #endif
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            #if DEBUG
            if CommandLine.arguments.contains("-record") {
                Recording()
            } else {
                Shop()
            }
            #else
            Shop()
            #endif
        }
    }
}
