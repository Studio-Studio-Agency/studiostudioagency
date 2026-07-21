/**
 * Pure helpers + types for the Klimapartner lead dashboard.
 */

import type { Segment, LeadTier } from "./qualification";

export interface KlimaLead {
  id: string;
  conversation_id: string;
  segment: Segment;
  region: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  qualification: Record<string, unknown>;
  lead_score: number;
  tier: LeadTier;
  status: "new" | "notified" | "assigned" | "won" | "lost";
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadStats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  newThisWeek: number;
  /** leads / conversations, null when there are no conversations yet */
  conversionRate: number | null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function computeLeadStats(
  leads: KlimaLead[],
  conversationCount: number,
  now: Date = new Date(),
): LeadStats {
  const weekAgo = now.getTime() - WEEK_MS;
  let hot = 0;
  let warm = 0;
  let cold = 0;
  let newThisWeek = 0;

  for (const lead of leads) {
    if (lead.tier === "hot") hot++;
    else if (lead.tier === "warm") warm++;
    else cold++;
    const created = Date.parse(lead.created_at);
    if (!Number.isNaN(created) && created >= weekAgo) newThisWeek++;
  }

  return {
    total: leads.length,
    hot,
    warm,
    cold,
    newThisWeek,
    conversionRate: conversationCount > 0 ? leads.length / conversationCount : null,
  };
}
