/**
 * Leichtgewichtiges PostHog-Tracking für den Klimapartner-Funnel.
 *
 * Bewusst ohne posthog-js SDK: direkte Capture-HTTP-API, damit keine neue
 * Dependency nötig ist (bun.lock kann in dieser Umgebung nicht regeneriert
 * werden). EU-Host als Default. Ohne VITE_POSTHOG_KEY ist alles ein No-op —
 * Analytics dürfen die App nie beeinträchtigen.
 *
 * Funnel (distinct_id = Chat-Session-ID, client- und serverseitig identisch):
 *   klima_chat_opened → klima_message_sent → klima_segment_detected
 *     → klima_lead_qualified → klima_lead_submitted → klima_lead_notified
 * (die letzten zwei sendet die Edge-Function serverseitig)
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://eu.i.posthog.com";

export interface CapturePayload {
  api_key: string;
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

/** Reiner Payload-Bau — separat exportiert für Tests. */
export function buildCapturePayload(
  apiKey: string,
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
  now: Date = new Date(),
): CapturePayload {
  return {
    api_key: apiKey,
    event,
    distinct_id: distinctId,
    properties: { ...properties, source: "klima-chat-web" },
    timestamp: now.toISOString(),
  };
}

export function track(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): void {
  if (!KEY || !distinctId) return;
  try {
    void fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCapturePayload(KEY, event, distinctId, properties)),
      keepalive: true,
    }).catch(() => {
      /* Analytics-Fehler niemals durchreichen */
    });
  } catch {
    /* dito */
  }
}
