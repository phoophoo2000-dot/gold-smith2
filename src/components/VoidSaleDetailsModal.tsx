import React from 'react';
import { Sale } from '../types/gold';
import { formatMMK, formatWeightMm } from '../services/calculationEngine';
import {
  AlertTriangle,
  ShieldCheck,
  User,
  X,
  Clock,
  FileText,
  RotateCcw,
  CheckCircle2,
  Receipt,
} from 'lucide-react';

interface VoidSaleDetailsModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const VoidSaleDetailsModal: React.FC<VoidSaleDetailsModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>ပယ်ဖျက်ထားသော ဘောက်ချာ အချက်အလက်</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                  VOIDED
                </span>
              </h3>
              <p className="text-xs text-stone-400 font-mono">Invoice: {sale.invoiceNo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Banner */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-rose-900">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>ဤအရောင်းဘောက်ချာကို ပယ်ဖျက်ပြီးပါပြီ</span>
              </span>
              <span className="font-mono text-rose-700">{sale.voidedAt || sale.date}</span>
            </div>
            <div className="text-rose-800 bg-white/70 p-2.5 rounded-lg border border-rose-200">
              <span className="font-semibold block text-[11px] text-stone-500 mb-0.5">
                ပယ်ဖျက်ရသည့် အကြောင်းရင်း (Reason):
              </span>
              <span className="font-medium text-xs text-stone-900">
                {sale.voidReason || 'စာရင်းမှားယွင်းရိုက်သွင်းမိခြင်း'}
              </span>
            </div>
          </div>

          {/* Audit: Staff & Manager info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-semibold">တောင်းဆိုသူ စာရေး (Staff):</span>
              </div>
              <div className="font-bold text-stone-900 text-xs pl-5">
                {sale.voidedBy || sale.cashierName || 'Staff (Phoo)'}
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
              <div className="flex items-center gap-1.5 text-xs text-amber-900 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                <span className="font-semibold">ခွင့်ပြုသူ မန်နေဂျာ (Manager):</span>
              </div>
              <div className="font-bold text-amber-950 text-xs pl-5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{sale.voidApprovedBy || 'Manager'}</span>
              </div>
            </div>
          </div>

          {/* Voucher Summary */}
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200 space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-stone-200">
              <div>
                <span className="text-stone-500 text-[11px]">ဝယ်ယူသူ:</span>
                <div className="font-bold text-stone-900">{sale.customerName || 'အထွေထွေ ဝယ်ယူသူ'}</div>
              </div>
              <div className="text-right">
                <span className="text-stone-500 text-[11px]">ပယ်ဖျက်သည့် ပမာဏ:</span>
                <div className="font-mono font-bold text-stone-900 text-sm text-rose-600">
                  {formatMMK(sale.grandTotal)}
                </div>
              </div>
            </div>

            <div>
              <span className="text-stone-600 text-[11px] font-semibold block mb-1">
                စတော့ခ်သို့ ပြန်သွင်းပြီး ပစ္စည်းများ ({sale.items.length} ထည်):
              </span>
              <div className="space-y-1 bg-white p-2 rounded-lg border border-stone-200">
                {sale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-stone-700">
                    <span className="truncate max-w-[240px]">
                      • {it.name} ({formatWeightMm(it.actualWeight)})
                    </span>
                    <span className="font-mono text-stone-900">{formatMMK(it.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status info */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              ဤဘောက်ချာမှ ရွှေထည်ပစ္စည်းများ အားလုံး စတော့ခ် (In Stock) သို့ အောင်မြင်စွာ ပြန်လည်ရောက်ရှိပြီး ဖြစ်ပါသည်။
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-5 py-3 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            ပိတ်မည်
          </button>
        </div>
      </div>
    </div>
  );
};
