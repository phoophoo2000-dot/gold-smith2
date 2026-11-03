import React, { useState, useMemo } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { formatNumber, sortGoldPricesAscending } from '../services/calculationEngine';
import { getPurityTheme } from '../utils/purityTheme';
import { Coins, X, Check } from 'lucide-react';

interface QuickPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickPriceModal: React.FC<QuickPriceModalProps> = ({ isOpen, onClose }) => {
  const { goldPrices, updateGoldPrice } = useGoldShop();

  const [pricesState, setPricesState] = useState<{
    [id: string]: { buy: number; sell: number };
  }>(() => {
    const init: { [id: string]: { buy: number; sell: number } } = {};
    goldPrices.forEach((gp) => {
      init[gp.id] = { buy: gp.buyPrice, sell: gp.sellPrice };
    });
    return init;
  });

  const sortedGoldPrices = useMemo(() => sortGoldPricesAscending(goldPrices), [goldPrices]);

  if (!isOpen) return null;

  const handleChange = (id: string, field: 'buy' | 'sell', val: number) => {
    setPricesState((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: val,
      },
    }));
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    (Object.entries(pricesState) as [string, { buy: number; sell: number }][]).forEach(([id, vals]) => {
      if (vals.buy > 0 && vals.sell > 0) {
        updateGoldPrice(id, vals.buy, vals.sell);
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
        <div className="shrink-0 bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>ယနေ့ရွှေဈေး အမြန်ပြင်ဆင်ခြင်း (Update Gold Rates)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form id="quick-price-form" onSubmit={handleSaveAll} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs custom-scrollbar-y">
          <p className="text-stone-600 leading-relaxed">
            ၁ ကျပ်သား လျှင် ပေါက်ဈေးများကို ပြင်ဆင်ပြီးပါက "သိမ်းဆည်းမည်" နှိပ်ပါ။
          </p>

          <div className="space-y-3 pr-1">
            {sortedGoldPrices.map((gp, idx) => {
              const currentVals = pricesState[gp.id] || { buy: gp.buyPrice, sell: gp.sellPrice };
              const theme = getPurityTheme(gp.purity, idx);
              return (
                <div
                  key={gp.id}
                  className={`p-3.5 ${theme.cardBg} rounded-xl border ${theme.cardBorder} space-y-2 relative overflow-hidden shadow-2xs`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 ${theme.accentBar}`} />
                  <div className="font-bold text-stone-900 flex justify-between items-center pt-0.5">
                    <span className="font-extrabold text-sm">{gp.purityLabel}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${theme.badge}`}>
                      {gp.purity}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-stone-600 font-medium mb-1">ရောင်းဈေး (Sell Rate)</label>
                      <input
                        type="number"
                        step="10000"
                        value={currentVals.sell}
                        onChange={(e) =>
                          handleChange(gp.id, 'sell', Number(e.target.value) || 0)
                        }
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-2 font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-600 font-medium mb-1">ဝယ်ဈေး (Buy Rate)</label>
                      <input
                        type="number"
                        step="10000"
                        value={currentVals.buy}
                        onChange={(e) =>
                          handleChange(gp.id, 'buy', Number(e.target.value) || 0)
                        }
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-2 font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </form>

        <div className="shrink-0 bg-stone-50 px-5 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg font-medium cursor-pointer transition-colors"
          >
            မလုပ်တော့ပါ
          </button>
          <button
            type="submit"
            form="quick-price-form"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>ဈေးနှုန်းအားလုံး သိမ်းဆည်းမည်</span>
          </button>
        </div>
      </div>
    </div>
  );
};
