import React, { useState } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { Sale } from '../types/gold';
import {
  formatMMK,
  formatNumber,
  formatWeightMm,
  weightToTotalYway,
  totalYwayToWeight,
  weightToKyatDecimal,
} from '../services/calculationEngine';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Scale,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  AlertTriangle,
  ShieldCheck,
  User,
  Info,
} from 'lucide-react';
import { VoidSaleDetailsModal } from './VoidSaleDetailsModal';

export const Reports: React.FC = () => {
  const { sales, purchases, expenses, products, goldPrices } = useGoldShop();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('month');
  const [selectedVoidSale, setSelectedVoidSale] = useState<Sale | null>(null);

  // Filter dates
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const filteredSales = sales.filter((s) => {
    if (s.status === 'Void') return false;
    if (dateFilter === 'today') return s.date === todayStr;
    if (dateFilter === '7days') {
      const diffDays = (now.getTime() - new Date(s.date).getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (dateFilter === 'month') {
      const sMonth = s.date.slice(0, 7);
      const curMonth = todayStr.slice(0, 7);
      return sMonth === curMonth;
    }
    return true;
  });

  const voidedSales = sales.filter((s) => {
    if (s.status !== 'Void') return false;
    if (dateFilter === 'today') return s.date === todayStr;
    if (dateFilter === '7days') {
      const diffDays = (now.getTime() - new Date(s.date).getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (dateFilter === 'month') {
      return s.date.slice(0, 7) === todayStr.slice(0, 7);
    }
    return true;
  });

  const totalVoidedAmount = voidedSales.reduce((sum, s) => sum + s.grandTotal, 0);

  const filteredPurchases = purchases.filter((p) => {
    if (dateFilter === 'today') return p.date === todayStr;
    if (dateFilter === '7days') {
      const diffDays = (now.getTime() - new Date(p.date).getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (dateFilter === 'month') {
      return p.date.slice(0, 7) === todayStr.slice(0, 7);
    }
    return true;
  });

  const filteredExpenses = expenses.filter((e) => {
    if (dateFilter === 'today') return e.date === todayStr;
    if (dateFilter === '7days') {
      const diffDays = (now.getTime() - new Date(e.date).getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (dateFilter === 'month') {
      return e.date.slice(0, 7) === todayStr.slice(0, 7);
    }
    return true;
  });

  // Financial calculations
  const totalSalesRevenue = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalPurchaseCost = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalExpenseCost = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Approximate gross profit: Total Sales - Estimated Material Cost of goods sold - Expenses
  const estimatedProfit = Math.round(
    totalSalesRevenue * 0.08 +
      filteredSales.reduce((sum, s) => sum + s.totalMakingCharge + s.totalStoneCharge, 0) -
      totalExpenseCost
  );

  // Gold Weight In / Out (ရွှေချိန် ဝင် / ထွက်)
  // Gold Out = Actual weight of all items sold
  const goldOutYway = filteredSales.reduce((sum, s) => {
    return (
      sum +
      s.items.reduce((iSum, item) => iSum + weightToTotalYway(item.actualWeight), 0)
    );
  }, 0);
  const goldOutWeight = totalYwayToWeight(goldOutYway);

  // Gold In = Net weight of all gold purchased from customer/suppliers
  const goldInYway = filteredPurchases.reduce((sum, p) => {
    return sum + weightToTotalYway(p.netWeight);
  }, 0);
  const goldInWeight = totalYwayToWeight(goldInYway);

  // Category breakdown
  const categorySalesMap: { [cat: string]: { count: number; total: number } } = {};
  filteredSales.forEach((s) => {
    s.items.forEach((it) => {
      const cat = it.category || 'Other';
      if (!categorySalesMap[cat]) {
        categorySalesMap[cat] = { count: 0, total: 0 };
      }
      categorySalesMap[cat].count += 1;
      categorySalesMap[cat].total += it.total;
    });
  });

  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Invoice No', 'Customer', 'Items Count', 'Grand Total (MMK)', 'Status'],
      ...filteredSales.map((s) => [
        s.date,
        s.invoiceNo,
        `"${s.customerName}"`,
        s.items.length.toString(),
        s.grandTotal.toString(),
        s.status,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gold_shop_sales_report_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
              အရောင်းနှင့် အလေးချိန် အစီရင်ခံစာများ (Reports)
            </h2>
            <p className="text-xs text-stone-500">
              နေ့စဉ်/လစဉ် အရောင်း၊ ရွှေချိန် အဝင်/အထွက် နှင့် အမြတ်အစွန်း ခွဲခြမ်းစိတ်ဖြာမှု
            </p>
          </div>
        </div>

        {/* Date filter toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
            {(
              [
                { id: 'today', label: 'ယနေ့ (Today)' },
                { id: '7days', label: '၇ ရက်အတွင်း' },
                { id: 'month', label: 'ယခုလ (Month)' },
                { id: 'all', label: 'အားလုံး' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDateFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  dateFilter === t.id
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>CSV Export</span>
          </button>
        </div>
      </div>

      {/* CORE FINANCIAL OVERVIEW with Dark Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>ဘဏ္ဍာရေးနှင့် ဝင်ငွေ/ထွက်ငွေ အကျဉ်းချုပ် (Financial & Revenue Overview)</span>
          </span>
          <span className="text-xs text-stone-300">
            ကာလ: <span className="font-bold text-amber-300 uppercase">{dateFilter}</span>
          </span>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-stone-50/30">
          {/* Sales Revenue */}
          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              စုစုပေါင်း အရောင်းရငွေ (Sales Revenue)
            </span>
            <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono">{formatMMK(totalSalesRevenue)}</div>
            <div className="text-xs text-emerald-700 mt-2 flex items-center gap-1 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>ဘောက်ချာ: {filteredSales.length} စောင်</span>
            </div>
          </div>

          {/* Gold Purchases */}
          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              ရွှေအဝယ် အသုံးစရိတ် (Purchases Outflow)
            </span>
            <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono">{formatMMK(totalPurchaseCost)}</div>
            <div className="text-xs text-blue-700 mt-2 flex items-center gap-1 font-semibold">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>ဝယ်ယူမှု: {filteredPurchases.length} ကြိမ်</span>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              ဆိုင်တွင်း အသုံးစရိတ် (Shop Expenses)
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono">-{formatMMK(totalExpenseCost)}</div>
            <div className="text-xs text-stone-500 mt-2">
              <span>မီးခ၊ လခ၊ အထွေထွေ</span>
            </div>
          </div>

          {/* Gross Profit */}
          <div className="bg-amber-50 border border-amber-300/80 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider block mb-1">
              ခန့်မှန်း အသားတင်အမြတ် (Est. Net Profit)
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono">{formatMMK(estimatedProfit)}</div>
            <div className="text-xs text-amber-800 mt-2">
              <span>လက်ခ + ကုန်အမြတ် အနုတ် စရိတ်</span>
            </div>
          </div>
        </div>
      </div>

      {/* GOLD WEIGHT FLOW (ရွှေချိန် အဝင်/အထွက် စာရင်း) */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">
              ရွှေအလေးချိန် ဝင်/ထွက် စာရင်း (Gold Weight In & Out Audit)
            </h3>
          </div>
          <span className="text-xs text-stone-300">
            ကာလ: <span className="font-bold text-amber-300 uppercase">{dateFilter}</span>
          </span>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-900 text-white">
          <div className="bg-stone-800/90 rounded-xl p-4 border border-stone-700">
            <span className="text-xs text-stone-400 block mb-1 font-semibold">ရွှေရောင်းထွက်မှု (Gold Sold Out):</span>
            <div className="text-xl font-black text-amber-400 font-mono">{formatWeightMm(goldOutWeight)}</div>
            <div className="text-xs text-stone-400 mt-1">
              = {weightToKyatDecimal(goldOutWeight).toFixed(4)} ကျပ်သား
            </div>
          </div>

          <div className="bg-stone-800/90 rounded-xl p-4 border border-stone-700">
            <span className="text-xs text-stone-400 block mb-1 font-semibold">ရွှေပြန်ဝယ်ဝင်မှု (Gold Bought In):</span>
            <div className="text-xl font-black text-blue-400 font-mono">{formatWeightMm(goldInWeight)}</div>
            <div className="text-xs text-stone-400 mt-1">
              = {weightToKyatDecimal(goldInWeight).toFixed(4)} ကျပ်သား
            </div>
          </div>

          <div className="bg-stone-800/90 rounded-xl p-4 border border-stone-700">
            <span className="text-xs text-stone-400 block mb-1 font-semibold">အသားတင် ရွှေအလေးချိန် ကွာခြားချက်:</span>
            <div className="text-xl font-black text-white font-mono">
              {goldInYway >= goldOutYway
                ? `+${formatWeightMm(totalYwayToWeight(goldInYway - goldOutYway))}`
                : `-${formatWeightMm(totalYwayToWeight(goldOutYway - goldInYway))}`}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              {goldInYway >= goldOutYway ? 'ဆိုင်တွင်း ရွှေချိန် တိုးလာသည်' : 'ဆိုင်တွင်း ရွှေချိန် လျော့သွားသည်'}
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY SALES BREAKDOWN */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>အမျိုးအစားအလိုက် အရောင်းစာရင်း (Sales by Category Breakdown)</span>
          </span>
          <span className="text-xs text-stone-300">
            စုစုပေါင်း: {Object.keys(categorySalesMap).length} မျိုး
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5">
          {Object.entries(categorySalesMap).length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400">
              ရွေးချယ်ထားသော ကာလတွင် အရောင်းမှတ်တမ်း မရှိသေးပါ
            </div>
          ) : (
            Object.entries(categorySalesMap).map(([cat, val]) => {
              const percentage =
                totalSalesRevenue > 0 ? Math.round((val.total / totalSalesRevenue) * 100) : 0;

              return (
                <div key={cat} className="space-y-1.5 bg-stone-50/70 p-3 rounded-xl border border-stone-200/70">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-stone-900">
                      {cat} <span className="text-stone-500 font-normal">({val.count} ထည်)</span>
                    </span>
                    <span className="text-amber-900 font-mono">
                      {formatMMK(val.total)} <span className="text-amber-600 font-semibold">({percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* VOIDED SALES AUDIT TRAIL (ပယ်ဖျက်ထားသော ဘောက်ချာများ စာရင်းစစ်) */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>ပယ်ဖျက်ထားသော အရောင်းဘောက်ချာများ စာရင်းစစ် (Voided Sales Audit Trail)</span>
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
              {voidedSales.length} စောင်
            </span>
            <span className="text-stone-300 font-mono font-bold">
              စုစုပေါင်း: {formatMMK(totalVoidedAmount)}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {voidedSales.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400">
              ရွေးချယ်ထားသော ကာလတွင် ပယ်ဖျက်ထားသော ဘောက်ချာ မရှိပါ (No Voided Sales)
            </div>
          ) : (
            <div className="overflow-x-auto pb-1 custom-scrollbar-x">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                  <tr>
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">ရက်စွဲ/အချိန်</th>
                    <th className="py-2.5 px-3">ဝယ်ယူသူ</th>
                    <th className="py-2.5 px-3 text-right">ပယ်ဖျက်ငွေ</th>
                    <th className="py-2.5 px-3">တောင်းဆိုသူ Staff</th>
                    <th className="py-2.5 px-3">ခွင့်ပြုသူ Manager</th>
                    <th className="py-2.5 px-3">အကြောင်းရင်း</th>
                    <th className="py-2.5 px-3 text-center">လုပ်ဆောင်ချက်</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {voidedSales.map((s, idx) => (
                    <tr key={s.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-rose-50/60' : 'bg-stone-100/85 hover:bg-rose-100/60'}`}>
                      <td className="py-3 px-3 font-mono font-bold text-stone-800 line-through">
                        {s.invoiceNo}
                      </td>
                      <td className="py-3 px-3 text-stone-500 text-[11px] whitespace-nowrap">
                        {s.voidedAt || s.date}
                      </td>
                      <td className="py-3 px-3 font-medium text-stone-800">
                        {s.customerName || 'အထွေထွေ ဝယ်ယူသူ'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                        {formatMMK(s.grandTotal)}
                      </td>
                      <td className="py-3 px-3 text-stone-700 font-medium">
                        {s.voidedBy || s.cashierName || 'Staff'}
                      </td>
                      <td className="py-3 px-3 text-amber-950 font-semibold flex items-center gap-1 mt-1 sm:mt-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{s.voidApprovedBy || 'Manager'}</span>
                      </td>
                      <td className="py-3 px-3 text-stone-600 text-[11px] max-w-[200px] truncate">
                        {s.voidReason || 'စာရင်းမှားယွင်းရိုက်သွင်းမိခြင်း'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedVoidSale(s)}
                          className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold rounded-lg text-[11px] border border-rose-300 transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <Info className="w-3 h-3 text-rose-600" />
                          <span>အသေးစိတ်</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Void Details Modal */}
      {selectedVoidSale && (
        <VoidSaleDetailsModal
          sale={selectedVoidSale}
          onClose={() => setSelectedVoidSale(null)}
        />
      )}
    </div>
  );
};
