export interface SecurityAlertTemplateParams {
  siteName: string;
  name?: string;
}

export function getSecurityAlertTemplate({ siteName, name }: SecurityAlertTemplateParams) {
  return {
    subject: `Security Alert: Password Changed - ${siteName}`,
    text: `Your ${siteName} password was successfully changed. If this wasn't you, contact support immediately.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #c53030; margin-top: 0;">Security Alert: Password Updated</h2>
        <p style="color: #4a5568; line-height: 1.6;">Hello ${name ?? 'there'},</p>
        <p style="color: #4a5568; line-height: 1.6;">The password for your <strong>${siteName}</strong> account was updated on <strong>${new Date().toUTCString()}</strong>.</p>
        <p style="color: #718096; font-size: 14px; line-height: 1.5;">If you made this change, you can safely ignore this email. If not, contact support immediately.</p>
      </div>
    `,
  };
}
