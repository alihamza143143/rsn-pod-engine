// ─── Email Service ───────────────────────────────────────────────────────────
// Handles sending emails via Resend (production) or console logging (dev).

import { Resend } from 'resend';
import config from '../../config';
import logger from '../../config/logger';

let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    if (!config.resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(config.resendApiKey);
  }
  return resend;
}

export async function sendMagicLinkEmail(
  to: string,
  magicLinkUrl: string
): Promise<void> {
  const subject = 'Sign in to RSN';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px 32px;border:1px solid rgba(99,102,241,0.2);">
          <h1 style="color:#818cf8;font-size:28px;font-weight:700;margin:0 0 8px 0;text-align:center;">RSN</h1>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 32px 0;text-align:center;">Raw Speed Networking</p>
          
          <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            Click the button below to sign in to your account. This link expires in ${config.magicLinkExpiryMinutes} minutes.
          </p>
          
          <div style="text-align:center;margin:32px 0;">
            <a href="${magicLinkUrl}" 
               style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;">
              Sign In
            </a>
          </div>
          
          <p style="color:#64748b;font-size:13px;line-height:1.5;margin:24px 0 0 0;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color:#818cf8;font-size:12px;word-break:break-all;margin:8px 0 0 0;">
            ${magicLinkUrl}
          </p>
        </div>
        
        <p style="color:#475569;font-size:12px;text-align:center;margin:24px 0 0 0;">
          If you didn't request this email, you can safely ignore it.
        </p>
      </div>
    </body>
    </html>
  `;

  // Use Resend if API key is configured
  if (config.resendApiKey) {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from: config.emailFrom,
      to: [to],
      subject,
      html,
    });

    if (error) {
      logger.error({ error, to }, 'Failed to send magic link email via Resend');
      throw new Error(`Email send failed: ${error.message}`);
    }

    logger.info({ to }, 'Magic link email sent via Resend');
    return;
  }

  // Fallback: log to console in development
  logger.warn({ to, magicLinkUrl }, 'No email provider configured — magic link logged to console');
}

// ─── Session Recap Email ────────────────────────────────────────────────────

interface RecapEmailData {
  sessionTitle: string;
  peopleMet: number;
  mutualConnections: number;
  avgRating: number;
  recapUrl: string;
}

export async function sendSessionRecapEmail(
  to: string,
  displayName: string,
  data: RecapEmailData
): Promise<void> {
  const subject = `Your RSN Recap — ${data.sessionTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px 32px;border:1px solid rgba(99,102,241,0.2);">
          <h1 style="color:#818cf8;font-size:28px;font-weight:700;margin:0 0 8px 0;text-align:center;">RSN</h1>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 32px 0;text-align:center;">Session Recap</p>

          <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 8px 0;">
            Hey ${displayName},
          </p>
          <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            Thanks for joining <strong>${data.sessionTitle}</strong>! Here's a quick summary:
          </p>

          <div style="display:flex;gap:12px;margin:0 0 24px 0;">
            <div style="flex:1;text-align:center;background:rgba(99,102,241,0.1);border-radius:10px;padding:16px 8px;">
              <p style="color:#818cf8;font-size:24px;font-weight:700;margin:0;">${data.peopleMet}</p>
              <p style="color:#94a3b8;font-size:12px;margin:4px 0 0 0;">People Met</p>
            </div>
            <div style="flex:1;text-align:center;background:rgba(16,185,129,0.1);border-radius:10px;padding:16px 8px;">
              <p style="color:#10b981;font-size:24px;font-weight:700;margin:0;">${data.mutualConnections}</p>
              <p style="color:#94a3b8;font-size:12px;margin:4px 0 0 0;">Mutual Matches</p>
            </div>
            <div style="flex:1;text-align:center;background:rgba(245,158,11,0.1);border-radius:10px;padding:16px 8px;">
              <p style="color:#f59e0b;font-size:24px;font-weight:700;margin:0;">${data.avgRating.toFixed(1)}</p>
              <p style="color:#94a3b8;font-size:12px;margin:4px 0 0 0;">Avg Rating</p>
            </div>
          </div>

          <div style="text-align:center;margin:32px 0;">
            <a href="${data.recapUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;">
              View Full Recap
            </a>
          </div>
        </div>

        <p style="color:#475569;font-size:12px;text-align:center;margin:24px 0 0 0;">
          RSN — Raw Speed Networking
        </p>
      </div>
    </body>
    </html>
  `;

  if (config.resendApiKey) {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from: config.emailFrom,
      to: [to],
      subject,
      html,
    });

    if (error) {
      logger.error({ error, to }, 'Failed to send session recap email');
      return; // Non-fatal — don't throw
    }

    logger.info({ to, sessionTitle: data.sessionTitle }, 'Session recap email sent');
    return;
  }

  logger.warn({ to, sessionTitle: data.sessionTitle }, 'No email provider — recap email skipped');
}

// ─── Invite Email ───────────────────────────────────────────────────────────

interface InviteEmailData {
  inviterName: string;
  type: 'pod' | 'session' | 'platform';
  targetName?: string; // pod or session name
  inviteUrl: string;
}

export async function sendInviteEmail(
  to: string,
  data: InviteEmailData
): Promise<void> {
  const typeLabel = data.type === 'pod' ? 'a pod' : data.type === 'session' ? 'a session' : 'the platform';
  const targetLine = data.targetName ? ` — <strong>${data.targetName}</strong>` : '';

  const subject = `${data.inviterName} invited you to RSN`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;padding:40px 32px;border:1px solid rgba(99,102,241,0.2);">
          <h1 style="color:#818cf8;font-size:28px;font-weight:700;margin:0 0 8px 0;text-align:center;">RSN</h1>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 32px 0;text-align:center;">Raw Speed Networking</p>

          <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            <strong>${data.inviterName}</strong> has invited you to join ${typeLabel}${targetLine} on RSN.
          </p>

          <div style="text-align:center;margin:32px 0;">
            <a href="${data.inviteUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:10px;">
              Accept Invite
            </a>
          </div>

          <p style="color:#64748b;font-size:13px;line-height:1.5;margin:24px 0 0 0;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color:#818cf8;font-size:12px;word-break:break-all;margin:8px 0 0 0;">
            ${data.inviteUrl}
          </p>
        </div>

        <p style="color:#475569;font-size:12px;text-align:center;margin:24px 0 0 0;">
          RSN — Raw Speed Networking
        </p>
      </div>
    </body>
    </html>
  `;

  if (config.resendApiKey) {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from: config.emailFrom,
      to: [to],
      subject,
      html,
    });

    if (error) {
      logger.error({ error, to }, 'Failed to send invite email');
      return; // Non-fatal
    }

    logger.info({ to, type: data.type }, 'Invite email sent');
    return;
  }

  logger.warn({ to, type: data.type }, 'No email provider — invite email skipped');
}

// ─── Join Request Confirmation Email ────────────────────────────────────────

export async function sendJoinRequestConfirmationEmail(
  to: string,
  fullName: string
): Promise<void> {
  const subject = 'RSN — We received your request';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#ffffff;font-family:'Sora',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
        <div style="background:#ffffff;border-radius:16px;padding:40px 32px;border:1px solid #e5e7eb;">
          <h1 style="color:#1a1a2e;font-size:28px;font-weight:700;margin:0 0 8px 0;text-align:center;">RSN</h1>
          <p style="color:#9ca3af;font-size:14px;margin:0 0 32px 0;text-align:center;">Raw Speed Networking</p>

          <p style="color:#1a1a2e;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
            Hi ${fullName},
          </p>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            Thank you for requesting to join RSN. We've received your application and our team will review it shortly.
          </p>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            RSN is an invite-only community for founders, leaders, and company owners who value honesty over hype. We review every application carefully to maintain the quality of our community.
          </p>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 0 0;">
            You'll hear from us within 1-3 business days.
          </p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:24px 0 0 0;">
          RSN — Fast, focused, and human.
        </p>
      </div>
    </body>
    </html>
  `;

  if (config.resendApiKey) {
    const client = getResendClient();
    const { error } = await client.emails.send({ from: config.emailFrom, to: [to], subject, html });
    if (error) {
      logger.error({ error, to }, 'Failed to send join request confirmation email');
      return;
    }
    logger.info({ to }, 'Join request confirmation email sent');
    return;
  }

  logger.warn({ to }, 'No email provider — join request confirmation email skipped');
}

// ─── Join Request Welcome Email (Approved) ──────────────────────────────────

export async function sendJoinRequestWelcomeEmail(
  to: string,
  fullName: string,
  loginUrl: string
): Promise<void> {
  const subject = 'Welcome to RSN — You\'re in!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#ffffff;font-family:'Sora',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
        <div style="background:#ffffff;border-radius:16px;padding:40px 32px;border:1px solid #e5e7eb;">
          <h1 style="color:#1a1a2e;font-size:28px;font-weight:700;margin:0 0 8px 0;text-align:center;">RSN</h1>
          <p style="color:#9ca3af;font-size:14px;margin:0 0 32px 0;text-align:center;">Raw Speed Networking</p>

          <p style="color:#1a1a2e;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
            Hi ${fullName},
          </p>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            Great news — your request to join RSN has been <strong>approved</strong>!
          </p>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            You're now part of a community of founders, leaders, and company owners who connect with honesty and purpose. No pitching. No selling. Just real conversations.
          </p>

          <div style="text-align:center;margin:32px 0;">
            <a href="${loginUrl}"
               style="display:inline-block;background:#dc2626;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:999px;">
              Sign In to RSN
            </a>
          </div>

          <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0;">
            Your first step: sign up for a session and meet five people in focused 8-minute conversations.
          </p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:24px 0 0 0;">
          RSN — Fast, focused, and human.
        </p>
      </div>
    </body>
    </html>
  `;

  if (config.resendApiKey) {
    const client = getResendClient();
    const { error } = await client.emails.send({ from: config.emailFrom, to: [to], subject, html });
    if (error) {
      logger.error({ error, to }, 'Failed to send welcome email');
      return;
    }
    logger.info({ to }, 'Join request welcome email sent');
    return;
  }

  logger.warn({ to }, 'No email provider — welcome email skipped');
}

// ─── Join Request Decline Email ─────────────────────────────────────────────

export async function sendJoinRequestDeclineEmail(
  to: string,
  fullName: string
): Promise<void> {
  const subject = 'RSN — Update on your request';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#ffffff;font-family:'Sora',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
        <div style="background:#ffffff;border-radius:16px;padding:40px 32px;border:1px solid #e5e7eb;">
          <h1 style="color:#1a1a2e;font-size:28px;font-weight:700;margin:0 0 8px 0;text-align:center;">RSN</h1>
          <p style="color:#9ca3af;font-size:14px;margin:0 0 32px 0;text-align:center;">Raw Speed Networking</p>

          <p style="color:#1a1a2e;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
            Hi ${fullName},
          </p>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            Thank you for your interest in RSN. After reviewing your application, we're unable to offer access at this time.
          </p>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
            RSN is a curated community, and we carefully consider each application. This decision is based on our current community composition and needs.
          </p>
          <p style="color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 0 0;">
            If your circumstances change or you receive an invite from a current member, you're welcome to reapply.
          </p>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:24px 0 0 0;">
          RSN — Fast, focused, and human.
        </p>
      </div>
    </body>
    </html>
  `;

  if (config.resendApiKey) {
    const client = getResendClient();
    const { error } = await client.emails.send({ from: config.emailFrom, to: [to], subject, html });
    if (error) {
      logger.error({ error, to }, 'Failed to send decline email');
      return;
    }
    logger.info({ to }, 'Join request decline email sent');
    return;
  }

  logger.warn({ to }, 'No email provider — decline email skipped');
}
