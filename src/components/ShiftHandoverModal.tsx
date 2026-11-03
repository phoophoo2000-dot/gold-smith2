import React, { useState, useMemo } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { Sale, User } from '../types/gold';
import {
  formatMMK,
  formatWeightMm,
  weightToTotalYway,
  totalYwayToWeight,
} from '../services/calculationEngine';
import {
  DoorClosed,
  Printer,
  X,
  UserCheck,
  Receipt,
  Coins,
  CreditCard,
  Banknote,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Scale,
  Sparkles,
} from 'lucide-react';
import { printThermalTextSlip } from '../services/printService';

interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogout,
}) => {
  const { currentUser, sales, settings, language, currentCounter } = useGoldShop();
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a5'>('thermal');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentTimeStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Filter sales handled by this user today
  const shiftSales = useMemo(() => {
    return sales.filter((s) => {
      if (s.date !== todayStr) return false;
      // If cashierName matches or current user is Admin/Manager looking at full day
      if (currentUser?.role === 'Admin' || currentUser?.role === 'Manager') {
        return true; // Admin/Manager can view full day shift or their own
      }
      const uName = (currentUser?.name || '').toLowerCase();
      const cName = (s.cashierName || '').toLowerCase();
      return cName.includes(uName) || uName.includes(cName) || cName.includes('phoo');
    });
  }, [sales, todayStr, currentUser]);

  const activeSales = useMemo(() => shiftSales.filter((s) => s.status !== 'Void'), [shiftSales]);
  const voidSales = useMemo(() => shiftSales.filter((s) => s.status === 'Void'), [shiftSales]);

  // Financial aggregates
  const totalRevenue = useMemo(
    () => activeSales.reduce((sum, s) => sum + s.grandTotal, 0),
    [activeSales]
  );
  const totalPaid = useMemo(
    () => activeSales.reduce((sum, s) => sum + s.paidAmount, 0),
    [activeSales]
  );
  const totalCreditRemaining = useMemo(
    () => activeSales.reduce((sum, s) => sum + s.balanceRemaining, 0),
    [activeSales]
  );
  const totalVoidedAmount = useMemo(
    () => voidSales.reduce((sum, s) => sum + s.grandTotal, 0),
    [voidSales]
  );

  // Breakdown by payment methods
  const paymentBreakdown = useMemo(() => {
    const map: { [method: string]: number } = {
      Cash: 0,
      KBZPay: 0,
      WavePay: 0,
      'CB Pay': 0,
      'AYA Pay': 0,
      'Bank Transfer': 0,
    };

    activeSales.forEach((s) => {
      s.payments?.forEach((p) => {
        if (map[p.method] !== undefined) {
          map[p.method] += p.amount;
        } else {
          map[p.method] = (map[p.method] || 0) + p.amount;
        }
      });
    });

    return map;
  }, [activeSales]);

  // Total Gold weight sold in shift
  const totalGoldSoldWeight = useMemo(() => {
    const totalYway = activeSales.reduce((sum, s) => {
      return (
        sum +
        s.items.reduce((iSum, it) => iSum + weightToTotalYway(it.actualWeight), 0)
      );
    }, 0);
    return totalYwayToWeight(totalYway);
  }, [activeSales]);

  const totalItemsCount = useMemo(() => {
    return activeSales.reduce((sum, s) => sum + s.items.length, 0);
  }, [activeSales]);

  if (!isOpen) return null;

  const handlePrintSlip = () => {
    const shopTitle = settings?.shopName || 'ရွှေဆိုင် POS';
    const lines = [
      `================================`,
      `    ${shopTitle}`,
      `   အဆိုင်းသိမ်း စာရင်းချုပ် စလစ်`,
      `   (SHIFT HANDOVER SUMMARY)`,
      `================================`,
      `ရက်စွဲ (Date): ${todayStr}`,
      `အချိန် (Time): ${currentTimeStr}`,
      `ကောင်တာ (Counter): ${currentCounter?.name || 'ကောင်တာ (၁)'} (${currentCounter?.id || 'C1'})`,
      `စာရေး/ငွေကိုင် (Cashier): ${currentUser?.name || 'Staff'}`,
      `ရာထူး (Role): ${currentUser?.role || 'Staff'}`,
      `--------------------------------`,
      `ဘောက်ချာ စုစုပေါင်း: ${activeSales.length} စောင်`,
      `ရောင်းချခဲ့ရွှေထည်: ${totalItemsCount} ထည်`,
      `ရွှေချိန် စုစုပေါင်း: ${formatWeightMm(totalGoldSoldWeight)}`,
      `--------------------------------`,
      `စုစုပေါင်း အရောင်းငွေ: ${formatMMK(totalRevenue)}`,
      `ရှင်းပြီးငွေ စုစုပေါင်း: ${formatMMK(totalPaid)}`,
      `--------------------------------`,
      `ငွေပေးချေမှု ခွဲခြမ်းစိတ်ဖြာချက် (Payments):`,
      `• ငွေသား (Cash): ${formatMMK(paymentBreakdown['Cash'] || 0)}`,
      `• KBZPay: ${formatMMK(paymentBreakdown['KBZPay'] || 0)}`,
      `• WavePay: ${formatMMK(paymentBreakdown['WavePay'] || 0)}`,
      `• CB/AYA/Bank: ${formatMMK(
        (paymentBreakdown['CB Pay'] || 0) +
          (paymentBreakdown['AYA Pay'] || 0) +
          (paymentBreakdown['Bank Transfer'] || 0)
      )}`,
      `--------------------------------`,
      `ကျန်ငွေ/အကြွေး (Credit): ${formatMMK(totalCreditRemaining)}`,
      `ပယ်ဖျက်ဘောက်ချာ (Voided): ${voidSales.length} စောင် (${formatMMK(totalVoidedAmount)})`,
      `================================`,
      `\n\n`,
      `စာရင်းလွှဲသူ (Handed Over): _________________`,
      `\n`,
      `စာရင်းလက်ခံသူ (Received): _________________`,
      `\n`,
      `================================`,
    ];

    printThermalTextSlip(lines.join('\n'));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-xl w-full my-6 overflow-hidden">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <DoorClosed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>အဆိုင်းသိမ်း စာရင်းချုပ် / Logout</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  SHIFT HANDOVER
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                လက်ရှိ စာရေး/ငွေကိုင်၏ နေ့စဉ်အရောင်းနှင့် ငွေစာရင်းချုပ်ကို စစ်ဆေးအတည်ပြုပါ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div id="printable-shift-slip" className="printable-sheet p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Cashier Info Card */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-900">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-stone-900 text-sm block">
                  {currentUser?.name || 'Staff (အရောင်းစာရေး)'}
                </span>
                <span className="text-stone-500 text-[11px]">
                  တာဝန်: <strong className="text-stone-700">{currentUser?.role || 'Staff'}</strong> • ကောင်တာ:{' '}
                  <strong className="text-amber-800 font-bold">{currentCounter?.name || 'ကောင်တာ (၁)'} ({currentCounter?.id || 'C1'})</strong>
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-stone-500 text-[11px] flex items-center gap-1 justify-end">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>{currentTimeStr}</span>
              </div>
              <div className="font-mono text-stone-700 font-semibold">{todayStr}</div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[11px] text-amber-900 font-semibold block mb-0.5">
                စုစုပေါင်း အရောင်းရငွေ:
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-amber-950">
                {formatMMK(totalRevenue)}
              </div>
              <span className="text-[10px] text-amber-700 font-medium">
                {activeSales.length} ဘောက်ချာ ({totalItemsCount} ထည်)
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[11px] text-emerald-900 font-semibold block mb-0.5">
                လက်ခံရရှိငွေ (Total Paid):
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-emerald-900">
                {formatMMK(totalPaid)}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">
                ငွေသား + Digital Pay
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-rose-900 font-semibold block mb-0.5">
                ကျန်ငွေ / အကြွေး (Credit):
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-rose-700">
                {formatMMK(totalCreditRemaining)}
              </div>
              <span className="text-[10px] text-rose-600 font-medium">
                ဖောက်သည်ကျန်ငွေ စာရင်း
              </span>
            </div>
          </div>

          {/* Payment Methods Cash Drawer Breakdown */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
            <div className="font-bold text-stone-800 text-xs flex items-center justify-between pb-1.5 border-b border-stone-200">
              <span className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>ငွေပေးချေမှုပုံစံအလိုက် ခွဲခြမ်းစိတ်ဖြာချက် (Payment Methods):</span>
              </span>
              <span className="text-[11px] text-stone-500 font-normal">ကောင်တာ ငွေစာရင်းစစ်</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  <span>ငွေသား (Cash In Hand):</span>
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatMMK(paymentBreakdown['Cash'] || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span>KBZPay:</span>
                </span>
                <span className="font-mono font-bold text-blue-800">
                  {formatMMK(paymentBreakdown['KBZPay'] || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-yellow-600" />
                  <span>WavePay:</span>
                </span>
                <span className="font-mono font-bold text-stone-900">
                  {formatMMK(paymentBreakdown['WavePay'] || 0)}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>CB / AYA / Bank Transfer:</span>
                </span>
                <span className="font-mono font-bold text-stone-900">
                  {formatMMK(
                    (paymentBreakdown['CB Pay'] || 0) +
                      (paymentBreakdown['AYA Pay'] || 0) +
                      (paymentBreakdown['Bank Transfer'] || 0)
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Gold weight summary & voided summary */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-amber-700 shrink-0" />
              <div>
                <span className="text-[10.5px] text-stone-500 block font-semibold">
                  ရောင်းချခဲ့သော ရွှေချိန် စုစုပေါင်း:
                </span>
                <span className="font-mono font-bold text-stone-900">
                  {formatWeightMm(totalGoldSoldWeight)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="text-[10.5px] text-stone-500 block font-semibold">
                  ပယ်ဖျက်ဘောက်ချာ (Voided):
                </span>
                <span className="font-mono font-bold text-rose-700">
                  {voidSales.length} စောင် ({formatMMK(totalVoidedAmount)})
                </span>
              </div>
            </div>
          </div>

          {/* Handover Notice */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>အဆိုင်းသိမ်းလွှဲပြောင်းရန် အဆင်သင့်ဖြစ်ပါပြီ</strong>: စာရင်းစလစ် ထုတ်ယူလိုပါက{' '}
              <strong>"စလစ်ထုတ်မည်"</strong> ကို နှိပ်ပါ။ ဆိုင်းသိမ်းပြီးပါက စနစ်သည် PIN Lock Screen သို့
              ပြန်လည်ရောက်ရှိသွားပါမည်။
            </span>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="bg-stone-50 px-5 py-3.5 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-white hover:bg-stone-100 text-stone-700 font-semibold rounded-xl text-xs border border-stone-300 transition-colors cursor-pointer"
          >
            မထွက်သေးပါ (Cancel)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSlip}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>စလစ်ထုတ်မည် (Print Slip)</span>
            </button>

            <button
              type="button"
              onClick={onConfirmLogout}
              className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <DoorClosed className="w-4 h-4" />
              <span>အဆိုင်းသိမ်းပြီး Logout မည်</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
