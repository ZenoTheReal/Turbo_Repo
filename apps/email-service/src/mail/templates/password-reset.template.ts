export interface PasswordResetTemplateParams {
  siteName: string;
  name?: string;
  otp: string;
}

export function getPasswordResetTemplate({ siteName, name, otp }: PasswordResetTemplateParams) {
  return {
    subject: `Password Reset Code - ${siteName}`,
    text: `Your ${siteName} password reset code is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e53e3e; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #4a5568; line-height: 1.6;">Hello ${name ?? 'there'},</p>
        <p style="color: #4a5568; line-height: 1.6;">We received a request to reset your password for your <strong>${siteName}</strong> account. Use the code below to proceed:</p>
        <div style="margin: 28px 0; text-align: center;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #c53030; background: #fff5f5; padding: 12px 24px; border-radius: 6px; border: 1px dashed #feb2b2; display: inline-block;">
            ${otp}
          </span>
        </div>
        <p style="color: #718096; font-size: 14px; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>. If you did not request a password reset, please secure your account immediately.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #a0aec0; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
      </div>
    `,
  };
}
