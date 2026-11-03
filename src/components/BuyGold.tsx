import React, { useState, useMemo } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { GoldWeight, PurityType, PurchaseItem, PaymentMethod } from '../types/gold';
import { WeightInput } from './WeightInput';
import { getPurityTheme } from '../utils/purityTheme';
import {
  calculatePurchase,
  formatMMK,
  formatNumber,
  formatWeightMm,
  formatWeightEn,
  getPurityLabel,
  weightToTotalYway,
  subtractWeights,
  weightToKyatDecimal,
  sortGoldPricesAscending,
} from '../services/calculationEngine';
import {
  ArrowDownCircle,
  Plus,
  Receipt,
  Scale,
  User,
  Building2,
  CheckCircle2,
  Printer,
  History,
  Coins,
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  FileText,
} from 'lucide-react';
import {
  printPurchaseVoucher,
  formatPurchaseToText,
  isRunningInIframe,
} from '../services/printService';

export const BuyGold: React.FC = () => {
  const {
    goldPrices,
    purchases,
    createPurchase,
    customers,
    suppliers,
    currentUser,
    storeOperation,
    language,
    settings,
  } = useGoldShop();

  const [activeTab, setActiveTab] = useState<'new_buy' | 'history'>('new_buy');

  // Party info
  const [partyType, setPartyType] = useState<'Customer' | 'Supplier'>('Customer');
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [purity, setPurity] = useState<PurityType>('15_PE');

  // Weights
  const [grossWeight, setGrossWeight] = useState<GoldWeight>({ kyat: 0, pe: 0, yway: 0 });
  const [deduction, setDeduction] = useState<GoldWeight>({ kyat: 0, pe: 0, yway: 0 });

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');

  // Selected voucher for viewing/printing
  const [selectedVoucher, setSelectedVoucher] = useState<PurchaseItem | null>(null);
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a5'>('thermal');
  const [voucherCopied, setVoucherCopied] = useState(false);
  const [inIframe] = useState(() => isRunningInIframe());

  const handlePrintVoucher = (voucher: PurchaseItem, formatOverride?: 'thermal' | 'a5') => {
    const fmt = formatOverride || printFormat;
    printPurchaseVoucher(voucher, settings, language, fmt);
  };

  const handleCopyVoucherText = async (voucher: PurchaseItem) => {
    try {
      const text = formatPurchaseToText(voucher, settings, language);
      await navigator.clipboard.writeText(text);
      setVoucherCopied(true);
      setTimeout(() => setVoucherCopied(false), 2500);
    } catch (e) {
      console.error('Failed to copy voucher text:', e);
    }
  };

  // Quick reset all form inputs
  const resetForm = () => {
    setPartyType('Customer');
    setPartyName('');
    setPartyPhone('');
    setItemDescription('');
    setPurity('15_PE');
    setGrossWeight({ kyat: 0, pe: 0, yway: 0 });
    setDeduction({ kyat: 0, pe: 0, yway: 0 });
    setPaymentMethod('Cash');
    setNotes('');
  };

  // Buy Price for selected purity
  const sortedGoldPrices = useMemo(() => sortGoldPricesAscending(goldPrices), [goldPrices]);

  const currentBuyPrice = useMemo(() => {
    const gp = goldPrices.find((p) => p.purity === purity);
    return gp ? gp.buyPrice : 6750000;
  }, [goldPrices, purity]);

  // Live calculation of purchase
  const previewPurchase = useMemo(() => {
    return calculatePurchase({
      grossWeight,
      deduction,
      buyPricePerKyat: currentBuyPrice,
      purity,
    });
  }, [grossWeight, deduction, currentBuyPrice, purity]);

  const handleCreatePurchase = () => {
    if (!storeOperation?.isOpen) {
      alert('ယခုအချိန်တွင် ဆိုင်ပိတ်ထားပါသဖြင့် ရွှေဝယ်ယူမှု မပြုလုပ်နိုင်သေးပါ။');
      return;
    }

    if (weightToTotalYway(grossWeight) <= 0) {
      alert('ကျေးဇူးပြု၍ ရွှေအလေးချိန် ထည့်သွင်းပါ');
      return;
    }

    const nextVoucherNo = `BUY-${new Date().getFullYear()}-${String(
      purchases.length + 82
    ).padStart(3, '0')}`;

    const newPurchase = createPurchase({
      voucherNo: nextVoucherNo,
      date: new Date().toISOString().split('T')[0],
      partyType,
      partyName: partyName.trim() || 'အမည်မဖော်ပြထားသူ',
      partyPhone: partyPhone.trim() || undefined,
      itemDescription: itemDescription.trim() || 'ရွှေထည် အဟောင်း',
      purity,
      grossWeight,
      deduction,
      netWeight: previewPurchase.netWeight,
      buyPricePerKyat: currentBuyPrice,
      totalAmount: previewPurchase.totalAmount,
      paymentMethod,
      cashierName: currentUser.name,
      notes: notes.trim() || undefined,
    });

    // Reset entire purchase form cleanly
    resetForm();

    // Open voucher for viewing/printing
    setSelectedVoucher(newPurchase);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <ArrowDownCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
              ရွှေဝယ်ယူခြင်း (Gold Purchase & Buyback)
            </h2>
            <p className="text-xs text-stone-500">
              Customer ရွှေဟောင်းပြန်ဝယ်ခြင်း နှင့် Supplier ရွှေကုန်ကြမ်းဝယ်ခြင်း
            </p>
          </div>
        </div>

        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('new_buy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'new_buy'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ဝယ်ယူမှု အသစ် (New Buy)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>ဝယ်ယူမှု မှတ်တမ်း ({purchases.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        /* PURCHASE HISTORY LIST */
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-stone-900 text-base">ရွှေဝယ်ယူမှု မှတ်တမ်းများ (Purchase History)</h3>
            <span className="text-xs text-stone-500">စုစုပေါင်း: {purchases.length} ကြိမ်</span>
          </div>

          <div className="overflow-x-auto pb-1 custom-scrollbar-x">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">Voucher No</th>
                  <th className="py-2.5 px-3">ရက်စွဲ (Date)</th>
                  <th className="py-2.5 px-3">ရောင်းသူ (Seller)</th>
                  <th className="py-2.5 px-3">ပစ္စည်းဖော်ပြချက်</th>
                  <th className="py-2.5 px-3">ပဲရည်</th>
                  <th className="py-2.5 px-3">အလေးချိန် (Gross / Net)</th>
                  <th className="py-2.5 px-3 text-right">ဝယ်ဈေး</th>
                  <th className="py-2.5 px-3 text-right">ပေးချေငွေ (Payout)</th>
                  <th className="py-2.5 px-3 text-center">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {purchases.map((pur, idx) => (
                  <tr
                    key={pur.id}
                    className={`transition-colors ${
                      idx % 2 === 0
                        ? 'bg-white hover:bg-blue-50/50'
                        : 'bg-stone-100/80 hover:bg-blue-50/60'
                    }`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{pur.voucherNo}</td>
                    <td className="py-3 px-3 text-stone-500">{pur.date}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-stone-800">{pur.partyName}</div>
                      <div className="text-[11px] text-stone-400">
                        {pur.partyType} • {pur.partyPhone || ''}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-stone-700">{pur.itemDescription}</td>
                    <td className="py-3 px-3 font-medium text-amber-900">
                      {getPurityLabel(pur.purity, language)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-stone-900">{formatWeightMm(pur.netWeight)}</div>
                      <div className="text-[10px] text-stone-400">
                        နုတ်ပြီး (မူလ: {formatWeightMm(pur.grossWeight)})
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-stone-600">
                      {formatNumber(pur.buyPricePerKyat)}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-blue-700 text-sm">
                      {formatMMK(pur.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedVoucher(pur)}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded text-[11px] border border-blue-200 cursor-pointer"
                      >
                        ဘောက်ချာကြည့်
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* NEW BUY INTERFACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Input Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Seller party info */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              {/* Dark Header */}
              <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  <span>ရောင်းချသူ အချက်အလက် (Seller Info)</span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-stone-800 p-0.5 rounded-lg border border-stone-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setPartyType('Customer')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        partyType === 'Customer'
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      Customer (ဖောက်သည်)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartyType('Supplier')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                        partyType === 'Supplier'
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'text-stone-300 hover:text-white'
                      }`}
                    >
                      Supplier (ကုန်သည်/ပန်းထိမ်)
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={resetForm}
                    title="ဖြည့်သွင်းထားသော အချက်အလက်များကို အသစ်ပြန်လည်ရှင်းလင်းမည်"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-stone-300 hover:text-rose-400 bg-stone-800 hover:bg-rose-950/40 border border-stone-700 hover:border-rose-800 rounded-lg font-medium transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>ရှင်းလင်းမည်</span>
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Quick Select from Saved Records */}
                {(partyType === 'Customer' ? customers.length > 0 : suppliers.length > 0) && (
                  <div>
                    <label className="block text-[11px] font-medium text-stone-500 mb-1">
                      {partyType === 'Customer'
                        ? 'မှတ်ပုံတင်ထားသော ဖောက်သည်များမှ ရွေးရန် (Quick Select)'
                        : 'မှတ်ပုံတင်ထားသော ကုန်သည်/ပန်းထိမ်များမှ ရွေးရန် (Quick Select)'}
                    </label>
                    <select
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        if (partyType === 'Customer') {
                          const c = customers.find((cust) => cust.id === id);
                          if (c) {
                            setPartyName(c.name);
                            setPartyPhone(c.phone || '');
                          }
                        } else {
                          const s = suppliers.find((sup) => sup.id === id);
                          if (s) {
                            setPartyName(s.name);
                            setPartyPhone(s.phone || '');
                          }
                        }
                      }}
                      defaultValue=""
                      className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- စာရင်းမှရွေးချယ်ရန် သို့မဟုတ် အောက်တွင်အသစ်ရိုက်ထည့်ပါ --</option>
                      {(partyType === 'Customer' ? customers : suppliers).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.phone ? `(${p.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      ရောင်းချသူအမည် (Seller Name)
                    </label>
                    <input
                      type="text"
                      value={partyName}
                      placeholder="ဥပမာ- ဒေါ်နီနီထွန်း"
                      onChange={(e) => setPartyName(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      ဖုန်းနံပါတ် (Phone Number)
                    </label>
                    <input
                      type="text"
                      value={partyPhone}
                      placeholder="ဥပမာ- ၀၉-၄၄၄၀၁၀၆၀၀"
                      onChange={(e) => setPartyPhone(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    ပစ္စည်းဖော်ပြချက် (Item Description)
                  </label>
                  <input
                    type="text"
                    value={itemDescription}
                    placeholder="ဥပမာ- ၁၅ ပဲရည် လက်စွပ်အဟောင်း၊ ရွှေဟောင်း"
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Weight & Deduction & Purity Engine */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              {/* Dark Header */}
              <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>ရွှေအလေးချိန်နှင့် ပဲရည် တွက်ချက်ခြင်း</span>
                </span>
                <span className="text-xs text-amber-300 font-bold bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-700">
                  ယနေ့ဝယ်ဈေး: {formatMMK(currentBuyPrice)}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Purity Selection */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    ရွှေအရည်အသွေး (Purity)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {sortedGoldPrices.map((gp, idx) => {
                      const theme = getPurityTheme(gp.purity, idx);
                      const isSelected = purity === gp.purity;
                      return (
                        <button
                          type="button"
                          key={gp.purity}
                          onClick={() => setPurity(gp.purity)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? `${theme.cardBg} ${theme.cardBorder} ring-2 ring-blue-500/40 shadow-xs`
                              : 'bg-stone-50/70 border-stone-200 text-stone-700 hover:bg-stone-100/80'
                          }`}
                        >
                          <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accentBar} ${isSelected ? 'opacity-100' : 'opacity-40'}`} />
                          <div className="flex items-center justify-between pt-0.5">
                            <span className={`text-xs font-bold ${isSelected ? 'text-stone-900' : 'text-stone-700'}`}>
                              {gp.purityLabel}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded ${theme.badge}`}>
                              {gp.purity}
                            </span>
                          </div>
                          <div className="text-[11px] font-extrabold text-stone-800 font-mono mt-1">
                            ဝယ်ဈေး: {formatNumber(gp.buyPrice)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gross Weight */}
                <WeightInput
                  label="ရွှေအလေးချိန် (Gross Weight ချိန်တွယ်ရရှိသော အလေးချိန်)"
                  value={grossWeight}
                  onChange={setGrossWeight}
                />

                {/* Deduction (နုတ်ငွေ / အညစ်အကြေး / အလျော့) */}
                <div className="pt-2">
                  <WeightInput
                    label="နုတ်ငွေ / အလျော့နုတ် (Deduction Weight)"
                    value={deduction}
                    onChange={setDeduction}
                    compact={true}
                  />
                </div>

                {/* Payment method for payout */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      ငွေချေစနစ် (Payout Method)
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Cash">ငွေသား (Cash Payout)</option>
                      <option value="KBZPay">KBZPay Payout</option>
                      <option value="WavePay">WavePay Payout</option>
                      <option value="Bank Transfer">ဘဏ်လွှဲ (Bank Transfer)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      မှတ်ချက် (Notes)
                    </label>
                    <input
                      type="text"
                      placeholder="ဥပမာ- ပြန်လည်သန့်စင်ရန်"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Real-time Purchase Payout Card (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-stone-900 text-white rounded-2xl shadow-xl border border-stone-800 overflow-hidden space-y-0">
              <div className="bg-stone-950 px-4 py-3 sm:px-5 border-b border-stone-800 flex items-center justify-between">
                <span className="font-bold text-sm sm:text-base text-amber-400 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span>ပေးချေရမည့်ငွေ တွက်ချက်မှု (Payout Calculation)</span>
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-stone-300">
                    <span>မူလအလေးချိန် (Gross Weight):</span>
                    <span className="font-bold text-white">{formatWeightMm(grossWeight)}</span>
                  </div>

                  <div className="flex justify-between text-rose-400">
                    <span>- နုတ်ယူအလေးချိန် (Deduction):</span>
                    <span className="font-bold">-{formatWeightMm(deduction)}</span>
                  </div>

                  <div className="border-t border-stone-800 pt-2 flex justify-between font-bold text-amber-300 text-sm">
                    <span>အသားတင်အလေးချိန် (Net Weight):</span>
                    <span>{formatWeightMm(previewPurchase.netWeight)}</span>
                  </div>

                  <div className="flex justify-between text-stone-400 text-[11px]">
                    <span>ကျပ်သားဒသမ (Kyat Decimal):</span>
                    <span className="font-mono">
                      {weightToKyatDecimal(previewPurchase.netWeight).toFixed(6)} ကျပ်
                    </span>
                  </div>

                  <div className="flex justify-between text-stone-300">
                    <span>၁ ကျပ်သား ဝယ်ဈေး (Rate):</span>
                    <span className="font-bold text-white">{formatMMK(currentBuyPrice)}</span>
                  </div>

                  <div className="border-t-2 border-stone-700 pt-3 flex flex-col gap-1">
                    <span className="text-xs text-stone-400">စုစုပေါင်း ပေးချေငွေ (Total Payout):</span>
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                      {formatMMK(previewPurchase.totalAmount)}
                    </div>
                  </div>
                </div>

                {!storeOperation?.isOpen ? (
                  <div className="mt-4 p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs text-center font-bold">
                    🔴 ဆိုင်ပိတ်ထားပါသည် (Shop Closed) • ရွှေဝယ်ယူမှု ခေတ္တရပ်နားထားပါသည်
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreatePurchase}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm sm:text-base mt-4"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>ဝယ်ယူမှု အတည်ပြုပြီး ဘောက်ချာထုတ်မည်</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW / PRINT PURCHASE VOUCHER */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div
            className={`bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200 transition-all duration-200 ${
              printFormat === 'a5' ? 'max-w-3xl' : 'max-w-lg'
            }`}
          >
            {/* Header */}
            <div className="shrink-0 no-print bg-stone-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>ရွှေဝယ်ယူမှု ဘောက်ချာ (Purchase Voucher)</span>
              </div>

              {/* Format Toggle: Thermal (80mm) vs A5 စာရွက် */}
              <div className="flex items-center gap-1 bg-stone-800 p-1 rounded-lg border border-stone-700">
                <button
                  type="button"
                  onClick={() => setPrintFormat('thermal')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    printFormat === 'thermal'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Thermal (80mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('a5')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                    printFormat === 'a5'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  A5 စာရွက်
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintVoucher(selectedVoucher)}
                  className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print ({printFormat === 'a5' ? 'A5' : 'စလစ်'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="text-stone-400 hover:text-white text-sm p-1 cursor-pointer"
                  title="ပိတ်မည်"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Iframe Notice Banner */}
            {inIframe && (
              <div className="shrink-0 no-print bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-xs text-amber-900 flex items-center justify-between">
                <span>💡 Print ခလုတ်နှိပ်ပါက စာရွက်သန့်သန့်ဖြင့် Print window သီးသန့် ပွင့်လာပါမည်။</span>
                <button
                  type="button"
                  onClick={() => handlePrintVoucher(selectedVoucher)}
                  className="font-bold text-amber-950 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>ဖွင့်မည်</span>
                </button>
              </div>
            )}

            {/* Printable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100/50 flex justify-center">
              {printFormat === 'thermal' ? (
                /* THERMAL SLIP VIEW */
                <div
                  id="printable-buy-voucher"
                  className="bg-white border border-stone-200 rounded-lg shadow-xs p-6 text-stone-900 text-xs space-y-3 font-sans w-full max-w-[380px] self-start"
                >
                  <div className="text-center border-b border-dashed border-stone-300 pb-3">
                    <h3 className="text-base font-extrabold text-stone-900">
                      {settings.shopNameMm || settings.shopName}
                    </h3>
                    <p className="text-xs font-bold text-stone-700 mt-0.5">ရွှေဝယ်ယူမှု ပြေစာ (Buy Voucher)</p>
                    <p className="text-[11px] text-stone-500 font-mono mt-1">Voucher: {selectedVoucher.voucherNo}</p>
                    <p className="text-[11px] text-stone-500">
                      Date: {selectedVoucher.date} • Cashier: {selectedVoucher.cashierName}
                    </p>
                  </div>

                  <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-3">
                    <div className="flex justify-between">
                      <span className="text-stone-500">ရောင်းချသူ (Seller):</span>
                      <span className="font-bold">
                        {selectedVoucher.partyName} ({selectedVoucher.partyType === 'Customer' ? 'ဖောက်သည်' : 'ကုန်သည်/ပန်းထိမ်'})
                      </span>
                    </div>
                    {selectedVoucher.partyPhone && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">ဖုန်း (Phone):</span>
                        <span>{selectedVoucher.partyPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-stone-500">ပစ္စည်းဖော်ပြချက်:</span>
                      <span className="font-semibold">{selectedVoucher.itemDescription}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">ပဲရည် (Purity):</span>
                      <span className="font-bold text-amber-900">
                        {getPurityLabel(selectedVoucher.purity, language)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-b border-stone-200 pb-3 text-xs">
                    <div className="flex justify-between">
                      <span>မူလအလေးချိန် (Gross Weight):</span>
                      <span className="font-semibold">
                        {formatWeightMm(selectedVoucher.grossWeight)} ({formatWeightEn(selectedVoucher.grossWeight)})
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>နုတ်ငွေ / အညစ်အကြေး (Deduction):</span>
                      <span>-{formatWeightMm(selectedVoucher.deduction)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-stone-900">
                      <span>အသားတင်အလေးချိန် (Net Weight):</span>
                      <span>{formatWeightMm(selectedVoucher.netWeight)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                      <span>ပေါက်ဈေး (Rate/Kyat):</span>
                      <span>{formatMMK(selectedVoucher.buyPricePerKyat)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-blue-900 py-1.5 my-1 border-y-2 border-blue-900">
                      <span>ပေးချေငွေစုစုပေါင်း (Total Payout):</span>
                      <span className="text-blue-700">{formatMMK(selectedVoucher.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-stone-500 text-[11px]">
                      <span>ငွေပေးနည်းလမ်း:</span>
                      <span className="font-medium text-stone-800">{selectedVoucher.paymentMethod}</span>
                    </div>
                    {selectedVoucher.notes && (
                      <div className="text-stone-500 text-[11px] pt-1 border-t border-stone-100">
                        မှတ်ချက်: {selectedVoucher.notes}
                      </div>
                    )}
                  </div>

                  <div className="text-center text-[10px] text-stone-400 pt-2">
                    လက်မှတ်: _______________________ (ရောင်းချသူ)
                  </div>
                </div>
              ) : (
                /* FORMAL A5 PAPER VIEW */
                <div
                  id="printable-buy-voucher"
                  className="bg-white shadow-md border border-stone-300 text-stone-900 transition-all w-full max-w-[620px] p-5 sm:p-6 font-sans text-xs rounded-xl self-start"
                >
                  {/* Shop Header */}
                  <div className="border-b-2 border-stone-800 pb-3 mb-3 flex items-start justify-between">
                    <div>
                      <h1 className="text-lg sm:text-xl font-black text-blue-950 tracking-tight">
                        {settings.shopNameMm || settings.shopName}
                      </h1>
                      <p className="text-[11px] text-blue-800 font-medium">{settings.tagline}</p>
                      <p className="text-[11px] text-stone-600 mt-0.5">{settings.address}</p>
                      <p className="text-[11px] text-stone-600">ဖုန်း - {settings.phone}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-0.5 bg-blue-100 text-blue-950 text-[11px] font-bold rounded-md border border-blue-300 mb-1">
                        ရွှေဝယ်ယူမှု ပြေစာ (A5)
                      </span>
                      <p className="text-xs font-mono font-bold text-stone-800">
                        No: {selectedVoucher.voucherNo}
                      </p>
                      <p className="text-[11px] text-stone-600">Date: {selectedVoucher.date}</p>
                    </div>
                  </div>

                  {/* Seller & Cashier Info Grid */}
                  <div className="grid grid-cols-2 gap-3 p-2.5 bg-stone-50 rounded-lg border border-stone-200 mb-3 text-xs">
                    <div>
                      <p className="text-stone-500 text-[11px]">ရောင်းချသူအမည် (Seller Name):</p>
                      <p className="font-bold text-stone-900 text-xs sm:text-sm">
                        {selectedVoucher.partyName}{' '}
                        <span className="text-[11px] font-normal text-stone-600">
                          ({selectedVoucher.partyType === 'Customer' ? 'ဖောက်သည်' : 'ကုန်သည်/ပန်းထိမ်'})
                        </span>
                      </p>
                      {selectedVoucher.partyPhone && (
                        <p className="text-stone-600 text-[11px] mt-0.5">ဖုန်း: {selectedVoucher.partyPhone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-stone-500 text-[11px]">တာဝန်ခံ ငွေကိုင် / စစ်ဆေးသူ:</p>
                      <p className="font-bold text-stone-900">{selectedVoucher.cashierName}</p>
                      <p className="mt-0.5">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ ငွေပေးချေပြီး (Payout)
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Formal A5 Items Table */}
                  <div className="overflow-x-auto pb-1 custom-scrollbar-x mb-3 border border-stone-300 rounded-lg">
                    <table className="w-full text-left border-collapse text-[11px] min-w-[620px]">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-300 text-stone-700 font-bold">
                          <th className="p-1.5 border-r border-stone-300 w-7 text-center">စဉ်</th>
                          <th className="p-1.5 border-r border-stone-300">ပစ္စည်းအမည် / ဖော်ပြချက်</th>
                          <th className="p-1.5 border-r border-stone-300 text-center">ပဲရည်</th>
                          <th className="p-1.5 border-r border-stone-300 text-right">မူလအလေးချိန်</th>
                          <th className="p-1.5 border-r border-stone-300 text-right">နုတ်ငွေ/အညစ်အကြေး</th>
                          <th className="p-1.5 border-r border-stone-300 text-right">အသားတင်အလေးချိန်</th>
                          <th className="p-1.5 border-r border-stone-300 text-right">၁ ကျပ်သား ဝယ်ဈေး</th>
                          <th className="p-1.5 text-right">ပေးချေငွေ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-stone-200 hover:bg-stone-50/50">
                          <td className="p-2 border-r border-stone-300 text-center font-medium">1</td>
                          <td className="p-2 border-r border-stone-300 font-semibold text-stone-900">
                            {selectedVoucher.itemDescription}
                          </td>
                          <td className="p-2 border-r border-stone-300 text-center text-amber-900 font-bold">
                            {getPurityLabel(selectedVoucher.purity, language)}
                          </td>
                          <td className="p-2 border-r border-stone-300 text-right font-medium">
                            <div>{formatWeightMm(selectedVoucher.grossWeight)}</div>
                            <div className="text-[10px] text-stone-400 font-mono">
                              {formatWeightEn(selectedVoucher.grossWeight)}
                            </div>
                          </td>
                          <td className="p-2 border-r border-stone-300 text-right text-rose-600 font-medium">
                            -{formatWeightMm(selectedVoucher.deduction)}
                          </td>
                          <td className="p-2 border-r border-stone-300 text-right font-bold text-stone-900">
                            <div>{formatWeightMm(selectedVoucher.netWeight)}</div>
                            <div className="text-[10px] text-stone-500 font-mono">
                              {formatWeightEn(selectedVoucher.netWeight)}
                            </div>
                          </td>
                          <td className="p-2 border-r border-stone-300 text-right text-stone-600 font-mono">
                            {formatMMK(selectedVoucher.buyPricePerKyat)}
                          </td>
                          <td className="p-2 text-right font-black text-blue-900 text-sm">
                            {formatMMK(selectedVoucher.totalAmount)}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-blue-900 bg-blue-50/80 text-blue-950">
                          <td colSpan={6} className="p-2 text-right border-r border-blue-200 font-bold text-xs">
                            စုစုပေါင်း ပေးချေငွေ (Total Payout):
                          </td>
                          <td colSpan={2} className="p-2 text-right font-black text-sm text-blue-700">
                            {formatMMK(selectedVoucher.totalAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Payment Details & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                      <p className="font-bold text-stone-800 mb-1">ငွေပေးချေမှု အချက်အလက် (Payout Info):</p>
                      <div className="flex justify-between py-0.5 text-[11px]">
                        <span className="text-stone-500">ပေးချေနည်းလမ်း:</span>
                        <span className="font-bold text-stone-800">{selectedVoucher.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-[11px]">
                        <span className="text-stone-500">အခြေအနေ:</span>
                        <span className="font-bold text-emerald-700">✓ ပေးချေပြီး</span>
                      </div>
                      {selectedVoucher.notes && (
                        <div className="mt-1.5 pt-1.5 border-t border-stone-200 text-stone-600 text-[11px]">
                          <span className="text-stone-500 font-medium">မှတ်ချက်:</span> {selectedVoucher.notes}
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200 flex flex-col justify-center items-center text-center">
                      <p className="font-bold text-amber-950 text-xs mb-0.5">✓ ရွှေအရည်အသွေးနှင့် စံချိန်စံညွှန်း အာမခံပါသည်</p>
                      <p className="text-[10px] text-amber-800">
                        တိကျမှန်ကန်သော ချိန်ခွင်ဖြင့် ချိန်တွယ်စစ်ဆေးပြီး အတည်ပြုချက်ရယူပြီးဖြစ်ပါသည်။
                      </p>
                    </div>
                  </div>

                  {/* Formal Signatures */}
                  <div className="grid grid-cols-2 gap-6 pt-4 pb-1 text-center text-xs text-stone-600">
                    <div>
                      <div className="border-b border-stone-400 h-8 w-3/4 mx-auto mb-1.5"></div>
                      <p className="font-bold text-stone-800 text-[11px]">ရောင်းချသူ လက်မှတ် (Seller)</p>
                      <p className="text-[10px] text-stone-500">({selectedVoucher.partyName})</p>
                    </div>
                    <div>
                      <div className="border-b border-stone-400 h-8 w-3/4 mx-auto mb-1.5"></div>
                      <p className="font-bold text-stone-800 text-[11px]">လက်ခံစစ်ဆေးသူ / ငွေကိုင် လက်မှတ်</p>
                      <p className="text-[10px] text-stone-500">({selectedVoucher.cashierName})</p>
                    </div>
                  </div>

                  {/* Footer Policy */}
                  <div className="text-center text-[10px] text-stone-500 border-t border-stone-200 pt-2 mt-3">
                    <p className="font-medium text-stone-700">ရွှေထည်ပစ္စည်းများ ရောင်းချပေးမှုအတွက် ကျေးဇူးတင်ရှိပါသည်။</p>
                    <p className="font-mono text-stone-400 mt-0.5">
                      {selectedVoucher.voucherNo} • {selectedVoucher.createdAt}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="shrink-0 no-print bg-stone-50 border-t border-stone-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleCopyVoucherText(selectedVoucher)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  voucherCopied
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                }`}
              >
                {voucherCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{voucherCopied ? 'ကူးယူပြီးပါပြီ' : 'စာသားကူးယူမည် (Viber)'}</span>
              </button>

              {/* Center Quick Switchers */}
              <div className="flex items-center gap-1 bg-stone-200/80 p-0.5 rounded-lg border border-stone-300 text-xs">
                <button
                  type="button"
                  onClick={() => setPrintFormat('thermal')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                    printFormat === 'thermal'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Thermal (80mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat('a5')}
                  className={`px-2.5 py-1 rounded font-semibold transition-all cursor-pointer ${
                    printFormat === 'a5'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  A5 စာရွက်
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVoucher(null)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
                >
                  ပိတ်မည် (Close)
                </button>

                {printFormat === 'thermal' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setPrintFormat('a5');
                        handlePrintVoucher(selectedVoucher, 'a5');
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold rounded-lg text-xs flex items-center gap-1.5 border border-blue-200 transition-all cursor-pointer"
                      title="A5 စာရွက်ဖြင့် တိုက်ရိုက် Print ထုတ်မည်"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-700" />
                      <span>A5 ဖြင့် Print ထုတ်မည်</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintVoucher(selectedVoucher, 'thermal')}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print (စလစ်)</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePrintVoucher(selectedVoucher, 'a5')}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print A5 စာရွက်</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
