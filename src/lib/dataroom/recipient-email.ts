/**
 * Sends a magic-link OTP to a recipient's email.
 * Uses the same SendGrid pipeline as the owner magic-link flow.
 */
import sendgrid from "@sendgrid/mail";

type SendResult =
  | { delivery: "sendgrid" }
  | { delivery: "local"; debugCode: string };

const isSendgridConfigured = () =>
  Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);

const buildHtmlEmail = (code: string, roomName: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden">
        <tr><td style="padding:32px 32px 24px">
          <div style="font-size:15px;font-weight:700;letter-spacing:-0.02em;color:#18181b">Token</div>
        </td></tr>
        <tr><td style="padding:0 32px">
          <div style="font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.03em">Access your shared room</div>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#71717a">
            Enter this code to access <strong>${roomName}</strong>.
            It expires in 10 minutes.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <div style="background:#f4f4f5;border-radius:8px;padding:16px;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#18181b;font-family:'SF Mono',SFMono-Regular,Menlo,monospace">${code}</div>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa">
            If you didn't request access, you can safely ignore this email. No action is needed.
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;text-align:center">Token · Secure document sharing</p>
    </td></tr>
  </table>
</body>
</html>`;

export const sendRecipientMagicCode = async (
  email: string,
  code: string,
  roomName: string,
): Promise<SendResult> => {
  if (!isSendgridConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Token] email not configured — local OTP for ${email} (${roomName})`);
    }
    return { delivery: "local", debugCode: code };
  }

  sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

  await sendgrid.send({
    to: email,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL!,
      name: "Token",
    },
    subject: `Your access code for ${roomName}`,
    text: `Your Token access code is ${code}. It expires in 10 minutes. If you didn't request access, ignore this email.`,
    html: buildHtmlEmail(code, roomName),
  });

  return { delivery: "sendgrid" };
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const buildInviteHtml = (roomName: string, shareUrl: string, roomPassword: string) => {
  const safeName = escapeHtml(roomName);
  const safeUrl = escapeHtml(shareUrl);
  const safePw = escapeHtml(roomPassword);
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden">
        <tr><td style="padding:32px 32px 16px">
          <div style="font-size:15px;font-weight:700;letter-spacing:-0.02em;color:#18181b">Token</div>
        </td></tr>
        <tr><td style="padding:0 32px">
          <div style="font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.03em">You&apos;re invited</div>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#71717a">
            Open the shared room <strong>${safeName}</strong> using the link and room password below.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px 0">
          <a href="${safeUrl}" style="display:inline-block;background:#f35b2d;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:8px">Open shared room</a>
        </td></tr>
        <tr><td style="padding:8px 32px 0">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;word-break:break-all">${safeUrl}</p>
        </td></tr>
        <tr><td style="padding:20px 32px">
          <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#71717a">Room password (decrypt files)</p>
          <div style="background:#f4f4f5;border-radius:8px;padding:14px;font-size:15px;font-weight:600;color:#18181b;font-family:'SF Mono',SFMono-Regular,Menlo,monospace;word-break:break-all">${safePw}</div>
        </td></tr>
        <tr><td style="padding:0 32px 24px">
          <p style="margin:0;font-size:13px;line-height:1.55;color:#71717a">
            When you return to this room, enter <strong>this same email address</strong> on the page to receive a short verification code (OTP). That proves it&apos;s still you.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa">
            Forwarding this email shares the password. Treat it like a key.
          </p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;text-align:center">Token · Secure document sharing</p>
    </td></tr>
  </table>
</body>
</html>`;
};

export type RoomInviteSendResult =
  | { delivery: "sendgrid"; email: string }
  | { delivery: "local"; email: string; note: string };

/** Invite email: share link + room password + OTP instructions. Password is not stored server-side. */
export const sendRoomInviteEmail = async (
  toEmail: string,
  roomName: string,
  shareUrl: string,
  roomPassword: string,
): Promise<RoomInviteSendResult> => {
  const text = [
    `You're invited to Token room: ${roomName}`,
    ``,
    `Open: ${shareUrl}`,
    ``,
    `Room password (to decrypt files): ${roomPassword}`,
    ``,
    `When you come back, use this same email on the page to get a verification code.`,
    ``,
    `— Token`,
  ].join("\n");

  if (!isSendgridConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Token] invite (local) → ${toEmail} | ${shareUrl} | pw: ${roomPassword.slice(0, 3)}…`);
    }
    return { delivery: "local", email: toEmail, note: "email not configured" };
  }

  sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

  await sendgrid.send({
    to: toEmail,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL!,
      name: "Token",
    },
    subject: `Invitation: ${roomName}`,
    text,
    html: buildInviteHtml(roomName, shareUrl, roomPassword),
  });

  return { delivery: "sendgrid", email: toEmail };
};
