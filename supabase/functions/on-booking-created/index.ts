import { createAdminClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { bookingConfirmation, getSubject as getConfirmationSubject } from "../_templates/bookingConfirmation.ts";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const booking = payload.record;

    const supabase = createAdminClient();

    const { data: fullBooking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        shop:shops(name, shop_preferences(auto_accept), owner_id),
        customer:customers(first_name, last_name, email),
        service:services(name, duration_minutes, price_pence),
        barber:barbers(name)
      `)
      .eq("id", booking.id)
      .single();

    if (error) throw error;

    const customerName = `${fullBooking.customer.first_name} ${fullBooking.customer.last_name}`;

    const appointmentDate = new Date(fullBooking.start_at).toLocaleString("en-GB", {
      timeZone: "Europe/London",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const { data: prefs } = await supabase
      .from("customer_notification_preferences")
      .select("email_confirmations")
      .eq("customer_id", fullBooking.customer_id)
      .single();

    const { data: branding } = await supabase
      .from("client_branding")
      .select("color_primary, color_on_primary")
      .eq("shop_id", fullBooking.shop_id)
      .single();

    const colorPrimary = branding?.color_primary ?? "#000000";
    const colorOnPrimary = branding?.color_on_primary ?? "#ffffff";

    if (prefs?.email_confirmations !== false) {
      await sendEmail({
        to: fullBooking.customer.email,
        subject: getConfirmationSubject({ shopName: fullBooking.shop.name }),
        html: bookingConfirmation({
          shopName: fullBooking.shop.name,
          customerName,
          serviceName: fullBooking.service.name,
          appointmentDate,
          colorPrimary,
          colorOnPrimary,
        }),
      });
    }

    await supabase.from("notification_log").insert({
      booking_id: booking.id,
      type: "confirmation",
      channel: "email",
      status: "sent",
    });

    if (fullBooking.shop.shop_preferences?.auto_accept) {
      await supabase
        .from("bookings")
        .update({ status: "accepted" })
        .eq("id", booking.id);
    } else {
      try {
        const { data: ownerUser } = await supabase.auth.admin.getUserById(
          fullBooking.shop.owner_id
        );

        if (ownerUser?.user?.email) {
          await sendEmail({
            to: ownerUser.user.email,
            subject: `New booking request — ${fullBooking.shop.name}`,
            html: `<p><strong>${customerName}</strong> has requested a booking.</p><p>Service: ${fullBooking.service.name}</p><p>Date: ${appointmentDate}</p><p>Log in to your dashboard to accept or reject.</p>`,
          });
        }
      } catch (err) {
        console.error("Owner notification failed:", err);
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
