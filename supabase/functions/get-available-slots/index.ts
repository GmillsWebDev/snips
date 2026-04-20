import { DateTime } from "https://esm.sh/luxon@3";
import { createAdminClient } from "../_shared/supabase.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    const { barber_id, service_id, date } = await req.json();

    if (!barber_id || !service_id || !date) {
      return json({ error: "barber_id, service_id and date are required" }, 400);
    }

    const supabase = createAdminClient();

    // Use UTC noon to derive day-of-week — avoids any DST midnight edge case
    const dayOfWeek = DateTime.fromISO(`${date}T12:00:00`, { zone: "UTC" }).weekday % 7;
    // Luxon weekday: 1=Mon … 7=Sun. JS getDay(): 0=Sun … 6=Sat.
    // % 7 converts Luxon's Sunday (7) → 0, leaving Mon–Sat as 1–6.

    // 1. Service duration
    const { data: service } = await supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", service_id)
      .single();

    if (!service) return json({ error: "Service not found" }, 404);

    // 2. Barber availability rule for this day of week
    const { data: rule } = await supabase
      .from("availability_rules")
      .select("start_time, end_time, is_working")
      .eq("barber_id", barber_id)
      .eq("day_of_week", dayOfWeek)
      .single();

    if (!rule || !rule.is_working) {
      return json({ slots: [] });
    }

    // 3. Shop buffer time and timezone (via barber → shop join)
    const { data: barber } = await supabase
      .from("barbers")
      .select("shop:shops(buffer_minutes, timezone)")
      .eq("id", barber_id)
      .single();

    const bufferMinutes: number = barber?.shop?.buffer_minutes ?? 0;
    const timezone: string = barber?.shop?.timezone ?? "Europe/London";
    const slotDuration = service.duration_minutes + bufferMinutes;

    // 4. Construct work window in the shop's local timezone so that
    //    09:00 Europe/London in BST becomes 08:00 UTC, not 09:00 UTC.
    const [startHour, startMin] = rule.start_time.split(":").map(Number);
    const [endHour, endMin] = rule.end_time.split(":").map(Number);
    const [year, month, day] = date.split("-").map(Number);

    const workStart = DateTime.fromObject(
      { year, month, day, hour: startHour, minute: startMin, second: 0 },
      { zone: timezone },
    );
    const workEnd = DateTime.fromObject(
      { year, month, day, hour: endHour, minute: endMin, second: 0 },
      { zone: timezone },
    );

    // 5. Query bookings and blocked slots.
    //    Bounds span the full calendar day in the shop timezone (converted to UTC)
    //    so that events crossing UTC midnight are never missed.
    //    Blocked slots use overlap logic (start < dayEnd AND end > dayStart)
    //    rather than containment, catching blocks that extend beyond work hours.
    const dayStart = DateTime.fromObject(
      { year, month, day, hour: 0, minute: 0, second: 0 },
      { zone: timezone },
    ).toUTC().toISO() ?? "";

    const dayEnd = DateTime.fromObject(
      { year, month, day, hour: 23, minute: 59, second: 59 },
      { zone: timezone },
    ).toUTC().toISO() ?? "";

    const [{ data: existingBookings }, { data: blockedSlots }] = await Promise.all([
      supabase
        .from("bookings")
        .select("start_at, end_at")
        .eq("barber_id", barber_id)
        .in("status", ["pending", "accepted"])
        .gte("start_at", dayStart)
        .lte("start_at", dayEnd),
      supabase
        .from("blocked_slots")
        .select("start_at, end_at")
        .eq("barber_id", barber_id)
        .lt("start_at", dayEnd)   // block starts before end of day
        .gt("end_at", dayStart),  // block ends after start of day
    ]);

    // 6. Generate slots — all arithmetic in UTC milliseconds so timezone
    //    offsets are already baked in via Luxon's toMillis().
    const slotMs = slotDuration * 60 * 1000;
    const slots: string[] = [];
    let cursor = workStart;

    while (cursor.toMillis() + slotMs <= workEnd.toMillis()) {
      const slotEnd = cursor.plus({ milliseconds: slotMs });
      const cursorMs = cursor.toMillis();
      const slotEndMs = slotEnd.toMillis();

      const isBooked = (existingBookings ?? []).some((b) => {
        const bStart = DateTime.fromISO(b.start_at).toMillis();
        const bEnd = DateTime.fromISO(b.end_at).toMillis();
        return cursorMs < bEnd && slotEndMs > bStart;
      });

      const isBlocked = (blockedSlots ?? []).some((b) => {
        const bStart = DateTime.fromISO(b.start_at).toMillis();
        const bEnd = DateTime.fromISO(b.end_at).toMillis();
        return cursorMs < bEnd && slotEndMs > bStart;
      });

      if (!isBooked && !isBlocked) {
        // Return as UTC ISO — the frontend formats to local time using the shop timezone
        slots.push(cursor.toUTC().toISO() ?? "");
      }

      cursor = cursor.plus({ minutes: slotDuration });
    }

    return json({ slots });
  } catch (err) {
    console.error(err);
    return json({ error: err.message }, 500);
  }
});
