import * as nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let lastError: string | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    lastError = `Missing SMTP env vars (host=${!!host}, user=${!!user}, pass=${!!pass})`;
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  return transporter;
}

export function getLastEmailError(): string | null {
  return lastError;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@ayphenhms.com';
  const transport = getTransporter();

  if (!transport) {
    console.log('========== EMAIL (SMTP not configured) ==========');
    console.log(`Reason: ${lastError}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('==================================================');
    return false;
  }

  try {
    const info = await transport.sendMail({ from, to, subject, html });
    lastError = null;
    console.log(`Email sent to ${to}: ${subject} (messageId=${info.messageId})`);
    return true;
  } catch (error: any) {
    const detail = `${error?.code || ''} ${error?.responseCode || ''} ${error?.message || error}`.trim();
    lastError = detail;
    console.error(`Failed to send email to ${to}: ${detail}`);
    return false;
  }
}
