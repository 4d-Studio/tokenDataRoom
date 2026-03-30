import sendgrid from "@sendgrid/mail";

type SendCodeResult =
  | { delivery: "sendgrid" }
  | { delivery: "local"; debugCode: string };

const isSendgridConfigured = () =>
  Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);

export const sendMagicCode = async (
  email: string,
  code: string,
): Promise<SendCodeResult> => {
  if (!isSendgridConfigured()) {
    console.log(`[filmia] magic code for ${email}: ${code}`);
    return { delivery: "local", debugCode: code };
  }

  sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

  await sendgrid.send({
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: "Your Filmia login code",
    text: `Your Filmia login code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your Filmia login code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
  });

  return { delivery: "sendgrid" };
};
