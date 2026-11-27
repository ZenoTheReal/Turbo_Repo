export type UserRole = 'ADMIN' | 'SELLER' | 'BUYER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type StoreStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
export type PayoutStatus = 'PENDING' | 'SCHEDULED' | 'PAID' | 'FAILED';
export type FaqCategory = 'GENERAL' | 'BUYERS' | 'SELLERS' | 'PAYMENTS' | 'SHIPPING';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  avatarUrl?: string;
  status: UserStatus;
  isEmailVerified: boolean;
  isDeleted?: boolean;
  role: UserRole | { id: string; name: UserRole };
  createdAt?: string;
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface Store {
  id: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  description?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  legalBusinessName?: string;
  taxId?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  currency?: string;
  logoUrl?: string;
  bannerUrl?: string;
  faviconUrl?: string;
  status: StoreStatus;
  rejectionReason?: string;
  isOpen: boolean;
  maintenanceNotice?: string;
  stripeAccountId?: string;
  isPayoutsEnabled: boolean;
  returnPolicy?: string;
  shippingPolicy?: string;
  privacyPolicy?: string;
  ownerId: string;
  owner?: AuthUser;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSettings {
  id: number;
  platformName: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  faviconUrl?: string;
  currency: string;
  commissionRate: number;
  fixedFee: number;
  stripeAccountId?: string;
  stripePublishableKey?: string;
  isStripeEnabled: boolean;
  updatedAt?: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: FaqCategory;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformBillingSummary {
  totalGmv: number;
  totalCommissionEarned: number;
  totalSellerNet: number;
  paidInvoiceCount: number;
  pendingPayoutAmount: number;
  pendingPayoutCount: number;
  completedPayoutAmount: number;
}

export interface AdminPlatformStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    verified: number;
    admins: number;
    sellers: number;
    buyers: number;
  };
  stores: {
    total: number;
    active: number;
    pendingApproval: number;
    rejected: number;
    suspended: number;
    stripeReady: number;
  };
  faqs: {
    total: number;
    published: number;
  };
  cms: {
    total: number;
    published: number;
  };
  billing: PlatformBillingSummary;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  storeId: string;
  buyerEmail: string;
  buyerName: string;
  currency: string;
  grossAmount: number;
  commissionRateSnapshot: number;
  fixedFeeSnapshot: number;
  platformFeeAmount: number;
  sellerNetAmount: number;
  status: string;
  issuedAt: string;
}

export interface SellerPayout {
  id: string;
  payoutReference: string;
  storeId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  stripeTransferId?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
}
