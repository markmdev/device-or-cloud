#if DEBUG
import SwiftUI

/// Makes Apple's column of the check's record: every input of every feature, three times, on the on-device model alone.
/// Start the app with -record; scripts/apple.ts puts the file it writes into the record.
struct Recording: View {
    @State private var line = "Starting…"

    var body: some View {
        Text(line).padding().task { await record() }
    }

    private struct Run: Codable {
        var text: String?
        var seconds: Double?
        var error: String?
    }

    private struct Record: Codable {
        var device: String
        var os: String
        var date = Date.now.formatted(.iso8601.year().month().day())
        var features: [String: [String: [Run]]] = [:]
        var held: [String: [String: [Run]]] = [:]
    }

    private func record() async {
        let file = URL.documentsDirectory.appending(path: "apple-record.json")
        var record = (try? JSONDecoder().decode(Record.self, from: Data(contentsOf: file))) ?? Record(
            device: ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"].map { "\($0) simulator" } ?? UIDevice.current.model,
            os: UIDevice.current.systemVersion
        )
        for feature in Feature.all {
            for (cases, set) in [(feature.cases, \Record.features), (feature.heldBack, \Record.held)] {
                for (n, c) in cases.enumerated() where record[keyPath: set][feature.id]?[c.id]?.count != 3 {
                    var runs: [Run] = []
                    for _ in 0..<3 {
                        do {
                            let answer = try await ask(feature, mode: .onlyOnDevice, input: c.input)
                            runs.append(Run(text: answer.text, seconds: answer.seconds))
                        } catch {
                            print("RECORD error", c.id, String(describing: error).prefix(400))
                            runs.append(Run(error: error.localizedDescription))
                        }
                    }
                    record[keyPath: set][feature.id, default: [:]][c.id] = runs
                    try! JSONEncoder().encode(record).write(to: file)
                    line = "\(feature.name): \(n + 1) of \(cases.count)"
                    print("RECORD", line)
                }
            }
        }
        line = "Recorded."
        print("RECORD done", file.path)
    }
}
#endif
