import { createAdminClient } from "../_shared/supabase.ts";

//Called by the frontend to compute available time slots for a given date and barber.
Deno.serve(async (req) => {
  try {
    const { barber_id, service_id, date } = await req.json();

    if (!barber_id || !service_id || !date) {
      return new Response(
        JSON.stringify({ error: "barber_id, service_id and date are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createAdminClient();
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();

    // 1. Get service duration
    const { data: service } = await supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", service_id)
      .single();

    if (!service) throw new Error("Service not found");

    // 2. Get barber's working hours for this day
    const { data: rule } = await supabase
      .from("availability_rules")
      .select("start_time, end_time, is_working")
      .eq("barber_id", barber_id)
      .eq("day_of_week", dayOfWeek)
      .single();

    if (!rule || !rule.is_working) {
      return new Response(JSON.stringify({ slots: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Get shop buffer time
    const { data: barber } = await supabase
      .from("barbers")
      .select("shop:shops(buffer_minutes)")
      .eq("id", barber_id)
      .single();

    const bufferMinutes = barber?.shop?.buffer_minutes ?? 0;
    const slotDuration = service.duration_minutes + bufferMinutes;

    // 4. Get existing bookings for this barber on this date
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_at, end_at")
      .eq("barber_id", barber_id)
      .in("status", ["pending", "accepted"])
      .gte("start_at", dayStart.toISOString())
      .lte("start_at", dayEnd.toISOString());

    // 5. Get blocked slots for this barber on this date
    const { data: blockedSlots } = await supabase
      .from("blocked_slots")
      .select("start_at, end_at")
      .eq("barber_id", barber_id)
      .gte("start_at", dayStart.toISOString())
      .lte("end_at", dayEnd.toISOString());

    // 6. Generate all possible slots for the day
    const [startHour, startMin] = rule.start_time.split(":").map(Number);
    const [endHour, endMin] = rule.end_time.split(":").map(Number);

    const workStart = new Date(`${date}T00:00:00`);
    workStart.setHours(startHour, startMin, 0, 0);

    const workEnd = new Date(`${date}T00:00:00`);
    workEnd.setHours(endHour, endMin, 0, 0);

    const slots: string[] = [];
    const cursor = new Date(workStart);

    while (cursor.getTime() + slotDuration * 60000 <= workEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + slotDuration * 60000);

      // Check if this slot overlaps with any existing booking or block
      const isBooked = (existingBookings ?? []).some((b) => {
        const bStart = new Date(b.start_at);
        const bEnd = new Date(b.end_at);
        return cursor < bEnd && slotEnd > bStart;
      });

      const isBlocked = (blockedSlots ?? []).some((b) => {
        const bStart = new Date(b.start_at);
        const bEnd = new Date(b.end_at);
        return cursor < bEnd && slotEnd > bStart;
      });

      if (!isBooked && !isBlocked) {
        slots.push(cursor.toISOString());
      }

      cursor.setMinutes(cursor.getMinutes() + slotDuration);
    }

    return new Response(JSON.stringify({ slots }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});