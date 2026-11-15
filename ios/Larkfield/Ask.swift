import FirebaseAILogic
import Foundation
import FoundationModels

/// Where a feature runs: the same four values the web app reads from Remote Config.
enum Mode: String, Sendable {
    case onlyInCloud = "only_in_cloud"
    case preferInCloud = "prefer_in_cloud"
    case preferOnDevice = "prefer_on_device"
    case onlyOnDevice = "only_on_device"

    var startsOnDevice: Bool { self == .preferOnDevice || self == .onlyOnDevice }
}

struct Answer: Sendable {
    let text: String
    /// Where the SDK says the answer ran.
    let onDevice: Bool
    let seconds: Double
}

let cloudModel = "gemini-3.5-flash-lite"

/// An answer in a shape known only when the app runs: the feature's own JSON schema, handed over for one request.
private struct Shaped: Generable {
    @TaskLocal static var schema = try! GenerationSchema(root: DynamicGenerationSchema(type: String.self), dependencies: [])
    static var generationSchema: GenerationSchema { schema }

    let json: String

    init(_ content: GeneratedContent) throws {
        json = content.jsonString
    }

    var generatedContent: GeneratedContent { try! GeneratedContent(json: json) }
}

/// One request, as the app sends it: Firebase AI Logic picks Apple's on-device model or the cloud model by the mode.
/// `line` is one more sentence at the end of the instruction. `steady` switches Apple's model's randomness off, so it
/// always gives its most likely answer.
func ask(_ feature: Feature, mode: Mode, input: String, line: String = "", steady: Bool = false) async throws -> Answer {
    let ai = FirebaseAI.firebaseAI(backend: .googleAI())
    let cloud = ai.geminiModel(name: cloudModel)
    let device = FirebaseAI.SystemLanguageModel.default
    let model: any FirebaseAI.LanguageModel = switch mode {
    case .onlyInCloud: cloud
    case .preferInCloud: HybridModel(primary: cloud, secondary: device)
    case .preferOnDevice: HybridModel(primary: device, secondary: cloud)
    case .onlyOnDevice: device
    }
    // A session remembers what was said, so every request gets a new one.
    let session = ai.generativeModelSession(model: model, instructions: line.isEmpty ? feature.system : "\(feature.system) \(line)")
    let options: any GenerationOptionsRepresentable = steady ? FoundationModels.GenerationOptions(sampling: .greedy) : ResponseGenerationOptions.default
    let clock = ContinuousClock()
    let started = clock.now
    let text: String, ranOn: String
    if let shape = feature.schema {
        let response = try await Shaped.$schema.withValue(shape.generationSchema()) {
            try await session.respond(to: input, generating: Shaped.self, options: options)
        }
        text = shape.inOrder(response.content.json)
        ranOn = response.rawResponse.modelVersion
    } else {
        let response = try await session.respond(to: input, options: options)
        text = response.content.trimmingCharacters(in: .whitespacesAndNewlines)
        ranOn = response.rawResponse.modelVersion
    }
    let took = clock.now - started
    return Answer(text: text, onDevice: ranOn == device._modelName, seconds: Double(took.components.seconds) + Double(took.components.attoseconds) / 1e18)
}

/// The cloud model's judgment of a batch of answers, as the grader's JSON reply.
func askGrader(system: String, prompt: String) async throws -> String {
    let verdict = Schema.object(properties: ["number": .integer(), "reason": .string(), "good": .boolean()])
    let model = FirebaseAI.firebaseAI(backend: .googleAI()).generativeModel(
        modelName: cloudModel,
        generationConfig: GenerationConfig(responseMIMEType: "application/json", responseSchema: .object(properties: ["verdicts": .array(items: verdict)])),
        systemInstruction: ModelContent(role: "system", parts: system)
    )
    return try await model.generateContent(prompt).text ?? ""
}

/// Why Apple's model can't answer here yet, when it can't.
var deviceModelWaiting: String? {
    switch FirebaseAI.SystemLanguageModel.default.availability {
    case .available: nil
    case .unavailable(.appleIntelligenceNotEnabled): "Apple Intelligence is switched off on this iPhone."
    case .unavailable(.modelNotReady): "This iPhone is still downloading its on-device model."
    case .unavailable: "This iPhone can't run Apple's on-device model."
    }
}
