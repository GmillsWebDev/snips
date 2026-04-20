import { createClient } from "npm:@supabase/supabase-js@2";

const createAdminClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
}) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY") ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Snips <onboarding@resend.dev>",
      ...options,
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend error: ${error}`);
  }
  return response.json();
};

Deno.serve(async (req) => {
  try {
    const { booking_id, email, redirect_to } = await req.json();

    if (!booking_id || !email || !redirect_to) {
      return new Response(
        JSON.stringify({ error: "booking_id, email, and redirect_to are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select(`
        id,
        start_at,
        shop:shops(name, slug),
        customer:customers(first_name, last_name),
        service:services(name)
      `)
      .eq("id", booking_id)
      .single();

    if (bookingErr || !booking) {
      throw new Error(bookingErr?.message ?? "Booking not found");
    }

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: redirect_to },
    });

    if (linkErr || !linkData) {
      throw new Error(linkErr?.message ?? "Failed to generate magic link");
    }

    const magicLink = linkData.properties?.action_link;
    if (!magicLink) throw new Error("Magic link URL not returned");

    const customerName = `${booking.customer.first_name} ${booking.customer.last_name}`;
    const formattedDate = new Date(booking.start_at).toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    await sendEmail({
      to: email,
      subject: `Manage your booking at ${booking.shop.name}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:24px;font-weight:700;letter-spacing:0.15em;color:#ffffff;text-transform:uppercase;">Snips</span>
        </td></tr>
        <tr><td style="background:#1a1a1a;border-radius:12px;padding:40px;border:1px solid #2a2a2a;">
          <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Booking confirmed</p>
          <h1 style="margin:0 0 32px;font-size:22px;color:#ffffff;font-weight:600;">You're all booked, ${customerName}.</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2a2a;margin-bottom:32px;">
            <tr><td style="padding:16px 0;border-bottom:1px solid #2a2a2a;">
              <span style="font-size:12px;color:#666;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em;">Shop</span>
              <span style="font-size:15px;color:#ffffff;">${booking.shop.name}</span>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #2a2a2a;">
              <span style="font-size:12px;color:#666;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em;">Service</span>
              <span style="font-size:15px;color:#ffffff;">${booking.service.name}</span>
            </td></tr>
            <tr><td style="padding:16px 0;">
              <span style="font-size:12px;color:#666;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em;">Date &amp; Time</span>
              <span style="font-size:15px;color:#ffffff;">${formattedDate}</span>
            </td></tr>
          </table>
          <p style="margin:0 0 20px;font-size:14px;color:#888;line-height:1.6;">Use the button below to view or manage your booking. This link is one-time use and expires in 24 hours.</p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="${magicLink}" style="display:inline-block;background:#ffffff;color:#0f0f0f;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.02em;">View my booking</a>
          </td></tr></table>
        </td></tr>
        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">If you didn't make this booking, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
