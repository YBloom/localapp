import { describe, expect, it } from "vitest";
import { joinServices } from "../src/core/join.js";
import type { Annotation, ListeningPort } from "../src/types.js";

describe("joinServices", () => {
  it("returns running unknown services when registry is empty", () => {
    const osScan: ListeningPort[] = [
      {
        port: 5173,
        pid: 101,
        command: "node",
        user: "alice",
        projectPath: "/home/alice/Developer/web-app",
        projectName: "web-app"
      }
    ];

    expect(joinServices(osScan, [])).toEqual([
      {
        id: null,
        status: "running",
        projectPath: "/home/alice/Developer/web-app",
        projectName: "web-app",
        command: null,
        port: 5173,
        url: "http://localhost:5173",
        pid: 101,
        source: "unknown",
        note: null,
        branch: null,
        kept: false,
        health: null,
        duplicateOf: null,
        startedAt: null,
        lastSeenAt: null
      }
    ]);
  });

  it("joins annotations and emits stale annotations not seen by the OS", () => {
    const osScan: ListeningPort[] = [
      {
        port: 5173,
        pid: 101,
        command: "node",
        user: "alice",
        projectPath: "/home/alice/Developer/web-app",
        projectName: "web-app"
      }
    ];
    const annotations: Annotation[] = [
      {
        id: "svc_live",
        port: 5173,
        pid: 101,
        projectPath: "/home/alice/Developer/web-app",
        command: "npm run dev",
        source: "codex",
        note: "checkout redesign",
        branch: "feat/checkout",
        startedAt: "2026-06-07T13:00:00+08:00",
        lastSeenAt: "2026-06-07T13:08:00+08:00"
      },
      {
        id: "svc_stale",
        port: 7110,
        projectPath: "/home/alice/Developer/old-project",
        command: "npm run dev",
        source: "claude"
      }
    ];

    expect(joinServices(osScan, annotations)).toEqual([
      {
        id: "svc_live",
        status: "running",
        projectPath: "/home/alice/Developer/web-app",
        projectName: "web-app",
        command: "npm run dev",
        port: 5173,
        url: "http://localhost:5173",
        pid: 101,
        source: "codex",
        note: "checkout redesign",
        branch: "feat/checkout",
        kept: false,
        health: null,
        duplicateOf: null,
        startedAt: "2026-06-07T13:00:00+08:00",
        lastSeenAt: "2026-06-07T13:08:00+08:00"
      },
      {
        id: "svc_stale",
        status: "stale",
        projectPath: "/home/alice/Developer/old-project",
        projectName: "old-project",
        command: "npm run dev",
        port: 7110,
        url: "http://localhost:7110",
        pid: null,
        source: "claude",
        note: null,
        branch: null,
        kept: false,
        health: null,
        duplicateOf: null,
        startedAt: null,
        lastSeenAt: null
      }
    ]);
  });

  it("does not mark different commands in one project as duplicates", () => {
    const osScan: ListeningPort[] = [
      {
        port: 5173,
        pid: 101,
        command: "node",
        user: "alice",
        projectPath: "/home/alice/Developer/web-app",
        projectName: "web-app"
      },
      {
        port: 5174,
        pid: 102,
        command: "node",
        user: "alice",
        projectPath: "/home/alice/Developer/web-app",
        projectName: "web-app"
      }
    ];
    const annotations: Annotation[] = [
      { id: "svc_a", port: 5173, pid: 101, source: "codex", command: "npm run dev" },
      { id: "svc_b", port: 5174, pid: 102, source: "claude", command: "npm run api" }
    ];

    expect(joinServices(osScan, annotations)[1]?.duplicateOf).toBeNull();
  });

  it("marks later running services with the same project and command as duplicates", () => {
    const osScan: ListeningPort[] = [
      {
        port: 5173,
        pid: 101,
        command: "node",
        user: "alice",
        projectPath: "/home/alice/Developer/web-app",
        projectName: "web-app"
      },
      {
        port: 5174,
        pid: 102,
        command: "node",
        user: "alice",
        projectPath: "/home/alice/Developer/web-app",
        projectName: "web-app"
      }
    ];
    const annotations: Annotation[] = [
      { id: "svc_a", port: 5173, pid: 101, source: "codex", command: "npm run dev" },
      { id: "svc_b", port: 5174, pid: 102, source: "claude", command: "npm run dev" }
    ];

    expect(joinServices(osScan, annotations)[1]?.duplicateOf).toBe("svc_a");
  });

  it("carries kept annotations onto running services", () => {
    const osScan: ListeningPort[] = [
      {
        port: 8765,
        pid: 21416,
        command: "Python",
        user: "alice",
        projectPath: "/home/alice/Developer/panel",
        projectName: "panel"
      }
    ];
    const annotations: Annotation[] = [
      {
        id: "svc_kept",
        port: 8765,
        pid: 21416,
        source: "unknown",
        command: "python3 outputs/server.py",
        kept: true
      }
    ];

    expect(joinServices(osScan, annotations)[0]?.kept).toBe(true);
  });
});
