import * as nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@ayphenhms.com';
  const transport = getTransporter();

  if (!transport) {
    console.log('========== EMAIL (SMTP not configured) ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
    console.log('==================================================');
    return false;
  }

  try {
    await transport.sendMail({ from, to, subject, html });
    console.log(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}
