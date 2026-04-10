import { createAdminClient } from "../_shared/supabase.ts";

// Runs hourly. Auto-expires any pending bookings older than 24 hours that the owner never actioned.
Deno.serve(async (_req) => {
  try {
    const supabase = createAdminClient();

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from("bookings")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("created_at", cutoff.toISOString())
      .select("id");

    if (error) throw error;

    return new Response(
      JSON.stringify({ expired: data?.length ?? 0 }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});