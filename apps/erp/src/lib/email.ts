import { Resend } from 'resend';

// Initialize Resend with the API key
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  react,
  text,
}: {
  to: string | string[];
  subject: string;
  react?: React.ReactElement | React.ReactNode | null;
  text?: string;
}) {
  try {
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'UAP <noreply@uap.edu.gh>',
      to,
      subject,
      ...(react ? { react } : { text: text || '' }),
    });

    return { data };
  } catch (error) {
    return { error };
  }
}
