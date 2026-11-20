export interface WelcomeTemplateParams {
  siteName: string;
  name?: string;
}

export function getWelcomeTemplate({ siteName, name }: WelcomeTemplateParams) {
  return {
    subject: `Welcome to ${siteName}!`,
    text: `Welcome to ${siteName}, ${name ?? 'there'}! Your account is now active and ready to go.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2b6cb0; margin-top: 0;">Welcome to ${siteName}, ${name ?? 'there'}!</h2>
        <p style="color: #4a5568; line-height: 1.6;">Thank you for verifying your email. Your account is now active and ready to use.</p>
        <p style="color: #4a5568; line-height: 1.6;">You can now log in, explore products, and manage your orders.</p>
        <br />
        <p style="color: #4a5568;">Best regards,<br/><strong>The ${siteName} Team</strong></p>
      </div>
    `,
  };
}
