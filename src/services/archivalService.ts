/**
 * ==========================================================
 * DATA CLEANUP & ARCHIVAL SERVICE
 * ==========================================================
 * Provides data filtering, archival bundle generation (JSON/CSV),
 * storage space calculations, and cleanup orchestration across
 * local state and Supabase Cloud Database.
 */

import {
  DataCleanupFilter,
  DataCleanupStats,
  ArchiveBundle,
  CleanupResult,
  Sale,
  PurchaseItem,
  Expense,
  WorkshopJobOrder,
  Product,
} from '../types/gold';
import { getSystemLogs, clearSystemLogs, recordLog } from './loggerService';
import { supabaseBatchDeleteSales, supabaseBatchDeleteProducts } from './supabaseService';
import { supabase } from '../lib/supabase';

export interface AppDataState {
  shopName: string;
  sales: Sale[];
  purchases: PurchaseItem[];
  expenses: Expense[];
  workshopOrders: WorkshopJobOrder[];
  products: Product[];
}

/**
 * Filter items that are older than or equal to cutoffDate (YYYY-MM-DD)
 */
function isDateBeforeOrEqual(itemDateStr?: string, cutoffDate?: string): boolean {
  if (!cutoffDate) return true;
  if (!itemDateStr) return false;
  // Compare strings if formatted YYYY-MM-DD or parse to date
  const itemDate = itemDateStr.slice(0, 10);
  const cutoff = cutoffDate.slice(0, 10);
  return itemDate <= cutoff;
}

/**
 * Calculate count of records that will be affected by the cleanup filter
 */
export function calculateCleanupStats(
  filter: DataCleanupFilter,
  state: AppDataState
): DataCleanupStats {
  const matchingSales = filter.includeSales
    ? state.sales.filter((s) => isDateBeforeOrEqual(s.date, filter.cutoffDate))
    : [];

  const matchingPurchases = filter.includePurchases
    ? state.purchases.filter((p) => isDateBeforeOrEqual(p.date, filter.cutoffDate))
    : [];

  const matchingExpenses = filter.includeExpenses
    ? state.expenses.filter((e) => isDateBeforeOrEqual(e.date, filter.cutoffDate))
    : [];

  const matchingWorkshopOrders = filter.includeWorkshopOrders
    ? state.workshopOrders.filter(
        (o) =>
          (o.status === 'Stocked' || o.status === 'Cancelled') &&
          isDateBeforeOrEqual(o.orderDate || o.createdAt, filter.cutoffDate)
      )
    : [];

  const matchingSoldProducts = filter.includeSoldProducts
    ? state.products.filter(
        (p) => p.status === 'Sold' && isDateBeforeOrEqual(p.createdAt, filter.cutoffDate)
      )
    : [];

  const logs = filter.includeSystemLogs ? getSystemLogs() : [];

  const totalItems =
    matchingSales.length +
    matchingPurchases.length +
    matchingExpenses.length +
    matchingWorkshopOrders.length +
    matchingSoldProducts.length +
    logs.length;

  // Approximate bytes per item
  const estimatedBytes =
    matchingSales.length * 1200 +
    matchingPurchases.length * 800 +
    matchingExpenses.length * 300 +
    matchingWorkshopOrders.length * 1500 +
    matchingSoldProducts.length * 700 +
    logs.length * 400;

  return {
    salesCount: matchingSales.length,
    purchasesCount: matchingPurchases.length,
    expensesCount: matchingExpenses.length,
    workshopOrdersCount: matchingWorkshopOrders.length,
    soldProductsCount: matchingSoldProducts.length,
    systemLogsCount: logs.length,
    totalItems,
    estimatedBytes,
  };
}

/**
 * Build the complete archival bundle object
 */
export function buildArchiveBundle(
  filter: DataCleanupFilter,
  state: AppDataState
): ArchiveBundle {
  const sales = filter.includeSales
    ? state.sales.filter((s) => isDateBeforeOrEqual(s.date, filter.cutoffDate))
    : [];

  const purchases = filter.includePurchases
    ? state.purchases.filter((p) => isDateBeforeOrEqual(p.date, filter.cutoffDate))
    : [];

  const expenses = filter.includeExpenses
    ? state.expenses.filter((e) => isDateBeforeOrEqual(e.date, filter.cutoffDate))
    : [];

  const workshopOrders = filter.includeWorkshopOrders
    ? state.workshopOrders.filter(
        (o) =>
          (o.status === 'Stocked' || o.status === 'Cancelled') &&
          isDateBeforeOrEqual(o.orderDate || o.createdAt, filter.cutoffDate)
      )
    : [];

  const soldProducts = filter.includeSoldProducts
    ? state.products.filter(
        (p) => p.status === 'Sold' && isDateBeforeOrEqual(p.createdAt, filter.cutoffDate)
      )
    : [];

  const systemLogs = filter.includeSystemLogs ? getSystemLogs() : [];

  return {
    version: '1.0',
    archivedAt: new Date().toISOString(),
    shopName: state.shopName,
    cutoffDate: filter.cutoffDate,
    summary: {
      salesCount: sales.length,
      purchasesCount: purchases.length,
      expensesCount: expenses.length,
      workshopOrdersCount: workshopOrders.length,
      soldProductsCount: soldProducts.length,
      systemLogsCount: systemLogs.length,
      totalCount:
        sales.length +
        purchases.length +
        expenses.length +
        workshopOrders.length +
        soldProducts.length +
        systemLogs.length,
    },
    ...(sales.length > 0 ? { sales } : {}),
    ...(purchases.length > 0 ? { purchases } : {}),
    ...(expenses.length > 0 ? { expenses } : {}),
    ...(workshopOrders.length > 0 ? { workshopOrders } : {}),
    ...(soldProducts.length > 0 ? { soldProducts } : {}),
    ...(systemLogs.length > 0 ? { systemLogs } : {}),
  };
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate CSV representation of sales archive
 */
export function generateSalesCsv(sales: Sale[]): string {
  const headers = [
    'Invoice No',
    'Date',
    'Customer Name',
    'Customer Phone',
    'Subtotal Gold (MMK)',
    'Total Making Charge (MMK)',
    'Discount (MMK)',
    'Grand Total (MMK)',
    'Paid Amount (MMK)',
    'Balance (MMK)',
    'Status',
    'Cashier',
  ];

  const rows = sales.map((s) => [
    `"${s.invoiceNo}"`,
    `"${s.date}"`,
    `"${(s.customerName || '').replace(/"/g, '""')}"`,
    `"${s.customerPhone || ''}"`,
    s.subtotalGold || 0,
    s.totalMakingCharge || 0,
    s.totalDiscount || 0,
    s.grandTotal || 0,
    s.paidAmount || 0,
    s.balanceRemaining || 0,
    `"${s.status}"`,
    `"${(s.cashierName || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Generate ready-to-run PostgreSQL SQL script for Supabase SQL Editor
 * to cleanly delete archived records and reclaim disk space (VACUUM FULL)
 */
export function generateSupabaseCleanupSql(filter: DataCleanupFilter): string {
  const cutoff = filter.cutoffDate || new Date().toISOString().split('T')[0];
  const parts: string[] = [
    `-- ==========================================================`,
    `-- SUPABASE POSTGRESQL STORAGE CLEANUP & DISK RECLAIM`,
    `-- Target Cutoff Date: ${cutoff}`,
    `-- Run this script in: Supabase Dashboard > SQL Editor`,
    `-- ==========================================================`,
    ``,
    `BEGIN;`,
  ];

  if (filter.includeSales) {
    parts.push(
      `-- 1. Delete sales records created before cutoff date`,
      `DELETE FROM public.sales WHERE date <= '${cutoff}';`,
      ``
    );
  }

  if (filter.includeSoldProducts) {
    parts.push(
      `-- 2. Delete products with 'Sold' status created before cutoff date`,
      `DELETE FROM public.products WHERE status = 'Sold' AND created_at <= '${cutoff}T23:59:59Z';`,
      ``
    );
  }

  parts.push(
    `COMMIT;`,
    ``,
    `-- ==========================================================`,
    `-- IMPORTANT: Reclaim physical disk storage from PostgreSQL!`,
    `-- (PostgreSQL marks deleted rows as dead tuples until vacuumed)`,
    `-- ==========================================================`,
    filter.includeSales ? `VACUUM FULL public.sales;` : '',
    filter.includeSoldProducts ? `VACUUM FULL public.products;` : '',
    ``,
    `-- Verify remaining table size:`,
    `SELECT pg_size_pretty(pg_total_relation_size('public.sales')) AS sales_table_size;`
  );

  return parts.filter(Boolean).join('\n');
}

/**
 * Execute Cleanup: Purges local state and optionally syncs deletes to Supabase
 */
export async function executePurge(
  filter: DataCleanupFilter,
  state: AppDataState,
  callbacks: {
    setSales: (updater: (prev: Sale[]) => Sale[]) => void;
    setPurchases: (updater: (prev: PurchaseItem[]) => PurchaseItem[]) => void;
    setExpenses: (updater: (prev: Expense[]) => Expense[]) => void;
    setWorkshopOrders: (updater: (prev: WorkshopJobOrder[]) => WorkshopJobOrder[]) => void;
    setProducts: (updater: (prev: Product[]) => Product[]) => void;
    saveStorage: <T>(key: string, value: T) => void;
  },
  metaUser?: {
    userId?: string;
    userName?: string;
    userRole?: string;
    counterId?: string;
  }
): Promise<CleanupResult> {
  let salesPurged = 0;
  let purchasesPurged = 0;
  let expensesPurged = 0;
  let workshopOrdersPurged = 0;
  let soldProductsPurged = 0;
  let systemLogsPurged = 0;
  let supabaseCleanedCount = 0;

  // 1. Sales
  const salesToDelete = filter.includeSales
    ? state.sales.filter((s) => isDateBeforeOrEqual(s.date, filter.cutoffDate))
    : [];

  if (salesToDelete.length > 0) {
    salesPurged = salesToDelete.length;
    const idsToDelete = new Set(salesToDelete.map((s) => s.id));
    const remainingSales = state.sales.filter((s) => !idsToDelete.has(s.id));
    callbacks.setSales(() => remainingSales);
    callbacks.saveStorage('sales', remainingSales);

    // Also delete from Supabase if online
    if (supabase) {
      try {
        const deletedCloud = await supabaseBatchDeleteSales(Array.from(idsToDelete));
        supabaseCleanedCount += deletedCloud;
      } catch (err) {
        console.warn('Supabase batch delete sales error:', err);
      }
    }
  }

  // 2. Purchases
  const purchasesToDelete = filter.includePurchases
    ? state.purchases.filter((p) => isDateBeforeOrEqual(p.date, filter.cutoffDate))
    : [];

  if (purchasesToDelete.length > 0) {
    purchasesPurged = purchasesToDelete.length;
    const idsToDelete = new Set(purchasesToDelete.map((p) => p.id));
    const remainingPurchases = state.purchases.filter((p) => !idsToDelete.has(p.id));
    callbacks.setPurchases(() => remainingPurchases);
    callbacks.saveStorage('purchases', remainingPurchases);
  }

  // 3. Expenses
  const expensesToDelete = filter.includeExpenses
    ? state.expenses.filter((e) => isDateBeforeOrEqual(e.date, filter.cutoffDate))
    : [];

  if (expensesToDelete.length > 0) {
    expensesPurged = expensesToDelete.length;
    const idsToDelete = new Set(expensesToDelete.map((e) => e.id));
    const remainingExpenses = state.expenses.filter((e) => !idsToDelete.has(e.id));
    callbacks.setExpenses(() => remainingExpenses);
    callbacks.saveStorage('expenses', remainingExpenses);
  }

  // 4. Workshop Orders (Completed/Stocked or Cancelled)
  const workshopOrdersToDelete = filter.includeWorkshopOrders
    ? state.workshopOrders.filter(
        (o) =>
          (o.status === 'Stocked' || o.status === 'Cancelled') &&
          isDateBeforeOrEqual(o.orderDate || o.createdAt, filter.cutoffDate)
      )
    : [];

  if (workshopOrdersToDelete.length > 0) {
    workshopOrdersPurged = workshopOrdersToDelete.length;
    const idsToDelete = new Set(workshopOrdersToDelete.map((o) => o.id));
    const remainingWorkshop = state.workshopOrders.filter((o) => !idsToDelete.has(o.id));
    callbacks.setWorkshopOrders(() => remainingWorkshop);
    callbacks.saveStorage('workshop_orders', remainingWorkshop);
  }

  // 5. Sold Products
  const soldProductsToDelete = filter.includeSoldProducts
    ? state.products.filter(
        (p) => p.status === 'Sold' && isDateBeforeOrEqual(p.createdAt, filter.cutoffDate)
      )
    : [];

  if (soldProductsToDelete.length > 0) {
    soldProductsPurged = soldProductsToDelete.length;
    const idsToDelete = new Set(soldProductsToDelete.map((p) => p.id));
    const remainingProducts = state.products.filter((p) => !idsToDelete.has(p.id));
    callbacks.setProducts(() => remainingProducts);
    callbacks.saveStorage('products', remainingProducts);

    // Track deleted products so background sync doesn't revive them
    try {
      const storedDeleted = JSON.parse(
        localStorage.getItem('gold_shop_pos_gold_shop_deleted_products') || '[]'
      );
      const updatedDeleted = Array.from(new Set([...storedDeleted, ...Array.from(idsToDelete)]));
      localStorage.setItem(
        'gold_shop_pos_gold_shop_deleted_products',
        JSON.stringify(updatedDeleted)
      );
    } catch {}

    if (supabase) {
      try {
        const deletedProds = await supabaseBatchDeleteProducts(Array.from(idsToDelete));
        supabaseCleanedCount += deletedProds;
      } catch (err) {
        console.warn('Supabase batch delete products error:', err);
      }
    }
  }

  // 6. System Logs
  if (filter.includeSystemLogs) {
    const existingLogs = getSystemLogs();
    systemLogsPurged = existingLogs.length;
    clearSystemLogs();
  }

  const totalPurged =
    salesPurged +
    purchasesPurged +
    expensesPurged +
    workshopOrdersPurged +
    soldProductsPurged +
    systemLogsPurged;

  // Record audit log
  recordLog(
    'warn',
    'SYSTEM',
    `Data Cleanup & Archival: ${totalPurged} records purged (Cutoff: ${filter.cutoffDate || 'All'})`,
    {
      salesPurged,
      purchasesPurged,
      expensesPurged,
      workshopOrdersPurged,
      soldProductsPurged,
      systemLogsPurged,
      supabaseCleanedCount,
    },
    metaUser
  );

  return {
    salesPurged,
    purchasesPurged,
    expensesPurged,
    workshopOrdersPurged,
    soldProductsPurged,
    systemLogsPurged,
    totalPurged,
    supabaseCleanedCount,
    downloadedArchive: false,
  };
}
