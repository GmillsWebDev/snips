export const getSubject = ({ shopName }: { shopName: string }) =>
  `Your booking at ${shopName} has been confirmed`;

export const bookingAccepted = (params: {
  shopName: string;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  colorPrimary: string;
  colorOnPrimary: string;
  dashboardUrl?: string;
}): string => {
  const { shopName, customerName, serviceName, appointmentDate, dashboardUrl } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-size:24px;font-weight:700;letter-spacing:0.15em;color:#ffffff;text-transform:uppercase;">Snips</span>
        </td></tr>
        <tr><td style="background:#1a1a1a;border-radius:12px;padding:40px;border:1px solid #2a2a2a;">
          <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Booking accepted</p>
          <h1 style="margin:0 0 32px;font-size:22px;color:#ffffff;font-weight:600;">Good news, ${customerName} — you're confirmed.</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #2a2a2a;">
            <tr><td style="padding:16px 0;border-bottom:1px solid #2a2a2a;">
              <span style="font-size:12px;color:#666;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em;">Shop</span>
              <span style="font-size:15px;color:#ffffff;">${shopName}</span>
            </td></tr>
            <tr><td style="padding:16px 0;border-bottom:1px solid #2a2a2a;">
              <span style="font-size:12px;color:#666;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em;">Service</span>
              <span style="font-size:15px;color:#ffffff;">${serviceName}</span>
            </td></tr>
            <tr><td style="padding:16px 0;">
              <span style="font-size:12px;color:#666;display:block;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.08em;">Date &amp; Time</span>
              <span style="font-size:15px;color:#ffffff;">${appointmentDate}</span>
            </td></tr>
          </table>
        </td></tr>
        ${dashboardUrl ? `<tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">Need to make changes? <a href="${dashboardUrl}" style="color:#888;text-decoration:underline;">Visit your dashboard.</a></p>
        </td></tr>` : ''}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};
