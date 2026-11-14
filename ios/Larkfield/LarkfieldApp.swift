import FirebaseAppCheck
import FirebaseCore
import SwiftUI

@main
struct LarkfieldApp: App {
    @AppStorage("tab") private var tab = "shop"

    init() {
        #if DEBUG
        AppCheck.setAppCheckProviderFactory(AppCheckDebugProviderFactory())
        #endif
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            TabView(selection: $tab) {
                Tab("Shop", systemImage: "bag", value: "shop") { Shop() }
                Tab("Check", systemImage: "checklist", value: "check") { CheckScreen() }
            }
            .tint(Color.ink)
        }
    }
}
