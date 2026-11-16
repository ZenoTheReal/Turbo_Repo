export const ORDER_PATTERNS = {
  CREATE: 'orders.create',
  FIND_ALL: 'orders.findAll',
  FIND_ONE: 'orders.findOne',
} as const;

export const ORDER_EVENTS = {
  CREATED: 'orders.event.created',
} as const;