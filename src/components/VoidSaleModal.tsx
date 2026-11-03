import React, { useState, useEffect } from 'react';
import { Sale, UserRole } from '../types/gold';
import { useGoldShop, getCanonicalProfileKey } from '../context/GoldShopContext';
import { formatMMK, formatWeightMm } from '../services/calculationEngine';
import {
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  X,
  User,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface VoidSaleModalProps {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
  onSuccess?: (voidedSale: Sale) => void;
}

const COMMON_REASONS = [
  'စာရင်းမှားယွင်းရိုက်သွင်းမိခြင်း (Data Entry Error)',
  'ဝယ်ယူသူမှ အော်ဒါဖျက်သိမ်းခြင်း (Customer Cancellation)',
  'ပစ္စည်းလဲလှယ်ခြင်းကြောင့် ဖျက်ခြင်း (Product Exchange)',
  'တွက်ချက်မှုနှင့် လျှော့ငွေ မှားယွင်းခြင်း (Calculation / Discount Error)',
  'အခြား အကြောင်းပြချက် (Other)',
];

export const VoidSaleModal: React.FC<VoidSaleModalProps> = ({
  isOpen,
  sale,
  onClose,
  onSuccess,
}) => {
  const { currentUser, userProfiles, verifyManagerPin, verifyStaffPin, voidSale } = useGoldShop();

  // Selected Staff
  const [selectedStaffName, setSelectedStaffName] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [isStaffVerified, setIsStaffVerified] = useState(false);
  const [staffPinError, setStaffPinError] = useState<string | null>(null);

  // Void Reason
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  // Manager Approval PIN
  const [managerPin, setManagerPin] = useState('');
  const [managerVerifier, setManagerVerifier] = useState<{
    verified: boolean;
    name: string;
    role: UserRole;
  } | null>(null);
  const [managerPinError, setManagerPinError] = useState<string | null>(null);

  // Active Keypad target
  const [activePinField, setActivePinField] = useState<'manager' | 'staff'>('manager');

  // Staff options list (deduplicated by canonical key)
  const staffList = React.useMemo(() => {
    const raw = userProfiles.filter((p) => p.role === 'Staff' || p.role === 'Manager' || p.role === 'Admin');
    const seen = new Set<string>();
    const res: typeof userProfiles = [];
    for (const s of raw) {
      const cKey = getCanonicalProfileKey(s);
      if (!seen.has(cKey)) {
        seen.add(cKey);
        res.push(s);
      }
    }
    return res;
  }, [userProfiles]);

  useEffect(() => {
    if (isOpen && sale) {
      // Initialize staff name to current user if available
      if (currentUser?.role === 'Staff') {
        setSelectedStaffName(currentUser.name);
        setSelectedStaffId(currentUser.id);
        setIsStaffVerified(true);
      } else {
        const defaultStaff = staffList.find((s) => s.full_name.toLowerCase().includes('phoo')) || staffList[0];
        if (defaultStaff) {
          setSelectedStaffName(defaultStaff.full_name);
          setSelectedStaffId(defaultStaff.id);
        } else {
          setSelectedStaffName(currentUser?.name || 'Staff (Phoo)');
          setSelectedStaffId(currentUser?.id || 'staff_phoo');
        }
      }

      // If current user is already Manager or Admin, pre-authorize or allow quick PIN
      if (currentUser?.role === 'Manager' || currentUser?.role === 'Admin') {
        setManagerVerifier({
          verified: true,
          name: currentUser.name,
          role: currentUser.role,
        });
      } else {
        setManagerVerifier(null);
      }

      setManagerPin('');
      setStaffPin('');
      setManagerPinError(null);
      setStaffPinError(null);
      setSelectedReason(COMMON_REASONS[0]);
      setCustomReason('');
    }
  }, [isOpen, sale, currentUser]);

  if (!isOpen || !sale) return null;

  // Handle Manager PIN change
  const handleManagerPinChange = (val: string) => {
    setManagerPin(val);
    setManagerPinError(null);

    if (val.length >= 4) {
      const res = verifyManagerPin(val);
      if (res.verified) {
        setManagerVerifier({
          verified: true,
          name: res.managerName || 'Manager',
          role: res.role || 'Manager',
        });
        setManagerPinError(null);
      } else {
        setManagerVerifier(null);
        setManagerPinError('Manager သို့မဟုတ် Admin PIN မမှန်ကန်ပါ');
      }
    } else {
      setManagerVerifier(null);
    }
  };

  // Handle Staff PIN change
  const handleStaffPinChange = (val: string) => {
    setStaffPin(val);
    setStaffPinError(null);

    if (val.length >= 4) {
      const res = verifyStaffPin(val, selectedStaffId || selectedStaffName);
      if (res.verified) {
        setIsStaffVerified(true);
        if (res.staffName) setSelectedStaffName(res.staffName);
        setStaffPinError(null);
      } else {
        setIsStaffVerified(false);
        setStaffPinError('Staff PIN မမှန်ကန်ပါ (Phoo: 4444, မနွယ်နွယ်: 3333)');
      }
    } else {
      setIsStaffVerified(false);
    }
  };

  const handleKeypadDigit = (digit: string) => {
    if (activePinField === 'manager') {
      if (managerPin.length < 6) {
        handleManagerPinChange(managerPin + digit);
      }
    } else {
      if (staffPin.length < 6) {
        handleStaffPinChange(staffPin + digit);
      }
    }
  };

  const handleKeypadBackspace = () => {
    if (activePinField === 'manager') {
      handleManagerPinChange(managerPin.slice(0, -1));
    } else {
      handleStaffPinChange(staffPin.slice(0, -1));
    }
  };

  const handleKeypadClear = () => {
    if (activePinField === 'manager') {
      handleManagerPinChange('');
    } else {
      handleStaffPinChange('');
    }
  };

  const finalReason =
    selectedReason.includes('အခြား')
      ? customReason.trim() || 'အခြား အကြောင်းပြချက်ဖြင့် ပယ်ဖျက်ခြင်း'
      : selectedReason;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check Manager approval
    if (!managerVerifier?.verified) {
      if (!managerPin) {
        setManagerPinError('မန်နေဂျာ/အုပ်ချုပ်သူ PIN နံပါတ် ရိုက်ထည့်ပေးပါ');
        setActivePinField('manager');
        return;
      }
      const res = verifyManagerPin(managerPin);
      if (!res.verified) {
        setManagerPinError('Manager သို့မဟုတ် Admin PIN နံပါတ် မှားယွင်းနေပါသည်');
        setActivePinField('manager');
        return;
      }
    }

    const approverName = managerVerifier?.name || 'Manager';
    const staffName = selectedStaffName || currentUser?.name || 'Staff';

    // Execute void
    voidSale(sale.id, {
      reason: finalReason,
      voidedBy: staffName,
      voidApprovedBy: approverName,
    });

    const updatedSale: Sale = {
      ...sale,
      status: 'Void',
      voidReason: finalReason,
      voidedBy: staffName,
      voidApprovedBy: approverName,
    };

    if (onSuccess) {
      onSuccess(updatedSale);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>အရောင်းဘောက်ချာ ပယ်ဖျက်ခြင်း</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono font-bold border border-rose-500/30">
                  VOID SALE
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Staff တောင်းဆိုမှုနှင့် Manager PIN ခွင့်ပြုချက်ဖြင့် စာရင်းပယ်ဖျက်မည်
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* 1. Voucher Summary Card */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-stone-500 font-medium">ဘောက်ချာအမှတ်:</span>
                <span className="font-mono font-bold text-sm text-stone-900">{sale.invoiceNo}</span>
              </div>
              <div className="text-xs text-stone-500 font-medium">
                ရက်စွဲ: <span className="text-stone-800 font-semibold">{sale.date}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-500 block text-[11px]">ဝယ်ယူသူ:</span>
                <span className="font-bold text-stone-900">{sale.customerName || 'အထွေထွေ ဝယ်ယူသူ'}</span>
                {sale.customerPhone && (
                  <span className="text-stone-400 text-[11px] block">{sale.customerPhone}</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-stone-500 block text-[11px]">ဘောက်ချာ စုစုပေါင်းငွေ:</span>
                <span className="font-mono font-bold text-base text-rose-600">
                  {formatMMK(sale.grandTotal)}
                </span>
              </div>
            </div>

            {/* Sold Items in this sale */}
            <div className="pt-2 border-t border-stone-200">
              <span className="text-[11px] font-semibold text-stone-600 block mb-1.5">
                ရောင်းချခဲ့သော ရွှေထည်များ ({sale.items.length} ထည်):
              </span>
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-stone-200 text-xs">
                {sale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-stone-700">
                    <span className="truncate max-w-[240px]">
                      • {it.name} <span className="text-stone-400 font-mono">({formatWeightMm(it.actualWeight)})</span>
                    </span>
                    <span className="font-mono font-medium text-stone-900">{formatMMK(it.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Staff Selection & Staff PIN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>၁။ ပယ်ဖျက်ရန် တောင်းဆိုသူ စာရေး (Staff Member):</span>
              </label>
              {isStaffVerified && (
                <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Staff အတည်ပြုပြီး
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  const s = staffList.find((item) => item.id === e.target.value);
                  if (s) {
                    setSelectedStaffId(s.id);
                    setSelectedStaffName(s.full_name);
                  }
                }}
                className="w-full text-xs font-medium py-2 px-3 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.role})
                  </option>
                ))}
              </select>

              {/* Staff PIN input (optional confirmation) */}
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={staffPin}
                  onFocus={() => setActivePinField('staff')}
                  onChange={(e) => handleStaffPinChange(e.target.value)}
                  placeholder="Staff PIN နံပါတ် ရိုက်ပါ"
                  className={`w-full text-xs font-mono py-2 px-3 border rounded-xl focus:outline-none focus:ring-2 ${
                    isStaffVerified
                      ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900'
                      : staffPinError
                      ? 'border-rose-400 bg-rose-50/40'
                      : 'border-stone-300 bg-white'
                  }`}
                />
                {isStaffVerified && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-2.5 top-2.5" />
                )}
              </div>
            </div>

            {staffPinError && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {staffPinError}
              </p>
            )}
          </div>

          {/* 3. Reason for Voiding */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-800 block">
              ၂။ ဘောက်ချာ ပယ်ဖျက်ရသည့် အကြောင်းရင်း (Reason for Void):
            </label>
            <div className="space-y-1.5">
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full text-xs font-medium py-2 px-3 bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {COMMON_REASONS.map((r, idx) => (
                  <option key={idx} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {selectedReason.includes('အခြား') && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="ပယ်ဖျက်ရသည့် အကြောင်းပြချက် အသေးစိတ် ရေးပါ..."
                  className="w-full text-xs py-2 px-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 mt-1"
                />
              )}
            </div>
          </div>

          {/* 4. Manager / Admin PIN Authorization */}
          <div className="space-y-3 p-4 bg-amber-50/60 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-bold text-amber-950">
                  ၃။ မန်နေဂျာ/အုပ်ချုပ်သူ ခွင့်ပြုချက် PIN (Manager Override):
                </span>
              </div>
              {managerVerifier?.verified && (
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" /> အတည်ပြုပြီး: {managerVerifier.name}
                </span>
              )}
            </div>

            <p className="text-[11px] text-amber-900/80 leading-relaxed">
              ဘောက်ချာ ပယ်ဖျက်ခြင်းကို စနစ်တကျ အတည်ပြုရန် Manager သို့မဟုတ် Admin PIN နံပါတ် ရိုက်ထည့်ပေးပါ
            </p>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  value={managerPin}
                  onFocus={() => setActivePinField('manager')}
                  onChange={(e) => handleManagerPinChange(e.target.value)}
                  placeholder="Manager / Admin PIN (၄ လုံး ရိုက်ပါ)"
                  className={`w-full text-center tracking-widest text-lg font-mono font-bold py-2 border rounded-xl focus:outline-none focus:ring-2 ${
                    managerVerifier?.verified
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400'
                      : managerPinError
                      ? 'border-rose-400 bg-rose-50/60 text-rose-900'
                      : 'border-stone-300 bg-white'
                  }`}
                />
                {managerVerifier?.verified && (
                  <div className="absolute right-3 top-2.5 flex items-center gap-1 text-emerald-600 font-bold text-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </div>

              {managerPinError && (
                <div className="p-2 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{managerPinError}</span>
                </div>
              )}
            </div>

            {/* Quick Touch Keypad */}
            <div className="pt-2 border-t border-amber-200/70">
              <div className="text-[11px] text-stone-500 mb-1 flex justify-between items-center">
                <span>ကိန်းဂဏန်း ခလုတ်ခုံ (Keypad):</span>
                <span className="text-amber-800 font-semibold">
                  ရိုက်ထည့်မည့်အကွက်: {activePinField === 'manager' ? 'မန်နေဂျာ PIN' : 'စာရေး Staff PIN'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 max-w-[260px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleKeypadDigit(n)}
                    className="py-1.5 bg-white hover:bg-amber-100 active:bg-amber-200 rounded-lg border border-stone-200 text-stone-900 font-bold text-sm font-mono cursor-pointer"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="py-1.5 bg-stone-100 hover:bg-rose-50 text-rose-600 rounded-lg border border-stone-200 font-bold text-xs cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadDigit('0')}
                  className="py-1.5 bg-white hover:bg-amber-100 active:bg-amber-200 rounded-lg border border-stone-200 text-stone-900 font-bold text-sm font-mono cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  className="py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg border border-stone-200 font-bold text-xs cursor-pointer"
                >
                  ⌫
                </button>
              </div>
            </div>
          </div>

          {/* 5. System Consequences Explanations */}
          <div className="bg-stone-100 p-3 rounded-xl border border-stone-200 text-[11px] text-stone-700 space-y-1.5">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>စနစ်မှ အလိုအလျောက် ပြုလုပ်ပေးမည့် အချက်များ:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-stone-600">
              <li>
                <strong>စတော့ခ် ပြန်သွင်းခြင်း:</strong> ရောင်းချထားသော ပစ္စည်းများ ({sale.items.length} ထည်) စတော့ခ် (In Stock) သို့ အလိုအလျောက် ပြန်ရောက်သွားပါမည်။
              </li>
              <li>
                <strong>ငွေစာရင်း ရှင်းထုတ်ခြင်း:</strong> ဘောက်ချာတန်ဖိုးနှင့် ဝယ်ယူသူ ကျန်ငွေရှိပါက အလိုအလျောက် နှုတ်ပယ်ပါမည်။
              </li>
              <li>
                <strong>အစီရင်ခံစာ:</strong> နေ့စဉ် အရောင်းဝင်ငွေနှင့် စာရင်းဇယားများမှ ပယ်ဖျက်ပြီး သီးသန့် Void Log တွင် မှတ်တမ်းတင်ပါမည်။
              </li>
            </ul>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              မလုပ်ဆောင်တော့ပါ (Cancel)
            </button>
            <button
              type="submit"
              disabled={!managerVerifier?.verified}
              className={`flex-1 py-2.5 px-4 font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                managerVerifier?.verified
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                  : 'bg-stone-300 text-stone-500 cursor-not-allowed'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>အတည်ပြု ပယ်ဖျက်မည် (Confirm Void)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
