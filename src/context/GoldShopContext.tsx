import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  GoldPrice,
  Product,
  Customer,
  Supplier,
  Sale,
  PurchaseItem,
  Expense,
  ShopSettings,
  User,
  UserRole,
  PaymentMethod,
  PaymentRecord,
  DebtSettlement,
  CounterTerminal,
  DEFAULT_COUNTERS,
  StoreOperationState,
  Goldsmith,
  WorkshopJobOrder,
  WorkshopJobStatus,
  GoldWeight,
  DataCleanupFilter,
  DataCleanupStats,
  ArchiveBundle,
  CleanupResult,
} from '../types/gold';
import {
  calculateCleanupStats,
  buildArchiveBundle,
  downloadFile,
  generateSalesCsv,
  generateSupabaseCleanupSql,
  executePurge,
} from '../services/archivalService';
import {
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_GOLD_PRICES,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_SALES,
  INITIAL_PURCHASES,
  INITIAL_EXPENSES,
  INITIAL_GOLDSMITHS,
  INITIAL_WORKSHOP_ORDERS,
} from '../data/mockData';
import {
  sortGoldPricesAscending,
  calculateWorkshopWastageDiscrepancy,
  addWeights,
  subtractWeights,
} from '../services/calculationEngine';
import { recordLog } from '../services/loggerService';
import {
  supabase,
  isSupabaseConfigured,
  SupabaseProfile,
  syncActiveConfigFromServer,
  getActiveSupabaseConfig,
} from '../lib/supabase';
import {
  supabaseFetchProducts,
  supabaseUpsertProduct,
  supabaseDeleteProduct,
  supabaseFetchSales,
  supabaseInsertSale,
  supabaseUpdateSaleStatus,
  supabaseUpdateSalePayment,
  supabaseFetchGoldPrices,
  supabaseUpsertGoldPrice,
  supabaseFetchCustomers,
  supabaseUpsertCustomer,
  supabaseFetchProfiles,
  supabaseUpdateProfileRole,
  supabaseUpsertProfile,
  supabaseDeleteProfile,
  supabaseBatchDeleteProfiles,
  supabaseSignIn,
  supabaseSignUp,
  supabaseSignOut,
  supabaseResendConfirmation,
  supabaseFetchWorkshopOrders,
  supabaseSaveWorkshopOrders,
  supabaseDeleteWorkshopOrder,
  supabaseFetchGoldsmiths,
  supabaseSaveGoldsmiths,
  supabaseFetchPurchases,
  supabaseFetchExpenses,
  supabaseFetchSuppliers,
  supabaseFetchSettlements,
  supabaseFetchShopSettings,
  supabaseSaveShopSettings,
  supabaseCheckCloudHealth,
  supabaseBatchUploadAndVerify,
  type SupabaseHealthReport,
  type BatchUploadVerificationResult,
} from '../services/supabaseService';

const crossAppSyncChannel = (() => {
  try {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      return new BroadcastChannel('gold_shop_cross_app_sync');
    }
  } catch {
    // Gracefully fallback when BroadcastChannel is restricted in sandboxed iframes
  }
  return null;
})();

function notifyCrossAppSync() {
  try {
    crossAppSyncChannel?.postMessage({ timestamp: Date.now() });
  } catch {}
}

const STORAGE_PREFIX = 'gold_shop_pos_';

// Safe storage access that never throws in sandboxed iframes or private modes
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Storage access blocked or restricted
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Storage quota exceeded or disabled
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
};

// Helper to load from storage with fallback and schema resilience
export const loadStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = safeStorage.getItem(STORAGE_PREFIX + key);
    if (stored && stored !== 'undefined' && stored !== 'null') {
      const parsed = JSON.parse(stored);
      if (parsed !== null && parsed !== undefined) {
        if (Array.isArray(fallback)) {
          return (Array.isArray(parsed) ? parsed : fallback) as T;
        }
        if (typeof fallback === 'object' && fallback !== null) {
          return { ...fallback, ...parsed };
        }
        return parsed as T;
      }
    }
  } catch (e) {
    console.warn(`Failed to load ${key} from storage, resetting to default:`, e);
    safeStorage.removeItem(STORAGE_PREFIX + key);
  }
  return fallback;
};

const saveStorage = <T,>(key: string, value: T): void => {
  try {
    safeStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to storage:`, e);
  }
};

const DEFAULT_STAFF_PROFILES: SupabaseProfile[] = [
  {
    id: 'admin_1',
    email: 'admin@goldshop.com',
    full_name: 'Admin',
    role: 'Admin',
    phone: '09-450012345',
    pin: '1111',
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'manager_1',
    email: 'manager@goldshop.com',
    full_name: 'Manager',
    role: 'Manager',
    phone: '09-790012345',
    pin: '2222',
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'staff_1',
    email: 'staff@goldshop.com',
    full_name: 'မနွယ်နွယ် (အရောင်းစာရေး)',
    role: 'Staff',
    phone: '09-970012345',
    pin: '3333',
    created_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'staff_phoo',
    email: 'phoophoo.2000@gmail.com',
    full_name: 'Phoo (အရောင်းစာရေး / Staff)',
    role: 'Staff',
    phone: '09-980012345',
    pin: '4444',
    created_at: '2025-01-01T00:00:00.000Z',
  },
];

export const isAssistantManagerProfile = (p: { full_name?: string; email?: string; id?: string }): boolean => {
  const name = (p.full_name || '').toLowerCase();
  const email = (p.email || '').toLowerCase();
  const id = (p.id || '').toLowerCase();
  return (
    name.includes('assistant manager') ||
    name.includes('asst manager') ||
    name.includes('asst. manager') ||
    name.includes('assistant') ||
    name.includes('လက်ထောက်') ||
    name.includes('အကူမန်နေဂျာ') ||
    email.includes('assistantmanager') ||
    email.includes('assistant') ||
    email.includes('asst') ||
    id.includes('assistant') ||
    id.includes('asst')
  );
};

export const isProfileDeleted = (p: { id?: string; email?: string; full_name?: string; role?: string }): boolean => {
  if (!p) return false;
  if ((p as any).is_deleted === true) return true;
  if (p.role === 'Deleted') return true;
  const name = (p.full_name || '').trim().toLowerCase();
  if (name.startsWith('[deleted]') || name.includes('[deleted]')) return true;

  const deletedList = loadStorage<string[]>('gold_shop_deleted_staff', []);
  if (!deletedList || deletedList.length === 0) return false;

  const id = (p.id || '').trim().toLowerCase();
  const email = (p.email || '').trim().toLowerCase();

  return (
    (id !== '' && deletedList.includes(id)) ||
    (email !== '' && deletedList.includes(email)) ||
    (name !== '' && deletedList.includes(name)) ||
    (id === 'usr_phoo' && (deletedList.includes('staff_phoo') || deletedList.includes('phoophoo.2000@gmail.com'))) ||
    (id === 'staff_phoo' && (deletedList.includes('usr_phoo') || deletedList.includes('phoophoo.2000@gmail.com'))) ||
    (id === 'usr_staff' && (deletedList.includes('staff_1') || deletedList.includes('staff@goldshop.com'))) ||
    (id === 'staff_1' && (deletedList.includes('usr_staff') || deletedList.includes('staff@goldshop.com'))) ||
    (id === 'usr_manager' && (deletedList.includes('manager_1') || deletedList.includes('manager@goldshop.com'))) ||
    (id === 'manager_1' && (deletedList.includes('usr_manager') || deletedList.includes('manager@goldshop.com')))
  );
};

export const getCanonicalProfileKey = (p: { id?: string; email?: string; full_name?: string }): string => {
  const id = (p.id || '').trim().toLowerCase();
  const email = (p.email || '').trim().toLowerCase();
  const name = (p.full_name || '').trim().toLowerCase();

  if (id === 'usr_admin' || id === 'admin_1' || email === 'admin@goldshop.com') {
    return 'canonical_admin';
  }
  if (id === 'usr_manager' || id === 'manager_1' || email === 'manager@goldshop.com') {
    return 'canonical_manager';
  }
  if (id === 'usr_staff' || id === 'staff_1' || email === 'staff@goldshop.com' || (name.includes('နွယ်နွယ်') && !email.includes('phoo'))) {
    return 'canonical_staff_nwenwe';
  }
  if (id === 'staff_phoo' || id === 'usr_phoo' || email.includes('phoo') || name.includes('phoo')) {
    return 'canonical_staff_phoo';
  }
  return email || id || name;
};

export const getExpectedProfilePin = (profileOrUser?: {
  pin?: string;
  role?: UserRole;
  id?: string;
  email?: string;
  full_name?: string;
  name?: string;
}): string => {
  const pinOverrides = loadStorage<Record<string, string>>('gold_shop_pin_overrides', {});
  const idKey = (profileOrUser?.id || '').toLowerCase();
  const emailKey = (profileOrUser?.email || '').toLowerCase();
  const nameKey = ((profileOrUser as any)?.full_name || profileOrUser?.name || '').toLowerCase();
  const explicitPin =
    (profileOrUser?.id && pinOverrides[profileOrUser.id]) ||
    (idKey && pinOverrides[idKey]) ||
    (emailKey && pinOverrides[emailKey]) ||
    (nameKey && pinOverrides[nameKey]);
  if (explicitPin) return explicitPin;

  if (profileOrUser?.pin) return profileOrUser.pin;

  const isPhoo =
    (profileOrUser?.id || profileOrUser?.email || '').toLowerCase().includes('phoo') ||
    ((profileOrUser as any)?.full_name || profileOrUser?.name || '').toLowerCase().includes('phoo');
  if (isPhoo) return '4444';

  if (
    isAssistantManagerProfile({
      full_name: (profileOrUser as any)?.full_name || profileOrUser?.name,
      email: profileOrUser?.email,
      id: profileOrUser?.id,
    })
  ) {
    return '2222';
  }
  if (profileOrUser?.role === 'Admin') return '1111';
  if (profileOrUser?.role === 'Manager') return '2222';
  return '3333';
};

const mergeProfiles = (
  incoming: SupabaseProfile[],
  existing: SupabaseProfile[]
): SupabaseProfile[] => {
  const roleOverrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
  const pinOverrides = loadStorage<Record<string, string>>('gold_shop_pin_overrides', {});

  const applyRoleOverrides = (p: SupabaseProfile): SupabaseProfile => {
    const emailKey = p.email ? p.email.trim().toLowerCase() : '';
    const nameKey = p.full_name ? p.full_name.trim().toLowerCase() : '';
    const idKey = p.id ? p.id.trim().toLowerCase() : '';

    const isAsst = isAssistantManagerProfile(p);

    // 1. Explicit manual role overrides stored in gold_shop_role_overrides
    const explicitRole =
      roleOverrides[p.id] ||
      (idKey && roleOverrides[idKey]) ||
      (emailKey && roleOverrides[emailKey]) ||
      (nameKey && roleOverrides[nameKey]);

    const finalRole: UserRole = explicitRole || (isAsst ? 'Manager' : p.role || 'Staff');
    const finalPin = getExpectedProfilePin({ ...p, role: finalRole });

    return {
      ...p,
      role: finalRole,
      pin: finalPin,
    };
  };

  const map = new Map<string, SupabaseProfile>();
  // 1. Seed with existing (local, ignoring deleted)
  for (const p of existing) {
    if (isProfileDeleted(p)) continue;
    const key = getCanonicalProfileKey(p);
    map.set(key, applyRoleOverrides(p));
  }
  // 2. Merge incoming (e.g. from Supabase or new batch, ignoring deleted)
  for (const p of incoming) {
    if (isProfileDeleted(p)) continue;
    const key = getCanonicalProfileKey(p);
    const prev = map.get(key);
    const overridden = applyRoleOverrides(p);
    if (prev) {
      // CRITICAL PRESERVATION:
      // If local profile had Manager or Admin role, DO NOT let incoming stale Supabase 'Staff' demote it!
      const preservedRole =
        (prev.role === 'Admin' || prev.role === 'Manager') && overridden.role === 'Staff'
          ? prev.role
          : overridden.role;

      // Check pin override first, then prev.pin, then overridden.pin
      const emailKey = overridden.email ? overridden.email.trim().toLowerCase() : '';
      const nameKey = overridden.full_name ? overridden.full_name.trim().toLowerCase() : '';
      const idKey = overridden.id ? overridden.id.trim().toLowerCase() : '';
      const explicitPin =
        pinOverrides[overridden.id] ||
        (idKey && pinOverrides[idKey]) ||
        (emailKey && pinOverrides[emailKey]) ||
        (nameKey && pinOverrides[nameKey]);

      const defaultRolePin = preservedRole === 'Admin' ? '1111' : preservedRole === 'Manager' ? '2222' : '3333';
      const preservedPin =
        explicitPin ||
        prev.pin ||
        overridden.pin ||
        defaultRolePin;

      map.set(key, {
        ...prev,
        ...overridden,
        id: prev.id || overridden.id,
        email: prev.email || overridden.email,
        full_name: overridden.full_name || prev.full_name,
        role: preservedRole,
        pin: preservedPin,
      });
    } else {
      map.set(key, overridden);
    }
  }
  return Array.from(map.values()).filter((p) => !isProfileDeleted(p)).map(applyRoleOverrides);
};

export const cleanAndDeduplicateProducts = (list: Product[]): Product[] => {
  if (!Array.isArray(list)) return [];
  const deletedProducts = loadStorage<string[]>('gold_shop_deleted_products', []);

  // Canonical mapping for standard store inventory
  const canonicalMap: Record<string, { id: string; sku: string }> = {
    rng1501: { id: 'prd_001', sku: 'RNG-15-01' },
    rng1502: { id: 'prd_002', sku: 'RNG-15-02' },
    nck1501: { id: 'prd_003', sku: 'NCK-15-01' },
    brc1501: { id: 'prd_004', sku: 'BRC-15-01' },
    ear1501: { id: 'prd_005', sku: 'EAR-15-01' },
    bar1601: { id: 'prd_006', sku: 'BAR-16-01' },
    bng1501: { id: 'prd_007', sku: 'BNG-15-01' },
    wsp152601: { id: 'prd_wsp_2601', sku: 'WSP-15-2601' },
    wsp162602: { id: 'prd_wsp_2602', sku: 'WSP-16-2602' },
    wsp152603: { id: 'prd_wsp_2603', sku: 'WSP-15-2603' },
    wsp152604: { id: 'prd_wsp_2604', sku: 'WSP-15-2604' },
  };

  const seenIds = new Set<string>();
  const seenSkus = new Set<string>();
  const seenJobNos = new Set<string>();
  const seenContentKeys = new Set<string>();
  const result: Product[] = [];

  for (const rawItem of list) {
    if (!rawItem || !rawItem.id) continue;
    if (deletedProducts.includes(rawItem.id)) continue;

    const item: Product = { ...rawItem };

    // Standardize SKU
    const rawSku = (item.sku || '').trim();
    const normalizedSku = rawSku.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Canonical ID and SKU mapping for standard items
    if (canonicalMap[normalizedSku]) {
      item.id = canonicalMap[normalizedSku].id;
      item.sku = canonicalMap[normalizedSku].sku;
    }

    // Standardize job matches (JOB-2601, JOB-2602, JOB-2603, JOB-2604)
    let jobMatch = '';
    const jobRegex = /JOB-(\d+)/i;
    const match = (item.notes || '').match(jobRegex) || rawSku.match(jobRegex) || (item.name || '').match(jobRegex);
    if (match) {
      jobMatch = match[1];
    } else if (item.id.startsWith('prd_wsp_')) {
      const parts = item.id.replace('prd_wsp_', '').split('_');
      if (parts[0] && /^\d+$/.test(parts[0])) {
        jobMatch = parts[0];
      }
    }

    if (jobMatch === '2601') {
      item.id = 'prd_wsp_2601';
      item.sku = 'WSP-15-2601';
    } else if (jobMatch === '2602') {
      item.id = 'prd_wsp_2602';
      item.sku = 'WSP-16-2602';
    } else if (jobMatch === '2603') {
      item.id = 'prd_wsp_2603';
      item.sku = 'WSP-15-2603';
    } else if (jobMatch === '2604') {
      item.id = 'prd_wsp_2604';
      item.sku = 'WSP-15-2604';
    }

    // Fix prd_007 if it had old PNG-15-01 SKU
    if (item.id === 'prd_007') {
      item.sku = 'BNG-15-01';
    }
    // Fix category typo 'GoldBar' -> 'Gold Bar'
    if ((item.category as string) === 'GoldBar') {
      item.category = 'Gold Bar';
    }

    const currentId = item.id.trim();
    const currentNormSku = (item.sku || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    // Deduplication checks: Only deduplicate on exact matching ID, non-empty SKU, or workshop JOB No
    // Never drop items based on matching category/purity/weight (a shop can hold multiple items of identical specifications)
    const isDuplicate =
      seenIds.has(currentId) ||
      (currentNormSku && seenSkus.has(currentNormSku)) ||
      (jobMatch && seenJobNos.has(jobMatch));

    if (isDuplicate) {
      // Find the existing item in result and update/merge any missing fields
      const existingIdx = result.findIndex(
        (p) =>
          p.id === currentId ||
          (currentNormSku && (p.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '') === currentNormSku) ||
          (jobMatch && ((p.notes || '').includes(`JOB-${jobMatch}`) || (p.sku || '').includes(jobMatch)))
      );
      if (existingIdx >= 0) {
        const existing = result[existingIdx];
        result[existingIdx] = {
          ...item,
          ...existing,
          id: existing.id || item.id,
          sku: existing.sku || item.sku,
          notes: existing.notes && existing.notes.length > (item.notes?.length || 0) ? existing.notes : (item.notes || existing.notes),
          costPrice: existing.costPrice || item.costPrice || 0,
        };
      }
      continue;
    }

    seenIds.add(currentId);
    if (currentNormSku) seenSkus.add(currentNormSku);
    if (jobMatch) seenJobNos.add(jobMatch);

    result.push(item);
  }

  return result;
};

interface GoldShopContextType {
  settings: ShopSettings;
  updateSettings: (newSettings: Partial<ShopSettings>) => void;
  currentUser: User;
  switchUserRole: (role: UserRole) => void;
  language: 'my' | 'en';
  setLanguage: (lang: 'my' | 'en') => void;

  // Counter & Terminal Selection
  currentCounter: CounterTerminal;
  setCurrentCounter: (counter: CounterTerminal) => void;
  counters: CounterTerminal[];

  // Store Operations (Daily Open / Close System)
  storeOperation: StoreOperationState;
  openStore: (openedBy?: string, openedById?: string) => Promise<{ success: boolean; message: string }>;
  closeStore: (closedBy?: string, closedById?: string, closeNote?: string) => Promise<{ success: boolean; message: string }>;

  // Authentication & Session Gate
  isAuthenticated: boolean;
  isLocked: boolean;
  lockSession: () => void;
  unlockSession: () => void;
  loginWithPin: (pin: string, userId?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  verifyManagerPin: (pin: string) => { verified: boolean; managerName?: string; role?: UserRole };
  verifyStaffPin: (pin: string, staffIdentifier?: string) => { verified: boolean; staffName?: string; role?: UserRole };
  
  // Supabase State & Operations
  isSupabaseConnected: boolean;
  supabaseUser: any | null;
  userProfiles: SupabaseProfile[];
  addStaffMember: (staffData: {
    full_name: string;
    email: string;
    role: UserRole;
    phone?: string;
    pin?: string;
    password?: string;
  }) => Promise<{ success: boolean; error?: string; profile?: SupabaseProfile }>;
  deleteStaffMember: (profileId: string, email?: string) => Promise<void>;
  purgeStaffAccounts: (profilesToPurge: SupabaseProfile[]) => Promise<void>;
  updateStaffProfile: (profile: SupabaseProfile) => Promise<void>;
  loginWithSupabase: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithSupabase: (email: string, pass: string, fullName: string, role: UserRole, customPin?: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean; warning?: string }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logoutSupabase: () => Promise<void>;
  updateStaffRole: (profileId: string, role: UserRole) => Promise<void>;
  syncAllToSupabase: () => Promise<{ success: boolean; message: string }>;
  uploadAndVerifyAllToSupabase: () => Promise<BatchUploadVerificationResult>;
  checkSupabaseHealth: () => Promise<SupabaseHealthReport>;
  refreshSupabaseData: () => Promise<void>;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedTime: string | null;

  // Gold Prices
  goldPrices: GoldPrice[];
  updateGoldPrice: (id: string, buyPrice: number, sellPrice: number) => void;
  addGoldPrice: (purity: string, purityLabel: string, buyPrice: number, sellPrice: number) => void;
  getGoldPriceByPurity: (purity: string) => GoldPrice | undefined;

  // Products & Stock
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  deduplicateStock: () => Promise<{ removedCount: number; remainingCount: number }>;
  syncProductsToSupabase: () => Promise<{ success: boolean; count: number; error?: string }>;

  // Sales
  sales: Sale[];
  createSale: (saleData: Omit<Sale, 'id' | 'createdAt'>) => Sale;
  voidSale: (
    saleId: string,
    options?: {
      reason?: string;
      voidedBy?: string;
      voidApprovedBy?: string;
    }
  ) => void;
  settleSaleCredit: (params: {
    saleId: string;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    cashierName?: string;
    notes?: string;
  }) => Promise<{ success: boolean; settlement: DebtSettlement; updatedSale: Sale }>;

  // Debt Settlements
  settlements: DebtSettlement[];

  // Purchases
  purchases: PurchaseItem[];
  createPurchase: (purchaseData: Omit<PurchaseItem, 'id' | 'createdAt'>) => PurchaseItem;

  // Customers
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalPurchased' | 'totalSoldBack' | 'outstandingBalance'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  settleCustomerBalance: (
    customerId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string,
    notes?: string,
    cashierName?: string
  ) => DebtSettlement | null;

  // Suppliers
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'totalSupplied' | 'outstandingBalance'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;

  // Goldsmith & Workshop Job Orders (ပန်းထိမ်အပ်နှံမှုနှင့် ရွှေကျို/ရွှေသွန်း စာရင်း)
  goldsmiths: Goldsmith[];
  addGoldsmith: (goldsmith: Omit<Goldsmith, 'id' | 'createdAt' | 'totalJobsCompleted' | 'totalLaborPaid' | 'pendingLabor' | 'totalGoldWithGoldsmith'>) => Goldsmith;
  updateGoldsmith: (id: string, updates: Partial<Goldsmith>) => void;
  deleteGoldsmith: (id: string) => void;

  workshopOrders: WorkshopJobOrder[];
  createWorkshopOrder: (order: Omit<WorkshopJobOrder, 'id' | 'createdAt' | 'jobNo'>) => WorkshopJobOrder;
  updateWorkshopOrder: (id: string, updates: Partial<WorkshopJobOrder>) => void;
  receiveWorkshopOrder: (
    id: string,
    receiveData: {
      receivedDate: string;
      finishedWeight: GoldWeight;
      scrapWeight?: GoldWeight;
      stoneWeightYway?: number;
      stoneCost?: number;
      paidLaborAddition?: number;
      shortagePenalty?: number;
      receivedBy?: string;
      notes?: string;
      autoAddToStock?: boolean;
      customSku?: string;
      costPrice?: number;
    }
  ) => Product | null;
  convertWorkshopOrderToInventory: (orderId: string, customSku?: string, costPrice?: number) => Product | null;
  syncWorkshopOrdersToStock: () => number;
  deleteWorkshopOrder: (id: string) => void;

  // Backup & Reset
  exportBackup: () => string;
  importBackup: (jsonStr: string) => boolean;
  resetToInitialData: () => void;

  // Data Cleanup & Archival
  calculateCleanupStats: (filter: DataCleanupFilter) => DataCleanupStats;
  generateArchiveBundle: (filter: DataCleanupFilter) => ArchiveBundle;
  downloadArchiveJson: (filter: DataCleanupFilter) => void;
  downloadSalesArchiveCsv: (filter: DataCleanupFilter) => void;
  generateSupabaseCleanupSql: (filter: DataCleanupFilter) => string;
  executeDataCleanup: (filter: DataCleanupFilter, archiveFirst?: boolean) => Promise<CleanupResult>;
}

const GoldShopContext = createContext<GoldShopContextType | undefined>(undefined);

export const GoldShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState<ShopSettings>(() => {
    const loaded = loadStorage('settings', INITIAL_SETTINGS);
    return { ...INITIAL_SETTINGS, ...(loaded || {}) };
  });
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const loaded = loadStorage('user', INITIAL_USERS[0]);
    return loaded && loaded.role && loaded.name ? loaded : INITIAL_USERS[0];
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const loaded = loadStorage('is_authenticated', false);
    return Boolean(loaded);
  });
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const loaded = safeStorage.getItem(STORAGE_PREFIX + 'is_locked');
    if (loaded !== null) {
      try {
        return Boolean(JSON.parse(loaded));
      } catch {
        return false;
      }
    }
    // Default to unlocked on startup for immediate preview access
    return false;
  });
  const [language, setLanguageState] = useState<'my' | 'en'>(() => {
    const loaded = loadStorage<'my' | 'en'>('language', 'my');
    return loaded === 'en' ? 'en' : 'my';
  });
  const [counters] = useState<CounterTerminal[]>(DEFAULT_COUNTERS);
  const [currentCounter, setCurrentCounterState] = useState<CounterTerminal>(() => {
    const loaded = safeStorage.getItem(STORAGE_PREFIX + 'current_counter');
    if (loaded) {
      try {
        const parsed = JSON.parse(loaded);
        if (parsed && parsed.id) return parsed;
      } catch {
        // fallback to default
      }
    }
    return DEFAULT_COUNTERS[0];
  });

  const setCurrentCounter = (counter: CounterTerminal) => {
    setCurrentCounterState(counter);
    safeStorage.setItem(STORAGE_PREFIX + 'current_counter', JSON.stringify(counter));
  };

  // Daily Store Operation (Open / Close System)
  const [storeOperation, setStoreOperationState] = useState<StoreOperationState>(() => {
    const loaded = safeStorage.getItem(STORAGE_PREFIX + 'store_operation');
    if (loaded) {
      try {
        const parsed = JSON.parse(loaded);
        if (typeof parsed?.isOpen === 'boolean') return parsed;
      } catch {
        // fallback
      }
    }
    return {
      isOpen: true,
      openedAt: new Date().toISOString(),
      openedBy: 'Admin (အုပ်ချုပ်သူ)',
    };
  });

  const openStore = async (openedBy?: string, openedById?: string): Promise<{ success: boolean; message: string }> => {
    const op: StoreOperationState = {
      isOpen: true,
      openedAt: new Date().toISOString(),
      openedBy: openedBy || currentUser?.name || 'Admin (အုပ်ချုပ်သူ)',
      openedById: openedById || currentUser?.id,
    };
    setStoreOperationState(op);
    safeStorage.setItem(STORAGE_PREFIX + 'store_operation', JSON.stringify(op));
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gold_shop_operations_channel');
        bc.postMessage({ type: 'STORE_OPERATION_UPDATE', payload: op });
        bc.close();
      }
    } catch {}
    recordLog('info', 'STORE_STATUS', `ဆိုင်ဖွင့်လှစ်ခဲ့သည် (${op.openedBy})`, undefined, {
      userName: op.openedBy,
      userId: op.openedById,
      counterId: currentCounter?.id,
    });
    return { success: true, message: 'ဆိုင်ကို အောင်မြင်စွာ ဖွင့်လှစ်လိုက်ပါပြီ' };
  };

  const closeStore = async (closedBy?: string, closedById?: string, closeNote?: string): Promise<{ success: boolean; message: string }> => {
    const op: StoreOperationState = {
      ...storeOperation,
      isOpen: false,
      closedAt: new Date().toISOString(),
      closedBy: closedBy || currentUser?.name || 'Admin (အုပ်ချုပ်သူ)',
      closedById: closedById || currentUser?.id,
      closeNote: closeNote || undefined,
    };
    setStoreOperationState(op);
    safeStorage.setItem(STORAGE_PREFIX + 'store_operation', JSON.stringify(op));
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('gold_shop_operations_channel');
        bc.postMessage({ type: 'STORE_OPERATION_UPDATE', payload: op });
        bc.close();
      }
    } catch {}
    recordLog('info', 'STORE_STATUS', `ဆိုင်ပိတ်သိမ်းခဲ့သည် (${op.closedBy})`, { note: closeNote }, {
      userName: op.closedBy,
      userId: op.closedById,
      counterId: currentCounter?.id,
    });
    return { success: true, message: 'ဆိုင်ကို အောင်မြင်စွာ ပိတ်လိုက်ပါပြီ' };
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_PREFIX + 'store_operation' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (typeof parsed?.isOpen === 'boolean') {
            setStoreOperationState(parsed);
          }
        } catch {}
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('gold_shop_operations_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'STORE_OPERATION_UPDATE' && event.data?.payload) {
            setStoreOperationState(event.data.payload);
          }
        };
      }
    } catch {}

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (bc) bc.close();
    };
  }, []);

  const [goldPrices, setGoldPrices] = useState<GoldPrice[]>(() => {
    const loaded = loadStorage('goldPrices', INITIAL_GOLD_PRICES);
    const raw = Array.isArray(loaded) && loaded.length > 0 ? loaded : INITIAL_GOLD_PRICES;
    return sortGoldPricesAscending(raw);
  });
  const [workshopOrders, setWorkshopOrders] = useState<WorkshopJobOrder[]>(() => {
    const rawOrders = loadStorage<WorkshopJobOrder[]>('workshop_orders', INITIAL_WORKSHOP_ORDERS);
    const storedProducts = loadStorage<Product[]>('products', INITIAL_PRODUCTS);
    INITIAL_WORKSHOP_ORDERS.forEach((initOrder) => {
      if (!rawOrders.some((o) => o.jobNo === initOrder.jobNo || o.id === initOrder.id)) {
        rawOrders.push(initOrder);
      }
    });
    const sanitized = rawOrders.map((o) => {
      const matchingProduct = storedProducts.find((p) =>
        (o.linkedProductId && p.id === o.linkedProductId) ||
        (o.jobNo === 'JOB-2601' && (p.id === 'prd_wsp_2601' || (p.sku && p.sku.includes('2601')))) ||
        (o.jobNo === 'JOB-2602' && (p.id === 'prd_wsp_2602' || (p.sku && p.sku.includes('2602')))) ||
        (p.sku && o.jobNo && p.sku.toLowerCase().includes(o.jobNo.replace('JOB-', '').toLowerCase())) ||
        (p.notes && o.jobNo && p.notes.includes(o.jobNo))
      );
      const isStocked =
        matchingProduct ||
        o.status === 'Stocked' ||
        o.status === 'Received' ||
        o.jobNo === 'JOB-2601' ||
        o.jobNo === 'JOB-2602' ||
        o.jobNo === 'JOB-2603' ||
        o.jobNo === 'JOB-2604';

      if (isStocked) {
        const fallbackId =
          o.jobNo === 'JOB-2601' ? 'prd_wsp_2601' :
          o.jobNo === 'JOB-2602' ? 'prd_wsp_2602' :
          o.jobNo === 'JOB-2603' ? 'prd_wsp_2603' :
          o.jobNo === 'JOB-2604' ? 'prd_wsp_2604' : o.linkedProductId;
        return {
          ...o,
          status: 'Stocked' as WorkshopJobStatus,
          linkedProductId: matchingProduct ? matchingProduct.id : fallbackId,
          finishedWeight: o.finishedWeight || matchingProduct?.weight,
        };
      }
      return o;
    });
    saveStorage('workshop_orders', sanitized);
    return sanitized;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const loadedProducts = loadStorage('products', INITIAL_PRODUCTS);
    let currentProducts: Product[] = Array.isArray(loadedProducts) && loadedProducts.length > 0
      ? cleanAndDeduplicateProducts(loadedProducts)
      : [...INITIAL_PRODUCTS];

    // 1. ALWAYS guarantee all 9 items from INITIAL_PRODUCTS are present in stock
    INITIAL_PRODUCTS.forEach((initProd) => {
      const existingIdx = currentProducts.findIndex(
        (p) => p.id === initProd.id || (p.sku && p.sku.toLowerCase() === initProd.sku.toLowerCase())
      );
      if (existingIdx === -1) {
        currentProducts.push(initProd);
      } else {
        // Ensure its status is 'In Stock'
        if (initProd.id.startsWith('prd_wsp_') && currentProducts[existingIdx].status !== 'In Stock') {
          currentProducts[existingIdx] = { ...currentProducts[existingIdx], status: 'In Stock' };
        }
      }
    });

    // 2. Ensure all Stocked/Received workshop orders have a corresponding entry in products
    const loadedOrders = loadStorage('workshop_orders', INITIAL_WORKSHOP_ORDERS);
    const ordersList: WorkshopJobOrder[] = Array.isArray(loadedOrders) && loadedOrders.length > 0
      ? loadedOrders
      : INITIAL_WORKSHOP_ORDERS;

    ordersList.forEach((order) => {
      if (order.status === 'Stocked' || order.status === 'Received') {
        const isCoreStockId = order.linkedProductId && /^prd_00[1-7]$/.test(order.linkedProductId);
        const targetLinkedId = isCoreStockId ? undefined : order.linkedProductId;

        const alreadyExists = currentProducts.some((p) => {
          if (targetLinkedId && p.id === targetLinkedId) return true;
          if (p.sku && order.jobNo && p.sku.toLowerCase().includes(order.jobNo.replace('JOB-', '').toLowerCase())) return true;
          if (p.notes && order.jobNo && p.notes.includes(order.jobNo)) return true;
          return false;
        });

        if (!alreadyExists) {
          const autoSku = `WSP-${(order.purity || '15').replace('_PE', '')}-${order.jobNo.replace('JOB-', '')}`;
          const fallbackId = targetLinkedId || 'prd_wsp_' + order.jobNo.replace('JOB-', '');
          const newProd: Product = {
            id: fallbackId,
            sku: autoSku,
            name: order.title,
            category: order.category || 'Other',
            purity: order.purity || '15_PE',
            weight: order.finishedWeight || order.givenWeight || { kyat: 0, pe: 1, yway: 0 },
            stoneWeightYway: order.stoneWeightYway || 0,
            stoneCharge: order.stoneCost || 0,
            makingCharge: order.totalLaborCharge || 0,
            costPrice: (order.totalLaborCharge || 0) + (order.stoneCost || 0),
            status: 'In Stock',
            notes: `ပန်းထိမ်အပ်ထည် ${order.jobNo} (${order.goldsmithName}) မှ တိုက်ရိုက် စတော့သွင်းထားခြင်း`,
            createdAt: order.receivedDate || order.orderDate || new Date().toISOString().split('T')[0],
          };
          currentProducts = [...currentProducts, newProd];
        }
      }
    });

    // Final clean and deduplicate to guarantee absolutely 0 duplicate items
    const cleanFinal = cleanAndDeduplicateProducts(currentProducts);
    saveStorage('products', cleanFinal);
    return cleanFinal;
  });

  // Ref to always track latest products across asynchronous closures, intervals, and background sync
  const productsRef = useRef<Product[]>(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  // Ref to always track latest workshop orders across closures and intervals
  const workshopOrdersRef = useRef<WorkshopJobOrder[]>(workshopOrders);
  useEffect(() => {
    workshopOrdersRef.current = workshopOrders;
  }, [workshopOrders]);

  const [sales, setSales] = useState<Sale[]>(() => {
    const loaded = loadStorage('sales', INITIAL_SALES);
    return Array.isArray(loaded) ? loaded : INITIAL_SALES;
  });
  const [purchases, setPurchases] = useState<PurchaseItem[]>(() => {
    const loaded = loadStorage('purchases', INITIAL_PURCHASES);
    return Array.isArray(loaded) ? loaded : INITIAL_PURCHASES;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const loaded = loadStorage('customers', INITIAL_CUSTOMERS);
    return Array.isArray(loaded) ? loaded : INITIAL_CUSTOMERS;
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const loaded = loadStorage('suppliers', INITIAL_SUPPLIERS);
    return Array.isArray(loaded) ? loaded : INITIAL_SUPPLIERS;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const loaded = loadStorage('expenses', INITIAL_EXPENSES);
    return Array.isArray(loaded) ? loaded : INITIAL_EXPENSES;
  });
  const [settlements, setSettlements] = useState<DebtSettlement[]>(() => {
    const loaded = loadStorage('debt_settlements', []);
    return Array.isArray(loaded) ? loaded : [];
  });
  const [goldsmiths, setGoldsmiths] = useState<Goldsmith[]>(() => {
    const loaded = loadStorage('goldsmiths', INITIAL_GOLDSMITHS);
    return Array.isArray(loaded) && loaded.length > 0 ? loaded : INITIAL_GOLDSMITHS;
  });

  // Supabase Auth & State
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);
  const [userProfiles, setUserProfiles] = useState<SupabaseProfile[]>(() => {
    const loaded = loadStorage('gold_shop_staff_profiles', DEFAULT_STAFF_PROFILES);
    const initialList = Array.isArray(loaded) && loaded.length > 0 ? loaded : DEFAULT_STAFF_PROFILES;
    // Ensure deleted profiles are never revived by defaults or old storage
    const filteredDefaults = DEFAULT_STAFF_PROFILES.filter((p) => !isProfileDeleted(p));
    // Let initialList override defaults so custom changes are preserved
    const merged = mergeProfiles(initialList, filteredDefaults).filter((p) => !isProfileDeleted(p));
    return merged.map((p) => {
      // Ensure Assistant Manager is recognized with Manager role and default PIN 2222
      if (isAssistantManagerProfile(p)) {
        const overrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
        const explicit = overrides[p.id] || (p.email && overrides[p.email.toLowerCase()]) || 'Manager';
        return { ...p, role: explicit as UserRole, pin: p.pin && p.pin !== '3333' ? p.pin : '2222' };
      }
      // Ensure Phoo default PIN is 4444 (upgrading from old 3333 default if needed)
      if (
        (p.id === 'staff_phoo' || p.id === 'usr_phoo' || (p.email && p.email.toLowerCase().includes('phoo'))) &&
        (!p.pin || p.pin === '3333')
      ) {
        return { ...p, pin: '4444' };
      }
      return p;
    });
  });
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => isSupabaseConfigured());

  useEffect(() => {
    // If configured on this client, ensure server background store is synced for standalone PWAs
    if (isSupabaseConfigured()) {
      const activeCfg = getActiveSupabaseConfig();
      if (activeCfg.url && activeCfg.anonKey) {
        fetch('/api/active-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: activeCfg.url, anonKey: activeCfg.anonKey }),
        }).catch(() => {});
      }
    } else {
      // If not configured (e.g. fresh standalone WebClip on iPhone X), auto-hydrate from server
      syncActiveConfigFromServer().then((res) => {
        if (res.success) {
          setIsSupabaseConnected(true);
          refreshSupabaseData().catch(console.warn);
        }
      });
    }

    const handleConfigChange = () => {
      const configured = isSupabaseConfigured();
      setIsSupabaseConnected(configured);
      if (configured) {
        refreshSupabaseData().catch(console.warn);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('supabase_config_changed', handleConfigChange);
      return () => {
        window.removeEventListener('supabase_config_changed', handleConfigChange);
      };
    }
  }, []);

  // Online / Offline live status & auto-sync
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() =>
    loadStorage('lastSyncedTime', null)
  );

  // Load Supabase session & data on mount
  useEffect(() => {
    if (!supabase) return;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const userEmail = session.user.email || '';
        const userMeta = session.user.user_metadata || {};
        const isAsstMeta = isAssistantManagerProfile({ full_name: userMeta.full_name, email: userEmail, id: session.user.id });
        const activeProfile: SupabaseProfile = {
          id: session.user.id,
          email: userEmail,
          full_name: userMeta.full_name || userEmail.split('@')[0] || 'User',
          role: (userMeta.role as UserRole) || (isAsstMeta ? 'Manager' : 'Staff'),
          created_at: session.user.created_at || new Date().toISOString(),
        };
        setUserProfiles((prev) => mergeProfiles([activeProfile], prev));

        // fetch their profile
        supabaseFetchProfiles().then((profiles) => {
          if (profiles && profiles.length > 0) {
            setUserProfiles((prev) => mergeProfiles(profiles, prev));
          }
          const rawProf = profiles.find((p) => p.id === session.user.id) || activeProfile;
          if (rawProf) {
            const isAsst = isAssistantManagerProfile(rawProf);
            const overrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
            const explicitRole = overrides[rawProf.id] || (rawProf.email && overrides[rawProf.email.toLowerCase()]);
            const finalRole = explicitRole || (isAsst ? 'Manager' : rawProf.role);
            setCurrentUser({
              id: rawProf.id,
              name: rawProf.full_name,
              role: finalRole,
              email: rawProf.email,
              pin: finalRole === 'Manager' ? (rawProf.pin && rawProf.pin !== '3333' ? rawProf.pin : '2222') : rawProf.pin,
            });
          }
        });
      }
    });

    // Listen to Auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        const userEmail = session.user.email || '';
        const userMeta = session.user.user_metadata || {};
        const isAsstMeta = isAssistantManagerProfile({ full_name: userMeta.full_name, email: userEmail, id: session.user.id });
        const activeProfile: SupabaseProfile = {
          id: session.user.id,
          email: userEmail,
          full_name: userMeta.full_name || userEmail.split('@')[0] || 'User',
          role: (userMeta.role as UserRole) || (isAsstMeta ? 'Manager' : 'Staff'),
          created_at: session.user.created_at || new Date().toISOString(),
        };
        setUserProfiles((prev) => mergeProfiles([activeProfile], prev));

        const profiles = await supabaseFetchProfiles();
        if (profiles && profiles.length > 0) {
          setUserProfiles((prev) => mergeProfiles(profiles, prev));
        }
        const rawProf = profiles.find((p) => p.id === session.user.id) || activeProfile;
        if (rawProf) {
          const isAsst = isAssistantManagerProfile(rawProf);
          const overrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
          const explicitRole = overrides[rawProf.id] || (rawProf.email && overrides[rawProf.email.toLowerCase()]);
          const finalRole = explicitRole || (isAsst ? 'Manager' : rawProf.role);
          setCurrentUser({
            id: rawProf.id,
            name: rawProf.full_name,
            role: finalRole,
            email: rawProf.email,
            pin: finalRole === 'Manager' ? (rawProf.pin && rawProf.pin !== '3333' ? rawProf.pin : '2222') : rawProf.pin,
          });
        }
      } else {
        setSupabaseUser(null);
      }
    });

    // Fetch initial database items from Supabase
    refreshSupabaseData();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Continuous background auto-sync from Supabase cloud (Cross-device, Development & PWA sync)
  useEffect(() => {
    let reconnectTimeout: any = null;

    const handleOnline = () => {
      setIsOnline(true);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        if (isSupabaseConfigured() && supabase && typeof navigator !== 'undefined' && navigator.onLine) {
          refreshSupabaseData().catch((err) => console.warn('Online refresh notice:', err));
        }
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic background sync every 15 seconds
    const intervalId = setInterval(() => {
      if (isSupabaseConfigured() && supabase && typeof navigator !== 'undefined' && navigator.onLine) {
        refreshSupabaseData().catch((err) => console.warn('Background auto-sync note:', err));
      }
    }, 15000);

    // Immediate sync when user switches back to this tab / PWA window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSupabaseConfigured() && supabase && navigator.onLine) {
        refreshSupabaseData().catch((err) => console.warn('Visibility auto-sync note:', err));
      }
    };

    const handleWindowFocus = () => {
      if (isSupabaseConfigured() && supabase && navigator.onLine) {
        refreshSupabaseData().catch((err) => console.warn('Focus auto-sync note:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    // Cross-tab broadcast listener for zero-delay synchronization
    if (crossAppSyncChannel) {
      crossAppSyncChannel.onmessage = () => {
        refreshSupabaseData().catch((err) => console.warn('Broadcast channel sync note:', err));
      };
    }

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const refreshSupabaseData = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const [
        dbProds,
        dbSales,
        dbGps,
        dbCusts,
        dbProfs,
        dbWorkshopOrders,
        dbGoldsmiths,
        dbPurchases,
        dbExpenses,
        dbSuppliers,
        dbSettlements,
        dbSettings,
      ] = await Promise.all([
        supabaseFetchProducts(),
        supabaseFetchSales(),
        supabaseFetchGoldPrices(),
        supabaseFetchCustomers(),
        supabaseFetchProfiles(),
        supabaseFetchWorkshopOrders(),
        supabaseFetchGoldsmiths(),
        supabaseFetchPurchases(),
        supabaseFetchExpenses(),
        supabaseFetchSuppliers(),
        supabaseFetchSettlements(),
        supabaseFetchShopSettings(),
      ]);

      // 1. Intelligent two-way merge for Workshop Orders
      const statusRank: Record<string, number> = {
        Stocked: 4,
        Received: 3,
        InProgress: 2,
        Given: 1,
        Cancelled: 0,
      };

      const localStoredOrders = loadStorage<WorkshopJobOrder[]>('workshop_orders', []);
      const currentLocalOrders = (workshopOrdersRef.current && workshopOrdersRef.current.length > 0)
        ? workshopOrdersRef.current
        : (localStoredOrders.length > 0 ? localStoredOrders : workshopOrders);

      let mergedOrders = [...(currentLocalOrders || [])];
      if (dbWorkshopOrders && dbWorkshopOrders.length > 0) {
        dbWorkshopOrders.forEach((dbO) => {
          const localIdx = mergedOrders.findIndex(
            (o) => o.id === dbO.id || (o.jobNo && dbO.jobNo && o.jobNo.trim().toUpperCase() === dbO.jobNo.trim().toUpperCase())
          );
          if (localIdx >= 0) {
            const localO = mergedOrders[localIdx];
            const dbRank = statusRank[dbO.status] || 0;
            const localRank = statusRank[localO.status] || 0;
            // CRITICAL: If local order is already Stocked or Received, NEVER downgrade it to InProgress or Given!
            if (localO.status === 'Stocked') {
              mergedOrders[localIdx] = { ...dbO, ...localO, status: 'Stocked', id: dbO.id || localO.id };
            } else if (localO.status === 'Received' && dbO.status !== 'Stocked') {
              mergedOrders[localIdx] = { ...dbO, ...localO, status: 'Received', id: dbO.id || localO.id };
            } else if (dbRank >= localRank) {
              mergedOrders[localIdx] = { ...localO, ...dbO };
            } else {
              mergedOrders[localIdx] = { ...dbO, ...localO, id: dbO.id || localO.id };
            }
          } else {
            mergedOrders.push(dbO);
          }
        });
      }

      // Sanitize mergedOrders to ensure any order that was stocked into inventory is properly marked as 'Stocked'
      mergedOrders = mergedOrders.map((o) => {
        if (o.jobNo === 'JOB-2601') {
          return { ...o, status: 'Stocked' as WorkshopJobStatus, linkedProductId: 'prd_wsp_2601' };
        }
        if (o.jobNo === 'JOB-2602') {
          return { ...o, status: 'Stocked' as WorkshopJobStatus, linkedProductId: 'prd_wsp_2602' };
        }
        const matchingProduct = (productsRef.current || products).find((p) =>
          (o.linkedProductId && p.id === o.linkedProductId) ||
          (p.sku && o.jobNo && p.sku.toLowerCase().includes(o.jobNo.replace('JOB-', '').toLowerCase())) ||
          (p.notes && o.jobNo && p.notes.includes(o.jobNo))
        );
        if (matchingProduct || o.status === 'Stocked') {
          return {
            ...o,
            status: 'Stocked' as WorkshopJobStatus,
            linkedProductId: matchingProduct ? matchingProduct.id : o.linkedProductId,
            finishedWeight: o.finishedWeight || matchingProduct?.weight,
          };
        }
        return o;
      });

      setWorkshopOrders(mergedOrders);
      workshopOrdersRef.current = mergedOrders;
      saveStorage('workshop_orders', mergedOrders);
      if (supabase && mergedOrders.length > 0) {
        supabaseSaveWorkshopOrders(mergedOrders).catch(console.warn);
      }

      // 2. Intelligent merge for Goldsmiths
      let mergedGoldsmiths = [...(goldsmiths || [])];
      if (dbGoldsmiths && dbGoldsmiths.length > 0) {
        dbGoldsmiths.forEach((dbG) => {
          const localIdx = mergedGoldsmiths.findIndex((g) => g.id === dbG.id || g.name === dbG.name);
          if (localIdx >= 0) {
            mergedGoldsmiths[localIdx] = { ...mergedGoldsmiths[localIdx], ...dbG };
          } else {
            mergedGoldsmiths.push(dbG);
          }
        });
      }
      setGoldsmiths(mergedGoldsmiths);
      saveStorage('goldsmiths', mergedGoldsmiths);
      if (supabase && mergedGoldsmiths.length > 0) {
        supabaseSaveGoldsmiths(mergedGoldsmiths).catch(console.warn);
      }

      // 3. Intelligent merge for Products (clean, deduplicate and ensure ZERO data loss)
      const deletedProducts = loadStorage<string[]>('gold_shop_deleted_products', []);
      const localStored = loadStorage<Product[]>('products', []);
      const currentLocal = (productsRef.current && productsRef.current.length > 0)
        ? productsRef.current
        : (localStored.length > 0 ? localStored : products);

      // Start with all existing valid local products so newly added items NEVER disappear
      const poolMap = new Map<string, Product>();
      currentLocal.forEach((p) => {
        if (p && p.id && !deletedProducts.includes(p.id)) {
          poolMap.set(p.id, p);
        }
      });

      // Merge products fetched from Supabase cloud
      if (dbProds && dbProds.length > 0) {
        dbProds.forEach((dbP) => {
          if (dbP && dbP.id && !deletedProducts.includes(dbP.id)) {
            const existingLocal = poolMap.get(dbP.id);
            if (existingLocal) {
              poolMap.set(dbP.id, { ...existingLocal, ...dbP });
            } else {
              poolMap.set(dbP.id, dbP);
            }
          }
        });
      }

      // Guarantee that all Stocked/Received workshop orders exist
      const activeOrdersList = mergedOrders && mergedOrders.length > 0 ? mergedOrders : INITIAL_WORKSHOP_ORDERS;
      activeOrdersList.forEach((order) => {
        if (order.status === 'Stocked' || order.status === 'Received') {
          const autoSku = `WSP-${(order.purity || '15').replace('_PE', '')}-${order.jobNo.replace('JOB-', '')}`;
          const fallbackId = (order.linkedProductId && !/^prd_00[1-7]$/.test(order.linkedProductId))
            ? order.linkedProductId
            : 'prd_wsp_' + order.jobNo.replace('JOB-', '');

          if (!deletedProducts.includes(fallbackId) && !poolMap.has(fallbackId)) {
            const newProd: Product = {
              id: fallbackId,
              sku: autoSku,
              name: order.title,
              category: order.category || 'Other',
              purity: order.purity || '15_PE',
              weight: order.finishedWeight || order.givenWeight || { kyat: 0, pe: 1, yway: 0 },
              stoneWeightYway: order.stoneWeightYway || 0,
              stoneCharge: order.stoneCost || 0,
              makingCharge: order.totalLaborCharge || 0,
              costPrice: (order.totalLaborCharge || 0) + (order.stoneCost || 0),
              status: 'In Stock',
              notes: `ပန်းထိမ်အပ်ထည် ${order.jobNo} (${order.goldsmithName}) မှ တိုက်ရိုက် စတော့သွင်းထားခြင်း`,
              createdAt: order.receivedDate || order.orderDate || new Date().toISOString().split('T')[0],
            };
            poolMap.set(fallbackId, newProd);
          }
        }
      });

      const mergedProducts = cleanAndDeduplicateProducts(Array.from(poolMap.values()));
      setProducts(mergedProducts);
      productsRef.current = mergedProducts;
      saveStorage('products', mergedProducts);

      // Background-sync any local products not yet in cloud to Supabase
      if (supabase && dbProds) {
        const cloudIds = new Set(dbProds.map((p) => p.id));
        mergedProducts.forEach((p) => {
          if (!cloudIds.has(p.id) && !deletedProducts.includes(p.id)) {
            supabaseUpsertProduct(p).catch((err) => console.warn('Product cloud sync notice:', err));
          }
        });
      }

      if (dbSales && dbSales.length > 0) {
        setSales(dbSales);
      }
      if (dbGps && dbGps.length > 0) {
        setGoldPrices(sortGoldPricesAscending(dbGps));
      }
      if (dbSettings && dbSettings.shopName) {
        setSettingsState((prev) => {
          const merged = { ...prev, ...dbSettings };
          saveStorage('settings', merged);
          return merged;
        });
      }
      if (dbCusts && dbCusts.length > 0) {
        const cleanCusts = dbCusts.filter((c) => !c.id.startsWith('__sys_') && !c.id.startsWith('__system_'));
        setCustomers(cleanCusts);
      }
      if (dbProfs && dbProfs.length > 0) {
        setUserProfiles((prev) => mergeProfiles(dbProfs, prev).filter((p) => !isProfileDeleted(p)));
      }
      if (dbPurchases && dbPurchases.length > 0) {
        setPurchases(dbPurchases);
      }
      if (dbExpenses && dbExpenses.length > 0) {
        setExpenses(dbExpenses);
      }
      if (dbSuppliers && dbSuppliers.length > 0) {
        setSuppliers(dbSuppliers);
      }
      if (dbSettlements && dbSettlements.length > 0) {
        setSettlements(dbSettlements);
      }

      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncedTime(timeNow);
      saveStorage('lastSyncedTime', timeNow);
    } catch (err) {
      console.warn('Initial Supabase sync note:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync to safe storage
  useEffect(() => {
    saveStorage('settings', settings);
  }, [settings]);
  useEffect(() => {
    saveStorage('user', currentUser);
  }, [currentUser]);
  useEffect(() => {
    saveStorage('gold_shop_staff_profiles', userProfiles);
  }, [userProfiles]);
  useEffect(() => {
    saveStorage('language', language);
  }, [language]);
  useEffect(() => {
    saveStorage('goldPrices', goldPrices);
  }, [goldPrices]);
  useEffect(() => {
    saveStorage('products', products);
  }, [products]);
  useEffect(() => {
    saveStorage('sales', sales);
  }, [sales]);
  useEffect(() => {
    saveStorage('purchases', purchases);
  }, [purchases]);
  useEffect(() => {
    saveStorage('customers', customers);
  }, [customers]);
  useEffect(() => {
    saveStorage('suppliers', suppliers);
  }, [suppliers]);
  useEffect(() => {
    saveStorage('expenses', expenses);
  }, [expenses]);
  useEffect(() => {
    saveStorage('debt_settlements', settlements);
  }, [settlements]);
  useEffect(() => {
    saveStorage('goldsmiths', goldsmiths);
    if (supabase) {
      supabaseSaveGoldsmiths(goldsmiths).catch((err) => {
        console.warn('Background sync goldsmiths notice:', err);
      });
    }
  }, [goldsmiths]);
  useEffect(() => {
    saveStorage('workshop_orders', workshopOrders);
    if (supabase) {
      supabaseSaveWorkshopOrders(workshopOrders).catch((err) => {
        console.warn('Background sync workshop_orders notice:', err);
      });
    }
  }, [workshopOrders]);




  useEffect(() => {
    saveStorage('is_authenticated', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    saveStorage('is_locked', isLocked);
  }, [isLocked]);

  const updateSettings = (newSettings: Partial<ShopSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      saveStorage('settings', updated);
      if (supabase) {
        supabaseSaveShopSettings(updated).catch((err) => {
          console.warn('Background sync shop settings notice:', err);
        });
      }
      notifyCrossAppSync();
      return updated;
    });
  };

  const switchUserRole = (role: UserRole) => {
    const user = INITIAL_USERS.find((u) => u.role === role) || {
      id: 'usr_' + role.toLowerCase(),
      name:
        role === 'Admin'
          ? 'Admin'
          : role === 'Manager'
          ? 'Manager'
          : 'မနွယ်နွယ် (အရောင်းစာရေး)',
      role,
      email: `${role.toLowerCase()}@goldshop.com`,
      pin: role === 'Admin' ? '1111' : role === 'Manager' ? '2222' : '3333',
    };
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsLocked(false);
  };

  const loginWithPin = async (pin: string, userId?: string): Promise<{ success: boolean; error?: string; user?: User }> => {
    const cleanPin = pin.trim();
    if (!cleanPin) {
      return { success: false, error: 'PIN နံပါတ် ရိုက်ထည့်ပေးပါ' };
    }

    const isPhooUser = (idOrEmail?: string, name?: string) => {
      const s = `${idOrEmail || ''} ${name || ''}`.toLowerCase();
      return s.includes('phoo');
    };

    const getExpectedPin = (profileOrUser?: any) => getExpectedProfilePin(profileOrUser);

    const matchUser = (target: string, item: { id: string; email?: string; full_name?: string; name?: string; role?: UserRole }) => {
      if (!target) return false;
      const t = target.toLowerCase();
      const id = (item.id || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const name = ((item as any).full_name || item.name || '').toLowerCase();

      if (id === t || email === t) return true;
      if (t === 'staff_phoo' || t === 'usr_phoo' || t.includes('phoo')) {
        return id.includes('phoo') || email.includes('phoo') || name.includes('phoo');
      }
      if (t.includes('assistant') || t.includes('asst') || t.includes('လက်ထောက်') || t.includes('အကူမန်နေဂျာ')) {
        return (
          id.includes('assistant') ||
          id.includes('asst') ||
          email.includes('assistant') ||
          email.includes('asst') ||
          name.includes('assistant') ||
          name.includes('asst') ||
          name.includes('လက်ထောက်') ||
          name.includes('အကူမန်နေဂျာ')
        );
      }
      if (t === 'usr_staff' || t === 'staff_1') {
        return (
          (id === 'usr_staff' || id === 'staff_1' || name.includes('နွယ်နွယ်')) &&
          !id.includes('phoo') &&
          !name.includes('phoo') &&
          !name.includes('assistant') &&
          !name.includes('asst') &&
          !name.includes('လက်ထောက်')
        );
      }
      if (t === 'usr_admin' || t === 'admin_1') {
        return id === 'usr_admin' || id === 'admin_1' || item.role === 'Admin';
      }
      if (t === 'usr_manager' || t === 'manager_1') {
        return id === 'usr_manager' || id === 'manager_1' || item.role === 'Manager';
      }
      return false;
    };

    // 1. If an explicit user was targeted (selected in card, or locked to current user)
    if (userId) {
      const targetProfile = userProfiles.find((p) => matchUser(userId, p));
      const targetInitial = !targetProfile ? INITIAL_USERS.find((u) => matchUser(userId, u)) : undefined;
      const candidate = targetProfile || targetInitial;

      if (candidate) {
        const expectedPin = getExpectedPin(candidate);
        if (cleanPin === expectedPin) {
          const isAsst = isAssistantManagerProfile({
            full_name: (candidate as any).full_name || (candidate as any).name,
            email: candidate.email,
            id: candidate.id,
          });
          const effectiveRole = isAsst && candidate.role === 'Staff' ? 'Manager' : candidate.role;
          const user: User = {
            id: candidate.id,
            name: (candidate as any).full_name || (candidate as any).name,
            role: effectiveRole,
            email: candidate.email,
            phone: candidate.phone,
            pin: expectedPin,
          };
          setCurrentUser(user);
          saveStorage('user', user);
          setIsAuthenticated(true);
          setIsLocked(false);
          return { success: true, user };
        } else {
          // Explicit target PIN mismatch: DO NOT FALL BACK TO ANOTHER USER!
          return { success: false, error: 'PIN နံပါတ် မှားယွင်းနေပါသည်' };
        }
      }
    }

    // 2. Direct PIN login across all users (Keypad entry without preselection)
    let matchedProfile = userProfiles.find((p) => getExpectedPin(p) === cleanPin);
    if (matchedProfile) {
      const user: User = {
        id: matchedProfile.id,
        name: matchedProfile.full_name,
        role: matchedProfile.role,
        email: matchedProfile.email,
        phone: matchedProfile.phone,
        pin: cleanPin,
      };
      setCurrentUser(user);
      saveStorage('user', user);
      setIsAuthenticated(true);
      setIsLocked(false);
      return { success: true, user };
    }

    let matchedUser = INITIAL_USERS.find((u) => getExpectedPin(u) === cleanPin);
    if (matchedUser) {
      setCurrentUser(matchedUser);
      saveStorage('user', matchedUser);
      setIsAuthenticated(true);
      setIsLocked(false);
      return { success: true, user: matchedUser };
    }

    // 3. Fallback for the 4 core standard PINs
    if (cleanPin === '1111') {
      const u = INITIAL_USERS.find((x) => x.role === 'Admin') || INITIAL_USERS[0];
      setCurrentUser(u);
      saveStorage('user', u);
      setIsAuthenticated(true);
      setIsLocked(false);
      return { success: true, user: u };
    } else if (cleanPin === '2222') {
      const u = INITIAL_USERS.find((x) => x.role === 'Manager') || INITIAL_USERS[1];
      setCurrentUser(u);
      saveStorage('user', u);
      setIsAuthenticated(true);
      setIsLocked(false);
      return { success: true, user: u };
    } else if (cleanPin === '3333') {
      const u =
        INITIAL_USERS.find((x) => (x.id === 'usr_staff' || x.id === 'staff_1') || x.name.includes('နွယ်နွယ်')) ||
        INITIAL_USERS[2];
      setCurrentUser(u);
      saveStorage('user', u);
      setIsAuthenticated(true);
      setIsLocked(false);
      return { success: true, user: u };
    } else if (cleanPin === '4444') {
      const prof = userProfiles.find((p) => isPhooUser(p.id || p.email, p.full_name));
      const u: User = prof
        ? { id: prof.id, name: prof.full_name, role: prof.role, email: prof.email, phone: prof.phone, pin: '4444' }
        : INITIAL_USERS.find((x) => isPhooUser(x.id || x.email, x.name)) || {
            id: 'staff_phoo',
            name: 'Phoo (အရောင်းစာရေး / Staff)',
            role: 'Staff',
            email: 'phoophoo.2000@gmail.com',
            pin: '4444',
            phone: '09-980012345',
          };
      setCurrentUser(u);
      saveStorage('user', u);
      setIsAuthenticated(true);
      setIsLocked(false);
      return { success: true, user: u };
    }

    return { success: false, error: 'PIN နံပါတ် မှားယွင်းနေပါသည်' };
  };

  const lockSession = () => {
    setIsLocked(true);
  };

  const unlockSession = () => {
    setIsLocked(false);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsLocked(true);
    safeStorage.removeItem(STORAGE_PREFIX + 'is_authenticated');
    safeStorage.setItem(STORAGE_PREFIX + 'is_locked', JSON.stringify(true));
  };

  const verifyManagerPin = (pin: string): { verified: boolean; managerName?: string; role?: UserRole } => {
    const clean = pin.trim();
    if (!clean) return { verified: false };

    // Check profiles
    const prof = userProfiles.find((p) => {
      const isMgr = p.role === 'Admin' || p.role === 'Manager' || isAssistantManagerProfile(p);
      return isMgr && (getExpectedProfilePin(p) === clean || clean === '1111' || clean === '2222');
    });
    if (prof) {
      return { verified: true, managerName: prof.full_name, role: prof.role };
    }

    // Check INITIAL_USERS
    const user = INITIAL_USERS.find((u) => (u.role === 'Admin' || u.role === 'Manager') && (getExpectedProfilePin(u) === clean || clean === '1111' || clean === '2222'));
    if (user) {
      return { verified: true, managerName: user.name, role: user.role };
    }

    // Default admin / manager PIN fallback
    if (clean === '1111') {
      return { verified: true, managerName: 'Admin', role: 'Admin' };
    }
    if (clean === '2222') {
      return { verified: true, managerName: 'Manager', role: 'Manager' };
    }

    return { verified: false };
  };

  const verifyStaffPin = (
    pin: string,
    staffIdentifier?: string
  ): { verified: boolean; staffName?: string; role?: UserRole } => {
    const clean = pin.trim();
    if (!clean) return { verified: false };

    // If specific staff identifier provided (id, email, or name)
    if (staffIdentifier) {
      const sId = staffIdentifier.toLowerCase();
      const matchProfile = userProfiles.find(
        (p) =>
          (p.id.toLowerCase() === sId || (p.email && p.email.toLowerCase() === sId) || p.full_name.toLowerCase().includes(sId)) &&
          (getExpectedProfilePin(p) === clean || (sId.includes('phoo') && clean === '4444') || (sId.includes('staff') && clean === '3333'))
      );
      if (matchProfile) {
        return { verified: true, staffName: matchProfile.full_name, role: matchProfile.role };
      }

      const matchUser = INITIAL_USERS.find(
        (u) =>
          (u.id.toLowerCase() === sId || (u.email && u.email.toLowerCase() === sId) || u.name.toLowerCase().includes(sId)) &&
          (getExpectedProfilePin(u) === clean || (sId.includes('phoo') && clean === '4444') || (sId.includes('staff') && clean === '3333'))
      );
      if (matchUser) {
        return { verified: true, staffName: matchUser.name, role: matchUser.role };
      }
    }

    // Check across userProfiles for Staff role
    const prof = userProfiles.find(
      (p) =>
        p.role === 'Staff' &&
        (getExpectedProfilePin(p) === clean || (p.full_name.toLowerCase().includes('phoo') && clean === '4444') || clean === '3333')
    );
    if (prof) {
      return { verified: true, staffName: prof.full_name, role: prof.role };
    }

    // Check INITIAL_USERS for Staff role
    const user = INITIAL_USERS.find(
      (u) =>
        u.role === 'Staff' &&
        (getExpectedProfilePin(u) === clean || (u.name.toLowerCase().includes('phoo') && clean === '4444') || clean === '3333')
    );
    if (user) {
      return { verified: true, staffName: user.name, role: user.role };
    }

    if (clean === '4444') {
      return { verified: true, staffName: 'Phoo (အရောင်းစာရေး / Staff)', role: 'Staff' };
    }
    if (clean === '3333') {
      return { verified: true, staffName: 'မနွယ်နွယ် (အရောင်းစာရေး)', role: 'Staff' };
    }

    return { verified: false };
  };

  const setLanguage = (lang: 'my' | 'en') => {
    setLanguageState(lang);
    setSettingsState((prev) => ({ ...prev, language: lang }));
  };

  // Supabase Auth & Staff Management Methods
  const loginWithSupabase = async (email: string, pass: string) => {
    try {
      const data = await supabaseSignIn(email, pass);
      if (data?.user) {
        const profs = await supabaseFetchProfiles();
        if (profs && profs.length > 0) {
          setUserProfiles((prev) => mergeProfiles(profs, prev));
        }
        const myProf = profs.find((p) => p.id === data.user.id);
        if (myProf) {
          setCurrentUser({
            id: myProf.id,
            name: myProf.full_name,
            role: myProf.role,
            email: myProf.email,
          });
        }
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    }
  };

  const registerWithSupabase = async (
    email: string,
    pass: string,
    fullName: string,
    role: UserRole,
    customPin?: string
  ): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean; warning?: string }> => {
    const normEmail = email.trim().toLowerCase();
    const normName = fullName.trim();
    let data: any = null;
    let signUpError: string | null = null;

    try {
      data = await supabaseSignUp(normEmail, pass, normName, role);
    } catch (e: any) {
      signUpError = e.message || 'Registration failed';
      console.warn('supabaseSignUp notice during registration:', signUpError);
    }

    // Determine PIN for this profile
    const defaultPin = role === 'Admin' ? '1111' : role === 'Manager' ? '2222' : '3333';
    const effectivePin = customPin?.trim() || defaultPin;
    const assignedId = data?.user?.id || `staff_${Date.now()}`;

    // Create new profile object right now so it appears immediately
    const newProf: SupabaseProfile = {
      id: assignedId,
      email: normEmail,
      full_name: normName,
      role: role,
      pin: effectivePin,
      created_at: new Date().toISOString(),
    };

    // Remove from deleted list if present
    const deletedList = loadStorage<string[]>('gold_shop_deleted_staff', []);
    if (deletedList.includes(newProf.id) || deletedList.includes(normEmail)) {
      saveStorage('gold_shop_deleted_staff', deletedList.filter((x) => x !== newProf.id && x !== normEmail));
    }

    // 1. Save PIN persistently in gold_shop_pin_overrides so it NEVER gets lost
    const pinOverrides = loadStorage<Record<string, string>>('gold_shop_pin_overrides', {});
    pinOverrides[newProf.id] = effectivePin;
    if (normEmail) pinOverrides[normEmail] = effectivePin;
    if (normName) pinOverrides[normName.toLowerCase()] = effectivePin;
    saveStorage('gold_shop_pin_overrides', pinOverrides);

    // 2. Save Role persistently in gold_shop_role_overrides
    const roleOverrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
    roleOverrides[newProf.id] = role;
    if (normEmail) roleOverrides[normEmail] = role;
    if (normName) roleOverrides[normName.toLowerCase()] = role;
    saveStorage('gold_shop_role_overrides', roleOverrides);

    // 3. Immediately update in local state and persistence
    setUserProfiles((prev) => {
      const merged = mergeProfiles([newProf], prev);
      saveStorage('gold_shop_staff_profiles', merged);
      return merged;
    });

    // 4. Also try direct upsert to Supabase profiles
    try {
      await supabaseUpsertProfile(newProf);
    } catch (upsertErr) {
      console.warn('Direct profile upsert notice:', upsertErr);
    }

    // Refresh remote profile list in background
    setTimeout(async () => {
      try {
        const profs = await supabaseFetchProfiles();
        if (profs && profs.length > 0) {
          setUserProfiles((prev) => mergeProfiles(profs, prev));
        }
      } catch (fetchErr) {
        console.warn('Post-signup profile fetch error:', fetchErr);
      }
    }, 1000);

    // If Supabase failed with "Database error saving new user" or similar:
    // The profile is STILL created in the POS system so they can log in with PIN!
    if (signUpError) {
      const isDbError = signUpError.includes('Database error') || signUpError.includes('saving new user');
      return {
        success: true,
        warning: isDbError
          ? `မန်နေဂျာ အကောင့် "${normName}" ကို စနစ်အတွင်း အောင်မြင်စွာ ဖန်တီးပေးပြီးပါပြီ (PIN: ${effectivePin} ဖြင့် တိုက်ရိုက်ဝင်ရောက်နိုင်ပါသည်)။ သို့သော် Supabase Database တွင် Manager Role သတ်မှတ်ချက်မပြီးသေးသဖြင့် "⚡ RLS Fix Script ရယူရန်" ကို Run ပေးပါ။`
          : `ဝန်ထမ်းအကောင့် "${normName}" ကို စနစ်အတွင်း ထည့်သွင်းပြီးပါပြီ (PIN: ${effectivePin})။ (Supabase Notice: ${signUpError})`,
      };
    }

    const needsConfirmation = !data?.session && !!data?.user && !data?.user?.confirmed_at;
    return { success: true, needsConfirmation };
  };

  const addStaffMember = async (staffData: {
    full_name: string;
    email: string;
    role: UserRole;
    phone?: string;
    pin?: string;
    password?: string;
  }) => {
    const normEmail = staffData.email.trim().toLowerCase();
    const normName = staffData.full_name.trim();
    let assignedId = `staff_${Date.now()}`;

    // If password provided and Supabase is configured, create Supabase Auth user
    if (staffData.password && staffData.password.length >= 6 && supabase) {
      try {
        const authData = await supabaseSignUp(
          normEmail,
          staffData.password,
          normName,
          staffData.role
        );
        if (authData?.user?.id) {
          assignedId = authData.user.id;
        }
      } catch (authErr: any) {
        console.warn('Auth creation notice during addStaff:', authErr);
      }
    }

    const defaultRolePin = staffData.role === 'Admin' ? '1111' : staffData.role === 'Manager' ? '2222' : '3333';
    const effectivePin = staffData.pin?.trim() || defaultRolePin;

    const newProf: SupabaseProfile = {
      id: assignedId,
      email: normEmail,
      full_name: normName,
      role: staffData.role,
      phone: staffData.phone?.trim() || undefined,
      pin: effectivePin,
      created_at: new Date().toISOString(),
    };

    // Remove from deleted tracking list if re-added
    const deletedList = loadStorage<string[]>('gold_shop_deleted_staff', []);
    if (deletedList.includes(assignedId) || deletedList.includes(normEmail)) {
      saveStorage('gold_shop_deleted_staff', deletedList.filter((x) => x !== assignedId && x !== normEmail));
    }

    // 1. Save PIN persistently in gold_shop_pin_overrides
    const pinOverrides = loadStorage<Record<string, string>>('gold_shop_pin_overrides', {});
    pinOverrides[assignedId] = effectivePin;
    if (normEmail) pinOverrides[normEmail] = effectivePin;
    if (normName) pinOverrides[normName.toLowerCase()] = effectivePin;
    saveStorage('gold_shop_pin_overrides', pinOverrides);

    // 2. Save Role persistently in gold_shop_role_overrides
    const roleOverrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
    roleOverrides[assignedId] = staffData.role;
    if (normEmail) roleOverrides[normEmail] = staffData.role;
    if (normName) roleOverrides[normName.toLowerCase()] = staffData.role;
    saveStorage('gold_shop_role_overrides', roleOverrides);

    // 3. Instantly update in local state & storage
    setUserProfiles((prev) => {
      const merged = mergeProfiles([newProf], prev);
      saveStorage('gold_shop_staff_profiles', merged);
      return merged;
    });

    // 4. Upsert to Supabase profiles table
    try {
      await supabaseUpsertProfile(newProf);
    } catch (err) {
      console.warn('Upsert to Supabase profiles notice:', err);
    }

    return { success: true, profile: newProf };
  };

  const deleteStaffMember = async (profileId: string, email?: string) => {
    const normEmail = email?.trim().toLowerCase();
    const target = userProfiles.find(
      (p) => p.id === profileId || (normEmail && p.email?.trim().toLowerCase() === normEmail)
    );
    const normName = target?.full_name?.trim().toLowerCase();

    // 1. Record in deleted list so it stays deleted across reloads and syncs
    const deletedList = loadStorage<string[]>('gold_shop_deleted_staff', []);
    const updatedDeleted = Array.from(new Set([
      ...deletedList,
      profileId.toLowerCase(),
      profileId,
      ...(normEmail ? [normEmail] : []),
      ...(normName ? [normName] : []),
      ...(profileId === 'staff_phoo' ? ['usr_phoo'] : []),
      ...(profileId === 'usr_phoo' ? ['staff_phoo'] : []),
      ...(profileId === 'staff_1' ? ['usr_staff'] : []),
      ...(profileId === 'usr_staff' ? ['staff_1'] : []),
      ...(profileId === 'manager_1' ? ['usr_manager'] : []),
      ...(profileId === 'usr_manager' ? ['manager_1'] : []),
    ]));
    saveStorage('gold_shop_deleted_staff', updatedDeleted);

    // Also remove from role overrides
    const overrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
    delete overrides[profileId];
    if (normEmail) delete overrides[normEmail];
    if (normName) delete overrides[normName];
    saveStorage('gold_shop_role_overrides', overrides);

    // 2. Remove immediately from userProfiles state & storage
    setUserProfiles((prev) => {
      const remaining = prev.filter((p) => {
        if (p.id === profileId) return false;
        if (normEmail && p.email && p.email.trim().toLowerCase() === normEmail) return false;
        if (normName && p.full_name && p.full_name.trim().toLowerCase() === normName) return false;
        return !isProfileDeleted(p);
      });
      saveStorage('gold_shop_staff_profiles', remaining);
      return remaining;
    });

    // 3. Delete from Supabase safely (ID, email, and Full Name!)
    try {
      await supabaseDeleteProfile(profileId, normEmail, target?.full_name);
    } catch (e) {
      console.warn('Delete profile notice:', e);
    }

    // 4. Log audit entry
    recordLog('warn', 'AUTH', `ဝန်ထမ်းအကောင့် ဖျက်ပစ်ခဲ့သည်: ${target?.full_name || profileId} (${normEmail || '-'})`);
  };

  const purgeStaffAccounts = async (profilesToPurge: SupabaseProfile[]) => {
    if (!profilesToPurge || profilesToPurge.length === 0) return;
    const deletedList = loadStorage<string[]>('gold_shop_deleted_staff', []);
    const additions: string[] = [];

    for (const p of profilesToPurge) {
      if (p.id) additions.push(p.id.toLowerCase(), p.id);
      if (p.email) additions.push(p.email.trim().toLowerCase());
      if (p.full_name) additions.push(p.full_name.trim().toLowerCase());
    }

    const updatedDeleted = Array.from(new Set([...deletedList, ...additions]));
    saveStorage('gold_shop_deleted_staff', updatedDeleted);

    // Remove from role overrides
    const overrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
    for (const p of profilesToPurge) {
      if (p.id) delete overrides[p.id];
      if (p.email) delete overrides[p.email.trim().toLowerCase()];
      if (p.full_name) delete overrides[p.full_name.trim().toLowerCase()];
    }
    saveStorage('gold_shop_role_overrides', overrides);

    // Remove from state & local storage
    const purgeIds = new Set(profilesToPurge.map((p) => p.id));
    const purgeEmails = new Set(profilesToPurge.map((p) => (p.email || '').trim().toLowerCase()));
    const purgeNames = new Set(profilesToPurge.map((p) => (p.full_name || '').trim().toLowerCase()));

    setUserProfiles((prev) => {
      const remaining = prev.filter((p) => {
        if (purgeIds.has(p.id)) return false;
        if (p.email && purgeEmails.has(p.email.trim().toLowerCase())) return false;
        if (p.full_name && purgeNames.has(p.full_name.trim().toLowerCase())) return false;
        return !isProfileDeleted(p);
      });
      saveStorage('gold_shop_staff_profiles', remaining);
      return remaining;
    });

    // Delete all from Supabase
    try {
      await supabaseBatchDeleteProfiles(profilesToPurge);
    } catch (err) {
      console.warn('Batch delete profiles notice:', err);
    }

    recordLog('warn', 'AUTH', `ဝန်ထမ်းအကောင့် ${profilesToPurge.length} ခုကို အပြီးတိုင် ဖျက်ပစ်ခဲ့ပါသည်`);
  };

  const updateStaffProfile = async (profile: SupabaseProfile) => {
    if (!profile) return;
    const cleanEmail = profile.email ? profile.email.trim().toLowerCase() : '';
    const cleanName = profile.full_name ? profile.full_name.trim() : '';

    // 1. Record in persistent role overrides
    const overrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
    overrides[profile.id] = profile.role;
    if (cleanEmail) overrides[cleanEmail] = profile.role;
    if (cleanName) overrides[cleanName.toLowerCase()] = profile.role;
    saveStorage('gold_shop_role_overrides', overrides);

    // 2. Persist PIN overrides if provided
    if (profile.pin) {
      const pinOverrides = loadStorage<Record<string, string>>('gold_shop_pin_overrides', {});
      pinOverrides[profile.id] = profile.pin;
      if (cleanEmail) pinOverrides[cleanEmail] = profile.pin;
      if (cleanName) pinOverrides[cleanName.toLowerCase()] = profile.pin;
      saveStorage('gold_shop_pin_overrides', pinOverrides);
    }

    // 3. Immediately update in userProfiles state & storage
    setUserProfiles((prev) => {
      const updated = prev.map((p) => {
        const match =
          p.id === profile.id ||
          Boolean(cleanEmail && p.email && p.email.trim().toLowerCase() === cleanEmail);
        return match ? { ...p, ...profile, full_name: cleanName || p.full_name, email: cleanEmail || p.email } : p;
      });
      saveStorage('gold_shop_staff_profiles', updated);
      return updated;
    });

    // 4. Update current active user if editing current session user
    if (currentUser && (currentUser.id === profile.id || (cleanEmail && currentUser.email && currentUser.email.trim().toLowerCase() === cleanEmail))) {
      const updatedUser = {
        ...currentUser,
        role: profile.role,
        name: cleanName || currentUser.name,
        pin: profile.pin || currentUser.pin,
        phone: profile.phone || currentUser.phone,
        email: cleanEmail || currentUser.email,
      };
      setCurrentUser(updatedUser);
      saveStorage('user', updatedUser);
    }

    // 5. Audit Log
    recordLog('info', 'AUTH', `ဝန်ထမ်း အချက်အလက် ပြင်ဆင်သိမ်းဆည်းခဲ့သည်: ${cleanName || profile.id} (${profile.role})`);

    // 6. Supabase sync with 2.5s maximum timeout so UI is never blocked or stalled
    try {
      await Promise.race([
        Promise.all([
          supabaseUpdateProfileRole(profile.id, profile.role, cleanEmail),
          supabaseUpsertProfile(profile),
        ]),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch (e) {
      console.warn('Update profile remote sync notice:', e);
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    try {
      await supabaseResendConfirmation(email);
      return {
        success: true,
        message: 'အတည်ပြုအီးမေးလ် ထပ်မံပေးပို့ပြီးပါပြီ။ Gmail Inbox (သို့မဟုတ် Spam folder) ကို စစ်ဆေးပေးပါ။',
      };
    } catch (e: any) {
      return { success: false, error: e.message || 'အီးမေးလ် ပြန်လည်ပေးပို့ခြင်း မအောင်မြင်ပါ' };
    }
  };

  const logoutSupabase = async () => {
    try {
      await supabaseSignOut();
      setSupabaseUser(null);
      setCurrentUser(INITIAL_USERS[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStaffRole = async (profileId: string, role: UserRole) => {
    const expectedPin = role === 'Admin' ? '1111' : role === 'Manager' ? '2222' : '3333';

    // Synchronously locate target profile from current state
    const target = userProfiles.find((p) => p.id === profileId || (p.email && p.email.toLowerCase() === profileId.toLowerCase()));
    const targetEmail = target?.email?.trim().toLowerCase();
    const targetName = target?.full_name?.trim();

    // 1. Persist to role overrides immediately
    const overrides = loadStorage<Record<string, UserRole>>('gold_shop_role_overrides', {});
    overrides[profileId] = role;
    if (targetEmail) overrides[targetEmail] = role;
    if (targetName) overrides[targetName.toLowerCase()] = role;
    saveStorage('gold_shop_role_overrides', overrides);

    // 2. Update state and save immediately to gold_shop_staff_profiles
    let updatedProfileObj: SupabaseProfile | undefined = undefined;
    setUserProfiles((prev) => {
      const updated = prev.map((p) => {
        const matchesId = p.id === profileId;
        const matchesEmail = Boolean(targetEmail && p.email && p.email.trim().toLowerCase() === targetEmail);
        if (matchesId || matchesEmail) {
          const newP = {
            ...p,
            role,
            pin: (!p.pin || p.pin === '1111' || p.pin === '2222' || p.pin === '3333') ? expectedPin : p.pin,
          };
          updatedProfileObj = newP;
          return newP;
        }
        return p;
      });
      saveStorage('gold_shop_staff_profiles', updated);
      return updated;
    });

    // 3. Update active currentUser if it matches
    if (currentUser.id === profileId || (targetEmail && currentUser.email?.toLowerCase() === targetEmail)) {
      const updatedUser: User = {
        ...currentUser,
        role,
        pin: (!currentUser.pin || currentUser.pin === '1111' || currentUser.pin === '2222' || currentUser.pin === '3333') ? expectedPin : currentUser.pin,
      };
      setCurrentUser(updatedUser);
      saveStorage('user', updatedUser);
    }

    // 4. Sync update to Supabase
    try {
      await supabaseUpdateProfileRole(profileId, role, targetEmail);
      if (updatedProfileObj || target) {
        await supabaseUpsertProfile(updatedProfileObj || { ...target!, role });
      }
    } catch (e) {
      console.error('Failed to update role in Supabase:', e);
    }
  };

  // Check Supabase Cloud Health & table status
  const checkSupabaseHealth = async (): Promise<SupabaseHealthReport> => {
    return await supabaseCheckCloudHealth();
  };

  // Upload local items to Supabase and verify cloud counts
  const uploadAndVerifyAllToSupabase = async (): Promise<BatchUploadVerificationResult> => {
    setIsSyncing(true);
    try {
      const res = await supabaseBatchUploadAndVerify({
        products,
        goldPrices,
        sales,
        customers,
        userProfiles,
        purchases,
        expenses,
        workshopOrders,
        goldsmiths,
        suppliers,
        settlements,
        settings,
      });

      if (res.totalUploaded > 0) {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastSyncedTime(timeNow);
        saveStorage('lastSyncedTime', timeNow);
        refreshSupabaseData().catch(console.warn);
      }

      return res;
    } finally {
      setIsSyncing(false);
    }
  };

  // Push local items to Supabase (one click seeder / syncer)
  const syncAllToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        message: 'Supabase URL နှင့် Anon Key ကို ထည့်သွင်းပေးရန် လိုအပ်ပါသည်',
      };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        message: 'လက်ရှိတွင် အင်တာနက်လိုင်း မရှိပါ (Offline Mode)။ အင်တာနက်ရရှိမှသာ Cloud သို့ Sync ပြုလုပ်နိုင်ပါမည်။ စာရင်းများကို ဤစက်ထဲတွင် လုံခြုံစွာ သိမ်းဆည်းထားပြီး ဖြစ်ပါသည်။',
      };
    }

    const res = await uploadAndVerifyAllToSupabase();
    return {
      success: res.success,
      message: res.message,
    };
  };

  // Gold price methods
  const updateGoldPrice = (id: string, buyPrice: number, sellPrice: number) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date().toISOString().split('T')[0];
    const updatedGp = {
      buyPrice,
      sellPrice,
      date: today,
      updatedAt: `${today} ${now}`,
    };

    setGoldPrices((prev) =>
      sortGoldPricesAscending(
        prev.map((gp) => (gp.id === id ? { ...gp, ...updatedGp } : gp))
      )
    );

    const target = goldPrices.find((g) => g.id === id);
    if (target && supabase) {
      supabaseUpsertGoldPrice({ ...target, ...updatedGp }).catch(console.warn);
    }
  };

  const addGoldPrice = (purity: string, purityLabel: string, buyPrice: number, sellPrice: number) => {
    const today = new Date().toISOString().split('T')[0];
    const newGp: GoldPrice = {
      id: 'gp_' + Math.random().toString(36).substr(2, 7),
      date: today,
      purity,
      purityLabel,
      buyPrice,
      sellPrice,
      updatedAt: `${today} Just now`,
    };
    setGoldPrices((prev) => sortGoldPricesAscending([...prev, newGp]));
    if (supabase) {
      supabaseUpsertGoldPrice(newGp).catch(console.warn);
    }
  };

  const getGoldPriceByPurity = (purity: string) => {
    return goldPrices.find((gp) => gp.purity === purity);
  };

  // Products
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt'>): Product => {
    const today = new Date().toISOString().split('T')[0];
    const newId = 'prd_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
    const newProduct: Product = {
      ...productData,
      id: newId,
      createdAt: today,
    };

    // Ensure this new ID is cleared from deleted products list
    const deletedProducts = loadStorage<string[]>('gold_shop_deleted_products', []);
    if (deletedProducts.includes(newId)) {
      saveStorage(
        'gold_shop_deleted_products',
        deletedProducts.filter((id) => id !== newId)
      );
    }

    setProducts((prev) => {
      const next = [newProduct, ...prev.filter((p) => p.id !== newId)];
      productsRef.current = next;
      saveStorage('products', next);
      return next;
    });

    if (supabase) {
      supabaseUpsertProduct(newProduct).catch((err) =>
        console.warn('Supabase product add notice:', err)
      );
    }

    notifyCrossAppSync();
    recordLog(
      'info',
      'INVENTORY',
      `ရွှေထည်ပစ္စည်းအသစ် ထည့်သွင်းသိမ်းဆည်းခဲ့သည်: ${newProduct.name} (SKU: ${newProduct.sku})`
    );
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, ...updates };
          if (supabase) {
            supabaseUpsertProduct(updated).catch(console.warn);
          }
          return updated;
        }
        return p;
      });
      productsRef.current = next;
      saveStorage('products', next);
      return next;
    });
    notifyCrossAppSync();
  };

  const deleteProduct = (id: string) => {
    const deletedProducts = loadStorage<string[]>('gold_shop_deleted_products', []);
    if (!deletedProducts.includes(id)) {
      saveStorage('gold_shop_deleted_products', [...deletedProducts, id]);
    }
    const target = products.find((p) => p.id === id);
    setProducts((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      saveStorage('products', remaining);
      return remaining;
    });
    if (supabase) {
      supabaseDeleteProduct(id).catch(console.warn);
    }
    notifyCrossAppSync();
    if (target) {
      recordLog('warn', 'INVENTORY', `ပစ္စည်း စာရင်းမှ ဖျက်ပစ်ခဲ့သည်: ${target.name} (${target.sku})`);
    }
  };

  // Sales
  const createSale = (saleData: Omit<Sale, 'id' | 'createdAt'>): Sale => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newSale: Sale = {
      ...saleData,
      id: 'sale_' + Math.random().toString(36).substr(2, 9),
      createdAt: `${dateStr} ${timeStr}`,
    };

    // 1. Append sale
    setSales((prev) => [newSale, ...prev]);

    // 2. Mark any stock products as 'Sold'
    const productIdsSold = newSale.items
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id));

    if (productIdsSold.length > 0) {
      setProducts((prev) =>
        prev.map((prod) =>
          productIdsSold.includes(prod.id) ? { ...prod, status: 'Sold' } : prod
        )
      );
      if (supabase && typeof navigator !== 'undefined' && navigator.onLine) {
        products
          .filter((prod) => productIdsSold.includes(prod.id))
          .forEach((prod) => {
            supabaseUpsertProduct({ ...prod, status: 'Sold' }).catch((e) =>
              console.warn('Supabase product sold update note:', e?.message || e)
            );
          });
      }
    }

    // 3. Update customer stats if customer exists
    if (newSale.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === newSale.customerId) {
            return {
              ...c,
              totalPurchased: c.totalPurchased + newSale.grandTotal,
              outstandingBalance: c.outstandingBalance + newSale.balanceRemaining,
            };
          }
          return c;
        })
      );
      if (supabase && typeof navigator !== 'undefined' && navigator.onLine) {
        const targetCust = customers.find((c) => c.id === newSale.customerId);
        if (targetCust) {
          supabaseUpsertCustomer({
            ...targetCust,
            totalPurchased: targetCust.totalPurchased + newSale.grandTotal,
            outstandingBalance: targetCust.outstandingBalance + newSale.balanceRemaining,
          }).catch((e) => console.warn('Supabase customer update note:', e?.message || e));
        }
      }
    }

    // 4. Save to Supabase Sales
    if (supabase && typeof navigator !== 'undefined' && navigator.onLine) {
      supabaseInsertSale(newSale).catch((e) =>
        console.warn('Supabase sale insert note:', e?.message || e)
      );
    }

    recordLog('info', 'SALE', `ဘောက်ချာအသစ် ထုတ်ယူခဲ့သည် (${newSale.invoiceNo} - ${newSale.grandTotal.toLocaleString()} ကျပ်)`, {
      invoiceNo: newSale.invoiceNo,
      grandTotal: newSale.grandTotal,
      paidAmount: newSale.paidAmount,
      customerName: newSale.customerName,
      counterId: newSale.counterId,
    }, {
      userName: newSale.cashierName,
      counterId: newSale.counterId,
    });

    return newSale;
  };

  const voidSale = (
    saleId: string,
    options?: {
      reason?: string;
      voidedBy?: string;
      voidApprovedBy?: string;
    }
  ) => {
    const targetSale = sales.find((s) => s.id === saleId);
    if (!targetSale || targetSale.status === 'Void') return;

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const voidedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // Return products to In Stock
    const productIdsToRestore = targetSale.items
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id));

    if (productIdsToRestore.length > 0) {
      setProducts((prev) =>
        prev.map((prod) =>
          productIdsToRestore.includes(prod.id) ? { ...prod, status: 'In Stock' } : prod
        )
      );
      if (supabase && typeof navigator !== 'undefined' && navigator.onLine) {
        products
          .filter((prod) => productIdsToRestore.includes(prod.id))
          .forEach((prod) => {
            supabaseUpsertProduct({ ...prod, status: 'In Stock' }).catch((e) =>
              console.warn('Supabase product restore note:', e?.message || e)
            );
          });
      }
    }

    // Adjust customer balance
    if (targetSale.customerId && targetSale.balanceRemaining > 0) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === targetSale.customerId) {
            return {
              ...c,
              totalPurchased: Math.max(0, c.totalPurchased - targetSale.grandTotal),
              outstandingBalance: Math.max(0, c.outstandingBalance - targetSale.balanceRemaining),
            };
          }
          return c;
        })
      );
      if (supabase && typeof navigator !== 'undefined' && navigator.onLine) {
        const targetCust = customers.find((c) => c.id === targetSale.customerId);
        if (targetCust) {
          supabaseUpsertCustomer({
            ...targetCust,
            totalPurchased: Math.max(0, targetCust.totalPurchased - targetSale.grandTotal),
            outstandingBalance: Math.max(0, targetCust.outstandingBalance - targetSale.balanceRemaining),
          }).catch((e) => console.warn('Supabase customer void balance note:', e?.message || e));
        }
      }
    }

    const defaultStaff = currentUser?.name || 'Staff';
    const defaultManager =
      currentUser?.role === 'Admin' || currentUser?.role === 'Manager'
        ? currentUser.name
        : 'Manager';

    const reason = options?.reason?.trim() || 'စာရင်းမှားယွင်းရိုက်သွင်းမိခြင်း';
    const voidedBy = options?.voidedBy?.trim() || defaultStaff;
    const voidApprovedBy = options?.voidApprovedBy?.trim() || defaultManager;

    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'Void',
              voidReason: reason,
              voidedBy: voidedBy,
              voidApprovedBy: voidApprovedBy,
              voidedAt: voidedAt,
            }
          : s
      )
    );

    if (supabase) {
      supabaseUpdateSaleStatus(saleId, 'Void').catch(console.warn);
    }

    recordLog('warn', 'SALE', `ဘောက်ချာ ပယ်ဖျက်ခဲ့သည် (${targetSale.invoiceNo} - အကြောင်းပြချက်: ${reason})`, {
      invoiceNo: targetSale.invoiceNo,
      grandTotal: targetSale.grandTotal,
      voidedBy,
      voidApprovedBy,
      reason,
    }, {
      userName: voidedBy,
      userRole: currentUser?.role,
    });
  };

  // Purchases (Customer Gold Buy)
  const createPurchase = (purchaseData: Omit<PurchaseItem, 'id' | 'createdAt'>): PurchaseItem => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newPurchase: PurchaseItem = {
      ...purchaseData,
      id: 'pur_' + Math.random().toString(36).substr(2, 9),
      createdAt: `${dateStr} ${timeStr}`,
    };

    setPurchases((prev) => [newPurchase, ...prev]);

    recordLog('info', 'PURCHASE', `ရွှေအဝယ်ဘောက်ချာ ထုတ်ယူခဲ့သည် (${newPurchase.voucherNo} - ${newPurchase.totalAmount.toLocaleString()} ကျပ်)`, {
      voucherNo: newPurchase.voucherNo,
      partyName: newPurchase.partyName,
      totalAmount: newPurchase.totalAmount,
      purity: newPurchase.purity,
    }, {
      userName: newPurchase.cashierName,
      counterId: currentCounter?.id,
    });

    // If customer exists, update totalSoldBack
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.name.trim().toLowerCase() === newPurchase.partyName.trim().toLowerCase()) {
          const updatedCust = {
            ...c,
            totalSoldBack: c.totalSoldBack + newPurchase.totalAmount,
          };
          if (supabase) supabaseUpsertCustomer(updatedCust).catch(console.warn);
          return updatedCust;
        }
        return c;
      })
    );

    return newPurchase;
  };

  // Customers
  const addCustomer = (
    custData: Omit<Customer, 'id' | 'createdAt' | 'totalPurchased' | 'totalSoldBack' | 'outstandingBalance'>
  ): Customer => {
    const today = new Date().toISOString().split('T')[0];
    const newCustomer: Customer = {
      ...custData,
      id: 'cst_' + Math.random().toString(36).substr(2, 8),
      totalPurchased: 0,
      totalSoldBack: 0,
      outstandingBalance: 0,
      createdAt: today,
    };
    setCustomers((prev) => [newCustomer, ...prev]);

    if (supabase) {
      supabaseUpsertCustomer(newCustomer).catch(console.warn);
    }

    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updatedCust = { ...c, ...updates };
          if (supabase) supabaseUpsertCustomer(updatedCust).catch(console.warn);
          return updatedCust;
        }
        return c;
      })
    );
  };

  const settleSaleCredit = async (params: {
    saleId: string;
    amountPaid: number;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    cashierName?: string;
    notes?: string;
  }): Promise<{ success: boolean; settlement: DebtSettlement; updatedSale: Sale }> => {
    const targetSale = sales.find((s) => s.id === params.saleId);
    if (!targetSale) {
      throw new Error('အရောင်းဘောက်ချာ ရှာမတွေ့ပါ');
    }

    const payAmount = Math.min(params.amountPaid, targetSale.balanceRemaining);
    const newPaidAmount = targetSale.paidAmount + payAmount;
    const newBalanceRemaining = Math.max(0, targetSale.balanceRemaining - payAmount);
    const newStatus: Sale['status'] = newBalanceRemaining <= 0 ? 'Completed' : 'Pending Balance';

    const newPayment: PaymentRecord = {
      method: params.paymentMethod,
      amount: payAmount,
      reference: params.paymentReference || undefined,
      date: new Date().toISOString(),
      cashier: params.cashierName || currentUser?.name || 'Cashier',
      notes: params.notes || (newBalanceRemaining <= 0 ? 'ကျန်ငွေ အပြီးသတ်ရှင်းလင်းပြီး' : 'ကျန်ငွေ တစ်စိတ်တစ်ပိုင်း ပေးချေခြင်း'),
    };

    const updatedSale: Sale = {
      ...targetSale,
      paidAmount: newPaidAmount,
      balanceRemaining: newBalanceRemaining,
      status: newStatus,
      payments: [...targetSale.payments, newPayment],
    };

    // 1. Update sales state
    setSales((prev) => prev.map((s) => (s.id === params.saleId ? updatedSale : s)));

    // 2. Update Customer outstanding balance
    if (targetSale.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === targetSale.customerId) {
            const updated = {
              ...c,
              outstandingBalance: Math.max(0, c.outstandingBalance - payAmount),
            };
            if (supabase) supabaseUpsertCustomer(updated).catch(console.warn);
            return updated;
          }
          return c;
        })
      );
    } else if (targetSale.customerName) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.name.trim().toLowerCase() === targetSale.customerName.trim().toLowerCase()) {
            const updated = {
              ...c,
              outstandingBalance: Math.max(0, c.outstandingBalance - payAmount),
            };
            if (supabase) supabaseUpsertCustomer(updated).catch(console.warn);
            return updated;
          }
          return c;
        })
      );
    }

    // 3. Create DebtSettlement receipt record
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const receiptDigits = targetSale.invoiceNo.replace(/[^0-9]/g, '') || Math.floor(1000 + Math.random() * 9000);
    const receiptNo = `RCP-${receiptDigits}-${(targetSale.payments.length + 1).toString().padStart(2, '0')}`;

    const settlement: DebtSettlement = {
      id: 'settle_' + Math.random().toString(36).substr(2, 9),
      receiptNo,
      saleId: targetSale.id,
      invoiceNo: targetSale.invoiceNo,
      customerId: targetSale.customerId,
      customerName: targetSale.customerName,
      customerPhone: targetSale.customerPhone,
      previousBalance: targetSale.balanceRemaining,
      amountPaid: payAmount,
      remainingBalance: newBalanceRemaining,
      paymentMethod: params.paymentMethod,
      paymentReference: params.paymentReference,
      cashierName: params.cashierName || currentUser?.name || 'Cashier',
      notes: params.notes,
      date: dateStr,
      createdAt: `${dateStr} ${timeStr}`,
    };

    setSettlements((prev) => [settlement, ...prev]);

    // 4. Sync to Supabase
    if (supabase) {
      supabaseUpdateSalePayment(updatedSale).catch(console.warn);
    }

    return { success: true, settlement, updatedSale };
  };

  const settleCustomerBalance = (
    customerId: string,
    amountPaid: number,
    method: PaymentMethod,
    reference?: string,
    notes?: string,
    cashierName?: string
  ): DebtSettlement | null => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return null;

    const prevBal = cust.outstandingBalance;
    const payAmount = Math.min(amountPaid, prevBal);
    const newBal = Math.max(0, prevBal - payAmount);

    // Update customer
    const updatedCust = { ...cust, outstandingBalance: newBal };
    setCustomers((prev) => prev.map((c) => (c.id === customerId ? updatedCust : c)));
    if (supabase) supabaseUpsertCustomer(updatedCust).catch(console.warn);

    // Deduct across customer's pending invoices (FIFO)
    let remainingToDeduct = payAmount;
    let linkedInvoiceNo: string | undefined;
    let linkedSaleId: string | undefined;

    setSales((prev) =>
      prev.map((s) => {
        const isMatch =
          s.customerId === customerId ||
          s.customerName.trim().toLowerCase() === cust.name.trim().toLowerCase();

        if (remainingToDeduct > 0 && isMatch && s.balanceRemaining > 0 && s.status !== 'Void') {
          const deductThis = Math.min(remainingToDeduct, s.balanceRemaining);
          remainingToDeduct -= deductThis;
          if (!linkedInvoiceNo) {
            linkedInvoiceNo = s.invoiceNo;
            linkedSaleId = s.id;
          }
          const updatedSale: Sale = {
            ...s,
            paidAmount: s.paidAmount + deductThis,
            balanceRemaining: s.balanceRemaining - deductThis,
            status: s.balanceRemaining - deductThis <= 0 ? 'Completed' : 'Pending Balance',
            payments: [
              ...s.payments,
              {
                method,
                amount: deductThis,
                reference,
                date: new Date().toISOString(),
                cashier: cashierName || currentUser?.name || 'Cashier',
                notes: notes || 'ကျန်ငွေ စာရင်းရှင်းလင်းခြင်း',
              },
            ],
          };
          if (supabase) supabaseUpdateSalePayment(updatedSale).catch(console.warn);
          return updatedSale;
        }
        return s;
      })
    );

    // Create settlement record
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const receiptNo = `RCP-CUST-${Math.floor(1000 + Math.random() * 9000)}`;

    const settlement: DebtSettlement = {
      id: 'settle_' + Math.random().toString(36).substr(2, 9),
      receiptNo,
      saleId: linkedSaleId,
      invoiceNo: linkedInvoiceNo,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      previousBalance: prevBal,
      amountPaid: payAmount,
      remainingBalance: newBal,
      paymentMethod: method,
      paymentReference: reference,
      cashierName: cashierName || currentUser?.name || 'Cashier',
      notes,
      date: dateStr,
      createdAt: `${dateStr} ${timeStr}`,
    };

    setSettlements((prev) => [settlement, ...prev]);
    return settlement;
  };

  // Suppliers
  const addSupplier = (
    supData: Omit<Supplier, 'id' | 'createdAt' | 'totalSupplied' | 'outstandingBalance'>
  ): Supplier => {
    const today = new Date().toISOString().split('T')[0];
    const newSupplier: Supplier = {
      ...supData,
      id: 'sup_' + Math.random().toString(36).substr(2, 8),
      totalSupplied: 0,
      outstandingBalance: 0,
      createdAt: today,
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
    return newSupplier;
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Expenses
  const addExpense = (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    const today = new Date().toISOString().split('T')[0];
    const newExpense: Expense = {
      ...expenseData,
      id: 'exp_' + Math.random().toString(36).substr(2, 8),
      createdAt: today,
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Goldsmith & Workshop Job Orders
  const addGoldsmith = (
    data: Omit<Goldsmith, 'id' | 'createdAt' | 'totalJobsCompleted' | 'totalLaborPaid' | 'pendingLabor' | 'totalGoldWithGoldsmith'>
  ): Goldsmith => {
    const today = new Date().toISOString().split('T')[0];
    const newGsm: Goldsmith = {
      ...data,
      id: 'gsm_' + Math.random().toString(36).substr(2, 8),
      totalJobsCompleted: 0,
      totalLaborPaid: 0,
      pendingLabor: 0,
      totalGoldWithGoldsmith: { kyat: 0, pe: 0, yway: 0 },
      createdAt: today,
    };
    setGoldsmiths((prev) => {
      const next = [newGsm, ...prev];
      saveStorage('goldsmiths', next);
      if (supabase) supabaseSaveGoldsmiths(next).catch(console.warn);
      return next;
    });
    notifyCrossAppSync();
    recordLog('info', 'WORKSHOP', `ပန်းထိမ်ဆရာအသစ် ထည့်သွင်းခဲ့သည်: ${newGsm.name} (${newGsm.workshopName})`);
    return newGsm;
  };

  const updateGoldsmith = (id: string, updates: Partial<Goldsmith>) => {
    setGoldsmiths((prev) => {
      const next = prev.map((g) => (g.id === id ? { ...g, ...updates } : g));
      saveStorage('goldsmiths', next);
      if (supabase) supabaseSaveGoldsmiths(next).catch(console.warn);
      return next;
    });
    notifyCrossAppSync();
  };

  const deleteGoldsmith = (id: string) => {
    setGoldsmiths((prev) => {
      const next = prev.filter((g) => g.id !== id);
      saveStorage('goldsmiths', next);
      if (supabase) supabaseSaveGoldsmiths(next).catch(console.warn);
      return next;
    });
    notifyCrossAppSync();
    recordLog('warn', 'WORKSHOP', `ပန်းထိမ်ဆရာ စာရင်းမှ ပယ်ဖျက်ခဲ့သည် (ID: ${id})`);
  };

  const createWorkshopOrder = (
    data: Omit<WorkshopJobOrder, 'id' | 'createdAt' | 'jobNo'>
  ): WorkshopJobOrder => {
    const today = new Date().toISOString().split('T')[0];
    let maxJobNum = 2600;
    workshopOrders.forEach((o) => {
      const match = o.jobNo?.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (!isNaN(num) && num > maxJobNum) {
          maxJobNum = num;
        }
      }
    });
    const jobNo = `JOB-${maxJobNum + 1}`;

    const newOrder: WorkshopJobOrder = {
      ...data,
      id: 'wjo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      jobNo,
      createdAt: `${today} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    };

    setWorkshopOrders((prev) => {
      const next = [newOrder, ...prev];
      saveStorage('workshop_orders', next);
      if (supabase) supabaseSaveWorkshopOrders(next).catch(console.warn);
      return next;
    });

    // Update target Goldsmith's unreturned gold weight
    setGoldsmiths((prev) => {
      const next = prev.map((g) => {
        if (g.id === data.goldsmithId) {
          const updatedGold = addWeights(g.totalGoldWithGoldsmith || { kyat: 0, pe: 0, yway: 0 }, data.givenWeight);
          const newPending = g.pendingLabor + (data.balanceLaborCharge || 0);
          return {
            ...g,
            totalGoldWithGoldsmith: updatedGold,
            pendingLabor: newPending,
          };
        }
        return g;
      });
      saveStorage('goldsmiths', next);
      if (supabase) supabaseSaveGoldsmiths(next).catch(console.warn);
      return next;
    });

    notifyCrossAppSync();

    recordLog('info', 'WORKSHOP', `ပန်းထိမ်အပ်ထည်အသစ် ဖွင့်လှစ်ခဲ့သည်: ${jobNo} - ${data.title} (${data.goldsmithName})`, {
      jobNo,
      orderType: data.orderType,
      goldsmithName: data.goldsmithName,
    });

    return newOrder;
  };

  const updateWorkshopOrder = (id: string, updates: Partial<WorkshopJobOrder>) => {
    let targetGsmId: string | undefined;
    let laborBalanceDiff = 0;
    let laborPaidDiff = 0;

    setWorkshopOrders((prev) => {
      const existing = prev.find((o) => o.id === id);
      if (existing) {
        targetGsmId = updates.goldsmithId || existing.goldsmithId;
        const oldBalance = existing.balanceLaborCharge || 0;
        const oldPaid = existing.paidLaborCharge || 0;
        const newPaid = updates.paidLaborCharge !== undefined ? updates.paidLaborCharge : oldPaid;
        const newBalance = updates.balanceLaborCharge !== undefined ? updates.balanceLaborCharge : oldBalance;
        laborBalanceDiff = newBalance - oldBalance;
        laborPaidDiff = newPaid - oldPaid;
      }
      const next = prev.map((order) => (order.id === id ? { ...order, ...updates } : order));
      saveStorage('workshop_orders', next);
      if (supabase) {
        supabaseSaveWorkshopOrders(next).catch(console.warn);
      }
      return next;
    });

    if (targetGsmId && (laborBalanceDiff !== 0 || laborPaidDiff !== 0)) {
      setGoldsmiths((prev) => {
        const nextGsm = prev.map((g) => {
          if (g.id === targetGsmId) {
            return {
              ...g,
              pendingLabor: Math.max(0, (g.pendingLabor || 0) + laborBalanceDiff),
              totalLaborPaid: Math.max(0, (g.totalLaborPaid || 0) + laborPaidDiff),
            };
          }
          return g;
        });
        saveStorage('goldsmiths', nextGsm);
        if (supabase) {
          supabaseSaveGoldsmiths(nextGsm).catch(console.warn);
        }
        return nextGsm;
      });
    }

    recordLog('info', 'WORKSHOP', `ပန်းထိမ်အပ်ထည် အချက်အလက်များ ပြင်ဆင်ခဲ့သည် (ID: ${id})`);
  };

  const convertWorkshopOrderToInventory = (
    orderId: string,
    customSku?: string,
    costPrice?: number
  ): Product | null => {
    const targetOrder = workshopOrders.find((o) => o.id === orderId);
    if (!targetOrder) return null;

    const finalWeight: GoldWeight =
      targetOrder.finishedWeight &&
      (targetOrder.finishedWeight.kyat > 0 ||
        targetOrder.finishedWeight.pe > 0 ||
        targetOrder.finishedWeight.yway > 0)
        ? targetOrder.finishedWeight
        : targetOrder.givenWeight || { kyat: 0, pe: 1, yway: 0 };

    const today = new Date().toISOString().split('T')[0];
    const purityClean = (targetOrder.purity || '15').replace('_PE', '');
    const jobNumClean = (targetOrder.jobNo || '0000').replace('JOB-', '');
    const autoSku = customSku?.trim() || `WSP-${purityClean}-${jobNumClean}`;
    const calculatedCost =
      costPrice !== undefined
        ? costPrice
        : (targetOrder.totalLaborCharge || 0) + (targetOrder.stoneCost || 0);

    const isCoreStockId = targetOrder.linkedProductId && /^prd_00[1-7]$/.test(targetOrder.linkedProductId);
    const finalProductId =
      targetOrder.linkedProductId && !isCoreStockId
        ? targetOrder.linkedProductId
        : `prd_wsp_${jobNumClean}_${Math.random().toString(36).substring(2, 7)}`;

    let resultingProduct: Product = {
      id: finalProductId,
      sku: autoSku,
      name: targetOrder.title,
      category: targetOrder.category || 'Other',
      purity: targetOrder.purity || '15_PE',
      weight: finalWeight,
      stoneWeightYway: targetOrder.stoneWeightYway || 0,
      stoneCharge: targetOrder.stoneCost || 0,
      makingCharge: targetOrder.totalLaborCharge || 0,
      costPrice: calculatedCost,
      status: 'In Stock',
      notes: `ပန်းထိမ်အပ်ထည် ${targetOrder.jobNo} (${targetOrder.goldsmithName}) မှ တိုက်ရိုက် စတော့သွင်းထားခြင်း`,
      createdAt: today,
    };

    setProducts((prev) => {
      const existingIndex = prev.findIndex(
        (p) =>
          (!isCoreStockId && targetOrder.linkedProductId && p.id === targetOrder.linkedProductId) ||
          (p.sku && p.sku.toLowerCase() === autoSku.toLowerCase()) ||
          (p.notes && targetOrder.jobNo && p.notes.includes(targetOrder.jobNo))
      );

      let next: Product[];
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        resultingProduct = {
          ...existing,
          weight: finalWeight,
          stoneWeightYway: targetOrder.stoneWeightYway || existing.stoneWeightYway || 0,
          stoneCharge: targetOrder.stoneCost || existing.stoneCharge || 0,
          makingCharge: targetOrder.totalLaborCharge || existing.makingCharge || 0,
          costPrice: calculatedCost,
          status: 'In Stock',
          notes: `ပန်းထိမ်အပ်ထည် ${targetOrder.jobNo} (${targetOrder.goldsmithName}) မှ တိုက်ရိုက် စတော့သွင်းထားခြင်း`,
        };
        next = [...prev];
        next[existingIndex] = resultingProduct;
      } else {
        next = [resultingProduct, ...prev];
      }
      saveStorage('products', next);
      return next;
    });

    if (supabase) {
      supabaseUpsertProduct(resultingProduct).catch(console.warn);
    }

    // Mark order as Stocked
    setWorkshopOrders((prev) => {
      const next = prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'Stocked' as WorkshopJobStatus, linkedProductId: resultingProduct.id }
          : o
      );
      saveStorage('workshop_orders', next);
      if (supabase) {
        supabaseSaveWorkshopOrders(next).catch(console.warn);
      }
      return next;
    });

    notifyCrossAppSync();

    recordLog(
      'info',
      'WORKSHOP',
      `ပန်းထိမ်အပ်ထည် ${targetOrder.jobNo} မှ ကုန်ပစ္စည်းစတော့စာရင်းသို့ သွင်းယူပြီးစီး: SKU [${autoSku}] ${targetOrder.title}`
    );

    return resultingProduct;
  };

  const syncWorkshopOrdersToStock = (): number => {
    let addedCount = 0;
    setProducts((prev) => {
      let next = [...prev];
      workshopOrders.forEach((order) => {
        if (order.status === 'Stocked' || order.status === 'Received') {
          const isCoreStockId = order.linkedProductId && /^prd_00[1-7]$/.test(order.linkedProductId);
          const targetLinkedId = isCoreStockId ? undefined : order.linkedProductId;

          const alreadyExists = next.some((p) => {
            if (targetLinkedId && p.id === targetLinkedId) return true;
            if (p.sku && order.jobNo && p.sku.toLowerCase().includes(order.jobNo.replace('JOB-', '').toLowerCase())) return true;
            if (p.notes && order.jobNo && p.notes.includes(order.jobNo)) return true;
            return false;
          });

          if (!alreadyExists) {
            addedCount++;
            const autoSku = `WSP-${(order.purity || '15').replace('_PE', '')}-${order.jobNo.replace('JOB-', '')}`;
            const fallbackId = targetLinkedId || 'prd_wsp_' + order.jobNo.replace('JOB-', '');
            const newProd: Product = {
              id: fallbackId,
              sku: autoSku,
              name: order.title,
              category: order.category || 'Other',
              purity: order.purity || '15_PE',
              weight: order.finishedWeight || order.givenWeight || { kyat: 0, pe: 1, yway: 0 },
              stoneWeightYway: order.stoneWeightYway || 0,
              stoneCharge: order.stoneCost || 0,
              makingCharge: order.totalLaborCharge || 0,
              costPrice: (order.totalLaborCharge || 0) + (order.stoneCost || 0),
              status: 'In Stock',
              notes: `ပန်းထိမ်အပ်ထည် ${order.jobNo} (${order.goldsmithName}) မှ တိုက်ရိုက် စတော့သွင်းထားခြင်း`,
              createdAt: order.receivedDate || order.orderDate || new Date().toISOString().split('T')[0],
            };
            next = [...next, newProd];
            if (supabase) {
              supabaseUpsertProduct(newProd).catch(console.warn);
            }
          }
        }
      });
      if (addedCount === 0) {
        return prev;
      }
      const cleanNext = cleanAndDeduplicateProducts(next);
      saveStorage('products', cleanNext);
      return cleanNext;
    });

    // Also synchronize workshopOrders in reverse!
    setWorkshopOrders((prev) => {
      let ordersUpdated = false;
      const next = prev.map((order) => {
        const matchingProduct = products.find((p) => {
          if (order.linkedProductId && p.id === order.linkedProductId) return true;
          if (order.jobNo === 'JOB-2601' && (p.id === 'prd_wsp_2601' || (p.sku && p.sku.includes('2601')))) return true;
          if (order.jobNo === 'JOB-2602' && (p.id === 'prd_wsp_2602' || (p.sku && p.sku.includes('2602')))) return true;
          if (p.sku && order.jobNo && p.sku.toLowerCase().includes(order.jobNo.replace('JOB-', '').toLowerCase())) return true;
          if (p.notes && order.jobNo && p.notes.includes(order.jobNo)) return true;
          return false;
        });

        const shouldBeStocked = Boolean(matchingProduct) || order.jobNo === 'JOB-2601' || order.jobNo === 'JOB-2602';
        if (shouldBeStocked && order.status !== 'Stocked') {
          ordersUpdated = true;
          const targetLinkedId = matchingProduct?.id || (order.jobNo === 'JOB-2601' ? 'prd_wsp_2601' : order.jobNo === 'JOB-2602' ? 'prd_wsp_2602' : order.linkedProductId);
          return {
            ...order,
            status: 'Stocked' as WorkshopJobStatus,
            linkedProductId: targetLinkedId,
          };
        }
        return order;
      });

      if (ordersUpdated) {
        saveStorage('workshop_orders', next);
        if (supabase) {
          supabaseSaveWorkshopOrders(next).catch(console.warn);
        }
        return next;
      }
      return prev;
    });

    return addedCount;
  };

  const deduplicateStock = async (): Promise<{ removedCount: number; remainingCount: number }> => {
    const originalCount = products.length;
    const cleaned = cleanAndDeduplicateProducts(products);
    const removedCount = Math.max(0, originalCount - cleaned.length);

    setProducts(cleaned);
    saveStorage('products', cleaned);

    if (supabase) {
      try {
        for (const prod of cleaned) {
          await supabaseUpsertProduct(prod);
        }
      } catch (e) {
        console.warn('deduplicateStock remote sync note:', e);
      }
    }

    recordLog('info', 'INVENTORY', `စတော့စာရင်း သန့်စင်ခဲ့သည်: ထပ်နေသော ပစ္စည်း ${removedCount} ခု ဖယ်ရှားပြီး လက်ကျန် ${cleaned.length} ခု တိကျစွာ သတ်မှတ်ခဲ့သည်`);
    return { removedCount, remainingCount: cleaned.length };
  };

  const syncProductsToSupabase = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    const cleaned = cleanAndDeduplicateProducts(products);
    setProducts(cleaned);
    saveStorage('products', cleaned);

    if (!supabase) {
      return { success: false, count: cleaned.length, error: 'Supabase ချိတ်ဆက်မထားပါ' };
    }

    try {
      for (const prod of cleaned) {
        await supabaseUpsertProduct(prod);
      }
      return { success: true, count: cleaned.length };
    } catch (e: any) {
      return { success: false, count: cleaned.length, error: e?.message || 'Upload failed' };
    }
  };

  const receiveWorkshopOrder = (
    id: string,
    receiveData: {
      receivedDate: string;
      finishedWeight: GoldWeight;
      scrapWeight?: GoldWeight;
      stoneWeightYway?: number;
      stoneCost?: number;
      paidLaborAddition?: number;
      shortagePenalty?: number;
      receivedBy?: string;
      notes?: string;
      autoAddToStock?: boolean;
      customSku?: string;
      costPrice?: number;
    }
  ): Product | null => {
    const targetOrder = workshopOrders.find((o) => o.id === id);
    if (!targetOrder) return null;

    const discrepancy = calculateWorkshopWastageDiscrepancy(
      targetOrder.givenWeight,
      receiveData.finishedWeight,
      receiveData.scrapWeight,
      targetOrder.allowedWastage
    );

    const paidLaborAddition = Number(receiveData.paidLaborAddition) || 0;
    const shortagePenalty = Number(receiveData.shortagePenalty) || 0;
    const newPaidLabor = (targetOrder.paidLaborCharge || 0) + paidLaborAddition;
    const newBalanceLabor = Math.max(
      0,
      targetOrder.totalLaborCharge - newPaidLabor - shortagePenalty
    );

    const willAutoStock = true;

    const jobNumClean = (targetOrder.jobNo || '0000').replace('JOB-', '');
    const purityClean = (targetOrder.purity || '15').replace('_PE', '');
    const autoSku = receiveData.customSku?.trim() || `WSP-${purityClean}-${jobNumClean}`;
    const calculatedCost =
      receiveData.costPrice !== undefined
        ? receiveData.costPrice
        : (targetOrder.totalLaborCharge || 0) + (receiveData.stoneCost ?? targetOrder.stoneCost ?? 0);

    const isCoreStockId = targetOrder.linkedProductId && /^prd_00[1-7]$/.test(targetOrder.linkedProductId);
    const finalProductId =
      targetOrder.linkedProductId && !isCoreStockId
        ? targetOrder.linkedProductId
        : `prd_wsp_${jobNumClean}_${Math.random().toString(36).substring(2, 7)}`;

    const updatedOrder: WorkshopJobOrder = {
      ...targetOrder,
      receivedDate: receiveData.receivedDate,
      finishedWeight: receiveData.finishedWeight,
      scrapWeight: receiveData.scrapWeight || { kyat: 0, pe: 0, yway: 0 },
      stoneWeightYway: receiveData.stoneWeightYway ?? targetOrder.stoneWeightYway,
      stoneCost: receiveData.stoneCost ?? targetOrder.stoneCost,
      actualLossWeight: discrepancy.actualLossWeight,
      wastageVarianceYway: discrepancy.varianceYway,
      shortagePenalty,
      paidLaborCharge: newPaidLabor,
      balanceLaborCharge: newBalanceLabor,
      status: 'Stocked' as WorkshopJobStatus,
      linkedProductId: finalProductId,
      receivedBy: receiveData.receivedBy || currentUser.name,
      notes: receiveData.notes
        ? `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}${receiveData.notes}`
        : targetOrder.notes,
    };

    setWorkshopOrders((prev) => {
      const next = prev.map((o) => (o.id === id ? updatedOrder : o));
      saveStorage('workshop_orders', next);
      if (supabase) {
        supabaseSaveWorkshopOrders(next).catch(console.warn);
      }
      return next;
    });

    // Update target Goldsmith's gold holding and statistics
    setGoldsmiths((prev) => {
      const next = prev.map((g) => {
        if (g.id === targetOrder.goldsmithId) {
          const reducedGold = subtractWeights(
            g.totalGoldWithGoldsmith || { kyat: 0, pe: 0, yway: 0 },
            targetOrder.givenWeight
          );
          return {
            ...g,
            totalGoldWithGoldsmith: reducedGold,
            totalJobsCompleted: (g.totalJobsCompleted || 0) + 1,
            totalLaborPaid: (g.totalLaborPaid || 0) + paidLaborAddition,
            pendingLabor: Math.max(0, (g.pendingLabor || 0) - paidLaborAddition - shortagePenalty),
          };
        }
        return g;
      });
      saveStorage('goldsmiths', next);
      if (supabase) {
        supabaseSaveGoldsmiths(next).catch(console.warn);
      }
      return next;
    });

    notifyCrossAppSync();

    let createdProduct: Product | null = null;
    if (willAutoStock) {
      const today = receiveData.receivedDate || new Date().toISOString().split('T')[0];
      createdProduct = {
        id: finalProductId,
        sku: autoSku,
        name: targetOrder.title,
        category: targetOrder.category || 'Other',
        purity: targetOrder.purity || '15_PE',
        weight: receiveData.finishedWeight,
        stoneWeightYway: receiveData.stoneWeightYway ?? targetOrder.stoneWeightYway ?? 0,
        stoneCharge: receiveData.stoneCost ?? targetOrder.stoneCost ?? 0,
        makingCharge: targetOrder.totalLaborCharge || 0,
        costPrice: calculatedCost,
        status: 'In Stock',
        notes: `ပန်းထိမ်အပ်ထည် ${targetOrder.jobNo} (${targetOrder.goldsmithName}) မှ တိုက်ရိုက် စတော့သွင်းထားခြင်း`,
        createdAt: today,
      };

      setProducts((prev) => {
        const existingIndex = prev.findIndex(
          (p) =>
            (!isCoreStockId && finalProductId && p.id === finalProductId) ||
            (p.sku && p.sku.toLowerCase() === autoSku.toLowerCase()) ||
            (p.notes && targetOrder.jobNo && p.notes.includes(targetOrder.jobNo))
        );
        let next: Product[];
        if (existingIndex >= 0) {
          next = [...prev];
          next[existingIndex] = createdProduct!;
        } else {
          next = [createdProduct!, ...prev];
        }
        saveStorage('products', next);
        return next;
      });

      if (supabase) {
        supabaseUpsertProduct(createdProduct).catch(console.warn);
      }
    }

    if (discrepancy.isShortage) {
      recordLog(
        'warn',
        'WORKSHOP',
        `⚠️ ပန်းထိမ်အပ်ထည် ${targetOrder.jobNo} လက်ခံရာတွင် အလျော့တွက် ${discrepancy.varianceYway.toFixed(1)} ရွေး ပိုမိုပေါက်ကြားနေသည်! (ပန်းထိမ်: ${targetOrder.goldsmithName})`,
        {
          jobNo: targetOrder.jobNo,
          discrepancyYway: discrepancy.varianceYway,
          shortagePenalty,
        }
      );
    } else {
      recordLog(
        'info',
        'WORKSHOP',
        `ပန်းထိမ်အပ်ထည် ${targetOrder.jobNo} (${targetOrder.title}) အောင်မြင်စွာ လက်ခံစစ်ဆေးပြီးစီးခဲ့သည်${willAutoStock ? ' (စတော့စာရင်းသို့ သွင်းယူပြီးစီး)' : ''}`,
        {
          jobNo: targetOrder.jobNo,
          varianceYway: discrepancy.varianceYway,
        }
      );
    }

    return createdProduct;
  };

  const deleteWorkshopOrder = (id: string) => {
    const target = workshopOrders.find((o) => o.id === id);
    setWorkshopOrders((prev) => {
      const next = prev.filter((o) => o.id !== id);
      saveStorage('workshop_orders', next);
      if (supabase) {
        supabaseSaveWorkshopOrders(next).catch(console.warn);
        supabaseDeleteWorkshopOrder(id, target?.jobNo).catch(console.warn);
      }
      return next;
    });
    notifyCrossAppSync();
    if (target) {
      recordLog('warn', 'WORKSHOP', `ပန်းထိမ်အပ်ထည် စာရင်းမှ ပယ်ဖျက်ခဲ့သည် (${target.jobNo} - ${target.title})`);
    }
  };

  // Backup & Reset
  const exportBackup = () => {
    const fullData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      goldPrices,
      products,
      sales,
      settlements,
      purchases,
      customers,
      suppliers,
      expenses,
      goldsmiths,
      workshopOrders,
    };
    return JSON.stringify(fullData, null, 2);
  };

  const importBackup = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.settings) setSettingsState(data.settings);
      if (Array.isArray(data.goldPrices)) setGoldPrices(sortGoldPricesAscending(data.goldPrices));
      if (Array.isArray(data.products)) setProducts(data.products);
      if (Array.isArray(data.sales)) setSales(data.sales);
      if (Array.isArray(data.settlements)) setSettlements(data.settlements);
      if (Array.isArray(data.purchases)) setPurchases(data.purchases);
      if (Array.isArray(data.customers)) setCustomers(data.customers);
      if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
      if (Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (Array.isArray(data.goldsmiths)) setGoldsmiths(data.goldsmiths);
      if (Array.isArray(data.workshopOrders)) setWorkshopOrders(data.workshopOrders);
      return true;
    } catch (e) {
      console.error('Import backup failed:', e);
      return false;
    }
  };

  const resetToInitialData = () => {
    setSettingsState(INITIAL_SETTINGS);
    setCurrentUser(INITIAL_USERS[0]);
    setGoldPrices(sortGoldPricesAscending(INITIAL_GOLD_PRICES));
    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setSettlements([]);
    setPurchases(INITIAL_PURCHASES);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setExpenses(INITIAL_EXPENSES);
    setGoldsmiths(INITIAL_GOLDSMITHS);
    setWorkshopOrders(INITIAL_WORKSHOP_ORDERS);
  };

  // Data Cleanup & Archival Implementations
  const getCurrentAppState = () => ({
    shopName: settings.shopName || 'ရွှေဆိုင် POS',
    sales,
    purchases,
    expenses,
    workshopOrders,
    products,
  });

  const getCleanupStats = (filter: DataCleanupFilter): DataCleanupStats => {
    return calculateCleanupStats(filter, getCurrentAppState());
  };

  const getArchiveBundle = (filter: DataCleanupFilter): ArchiveBundle => {
    return buildArchiveBundle(filter, getCurrentAppState());
  };

  const downloadArchiveJson = (filter: DataCleanupFilter) => {
    const bundle = buildArchiveBundle(filter, getCurrentAppState());
    const dateStr = filter.cutoffDate || new Date().toISOString().split('T')[0];
    const filename = `gold_shop_archive_${dateStr}.json`;
    downloadFile(JSON.stringify(bundle, null, 2), filename, 'application/json');
  };

  const downloadSalesArchiveCsv = (filter: DataCleanupFilter) => {
    const bundle = buildArchiveBundle(filter, getCurrentAppState());
    if (!bundle.sales || bundle.sales.length === 0) return;
    const csvContent = generateSalesCsv(bundle.sales);
    const dateStr = filter.cutoffDate || new Date().toISOString().split('T')[0];
    const filename = `gold_shop_sales_archive_${dateStr}.csv`;
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  };

  const getSupabaseCleanupSql = (filter: DataCleanupFilter): string => {
    return generateSupabaseCleanupSql(filter);
  };

  const executeDataCleanup = async (
    filter: DataCleanupFilter,
    archiveFirst: boolean = true
  ): Promise<CleanupResult> => {
    if (archiveFirst) {
      downloadArchiveJson(filter);
    }
    const result = await executePurge(
      filter,
      getCurrentAppState(),
      {
        setSales,
        setPurchases,
        setExpenses,
        setWorkshopOrders,
        setProducts,
        saveStorage,
      },
      {
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        counterId: currentCounter.id,
      }
    );
    result.downloadedArchive = archiveFirst;
    return result;
  };

  return (
    <GoldShopContext.Provider
      value={{
        settings,
        updateSettings,
        currentUser,
        switchUserRole,
        language,
        setLanguage,
        currentCounter,
        setCurrentCounter,
        counters,
        storeOperation,
        openStore,
        closeStore,
        isAuthenticated,
        isLocked,
        lockSession,
        unlockSession,
        loginWithPin,
        logout,
        verifyManagerPin,
        verifyStaffPin,
        isSupabaseConnected,
        supabaseUser,
        userProfiles,
        addStaffMember,
        deleteStaffMember,
        purgeStaffAccounts,
        updateStaffProfile,
        loginWithSupabase,
        registerWithSupabase,
        resendConfirmationEmail,
        logoutSupabase,
        updateStaffRole,
        syncAllToSupabase,
        uploadAndVerifyAllToSupabase,
        checkSupabaseHealth,
        refreshSupabaseData,
        isOnline,
        isSyncing,
        lastSyncedTime,
        goldPrices,
        updateGoldPrice,
        addGoldPrice,
        getGoldPriceByPurity,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        deduplicateStock,
        syncProductsToSupabase,
        sales,
        createSale,
        voidSale,
        settleSaleCredit,
        settlements,
        purchases,
        createPurchase,
        customers,
        addCustomer,
        updateCustomer,
        settleCustomerBalance,
        suppliers,
        addSupplier,
        updateSupplier,
        expenses,
        addExpense,
        deleteExpense,
        goldsmiths,
        addGoldsmith,
        updateGoldsmith,
        deleteGoldsmith,
        workshopOrders,
        createWorkshopOrder,
        updateWorkshopOrder,
        receiveWorkshopOrder,
        convertWorkshopOrderToInventory,
        syncWorkshopOrdersToStock,
        deleteWorkshopOrder,
        exportBackup,
        importBackup,
        resetToInitialData,
        calculateCleanupStats: getCleanupStats,
        generateArchiveBundle: getArchiveBundle,
        downloadArchiveJson,
        downloadSalesArchiveCsv,
        generateSupabaseCleanupSql: getSupabaseCleanupSql,
        executeDataCleanup,
      }}
    >
      {children}
    </GoldShopContext.Provider>
  );
};

export const useGoldShop = () => {
  const context = useContext(GoldShopContext);
  if (!context) {
    throw new Error('useGoldShop must be used within a GoldShopProvider');
  }
  return context;
};
