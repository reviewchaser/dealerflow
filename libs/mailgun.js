/**
 * Email Provider Module - Server-only
 *
 * This module handles email sending with support for:
 * - Mailgun (if configured and packages installed)
 * - Nodemailer SMTP (fallback)
 * - Console logging (development fallback)
 *
 * IMPORTANT: This module should ONLY be imported from API routes,
 * never from React components. It uses server-side only features.
 */

import config from "@/config";

// Check if we're running on the server
const isServer = typeof window === "undefined";

/**
 * Get email configuration status
 * @returns {{ provider: string, configured: boolean, missing: string[] }}
 */
export function getEmailStatus() {
  const missing = [];

  // Check Mailgun config
  const hasMailgun = !!process.env.MAILGUN_API_KEY && !!process.env.MAILGUN_DOMAIN;
  if (!process.env.MAILGUN_API_KEY) missing.push("MAILGUN_API_KEY");
  if (!process.env.MAILGUN_DOMAIN) missing.push("MAILGUN_DOMAIN");

  // Check SMTP/Nodemailer config
  const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER;
  if (!hasMailgun && !hasSmtp) {
    if (!process.env.SMTP_HOST) missing.push("SMTP_HOST");
    if (!process.env.SMTP_USER) missing.push("SMTP_USER");
    if (!process.env.SMTP_PASS) missing.push("SMTP_PASS");
  }

  let provider = "none";
  if (hasMailgun) provider = "mailgun";
  else if (hasSmtp) provider = "nodemailer";
  else if (process.env.NODE_ENV === "development") provider = "console";

  return {
    provider,
    configured: hasMailgun || hasSmtp,
    missing: hasMailgun || hasSmtp ? [] : missing,
  };
}

/**
 * Send email via Mailgun (dynamically imported)
 */
async function sendViaMailgun(to, subject, text, html, replyTo) {
  // Dynamic imports to avoid bundling issues
  const formData = (await import("form-data")).default;
  const Mailgun = (await import("mailgun.js")).default;

  const mailgun = new Mailgun(formData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY,
  });

  const domain = process.env.MAILGUN_DOMAIN ||
    ((config.mailgun?.subdomain ? `${config.mailgun.subdomain}.` : "") + config.domainName);

  const fromEmail = process.env.MAILGUN_FROM || config.mailgun?.fromAdmin || `DealerFlow <noreply@${domain}>`;

  const data = {
    from: fromEmail,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
    ...(replyTo && { "h:Reply-To": replyTo }),
  };

  await mg.messages.create(domain, data);
}

/**
 * Send email via Nodemailer SMTP
 */
async function sendViaNodemailer(to, subject, text, html, replyTo) {
  const nodemailer = (await import("nodemailer")).default;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const fromEmail = process.env.SMTP_FROM || process.env.MAILGUN_FROM ||
    config.mailgun?.fromAdmin || "DealerFlow <noreply@dealerflow.app>";

  await transporter.sendMail({
    from: fromEmail,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    text,
    html,
    replyTo,
  });
}

/**
 * Log email to console (development fallback)
 */
function logToConsole(to, subject, text, html) {
  console.log("\n" + "=".repeat(60));
  console.log("EMAIL (No provider configured - dev mode)");
  console.log("=".repeat(60));
  console.log(`To: ${Array.isArray(to) ? to.join(", ") : to}`);
  console.log(`Subject: ${subject}`);
  console.log("-".repeat(60));
  console.log(text);
  console.log("=".repeat(60) + "\n");
}

/**
 * Sends an email using the configured provider.
 * Falls back gracefully if no provider is configured.
 *
 * @async
 * @param {string|string[]} to - The recipient's email address(es).
 * @param {string} subject - The subject of the email.
 * @param {string} text - The plain text content of the email.
 * @param {string} html - The HTML content of the email.
 * @param {string} [replyTo] - The email address to set as the "Reply-To" address.
 * @returns {Promise<{ success: boolean, provider: string, error?: string }>}
 */
export const sendEmail = async (to, subject, text, html, replyTo) => {
  if (!isServer) {
    throw new Error("sendEmail can only be called from server-side code");
  }

  const status = getEmailStatus();

  // Try Mailgun first
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    try {
      await sendViaMailgun(to, subject, text, html, replyTo);
      return { success: true, provider: "mailgun" };
    } catch (error) {
      console.error("[Email] Mailgun failed:", error.message);
      // Fall through to try other providers
    }
  }

  // Try Nodemailer SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      await sendViaNodemailer(to, subject, text, html, replyTo);
      return { success: true, provider: "nodemailer" };
    } catch (error) {
      console.error("[Email] Nodemailer failed:", error.message);
      // Fall through to console logging
    }
  }

  // Development fallback - log to console
  if (process.env.NODE_ENV === "development") {
    logToConsole(to, subject, text, html);
    return { success: true, provider: "console", devMode: true };
  }

  // No provider configured in production
  console.error("[Email] No email provider configured. Missing:", status.missing);
  return {
    success: false,
    provider: "none",
    error: `Email not configured. Missing: ${status.missing.join(", ")}`
  };
};

export default { sendEmail, getEmailStatus };
