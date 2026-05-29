// Direct SMTP probe — bypasses our DB and forgot-password flow so we can see
// exactly what nodemailer says about the credentials.
//
// Run with:  npm run mailtest -- to@example.com

import 'dotenv/config';
import nodemailer from 'nodemailer';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run mailtest -- recipient@example.com');
  process.exit(2);
}

const port = Number(process.env.SMTP_PORT || 587);
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  logger: true,
  debug: true,
});

console.log(`→ Connecting to ${process.env.SMTP_HOST}:${port} as ${process.env.SMTP_USER}…`);

try {
  await transport.verify();
  console.log('✓ SMTP credentials accepted by server.');
} catch (err) {
  console.error('✗ verify() failed:', err.code, err.message);
  process.exit(1);
}

try {
  const info = await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Pawsome 4 Pets — SMTP test',
    text: 'If you see this email, SMTP is working end-to-end.',
    html: '<p>If you see this email, <strong>SMTP is working end-to-end</strong>.</p>',
  });
  console.log('✓ sendMail returned:', { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, response: info.response });
} catch (err) {
  console.error('✗ sendMail failed:', err.code, err.message);
  process.exit(1);
}

process.exit(0);
