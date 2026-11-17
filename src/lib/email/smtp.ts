import "server-only";
import nodemailer from "nodemailer";

export type AuthEmailDelivery = "sent" | "unavailable" | "failed";

interface AuthMailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  appBase: URL;
}

function getAuthMailConfig(): AuthMailConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !from || !appUrl) {
    return null;
  }

  let appBase: URL;
  try {
    appBase = new URL(appUrl);
  } catch {
    return null;
  }
  if (
    (appBase.protocol !== "https:" && appBase.protocol !== "http:") ||
    appBase.username ||
    appBase.password ||
    appBase.search ||
    appBase.hash ||
    (process.env.NODE_ENV === "production" && appBase.protocol !== "https:")
  ) {
    return null;
  }

  return { host, port, user, password, from, appBase };
}

export function createAuthLink(path: string, token: string): URL | null {
  const config = getAuthMailConfig();
  if (!config) return null;
  const link = new URL(path, config.appBase);
  link.searchParams.set("token", token);
  return link;
}

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<AuthEmailDelivery> {
  const config = getAuthMailConfig();
  if (!config) return "unavailable";

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    tls: { minVersion: "TLSv1.2" },
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  try {
    const result = await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return result.accepted.length > 0 ? "sent" : "failed";
  } catch {
    // Do not log recipient addresses, message content, or authentication tokens.
    return "failed";
  } finally {
    transporter.close();
  }
}
