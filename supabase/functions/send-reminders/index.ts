// Cron: 0 7 * * * (runs daily at 7am UTC)
import { createAdminClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { bookingReminder, getSubject as getReminderSubject } from "../_templates/bookingReminder.ts";

Deno.serve(async (_req) => {
  try {
    const supabase = createAdminClient();

    const now = new Date();
    const in24hrs = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id, start_at, shop_id, customer_id,
        shop:shops(name),
        customer:customers(first_name, last_name, email),
        service:services(name)
      `)
      .eq("status", "accepted")
      .gt("start_at", now.toISOString())
      .lte("start_at", in24hrs.toISOString());

    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const booking of bookings ?? []) {
      // Skip if a reminder has already been sent for this booking
      const { data: existingLog } = await supabase
        .from("notification_log")
        .select("booking_id")
        .eq("booking_id", booking.id)
        .eq("type", "reminder")
        .maybeSingle();

      if (existingLog) {
        skipped++;
        continue;
      }

      // Skip if customer has opted out of emails
      const { data: prefs } = await supabase
        .from("customer_notification_preferences")
        .select("email_enabled")
        .eq("customer_id", booking.customer_id)
        .single();

      if (prefs?.email_enabled === false) {
        skipped++;
        continue;
      }

      const { data: branding } = await supabase
        .from("client_branding")
        .select("color_primary, color_on_primary")
        .eq("shop_id", booking.shop_id)
        .single();

      const appointmentDate = new Date(booking.start_at).toLocaleString("en-GB", {
        timeZone: "Europe/London",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const customerName = `${booking.customer.first_name} ${booking.customer.last_name}`;

      try {
        await sendEmail({
          to: booking.customer.email,
          subject: getReminderSubject({ shopName: booking.shop.name }),
          html: bookingReminder({
            shopName: booking.shop.name,
            customerName,
            serviceName: booking.service.name,
            appointmentDate,
            colorPrimary: branding?.color_primary ?? "#000000",
            colorOnPrimary: branding?.color_on_primary ?? "#ffffff",
          }),
        });

        await supabase.from("notification_log").insert({
          booking_id: booking.id,
          type: "reminder",
          channel: "email",
          status: "sent",
        });

        sent++;
      } catch (err) {
        console.error(`Reminder failed for booking ${booking.id}:`, err);
        failed++;
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
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
