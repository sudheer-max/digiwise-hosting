import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

let transporter: nodemailer.Transporter | null = null;

function decrypt(encryptedText: string): string {
  const key = process.env.JWT_SECRET || 'dev-secret';
  const hash = crypto.createHash('sha256').update(key).digest();
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', hash, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function getUserTransporter(userId: string): Promise<nodemailer.Transporter | null> {
  try {
    const cfg = await prisma.emailConfig.findUnique({ where: { userId } });
    if (!cfg) return null;
    const pass = decrypt(cfg.password);
    return nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.email, pass },
    });
  } catch {
    return null;
  }
}

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const useMock = config.smtp.mock;
  if (useMock) {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  const hasAuth = !!(config.smtp.user && config.smtp.pass);
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    ignoreTLS: config.smtp.port === 25 && !config.smtp.secure,
    ...(hasAuth ? { auth: { user: config.smtp.user, pass: config.smtp.pass } } : {}),
  });

  return transporter;
}

function buildHostingConfirmationEmail(params: {
  clientName: string;
  email: string;
  planName: string;
  orderId: string;
  linodeIp?: string;
  linodeUser?: string;
  linodePass?: string;
  databaseUrl?: string;
  subdomain?: string;
  adminUrl?: string;
  adminEmail?: string;
  adminPassword?: string;
  apiDocsUrl?: string;
  domains?: string[];
}): { subject: string; html: string } {
  const domains = params.domains?.length
    ? params.domains.map(d => `<li>${d}</li>`).join('')
    : '<li>Domain configuration pending</li>';

  const subject = `[DigiWise Hosting] Your ${params.planName} infrastructure is ready — Order #${params.orderId}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f6f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f6f9; padding: 40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
        
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #00459c 0%, #002866 100%); padding: 40px 32px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px; letter-spacing: -0.5px;">🚀 Deployment Successful</h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">Your infrastructure is live and ready</p>
          </td>
        </tr>

        <!-- Intro -->
        <tr><td style="padding: 32px 32px 0;">
          <p style="font-size: 15px; color: #1a1a2e; margin: 0 0 4px;">Hello <strong>${params.clientName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; margin: 0 0 16px;">
            Your <strong>${params.planName}</strong> has been provisioned successfully. Below are your server credentials and configuration details.
          </p>
        </td></tr>

        <!-- Order Info -->
        <tr><td style="padding: 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; padding: 20px;">
            <tr><td style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 12px;">Order Summary</td></tr>
            <tr><td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="font-size: 13px; color: #64748b; padding: 4px 0;">Order ID</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right;">#${params.orderId}</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 4px 0;">Plan</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right;">${params.planName}</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 4px 0;">Status</td><td style="font-size: 13px; color: #059669; font-weight: 600; text-align: right;">Active ✓</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Server Credentials -->
        ${params.linodeIp ? `
        <tr><td style="padding: 24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; padding: 20px;">
            <tr><td style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 12px;">Server Credentials</td></tr>
            <tr><td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="font-size: 13px; color: #64748b; padding: 4px 0;">IP Address</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; font-family: monospace;">${params.linodeIp}</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 4px 0;">SSH User</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; font-family: monospace;">${params.linodeUser || 'root'}</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 4px 0;">SSH Password</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; font-family: monospace;">${params.linodePass || 'Set via Linode Cloud Manager'}</td></tr>
              </table>
            </td></tr>
            <tr><td style="padding-top: 12px; font-size: 12px; color: #94a3b8;"><em>Connect: ssh root@${params.linodeIp}</em></td></tr>
          </table>
        </td></tr>` : ''}

        <!-- Preview URL -->
        ${params.subdomain ? `
        <tr><td style="padding: 24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f0f9ff; border-radius: 12px; padding: 20px; border: 1px solid #bae6fd;">
            <tr><td style="font-size: 11px; color: #0284c7; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px;">🌐 Website URL</td></tr>
            <tr><td style="font-size: 14px; color: #0369a1; font-weight: 700; font-family: monospace;">
              <a href="https://${params.subdomain}.digiwisesoftech.com" style="color: #00459c; text-decoration: none;">
                https://${params.subdomain}.digiwisesoftech.com
              </a>
            </td></tr>
          </table>
        </td></tr>` : ''}

        <!-- Admin Panel -->
        ${params.adminUrl ? `
        <tr><td style="padding: 24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; padding: 20px;">
            <tr><td style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 12px;">Admin Dashboard</td></tr>
            <tr><td style="padding: 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="font-size: 13px; color: #64748b; padding: 4px 0;">URL</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; font-family: monospace;"><a href="${params.adminUrl}" style="color: #00459c;">${params.adminUrl}</a></td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 4px 0;">Email</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; font-family: monospace;">${params.adminEmail}</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 4px 0;">Password</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; font-family: monospace;">${params.adminPassword}</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>` : ''}

        <!-- Database -->
        ${params.databaseUrl ? `
        <tr><td style="padding: 24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; padding: 20px;">
            <tr><td style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 12px;">Database Connection</td></tr>
            <tr><td style="font-size: 12px; color: #1a1a2e; font-family: monospace; word-break: break-all;">${params.databaseUrl}</td></tr>
          </table>
        </td></tr>` : ''}

        <!-- API Docs -->
        ${params.apiDocsUrl ? `
        <tr><td style="padding: 24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; padding: 20px;">
            <tr><td style="font-size: 13px; color: #1a1a2e;">
              📚 API Documentation: <a href="${params.apiDocsUrl}" style="color: #00459c;">${params.apiDocsUrl}</a>
            </td></tr>
          </table>
        </td></tr>` : ''}

        <!-- Domains -->
        <tr><td style="padding: 24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; padding: 20px;">
            <tr><td style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 8px;">Registered Domains</td></tr>
            <tr><td><ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1a1a2e;">${domains}</ul></td></tr>
            <tr><td style="font-size: 12px; color: #64748b; padding-top: 8px;">
              ⏱ DNS propagation typically takes 15-30 minutes. Point your domain's CNAME to <strong>digiwisesoftech.com</strong>.
            </td></tr>
          </table>
        </td></tr>

        <!-- Next Steps -->
        <tr><td style="padding: 24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
            <tr><td style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 12px;">Next Steps</td></tr>
            <tr><td style="padding: 0;">
              <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 2;">
                <li><strong>Visit your website</strong> — Go to the preview URL above to see your live site</li>
                <li><strong>Access the admin panel</strong> — Log in with the credentials above to manage content</li>
                <li><strong>Connect a custom domain</strong> — Update your DNS CNAME record to <strong>digiwisesoftech.com</strong></li>
                <li><strong>Configure SSL</strong> — SSL is auto-provisioned via Let's Encrypt within minutes</li>
              </ol>
            </td></tr>
          </table>
        </td></tr>

        <!-- Support -->
        <tr><td style="padding: 0 32px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #002866 0%, #00459c 100%); border-radius: 12px; padding: 24px; text-align: center;">
            <tr><td style="font-size: 14px; color: #ffffff; font-weight: 700; padding-bottom: 4px;">24/7 Priority Support</td></tr>
            <tr><td style="font-size: 13px; color: rgba(255,255,255,0.85);">
              Need help? Reply to this email or contact our Tier-3 engineering team at <strong style="color: #ffffff;">support@digiwisesoftech.com</strong>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            DigiWise Softech — <a href="https://digiwisesoftech.com" style="color: #00459c; text-decoration: none;">digiwisesoftech.com</a><br>
            This is an automated message. Please do not reply directly.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

export async function sendHostingConfirmation(params: {
  clientName: string;
  email: string;
  planName: string;
  orderId: string;
  linodeIp?: string;
  linodeUser?: string;
  linodePass?: string;
  databaseUrl?: string;
  subdomain?: string;
  adminUrl?: string;
  adminEmail?: string;
  adminPassword?: string;
  apiDocsUrl?: string;
  domains?: string[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { subject, html } = buildHostingConfirmationEmail(params);
    const transport = getTransporter();

    const info = await transport.sendMail({
      from: `"DigiWise Hosting" <${config.smtp.from}>`,
      to: params.email,
      subject,
      html,
    });

    console.log(`[Email] Sent hosting confirmation to ${params.email} — ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${params.email}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendInvoiceEmail(params: {
  email: string;
  name: string;
  planName: string;
  billing: string;
  monthlyPrice: number;
  months: number;
  totalAmount: number;
  orderId: string;
  paymentId: string;
  date: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { success: false, error: 'RESEND_API_KEY not set' };
    }

    const { Resend } = await import('resend');
    const resend = new Resend(resendApiKey);

    const billingLabel = params.billing === 'monthly' ? 'Monthly' : params.billing === 'yearly' ? '12 Months' : '24 Months';
    const savings = params.monthlyPrice * params.months > params.totalAmount
      ? (params.monthlyPrice * params.months - params.totalAmount)
      : 0;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f6f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f4f6f9; padding: 40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

        <tr>
          <td style="background: linear-gradient(135deg, #00459c 0%, #002866 100%); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 4px;">DigiWise Hosting</h1>
            <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Payment Invoice</p>
          </td>
        </tr>

        <tr><td style="padding: 32px;">
          <p style="font-size: 14px; color: #475569; margin: 0 0 24px;">
            Hello <strong>${params.name}</strong>, your payment has been received successfully.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
            <tr><td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td colspan="2" style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">Invoice Details</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 10px 0 0;">Invoice Number</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; padding: 10px 0 0;">#${params.orderId}</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 10px 0 0;">Date</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; padding: 10px 0 0;">${params.date}</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 10px 0 0;">Payment ID</td><td style="font-size: 12px; color: #1a1a2e; font-weight: 600; text-align: right; padding: 10px 0 0; font-family: monospace;">${params.paymentId}</td></tr>
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
            <tr><td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td colspan="2" style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">Plan Details</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 10px 0 0;">Plan</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; padding: 10px 0 0;">${params.planName}</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 10px 0 0;">Billing Cycle</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; padding: 10px 0 0;">${billingLabel}</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 10px 0 0;">Monthly Rate</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; padding: 10px 0 0;">₹${params.monthlyPrice.toLocaleString('en-IN')}/mo</td></tr>
                <tr><td style="font-size: 13px; color: #64748b; padding: 10px 0 0;">Duration</td><td style="font-size: 13px; color: #1a1a2e; font-weight: 600; text-align: right; padding: 10px 0 0;">${params.months} month${params.months > 1 ? 's' : ''}</td></tr>
                ${savings > 0 ? `<tr><td style="font-size: 13px; color: #059669; padding: 10px 0 0;">Savings</td><td style="font-size: 13px; color: #059669; font-weight: 600; text-align: right; padding: 10px 0 0;">-₹${savings.toLocaleString('en-IN')}</td></tr>` : ''}
              </table>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; background: linear-gradient(135deg, #002866 0%, #00459c 100%); border-radius: 12px; padding: 24px;">
            <tr><td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="font-size: 14px; color: rgba(255,255,255,0.8); font-weight: 600;">Total Paid</td><td style="font-size: 24px; color: #ffffff; font-weight: 800; text-align: right;">₹${params.totalAmount.toLocaleString('en-IN')}</td></tr>
              </table>
            </td></tr>
          </table>

          <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0; text-align: center;">
            This is a computer-generated invoice. For questions, contact support@digiwisesoftech.com
          </p>
        </td></tr>

        <tr><td style="background: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            DigiWise Softech — <a href="https://digiwisesoftech.com" style="color: #00459c;">digiwisesoftech.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const fromEmail = process.env.SMTP_FROM || 'noreply@digiwisesoftech.com';
    await resend.emails.send({
      from: fromEmail,
      to: params.email,
      subject: `[DigiWise Hosting] Invoice #${params.orderId} — ${params.planName}`,
      html,
    });

    console.log(`[Email] Sent invoice to ${params.email} — Order #${params.orderId}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] Failed to send invoice to ${params.email}:`, err.message);
    return { success: false, error: err.message };
  }
}
