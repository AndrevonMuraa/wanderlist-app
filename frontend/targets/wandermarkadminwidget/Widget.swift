//
//  WanderMark Admin Widget — Lock Screen + Home Screen
//  Reads moderation snapshot from App Group `group.com.wandermark.app.adminwidget`
//  written by the React Native side via `react-native-shared-group-preferences`.
//
//  Supported families:
//    Lock Screen  : .accessoryInline / .accessoryCircular / .accessoryRectangular
//    Home Screen  : .systemSmall / .systemMedium / .systemLarge
//
//  Tap behaviour: the entire widget is wrapped in a `widgetURL` that deep-links
//  back into the app at `wandermark://admin/reports?source=widget`. The router
//  (`PushTapRouter` already handles deep links) takes over from there.
//
import WidgetKit
import SwiftUI

// MARK: - Shared payload (mirrors backend `/api/admin/widget/summary`)
struct WidgetAction: Codable {
    let actor: String
    let action: String
    let created_at: String?
}

struct WidgetPayload: Codable {
    let pending_reports: Int
    let open_tickets: Int
    let recent_actions: [WidgetAction]
    let generated_at: String?
    let fetched_at_epoch: Double?

    static let placeholder = WidgetPayload(
        pending_reports: 0,
        open_tickets: 0,
        recent_actions: [
            WidgetAction(actor: "—", action: "no admin activity yet", created_at: nil)
        ],
        generated_at: nil,
        fetched_at_epoch: nil
    )

    static func load() -> WidgetPayload {
        let suite = "group.com.wandermark.app.adminwidget"
        guard let defaults = UserDefaults(suiteName: suite),
              let raw = defaults.string(forKey: "wandermark.widget.summary"),
              let data = raw.data(using: .utf8) else {
            return .placeholder
        }
        do {
            return try JSONDecoder().decode(WidgetPayload.self, from: data)
        } catch {
            return .placeholder
        }
    }

    var ageMinutes: Int? {
        guard let epoch = fetched_at_epoch else { return nil }
        let diff = Date().timeIntervalSince1970 - epoch
        return diff < 0 ? 0 : Int(diff / 60)
    }
}

// MARK: - Timeline provider
struct WMEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload
}

struct WMProvider: TimelineProvider {
    func placeholder(in context: Context) -> WMEntry {
        WMEntry(date: Date(), payload: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (WMEntry) -> Void) {
        completion(WMEntry(date: Date(), payload: WidgetPayload.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WMEntry>) -> Void) {
        let payload = WidgetPayload.load()
        let now = Date()
        // We render one entry now and ask iOS to refresh in 15 minutes; the
        // BackgroundTask in JS will have written fresh data by then.
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now.addingTimeInterval(15 * 60)
        let timeline = Timeline(
            entries: [WMEntry(date: now, payload: payload)],
            policy: .after(next)
        )
        completion(timeline)
    }
}

// MARK: - Helpers
private func deepLinkURL() -> URL {
    URL(string: "wandermark://admin/reports?source=widget")!
}

private func actionDot(_ action: String) -> String {
    let a = action.lowercased()
    if a.contains("warn") { return "⚠️" }
    if a.contains("suspend") { return "⏸" }
    if a.contains("hide") || a.contains("delete") { return "🚫" }
    if a.contains("message") { return "💬" }
    if a.contains("lockdown") { return "🔒" }
    return "•"
}

// MARK: - Lock Screen — Inline (single line of text on the lock screen)
struct InlineView: View {
    let entry: WMEntry
    var body: some View {
        let p = entry.payload.pending_reports
        let t = entry.payload.open_tickets
        Text("WM • \(p) reports • \(t) tickets")
    }
}

// MARK: - Lock Screen — Circular (small ring)
struct CircularView: View {
    let entry: WMEntry
    var body: some View {
        let p = entry.payload.pending_reports
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Image(systemName: "flag.fill")
                    .font(.system(size: 12, weight: .bold))
                Text("\(min(p, 99))")
                    .font(.system(size: 14, weight: .heavy, design: .rounded))
                    .minimumScaleFactor(0.6)
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Lock Screen — Rectangular
struct RectangularView: View {
    let entry: WMEntry
    var body: some View {
        let p = entry.payload.pending_reports
        let t = entry.payload.open_tickets
        let last = entry.payload.recent_actions.first
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 6) {
                Image(systemName: "shield.lefthalf.filled")
                    .font(.system(size: 11, weight: .bold))
                Text("WANDERMARK")
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(0.4)
            }
            HStack(spacing: 8) {
                Label("\(p)", systemImage: "flag.fill")
                Label("\(t)", systemImage: "envelope.fill")
            }
            .font(.system(size: 13, weight: .heavy, design: .rounded))
            if let last = last {
                Text("\(last.actor) \(last.action)")
                    .font(.system(size: 10))
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .opacity(0.85)
            }
        }
        .widgetAccentable()
    }
}

// MARK: - Home Screen — Small (just two big numbers)
struct SmallView: View {
    let entry: WMEntry
    var body: some View {
        let p = entry.payload.pending_reports
        let t = entry.payload.open_tickets
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "shield.lefthalf.filled")
                Text("WanderMark")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.4)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 2)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(p)")
                    .font(.system(size: 36, weight: .heavy, design: .rounded))
                    .foregroundStyle(p > 0 ? Color.red : Color.primary)
                Text("reports")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(t)")
                    .font(.system(size: 18, weight: .heavy, design: .rounded))
                    .foregroundStyle(t > 0 ? Color.orange : Color.primary)
                Text("tickets")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
    }
}

// MARK: - Home Screen — Medium (numbers + last 2 actions)
struct MediumView: View {
    let entry: WMEntry
    var body: some View {
        let p = entry.payload.pending_reports
        let t = entry.payload.open_tickets
        let actions = Array(entry.payload.recent_actions.prefix(2))
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: "shield.lefthalf.filled")
                    Text("WanderMark")
                        .font(.system(size: 11, weight: .heavy))
                        .tracking(0.4)
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 4)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(p)").font(.system(size: 32, weight: .heavy, design: .rounded))
                        .foregroundStyle(p > 0 ? Color.red : Color.primary)
                    Text("reports").font(.system(size: 11)).foregroundStyle(.secondary)
                }
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text("\(t)").font(.system(size: 18, weight: .heavy, design: .rounded))
                        .foregroundStyle(t > 0 ? Color.orange : Color.primary)
                    Text("tickets").font(.system(size: 10)).foregroundStyle(.secondary)
                }
            }
            Divider()
            VStack(alignment: .leading, spacing: 6) {
                Text("RECENT")
                    .font(.system(size: 9, weight: .heavy)).tracking(0.5)
                    .foregroundStyle(.secondary)
                ForEach(0..<actions.count, id: \.self) { i in
                    let a = actions[i]
                    Text("\(actionDot(a.action)) \(a.actor) \(a.action)")
                        .font(.system(size: 11, weight: .semibold))
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
                if actions.isEmpty {
                    Text("No admin activity yet.")
                        .font(.system(size: 11)).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                if let age = entry.payload.ageMinutes {
                    Text("updated \(age)m ago")
                        .font(.system(size: 9)).foregroundStyle(.tertiary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
    }
}

// MARK: - Home Screen — Large (full dashboard)
struct LargeView: View {
    let entry: WMEntry
    var body: some View {
        let p = entry.payload.pending_reports
        let t = entry.payload.open_tickets
        let actions = entry.payload.recent_actions
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "shield.lefthalf.filled")
                Text("WanderMark Admin")
                    .font(.system(size: 13, weight: .heavy))
                    .tracking(0.3)
                Spacer()
                if let age = entry.payload.ageMinutes {
                    Text("\(age)m ago")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
            }
            HStack(spacing: 12) {
                StatBlock(
                    label: "PENDING REPORTS",
                    value: p,
                    color: p > 0 ? Color.red : Color.primary,
                    icon: "flag.fill"
                )
                StatBlock(
                    label: "OPEN TICKETS",
                    value: t,
                    color: t > 0 ? Color.orange : Color.primary,
                    icon: "envelope.fill"
                )
            }
            Divider()
            Text("RECENT ADMIN ACTIVITY")
                .font(.system(size: 10, weight: .heavy)).tracking(0.5)
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 6) {
                ForEach(0..<actions.count, id: \.self) { i in
                    let a = actions[i]
                    HStack(spacing: 6) {
                        Text(actionDot(a.action))
                        Text(a.actor)
                            .font(.system(size: 12, weight: .heavy))
                        Text(a.action)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                }
                if actions.isEmpty {
                    Text("No admin activity yet.")
                        .font(.system(size: 12)).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(16)
    }
}

private struct StatBlock: View {
    let label: String
    let value: Int
    let color: Color
    let icon: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 5) {
                Image(systemName: icon)
                Text(label)
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(0.5)
                    .foregroundStyle(.secondary)
            }
            Text("\(value)")
                .font(.system(size: 36, weight: .heavy, design: .rounded))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.secondary.opacity(0.12))
        )
    }
}

// MARK: - Family-aware entry view
struct WMEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: WMEntry

    @ViewBuilder
    var body: some View {
        Group {
            switch family {
            case .accessoryInline:       InlineView(entry: entry)
            case .accessoryCircular:     CircularView(entry: entry)
            case .accessoryRectangular:  RectangularView(entry: entry)
            case .systemSmall:           SmallView(entry: entry)
            case .systemMedium:          MediumView(entry: entry)
            case .systemLarge:           LargeView(entry: entry)
            default:                     SmallView(entry: entry)
            }
        }
        .widgetURL(deepLinkURL())
        .containerBackground(for: .widget) {
            // Use system widget background that auto-adapts to light/dark.
            Color(uiColor: .systemBackground)
        }
    }
}

// MARK: - Widget definition
struct WanderMarkAdminWidget: Widget {
    let kind: String = "WanderMarkAdminWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WMProvider()) { entry in
            WMEntryView(entry: entry)
        }
        .configurationDisplayName("WanderMark Admin")
        .description("Live moderation queue + last admin actions on your Lock Screen and Home Screen.")
        .supportedFamilies([
            .accessoryInline,
            .accessoryCircular,
            .accessoryRectangular,
            .systemSmall,
            .systemMedium,
            .systemLarge,
        ])
    }
}

@main
struct WanderMarkAdminWidgetBundle: WidgetBundle {
    @WidgetBundleBuilder
    var body: some Widget {
        WanderMarkAdminWidget()
    }
}
