import SwiftUI

/// The check on the phone: each feature's verdict for Apple's on-device model, as recorded and as run here.
struct CheckScreen: View {
    @State private var check = Check()
    @State private var shown: Board.Row?
    /// Started with -record: the run also answers the held-back inputs and reports to the console, for scripts/apple.ts.
    private let recording = CommandLine.arguments.contains("-record")

    var body: some View {
        let board = check.board
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 10) {
                    Text("The check").font(.system(size: 32, weight: .heavy)).tracking(-1)
                    Text("Each of the shop's eight features was sent \(board.features.first?.inputs ?? 0) inputs through Firebase AI Logic: three times to Apple's on-device model, in this app, and once to the cloud. A feature runs on the iPhone when Apple's model is wrong on at most \(board.allowed) answers in 100.")
                    if let recorded = board.recorded {
                        Text("Recorded on an \(recorded.device), iOS \(recorded.os), \(longDate(recorded.date)). The cloud's answers are the recorded ones.")
                            .font(.system(size: 13.5))
                            .foregroundStyle(Color.soft)
                    }
                }
                .padding(.top, 8)

                if let running = check.running {
                    Button("Stop · \(running.name): \(running.done) of \(running.of)") { check.stop() }.buttonStyle(Solid())
                } else {
                    Button("Run it on this iPhone") { Task { await check.run() } }.buttonStyle(Solid()).disabled(deviceModelWaiting != nil)
                }
                if let waiting = deviceModelWaiting ?? check.problem {
                    Text(waiting)
                        .font(.system(size: 15, weight: .medium))
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.notice, in: RoundedRectangle(cornerRadius: 14))
                }

                side("run on this iPhone", of: "device", in: board, tint: .device, none: "Nothing yet. At this bar, Apple's model is wrong too often on every feature.")
                side("stay in the cloud", of: "cloud", in: board, tint: .cloud, none: "Nothing has to stay here at this bar.")
                let neither = board.features.filter { $0.kind != "device" && $0.kind != "cloud" }
                if !neither.isEmpty {
                    group(neither, title: "on neither side yet", named: true, allowed: board.allowed, none: "")
                        .padding(14)
                        .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(Color.ink, lineWidth: 2))
                }

                Text("Every input and every answer, and the same check for Chrome's model, are at [device-or-cloud.web.app](https://device-or-cloud.web.app).")
                    .font(.system(size: 13.5))
                    .foregroundStyle(Color.soft)
            }
            .padding(16)
        }
        .foregroundStyle(Color.ink)
        .tint(Color.ink)
        .background(.white)
        .preferredColorScheme(.light)
        .sheet(item: $shown) { Failures(row: $0) }
        .task {
            guard recording else { return }
            await check.run(heldBack: true)
            print("RECORD done", URL.documentsDirectory.appending(path: "check.json").path)
        }
    }

    private func side(_ title: String, of kind: String, in board: Board, tint: Color, none: String) -> some View {
        group(board.features.filter { $0.kind == kind }, title: title, named: false, allowed: board.allowed, none: none)
            .padding(14)
            .background(tint, in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).strokeBorder(Color.ink, lineWidth: 2))
    }

    private func group(_ rows: [Board.Row], title: String, named: Bool, allowed: Int, none: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text("\(rows.count)").font(.system(size: 44, weight: .heavy)).tracking(-2)
                Text(title).font(.system(size: 21, weight: .bold)).tracking(-0.4)
            }
            ForEach(rows) { row in
                Button { shown = row } label: { RowCard(row: row, named: named, allowed: allowed) }
                    .buttonStyle(.plain)
                    .disabled(row.failures.isEmpty)
            }
            if rows.isEmpty { Text(none).font(.system(size: 14)) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct RowCard: View {
    let row: Board.Row
    let named: Bool
    let allowed: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text(row.name).font(.system(size: 16, weight: .semibold))
                Spacer()
                if !row.failures.isEmpty { Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.faint) }
            }
            if named { Text(row.verdict).font(.system(size: 12.5, weight: .semibold)).padding(.horizontal, 10).padding(.vertical, 5).background(Color.notice, in: Capsule()) }
            if row.kind == "pending" || row.kind == "more" {
                EmptyView()
            } else {
                Meter(who: "Apple's model", right: row.runsRight, of: row.runs, unit: " runs", allowed: allowed)
                Meter(who: "The cloud", right: row.cloudRight, of: row.inputs, unit: "", allowed: allowed)
            }
            if row.kind == "fix" { Text("Change the prompt, or don't use a model for this: work it out in code.").font(.system(size: 12.5)).foregroundStyle(Color.soft) }
            if row.mine { Text("Run on this iPhone just now").font(.system(size: 12.5)).foregroundStyle(Color.soft) }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 14))
        .contentShape(RoundedRectangle(cornerRadius: 14))
    }
}

/// One model's share of right answers, with the bar marked on it.
private struct Meter: View {
    let who: String
    let right: Int
    let of: Int
    let unit: String
    let allowed: Int

    var body: some View {
        let within = (of - right) * 100 <= allowed * of
        HStack(spacing: 10) {
            Text(who).foregroundStyle(Color.soft).frame(width: 92, alignment: .leading)
            GeometryReader { box in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color(0xe1e4da)).frame(height: 4)
                    Capsule().fill(within ? Color.ink : Color.wrong).frame(width: box.size.width * Double(right) / Double(max(of, 1)), height: 4)
                    Rectangle().fill(Color.ink).frame(width: 2, height: 12).offset(x: box.size.width * (1 - Double(allowed) / 100) - 1)
                }
                .frame(maxHeight: .infinity)
            }
            .frame(height: 12)
            (Text("\(right)").fontWeight(.bold).foregroundStyle(within ? Color.ink : Color.wrong) + Text(" of \(of)\(unit)"))
                .frame(width: 92, alignment: .trailing)
        }
        .font(.system(size: 12.5))
        .accessibilityElement(children: .combine)
    }
}

/// A feature's wrong answers: the input, what Apple's model said, what the cloud said, and why it counts as wrong.
private struct Failures: View {
    let row: Board.Row
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    ForEach(row.failures) { failure in
                        VStack(alignment: .leading, spacing: 10) {
                            Text(failure.input)
                                .font(.system(size: 13, design: .monospaced))
                                .padding(12)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(Color.wash, in: RoundedRectangle(cornerRadius: 12))
                            said("Apple's model answered", failure.answer, wrong: failure.side != "cloud")
                            if failure.side != "cloud" { Text("Wrong on \(failure.wrongRuns) of 3 runs.").font(.system(size: 12.5)).foregroundStyle(Color.soft) }
                            said("The cloud model answered", failure.cloudAnswer, wrong: failure.side != "device")
                            Text(failure.reason).font(.system(size: 14, weight: .semibold))
                            Text(failure.byCode ? "Checked by code." : "Judged by the cloud model.").font(.system(size: 12.5)).foregroundStyle(Color.soft)
                        }
                        .padding(14)
                        .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(Color.ink, lineWidth: 2))
                    }
                }
                .padding(16)
            }
            .navigationTitle(row.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { Button("Done") { dismiss() } }
        }
        .foregroundStyle(Color.ink)
        .tint(Color.ink)
        .preferredColorScheme(.light)
    }

    private func said(_ who: String, _ answer: String, wrong: Bool) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(who).font(.system(size: 12.5)).foregroundStyle(Color.soft)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Image(systemName: wrong ? "xmark.circle.fill" : "checkmark.circle.fill").foregroundStyle(wrong ? Color.wrong : Color.ink)
                Text(answer).font(.system(size: 13, design: .monospaced)).foregroundStyle(wrong ? Color.wrong : Color.ink)
            }
        }
    }
}
