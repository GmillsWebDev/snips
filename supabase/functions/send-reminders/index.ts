import { createAdminClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/brevo.ts";

//Runs on a cron schedule every morning at 8am. Finds all bookings in the next 24 hours and sends reminder emails.
Deno.serve(async (_req) => {
  try {
    const supabase = createAdminClient();

    const now = new Date();
    const in24hrs = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find accepted bookings starting in the next 24 hours
    // that haven't had a reminder sent yet
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id, start_at,
        shop:shops(name),
        customer:customers(name, email),
        service:services(name),
        barber:barbers(name)
      `)
      .eq("status", "accepted")
      .gte("start_at", now.toISOString())
      .lte("start_at", in24hrs.toISOString());

    if (error) throw error;

    // Filter out bookings that already have a reminder logged
    const { data: alreadySent } = await supabase
      .from("notification_log")
      .select("booking_id")
      .eq("type", "reminder")
      .in("booking_id", bookings?.map((b) => b.id) ?? []);

    const alreadySentIds = new Set(alreadySent?.map((n) => n.booking_id));
    const toRemind = (bookings ?? []).filter((b) => !alreadySentIds.has(b.id));

    let sent = 0;
    for (const booking of toRemind) {
      await sendEmail({
        to: [{ email: booking.customer.email, name: booking.customer.name }],
        subject: `Reminder: your appointment tomorrow — ${booking.shop.name}`,
        htmlContent: `
          <h2>See you tomorrow! ✂️</h2>
          <p>Hi ${booking.customer.name}, just a reminder about your appointment.</p>
          <p>Service: <strong>${booking.service.name}</strong></p>
          <p>With: ${booking.barber.name}</p>
          <p>When: ${new Date(booking.start_at).toLocaleString("en-GB")}</p>
          <p>If you need to cancel, please do so as soon as possible.</p>
        `,
      });

      await supabase.from("notification_log").insert({
        booking_id: booking.id,
        type: "reminder",
        channel: "email",
        status: "sent",
      });

      sent++;
    }

    return new Response(JSON.stringify({ sent }), {
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