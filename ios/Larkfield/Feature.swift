import Foundation
import FoundationModels

/// One of the shop's AI features, as `npm run ios` writes it from the web app's own list.
struct Feature: Decodable, Identifiable, Sendable {
    struct Case: Decodable, Sendable {
        let id: String
        let input: String
    }

    /// What its card in the shop starts with: the customer's text, and the line the shop puts before it, if it has one.
    struct Sample: Decodable, Sendable {
        let added: String
        let text: String
    }

    let id: String
    /// Its Remote Config parameter.
    let parameter: String
    let name: String
    /// The instruction the app sends with every request.
    let system: String
    /// The JSON shape the app asks for; none means plain text.
    let schema: Shape?
    let label: String
    let heading: String
    let button: String
    let sample: Sample
    let cases: [Case]
    let heldBack: [Case]

    static let all: [Feature] = try! JSONDecoder().decode(
        [Feature].self,
        from: Data(contentsOf: Bundle.main.url(forResource: "features", withExtension: "json")!)
    )
}

/// The part of JSON Schema the features use: an object whose fields are a string, one of a list of strings, a number or a boolean.
struct Shape: Decodable, Sendable {
    struct Field: Decodable, Sendable {
        let type: String
        let `enum`: [String]?
    }

    let properties: [String: Field]
    /// Every field, in the order the feature names them.
    let required: [String]

    func generationSchema() throws -> GenerationSchema {
        let fields = required.map { name in
            let field = properties[name]!
            let schema: DynamicGenerationSchema = switch field.type {
            case "number": .init(type: Double.self)
            case "boolean": .init(type: Bool.self)
            default: field.enum.map { .init(name: name, anyOf: $0) } ?? .init(type: String.self)
            }
            return DynamicGenerationSchema.Property(name: name, schema: schema)
        }
        return try GenerationSchema(root: .init(name: "Answer", properties: fields), dependencies: [])
    }

    /// The same answer with its fields in the feature's order, so two equal answers are the same text.
    func inOrder(_ json: String) -> String {
        guard let object = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any] else { return json }
        let fields = required.compactMap { name -> String? in
            guard let value = object[name],
                  let data = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed, .withoutEscapingSlashes]) else { return nil }
            return "\"\(name)\": \(String(decoding: data, as: UTF8.self))"
        }
        return "{\(fields.joined(separator: ", "))}"
    }
}
