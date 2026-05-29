// SMTP mailer wrapper. Reads SMTP_* env vars; lazy-initialises the transport
// the first time sendMail is called. If SMTP_HOST is missing the wrapper is
// "unconfigured" and sendMail throws — callers should check isConfigured()
// first and fall back to console logging in dev.

import nodemailer from 'nodemailer';

let transport;

export function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER);
}

function getTransport() {
  if (transport) return transport;
  if (!isConfigured()) {
    throw new Error('SMTP is not configured (set SMTP_HOST + SMTP_USER + SMTP_PASS).');
  }
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; other ports use STARTTLS via the `secure: false` default.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transport;
}

export async function sendMail({ to, subject, text, html, from }) {
  const t = getTransport();
  const fromAddress = from || process.env.MAIL_FROM || process.env.SMTP_USER;
  return t.sendMail({ from: fromAddress, to, subject, text, html });
}

// Useful from the API health endpoint or a CLI to verify the transport works
// without actually delivering a message.
export async function verifyConnection() {
  return getTransport().verify();
}
