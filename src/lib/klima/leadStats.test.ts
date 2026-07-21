import { describe, it, expect } from "vitest";
import { computeLeadStats, type KlimaLead } from "./leadStats";

function lead(overrides: Partial<KlimaLead>): KlimaLead {
  return {
    id: "l1",
    conversation_id: "c1",
    segment: "A",
    region: "BS",
    contact_name: "Test",
    email: null,
    phone: null,
    address: null,
    qualification: {},
    lead_score: 50,
    tier: "warm",
    status: "new",
    notified_at: null,
    created_at: "2026-07-20T10:00:00Z",
    updated_at: "2026-07-20T10:00:00Z",
    ...overrides,
  };
}

const NOW = new Date("2026-07-21T12:00:00Z");

describe("computeLeadStats", () => {
  it("handles the empty state", () => {
    const s = computeLeadStats([], 0, NOW);
    expect(s.total).toBe(0);
    expect(s.conversionRate).toBeNull();
    expect(s.newThisWeek).toBe(0);
  });

  it("counts tiers and week-fresh leads", () => {
    const leads = [
      lead({ id: "1", tier: "hot", created_at: "2026-07-21T08:00:00Z" }),
      lead({ id: "2", tier: "warm", created_at: "2026-07-16T08:00:00Z" }),
      lead({ id: "3", tier: "cold", created_at: "2026-07-01T08:00:00Z" }), // older than a week
    ];
    const s = computeLeadStats(leads, 10, NOW);
    expect(s.total).toBe(3);
    expect(s.hot).toBe(1);
    expect(s.warm).toBe(1);
    expect(s.cold).toBe(1);
    expect(s.newThisWeek).toBe(2);
    expect(s.conversionRate).toBeCloseTo(0.3);
  });

  it("ignores unparsable created_at for the weekly count", () => {
    const s = computeLeadStats([lead({ created_at: "not-a-date" })], 1, NOW);
    expect(s.newThisWeek).toBe(0);
    expect(s.total).toBe(1);
  });
});
