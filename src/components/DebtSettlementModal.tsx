import React, { useState } from 'react';
import {
  X,
  Check,
  Copy,
  Printer,
  FileText,
  CreditCard,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { Sale, Customer, PaymentMethod, DebtSettlement } from '../types/gold';
import { useGoldShop } from '../context/GoldShopContext';
import { formatMMK } from '../services/calculationEngine';
import { printDebtSettlementReceipt, formatDebtSettlementToText } from '../services/printService';
import { PaidStamp } from './PaidStamp';

interface DebtSettlementModalProps {
  sale?: Sale | null;
  customer?: Customer | null;
  onClose: () => void;
  onSettled?: (updatedSale?: Sale, settlement?: DebtSettlement) => void;
}

export const DebtSettlementModal: React.FC<DebtSettlementModalProps> = ({
  sale,
  customer,
  onClose,
  onSettled,
}) => {
  const {
    settings,
    currentUser,
    sales,
    settleSaleCredit,
    settleCustomerBalance,
    language,
  } = useGoldShop();

  // If sale is provided, base calculations on sale.
  // Otherwise if customer is provided, find customer's pending sales or use customer's outstanding balance.
  const [selectedSaleId, setSelectedSaleId] = useState<string | undefined>(sale?.id);

  // Find the active target sale if any
  const currentSale = selectedSaleId ? sales.find((s) => s.id === selectedSaleId) || sale : sale;

  // Outstanding balance to settle
  const maxBalance = currentSale
    ? currentSale.balanceRemaining
    : (customer?.outstandingBalance || 0);

  const customerName = currentSale?.customerName || customer?.name || 'အမည်မသိ ဖောက်သည်';
  const customerPhone = currentSale?.customerPhone || customer?.phone || '';

  // Form states
  const [amount, setAmount] = useState<number>(maxBalance);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [reference, setReference] = useState<string>('');
  const [cashierName, setCashierName] = useState<string>(currentUser?.name || 'Cashier');
  const [notes, setNotes] = useState<string>('ကျန်ငွေ ရှင်းလင်းခြင်း');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settlementResult, setSettlementResult] = useState<DebtSettlement | null>(null);
  const [copied, setCopied] = useState(false);

  // Remaining balance after this payment
  const remainingAfter = Math.max(0, maxBalance - amount);
  const isFullPayment = amount >= maxBalance && maxBalance > 0;

  // Pending invoices for this customer if in customer-mode
  const customerPendingSales = customer
    ? sales.filter(
        (s) =>
          (s.customerId === customer.id ||
            s.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase()) &&
          s.balanceRemaining > 0 &&
          s.status !== 'Void'
      )
    : [];

  const handleQuickPercent = (pct: number) => {
    const calc = Math.round((maxBalance * pct) / 100);
    setAmount(calc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > maxBalance) {
      alert('ပေးချေမည့်ငွေ ပမာဏ မှန်ကန်စွာ ထည့်သွင်းပေးပါ');
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentSale) {
        // Settle specific sale invoice
        const res = await settleSaleCredit({
          saleId: currentSale.id,
          amountPaid: amount,
          paymentMethod,
          paymentReference: reference.trim() || undefined,
          cashierName,
          notes: notes.trim() || undefined,
        });

        setSettlementResult(res.settlement);
        if (onSettled) {
          onSettled(res.updatedSale, res.settlement);
        }
      } else if (customer) {
        // Settle customer general balance
        const res = settleCustomerBalance(
          customer.id,
          amount,
          paymentMethod,
          reference.trim() || undefined,
          notes.trim() || undefined,
          cashierName
        );

        if (res) {
          setSettlementResult(res);
          if (onSettled) {
            onSettled(undefined, res);
          }
        }
      }
    } catch (err: any) {
      console.error('Settlement error:', err);
      alert(err?.message || 'ကျန်ငွေရှင်းလင်းရာတွင် အမှားဖြစ်ပေါ်ပါသည်');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = (format: 'thermal' | 'a5') => {
    if (!settlementResult) return;
    printDebtSettlementReceipt(settlementResult, settings, language, format);
  };

  const handleCopyText = () => {
    if (!settlementResult) return;
    const text = formatDebtSettlementToText(settlementResult, settings, language);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      id="debt-settlement-modal-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/75 p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !settlementResult) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="shrink-0 bg-stone-900 text-amber-100 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                {settlementResult ? 'ကျန်ငွေရှင်းပြေစာ (Receipt)' : 'ကျန်ငွေရှင်းလွှာ / စာရင်းရှင်းမည်'}
              </h2>
              <p className="text-[11px] text-stone-400">
                {settlementResult
                  ? `ပြေစာအမှတ်: ${settlementResult.receiptNo}`
                  : 'Customer Outstanding Debt Settlement'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            title="ပိတ်မည်"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs sm:text-sm">
          {!settlementResult ? (
            /* STEP 1: SETTLEMENT FORM */
            <form id="debt-settlement-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Customer & Invoice Overview Box */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                      ဖောက်သည် အချက်အလက်
                    </span>
                    <h3 className="text-sm font-extrabold text-stone-900">{customerName}</h3>
                    {customerPhone && (
                      <p className="text-[11px] text-stone-600">ဖုန်း: {customerPhone}</p>
                    )}
                  </div>

                  {currentSale && (
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                        အရောင်းပြေစာအမှတ်
                      </span>
                      <p className="text-sm font-black font-mono text-amber-900">
                        {currentSale.invoiceNo}
                      </p>
                      <p className="text-[10px] text-stone-500">{currentSale.date}</p>
                    </div>
                  )}
                </div>

                {/* If multiple pending sales exist for this customer, allow choosing */}
                {!sale && customerPendingSales.length > 1 && (
                  <div className="pt-2 border-t border-amber-200/80">
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      ရှင်းလင်းမည့် အရောင်းပြေစာ ရွေးချယ်ရန်:
                    </label>
                    <select
                      value={selectedSaleId || ''}
                      onChange={(e) => {
                        const sId = e.target.value;
                        setSelectedSaleId(sId || undefined);
                        const found = sales.find((s) => s.id === sId);
                        if (found) {
                          setAmount(found.balanceRemaining);
                        } else if (customer) {
                          setAmount(customer.outstandingBalance);
                        }
                      }}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="">
                        ဖောက်သည်၏ ကျန်ငွေအားလုံး (စုစုပေါင်း {formatMMK(customer.outstandingBalance)})
                      </option>
                      {customerPendingSales.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.invoiceNo} ({ps.date}) - ကျန်ငွေ {formatMMK(ps.balanceRemaining)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Financial Overview Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/80 text-xs">
                  <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200">
                    <span className="text-stone-500 text-[10px] block">ယခင် ပေးရန်ကျန်ငွေ</span>
                    <span className="text-base font-extrabold text-rose-600">
                      {formatMMK(maxBalance)}
                    </span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200">
                    <span className="text-stone-500 text-[10px] block">ပေးချေပြီးနောက် ကျန်ရှိမည့်ငွေ</span>
                    <span
                      className={`text-base font-extrabold ${
                        remainingAfter === 0 ? 'text-emerald-700' : 'text-amber-800'
                      }`}
                    >
                      {formatMMK(remainingAfter)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount to Pay Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1">
                    <span>ယခု ပေးချေမည့်ငွေ (Amount to Pay)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-stone-500 font-mono">
                    အများဆုံး: {formatMMK(maxBalance)}
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={maxBalance}
                    value={amount === 0 ? '' : amount}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setAmount(val);
                    }}
                    placeholder="0"
                    className="w-full bg-stone-50 border-2 border-amber-400/80 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-base font-black text-stone-900 focus:outline-none focus:bg-white transition-all pr-16"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-500">
                    MMK
                  </span>
                </div>

                {/* Quick percentage buttons */}
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(100)}
                    className={`flex-1 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                      amount === maxBalance
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                    }`}
                  >
                    အားလုံး (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(75)}
                    className="flex-1 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-[11px] font-medium border border-stone-300 transition-colors cursor-pointer"
                  >
                    ၇၅%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(50)}
                    className="flex-1 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-[11px] font-medium border border-stone-300 transition-colors cursor-pointer"
                  >
                    ၅၀% (ထက်ဝက်)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPercent(25)}
                    className="flex-1 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md text-[11px] font-medium border border-stone-300 transition-colors cursor-pointer"
                  >
                    ၂၅%
                  </button>
                </div>
              </div>

              {/* Status Alert Badge */}
              <div
                className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
                  isFullPayment
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                    : 'bg-amber-50 border-amber-300 text-amber-900 font-medium'
                }`}
              >
                {isFullPayment ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      ✓ ကျန်ငွေအားလုံး အပြီးအပြတ် ပေးချေမည်ဖြစ်ပြီး ဘောက်ချာအခြေအနေသည်{' '}
                      <strong>"ငွေရှင်းပြီး (Completed)"</strong> ဖြစ်သွားပါမည်။
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      • ကျန်ငွေ တစ်စိတ်တစ်ပိုင်း ပေးချေခြင်းဖြစ်ပြီး လက်ကျန်ငွေ{' '}
                      <strong>{formatMMK(remainingAfter)}</strong> ကျန်ရှိနေပါမည်။
                    </span>
                  </>
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  ပေးချေသည့် နည်းလမ်း (Payment Method)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    ['Cash', 'KBZPay', 'AYA Pay', 'CB Pay', 'WavePay', 'Bank Transfer'] as PaymentMethod[]
                  ).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`px-2.5 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentMethod === m
                          ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-sm'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {m === 'Cash' ? (
                        <Wallet className="w-3.5 h-3.5" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {m === 'Cash'
                          ? 'ငွေသား'
                          : m === 'Bank Transfer'
                          ? 'ဘဏ်လွှဲ'
                          : m}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Reference (if not cash) */}
              {paymentMethod !== 'Cash' && (
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    ငွေလွှဲအမှတ် / Transaction Slip Reference
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="ဥပမာ - 0987654321 / Ref-1234"
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Cashier & Notes row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-stone-500" />
                    <span>ငွေလက်ခံသူ (Cashier / Staff)</span>
                  </label>
                  <input
                    type="text"
                    value={cashierName}
                    onChange={(e) => setCashierName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    မှတ်ချက် (Remarks)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ဥပမာ - ကျန်ငွေ အပြီးရှင်းပြီး"
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </form>
          ) : (
            /* STEP 2: SETTLEMENT SUCCESS & VOUCHER VIEW */
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-200">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h3 className="text-base font-extrabold text-stone-900">
                  ကျန်ငွေရှင်းလင်းမှု အောင်မြင်ပါသည်!
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  ပေးချေငွေလက်ခံရရှိမှုကို စနစ်အတွင်း အောင်မြင်စွာ မှတ်တမ်းတင်ပြီးပါပြီ။
                </p>
              </div>

              {/* Printable-style Preview Card */}
              <div
                id="printable-debt-receipt"
                className="printable-sheet bg-white border border-stone-300 rounded-xl p-4 space-y-3 text-xs"
              >
                <div className="flex justify-between items-center border-b border-stone-200 pb-2 relative">
                  <div>
                    <span className="font-extrabold text-amber-950 text-sm">
                      {settings.shopName}
                    </span>
                    <p className="text-[10px] text-stone-500">ကျန်ငွေရှင်းလွှာ (Debt Receipt)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <PaidStamp date={settlementResult.date} size="sm" />
                    <div className="text-right">
                      <span className="font-mono font-bold text-stone-800">
                        {settlementResult.receiptNo}
                      </span>
                      <p className="text-[10px] text-stone-500">{settlementResult.createdAt}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-stone-500 block">ဖောက်သည်:</span>
                    <strong className="text-stone-900">{settlementResult.customerName}</strong>
                    {settlementResult.customerPhone && (
                      <p className="text-stone-600">{settlementResult.customerPhone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {settlementResult.invoiceNo && (
                      <>
                        <span className="text-stone-500 block">မူလအရောင်းပြေစာ:</span>
                        <strong className="text-amber-900 font-mono">
                          {settlementResult.invoiceNo}
                        </strong>
                      </>
                    )}
                    <p className="text-stone-600">
                      ငွေလက်ခံသူ: {settlementResult.cashierName}
                    </p>
                  </div>
                </div>

                {/* Amount Table */}
                <div className="border border-stone-200 rounded-lg overflow-hidden bg-white">
                  <div className="flex justify-between px-3 py-1.5 bg-stone-100 border-b border-stone-200 font-bold text-stone-700">
                    <span>ယခင် ပေးရန်ကျန်ငွေ:</span>
                    <span>{formatMMK(settlementResult.previousBalance)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 font-black text-emerald-700 bg-emerald-50 text-sm">
                    <span>ယခု ပေးချေလက်ခံငွေ ({settlementResult.paymentMethod}):</span>
                    <span>{formatMMK(settlementResult.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1.5 border-t border-stone-200 font-bold text-stone-900">
                    <span>လက်ကျန် ကျန်ငွေ:</span>
                    <span
                      className={
                        settlementResult.remainingBalance === 0
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }
                    >
                      {formatMMK(settlementResult.remainingBalance)}
                    </span>
                  </div>
                </div>

                {settlementResult.paymentReference && (
                  <p className="text-[11px] text-stone-600">
                    ငွေလွှဲအမှတ်: <span className="font-mono">{settlementResult.paymentReference}</span>
                  </p>
                )}

                {settlementResult.notes && (
                  <p className="text-[11px] text-stone-600 italic">
                    မှတ်ချက်: {settlementResult.notes}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="shrink-0 bg-stone-100 border-t border-stone-200 px-5 py-3 flex items-center justify-between gap-2">
          {!settlementResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-stone-200 text-stone-700 font-medium rounded-xl border border-stone-300 text-xs transition-colors cursor-pointer"
              >
                မလုပ်တော့ပါ (Cancel)
              </button>

              <button
                type="submit"
                form="debt-settlement-form"
                disabled={isSubmitting || amount <= 0 || amount > maxBalance}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'စာရင်းရှင်းနေပါသည်...'
                    : `ငွေလက်ခံပြီး စာရင်းရှင်းမည် (${formatMMK(amount)})`}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCopyText}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  copied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white hover:bg-stone-200 text-stone-700 border-stone-300'
                }`}
                title="Viber / SMS သို့ ပေးပို့ရန် ကူးယူပါ"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'ကူးယူပြီးပါပြီ' : 'Viber/SMS ကူးယူမည်'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint('thermal')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl shadow text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>စလစ် Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrint('a5')}
                  className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl shadow text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>A5 Print</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white hover:bg-stone-200 text-stone-700 font-bold rounded-xl border border-stone-300 text-xs cursor-pointer"
                >
                  ပြီးပါပြီ
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
