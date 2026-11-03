import React, { useState, useMemo } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { NavTab } from './Navbar';
import {
  formatMMK,
  formatNumber,
  formatWeightMm,
  weightToKyatDecimal,
  weightToTotalYway,
  totalYwayToWeight,
  sortGoldPricesAscending,
  sortGoldPricesDescending,
} from '../services/calculationEngine';
import { Sale, ProductCategory } from '../types/gold';
import { getPurityTheme } from '../utils/purityTheme';
import {
  TrendingUp,
  Coins,
  ShoppingCart,
  ArrowDownCircle,
  Gem,
  AlertTriangle,
  Users,
  Wallet,
  ArrowUpRight,
  PlusCircle,
  Receipt,
  Sparkles,
  Calendar,
  Layers,
  ArrowDownUp,
  Hammer,
} from 'lucide-react';
import { DebtSettlementModal } from './DebtSettlementModal';

interface DashboardProps {
  setActiveTab: (tab: NavTab) => void;
  onSelectSaleForInvoice: (sale: Sale) => void;
  onOpenQuickPriceModal: () => void;
}

const ALL_CATEGORIES: { cat: ProductCategory; name: string }[] = [
  { cat: 'Ring', name: 'လက်စွပ် (Rings)' },
  { cat: 'Necklace', name: 'ဆွဲကြိုး (Necklaces)' },
  { cat: 'Bracelet', name: 'လက်ကောက် (Bracelets)' },
  { cat: 'Earring', name: 'နားကပ် (Earrings)' },
  { cat: 'Bangle', name: 'လက်စွပ်ကွင်း / ဘီးကွင်း (Bangles)' },
  { cat: 'Chain', name: 'ကြိုး (Chains)' },
  { cat: 'Pendant', name: 'ဆွဲသီး (Pendants)' },
  { cat: 'Gold Bar', name: 'ရွှေတုံး/ပြား (Bars)' },
  { cat: 'Other', name: 'အခြား (Other)' },
];

export const Dashboard: React.FC<DashboardProps> = ({
  setActiveTab,
  onSelectSaleForInvoice,
  onOpenQuickPriceModal,
}) => {
  const {
    goldPrices,
    sales,
    purchases,
    products,
    customers,
    expenses,
    currentUser,
    storeOperation,
    language,
  } = useGoldShop();

  const [settleSale, setSettleSale] = useState<Sale | null>(null);
  const [stockViewMode, setStockViewMode] = useState<'in_stock_only' | 'all'>('in_stock_only');

  const todayStr = new Date().toISOString().split('T')[0];

  // Today's Sales
  const safeSales = Array.isArray(sales) ? sales : [];
  const safePurchases = Array.isArray(purchases) ? purchases : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeGoldPrices = Array.isArray(goldPrices) ? goldPrices : [];
  const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sorted gold prices: default ascending 'asc' (ငယ်စဉ် ကြီးလိုက်)
  const sortedGoldPrices = useMemo(() => {
    return priceSortOrder === 'asc'
      ? sortGoldPricesAscending(safeGoldPrices)
      : sortGoldPricesDescending(safeGoldPrices);
  }, [safeGoldPrices, priceSortOrder]);

  const todaySalesList = safeSales.filter(
    (s) => s && s.date === todayStr && s.status !== 'Void'
  );
  const todaySalesAmount = todaySalesList.reduce(
    (sum, s) => sum + (Number(s?.grandTotal) || 0),
    0
  );

  // Today's Purchases (Customer Gold Buy)
  const todayPurchasesList = safePurchases.filter((p) => p && p.date === todayStr);
  const todayPurchasesAmount = todayPurchasesList.reduce(
    (sum, p) => sum + (Number(p?.totalAmount) || 0),
    0
  );

  // Today's Expenses
  const todayExpensesList = safeExpenses.filter((e) => e && e.date === todayStr);
  const todayExpensesAmount = todayExpensesList.reduce(
    (sum, e) => sum + (Number(e?.amount) || 0),
    0
  );

  // Stock inventory calculation
  const inStockProducts = safeProducts.filter((p) => p && p.status === 'In Stock');
  const totalStockYway = inStockProducts.reduce(
    (sum, p) => sum + (p?.weight ? weightToTotalYway(p.weight) : 0),
    0
  );
  const totalStockWeight = totalYwayToWeight(totalStockYway);

  // Estimate total stock market value using current 15 Pe gold price
  const price15 = safeGoldPrices.find((p) => p?.purity === '15_PE')?.sellPrice || 7000000;
  const estimatedStockValue = Math.round(weightToKyatDecimal(totalStockWeight) * price15);

  // Dynamic breakdown of in-stock products by category
  const categoryStockBreakdown = useMemo(() => {
    const catMap = new Map<string, { cat: string; name: string; count: number; totalYway: number }>();

    // Register all standard categories
    ALL_CATEGORIES.forEach((item) => {
      catMap.set(item.cat, { cat: item.cat, name: item.name, count: 0, totalYway: 0 });
    });

    // Count every single product in stock
    inStockProducts.forEach((p) => {
      const catKey = p.category || 'Other';
      const yway = p.weight ? weightToTotalYway(p.weight) : 0;
      if (catMap.has(catKey)) {
        const item = catMap.get(catKey)!;
        item.count += 1;
        item.totalYway += yway;
      } else {
        catMap.set(catKey, {
          cat: catKey,
          name: `${catKey} (အခြား)`,
          count: 1,
          totalYway: yway,
        });
      }
    });

    const allList = Array.from(catMap.values());
    if (stockViewMode === 'in_stock_only') {
      return allList.filter((item) => item.count > 0);
    }
    return allList;
  }, [inStockProducts, stockViewMode]);

  // Outstanding customer credit
  const totalCustomerCredit = safeCustomers.reduce(
    (sum, c) => sum + (Number(c?.outstandingBalance) || 0),
    0
  );

  // Cash Inflow estimation today
  const todayCashIn = todaySalesList.reduce(
    (sum, s) => sum + (Number(s?.paidAmount) || 0),
    0
  );
  const todayCashOut = todayPurchasesAmount + todayExpensesAmount;
  const netCashToday = todayCashIn - todayCashOut;

  // Approximate today's profit = Sales - Estimated Cost of goods sold - Expenses
  const todayProfit = todaySalesAmount > 0
    ? todaySalesList.reduce((profitSum, s) => {
        const costSum = (s?.items || []).reduce((cSum, item) => {
          return cSum + ((Number(item?.goldAmount) || 0) * 0.92);
        }, 0);
        return profitSum + ((Number(s?.grandTotal) || 0) - costSum);
      }, 0) - todayExpensesAmount
    : 0;

  // Low stock categories alert (if under 2 items in category)
  const lowStockCount = inStockProducts.length < 5;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-stone-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Calendar className="w-3 h-3" />
                <span>စက်တင်ဘာ {new Date().getDate()}၊ ၂၀၂၆</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  storeOperation?.isOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${storeOperation?.isOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span>{storeOperation?.isOpen ? 'ဆိုင်ဖွင့်ထားသည်' : 'ဆိုင်ပိတ်ထားသည်'}</span>
              </span>
              <span className="text-xs text-stone-400">
                မင်္ဂလာပါ၊ {currentUser?.name || 'မန်နေဂျာ'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>ရွှေဆိုင် POS စီမံခန့်ခွဲမှု ဒက်ရှ်ဘုတ်</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-xl">
              ယနေ့ ရွှေဈေးနှုန်း၊ အရောင်းအဝယ်၊ ရွှေအလေးချိန်နှင့် လက်ကျန်စာရင်း အကျဉ်းချုပ်
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>ရွှေရောင်းမည် (POS)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('buy')}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-white font-semibold rounded-xl text-sm border border-stone-700 transition-all cursor-pointer"
            >
              <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
              <span>ရွှေဝယ်ယူမည် (Buy)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('workshop')}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold rounded-xl text-sm border border-stone-700 transition-all cursor-pointer"
            >
              <Hammer className="w-4 h-4 text-amber-400" />
              <span>ပန်းထိမ်နှင့် ရွှေကျို</span>
            </button>

            {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
              <button
                type="button"
                onClick={onOpenQuickPriceModal}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold rounded-xl text-sm border border-stone-700 transition-all cursor-pointer"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>ရွှေဈေးပြင်</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TODAY'S GOLD PRICES BOARD */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-stone-900 text-base">ယနေ့ နေ့စဉ်ရွှေဈေး (Today's Gold Price)</h2>
              <p className="text-xs text-stone-500">၁ ကျပ်သား လျှင် ပေါက်ဈေး (Price per 1 Kyat-tha)</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Sort Toggle Button - Default Ascending (ငယ်စဉ် ကြီးလိုက်) */}
            <button
              type="button"
              onClick={() => setPriceSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold border border-amber-300 transition-colors cursor-pointer shadow-2xs"
              title="ရွှေဈေးနှုန်း ဖော်ပြမှု အစီအစဉ် ပြောင်းလဲရန်"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-amber-700" />
              <span>
                {priceSortOrder === 'asc' ? 'ငယ်စဉ် ကြီးလိုက် (အနည်းမှ အများ) ↑' : 'ကြီးစဉ် ငယ်လိုက် (အများမှ အနည်း) ↓'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gold-prices')}
              className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg border border-stone-200 transition-colors"
            >
              <span>ဈေးနှုန်းအားလုံးကြည့်မည်</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {sortedGoldPrices.map((gp, idx) => {
            const theme = getPurityTheme(gp?.purity || '16_PE', idx);
            return (
              <div
                key={gp?.id || idx}
                className={`${theme.cardBg} border ${theme.cardBorder} ${theme.cardHoverBorder} rounded-xl p-3.5 transition-all shadow-xs relative overflow-hidden group`}
              >
                {/* Top Accent Stripe */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accentBar}`} />

                <div className="flex items-center justify-between mb-1.5 pt-0.5">
                  <span className="font-extrabold text-stone-900 text-sm">{gp?.purityLabel || gp?.purity}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${theme.badge}`}>
                    {gp?.purity}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-stone-500 font-medium">ရောင်းဈေး:</span>
                    <span className={`text-sm sm:text-base font-extrabold ${theme.sellPriceText}`}>
                      {formatNumber(gp?.sellPrice)} <span className="text-[10px] font-normal text-stone-500">MMK</span>
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs text-stone-600 border-t border-stone-200/60 pt-1">
                    <span className="text-stone-500">ဝယ်ဈေး:</span>
                    <span className="font-semibold text-stone-800">
                      {formatNumber(gp?.buyPrice)} MMK
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CORE STATS GRID (Today's Sales, Purchases, Stock Value, Cash Flow, Customer Balance) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales - Emerald Green Theme */}
        <div className="bg-emerald-50/85 rounded-2xl p-5 shadow-xs hover:shadow-md border border-emerald-200/90 hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Today's Sales (ယနေ့ရောင်းရငွေ)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100/90 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shadow-2xs">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-950 tracking-tight">
              {formatMMK(todaySalesAmount)}
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-800/80 mt-2 pt-2 border-t border-emerald-200/60">
              <span>ဘောက်ချာ စုစုပေါင်း:</span>
              <span className="font-bold text-emerald-950">{todaySalesList.length} စောင်</span>
            </div>
          </div>
        </div>

        {/* Today's Purchases - Sky Blue Theme */}
        <div className="bg-sky-50/85 rounded-2xl p-5 shadow-xs hover:shadow-md border border-sky-200/90 hover:border-sky-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
              Today's Purchases (ယနေ့အဝယ်)
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-100/90 text-sky-700 border border-sky-200/70 flex items-center justify-center shadow-2xs">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-sky-950 tracking-tight">
              {formatMMK(todayPurchasesAmount)}
            </div>
            <div className="flex items-center justify-between text-xs text-sky-800/80 mt-2 pt-2 border-t border-sky-200/60">
              <span>ဝယ်ယူမှု အကြိမ်:</span>
              <span className="font-bold text-sky-950">{todayPurchasesList.length} ကြိမ်</span>
            </div>
          </div>
        </div>

        {/* Total Gold Stock Weight & Value - Golden Amber Theme */}
        <div className="bg-amber-50/90 rounded-2xl p-5 shadow-xs hover:shadow-md border border-amber-200/90 hover:border-amber-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Gold Stock (ရွှေလက်ကျန်)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100/90 text-amber-800 border border-amber-300/70 flex items-center justify-center shadow-2xs">
              <Gem className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-amber-950 tracking-tight">
              {formatWeightMm(totalStockWeight)}
            </div>
            <div className="flex items-center justify-between text-xs text-amber-900/80 mt-2 pt-2 border-t border-amber-200/60">
              <span>ခန့်မှန်းတန်ဖိုး:</span>
              <span className="font-bold text-amber-950">{formatMMK(estimatedStockValue)}</span>
            </div>
          </div>
        </div>

        {/* Outstanding Customer Balance - Rose / Red Theme */}
        <div className="bg-rose-50/85 rounded-2xl p-5 shadow-xs hover:shadow-md border border-rose-200/90 hover:border-rose-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Customer Credit (ကျန်ငွေ)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100/90 text-rose-700 border border-rose-200/70 flex items-center justify-center shadow-2xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-700 tracking-tight">
              {formatMMK(totalCustomerCredit)}
            </div>
            <div className="flex items-center justify-between text-xs text-rose-800/80 mt-2 pt-2 border-t border-rose-200/60">
              <span>အကြွေးကျန် ဖောက်သည်:</span>
              <span className="font-bold text-rose-950">
                {customers.filter((c) => c.outstandingBalance > 0).length} ဦး
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECONDARY SECTION: RECENT SALES & STOCK OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Sales Invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-stone-600" />
              <h3 className="font-bold text-stone-900 text-base">လတ်တလော အရောင်းပြေစာများ (Recent Sales)</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>POS ဖွင့်မည်</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto pb-1 custom-scrollbar-x rounded-xl border border-stone-200/90 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="bg-stone-900 text-stone-100 font-bold border-b border-stone-800 tracking-wide">
                <tr>
                  <th className="py-2.5 px-3 text-amber-300 font-bold">Invoice No</th>
                  <th className="py-2.5 px-3 font-bold">ဖောက်သည် (Customer)</th>
                  <th className="py-2.5 px-3 font-bold">ပစ္စည်း (Item)</th>
                  <th className="py-2.5 px-3 text-right font-bold">သင့်ငွေ (Amount)</th>
                  <th className="py-2.5 px-3 text-center font-bold">အခြေအနေ</th>
                  <th className="py-2.5 px-3 text-center font-bold">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/70 border-b border-stone-200">
                {sales.slice(0, 5).map((sale, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={sale.id}
                      className={`transition-colors ${
                        isEven
                          ? 'bg-white hover:bg-amber-50/70'
                          : 'bg-stone-100/80 hover:bg-amber-100/60'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-stone-900">
                        {sale.invoiceNo}
                        <div className="text-[10px] font-normal text-stone-400">{sale.date}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-stone-800">{sale.customerName}</div>
                        {sale.customerPhone && (
                          <div className="text-[11px] text-stone-400">{sale.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        <div className="truncate max-w-[150px]">
                          {sale.items[0]?.name || 'ရွှေထည်'}
                          {sale.items.length > 1 && ` +${sale.items.length - 1}`}
                        </div>
                        <div className="text-[11px] text-amber-900 font-medium">
                          {sale.items[0] && formatWeightMm(sale.items[0].actualWeight)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900">
                        {formatMMK(sale.grandTotal)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sale.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sale.status === 'Pending Balance'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {sale.status === 'Completed'
                            ? 'ရှင်းပြီး'
                            : sale.status === 'Pending Balance'
                            ? 'ကျန်ငွေရှိ'
                            : 'ပယ်ဖျက်'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectSaleForInvoice(sale)}
                            className="text-xs text-amber-800 hover:text-amber-950 font-bold hover:underline cursor-pointer"
                          >
                            ပြေစာကြည့်
                          </button>
                          {sale.balanceRemaining > 0 && (
                            <button
                              type="button"
                              onClick={() => setSettleSale(sale)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] shadow-xs cursor-pointer"
                              title="ကျန်ငွေရှင်းမည်"
                            >
                              ကျန်ငွေရှင်း
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Stock Snapshot & Alerts */}
        <div className="space-y-4">
          {/* Quick Stock Summary Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2 font-bold text-stone-900 text-sm">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>ပစ္စည်းအမျိုးအစားအလိုက် လက်ကျန်</span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <div className="flex items-center bg-stone-100 p-0.5 rounded-lg text-[11px] font-medium border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setStockViewMode('in_stock_only')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                      stockViewMode === 'in_stock_only'
                        ? 'bg-white text-stone-900 font-bold shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    title="လက်ကျန်ရှိသော အမျိုးအစားများသာ ကြည့်မည်"
                  >
                    လက်ကျန်ရှိ ({categoryStockBreakdown.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockViewMode('all')}
                    className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
                      stockViewMode === 'all'
                        ? 'bg-white text-stone-900 font-bold shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                    title="အမျိုးအစားအားလုံး ကြည့်မည်"
                  >
                    အားလုံး ({ALL_CATEGORIES.length})
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('inventory')}
                  className="text-xs text-amber-800 hover:underline font-bold cursor-pointer ml-1"
                >
                  Stock အားလုံး
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-stone-200/90 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-900 text-stone-100 font-bold border-b border-stone-800 tracking-wide">
                  <tr>
                    <th className="py-2.5 px-3 text-amber-300 font-bold">အမျိုးအစား (Category)</th>
                    <th className="py-2.5 px-3 text-right font-bold">လက်ကျန် (Stock)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/60">
                  {categoryStockBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-stone-500 font-medium">
                        ဆိုင်တွင်း လက်ကျန်ပစ္စည်း မရှိသေးပါ (No stock)
                      </td>
                    </tr>
                  ) : (
                    categoryStockBreakdown.map((item, idx) => {
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={item.cat}
                          className={`transition-colors ${
                            isEven
                              ? 'bg-white hover:bg-amber-50/70'
                              : 'bg-stone-100/80 hover:bg-amber-100/60'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-medium text-stone-800">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`inline-block font-bold px-2.5 py-0.5 rounded shadow-2xs border ${
                                item.count > 0
                                  ? 'text-stone-900 bg-white border-stone-300/80'
                                  : 'text-stone-400 bg-stone-50 border-stone-200'
                              }`}
                            >
                              {item.count} ထည်
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-stone-900 text-stone-100 font-bold border-t-2 border-stone-800 tracking-wide">
                  <tr>
                    <td className="py-2.5 px-3 text-amber-300 font-bold">
                      စုစုပေါင်း (Total)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-block font-extrabold text-amber-300 bg-stone-800 border border-stone-700 px-2.5 py-0.5 rounded shadow-2xs">
                        {inStockProducts.length} ထည်
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">ဆိုင်တွင်းစုစုပေါင်း:</span>
                <span className="font-extrabold text-amber-900">
                  {inStockProducts.length} ထည်
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">စုစုပေါင်း အလေးချိန်:</span>
                <span className="font-bold text-stone-800">
                  {formatWeightMm(totalStockWeight)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Payout Summary Today */}
          <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-sm border border-stone-800">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-400 mb-2">
              <span>Today's Cash Flow (ယနေ့ငွေစီးဆင်းမှု)</span>
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">ငွေဝင် (Cash In):</span>
                <span className="font-bold text-emerald-400">+{formatMMK(todayCashIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">ငွေထွက် (Cash Out):</span>
                <span className="font-bold text-rose-400">-{formatMMK(todayCashOut)}</span>
              </div>
              <div className="border-t border-stone-800 pt-2 flex justify-between text-sm font-bold">
                <span>အသားတင် လက်ကျန်ငွေ:</span>
                <span className={netCashToday >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {formatMMK(netCashToday)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {settleSale && (
        <DebtSettlementModal
          sale={settleSale}
          onClose={() => setSettleSale(null)}
        />
      )}
    </div>
  );
};
