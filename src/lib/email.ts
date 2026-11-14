import "server-only";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Email verification is enforced as soon as an email provider is configured.
 * Set REQUIRE_EMAIL_VERIFICATION=true to enforce it in local development too.
 * Without either, signups keep the pre-verification behaviour so a deployment
 * without mail credentials cannot lock new users out.
 */
export function isEmailVerificationRequired() {
  return isEmailConfigured() || process.env.REQUIRE_EMAIL_VERIFICATION === "true";
}

async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    // In development this is the fastest way to follow a verification link.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[kairos-email] ${message.subject} -> ${message.to}\n${message.text}`);
    }
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      console.error("Email delivery failed", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email delivery failed", error);
    return false;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function emailShell({ title, body, action, url }: { title: string; body: string; action: string; url: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0b0b12;color:#e8e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b12;padding:40px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#151522;border:1px solid #2a2a3d;border-radius:20px;padding:36px">
          <tr><td>
            <div style="font-size:13px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8d7cf9">Kairos</div>
            <h1 style="margin:18px 0 10px;font-size:26px;line-height:1.25;color:#f4f4fa">${escapeHtml(title)}</h1>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#a6a6bd">${body}</p>
            <a href="${escapeHtml(url)}" style="display:inline-block;background:#8d7cf9;color:#0b0b12;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:12px">${escapeHtml(action)}</a>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#75758c">If the button doesn't work, copy this link into your browser:<br><span style="color:#a6a6bd;word-break:break-all">${escapeHtml(url)}</span></p>
            <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#75758c">If you didn't request this, you can safely ignore this email.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail({ to, name, url }: { to: string; name: string; url: string }) {
  const text = `Hi ${name},\n\nVerify your Kairos email address:\n${url}\n\nThis link expires in 24 hours. If you didn't create a Kairos account, you can ignore this email.`;
  return sendEmail({
    to,
    subject: "Verify your Kairos email",
    text,
    html: emailShell({
      title: "Verify your email",
      body: `Hi ${escapeHtml(name)}, confirm this address to finish setting up your Kairos workspace. This link expires in 24 hours.`,
      action: "Verify email",
      url,
    }),
  });
}

export async function sendPasswordResetEmail({ to, name, url }: { to: string; name: string; url: string }) {
  const text = `Hi ${name},\n\nReset your Kairos password:\n${url}\n\nThis link expires in 1 hour. If you didn't ask for a reset, you can ignore this email.`;
  return sendEmail({
    to,
    subject: "Reset your Kairos password",
    text,
    html: emailShell({
      title: "Reset your password",
      body: `Hi ${escapeHtml(name)}, use the button below to choose a new password. This link expires in 1 hour.`,
      action: "Choose a new password",
      url,
    }),
  });
}
