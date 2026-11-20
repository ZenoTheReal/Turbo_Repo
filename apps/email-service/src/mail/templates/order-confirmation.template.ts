export interface OrderConfirmationTemplateParams {
  siteName: string;
  orderId: string;
  amount: number | string;
  userEmail?: string;
}

export function getOrderConfirmationTemplate({ siteName, orderId, amount }: OrderConfirmationTemplateParams) {
  return {
    subject: `Order Confirmation #${orderId} - ${siteName}`,
    text: `Thank you for your order #${orderId} with ${siteName}. Total: $${amount}.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2b6cb0; margin-top: 0;">Order Confirmed</h2>
        <p style="color: #4a5568; line-height: 1.6;">Thank you for your purchase. We have received your order <strong>#${orderId}</strong>.</p>
        <p style="color: #4a5568; line-height: 1.6;"><strong>Total Amount:</strong> $${amount}</p>
        <p style="color: #718096; font-size: 14px;">We are currently preparing your shipment and will notify you once dispatched.</p>
        <br />
        <p style="color: #4a5568;">Best regards,<br/><strong>The ${siteName} Team</strong></p>
      </div>
    `,
  };
}
