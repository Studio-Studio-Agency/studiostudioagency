import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const format = url.searchParams.get("format") || "ics";

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Find user by calendar token
  const { data: settings } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("calendar_token", token)
    .single();

  if (!settings) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Build the ICS feed URL (always https)
  const feedUrl = `${url.origin}/functions/v1/calendar-feed?token=${token}`;

  // ── .mobileconfig (Apple Configuration Profile) ──────────────────────────
  if (format === "mobileconfig") {
    const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key>
      <string>com.apple.subscribedcalendar.account</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>app.freshfreshai.calendar.subscription</string>
      <key>PayloadUUID</key>
      <string>${crypto.randomUUID()}</string>
      <key>PayloadDisplayName</key>
      <string>FreshFresh AI – Haltbarkeit</string>
      <key>SubCalAccountDescription</key>
      <string>🛒 FreshFresh AI – Haltbarkeit</string>
      <key>SubCalAccountHostName</key>
      <string>${feedUrl}</string>
      <key>SubCalAccountUseSSL</key>
      <true/>
    </dict>
  </array>
  <key>PayloadDisplayName</key>
  <string>🛒 FreshFresh AI Kalender</string>
  <key>PayloadDescription</key>
  <string>Abonniere deinen persönlichen Haltbarkeits-Kalender von FreshFresh AI.</string>
  <key>PayloadIdentifier</key>
  <string>app.freshfreshai.calendar</string>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${crypto.randomUUID()}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;

    return new Response(mobileconfig, {
      headers: {
        "Content-Type": "application/x-apple-aspen-config",
        "Content-Disposition": 'attachment; filename="freshfresh-kalender.mobileconfig"',
      },
    });
  }

  // ── ICS feed ─────────────────────────────────────────────────────────────
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", settings.user_id)
    .eq("ist_lebensmittel", true)
    .eq("is_checked", true)
    .not("ablauf_datum", "is", null);

  const formatDate = (d: string) => d.replace(/-/g, "");
  const nowStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const formatLocalDate = (dateStr: string, locale: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(locale);
    } catch {
      return dateStr;
    }
  };

  const icsEvents = (items || [])
    .map((item) => {
      const reminderDate = new Date(item.ablauf_datum);
      reminderDate.setDate(
        reminderDate.getDate() - (item.erinnerung_vor_tagen || 1)
      );
      const dateStr = formatDate(reminderDate.toISOString().split("T")[0]);
      const uid = `freshfresh-${item.id}@freshfreshai.app`;

      const kaufDatum = item.checked_at
        ? formatLocalDate(item.checked_at, "de-CH")
        : "unbekannt";
      const ablaufDatum = formatLocalDate(item.ablauf_datum, "de-CH");

      const description = [
        `Du hast ${item.menge || ""} ${item.einheit || ""} ${item.name} am ${kaufDatum} gekauft.`,
        `Ablauf ca.: ${ablaufDatum}`,
        item.lagerhinweis ? `\\n💡 ${item.lagerhinweis}` : "",
      ]
        .filter(Boolean)
        .join("\\n");

      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${nowStamp}`,
        `DTSTART;VALUE=DATE:${dateStr}`,
        `SUMMARY:⚠️ ${item.name} wird bald schlecht`,
        `DESCRIPTION:${description}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT0M",
        "ACTION:DISPLAY",
        `DESCRIPTION:⚠️ ${item.name} wird bald schlecht!`,
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FreshFresh AI//DE",
    "X-WR-CALNAME:🛒 FreshFresh AI – Haltbarkeit",
    "X-WR-TIMEZONE:Europe/Zurich",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    icsEvents,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="freshfresh.ics"',
    },
  });
});
