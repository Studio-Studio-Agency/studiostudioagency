/**
 * Serverseitiges PostHog-Capture für die Klimapartner-Edge-Functions.
 * Ohne POSTHOG_API_KEY ein No-op; Fehler werden nur geloggt — Analytics
 * dürfen den Chat nie beeinträchtigen.
 */

export async function captureServer(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const key = Deno.env.get("POSTHOG_API_KEY");
  if (!key || !distinctId) return;
  const host = Deno.env.get("POSTHOG_HOST") || "https://eu.i.posthog.com";
  try {
    const res = await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: { ...properties, source: "klima-chat-edge" },
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) console.error("posthog capture failed:", res.status, await res.text());
  } catch (e) {
    console.error("posthog capture failed:", e);
  }
}
