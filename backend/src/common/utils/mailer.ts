import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

let resendClient: Resend | null = null;
let smtpTransporter: nodemailer.Transporter | null = null;
let lastError: string | null = null;

function getResend(): Resend | null {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resendClient = new Resend(key);
  return resendClient;
}

function getSmtpTransporter(): nodemailer.Transporter | null {
  if (smtpTransporter) return smtpTransporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  return smtpTransporter;
}

export function getLastEmailError(): string | null {
  return lastError;
}

export function getEmailProvider(): 'resend' | 'smtp' | 'none' {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
  return 'none';
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const from = process.env.EMAIL_FROM
    || process.env.SMTP_FROM
    || process.env.SMTP_USER
    || 'onboarding@resend.dev';

  const resend = getResend();
  if (resend) {
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: [to],
        subject,
        html,
      });
      if (error) {
        lastError = `Resend: ${(error as any)?.name || ''} ${(error as any)?.message || JSON.stringify(error)}`.trim();
        console.error(`Failed to send email to ${to}: ${lastError}`);
        return false;
      }
      lastError = null;
      console.log(`Email sent to ${to}: ${subject} (resend id=${data?.id})`);
      return true;
    } catch (error: any) {
      lastError = `Resend exception: ${error?.message || error}`;
      console.error(`Failed to send email to ${to}: ${lastError}`);
      return false;
    }
  }

  const transport = getSmtpTransporter();
  if (!transport) {
    lastError = 'No email provider configured (set RESEND_API_KEY or SMTP_HOST/USER/PASS)';
    console.log('========== EMAIL (no provider configured) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('====================================================');
    return false;
  }

  try {
    const info = await transport.sendMail({ from, to, subject, html });
    lastError = null;
    console.log(`Email sent to ${to}: ${subject} (smtp messageId=${info.messageId})`);
    return true;
  } catch (error: any) {
    const detail = `${error?.code || ''} ${error?.responseCode || ''} ${error?.message || error}`.trim();
    lastError = `SMTP: ${detail}`;
    console.error(`Failed to send email to ${to}: ${lastError}`);
    return false;
  }
}
