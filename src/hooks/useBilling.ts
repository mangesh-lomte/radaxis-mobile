/**
 * RadAxis RIS Mobile — Billing Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { billingService, InvoiceFilters } from '../services/billingService';
import { InvoiceDetail, InvoiceListItem } from '../types/billing';

export function useInvoices(filters: InvoiceFilters = {}) {
  return useQuery<InvoiceListItem[]>({
    queryKey: ['billing', 'invoices', filters],
    queryFn: () => billingService.getInvoices(filters),
  });
}

export function useInvoiceDetail(invoiceIdOrNumber?: string) {
  return useQuery<InvoiceDetail>({
    queryKey: ['billing', 'invoice', invoiceIdOrNumber],
    queryFn: () => billingService.getInvoice(invoiceIdOrNumber!),
    enabled: !!invoiceIdOrNumber,
  });
}
