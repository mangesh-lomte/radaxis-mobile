/**
 * RadAxis RIS Mobile — Billing & Invoices Domain Types
 * Matches backend /api/v1/billing/* REST contracts
 */

export type InvoiceStatus =
  | 'PENDING'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'CANCELLED'
  | 'REFUNDED';

export interface InvoiceItem {
  id: string;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemType?: string;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  accessionNumber: string;
  grossAmount: number;
  discount: number;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
  balance: number;
  status: InvoiceStatus;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  paymentNumber?: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  paidAt: string;
  paymentStatus: string;
}

export interface ReceiptRecord {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  accessionNumber: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  issuedAt: string;
  receiptData?: Record<string, unknown>;
  isDemoReceipt?: boolean;
}

export interface InvoiceDetail extends InvoiceListItem {
  orderId?: string;
  discountReason?: string | null;
  discountApprovedAt?: string | null;
  taxAmount: number;
  items: InvoiceItem[];
  payments?: PaymentRecord[];
  receipts?: ReceiptRecord[];
}
