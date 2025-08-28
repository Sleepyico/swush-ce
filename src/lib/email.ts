/*
 *   Copyright (c) 2025 Laith Alkhaddam aka Iconical or Sleepyico.
 *   All rights reserved.

 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at

 *   http://www.apache.org/licenses/LICENSE-2.0

 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import nodemailer from "nodemailer";

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL;
const SUPPORT_NAME = process.env.SUPPORT_NAME;

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmail(subject: string, contentHtml: string) {
  const bg = "#0f0d16";
  const card = "#141221";
  const text = "#e9e7f5";
  const muted = "#a39fbf";
  const primary = "#7c6cf6";
  const link = primary;

  return `
  <div style="margin:0;padding:24px;background:${bg};color:${text};font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:${card};border-radius:12px;overflow:hidden;border:1px solid #201b34;">
      <thead>
        <tr>
          <td style="padding:20px 24px;border-bottom:1px solid #201b34;">
            <div style="font-weight:700;font-size:18px;letter-spacing:0.2px;">Swush</div>
            <div style="font-size:12px;color:${muted};margin-top:4px;">${escapeHtml(
    subject
  )}</div>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:24px;line-height:1.6;color:${text};">
            ${contentHtml}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #201b34;color:${muted};font-size:12px;">
            <div>Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:${link};text-decoration:none;">${SUPPORT_EMAIL}</a></div>
            <div style="margin-top:4px;">— ${SUPPORT_NAME}</div>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>`;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}

export async function sendBanNotification(to: string, reason: string) {
  const safeReason = escapeHtml(reason).replace(/\r?\n/g, "<br/>");
  const subject = "Your account has been locked";
  const html = renderEmail(
    subject,
    `
    <p style=\"margin:0 0 12px\">Hello,</p>
    <p style=\"margin:0 0 12px\">Your account has been locked by an admin; ${safeReason}.</p>
    <p style=\"margin:0 0 12px\">If you believe this is an error, please contact our support team at <a href=\"mailto:${SUPPORT_EMAIL}\" style=\"color:#7c6cf6;text-decoration:none\">${SUPPORT_EMAIL}</a>.</p>
  `
  );
  await sendEmail(to, subject, html);
}

export async function sendBanLiftedNotification(to: string) {
  const subject = "Your account has been unlocked";
  const html = renderEmail(
    subject,
    `
    <p style=\"margin:0 0 12px\">Welcome back!</p>
    <p style=\"margin:0 0 12px\">Your account ban has been lifted and you now have full access to your account.</p>
    <p style=\"margin:0 0 12px\">We’re glad to have you back. If you have any questions or need assistance, feel free to reach out.</p>
  `
  );
  await sendEmail(to, subject, html);
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const subject = "Password reset";
  const html = renderEmail(
    subject,
    `
    <h2 style=\"margin:0 0 12px\">Reset your password 🔑</h2>
    <p style=\"margin:0 0 12px\">We received a request to reset your password. This link expires in 1 hour.</p>
    <p style=\"margin:0 0 16px\"><a href=\"${resetLink}\" style=\"background:#7c6cf6;color:#0f0d16;padding:8px 12px;border-radius:8px;text-decoration:none;font-weight:600\">Reset password</a></p>
    <p style=\"margin:0\">If you didn’t request this, you can safely ignore this email.</p>
  `
  );
  await sendEmail(to, subject, html);
}

export async function sendPasswordChangedEmail(to: string) {
  const subject = "Your password was changed";
  const html = renderEmail(
    subject,
    `
    <h2 style=\"margin:0 0 12px\">Password changed ✅</h2>
    <p style=\"margin:0 0 12px\">Your password was just updated. If this wasn’t you, contact ${SUPPORT_EMAIL} immediately.</p>
  `
  );
  await sendEmail(to, subject, html);
}

export async function sendWelcomeEmail(to: string, username?: string) {
  const safeUser = escapeHtml(username || "there");
  const subject = "Welcome to Swush ✨";
  const html = renderEmail(
    subject,
    `
    <h2 style=\"margin:0 0 12px\">Welcome, ${safeUser}!</h2>
    <p style=\"margin:0 0 12px\">We’re thrilled to have you. Your account is ready to go.</p>
    <p style=\"margin:0\">If you need anything, contact <a href=\"mailto:${SUPPORT_EMAIL}\" style=\"color:#7c6cf6;text-decoration:none\">${SUPPORT_EMAIL}</a>.</p>
  `
  );
  await sendEmail(to, subject, html);
}

export async function sendLoginAlertEmail(
  to: string,
  meta: { ip: string; userAgent: string; whenISO?: string }
) {
  const subject = "New login to your account";
  const when = meta.whenISO
    ? new Date(meta.whenISO).toUTCString()
    : new Date().toUTCString();
  const ua = escapeHtml(meta.userAgent || "unknown");
  const ip = escapeHtml(meta.ip || "unknown");
  const html = renderEmail(
    subject,
    `
    <h3 style=\"margin:0 0 12px\">New login detected</h3>
    <p style=\"margin:0 0 12px\">A new sign-in to your account just occurred.</p>
    <ul style=\"margin:0 0 12px;padding-left:18px\">
      <li><strong>IP:</strong> ${ip}</li>
      <li><strong>Device:</strong> ${ua}</li>
      <li><strong>Time (UTC):</strong> ${escapeHtml(when)}</li>
    </ul>
    <p style=\"margin:0 0 12px\">If this wasn’t you, change your password immediately and contact <a href=\"mailto:${SUPPORT_EMAIL}\" style=\"color:#7c6cf6;text-decoration:none\">${SUPPORT_EMAIL}</a>.</p>
    <p style=\"margin:0\">Additionally, you can check the Active Sessions in your settings menu, and revoke access to any unknown devices.</p>
  `
  );
  await sendEmail(to, subject, html);
}

export async function sendTwoFAEnabledEmail(to: string) {
  const subject = "2FA enabled on your account";
  const html = renderEmail(
    subject,
    `
    <p style=\"margin:0 0 12px\">You just enabled two‑factor authentication. Great choice!</p>
    <p style=\"margin:0\">If this wasn’t you, contact ${SUPPORT_EMAIL}.</p>
  `
  );
  await sendEmail(to, subject, html);
}

export async function sendTwoFADisabledEmail(to: string) {
  const subject = "2FA disabled on your account";
  const html = renderEmail(
    subject,
    `
    <p style=\"margin:0 0 12px\">Two‑factor authentication was disabled.</p>
    <p style=\"margin:0\">If this wasn’t you, secure your account and contact ${SUPPORT_EMAIL}.</p>
  `
  );
  await sendEmail(to, subject, html);
}

export async function sendLimitReachedEmail(
  to: string,
  opts: {
    limitName: string;
    details?: string;
  }
) {
  const subject = `Limit reached: ${opts.limitName}`;
  const html = renderEmail(
    subject,
    `
    <h3 style="margin:0 0 12px">You've hit a limit</h3>
    <p style="margin:0 0 12px">You’ve reached the <strong>${escapeHtml(
      opts.limitName
    )}</strong> for your account.</p>
    ${
      opts.details
        ? `<p style="margin:0 0 12px">${escapeHtml(opts.details)}</p>`
        : ""
    }
    <p style="margin:0 0 12px">If you need assistance, contact our support team at <a href="mailto:${SUPPORT_EMAIL}" style="color:#7c6cf6;text-decoration:none">${SUPPORT_EMAIL}</a>.</p>
    <p style="margin:0">You can also free up space by deleting old files or wait until your daily quota resets.</p>
    `
  );
  await sendEmail(to, subject, html);
}
