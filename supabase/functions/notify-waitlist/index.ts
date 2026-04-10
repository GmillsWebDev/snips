import { createAdminClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/brevo.ts";

//Fires when a booking is cancelled. Finds any waitlisted customers for that slot and notifies them.
Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const booking = payload.record;
    const oldBooking = payload.old_record;

    // Only act on cancellations
    if (booking.status !== "cancelled" || oldBooking.status === "cancelled") {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createAdminClient();
    const cancelledDate = new Date(booking.start_at).toISOString().split("T")[0];

    // Find waitlisted customers for this shop/service on or before this date
    const { data: waitlistEntries } = await supabase
      .from("waitlist")
      .select(`
        id,
        customer:customers(name, email),
        service:services(name),
        shop:shops(name)
      `)
      .eq("shop_id", booking.shop_id)
      .eq("service_id", booking.service_id)
      .lte("preferred_date", cancelledDate)
      .is("notified_at", null);

    if (!waitlistEntries?.length) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let notified = 0;
    for (const entry of waitlistEntries) {
      await sendEmail({
        to: [{ email: entry.customer.email, name: entry.customer.name }],
        subject: `A slot has opened up — ${entry.shop.name}`,
        htmlContent: `
          <h2>Good news — a slot just opened! ✂️</h2>
          <p>Hi ${entry.customer.name}, a slot has become available for <strong>${entry.service.name}</strong> at ${entry.shop.name}.</p>
          <p>Book now before it's gone:</p>
          <a href="${Deno.env.get("PUBLIC_APP_URL")}/book/${booking.shop_id}">Book now</a>
        `,
      });

      await supabase
        .from("waitlist")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", entry.id);

      notified++;
    }

    return new Response(JSON.stringify({ notified }), {
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