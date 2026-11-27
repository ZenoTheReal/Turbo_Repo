export enum InvoiceStatus {
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  VOID = 'VOID',
}

export enum LedgerEntryType {
  ORDER_CREDIT = 'ORDER_CREDIT',
  PLATFORM_FEE = 'PLATFORM_FEE',
  PAYOUT = 'PAYOUT',
  REFUND_DEBIT = 'REFUND_DEBIT',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  PAID = 'PAID',
  FAILED = 'FAILED',
}
