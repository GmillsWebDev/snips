import { createAdminClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/brevo.ts";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const booking = payload.record;
    const oldBooking = payload.old_record;

    // Only act if status actually changed
    if (booking.status === oldBooking.status) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createAdminClient();

    const { data: fullBooking, error } = await supabase
      .from("bookings")
      .select(`
        *,
        shop:shops(name, brand_colour, logo_url, owner_id),
        customer:customers(name, email),
        service:services(name),
        barber:barbers(name)
      `)
      .eq("id", booking.id)
      .single();

    if (error) throw error;

    const customerEmail = fullBooking.customer.email;
    const customerName = fullBooking.customer.name;
    const shopName = fullBooking.shop.name;
    const serviceName = fullBooking.service.name;
    const dateStr = new Date(fullBooking.start_at).toLocaleString("en-GB");

    let emailSubject = "";
    let emailHtml = "";
    let notificationType = "";

    switch (booking.status) {
      case "accepted":
        emailSubject = `Booking confirmed — ${shopName}`;
        emailHtml = `
          <h2>Your booking is confirmed! ✂️</h2>
          <p>Hi ${customerName}, your booking for <strong>${serviceName}</strong> with ${fullBooking.barber.name} has been confirmed.</p>
          <p>Date: ${dateStr}</p>
          <p>See you soon!</p>
        `;
        notificationType = "accepted";
        break;

      case "rejected":
        emailSubject = `Booking update — ${shopName}`;
        emailHtml = `
          <h2>Booking not available</h2>
          <p>Hi ${customerName}, unfortunately your booking for <strong>${serviceName}</strong> on ${dateStr} could not be confirmed.</p>
          ${booking.cancellation_reason ? `<p>Reason: ${booking.cancellation_reason}</p>` : ""}
          <p>Please visit our booking page to choose another time.</p>
        `;
        notificationType = "rejected";
        break;

      case "cancelled":
        emailSubject = `Booking cancelled — ${shopName}`;
        emailHtml = `
          <h2>Booking cancelled</h2>
          <p>Hi ${customerName}, your booking for <strong>${serviceName}</strong> on ${dateStr} has been cancelled.</p>
          ${booking.cancellation_reason ? `<p>Reason: ${booking.cancellation_reason}</p>` : ""}
        `;
        notificationType = "cancelled";

        // Also notify the owner if customer cancelled
        const { data: ownerUser } = await supabase.auth.admin.getUserById(
          fullBooking.shop.owner_id
        );
        if (ownerUser?.user?.email) {
          await sendEmail({
            to: [{ email: ownerUser.user.email }],
            subject: `Booking cancelled by customer — ${shopName}`,
            htmlContent: `
              <h2>A booking has been cancelled</h2>
              <p><strong>${customerName}</strong> cancelled their booking for ${serviceName} on ${dateStr}.</p>
            `,
          });
        }
        break;

      case "completed":
        emailSubject = `How was your visit? — ${shopName}`;
        emailHtml = `
          <h2>Thanks for visiting ${shopName}! ✂️</h2>
          <p>Hi ${customerName}, we hope you enjoyed your ${serviceName}.</p>
          <p>We'd love to hear your feedback — it only takes a minute.</p>
          <a href="${Deno.env.get("PUBLIC_APP_URL")}/review/${booking.id}">Leave a review</a>
        `;
        notificationType = "review_invite";
        break;

      default:
        return new Response(JSON.stringify({ skipped: true }), {
          headers: { "Content-Type": "application/json" },
        });
    }

    await sendEmail({
      to: [{ email: customerEmail, name: customerName }],
      subject: emailSubject,
      htmlContent: emailHtml,
    });

    await supabase.from("notification_log").insert({
      booking_id: booking.id,
      type: notificationType,
      channel: "email",
      status: "sent",
    });

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