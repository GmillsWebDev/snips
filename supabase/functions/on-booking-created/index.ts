import { createAdminClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/brevo.ts";

// Fires when a booking is inserted. Sends a confirmation email and auto-accepts if the shop has that setting enabled.
Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const booking = payload.record;

    const supabase = createAdminClient();

    // Fetch all related data we need
    const { data: fullBooking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        shop:shops(name, brand_colour, logo_url, auto_accept),
        customer:customers(name, email),
        service:services(name, duration_minutes, price_pence),
        barber:barbers(name)
      `)
      .eq("id", booking.id)
      .single();

    if (error) throw error;

    // Send confirmation email to customer
    await sendEmail({
      to: [{ email: fullBooking.customer.email, name: fullBooking.customer.name }],
      subject: `Booking request received — ${fullBooking.shop.name}`,
      htmlContent: `
        <h2>Thanks for your booking request, ${fullBooking.customer.name}!</h2>
        <p>Your booking for <strong>${fullBooking.service.name}</strong> with ${fullBooking.barber.name} is <strong>pending confirmation</strong>.</p>
        <p>Date: ${new Date(fullBooking.start_at).toLocaleString("en-GB")}</p>
        <p>We'll be in touch shortly to confirm.</p>
      `,
    });

    // Log the notification
    await supabase.from("notification_log").insert({
      booking_id: booking.id,
      type: "confirmation",
      channel: "email",
      status: "sent",
    });

    // Auto-accept if shop has it enabled
    if (fullBooking.shop.auto_accept) {
      await supabase
        .from("bookings")
        .update({ status: "accepted" })
        .eq("id", booking.id);
    } else {
      // Alert the owner about the new pending booking
      const { data: owner } = await supabase
        .from("shops")
        .select("owner_id, name")
        .eq("id", fullBooking.shop_id)
        .single();

      const { data: ownerUser } = await supabase.auth.admin.getUserById(
        owner.owner_id
      );

      if (ownerUser?.user?.email) {
        await sendEmail({
          to: [{ email: ownerUser.user.email }],
          subject: `New booking request — ${fullBooking.shop.name}`,
          htmlContent: `
            <h2>New booking request</h2>
            <p><strong>${fullBooking.customer.name}</strong> has requested a booking.</p>
            <p>Service: ${fullBooking.service.name}</p>
            <p>Date: ${new Date(fullBooking.start_at).toLocaleString("en-GB")}</p>
            <p>Log in to your dashboard to accept or reject.</p>
          `,
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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