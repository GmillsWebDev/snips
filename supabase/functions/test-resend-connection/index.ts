import { sendEmail } from "../_shared/sendEmail.ts";

Deno.serve(async (req) => {
  try {
    const { to_email } = await req.json();

    if (!to_email) {
      return new Response(
        JSON.stringify({ error: "to_email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await sendEmail({
      to: to_email,
      subject: "Snips — Resend connection test",
      html: "<p>Resend connection verified successfully.</p>",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
