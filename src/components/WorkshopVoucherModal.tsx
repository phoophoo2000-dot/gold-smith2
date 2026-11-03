import React, { useRef, useState } from 'react';
import { WorkshopJobOrder } from '../types/gold';
import { useGoldShop } from '../context/GoldShopContext';
import { formatMMK, formatWeightMm, getPurityLabel, weightToGrams } from '../services/calculationEngine';
import { printWorkshopOrderSlip, formatWorkshopOrderToText, isRunningInIframe } from '../services/printService';
import {
  Printer,
  X,
  Hammer,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  User,
  Phone,
  Calendar,
  Layers,
  Receipt,
  FileText,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface WorkshopVoucherModalProps {
  order: WorkshopJobOrder;
  onClose: () => void;
}

export const WorkshopVoucherModal: React.FC<WorkshopVoucherModalProps> = ({ order, onClose }) => {
  const { settings, currentUser } = useGoldShop();
  const printRef = useRef<HTMLDivElement>(null);
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a5'>('thermal');
  const [copied, setCopied] = useState(false);
  const inIframe = isRunningInIframe();

  const handlePrint = (formatOverride?: 'thermal' | 'a5') => {
    const fmt = formatOverride || printFormat;
    printWorkshopOrderSlip(order, settings, 'my', fmt);
  };

  const handleCopyText = async () => {
    try {
      const text = formatWorkshopOrderToText(order, settings, 'my');
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy text:', e);
    }
  };

  const getOrderTypeBadge = (type: string) => {
    switch (type) {
      case 'CustomerOrder':
        return { label: 'ဖောက်သည် အပ်ထည် (Customer Custom Order)', bg: 'bg-indigo-100 text-indigo-800' };
      case 'StockProduction':
        return { label: 'ဆိုင်တင် စတော့ထုတ်လုပ်ခြင်း (Stock Production)', bg: 'bg-emerald-100 text-emerald-800' };
      case 'GoldMelting':
        return { label: 'ရွှေကျို / ရွှေသွန်း (Gold Melting & Casting)', bg: 'bg-amber-100 text-amber-800' };
      case 'RepairResize':
        return { label: 'ပြုပြင် / ဆိုဒ်ချိန်ညှိခြင်း (Repair & Resize)', bg: 'bg-purple-100 text-purple-800' };
      default:
        return { label: type, bg: 'bg-stone-100 text-stone-800' };
    }
  };

  const typeBadge = getOrderTypeBadge(order.orderType);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full border border-stone-200 overflow-hidden my-auto max-h-[95vh] flex flex-col transition-all duration-200 ${
          printFormat === 'a5' ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-stone-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-amber-400">
                ပန်းထိမ်အပ်နှံလွှာ နှင့် အလျော့တွက်ရှင်းတမ်း
              </h3>
              <p className="text-xs text-stone-400 font-mono">
                ဘောက်ချာအမှတ်: {order.jobNo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
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
                <span>စလစ် (Slip)</span>
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

            {/* Copy Text Button */}
            <button
              type="button"
              onClick={handleCopyText}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
              }`}
              title="Viber / SMS သို့ ပေးပို့ရန် စာသားကူးယူပါ"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'ကူးယူပြီး' : 'စာသားကူးမည်'}</span>
            </button>

            {/* Print button */}
            <button
              type="button"
              onClick={() => handlePrint()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-md hover:scale-105 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print ({printFormat === 'a5' ? 'A5' : 'စလစ်'})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Iframe Notice Banner */}
        {inIframe && (
          <div className="shrink-0 no-print bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
            <span>💡 Print ခလုတ်နှိပ်ပါက စာရွက်သန့်သန့်ဖြင့် Print window သီးသန့် ပွင့်လာပါမည်။</span>
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

        {/* Printable Paper Content */}
        <div
          ref={printRef}
          id="printable-workshop-voucher"
          className="printable-sheet p-6 overflow-y-auto flex-1 text-stone-800 text-sm print:p-0 print:m-0 print:text-black"
        >
          {/* Shop Header */}
          <div className="text-center pb-4 mb-4 border-b border-stone-300">
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {settings.shopNameMm || settings.shopName}
            </h1>
            <p className="text-xs text-stone-600 mt-1 font-medium">{settings.tagline}</p>
            <p className="text-xs text-stone-500 mt-0.5">{settings.address}</p>
            <p className="text-xs text-stone-600 font-mono mt-0.5">ဖုန်း: {settings.phone}</p>
            <div className="inline-block mt-2 px-3 py-1 bg-stone-100 border border-stone-300 rounded-md text-xs font-bold text-stone-800">
              {order.status === 'Received' || order.status === 'Stocked'
                ? 'ပန်းထိမ်ပြီးစီးမှု နှင့် အလျော့တွက် အပြီးသတ်ရှင်းတမ်း'
                : 'ပန်းထိမ်အပ်နှံမှု လက်ခံပြေစာ (Work In Progress)'}
            </div>
          </div>

          {/* Job & Goldsmith Meta */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 mb-4 text-xs">
            <div>
              <span className="text-stone-500 block">ဘောက်ချာအမှတ် / Job No:</span>
              <span className="font-bold font-mono text-sm text-stone-900">{order.jobNo}</span>
            </div>
            <div>
              <span className="text-stone-500 block">အပ်နှံသည့်ရက်စွဲ (Order Date):</span>
              <span className="font-semibold text-stone-800">{order.orderDate}</span>
            </div>
            <div>
              <span className="text-stone-500 block">ပန်းထိမ်ဆရာ / အလုပ်ရုံ:</span>
              <span className="font-bold text-stone-900">{order.goldsmithName}</span>
            </div>
            <div>
              <span className="text-stone-500 block">ပြီးစီးရမည့်ရက် (Due Date):</span>
              <span className="font-semibold text-stone-800">{order.dueDate || 'သတ်မှတ်မထားပါ'}</span>
            </div>
            {order.customerName && (
              <div className="col-span-2 pt-2 border-t border-stone-200">
                <span className="text-stone-500 block">အပ်နှံသူ ဖောက်သည် (Customer):</span>
                <span className="font-bold text-stone-900">
                  {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                </span>
                {order.depositAmount ? (
                  <span className="text-emerald-700 ml-2 font-semibold">
                    [စရန်ငွေ: {formatMMK(order.depositAmount)}]
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Item Description */}
          <div className="mb-4 p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                အပ်ထည်အချက်အလက် (Item Specification)
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${typeBadge.bg}`}>
                {typeBadge.label}
              </span>
            </div>
            <div className="text-base font-bold text-stone-900 mb-1">{order.title}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
              <span>အမျိုးအစား: <strong className="text-stone-800">{order.category}</strong></span>
              <span>ရွှေရည်: <strong className="text-stone-800">{getPurityLabel(order.purity)}</strong></span>
              {order.givenDescription && (
                <span>အပ်ရွှေအမျိုးအစား: <strong className="text-stone-800">{order.givenDescription}</strong></span>
              )}
            </div>
          </div>

          {/* Gold Weight & Wastage Equation Matrix */}
          <div className="mb-4 border border-stone-300 rounded-xl overflow-hidden">
            <div className="bg-stone-800 text-white px-3 py-2 text-xs font-bold flex items-center justify-between">
              <span>ရွှေချိန် နှင့် အလျော့တွက် စစ်ဆေးမှုဇယား (Gold Weight & Wastage Matrix)</span>
              <Scale className="w-4 h-4 text-amber-400" />
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-stone-200">
                <tr className="bg-stone-50">
                  <td className="px-3 py-2 font-medium text-stone-600">
                    ၁။ ထုတ်ပေးလိုက်သော အပ်ရွှေချိန် (Given Raw Weight):
                  </td>
                  <td className="px-3 py-2 text-right font-bold font-mono text-stone-900 text-sm">
                    {formatWeightMm(order.givenWeight)}
                    <span className="text-[10px] text-stone-500 font-normal ml-1">
                      (~{weightToGrams(order.givenWeight)}g)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-stone-600">
                    ၂။ သတ်မှတ်ခွင့်ပြု အလျော့တွက် (Allowed Wastage Tolerance):
                  </td>
                  <td className="px-3 py-2 text-right font-semibold font-mono text-stone-800">
                    {formatWeightMm(order.allowedWastage)}
                  </td>
                </tr>

                {order.finishedWeight ? (
                  <>
                    <tr className="bg-emerald-50/50">
                      <td className="px-3 py-2 font-medium text-emerald-900">
                        ၃။ ပြီးစီး၍ ပြန်အပ်သော အထည်ရွှေချိန် (Finished Net Weight):
                      </td>
                      <td className="px-3 py-2 text-right font-bold font-mono text-emerald-900 text-sm">
                        {formatWeightMm(order.finishedWeight)}
                        <span className="text-[10px] text-emerald-700 font-normal ml-1">
                          (~{weightToGrams(order.finishedWeight)}g)
                        </span>
                      </td>
                    </tr>
                    {order.scrapWeight && (order.scrapWeight.kyat > 0 || order.scrapWeight.pe > 0 || order.scrapWeight.yway > 0) && (
                      <tr>
                        <td className="px-3 py-2 font-medium text-stone-600">
                          ၄။ ပြန်အပ်သော ရွှေစ / ရွှေအပို (Returned Scrap Gold):
                        </td>
                        <td className="px-3 py-2 text-right font-semibold font-mono text-stone-800">
                          {formatWeightMm(order.scrapWeight)}
                        </td>
                      </tr>
                    )}
                    {order.actualLossWeight && (
                      <tr className="bg-stone-50">
                        <td className="px-3 py-2 font-medium text-stone-700">
                          ၅။ အမှန်တကယ် လျော့နည်းသွားမှု (Actual Loss):
                        </td>
                        <td className="px-3 py-2 text-right font-bold font-mono text-stone-800">
                          {formatWeightMm(order.actualLossWeight)}
                        </td>
                      </tr>
                    )}
                    <tr className={order.wastageVarianceYway && order.wastageVarianceYway > 0.05 ? 'bg-rose-50 text-rose-900' : 'bg-emerald-50 text-emerald-900'}>
                      <td className="px-3 py-2 font-bold">
                        ၆။ အလျော့တွက် ကွာဟချက် (Wastage Variance / Discrepancy):
                      </td>
                      <td className="px-3 py-2 text-right font-black font-mono text-sm">
                        {order.wastageVarianceYway !== undefined ? (
                          order.wastageVarianceYway > 0.05 ? (
                            <span className="text-rose-700">
                              + {order.wastageVarianceYway.toFixed(1)} ရွေး (ပေါက်ကြားမှု/လျော့နည်း)
                            </span>
                          ) : Math.abs(order.wastageVarianceYway) <= 0.05 ? (
                            <span className="text-emerald-700">၀ ရွေး (အတိအကျ ကိုက်ညီ)</span>
                          ) : (
                            <span className="text-emerald-700">
                              - {Math.abs(order.wastageVarianceYway).toFixed(1)} ရွေး (အလျော့သက်သာ)
                            </span>
                          )
                        ) : (
                          'စစ်ဆေးဆဲ'
                        )}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={2} className="px-3 py-3 text-center text-stone-500 italic bg-stone-50">
                      (ပန်းထိမ်လုပ်ငန်းခွင်၌ ပြုလုပ်နေဆဲဖြစ်ပြီး အထည်လက်ခံရရှိချိန်တွင် အပြီးသတ်ရွှေချိန် စာရင်းသွင်းစစ်ဆေးပါမည်)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Labor & Settlement Breakdown */}
          <div className="mb-4 grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
            <div>
              <span className="text-stone-500 block">ပန်းထိမ်လက်ခ စုစုပေါင်း (Total Labor):</span>
              <span className="font-bold text-stone-900 text-sm">{formatMMK(order.totalLaborCharge)}</span>
              <span className="text-[10px] text-stone-500 block mt-0.5">
                ({order.laborChargeType === 'PerKyat' ? 'ကျပ်သားအလိုက်' : order.laborChargeType === 'PerPiece' ? 'တစ်ထည်နှုန်း' : 'သတ်မှတ်နှုန်း'})
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">ရှင်းပြီးလက်ခ (Paid Labor):</span>
              <span className="font-semibold text-emerald-700 text-sm">{formatMMK(order.paidLaborCharge)}</span>
            </div>
            <div>
              <span className="text-stone-500 block">ရွှေပေါက်ကြားမှု နုတ်ယူငွေ/ဒဏ်ကြေး:</span>
              <span className="font-semibold text-rose-700 font-mono">
                {order.shortagePenalty ? `- ${formatMMK(order.shortagePenalty)}` : 'မရှိ'}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">ရှင်းရန်ကျန်ငွေ (Balance Due):</span>
              <span className="font-black text-rose-600 text-sm">{formatMMK(order.balanceLaborCharge)}</span>
            </div>
          </div>

          {order.notes && (
            <div className="mb-6 p-2.5 bg-stone-100 rounded-lg text-xs text-stone-700 border border-stone-200">
              <span className="font-bold text-stone-900 block mb-0.5">မှတ်ချက်:</span>
              {order.notes}
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-6 border-t border-stone-300 text-center text-xs">
            <div>
              <div className="h-12 border-b border-stone-400 border-dashed mb-2" />
              <p className="font-bold text-stone-800">ပန်းထိမ်ဆရာ လက်မှတ်</p>
              <p className="text-[11px] text-stone-500">({order.goldsmithName})</p>
            </div>
            <div>
              <div className="h-12 border-b border-stone-400 border-dashed mb-2" />
              <p className="font-bold text-stone-800">ဆိုင်တာဝန်ခံ / မန်နေဂျာ လက်မှတ်</p>
              <p className="text-[11px] text-stone-500">({order.receivedBy || order.assignedBy || currentUser.name})</p>
            </div>
          </div>

          <div className="text-center text-[10px] text-stone-400 mt-6 font-mono">
            {settings.shopName} • Myanmar Gold POS Workshop Engine • Printed at: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
