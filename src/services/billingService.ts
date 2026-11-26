/**
 * RadAxis RIS Mobile — Staff Billing Service
 * Communicates with backend /api/v1/billing/* REST endpoints
 */

import { apiClient } from './api';
import { isMutationAllowed, DEMO_IDENTIFIER_PREFIX } from '../constants/environment';
import { InvoiceDetail, InvoiceListItem, ReceiptRecord } from '../types/billing';
import { safeNumber } from '../utils/formatters';

export interface InvoiceFilters {
  patientId?: string;
  orderId?: string;
  status?: string;
  search?: string;
}

function normalizeInvoiceItem(raw: any): InvoiceListItem {
  if (!raw) return raw;
  const grossAmount = safeNumber(raw.grossAmount, safeNumber(raw.total, 0)) ?? 0;
  const total = safeNumber(raw.total, grossAmount) ?? 0;
  const paidAmount = safeNumber(raw.paidAmount, 0) ?? 0;
  const balance = safeNumber(raw.balance, safeNumber(raw.outstandingAmount, Math.max(0, total - paidAmount))) ?? 0;
  const outstandingAmount = safeNumber(raw.outstandingAmount, balance) ?? 0;
  const discount = safeNumber(raw.discount, 0) ?? 0;

  return {
    ...raw,
    grossAmount,
    discount,
    total,
    paidAmount,
    outstandingAmount,
    balance,
  };
}

function normalizeReceipt(raw: any): ReceiptRecord {
  if (!raw) return raw;
  return {
    ...raw,
    amount: safeNumber(raw.amount, 0) ?? 0,
    reference: raw.reference || raw.referenceNumber || '',
  };
}

function normalizeInvoiceDetail(raw: any): InvoiceDetail {
  if (!raw) return raw;
  const base = normalizeInvoiceItem(raw);
  return {
    ...base,
    taxAmount: safeNumber(raw.taxAmount, 0) ?? 0,
    items: Array.isArray(raw.items)
      ? raw.items.map((it: any) => ({
          ...it,
          quantity: safeNumber(it.quantity, 1) ?? 1,
          unitPrice: safeNumber(it.unitPrice, 0) ?? 0,
          totalPrice: safeNumber(it.totalPrice, (it.quantity || 1) * (it.unitPrice || 0)) ?? 0,
        }))
      : [],
    payments: Array.isArray(raw.payments)
      ? raw.payments.map((p: any) => ({
          ...p,
          amount: safeNumber(p.amount, 0) ?? 0,
          referenceNumber: p.referenceNumber || p.reference,
        }))
      : [],
    receipts: Array.isArray(raw.receipts)
      ? raw.receipts.map((r: any) => normalizeReceipt(r))
      : [],
  };
}

export const billingService = {
  /**
   * Retrieve list of invoices with optional status/patient/search filters
   */
  getInvoices: async (filters: InvoiceFilters = {}): Promise<InvoiceListItem[]> => {
    const query = new URLSearchParams();

    if (filters.status && filters.status !== 'ALL') {
      query.append('status', filters.status);
    }
    if (filters.patientId) {
      query.append('patientId', filters.patientId);
    }
    if (filters.orderId) {
      query.append('orderId', filters.orderId);
    }
    if (filters.search && filters.search.trim()) {
      query.append('search', filters.search.trim());
    }

    const qs = query.toString();
    const endpoint = `/billing/invoices${qs ? `?${qs}` : ''}`;
    const res = await apiClient<InvoiceListItem[]>(endpoint);
    return Array.isArray(res.data) ? res.data.map(normalizeInvoiceItem) : [];
  },

  /**
   * Retrieve single invoice detail with line items, tax, discounts, and payments
   */
  getInvoice: async (invoiceIdOrNumber: string): Promise<InvoiceDetail> => {
    const endpoint = `/billing/invoices/${encodeURIComponent(invoiceIdOrNumber.trim())}`;
    const res = await apiClient<InvoiceDetail>(endpoint);
    return normalizeInvoiceDetail(res.data);
  },

  /**
   * Retrieve official payment receipts for an invoice
   */
  getReceipts: async (invoiceId?: string): Promise<ReceiptRecord[]> => {
    const query = invoiceId ? `?invoiceId=${encodeURIComponent(invoiceId)}` : '';
    const endpoint = `/billing/receipts${query}`;
    const res = await apiClient<ReceiptRecord[]>(endpoint);
    return Array.isArray(res.data) ? res.data.map(normalizeReceipt) : [];
  },

  /**
   * Retrieve single payment receipt by ID or receipt number
   */
  getReceipt: async (receiptIdOrNumber: string): Promise<ReceiptRecord> => {
    const endpoint = `/billing/receipts/${encodeURIComponent(receiptIdOrNumber.trim())}`;
    const res = await apiClient<ReceiptRecord>(endpoint);
    return normalizeReceipt(res.data);
  },

  /**
   * Record payment against invoice.
   * If in staging mode: dispatches POST to /billing/invoices/:id/payments.
   * If in production mode: safe local demo simulation with distinct DEMO-LOCAL prefix and zero server mutation.
   */
  recordPayment: async (
    invoiceId: string,
    input: {
      amount: number;
      paymentMethod: string;
      reference?: string;
      notes?: string;
    }
  ): Promise<{
    receipt: ReceiptRecord;
    isLocalDemonstration: boolean;
    message: string;
  }> => {
    if (!isMutationAllowed()) {
      const demoReceipt: ReceiptRecord = {
        id: `rcp-demo-${Date.now()}`,
        receiptNumber: `${DEMO_IDENTIFIER_PREFIX}RCP-${Math.floor(1000 + Math.random() * 9000)}`,
        invoiceNumber: invoiceId,
        patientId: 'PAT-DEMO-001',
        patientName: 'Demo Patient',
        accessionNumber: 'ACC-DEMO-001',
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        reference: input.reference || 'DEMO-LOCAL-REF',
        issuedAt: new Date().toISOString(),
        isDemoReceipt: true,
      };

      return {
        receipt: demoReceipt,
        isLocalDemonstration: true,
        message: 'Preview only — no changes saved.',
      };
    }

    const endpoint = `/billing/invoices/${encodeURIComponent(invoiceId)}/payments`;
    const res = await apiClient<ReceiptRecord>(endpoint, {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return {
      receipt: normalizeReceipt(res.data),
      isLocalDemonstration: false,
      message: 'Payment recorded and official receipt generated',
    };
  },
};
