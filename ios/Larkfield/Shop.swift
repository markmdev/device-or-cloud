import FirebaseAILogic
import FirebaseRemoteConfig
import SwiftUI

extension Color {
    init(_ hex: UInt32) {
        self.init(red: Double(hex >> 16 & 0xff) / 255, green: Double(hex >> 8 & 0xff) / 255, blue: Double(hex & 0xff) / 255)
    }

    static let ink = Color(0x10130f)
    static let soft = Color(0x4d5650)
    static let faint = Color(0x7c857e)
    static let wash = Color(0xf4f5f1)
    static let device = Color(0xd6f36b)
    static let cloud = Color(0xc4dcff)
    static let wrong = Color(0xcf2d12)
    static let notice = Color(0xffeeb0)
}

struct Shop: View {
    // Empty until Remote Config has answered, so no feature runs on a setting older than the published one.
    @State private var modes: [String: Mode]?
    private let config = RemoteConfig.remoteConfig()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Larkfield").font(.system(size: 32, weight: .heavy)).tracking(-1)
                    Text("A made-up home and garden shop with eight AI features. Each one reads where to run from Firebase Remote Config, set from [the check's verdicts](https://device-or-cloud.web.app), and says where its answer ran.")
                    Text("What you type into a feature that runs in the cloud goes to Google's free Gemini tier, and Google may use it to improve its products. A feature that runs on this iPhone sends nothing.")
                        .font(.system(size: 13.5))
                        .foregroundStyle(Color.soft)
                }
                .padding(.top, 8)
                Rectangle().fill(Color.ink).frame(height: 2)
                if let waiting = deviceModelWaiting {
                    Text("\(waiting) Until then, every feature here runs in the cloud.")
                        .font(.system(size: 15, weight: .medium))
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.notice, in: RoundedRectangle(cornerRadius: 14))
                }
                if let modes {
                    ForEach(Feature.all) { feature in
                        Card(feature: feature, mode: modes[feature.id] ?? .onlyInCloud)
                    }
                }
            }
            .padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .foregroundStyle(Color.ink)
        .tint(Color.ink)
        .background(.white)
        .preferredColorScheme(.light)
        .task {
            config.setDefaults(Dictionary(uniqueKeysWithValues: Feature.all.map { ($0.parameter, "only_in_cloud" as NSObject) }))
            _ = try? await config.fetchAndActivate()
            modes = read()
            #if DEBUG
            // Started with -walk, the app also says whether Apple's model answers here at all, whatever the modes are.
            if CommandLine.arguments.contains("-walk"), let feature = Feature.all.first {
                let answer = try? await ask(feature, mode: .onlyOnDevice, input: feature.sample.text)
                print("WALK apple", answer?.onDevice == true ? "on_device" : "failed")
            }
            #endif
            // A template published while the app is open moves its features at once.
            do {
                for try await _ in config.configUpdates {
                    _ = try? await config.activate()
                    modes = read()
                }
            } catch {}
        }
    }

    private func read() -> [String: Mode] {
        Dictionary(uniqueKeysWithValues: Feature.all.map { ($0.id, Mode(rawValue: config.configValue(forKey: $0.parameter).stringValue) ?? .onlyInCloud) })
    }
}

private struct Card: View {
    let feature: Feature
    let mode: Mode
    @State private var input: String
    @State private var busy = false
    @State private var answer: Answer?
    @State private var problem: String?

    init(feature: Feature, mode: Mode) {
        self.feature = feature
        self.mode = mode
        _input = State(initialValue: feature.sample.text)
    }

    var body: some View {
        let onDevice = answer?.onDevice ?? mode.startsOnDevice
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 0) {
                Text(feature.label).font(.system(size: 12.5, weight: .semibold)).foregroundStyle(Color.soft)
                Text(feature.heading).font(.system(size: 23, weight: .bold)).tracking(-0.5).padding(.top, 8).padding(.bottom, 14)
                TextField(feature.heading, text: $input, axis: .vertical)
                    .lineLimit(3...8)
                    .font(.system(size: 13.5, design: .monospaced))
                    .padding(14)
                    .background(Color.wash, in: RoundedRectangle(cornerRadius: 14))
                if !feature.sample.added.isEmpty {
                    Text("The shop adds its own line first: “\(feature.sample.added.trimmingCharacters(in: .whitespacesAndNewlines))”")
                        .font(.system(size: 12.5))
                        .foregroundStyle(Color.soft)
                        .padding(.top, 8)
                }
                Button(feature.button) { Task { await run() } }
                    .buttonStyle(Solid())
                    .disabled(busy || input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .padding(.top, 12)
                    .padding(.bottom, 16)
                VStack(alignment: .leading, spacing: 6) {
                    if busy { Text("Working…").foregroundStyle(Color.soft) }
                    if let answer { Result(feature: feature, text: answer.text) }
                    if let problem { Text(problem) }
                }
                .frame(maxWidth: .infinity, minHeight: 72, alignment: .topLeading)
            }
            .padding(.horizontal, 22)
            .padding(.top, 20)
            .padding(.bottom, 14)

            Rectangle().fill(Color.ink).frame(height: 2)
            // Full colour and a filled dot once an answer ran there; pale and hollow while it is only set to.
            HStack(spacing: 8) {
                Circle().strokeBorder(Color.ink, lineWidth: 2).background(Circle().fill(answer == nil ? .clear : Color.ink)).frame(width: 8, height: 8)
                Text(answer == nil ? (onDevice ? "Set to run on this iPhone" : "Set to run in the cloud") : (onDevice ? "Ran on this iPhone" : "Ran in the cloud"))
                    .fontWeight(answer == nil ? .medium : .semibold)
                Spacer()
                Text((answer.map { "\($0.seconds.formatted(.number.precision(.fractionLength(1)))) s · " } ?? "") + (onDevice ? "works offline" : "needs a connection"))
                    .fontWeight(.medium)
            }
            .font(.system(size: 14))
            .padding(.horizontal, 22)
            .frame(height: 52)
            .background((onDevice ? Color.device : Color.cloud).opacity(answer == nil ? 0.38 : 1))
            .accessibilityElement(children: .combine)
        }
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(Color.ink, lineWidth: 2))
        #if DEBUG
        // Started with -walk, every card answers its sample once and says where it ran, for scripts/walk-ios.mjs.
        .task {
            guard CommandLine.arguments.contains("-walk") else { return }
            await run()
            print("WALK", feature.id, mode.rawValue, answer.map { $0.onDevice ? "on_device" : "in_cloud" } ?? "failed: \(problem ?? "")")
        }
        #endif
    }

    private func run() async {
        busy = true
        answer = nil
        problem = nil
        do {
            answer = try await ask(feature, mode: mode, input: feature.sample.added + input)
        } catch {
            let said = String(describing: error)
            problem = if said.contains(NSURLErrorDomain) {
                "This feature runs in the cloud, so it needs a connection."
            } else if said.contains("resourceExhausted") {
                "The free cloud requests this shop shares are used up for now: 15 a minute and 500 a day on Google's free tier. Try again in a minute, or tomorrow."
            } else {
                error.localizedDescription
            }
        }
        busy = false
    }
}

struct Solid: ButtonStyle {
    @Environment(\.isEnabled) private var enabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14.5, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(Color.ink, in: Capsule())
            .opacity(enabled ? 1 : 0.4)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.14), value: configuration.isPressed)
    }
}

/// An answer as the shop shows it to a customer.
private struct Result: View {
    let feature: Feature
    let text: String

    var body: some View {
        let fields = (try? JSONSerialization.jsonObject(with: Data(text.utf8))) as? [String: Any]
        if feature.schema != nil, fields == nil {
            Text(text)
        } else {
            shown(fields ?? [:])
        }
    }

    @ViewBuilder private func shown(_ a: [String: Any]) -> some View {
        switch feature.id {
        case "ticket_route": big("Sent to our \(Self.teams[string(a["label"])] ?? string(a["label"])) team.")
        case "review_mood": big("Filed as a \(string(a["label"])) review.")
        case "receipt_fields": rows([("Shop", string(a["merchant"])), ("Date", longDate(string(a["date"]))), ("Paid", pounds(a["total"]))])
        case "invoice_total": big("Total to pay: \(pounds(a["total"]))")
        case "email_address": rows([("Name", string(a["name"])), ("Street", string(a["street"])), ("Town", string(a["city"])), ("Postcode", string(a["postcode"]))])
        case "returns_answer":
            big(a["allowed"] as? Bool == true ? "Yes, you can return it." : "No, this one can't come back.")
            Text(string(a["reply"]))
        default: big(text)
        }
    }

    private static let teams = ["billing": "billing", "delivery": "delivery", "returns": "returns", "account": "accounts", "other": "general enquiries"]

    private func big(_ words: String) -> some View {
        Text(words).font(.system(size: 24, weight: .bold)).tracking(-0.6)
    }

    private func rows(_ pairs: [(String, String)]) -> some View {
        Grid(alignment: .leading, horizontalSpacing: 10, verticalSpacing: 3) {
            ForEach(pairs, id: \.0) { name, value in
                GridRow {
                    Text(name).foregroundStyle(Color.faint)
                    Text(value.isEmpty ? "(not given)" : value).fontWeight(.medium)
                }
            }
        }
        .font(.system(size: 15))
    }

    private func string(_ value: Any?) -> String {
        value.map { "\($0)" } ?? ""
    }

    private func pounds(_ value: Any?) -> String {
        (value as? Double).map { "£\($0.formatted(.number.precision(.fractionLength(2)).grouping(.never)))" } ?? string(value)
    }
}

/// A date written 2026-11-12 as a person reads it: 12 November 2026.
func longDate(_ iso: String) -> String {
    guard let date = try? Date(iso, strategy: .iso8601.year().month().day()) else { return iso }
    return date.formatted(Date.FormatStyle(locale: Locale(identifier: "en_GB"), timeZone: .gmt).day().month(.wide).year())
}
