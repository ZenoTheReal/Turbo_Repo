export const ORDER_PATTERNS = {
  CREATE: 'orders.create',
  CREATE_CHECKOUT: 'orders.create_checkout',
  FIND_ALL: 'orders.findAll',
  FIND_ALL_SELLER: 'orders.findAllSeller',
  FIND_ALL_BUYER: 'orders.findAllBuyer',
  FIND_ONE: 'orders.findOne',
  UPDATE_STATUS: 'orders.updateStatus',
  CANCEL: 'orders.cancel',
  MARK_PAID: 'orders.markPaid',
  EXPIRE_ORDER: 'orders.expire',
} as const;

export const ORDER_EVENTS = {
  CREATED: 'orders.event.created',
  PAID: 'orders.event.paid',
  EXPIRED: 'orders.event.expired',
  CANCELLED: 'orders.event.cancelled',
  SHIPPED: 'orders.event.shipped',
} as const;

export const STORE_EVENTS = {
  APPLIED: 'store.event.applied',
  APPROVED: 'store.event.approved',
  REJECTED: 'store.event.rejected',
} as const;

export const PRODUCT_PATTERNS = {
  CREATE: 'products.create',
  UPDATE: 'products.update',
  FIND_ALL: 'products.findAll',
  FIND_ONE: 'products.findOne',
  FIND_BY_SLUG: 'products.findBySlug',
  DELETE: 'products.delete',
} as const;

export const CATEGORY_PATTERNS = {
  CREATE: 'categories.create',
  UPDATE: 'categories.update',
  FIND_ALL: 'categories.findAll',
  FIND_ONE: 'categories.findOne',
  DELETE: 'categories.delete',
} as const;

export const COUPON_PATTERNS = {
  CREATE: 'coupons.create',
  UPDATE: 'coupons.update',
  FIND_ALL: 'coupons.findAll',
  FIND_ONE: 'coupons.findOne',
  VALIDATE: 'coupons.validate',
  DELETE: 'coupons.delete',
} as const;

export const INVENTORY_PATTERNS = {
  RESERVE: 'inventory.reserve',
  RELEASE: 'inventory.release',
  DEDUCT: 'inventory.deduct',
} as const;

export const BILLING_PATTERNS = {
  RECORD_ORDER_PAYMENT: 'billing.recordOrderPayment',
  RECORD_ORDER_REFUND: 'billing.recordOrderRefund',
  FIND_INVOICES: 'billing.findInvoices',
  FIND_INVOICE_BY_ORDER: 'billing.findInvoiceByOrder',
  FIND_STORE_LEDGER: 'billing.findStoreLedger',
  GET_STORE_SUMMARY: 'billing.getStoreSummary',
  GET_PLATFORM_SUMMARY: 'billing.getPlatformSummary',
  REQUEST_PAYOUT: 'billing.requestPayout',
  FIND_PAYOUTS: 'billing.findPayouts',
  MARK_PAYOUT_PAID: 'billing.markPayoutPaid',
} as const;

export const BILLING_EVENTS = {
  INVOICE_ISSUED: 'billing.event.invoice_issued',
  PAYOUT_REQUESTED: 'billing.event.payout_requested',
  PAYOUT_COMPLETED: 'billing.event.payout_completed',
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
  PRODUCTS: 'PRODUCTS_SERVICE',
} as const;
