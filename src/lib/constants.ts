/** Stored as TEXT in SQLite */
export const ROLES = ["OWNER", "SR", "RETAIL"] as const;
export type Role = (typeof ROLES)[number];

export const DELIVERY_STATUSES = ["PENDING_RETAIL", "CONFIRMED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const PAYMENT_METHODS = ["ONLINE", "CASH_SR", "PROOF_BANK", "CASH_HAND_RETAIL"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ["PENDING_OWNER", "CONFIRMED", "REJECTED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** OPEN = needs SR; ASSIGNED = SR picked; COMPLETED; CANCELLED */
export const ORDER_STATUSES = ["OPEN", "ASSIGNED", "COMPLETED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
