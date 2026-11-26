import {
  escapeHtml,
  formatNairobiDate,
  daysUntilNairobi,
} from '@/lib/format/date';

function buildRow(name, publishedAt, expiresAt, plan) {
  const safeName = escapeHtml(name);
  const safePublished = escapeHtml(publishedAt);
  const safeExpires = escapeHtml(expiresAt);
  const safePlan = escapeHtml(plan);
  return `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-family: system-ui, -apple-system, sans-serif;">${safeName}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-family: system-ui, -apple-system, sans-serif;">${safePublished}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-family: system-ui, -apple-system, sans-serif;">${safeExpires}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-family: system-ui, -apple-system, sans-serif;">${safePlan}</td>
    </tr>
  `.trim();
}

function buildTextRow(name, publishedAt, expiresAt, plan) {
  return `  - ${name} | Published: ${publishedAt} | Expires: ${expiresAt} | Plan: ${plan}`;
}

export function renderReminderEmail({ kind, listings, dashboardUrl }) {
  const count = listings.length;
  const isSingle = count === 1;

  const days = isSingle ? daysUntilNairobi(listings[0].expiresAt) : null;

  let subject;
  if (isSingle) {
    if (days === 0) {
      subject = 'Your listing expires today';
    } else if (days === 1) {
      subject = 'Your listing expires tomorrow';
    } else if (days !== null && days > 1) {
      subject = `Your listing expires in ${days} days`;
    } else {
      subject = 'Subscription expiry reminder';
    }
  } else {
    subject = `${count} of your listings expire soon`;
  }

  const formattedExpires = isSingle
    ? formatNairobiDate(listings[0].expiresAt)
    : '';

  const bodySentence = isSingle
    ? `Your subscription for the listing below ends on ${formattedExpires}. After that, the listing will stop showing publicly.`
    : `Your subscriptions for the listings below end soon. After that date, each listing will stop showing publicly.`;

  const rowsHtml = listings
    .map(l => buildRow(l.name, l.publishedAt, l.expiresAt, l.plan))
    .join('\n');
  const rowsText = listings
    .map(l => buildTextRow(l.name, l.publishedAt, l.expiresAt, l.plan))
    .join('\n');

  const safeDashboardUrl = escapeHtml(dashboardUrl);

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: system-ui, -apple-system, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <tr>
        <td style="padding: 24px; background-color: #0f172a; color: #ffffff; font-family: system-ui, -apple-system, sans-serif;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Pedu Rentals</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 24px;">
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #1e293b;">${escapeHtml(bodySentence)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 12px 16px; text-align: left; font-weight: 600; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0;">Listing name</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 600; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0;">Published</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 600; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0;">Expires</th>
                <th style="padding: 12px 16px; text-align: left; font-weight: 600; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0;">Plan</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div style="margin-top: 24px; text-align: center;">
            <a href="${safeDashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Go to my listings</a>
          </div>
          <p style="margin: 24px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">If you did not expect this email, you can ignore it.</p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  const text = `
Pedu Rentals

${bodySentence}

${rowsText}

Go to my listings: ${dashboardUrl}

If you did not expect this email, you can ignore it.
  `.trim();

  return { subject, html, text };
}