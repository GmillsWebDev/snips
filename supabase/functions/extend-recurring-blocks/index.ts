// Cron: 0 3 * * * (runs daily at 3am UTC)
import { createAdminClient } from "../_shared/supabase.ts";

type RecurrencePattern = "daily" | "weekly" | "fortnightly" | "monthly";

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function londonToUtc(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const londonHour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      hour: "2-digit",
      hour12: false,
    }).format(probe),
    10,
  );
  const offsetHours = londonHour - 12;
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hh - offsetHours, mm, 0));
}

function utcToLondonDateStr(isoStr: string): string {
  const [dd, mm, yyyy] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(isoStr))
    .split("/");
  return `${yyyy}-${mm}-${dd}`;
}

function utcToLondonTimeStr(isoStr: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoStr));
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

function computeLimitDate(endDate: string | null): Date {
  const cap = new Date();
  cap.setMonth(cap.getMonth() + 18);
  if (!endDate) return cap;
  const d = new Date(endDate + "T23:59:59");
  return d < cap ? d : cap;
}

function generateOccurrenceDates(
  pattern: RecurrencePattern,
  startDateStr: string,
  limitDate: Date,
): string[] {
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const dates: string[] = [];

  if (pattern === "daily") {
    let cur = new Date(sy, sm - 1, sd);
    while (cur <= limitDate) {
      dates.push(toDateStr(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    }
  } else if (pattern === "weekly") {
    let cur = new Date(sy, sm - 1, sd);
    while (cur <= limitDate) {
      dates.push(toDateStr(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7);
    }
  } else if (pattern === "fortnightly") {
    let cur = new Date(sy, sm - 1, sd);
    while (cur <= limitDate) {
      dates.push(toDateStr(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 14);
    }
  } else {
    // monthly: same day of month; skip months where that day doesn't exist
    let offset = 0;
    while (true) {
      const candidate = new Date(sy, sm - 1 + offset, sd);
      if (candidate > limitDate) break;
      if (candidate.getDate() === sd) dates.push(toDateStr(candidate));
      offset++;
    }
  }

  return dates;
}

function nextOccurrenceDate(pattern: RecurrencePattern, lastDateStr: string): string {
  const [ly, lm, ld] = lastDateStr.split("-").map(Number);
  if (pattern === "daily") return toDateStr(new Date(ly, lm - 1, ld + 1));
  if (pattern === "weekly") return toDateStr(new Date(ly, lm - 1, ld + 7));
  if (pattern === "fortnightly") return toDateStr(new Date(ly, lm - 1, ld + 14));
  // monthly: advance one month at a time, preserving day-of-month
  let offset = 1;
  while (true) {
    const candidate = new Date(ly, lm - 1 + offset, ld);
    if (candidate.getDate() === ld) return toDateStr(candidate);
    offset++;
  }
}

Deno.serve(async (_req) => {
  try {
    const supabase = createAdminClient();

    const { data: shops, error: shopsErr } = await supabase
      .from("shops")
      .select("id")
      .eq("is_active", true);

    if (shopsErr) throw shopsErr;
    if (!shops || shops.length === 0) {
      return new Response(JSON.stringify({ processed: 0, skipped: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let skipped = 0;

    const fourteenDaysStr = toDateStr(
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    );

    for (const shop of shops) {
      const { data: barber } = await supabase
        .from("barbers")
        .select("id")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!barber) continue;

      const { data: expiring } = await supabase
        .from("blocked_slots")
        .select("recurrence_id, recurrence_end_date, generated_until")
        .eq("barber_id", barber.id)
        .neq("recurrence_pattern", "none")
        .not("generated_until", "is", null)
        .lte("generated_until", fourteenDaysStr)
        .order("recurrence_id", { ascending: true })
        .order("generated_until", { ascending: true });

      if (!expiring || expiring.length === 0) continue;

      // Simulate DISTINCT ON (recurrence_id) and exclude intentionally-ending series
      const seen = new Set<string>();
      const series = expiring.filter((row) => {
        if (!row.recurrence_id || seen.has(row.recurrence_id)) return false;
        if (row.recurrence_end_date && row.recurrence_end_date <= row.generated_until) return false;
        seen.add(row.recurrence_id);
        return true;
      });

      for (const s of series) {
        const recurrenceId = s.recurrence_id as string;

        const [{ data: firstRow }, { data: lastRow }] = await Promise.all([
          supabase
            .from("blocked_slots")
            .select("id, start_at, end_at, recurrence_pattern, recurrence_end_date, reason")
            .eq("recurrence_id", recurrenceId)
            .eq("barber_id", barber.id)
            .order("start_at", { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("blocked_slots")
            .select("start_at")
            .eq("recurrence_id", recurrenceId)
            .eq("barber_id", barber.id)
            .order("start_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!firstRow || !lastRow) {
          skipped++;
          continue;
        }

        const pattern = firstRow.recurrence_pattern as RecurrencePattern;
        const startTime = utcToLondonTimeStr(firstRow.start_at);
        const endTime = utcToLondonTimeStr(firstRow.end_at);
        const reason = firstRow.reason ?? "";
        const endDate = firstRow.recurrence_end_date ?? null;

        const lastDateStr = utcToLondonDateStr(lastRow.start_at);
        const nextDateStr = nextOccurrenceDate(pattern, lastDateStr);
        const limitDate = computeLimitDate(endDate);

        if (new Date(nextDateStr) > limitDate) {
          skipped++;
          continue;
        }

        const dates = generateOccurrenceDates(pattern, nextDateStr, limitDate);
        if (dates.length === 0) {
          skipped++;
          continue;
        }

        const newRows = dates.map((date) => ({
          barber_id: barber.id,
          start_at: londonToUtc(date, startTime).toISOString(),
          end_at: londonToUtc(date, endTime).toISOString(),
          reason: reason || null,
          recurrence_pattern: pattern,
          recurrence_id: recurrenceId,
          recurrence_end_date: endDate,
          generated_until: null,
        }));

        const { error: insertErr } = await supabase
          .from("blocked_slots")
          .insert(newRows);

        if (insertErr) {
          console.error(`Failed to insert rows for ${recurrenceId}:`, insertErr);
          skipped++;
          continue;
        }

        // Stamp generated_until on the first row of the series with the new last occurrence date
        const newLastDate = dates[dates.length - 1];
        const { error: updateErr } = await supabase
          .from("blocked_slots")
          .update({ generated_until: newLastDate })
          .eq("id", firstRow.id);

        if (updateErr) {
          console.error(`Failed to update generated_until for ${recurrenceId}:`, updateErr);
        }

        processed++;
      }
    }

    return new Response(JSON.stringify({ processed, skipped }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
