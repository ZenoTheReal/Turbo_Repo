export interface StoreRejectedTemplateParams {
  siteName: string;
  name?: string;
  storeName: string;
  subdomain: string;
  reason?: string;
}

export function getStoreRejectedTemplate({
  siteName,
  name,
  storeName,
  subdomain,
  reason,
}: StoreRejectedTemplateParams) {
  return {
    subject: `Storefront Application Update: ${storeName} - ${siteName}`,
    text: `Hello ${name ?? 'Seller'}, your application for "${storeName}" (${subdomain}) was declined. Reason: ${reason ?? 'Application requirements not met.'}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #c53030; margin-top: 0;">Storefront Application Declined</h2>
        <p style="color: #4a5568; line-height: 1.6;">Hello ${name ?? 'there'},</p>
        <p style="color: #4a5568; line-height: 1.6;">Thank you for your interest in selling on <strong>${siteName}</strong>. Following review, your application for <strong>${storeName}</strong> (${subdomain}) could not be approved at this time.</p>
        <div style="margin: 20px 0; padding: 14px; background: #fff5f5; border: 1px solid #fed7d7; border-radius: 6px;">
          <p style="margin: 0; color: #9b2c2c; font-weight: 600;">Reason provided by Administrator:</p>
          <p style="margin: 6px 0 0; color: #742a2a; font-size: 14px; line-height: 1.5;">${reason ?? 'Documentation or application requirements were not met.'}</p>
        </div>
        <p style="color: #4a5568; line-height: 1.6;">If you believe this decision was made in error or wish to provide updated documentation, please contact our support team.</p>
        <br />
        <p style="color: #4a5568;">Best regards,<br/><strong>The ${siteName} Team</strong></p>
      </div>
    `,
  };
}
