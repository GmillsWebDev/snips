import { createAdminClient } from "../_shared/supabase.ts";
import { sendEmail } from "../_shared/sendEmail.ts";
import { bookingAccepted, getSubject as getAcceptedSubject } from "../_templates/bookingAccepted.ts";
import { bookingRejected, getSubject as getRejectedSubject } from "../_templates/bookingRejected.ts";
import { bookingCancelled, getSubject as getCancelledSubject } from "../_templates/bookingCancelled.ts";
import { reviewInvite, getSubject as getReviewSubject } from "../_templates/reviewInvite.ts";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const booking = payload.record;
    const oldBooking = payload.old_record;

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
        shop:shops(name, owner_id),
        customer:customers(first_name, last_name, email),
        service:services(name),
        barber:barbers(name)
      `)
      .eq("id", booking.id)
      .single();

    if (error) throw error;

    const customerName = `${fullBooking.customer.first_name} ${fullBooking.customer.last_name}`;
    const shopName = fullBooking.shop.name;
    const serviceName = fullBooking.service.name;

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
      .select("email_enabled")
      .eq("customer_id", fullBooking.customer_id)
      .single();

    const { data: branding } = await supabase
      .from("client_branding")
      .select("color_primary, color_on_primary")
      .eq("shop_id", fullBooking.shop_id)
      .single();

    const colorPrimary = branding?.color_primary ?? "#000000";
    const colorOnPrimary = branding?.color_on_primary ?? "#ffffff";

    const emailEnabled = prefs?.email_enabled !== false;

    const baseParams = {
      shopName,
      customerName,
      serviceName,
      appointmentDate,
      colorPrimary,
      colorOnPrimary,
    };

    switch (booking.status) {
      case "accepted": {
        if (emailEnabled) {
          await sendEmail({
            to: fullBooking.customer.email,
            subject: getAcceptedSubject({ shopName }),
            html: bookingAccepted(baseParams),
          });
          await supabase.from("notification_log").insert({
            booking_id: booking.id,
            type: "accepted",
            channel: "email",
          });
        }
        break;
      }

      case "rejected": {
        if (emailEnabled) {
          await sendEmail({
            to: fullBooking.customer.email,
            subject: getRejectedSubject({ shopName }),
            html: bookingRejected(baseParams),
          });
          await supabase.from("notification_log").insert({
            booking_id: booking.id,
            type: "rejected",
            channel: "email",
          });
        }
        break;
      }

      case "cancelled": {
        const cancelledBy: "customer" | "shop" =
          booking.cancelled_by_role === "customer" ? "customer" : "shop";

        if (emailEnabled) {
          await sendEmail({
            to: fullBooking.customer.email,
            subject: getCancelledSubject({ shopName }),
            html: bookingCancelled({ ...baseParams, cancelledBy }),
          });
          await supabase.from("notification_log").insert({
            booking_id: booking.id,
            type: "cancelled",
            channel: "email",
          });
        }

        if (cancelledBy === "customer") {
          const { data: ownerUser } = await supabase.auth.admin.getUserById(
            fullBooking.shop.owner_id
          );
          if (ownerUser?.user?.email) {
            await sendEmail({
              to: ownerUser.user.email,
              subject: `Booking cancelled by customer — ${shopName}`,
              html: `<p><strong>${customerName}</strong> cancelled their ${serviceName} on ${appointmentDate}.</p>`,
            });
          }
        }
        break;
      }

      case "completed": {
        const reviewUrl = `${Deno.env.get("PUBLIC_APP_URL")}/review/${booking.id}`;
        if (emailEnabled) {
          await sendEmail({
            to: fullBooking.customer.email,
            subject: getReviewSubject({ shopName }),
            html: reviewInvite({ ...baseParams, reviewUrl }),
          });
          await supabase.from("notification_log").insert({
            booking_id: booking.id,
            type: "review_invite",
            channel: "email",
          });
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ skipped: true }), {
          headers: { "Content-Type": "application/json" },
        });
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
