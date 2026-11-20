export interface StoreApprovedTemplateParams {
  siteName: string;
  name?: string;
  storeName: string;
  subdomain: string;
}

export function getStoreApprovedTemplate({
  siteName,
  name,
  storeName,
  subdomain,
}: StoreApprovedTemplateParams) {
  const storefrontUrl = `https://${subdomain}.yourdomain.com`;

  return {
    subject: `Storefront Approved: ${storeName} is Live! - ${siteName}`,
    text: `Congratulations ${name ?? 'Seller'}! Your storefront "${storeName}" has been approved and is now live at ${storefrontUrl}.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2b6cb0; margin-top: 0;">Your Storefront is Approved!</h2>
        <p style="color: #4a5568; line-height: 1.6;">Hello ${name ?? 'there'},</p>
        <p style="color: #4a5568; line-height: 1.6;">Great news! Your storefront application for <strong>${storeName}</strong> has been reviewed and approved by the platform administration.</p>
        <div style="margin: 24px 0; padding: 16px; background: #ebf8ff; border: 1px solid #bee3f8; border-radius: 6px;">
          <p style="margin: 0; color: #2c5282; font-weight: 600;">Storefront Address:</p>
          <p style="margin: 6px 0 0; font-size: 16px; color: #2b6cb0; word-break: break-all;">
            <strong>${subdomain}.yourdomain.com</strong>
          </p>
        </div>
        <p style="color: #4a5568; line-height: 1.6;">You can now access your merchant dashboard, upload your inventory, and start receiving customer orders.</p>
        <br />
        <p style="color: #4a5568;">Best regards,<br/><strong>The ${siteName} Team</strong></p>
      </div>
    `,
  };
}
