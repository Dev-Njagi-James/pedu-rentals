export async function sendReminder({ channel, to, kind, listings, dashboardUrl }) {
  if (channel === 'email') {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { renderReminderEmail } = await import('@/lib/email/subscriptionReminder');
    const { subject, html, text } = renderReminderEmail({ kind, listings, dashboardUrl });

    const { data, error } = await resend.emails.send({
      from: 'Pedu Rentals <noreply@pedurentals.com>',
      to,
      subject,
      html,
      text,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id ?? null };
  }

  if (channel === 'whatsapp') {
    return { ok: false, error: 'not_implemented' };
  }

  return { ok: false, error: `unknown channel: ${channel}` };
}