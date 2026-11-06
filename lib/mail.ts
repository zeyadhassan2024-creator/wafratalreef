import { getCloudflareContext } from "@opennextjs/cloudflare";

export type MailResult = { sent: boolean; reason?: "not_configured" | "provider_error" };

export async function notifyMeetingRequest(input: {
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  businessType: string;
  interestedProducts: string[];
}) : Promise<MailResult> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM;
  if (!apiKey || !from) return { sent: false, reason: "not_configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: ["info@wafratalreef.com"],
      subject: `New meeting request — ${input.companyName}`,
      text: [
        `Name: ${input.fullName}`,
        `Company: ${input.companyName}`,
        `Email: ${input.email}`,
        `Phone: ${input.phone}`,
        `Business type: ${input.businessType}`,
        `Products: ${input.interestedProducts.join(", ")}`,
      ].join("\n"),
    }),
  });
  return response.ok ? { sent: true } : { sent: false, reason: "provider_error" };
}
