export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
}): Promise<unknown> => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Snips <onboarding@resend.dev>",
      ...options,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend error: ${text}`);
  }
  return response.json();
};
