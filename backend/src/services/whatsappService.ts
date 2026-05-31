import twilio from "twilio";
import { env } from "../config/env.js";

function getClient() {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

function cleanPhone(phone: string): string {
  const digits = phone.replace(/[^+\d]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const client = getClient();
  const cleaned = cleanPhone(to.replace("whatsapp:", ""));
  const toNumber = `whatsapp:${cleaned}`;

  try {
    console.log(`[WhatsApp] Sending to ${toNumber} from ${env.TWILIO_WHATSAPP_FROM}`);
    const msg = await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      body,
    });
    console.log(`[WhatsApp] Sent! SID: ${msg.sid}, Status: ${msg.status}`);
    return true;
  } catch (err) {
    console.error("[WhatsApp] Send failed:", err);
    return sendSMS(cleaned, body);
  }
}

export async function sendWhatsAppMedia(to: string, body: string, mediaUrl: string): Promise<boolean> {
  const client = getClient();
  const cleaned = cleanPhone(to.replace("whatsapp:", ""));
  const toNumber = `whatsapp:${cleaned}`;

  try {
    await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: toNumber,
      body,
      mediaUrl: [mediaUrl],
    });
    return true;
  } catch (err) {
    console.error("[WhatsApp] Media send failed:", err);
    return false;
  }
}

async function sendSMS(to: string, body: string): Promise<boolean> {
  const client = getClient();
  const toNumber = cleanPhone(to);

  try {
    await client.messages.create({
      from: env.TWILIO_WHATSAPP_FROM.replace("whatsapp:", ""),
      to: toNumber,
      body,
    });
    return true;
  } catch (err) {
    console.error("SMS fallback also failed:", err);
    return false;
  }
}

export function buildSOSMessage(
  patientName: string,
  latitude?: number | null,
  longitude?: number | null,
): string {
  let msg = `🚨 SOS EMERGENCY ALERT 🚨\n\n${patientName} has triggered an emergency alert and needs immediate help!`;

  if (latitude != null && longitude != null) {
    msg += `\n\n📍 Location:\nhttps://www.google.com/maps?q=${latitude},${longitude}`;
  } else {
    msg += `\n\n📍 Location: Not available`;
  }

  msg += `\n\n⏰ Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`;
  msg += `\n\nPlease respond immediately.`;

  return msg;
}
