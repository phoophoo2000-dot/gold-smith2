import React, { useState } from 'react';
import { ShieldCheck, KeyRound, X, AlertCircle } from 'lucide-react';
import { useGoldShop } from '../context/GoldShopContext';
import { UserRole } from '../types/gold';

interface ManagerPinModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  requiredRole?: 'Admin' | 'Manager'; // defaults to Admin or Manager
  onSuccess: (verifier: { name: string; role: UserRole }) => void;
  onCancel: () => void;
}

export const ManagerPinModal: React.FC<ManagerPinModalProps> = ({
  isOpen,
  title = 'မန်နေဂျာ/အုပ်ချုပ်သူ ခွင့်ပြုချက် လိုအပ်ပါသည် (Authorization Required)',
  description = 'ဤလုပ်ဆောင်ချက်ကို ခွင့်ပြုရန် Manager သို့မဟုတ် Admin PIN နံပါတ် (၄ လုံး) ရိုက်ထည့်ပါ',
  requiredRole,
  onSuccess,
  onCancel,
}) => {
  const { verifyManagerPin } = useGoldShop();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    if (pin.length < 6) {
      const next = pin + digit;
      setPin(next);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('PIN နံပါတ် ရိုက်ထည့်ပေးပါ');
      return;
    }

    const res = verifyManagerPin(pin);
    if (!res.verified) {
      setError('PIN နံပါတ် မှားယွင်းနေပါသည်။ Manager သို့မဟုတ် Admin PIN ဖြင့် စစ်ဆေးပါ');
      setPin('');
      return;
    }

    if (requiredRole === 'Admin' && res.role !== 'Admin') {
      setError('ဤလုပ်ဆောင်ချက်အတွက် Admin သာလျှင် ခွင့်ပြုခွင့်ရှိပါသည်');
      setPin('');
      return;
    }

    onSuccess({
      name: res.managerName || 'Manager',
      role: res.role || 'Manager',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Manager Override</h3>
              <p className="text-[11px] text-stone-400">ကြီးကြပ်သူ အတည်ပြုချက်</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-stone-800">{title}</p>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">{description}</p>
          </div>

          {/* PIN Input Display */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-3 bg-stone-50 border border-stone-200 rounded-xl">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      isFilled
                        ? 'bg-amber-600 border-amber-600 scale-110'
                        : 'bg-white border-stone-300'
                    }`}
                  />
                );
              })}
            </div>

            <input
              type="password"
              autoFocus
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
              }}
              placeholder="PIN နံပါတ် ရိုက်ပါ"
              className="w-full text-center tracking-widest text-lg font-mono font-bold py-2 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
            />

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Quick Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigitClick(num)}
                  className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-amber-100 text-stone-900 font-bold text-base transition-colors cursor-pointer border border-stone-200/80"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors cursor-pointer border border-stone-200/80"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleDigitClick('0')}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-amber-100 text-stone-900 font-bold text-base transition-colors cursor-pointer border border-stone-200/80"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer border border-stone-200/80"
              >
                ⌫
              </button>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                မလုပ်ဆောင်တော့ပါ
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>အတည်ပြုမည်</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
