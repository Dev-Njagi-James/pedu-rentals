// /api/contact/route.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  const { email, body } = await req.json();

  await resend.emails.send({
    from: 'Pedu Rentals <noreply@pedurentals.com>', // free tier sender
    to: 'pedurentals@gmail.com',
    replyTo: email,
    subject: 'New Contact Form Submission',
    text: `From: ${email}\n\n${body}`,
  });

  return Response.json({ ok: true });
}