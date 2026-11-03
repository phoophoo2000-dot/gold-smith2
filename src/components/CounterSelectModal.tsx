import React from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { CounterTerminal } from '../types/gold';
import {
  Store,
  CheckCircle2,
  X,
  Laptop,
  Layers,
  Sparkles,
  ShieldCheck,
  Receipt,
  Info,
} from 'lucide-react';

interface CounterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CounterSelectModal: React.FC<CounterSelectModalProps> = ({ isOpen, onClose }) => {
  const { currentCounter, setCurrentCounter, counters, currentUser } = useGoldShop();

  if (!isOpen) return null;

  const handleSelect = (counter: CounterTerminal) => {
    setCurrentCounter(counter);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full my-6 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>ငွေရှင်းကောင်တာ ရွေးချယ်ခြင်း</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  {currentCounter.id}
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                ဤစက်တွင် အသုံးပြုမည့် Terminal / Counter ကို သတ်မှတ်ပါ
              </p>
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Active Device Info Notice */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <Laptop className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">ဤစက်တွင် လတ်တလော သတ်မှတ်ထားသော ကောင်တာ:</span>{' '}
              <span className="inline-block font-mono font-extrabold text-amber-950 bg-amber-200/70 px-1.5 py-0.5 rounded ml-1">
                {currentCounter.name} ({currentCounter.id})
              </span>
              <div className="text-[11px] text-amber-800 mt-1">
                လက်ရှိ စာရေး: <strong className="underline">{currentUser.name}</strong> • ကောင်တာရွေးချယ်မှုကို ဤစက် (Browser) ထဲတွင် အမြဲ အလိုအလျောက် မှတ်သားထားမည်ဖြစ်ပါသည်။
              </div>
            </div>
          </div>

          {/* Counters Grid */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              ကောင်တာ စာရင်းများ (Available Counters):
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {counters.map((c) => {
                const isSelected = currentCounter.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 shadow-xs'
                        : 'border-stone-200 bg-white hover:border-amber-400 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950 shadow-xs'
                              : 'bg-stone-100 text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-900'
                          }`}
                        >
                          {c.id}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-stone-900 leading-snug">
                            {c.name}
                          </div>
                          <div className="text-[10px] text-stone-500 font-mono">
                            {c.nameEn}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>လက်ရှိ</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-stone-400 group-hover:text-amber-600 shrink-0">
                          ရွေးမည် →
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-stone-600 bg-stone-50/80 p-2 rounded-lg border border-stone-100">
                      {c.description || `${c.name} အတွက် သီးသန့်စနစ်`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Educational benefit */}
          <div className="p-3 bg-stone-100/80 rounded-xl border border-stone-200 text-[11px] text-stone-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>ကောင်တာခွဲခြားခြင်း၏ အကျိုးကျေးဇူး:</strong> ကောင်တာ ၃ ခု တပြိုင်နက် ဘောက်ချာဖွင့်ရာတွင် အင်တာနက် လိုင်းမရှိသည့်တိုင် ပြေစာအမှတ်များ (ဥပမာ -{' '}
              <span className="font-mono font-semibold text-amber-800">GSP-C1-...</span>,{' '}
              <span className="font-mono font-semibold text-amber-800">GSP-C2-...</span>,{' '}
              <span className="font-mono font-semibold text-amber-800">GSP-C3-...</span>)
              လုံးဝမထပ်စေဘဲ ကောင်တာအလိုက် ဆိုင်းသိမ်းစလစ် သီးခြား ထုတ်ယူနိုင်ပါသည်။
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-5 py-3.5 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            ပြီးပါပြီ (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
