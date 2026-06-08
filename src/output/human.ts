import type { Service } from "../types.js";

const EMPTY = "—";

export type EmptyReason = "no_services" | "filtered";

export function renderHuman(
  services: Service[],
  options: { emptyReason?: EmptyReason } = {}
): string {
  if (services.length === 0) {
    return emptyState(options.emptyReason ?? "no_services");
  }

  const running = services.filter((service) => service.status === "running");
  const notRunning = services
    .filter((service) => service.status !== "running")
    .sort((left, right) => timestamp(right.lastSeenAt) - timestamp(left.lastSeenAt));
  const groups = [
    renderGroup("Running", running),
    renderGroup("Not running", notRunning)
  ].filter((group): group is string => group !== null);

  return groups.join("\n\n");
}

function emptyState(reason: EmptyReason): string {
  if (reason === "filtered") {
    return "No services match this view. Try: localapp ls --all or localapp ls --stopped";
  }

  return 'No services registered yet. Start one with: localapp run --note "..." -- <cmd>';
}

function renderGroup(title: string, services: Service[]): string | null {
  if (services.length === 0) return null;

  const rows = services.map((service) => [
    service.port === null ? EMPTY : String(service.port),
    service.projectName ?? EMPTY,
    `${statusSymbol(service)} ${service.status}`,
    service.url ?? EMPTY,
    truncate(service.note),
    serviceTags(service)
  ]);

  const tableRows = [["PORT", "PROJECT", "STATUS", "URL", "NOTE", ""], ...rows];
  const widths = tableRows[0].map((_, index) =>
    Math.max(...tableRows.map((row) => row[index]?.length ?? 0))
  );

  return [
    title,
    ...tableRows.map((row) =>
      row
        .map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index] + 2)))
        .join("")
        .trimEnd()
    )
  ].join("\n");
}

function serviceTags(service: Service): string {
  return [
    service.duplicateOf ? "(duplicate)" : null,
    service.kept ? "(kept)" : null
  ]
    .filter((tag): tag is string => tag !== null)
    .join(" ");
}

function statusSymbol(service: Service): string {
  return service.status === "running" ? "●" : "○";
}

function timestamp(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function truncate(value: string | null, max = 40): string {
  if (!value) return EMPTY;
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
