import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyDbHealth, DEGRADED_LATENCY_MS } from "./classify";
import { HealthStatus } from "@/app/generated/prisma/enums";

describe("classifyDbHealth", () => {
  it("error → DOWN", () => {
    assert.equal(
      classifyDbHealth({ latencyMs: null, error: new Error("conn refused") }),
      HealthStatus.DOWN
    );
  });

  it("latency di bawah threshold → UP", () => {
    assert.equal(classifyDbHealth({ latencyMs: 42, error: null }), HealthStatus.UP);
  });

  it("latency 0 → UP", () => {
    assert.equal(classifyDbHealth({ latencyMs: 0, error: null }), HealthStatus.UP);
  });

  it("latency tepat di threshold → DEGRADED", () => {
    assert.equal(
      classifyDbHealth({ latencyMs: DEGRADED_LATENCY_MS, error: null }),
      HealthStatus.DEGRADED
    );
  });

  it("latency di atas threshold → DEGRADED", () => {
    assert.equal(classifyDbHealth({ latencyMs: 5000, error: null }), HealthStatus.DEGRADED);
  });
});
