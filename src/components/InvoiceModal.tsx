import React, { useState, useEffect } from 'react';
import { Sale } from '../types/gold';
import { useGoldShop } from '../context/GoldShopContext';
import {
  formatMMK,
  formatWeightMm,
  formatWeightEn,
  getPurityLabel,
} from '../services/calculationEngine';
import {
  Printer,
  X,
  Receipt,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Coins,
  Trash2,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import {
  printSaleInvoice,
  formatSaleToText,
  isRunningInIframe,
} from '../services/printService';
import { DebtSettlementModal } from './DebtSettlementModal';
import { PaidStamp } from './PaidStamp';
import { VoidSaleModal } from './VoidSaleModal';

interface InvoiceModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale: initialSale, onClose }) => {
  const { settings, language } = useGoldShop();
  const [currentSale, setCurrentSale] = useState<Sale | null>(initialSale);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a5'>('thermal');
  const [copied, setCopied] = useState(false);
  const [inIframe] = useState(() => isRunningInIframe());

  useEffect(() => {
    setCurrentSale(initialSale);
  }, [initialSale]);

  if (!currentSale) return null;
  const sale = currentSale;
  const isPaid = sale.status === 'Completed' || (sale.balanceRemaining ?? 0) <= 0;

  const handlePrint = (formatOverride?: 'thermal' | 'a5') => {
    // Print using top-level window to bypass iframe restrictions
    const fmt = formatOverride || printFormat;
    printSaleInvoice(sale, settings, language, fmt);
  };

  const handleCopyText = async () => {
    try {
      const text = formatSaleToText(sale, settings, language);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy voucher text:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200 transition-all duration-200 ${
          printFormat === 'a5' ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        {/* Header / Controls (hidden when printing) */}
        <div className="shrink-0 no-print bg-stone-900 text-white px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">ဘောက်ချာ / ပြေစာ (Invoice)</h3>
              <p className="text-xs text-stone-400">Invoice No: {sale.invoiceNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Format toggle: Thermal vs A5 */}
            <div className="flex items-center bg-stone-800 p-0.5 rounded-lg border border-stone-700 text-xs">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  printFormat === 'thermal'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>စလစ်ပြေစာ (Slip)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a5')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  printFormat === 'a5'
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A5 စာရွက်</span>
              </button>
            </div>

            {/* Print button */}
            <button
              type="button"
              onClick={() => handlePrint()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs sm:text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print ({printFormat === 'a5' ? 'A5' : 'စလစ်'})</span>
            </button>

            {/* Settle Balance Button if outstanding credit exists */}
            {sale.balanceRemaining > 0 && (
              <button
                type="button"
                onClick={() => setShowSettleModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
                title="ကျန်ငွေရှင်းလွှာ ဖွင့်မည်"
              >
                <Coins className="w-4 h-4" />
                <span>ကျန်ငွေရှင်းမည်</span>
              </button>
            )}

            {/* Void Sale button if active */}
            {sale.status !== 'Void' && (
              <button
                type="button"
                onClick={() => setShowVoidModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-200 hover:text-white rounded-lg text-xs sm:text-sm font-semibold border border-rose-800 transition-colors cursor-pointer"
                title="ဘောက်ချာ ပယ်ဖျက်မည် (Void Sale) - Manager PIN လိုအပ်ပါသည်"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">ပယ်ဖျက်မည် (Void)</span>
                <span className="sm:hidden">Void</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              title="ပိတ်မည်"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Void Sale Notice Banner */}
        {sale.status === 'Void' && (
          <div className="shrink-0 no-print bg-rose-600 text-white px-5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
              <span>
                <strong>ဤအရောင်းဘောက်ချာကို ပယ်ဖျက်ထားပါသည် (VOID SALE)</strong> — တောင်းဆိုသူ: <span className="font-semibold underline">{sale.voidedBy || 'Staff'}</span> | ခွင့်ပြုသူ: <span className="font-semibold underline">{sale.voidApprovedBy || 'Manager'}</span> | ရက်စွဲ: <span className="font-mono">{sale.voidedAt || sale.date}</span>
              </span>
            </div>
            <div className="bg-rose-800 px-2.5 py-1 rounded text-[11px] font-medium">
              အကြောင်းရင်း: {sale.voidReason || 'စာရင်းမှားယွင်းရိုက်သွင်းမိခြင်း'}
            </div>
          </div>
        )}

        {/* Iframe Notice Banner */}
        {inIframe && (
          <div className="shrink-0 no-print bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-900 flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <span>💡</span>
              <span>
                <strong>Print အဆင်ပြေစေရန်</strong>: Print ခလုတ်နှိပ်ပါက စာရွက်သန့်သန့်ဖြင့် Print window သီးသန့် ပွင့်လာပါမည်။
              </span>
            </span>
            <button
              type="button"
              onClick={() => handlePrint()}
              className="inline-flex items-center gap-1 font-bold text-amber-950 hover:underline cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Tab အသစ်တွင် ဖွင့်မည်</span>
            </button>
          </div>
        )}

        {/* PRINTABLE AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100/60 flex justify-center">
          {printFormat === 'thermal' ? (
            /* THERMAL SLIP VIEW */
            <div
              id="printable-invoice"
              className="bg-white shadow-sm border border-stone-200 text-stone-900 transition-all w-full max-w-[380px] p-5 font-mono text-xs rounded-lg self-start"
            >
              {/* Shop Header */}
              <div className="text-center border-b border-dashed border-stone-300 pb-3 mb-3 relative">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-amber-900 mb-0.5">
                  {settings.shopName}
                </h1>
                <p className="text-[11px] text-stone-800 font-medium mb-0.5">{settings.tagline}</p>
                <p className="text-[10.5px] text-stone-700">{settings.address}</p>
                <p className="text-[10.5px] text-stone-700 font-semibold">ဖုန်း - {settings.phone}</p>
                {isPaid && (
                  <div className="flex justify-center mt-2.5">
                    <PaidStamp date={sale.date} size="sm" />
                  </div>
                )}
              </div>

              {/* Invoice Info Bar */}
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 border-b border-stone-400 pb-3">
                <div>
                  <p>
                    <span className="text-stone-700 font-semibold">Invoice:</span>{' '}
                    <strong className="text-stone-950 font-bold">{sale.invoiceNo}</strong>
                  </p>
                  <p>
                    <span className="text-stone-700 font-semibold">Date:</span> <span className="text-stone-900">{sale.date}</span>
                  </p>
                  <p>
                    <span className="text-stone-700 font-semibold">Cashier:</span> <span className="text-stone-900">{sale.cashierName}</span>
                  </p>
                  {sale.counterName && (
                    <p>
                      <span className="text-stone-700 font-semibold">Counter:</span>{' '}
                      <span className="text-stone-900 font-bold">{sale.counterName} ({sale.counterId || 'C1'})</span>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p>
                    <span className="text-stone-700 font-semibold">Customer:</span>{' '}
                    <strong className="text-stone-950 font-bold">{sale.customerName || 'အထွေထွေ ဝယ်ယူသူ'}</strong>
                  </p>
                  {sale.customerPhone && (
                    <p>
                      <span className="text-stone-700 font-semibold">Phone:</span> <span className="text-stone-900">{sale.customerPhone}</span>
                    </p>
                  )}
                  <p className="mt-1">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        sale.status === 'Void'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : sale.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {sale.status === 'Void'
                        ? 'ပယ်ဖျက်ပြီး (VOID)'
                        : sale.status === 'Completed'
                        ? 'ငွေချေပြီး'
                        : 'ကျန်ငွေရှိ'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items Table / List */}
              <div className="space-y-2.5 mb-3">
                <div className="border-b-2 border-stone-800 pb-1 text-[11px] font-bold text-stone-900 flex justify-between">
                  <span>ပစ္စည်းအမည် (Item)</span>
                  <span>သင့်ငွေ (Amount)</span>
                </div>

                {sale.items.map((item, idx) => (
                  <div key={item.id || idx} className="border-b border-stone-300 pb-2">
                    <div className="flex justify-between font-bold text-stone-950 text-xs">
                      <span>
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-extrabold">{formatMMK(item.total)}</span>
                    </div>

                    {/* Item Detailed breakdown */}
                    <div className="mt-1 pl-2 text-[11px] text-stone-800 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="font-medium text-stone-700">ပဲရည် (Purity):</span>
                        <span className="font-bold text-amber-950">
                          {getPurityLabel(item.purity, language)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="font-medium text-stone-700">အမှန်အလေးချိန် (Weight):</span>
                        <span className="font-semibold text-stone-900">
                          {formatWeightMm(item.actualWeight)} ({formatWeightEn(item.actualWeight)})
                        </span>
                      </div>

                      {item.wastage && (item.wastage.kyat > 0 || item.wastage.pe > 0 || item.wastage.yway > 0) && (
                        <div className="flex justify-between text-stone-700">
                          <span>အလျော့တွက် (Wastage):</span>
                          <span className="font-medium">{formatWeightMm(item.wastage)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-semibold text-stone-950">
                        <span>တွက်ချက်အလေးချိန် (Billable):</span>
                        <span>{formatWeightMm(item.billableWeight)}</span>
                      </div>

                      <div className="flex justify-between text-stone-700">
                        <span>ရွှေဈေး (Rate/Kyat):</span>
                        <span className="font-medium">{formatMMK(item.goldPricePerKyat)}</span>
                      </div>

                      <div className="flex justify-between text-stone-700">
                        <span>ရွှေတန်ဖိုး (Gold Value):</span>
                        <span className="font-medium text-stone-900">{formatMMK(item.goldAmount)}</span>
                      </div>

                      {item.makingCharge > 0 && (
                        <div className="flex justify-between text-stone-700">
                          <span>လက်ခ (Making Charge):</span>
                          <span className="font-medium">{formatMMK(item.makingCharge)}</span>
                        </div>
                      )}

                      {item.stoneCharge > 0 && (
                        <div className="flex justify-between text-stone-700">
                          <span>ကျောက်ဖိုး (Stone Charge):</span>
                          <span className="font-medium">{formatMMK(item.stoneCharge)}</span>
                        </div>
                      )}

                      {item.discount > 0 && (
                        <div className="flex justify-between text-rose-700 font-bold">
                          <span>လျှော့ငွေ (Discount):</span>
                          <span>-{formatMMK(item.discount)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="border-t border-stone-400 pt-2 space-y-1 text-xs mb-3">
                <div className="flex justify-between text-stone-800 font-medium">
                  <span>ရွှေတန်ဖိုးစုစုပေါင်း:</span>
                  <span>{formatMMK(sale.subtotalGold)}</span>
                </div>
                {sale.totalMakingCharge > 0 && (
                  <div className="flex justify-between text-stone-800 font-medium">
                    <span>လက်ခစုစုပေါင်း:</span>
                    <span>{formatMMK(sale.totalMakingCharge)}</span>
                  </div>
                )}
                {sale.totalStoneCharge > 0 && (
                  <div className="flex justify-between text-stone-800 font-medium">
                    <span>ကျောက်ဖိုးစုစုပေါင်း:</span>
                    <span>{formatMMK(sale.totalStoneCharge)}</span>
                  </div>
                )}
                {sale.totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>လျှော့ဈေး (Discount):</span>
                    <span>-{formatMMK(sale.totalDiscount)}</span>
                  </div>
                )}

                {/* Grand Total with clean top and bottom border */}
                <div className="flex justify-between text-sm font-extrabold text-stone-950 py-1.5 my-1 border-y-2 border-stone-950">
                  <span>ကျသင့်ငွေ စုစုပေါင်း:</span>
                  <span className="text-amber-950">{formatMMK(sale.grandTotal)}</span>
                </div>
              </div>

              {/* Payments Summary Card */}
              <div className="bg-stone-50 rounded-lg border border-stone-200 overflow-hidden text-xs mb-3">
                <div className="bg-stone-100/80 px-3 py-1.5 font-bold text-stone-700 border-b border-stone-200 flex justify-between items-center">
                  <span>ပေးချေမှုမှတ်တမ်း (Payment):</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {sale.status === 'Completed' ? '✓ ငွေရှင်းပြီး' : 'ကျန်ငွေရှိ'}
                  </span>
                </div>
                <div className="p-2.5 space-y-1">
                  {sale.payments.map((p, pIdx) => (
                    <div key={pIdx} className="flex justify-between text-stone-600">
                      <span>
                        • {p.method} {p.reference ? `(${p.reference})` : ''}:
                      </span>
                      <span className="font-medium text-stone-900">{formatMMK(p.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-stone-200 pt-1.5 flex justify-between font-bold">
                    <span>ရှင်းပြီးငွေ (Paid):</span>
                    <span className="text-emerald-700">{formatMMK(sale.paidAmount)}</span>
                  </div>
                  {sale.balanceRemaining > 0 && (
                    <>
                      <div className="flex justify-between font-bold text-rose-600">
                        <span>ကျန်ငွေ (Credit Balance):</span>
                        <span>{formatMMK(sale.balanceRemaining)}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-rose-200 bg-rose-50/90 -mx-2.5 -mb-2.5 p-2.5 rounded-b-lg flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-rose-700 block font-semibold">ကျန်ငွေ ပေးဆောင်ရန်ရှိ:</span>
                          <span className="text-xs font-black text-rose-800">{formatMMK(sale.balanceRemaining)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSettleModal(true)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-md text-[11px] flex items-center gap-1 shadow cursor-pointer transition-colors"
                        >
                          <Coins className="w-3 h-3" />
                          <span>ကျန်ငွေရှင်းမည်</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Policy & QR / Barcode aesthetic footer */}
              <div className="text-center text-[10px] text-stone-500 border-t border-dashed border-stone-300 pt-2.5 space-y-1">
                <p className="font-medium">ဝယ်ယူအားပေးမှုကို အထူးပင်ကျေးဇူးတင်ရှိပါသည်။</p>
                <p className="text-[9px]">
                  * ဤပြေစာပါရှိမှသာ ရွှေထည် ပြန်လည်ရောင်းချခြင်း၊ လဲလှယ်ခြင်း ဆောင်ရွက်ပေးပါမည်။
                </p>
                <p className="text-[9px] font-mono text-stone-400">
                  {sale.invoiceNo} • {sale.createdAt}
                </p>
                <div className="pt-1 flex items-center justify-center gap-1 text-emerald-700 font-semibold text-[10px]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ရွှေရတနာ စံချိန်စံညွှန်း အာမခံသည်</span>
                </div>
              </div>
            </div>
          ) : (
            /* FORMAL A5 PAPER VIEW */
            <div
              id="printable-invoice"
              className="bg-white shadow-md border border-stone-300 text-stone-900 transition-all w-full max-w-[620px] p-5 sm:p-6 font-sans text-xs rounded-xl self-start"
            >
              {/* Header */}
              <div className="border-b-2 border-stone-800 pb-3 mb-3 flex items-center justify-between gap-3 relative">
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-amber-950 tracking-tight">
                    {settings.shopName}
                  </h1>
                  <p className="text-[11px] text-stone-900 font-bold">{settings.tagline}</p>
                  <p className="text-[11px] text-stone-800 font-medium mt-0.5">{settings.address}</p>
                  <p className="text-[11px] text-stone-800 font-semibold">ဖုန်း - {settings.phone}</p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  {isPaid && (
                    <div className="shrink-0">
                      <PaidStamp date={sale.date} size="md" />
                    </div>
                  )}
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-0.5 bg-stone-100 text-stone-950 text-[11px] font-extrabold rounded-md border border-stone-800 mb-1">
                      ရွှေအရောင်းပြေစာ (A5)
                    </span>
                    <p className="text-xs font-mono font-black text-stone-950">
                      No: {sale.invoiceNo}
                    </p>
                    <p className="text-[11px] font-semibold text-stone-800">Date: {sale.date}</p>
                  </div>
                </div>
              </div>

              {/* Customer & Info Grid */}
              <div className="grid grid-cols-2 gap-3 p-2.5 bg-stone-50 rounded-lg border border-stone-300 mb-3 text-xs">
                <div>
                  <p className="text-stone-700 font-semibold text-[11px]">ဝယ်ယူသူအမည် (Customer):</p>
                  <p className="font-extrabold text-stone-950">{sale.customerName || 'အထွေထွေ ဝယ်ယူသူ'}</p>
                  {sale.customerPhone && (
                    <p className="text-stone-800 font-medium text-[11px] mt-0.5">ဖုန်း: {sale.customerPhone}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-stone-700 font-semibold text-[11px]">အရောင်းဝန်ထမ်း / ငွေကိုင်:</p>
                  <p className="font-extrabold text-stone-950">
                    {sale.cashierName} {sale.counterName ? `• ${sale.counterName} (${sale.counterId || 'C1'})` : ''}
                  </p>
                  <p className="mt-0.5">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        sale.status === 'Void'
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : sale.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {sale.status === 'Void'
                        ? 'ပယ်ဖျက်ပြီး (VOID SALE)'
                        : sale.status === 'Completed'
                        ? 'ငွေရှင်းပြီး (Paid)'
                        : 'ကျန်ငွေရှိ (Credit)'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Formal A5 Items Table */}
              <div className="overflow-x-auto pb-1 custom-scrollbar-x mb-3 border border-stone-400 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px] min-w-[620px]">
                  <thead>
                    <tr className="bg-stone-100 border-b-2 border-stone-800 text-stone-950 font-bold">
                      <th className="p-1.5 border-r border-stone-300 w-7 text-center">စဉ်</th>
                      <th className="p-1.5 border-r border-stone-300">ပစ္စည်းအမည်</th>
                      <th className="p-1.5 border-r border-stone-300 text-center">ပဲရည်</th>
                      <th className="p-1.5 border-r border-stone-300 text-right">အလေးချိန်</th>
                      <th className="p-1.5 border-r border-stone-300 text-right">အလျော့တွက်</th>
                      <th className="p-1.5 border-r border-stone-300 text-right">တွက်ချက်ချိန်</th>
                      <th className="p-1.5 border-r border-stone-300 text-right">ရွှေဈေး</th>
                      <th className="p-1.5 border-r border-stone-300 text-right">လက်ခ</th>
                      <th className="p-1.5 text-right font-extrabold">သင့်ငွေ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, idx) => (
                      <tr key={item.id || idx} className="border-b border-stone-300 hover:bg-stone-50/50">
                        <td className="p-1.5 border-r border-stone-300 text-center font-bold text-stone-900">{idx + 1}</td>
                        <td className="p-1.5 border-r border-stone-300 font-bold text-stone-950">{item.name}</td>
                        <td className="p-1.5 border-r border-stone-300 text-center text-amber-950 font-bold">
                          {getPurityLabel(item.purity, language)}
                        </td>
                        <td className="p-1.5 border-r border-stone-300 text-right font-semibold text-stone-900">
                          {formatWeightMm(item.actualWeight)}
                        </td>
                        <td className="p-1.5 border-r border-stone-300 text-right text-stone-700">
                          {formatWeightMm(item.wastage)}
                        </td>
                        <td className="p-1.5 border-r border-stone-300 text-right font-bold text-stone-950">
                          {formatWeightMm(item.billableWeight)}
                        </td>
                        <td className="p-1.5 border-r border-stone-300 text-right font-medium text-stone-800">
                          {formatMMK(item.goldPricePerKyat)}
                        </td>
                        <td className="p-1.5 border-r border-stone-300 text-right font-medium text-stone-800">
                          {item.makingCharge > 0 ? formatMMK(item.makingCharge) : '-'}
                        </td>
                        <td className="p-1.5 text-right font-extrabold text-stone-950">
                          {formatMMK(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-stone-400 bg-stone-50 text-stone-900">
                      <td colSpan={7} className="p-1.5 text-right border-r border-stone-300 font-semibold">
                        ရွှေတန်ဖိုး စုစုပေါင်း:
                      </td>
                      <td colSpan={2} className="p-1.5 text-right font-bold text-stone-950">
                        {formatMMK(sale.subtotalGold)}
                      </td>
                    </tr>
                    {sale.totalMakingCharge > 0 && (
                      <tr className="border-t border-stone-200 bg-stone-50/70 text-stone-700">
                        <td colSpan={7} className="p-1.5 text-right border-r border-stone-300 font-medium">
                          လက်ခ စုစုပေါင်း:
                        </td>
                        <td colSpan={2} className="p-1.5 text-right font-semibold text-stone-900">
                          {formatMMK(sale.totalMakingCharge)}
                        </td>
                      </tr>
                    )}
                    {sale.totalStoneCharge > 0 && (
                      <tr className="border-t border-stone-200 bg-stone-50/70 text-stone-700">
                        <td colSpan={7} className="p-1.5 text-right border-r border-stone-300 font-medium">
                          ကျောက်ဖိုး စုစုပေါင်း:
                        </td>
                        <td colSpan={2} className="p-1.5 text-right font-semibold text-stone-900">
                          {formatMMK(sale.totalStoneCharge)}
                        </td>
                      </tr>
                    )}
                    {sale.totalDiscount > 0 && (
                      <tr className="border-t border-stone-200 bg-stone-50/70 text-rose-600">
                        <td colSpan={7} className="p-1.5 text-right border-r border-stone-300 font-medium">
                          လျှော့ဈေး (Discount):
                        </td>
                        <td colSpan={2} className="p-1.5 text-right font-semibold text-rose-600">
                          -{formatMMK(sale.totalDiscount)}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-b-2 border-stone-900 bg-amber-50 font-extrabold text-stone-900">
                      <td colSpan={7} className="p-2 text-right border-r border-stone-300 text-xs">
                        ကျသင့်ငွေ စုစုပေါင်း (Grand Total):
                      </td>
                      <td colSpan={2} className="p-2 text-right text-sm text-amber-950 font-black">
                        {formatMMK(sale.grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment & Signatures Row */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Payment records */}
                <div className="border border-stone-200 rounded-lg p-2.5 bg-stone-50 text-[11px]">
                  <p className="font-bold text-stone-800 mb-1 border-b border-stone-200 pb-0.5">
                    ငွေပေးချေမှု အခြေအနေ (Payment)
                  </p>
                  {sale.payments.map((p, pIdx) => (
                    <div key={pIdx} className="flex justify-between text-stone-600 py-0.5">
                      <span>• {p.method} {p.reference ? `(${p.reference})` : ''}:</span>
                      <span className="font-semibold text-stone-900">{formatMMK(p.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t border-stone-300 mt-1 pt-1 flex justify-between font-bold text-stone-900">
                    <span>ရှင်းပြီးငွေ (Paid):</span>
                    <span className="text-emerald-700">{formatMMK(sale.paidAmount)}</span>
                  </div>
                  {sale.balanceRemaining > 0 && (
                    <>
                      <div className="flex justify-between font-bold text-rose-600 mt-0.5">
                        <span>ကျန်ငွေ (Credit):</span>
                        <span>{formatMMK(sale.balanceRemaining)}</span>
                      </div>
                      <div className="border-t border-rose-200 bg-rose-50/90 -mx-2.5 -mb-2.5 mt-2 p-2 rounded-b-lg flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-rose-700 font-semibold block">ကျန်ငွေ ပေးရန်ရှိ:</span>
                          <span className="font-extrabold text-rose-700">{formatMMK(sale.balanceRemaining)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSettleModal(true)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] flex items-center gap-1 shadow cursor-pointer transition-colors"
                        >
                          <Coins className="w-3 h-3" />
                          <span>ကျန်ငွေရှင်းမည်</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Signatures */}
                <div className="border border-stone-200 rounded-lg p-2.5 bg-stone-50 flex flex-col justify-between text-[11px]">
                  <div className="grid grid-cols-2 gap-2 text-center pt-6">
                    <div>
                      <div className="border-b border-dashed border-stone-400 mb-1 mx-1"></div>
                      <p className="text-[10px] text-stone-600">ဝယ်ယူသူလက်မှတ်</p>
                    </div>
                    <div>
                      <div className="border-b border-dashed border-stone-400 mb-1 mx-1"></div>
                      <p className="text-[10px] text-stone-600">အရောင်းတာဝန်ခံ</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-emerald-700 font-semibold text-[10px] pt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ရွှေရတနာ စံချိန်စံညွှန်း အာမခံပါသည်</span>
                  </div>
                </div>
              </div>

              {/* Policy Footer */}
              <div className="text-center text-[10px] text-stone-500 border-t border-stone-200 pt-2">
                <p>ဝယ်ယူအားပေးမှုကို အထူးပင်ကျေးဇူးတင်ရှိပါသည်။ * ဤပြေစာပါရှိမှသာ ရွှေထည် ပြန်လည်ရောင်းချခြင်း၊ လဲလှယ်ခြင်း ဆောင်ရွက်ပေးပါမည်။</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 no-print bg-white border-t border-stone-200 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
              }`}
              title="Viber / Telegram / Messenger သို့ ပေးပို့ရန် စာသားကူးယူပါ"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'ကူးယူပြီးပါပြီ (Copied!)' : 'ပြေစာစာသား ကူးယူမည် (Viber/SMS)'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {sale.balanceRemaining > 0 && (
              <button
                type="button"
                onClick={() => setShowSettleModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black rounded-lg text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all animate-pulse"
                title="ဤပြေစာအတွက် ကျန်ငွေ ပေးချေလက်ခံမည်"
              >
                <Coins className="w-4 h-4" />
                <span>ကျန်ငွေရှင်းမည် ({formatMMK(sale.balanceRemaining)})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-lg text-xs sm:text-sm transition-colors cursor-pointer"
            >
              ပိတ်မည် (Close)
            </button>

            {printFormat === 'thermal' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPrintFormat('a5');
                    handlePrint('a5');
                  }}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs sm:text-sm border border-stone-300 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="A5 စာရွက်ဖြင့် တိုက်ရိုက် Print ထုတ်မည်"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>A5 ဖြင့် Print ထုတ်မည်</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint('thermal')}
                  className="px-4 sm:px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print (စလစ်)</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handlePrint('a5')}
                className="px-4 sm:px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print A5 စာရွက်</span>
              </button>
            )}
          </div>
        </div>

        {/* Debt Settlement Modal */}
        {showSettleModal && (
          <DebtSettlementModal
            sale={sale}
            onClose={() => setShowSettleModal(false)}
            onSettled={(updatedSale) => {
              if (updatedSale) {
                setCurrentSale(updatedSale);
              }
            }}
          />
        )}

        {/* Void Sale Modal */}
        {showVoidModal && (
          <VoidSaleModal
            isOpen={showVoidModal}
            sale={sale}
            onClose={() => setShowVoidModal(false)}
            onSuccess={(updated) => {
              setCurrentSale(updated);
              setShowVoidModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
