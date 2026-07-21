import { describe, it, expect } from "vitest";
import { buildCapturePayload } from "./analytics";

describe("buildCapturePayload", () => {
  const NOW = new Date("2026-07-21T12:00:00Z");

  it("builds a valid PostHog capture payload", () => {
    const p = buildCapturePayload("phc_test", "klima_chat_opened", "sess-1", { foo: 1 }, NOW);
    expect(p.api_key).toBe("phc_test");
    expect(p.event).toBe("klima_chat_opened");
    expect(p.distinct_id).toBe("sess-1");
    expect(p.timestamp).toBe("2026-07-21T12:00:00.000Z");
    expect(p.properties).toEqual({ foo: 1, source: "klima-chat-web" });
  });

  it("always stamps the source property", () => {
    const p = buildCapturePayload("k", "e", "d", {}, NOW);
    expect(p.properties.source).toBe("klima-chat-web");
  });
});
