import { describe, expect, it } from "vitest";
import { resolveOpenTargets, shouldPrintRecipeFailure } from "../src/commands/open.js";
import type { Annotation } from "../src/types.js";

describe("resolveOpenTargets", () => {
  it("prefers an exact service id match", () => {
    const annotations = [
      annotation({ id: "svc_panel", projectPath: "/abs/panel" }),
      annotation({ id: "svc_other", projectPath: "/abs/svc_panel" })
    ];

    expect(resolveOpenTargets(annotations, "svc_panel").map((entry) => entry.id)).toEqual([
      "svc_panel"
    ]);
  });

  it("matches an exact project basename", () => {
    expect(
      resolveOpenTargets(
        [
          annotation({ id: "svc_a", projectPath: "/abs/web-app" }),
          annotation({ id: "svc_b", projectPath: "/abs/api" })
        ],
        "web-app"
      ).map((entry) => entry.id)
    ).toEqual(["svc_a"]);
  });

  it("returns all fuzzy basename matches instead of guessing", () => {
    expect(
      resolveOpenTargets(
        [
          annotation({ id: "svc_web", projectPath: "/abs/storefront-web" }),
          annotation({ id: "svc_api", projectPath: "/abs/storefront-api" })
        ],
        "storefront"
      ).map((entry) => entry.id)
    ).toEqual(["svc_web", "svc_api"]);
  });

  it("returns no match when annotations have no project name hit", () => {
    expect(resolveOpenTargets([annotation({ projectPath: "/abs/panel" })], "web-app")).toEqual([]);
  });
});

describe("shouldPrintRecipeFailure", () => {
  it("prints only when replay exits nonzero before port detection without a signal", () => {
    expect(shouldPrintRecipeFailure(42, false, false)).toBe(true);
    expect(shouldPrintRecipeFailure(0, false, false)).toBe(false);
    expect(shouldPrintRecipeFailure(1, true, false)).toBe(false);
    expect(shouldPrintRecipeFailure(1, false, true)).toBe(false);
  });
});

function annotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: "svc_panel",
    status: "stopped",
    projectPath: "/abs/panel",
    command: "npm run dev",
    port: 5173,
    url: "http://localhost:5173",
    pid: null,
    source: "human",
    note: "panel",
    branch: "main",
    kept: false,
    health: "unknown",
    startedAt: "2026-06-07T00:00:00.000Z",
    lastSeenAt: "2026-06-07T00:00:00.000Z",
    ...overrides
  };
}
