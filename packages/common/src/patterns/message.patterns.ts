export const ORDER_PATTERNS = {
  CREATE: 'orders.create',
  FIND_ALL: 'orders.findAll',
  FIND_ONE: 'orders.findOne',
} as const;

export const ORDER_EVENTS = {
  CREATED: 'orders.event.created',
} as const;

export const STORE_EVENTS = {
  APPLIED: 'store.event.applied',
  APPROVED: 'store.event.approved',
  REJECTED: 'store.event.rejected',
} as const;

export const EMAIL_EVENTS = {
  SEND_WELCOME: 'email.send_welcome',
  SEND_SIGNUP_OTP: 'email.send_signup_otp',
  SEND_PASSWORD_RESET_OTP: 'email.send_password_reset_otp',
  PASSWORD_CHANGED_ALERT: 'email.password_changed_alert',
  SEND_ORDER_CONFIRMATION: 'email.send_order_confirmation',
  SEND_STORE_APPROVED: 'email.send_store_approved',
  SEND_STORE_REJECTED: 'email.send_store_rejected',
} as const;

export const SERVICES = {
  ORDERS: 'ORDERS_SERVICE',
  BILLING: 'BILLING_SERVICE',
  EMAIL: 'EMAIL_SERVICE',
} as const;
