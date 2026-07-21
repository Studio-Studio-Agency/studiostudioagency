import { describe, it, expect } from "vitest";
import {
  scoreLead,
  computeCompletion,
  resolveRegion,
  SEGMENTS,
  type Qualification,
} from "./qualification";

describe("resolveRegion", () => {
  it("maps serviced regions", () => {
    expect(resolveRegion("Basel-Stadt")).toBe("BS");
    expect(resolveRegion("in Basel")).toBe("BS");
    expect(resolveRegion("Baselland")).toBe("BL");
    expect(resolveRegion("Liestal")).toBe("BL");
    expect(resolveRegion("Aargau")).toBe("AG");
    expect(resolveRegion("Solothurn")).toBe("SO");
  });

  it("returns 'other' for out-of-area / empty", () => {
    expect(resolveRegion("Zürich")).toBe("other");
    expect(resolveRegion("")).toBe("other");
  });
});

describe("scoreLead — segment A (private homeowner)", () => {
  it("scores an empty qualification as cold and incomplete", () => {
    const r = scoreLead("A", {});
    expect(r.score).toBe(0);
    expect(r.tier).toBe("cold");
    expect(r.complete).toBe(false);
    expect(r.missingRequired).toEqual(SEGMENTS.A.requiredFields);
  });

  it("scores a fully-qualified, high-intent owner as hot", () => {
    const q: Qualification = {
      property_type: "Einfamilienhaus",
      ownership: "Eigentümer",
      cooling_scope: "Wohnzimmer + 2 Schlafzimmer",
      timeline: "diese Saison",
      region: "BS",
      budget_range: "15'000-20'000 CHF",
      electrical_ready: true,
      subsidy_interest: true,
      email: "kunde@example.ch",
      phone: "079 123 45 67",
    };
    const r = scoreLead("A", q);
    expect(r.complete).toBe(true);
    expect(r.completion).toBe(1);
    expect(r.tier).toBe("hot");
    expect(r.score).toBeGreaterThanOrEqual(70);
  });

  it("treats a tenant with no timeline as lower intent than an owner", () => {
    const base: Qualification = {
      property_type: "Eigentumswohnung",
      cooling_scope: "Wohnzimmer",
      region: "BL",
    };
    const owner = scoreLead("A", { ...base, ownership: "Eigentümer", timeline: "diese Saison" });
    const tenant = scoreLead("A", { ...base, ownership: "Mieter", timeline: "nur informieren" });
    expect(owner.score).toBeGreaterThan(tenant.score);
  });
});

describe("scoreLead — region gating", () => {
  it("never marks an out-of-area lead as hot", () => {
    const q: Qualification = {
      property_type: "Einfamilienhaus",
      ownership: "Eigentümer",
      cooling_scope: "ganzes Haus",
      timeline: "sofort",
      region: "other",
      budget_range: "20'000 CHF",
      email: "x@y.ch",
      phone: "0791234567",
    };
    const r = scoreLead("A", q);
    expect(r.tier).not.toBe("hot");
  });
});

describe("scoreLead — segment C (commercial)", () => {
  it("rewards completeness and reachable contact", () => {
    const q: Qualification = {
      space_type: "Gastronomie",
      area_m2: 120,
      cooling_need: "Gastraum + Küche",
      timeline: "diesen Monat",
      region: "AG",
      budget_range: "30'000 CHF",
      email: "wirt@beiz.ch",
      phone: "0619876543",
    };
    const r = scoreLead("C", q);
    expect(r.complete).toBe(true);
    expect(r.tier === "hot" || r.tier === "warm").toBe(true);
  });
});

describe("computeCompletion", () => {
  it("returns 0 when no segment detected", () => {
    expect(computeCompletion(null, {})).toBe(0);
  });

  it("returns partial completion for partially answered required fields", () => {
    const c = computeCompletion("B", { units_count: 12, current_hvac: "keine" });
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(1);
  });
});
