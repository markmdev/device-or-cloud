import JavaScriptCore
import SwiftUI

/// One answer to one input, as the web check's record keeps it: its text and time, or the error.
struct Run: Codable {
    var text: String?
    var seconds: Double?
    var error: String?
}

/// What this iPhone has answered itself: for each feature, each input's runs on Apple's model and the grader's word on them.
typealias Mine = [String: [String: Answers]]

struct Answers: Codable {
    struct Grade: Codable {
        var ok: Bool
        var reason: String?
    }

    var apple: [Run] = []
    var grades: [String: Grade]?
}

/// Every feature's verdict with its counts and its wrong answers, as the check's own code works them out.
struct Board: Decodable {
    struct Recorded: Decodable {
        let device: String
        let os: String
        let date: String
    }

    struct Failure: Decodable, Identifiable {
        let id: String
        let input: String
        /// Which model got it wrong: device, cloud or both.
        let side: String
        let answer: String
        let wrongRuns: Int
        let cloudAnswer: String
        let reason: String
        let byCode: Bool
    }

    struct Row: Decodable, Identifiable {
        let id: String
        let name: String
        /// device, cloud, fix, more or pending.
        let kind: String
        let verdict: String
        /// Answered on this iPhone, not taken from the record.
        let mine: Bool
        let inputs: Int
        let runs: Int
        let runsRight: Int
        let cloudRight: Int
        let failures: [Failure]
    }

    let allowed: Int
    /// Where the answers that aren't this iPhone's own were recorded.
    let recorded: Recorded?
    let features: [Row]
}

/// A request that has the cloud model judge a batch of free-text answers.
struct Grading: Decodable {
    struct Item: Codable {
        let id: String
        let answer: String
    }

    let feature: String
    let system: String
    let prompt: String
    let items: [Item]
}

/// The check's own code, the same the web check runs: `npm run ios` builds it from src/check/phone.ts.
@MainActor
enum Judge {
    private static let script: JSValue = {
        let context = JSContext()!
        context.evaluateScript(try! String(contentsOf: Bundle.main.url(forResource: "check", withExtension: "js")!, encoding: .utf8))
        return context.objectForKeyedSubscript("check")
    }()

    private static func text(_ value: some Encodable) -> String {
        String(decoding: try! JSONEncoder().encode(value), as: UTF8.self)
    }

    private static func call<T: Decodable>(_ name: String, _ arguments: String...) -> T? {
        guard let json = script.invokeMethod(name, withArguments: arguments)?.toString() else { return nil }
        return try? JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    static func board(_ mine: Mine) -> Board { call("board", text(mine))! }
    static func grading(_ mine: Mine) -> [Grading] { call("grading", text(mine))! }

    /// The answers with the grader's reply put in; nil when the reply can't be read.
    static func graded(_ mine: Mine, by request: Grading, reply: String) -> Mine? {
        call("withReply", text(mine), request.feature, text(request.items), reply)
    }
}

/// The check, run on this iPhone: Apple's on-device model answers every input of every feature three times.
@MainActor @Observable
final class Check {
    /// The file scripts/apple.ts reads to put Apple's column into the record.
    private struct Saved: Codable {
        var device: String
        var os: String
        var date: String
        var answers: Mine = [:]
    }

    private static let file = URL.documentsDirectory.appending(path: "check.json")
    private var saved: Saved
    private(set) var board: Board
    /// The feature being answered, and how many of its inputs are done.
    private(set) var running: (name: String, done: Int, of: Int)?
    private(set) var problem: String?
    private var stopped = false

    init() {
        let saved = (try? JSONDecoder().decode(Saved.self, from: Data(contentsOf: Self.file))) ?? Saved(
            device: ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"].map { "\($0) simulator" } ?? UIDevice.current.model,
            os: UIDevice.current.systemVersion,
            date: Date.now.formatted(.iso8601.year().month().day())
        )
        self.saved = saved
        board = Judge.board(saved.answers)
    }

    func stop() {
        stopped = true
    }

    /// Answers every feature again. With `heldBack`, also the inputs kept out of the check, and a feature already whole in
    /// the file is kept: that is how the record's own column is made, and it picks up where it stopped.
    func run(heldBack: Bool = false) async {
        stopped = false
        problem = nil
        // iOS answers on the device only while the app is in front, and a full run takes minutes.
        UIApplication.shared.isIdleTimerDisabled = true
        defer {
            UIApplication.shared.isIdleTimerDisabled = false
            running = nil
        }
        for feature in Feature.all {
            let cases = feature.cases + (heldBack ? feature.heldBack : [])
            if heldBack, cases.allSatisfy({ saved.answers[feature.id]?[$0.id]?.apple.count == 3 }) { continue }
            var answers: [String: Answers] = [:]
            for (n, c) in cases.enumerated() {
                running = (feature.name, n, cases.count)
                var runs: [Run] = []
                for _ in 0..<3 where !stopped {
                    do {
                        let answer = try await ask(feature, mode: .onlyOnDevice, input: c.input)
                        runs.append(Run(text: answer.text, seconds: answer.seconds))
                    } catch {
                        runs.append(Run(error: error.localizedDescription))
                    }
                }
                if stopped { return }
                answers[c.id] = Answers(apple: runs)
                if heldBack { print("RECORD \(feature.name): \(n + 1) of \(cases.count)") }
            }
            saved.answers[feature.id] = answers
            await grade()
            try? JSONEncoder().encode(saved).write(to: Self.file)
            board = Judge.board(saved.answers)
        }
    }

    /// Has the cloud model judge the free-text answers code found nothing wrong with.
    private func grade() async {
        for request in Judge.grading(saved.answers) {
            do {
                let reply = try await askGrader(system: request.system, prompt: request.prompt)
                saved.answers = Judge.graded(saved.answers, by: request, reply: reply) ?? saved.answers
            } catch {
                problem = "The cloud model couldn't judge some answers, so their feature waits: \(error.localizedDescription)"
            }
        }
    }
}
