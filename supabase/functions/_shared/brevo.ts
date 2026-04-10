const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export interface SendEmailOptions {
  to: { email: string; name?: string }[];
  templateId?: number;
  params?: Record<string, unknown>;
  subject?: string;
  htmlContent?: string;
}

export const sendEmail = async (options: SendEmailOptions) => {
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Snips", email: "noreply@yourdomain.com" },
      ...options,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Brevo error: ${error}`);
  }

  return response.json();
};