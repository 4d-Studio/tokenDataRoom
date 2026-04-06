import sendgrid from "@sendgrid/mail";

type SendCodeResult =
  | { delivery: "sendgrid" }
  | { delivery: "local"; debugCode: string };

const isSendgridConfigured = () =>
  Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);

const buildHtmlEmail = (code: string) => `
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
          <div style="font-size:22px;font-weight:700;color:#18181b;letter-spacing:-0.03em">Your sign-in code</div>
          <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#71717a">Enter this code in the Token login screen. It expires in 10 minutes.</p>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <div style="background:#f4f4f5;border-radius:8px;padding:16px;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.3em;color:#18181b;font-family:'SF Mono',SFMono-Regular,Menlo,monospace">${code}</div>
        </td></tr>
        <tr><td style="padding:0 32px 32px">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa">If you didn't request this code, you can safely ignore this email. No account will be created.</p>
        </td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;text-align:center">Token · Secure document sharing</p>
    </td></tr>
  </table>
</body>
</html>`;

export const sendMagicCode = async (
  email: string,
  code: string,
): Promise<SendCodeResult> => {
  if (!isSendgridConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Token] email not configured — local OTP for ${email}`);
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
    subject: `${code} is your Token sign-in code`,
    text: `Your Token sign-in code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`,
    html: buildHtmlEmail(code),
  });

  return { delivery: "sendgrid" };
};
