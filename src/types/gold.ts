export type PurityType = '16_PE' | '15_PE' | '14_PE' | '13_PE' | '12_PE' | string;

export interface GoldWeight {
  kyat: number; // ကျပ်
  pe: number;   // ပဲ (0 - 15)
  yway: number; // ရွေး (0 - 7.99)
}

export interface GoldPrice {
  id: string;
  date: string;
  purity: PurityType;
  purityLabel: string;
  buyPrice: number;  // MMK per 1 Kyat-tha
  sellPrice: number; // MMK per 1 Kyat-tha
  updatedAt: string;
}

export type ProductCategory = 
  | 'Ring' 
  | 'Necklace' 
  | 'Bracelet' 
  | 'Earring' 
  | 'Chain' 
  | 'Bangle' 
  | 'Pendant' 
  | 'Gold Bar' 
  | 'Other';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  purity: PurityType;
  weight: GoldWeight;
  stoneWeightYway?: number;
  stoneCharge: number;
  makingCharge: number; // လက်ခ
  costPrice: number;    // အရင်းစရိတ်
  status: 'In Stock' | 'Sold' | 'Reserved';
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId?: string;
  sku?: string;
  name: string;
  category: ProductCategory;
  purity: PurityType;
  actualWeight: GoldWeight;
  wastage: GoldWeight;       // အလျော့တွက်
  billableWeight: GoldWeight; // actual + wastage
  goldPricePerKyat: number;
  goldAmount: number;         // (billable in kyat) * price
  makingCharge: number;       // လက်ခ
  stoneCharge: number;        // ကျောက်ဖိုး
  discount: number;           // လျှော့ဈေး
  total: number;
}

export type PaymentMethod = 'Cash' | 'KBZPay' | 'AYA Pay' | 'CB Pay' | 'WavePay' | 'Bank Transfer' | 'Credit';

export interface PaymentRecord {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  date?: string;
  cashier?: string;
  notes?: string;
}

export interface DebtSettlement {
  id: string;
  receiptNo: string;
  saleId?: string;
  invoiceNo?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  previousBalance: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  cashierName: string;
  notes?: string;
  date: string;
  createdAt: string;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotalGold: number;
  totalMakingCharge: number;
  totalStoneCharge: number;
  totalDiscount: number;
  grandTotal: number;
  payments: PaymentRecord[];
  paidAmount: number;
  balanceRemaining: number; // Outstanding customer credit
  cashierName: string;
  notes?: string;
  status: 'Completed' | 'Pending Balance' | 'Void';
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidApprovedBy?: string;
  counterId?: string; // e.g. 'C1', 'C2', 'C3'
  counterName?: string; // e.g. 'ကောင်တာ (၁)'
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  voucherNo: string;
  date: string;
  partyType: 'Customer' | 'Supplier';
  partyName: string;
  partyPhone?: string;
  itemDescription: string;
  purity: PurityType;
  grossWeight: GoldWeight;
  deduction: GoldWeight; // နုတ်တွက် / အလျော့
  netWeight: GoldWeight;
  buyPricePerKyat: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cashierName: string;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  totalPurchased: number;
  totalSoldBack: number;
  outstandingBalance: number; // Amount owed to shop
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalSupplied: number;
  outstandingBalance: number;
  createdAt: string;
}

export type ExpenseCategory = 
  | 'Rent' 
  | 'Electricity' 
  | 'Salary' 
  | 'Transportation' 
  | 'Repair' 
  | 'Other';

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  note: string;
  recordedBy: string;
  createdAt: string;
}

export type UserRole = 'Admin' | 'Manager' | 'Staff';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  pin?: string;
  phone?: string;
}

export interface ShopSettings {
  shopName: string;
  shopNameMm: string;
  address: string;
  phone: string;
  tagline: string;
  invoicePrefix: string;
  defaultWastageYway: number;
  currency: string;
  language: 'my' | 'en';
  autoLockMinutes?: number;
  storeOperation?: StoreOperationState;
  scannerSuffix?: 'ENTER' | 'TAB' | 'NONE';
  scannerBeep?: boolean;
  scannerAutoCart?: boolean;
  scannerType?: 'USB_GUN' | 'WIRELESS_24G' | 'BLUETOOTH' | 'BARCODE_TO_PC';
}

export interface StoreOperationState {
  isOpen: boolean;
  openedAt?: string; // ISO date-time
  openedBy?: string; // User display name
  openedById?: string; // User ID
  closedAt?: string; // ISO date-time
  closedBy?: string; // User display name
  closedById?: string; // User ID
  closeNote?: string; // Closing remarks
}

export interface CounterTerminal {
  id: string; // 'C1', 'C2', 'C3', 'C4'
  name: string; // 'ကောင်တာ (၁)', 'ကောင်တာ (၂)', 'ကောင်တာ (၃)'
  nameEn: string; // 'Counter 1', 'Counter 2', 'Counter 3'
  description?: string;
}

export const DEFAULT_COUNTERS: CounterTerminal[] = [
  { id: 'C1', name: 'ကောင်တာ (၁)', nameEn: 'Counter 1', description: 'ပင်မ ကောင်တာ (Main Counter)' },
  { id: 'C2', name: 'ကောင်တာ (၂)', nameEn: 'Counter 2', description: 'အလယ် ကောင်တာ (Middle Counter)' },
  { id: 'C3', name: 'ကောင်တာ (၃)', nameEn: 'Counter 3', description: 'အဝင် ကောင်တာ (Entrance Counter)' },
  { id: 'C4', name: 'ကောင်တာ (၄)', nameEn: 'Counter 4', description: 'VIP / အထူး ကောင်တာ' },
];

// Goldsmith & Workshop Job Orders (ပန်းထိမ်အပ်နှံမှုနှင့် ရွှေကျို/ရွှေသွန်း စာရင်း)
export interface Goldsmith {
  id: string;
  name: string;
  phone: string;
  workshopName: string;
  address?: string;
  specialty: string; // e.g. 'ရွှေစင်ပန်းထိမ် / အခေါက်ထည်', 'စိန်ထည် / ကျောက်စီ', 'ရွှေကျို / ရွှေသွန်း'
  status: 'Active' | 'Inactive';
  totalGoldWithGoldsmith: GoldWeight; // လက်ဝယ်ရှိ ဆိုင်အပ်ရွှေချိန်
  totalJobsCompleted: number;
  totalLaborPaid: number;
  pendingLabor: number;
  notes?: string;
  createdAt: string;
}

export type WorkshopJobType = 
  | 'CustomerOrder'   // ဖောက်သည် စိတ်ကြိုက် အော်ဒါအပ်ထည်
  | 'StockProduction' // ဆိုင်တင် ရောင်းချရန် ထုတ်လုပ်ခြင်း
  | 'GoldMelting'     // ရွှေကျို / ရွှေသွန်း / ရွှေစင်သန့်စင်ခြင်း
  | 'RepairResize';   // ပြုပြင် / ဆိုဒ်ချဲ့ / ဆိုဒ်ချုံ့ခြင်း

export type WorkshopJobStatus =
  | 'Given'           // ရွှေအပ်နှံထားဆဲ (Given to Workshop)
  | 'InProgress'      // ပြုလုပ်နေဆဲ (In Progress)
  | 'Received'        // ပန်းထိမ်မှ ပြန်လည်လက်ခံရရှိပြီး (Finished Item Received)
  | 'Stocked'         // စတော့စာရင်း သို့မဟုတ် ဖောက်သည်ထံ ပေးအပ်ပြီး (Added to Stock / Delivered)
  | 'Cancelled';      // ပယ်ဖျက် (Cancelled)

export interface WorkshopJobOrder {
  id: string;
  jobNo: string; // e.g. "JOB-2601"
  orderType: WorkshopJobType;
  title: string;
  category: ProductCategory;
  purity: PurityType;
  goldsmithId: string;
  goldsmithName: string;

  // ဖောက်သည်အပ်ထည် ဖြစ်ပါက (Customer Custom Order)
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  depositAmount?: number; // ဖောက်သည် စရန်ငွေ

  // အပ်နှံချိန် စာရင်း (Issued / Given)
  orderDate: string; // YYYY-MM-DD
  dueDate?: string; // ခန့်မှန်းပြီးစီးရက်
  givenWeight: GoldWeight; // ပန်းထိမ်သို့ ထုတ်ပေးလိုက်သော ရွှေချိန်
  givenDescription?: string; // e.g. "၁၆ ပဲရည် အခေါက်တုံး ၂ ကျပ်သား", "ရွှေဟောင်းလက်ကောက် ၂ ကွင်း"

  // ခွင့်ပြုအလျော့တွက် စည်းကမ်းချက်
  allowedWastage: GoldWeight; // ပန်းထိမ်ဆရာအား သတ်မှတ်ပေးထားသော အလျော့တွက် ပမာဏ (e.g. ၂ ရွေး)

  // ပန်းထိမ်လက်ခ (Labor Fee)
  laborChargeType: 'Fixed' | 'PerKyat' | 'PerPiece';
  laborRate: number; // တစ်ထည် သို့မဟုတ် ကျပ်သားနှုန်း
  totalLaborCharge: number; // စုစုပေါင်း လက်ခ
  paidLaborCharge: number; // ပေးချေပြီး လက်ခ
  balanceLaborCharge: number; // ပေးရန်ကျန် လက်ခ

  // လက်ခံရရှိချိန် စာရင်း (Received / Settled)
  receivedDate?: string;
  finishedWeight?: GoldWeight; // ပန်းထိမ်မှ ပြီးစီး၍ ပြန်အပ်သော အထည်ရွှေချိန်
  scrapWeight?: GoldWeight; // ပြန်အပ်သော ရွှေစ / ရွှေအပို (Scrap Gold)
  stoneWeightYway?: number; // တွဲဖက်စီခြယ်ထားသော ကျောက်/စိန် အလေးချိန် (ရွေး)
  stoneCost?: number; // ကျောက်ဖိုး

  // အလျော့တွက် တွက်ချက်မှု ရလဒ်များ (Calculated Wastage & Discrepancies)
  actualLossWeight?: GoldWeight; // Given - (Finished + Scrap)
  wastageVarianceYway?: number; // Actual Loss in Yway - Allowed Wastage in Yway (+ = Shortage/ရွှေပေါက်ကြားမှု, - = Within Limit/အမြတ်)
  shortagePenalty?: number; // ရွှေပေါက်ကြားမှုအတွက် ပန်းထိမ်ဆရာထံ လျော်ကြေးငွေ တောင်းခံငွေ သို့မဟုတ် လက်ခထဲမှနုတ်ယူငွေ

  // အဆင့်နှင့် လက်မှတ်
  status: WorkshopJobStatus;
  notes?: string;
  assignedBy: string; // အပ်နှံသူ Cashier / Manager
  receivedBy?: string; // လက်ခံစစ်ဆေးသူ
  linkedProductId?: string; // စတော့စာရင်းသို့ သွင်းပြီးပါက ချိတ်ဆက်ထားသော Product ID
  createdAt: string;
}

export interface DataCleanupFilter {
  cutoffDate: string; // YYYY-MM-DD
  includeSales: boolean;
  includePurchases: boolean;
  includeExpenses: boolean;
  includeWorkshopOrders: boolean;
  includeSoldProducts: boolean;
  includeSystemLogs: boolean;
}

export interface ArchiveBundle {
  version: string;
  archivedAt: string;
  shopName: string;
  cutoffDate: string;
  summary: {
    salesCount: number;
    purchasesCount: number;
    expensesCount: number;
    workshopOrdersCount: number;
    soldProductsCount: number;
    systemLogsCount: number;
    totalCount: number;
  };
  sales?: Sale[];
  purchases?: PurchaseItem[];
  expenses?: Expense[];
  workshopOrders?: WorkshopJobOrder[];
  soldProducts?: Product[];
  systemLogs?: any[];
}

export interface CleanupResult {
  salesPurged: number;
  purchasesPurged: number;
  expensesPurged: number;
  workshopOrdersPurged: number;
  soldProductsPurged: number;
  systemLogsPurged: number;
  totalPurged: number;
  supabaseCleanedCount: number;
  downloadedArchive: boolean;
}

export interface DataCleanupStats {
  salesCount: number;
  purchasesCount: number;
  expensesCount: number;
  workshopOrdersCount: number;
  soldProductsCount: number;
  systemLogsCount: number;
  totalItems: number;
  estimatedBytes: number;
}
