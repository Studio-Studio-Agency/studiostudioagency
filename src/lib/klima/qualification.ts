/**
 * Klimapartner Basel — lead qualification domain logic.
 *
 * Pure, dependency-free module: shared between the browser (chat UI progress,
 * types) and the `klima-chat` Supabase edge function.
 *
 * ⚠️  This file is mirrored verbatim at
 *     supabase/functions/_shared/klima/qualification.ts
 *     (Deno cannot import from `src/`). Keep the two copies in sync.
 */

export type Segment = "A" | "B" | "C";
export type LeadTier = "hot" | "warm" | "cold";
export type RegionCode = "BS" | "BL" | "AG" | "SO" | "other";
export type Language = "de" | "fr" | "gsw";

export interface RegionMeta {
  code: RegionCode;
  label: string;
  /** true = inside the serviced concierge area */
  serviced: boolean;
}

export const REGIONS: RegionMeta[] = [
  { code: "BS", label: "Basel-Stadt", serviced: true },
  { code: "BL", label: "Basel-Landschaft", serviced: true },
  { code: "AG", label: "Aargau", serviced: true },
  { code: "SO", label: "Solothurn", serviced: true },
  { code: "other", label: "Ausserhalb der Region", serviced: false },
];

export interface SegmentMeta {
  id: Segment;
  label: string;
  /** Qualification fields that must be present for a lead to be "complete". */
  requiredFields: string[];
  /** Nice-to-have fields that add depth (and score) but are not required. */
  bonusFields: string[];
}

export const SEGMENTS: Record<Segment, SegmentMeta> = {
  A: {
    id: "A",
    label: "Privat (Einfamilienhaus / Eigentumswohnung)",
    requiredFields: ["property_type", "ownership", "cooling_scope", "timeline", "region"],
    bonusFields: ["budget_range", "electrical_ready", "subsidy_interest", "area_m2"],
  },
  B: {
    id: "B",
    label: "Verwaltung / STWEG (Mehrfamilienhaus)",
    requiredFields: ["units_count", "current_hvac", "decision_process", "timeline", "region"],
    bonusFields: ["procurement", "budget_range", "tenant_approval"],
  },
  C: {
    id: "C",
    label: "Gewerbe (Büro / Laden / Gastro / Praxis)",
    requiredFields: ["space_type", "area_m2", "cooling_need", "timeline", "region"],
    bonusFields: ["business_hours_constraint", "budget_range", "existing_system"],
  },
};

/** A single accumulated answer bag. Values are free-form (string/number/bool);
 *  `photos` holds storage paths of uploaded room photos. */
export type Qualification = Record<string, string | number | boolean | string[] | null | undefined>;

export interface ScoreResult {
  score: number; // 0-100
  tier: LeadTier;
  completion: number; // 0-1, fraction of required fields answered
  missingRequired: string[];
  /** true once every required field for the segment is present */
  complete: boolean;
}

/** Timelines we treat as high-intent (buying signals), ordered soonest first. */
const HOT_TIMELINES = ["sofort", "asap", "diesen monat", "diese saison", "innert", "1 monat", "2 monate", "sommer"];
const WARM_TIMELINES = ["3 monate", "quartal", "halbjahr", "6 monate", "dieses jahr"];

function normalize(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function hasValue(q: Qualification, key: string): boolean {
  const v = q[key];
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

function timelineScore(q: Qualification): number {
  const t = normalize(q.timeline);
  if (!t) return 0;
  if (HOT_TIMELINES.some((k) => t.includes(k))) return 20;
  if (WARM_TIMELINES.some((k) => t.includes(k))) return 12;
  // "nur informieren" / "nächstes jahr" etc.
  if (t.includes("informier") || t.includes("nächstes jahr") || t.includes("später") || t.includes("unklar")) return 3;
  return 8;
}

function regionScore(q: Qualification): number {
  const r = normalize(q.region);
  if (!r) return 0; // not asked / not answered yet
  const meta = REGIONS.find((x) => x.code.toLowerCase() === r || normalize(x.label) === r);
  if (!meta) return 6; // provided but unrecognised free text
  return meta.serviced ? 15 : 0;
}

function decisionMakerScore(segment: Segment, q: Qualification): number {
  if (segment === "A") {
    const own = normalize(q.ownership);
    if (own.includes("eigentüm") || own.includes("eigentum")) return 15;
    if (own.includes("miet")) return 4; // tenant needs landlord sign-off
    return 0;
  }
  if (segment === "B") {
    const dp = normalize(q.decision_process);
    if (dp.includes("beschluss") || dp.includes("mandat") || dp.includes("budget freigegeben") || dp.includes("vorstand")) return 15;
    if (dp) return 7;
    return 0;
  }
  // Segment C: business owner / decision maker implied; reward budget clarity below.
  return normalize(q.budget_range) ? 10 : 4;
}

function budgetScore(q: Qualification): number {
  return normalize(q.budget_range) ? 10 : 0;
}

function contactScore(q: Qualification): number {
  // A reachable prospect is far more valuable to a partner.
  const hasEmail = normalize(q.email).includes("@");
  const hasPhone = normalize(q.phone).replace(/\D/g, "").length >= 7;
  if (hasEmail && hasPhone) return 15;
  if (hasEmail || hasPhone) return 10;
  return 0;
}

/**
 * Deterministic lead scoring. Combines completeness of the segment's required
 * fields with high-intent buying signals (timeline, decision authority,
 * serviced region, reachable contact, budget).
 */
export function scoreLead(segment: Segment | null, q: Qualification): ScoreResult {
  const meta = segment ? SEGMENTS[segment] : null;
  const required = meta?.requiredFields ?? [];
  const missingRequired = required.filter((f) => !hasValue(q, f));
  const answered = required.length - missingRequired.length;
  const completion = required.length ? answered / required.length : 0;

  if (!segment) {
    return { score: 0, tier: "cold", completion: 0, missingRequired: required, complete: false };
  }

  // Completeness contributes up to 25 pts; depth (bonus fields) up to 10.
  const completenessPts = Math.round(completion * 25);
  const bonusAnswered = meta!.bonusFields.filter((f) => hasValue(q, f)).length;
  const depthPts = Math.min(10, bonusAnswered * 4);

  const raw =
    completenessPts +
    depthPts +
    timelineScore(q) +
    regionScore(q) +
    decisionMakerScore(segment, q) +
    budgetScore(q) +
    contactScore(q);

  const score = Math.max(0, Math.min(100, raw));

  let tier: LeadTier = "cold";
  if (score >= 70) tier = "hot";
  else if (score >= 45) tier = "warm";

  // A lead out of the serviced region can never be "hot" — no partner to route to.
  const r = normalize(q.region);
  const regionMeta = REGIONS.find((x) => x.code.toLowerCase() === r || normalize(x.label) === r);
  if (regionMeta && !regionMeta.serviced && tier === "hot") tier = "warm";

  return {
    score,
    tier,
    completion,
    missingRequired,
    complete: missingRequired.length === 0,
  };
}

/** Fraction 0-1 used by the UI progress indicator. */
export function computeCompletion(segment: Segment | null, q: Qualification): number {
  return scoreLead(segment, q).completion;
}

/** Human-readable region resolution from a free-text answer. */
export function resolveRegion(text: string): RegionCode {
  const t = normalize(text);
  if (!t) return "other";
  if (t.includes("basel-stadt") || t === "bs" || t.includes("basel stadt")) return "BS";
  if (t.includes("baselland") || t.includes("basel-land") || t === "bl" || t.includes("liestal")) return "BL";
  if (t.includes("aargau") || t === "ag") return "AG";
  if (t.includes("solothurn") || t === "so") return "SO";
  // City of Basel maps to Basel-Stadt.
  if (t.includes("basel")) return "BS";
  return "other";
}
