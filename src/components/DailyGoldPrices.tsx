import React, { useState, useMemo } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import {
  formatMMK,
  formatNumber,
  peToKyatRate,
  calculatePricePerPe,
  calculatePricePerYway,
  sortGoldPricesAscending,
  sortGoldPricesDescending,
} from '../services/calculationEngine';
import { getPurityTheme } from '../utils/purityTheme';
import { Coins, RefreshCw, Plus, Clock, TrendingUp, AlertCircle, Check, ArrowDownUp } from 'lucide-react';

export const DailyGoldPrices: React.FC = () => {
  const { goldPrices, updateGoldPrice, addGoldPrice, currentUser } = useGoldShop();

  const [priceSortOrder, setPriceSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editBuyPrice, setEditBuyPrice] = useState<number>(0);
  const [editSellPrice, setEditSellPrice] = useState<number>(0);

  // Sorted gold prices: default ascending 'asc' (ငယ်စဉ် ကြီးလိုက်)
  const sortedGoldPrices = useMemo(() => {
    return priceSortOrder === 'asc'
      ? sortGoldPricesAscending(goldPrices)
      : sortGoldPricesDescending(goldPrices);
  }, [goldPrices, priceSortOrder]);

  // Add new purity state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPurityCode, setNewPurityCode] = useState('12_PE');
  const [newPurityLabel, setNewPurityLabel] = useState('၁၂ ပဲရည်');
  const [newBuyPrice, setNewBuyPrice] = useState<number>(5500000);
  const [newSellPrice, setNewSellPrice] = useState<number>(5700000);

  const startEdit = (id: string, buy: number, sell: number) => {
    setEditingPriceId(id);
    setEditBuyPrice(buy);
    setEditSellPrice(sell);
  };

  const saveEdit = (id: string) => {
    if (editBuyPrice <= 0 || editSellPrice <= 0) {
      alert('ဈေးနှုန်းမှန်ကန်စွာ ထည့်သွင်းပါ');
      return;
    }
    updateGoldPrice(id, editBuyPrice, editSellPrice);
    setEditingPriceId(null);
  };

  const handleAddPurity = (e: React.FormEvent) => {
    e.preventDefault();
    addGoldPrice(newPurityCode, newPurityLabel, newBuyPrice, newSellPrice);
    setShowAddModal(false);
  };

  // Helper calculation based on 16 Pe (Base 100% pure gold)
  const base16Sell = goldPrices.find((p) => p.purity === '16_PE')?.sellPrice || 7500000;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
              နေ့စဉ်ရွှေဈေး စီမံခန့်ခွဲမှု (Daily Gold Rates)
            </h2>
            <p className="text-xs text-stone-500">
              ၁ ကျပ်သား လျှင် ဝယ်ဈေး/ရောင်းဈေး နှုန်းထားများနှင့် အချိန်မှတ်တမ်း
            </p>
          </div>
        </div>

        {currentUser.role === 'Admin' && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-xs shadow transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>ပဲရည်အသစ် သတ်မှတ်မည်</span>
          </button>
        )}
      </div>

      {/* Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">ရွှေဈေးနှုန်း သတိပြုရန်</p>
          <p className="text-stone-600 mt-0.5">
            ရွှေဈေးသည် နေ့စဉ် (သို့မဟုတ်) နံနက်/နေ့လယ်/ညနေ အလိုက် ပြောင်းလဲတတ်ပါသည်။
            ဈေးနှုန်းပြင်ဆင်လိုက်ပါက POS အရောင်းနှင့် ဝယ်ယူမှုများတွင် ယခုပြင်ဆင်သော ဈေးနှုန်းအသစ်ဖြင့်
            အလိုအလျောက် တွက်ချက်ပေးမည် ဖြစ်ပါသည်။
          </p>
        </div>
      </div>

      {/* Main Prices Section with Dark Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>နေ့စဉ် ရွှေအရည်အသွေးအလိုက် ပေါက်ဈေးနှုန်းများ (Daily Gold Rates by Purity)</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Toggle Button - Default Ascending (ငယ်စဉ် ကြီးလိုက်) */}
            <button
              type="button"
              onClick={() => setPriceSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg text-xs font-bold border border-stone-700 transition-colors cursor-pointer"
              title="ရွှေဈေးနှုန်း ဖော်ပြမှု အစီအစဉ် ပြောင်းလဲရန်"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {priceSortOrder === 'asc' ? 'ငယ်စဉ် ကြီးလိုက် ↑' : 'ကြီးစဉ် ငယ်လိုက် ↓'}
              </span>
            </button>

            <span className="text-xs text-amber-300 font-bold bg-stone-800 px-2.5 py-1 rounded-lg border border-stone-700 font-mono">
              ၁၆ ပဲရည် အခြေခံ: {formatMMK(base16Sell)}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedGoldPrices.map((gp, idx) => {
              const isEditing = editingPriceId === gp.id;
              const pricePerPe = calculatePricePerPe(gp.sellPrice);
              const pricePerYway = calculatePricePerYway(gp.sellPrice);
              const theme = getPurityTheme(gp.purity, idx);

              return (
                <div
                  key={gp.id}
                  className="rounded-2xl shadow-xs border border-stone-200 hover:border-stone-400 transition-all overflow-hidden bg-white group flex flex-col"
                >
                  {/* Dark Header for each Purity Card */}
                  <div className="bg-stone-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm sm:text-base">
                        {gp.purityLabel}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${theme.badge}`}>
                        {gp.purity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-stone-300">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{gp.updatedAt}</span>
                      </div>
                      {currentUser.role === 'Admin' && !isEditing && (
                        <button
                          type="button"
                          onClick={() => startEdit(gp.id, gp.buyPrice, gp.sellPrice)}
                          className="text-xs text-amber-400 hover:text-amber-300 font-bold bg-stone-800 hover:bg-stone-700 px-2.5 py-1 rounded-md border border-stone-700 cursor-pointer transition"
                        >
                          ပြင်မည်
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body of Purity Card */}
                  <div className={`${theme.cardBg} p-4 flex-1 space-y-3`}>
                    {isEditing ? (
                      /* Edit Form Inline */
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            ရောင်းဈေး (Sell Price per Kyat)
                          </label>
                          <input
                            type="number"
                            step="10000"
                            value={editSellPrice}
                            onChange={(e) => setEditSellPrice(Number(e.target.value) || 0)}
                            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">
                            ဝယ်ဈေး (Buy Price per Kyat)
                          </label>
                          <input
                            type="number"
                            step="10000"
                            value={editBuyPrice}
                            onChange={(e) => setEditBuyPrice(Number(e.target.value) || 0)}
                            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingPriceId(null)}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            မလုပ်တော့ပါ
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEdit(gp.id)}
                            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs shadow cursor-pointer"
                          >
                            အတည်ပြုမည်
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Static Price Display */
                      <div className="space-y-2.5">
                        <div className={`${theme.sellPriceBox} rounded-xl p-3.5 border flex items-center justify-between shadow-2xs`}>
                          <div>
                            <span className="text-xs text-stone-600 block font-semibold">ဆိုင်ရောင်းဈေး (Selling Rate):</span>
                            <span className={`text-xl sm:text-2xl font-black ${theme.sellPriceText}`}>
                              {formatMMK(gp.sellPrice)}
                            </span>
                          </div>
                          <div className="text-right text-[11px] text-stone-600 font-mono space-y-0.5">
                            <div>1 ပဲလျှင် ~ {formatNumber(pricePerPe)}</div>
                            <div>1 ရွေးလျှင် ~ {formatNumber(pricePerYway)}</div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-stone-200 flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-xs text-stone-500 block">ပြန်ဝယ်ဈေး (Buyback Rate):</span>
                            <span className="text-lg sm:text-xl font-bold text-stone-800">
                              {formatMMK(gp.buyPrice)}
                            </span>
                          </div>
                          <div className="text-right text-xs font-semibold text-emerald-700">
                            Margin: {formatNumber(gp.sellPrice - gp.buyPrice)} MMK
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Rates Comparison Table with Dark Thead */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>ရွှေဈေးနှုန်း နှိုင်းယှဉ်တွက်ချက်မှု ဇယား (Quick Rates Comparison Table)</span>
          </span>
          <span className="text-xs text-stone-300">
            ၁ ကျပ်သား = ၁၆ ပဲ = ၁၂၈ ရွေး
          </span>
        </div>

        <div className="overflow-x-auto pb-1 custom-scrollbar-x">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-stone-950 text-stone-200 font-bold border-b border-stone-800">
              <tr>
                <th className="py-3 px-4 text-white">ရွှေအရည်အသွေး (Purity)</th>
                <th className="py-3 px-4 text-right text-amber-400">၁ ကျပ်သား ရောင်းဈေး</th>
                <th className="py-3 px-4 text-right text-stone-300">၁ ကျပ်သား ပြန်ဝယ်ဈေး</th>
                <th className="py-3 px-4 text-right text-stone-300">၁ ပဲ ရောင်းဈေး</th>
                <th className="py-3 px-4 text-right text-stone-300">၁ ရွေး ရောင်းဈေး</th>
                <th className="py-3 px-4 text-right text-emerald-400">အမြတ်ကွာဟချက် (Margin)</th>
                <th className="py-3 px-4 text-center text-stone-400">ပြင်ဆင်ချိန်</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70">
              {sortedGoldPrices.map((gp, idx) => {
                const pePrice = calculatePricePerPe(gp.sellPrice);
                const ywayPrice = calculatePricePerYway(gp.sellPrice);
                const margin = gp.sellPrice - gp.buyPrice;
                return (
                  <tr
                    key={gp.id}
                    className={`transition-colors ${
                      idx % 2 === 0 ? 'bg-white hover:bg-amber-50/60' : 'bg-stone-50/70 hover:bg-amber-50/60'
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-stone-900 flex items-center gap-2">
                      <span>{gp.purityLabel}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono">
                        {gp.purity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-amber-900 font-mono">
                      {formatMMK(gp.sellPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-stone-800 font-mono">
                      {formatMMK(gp.buyPrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-600 font-mono">
                      {formatNumber(pePrice)}
                    </td>
                    <td className="py-3 px-4 text-right text-stone-600 font-mono">
                      {formatNumber(ywayPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700 font-mono">
                      +{formatNumber(margin)}
                    </td>
                    <td className="py-3 px-4 text-center text-[11px] text-stone-500">
                      {gp.updatedAt}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CUSTOM PURITY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-auto overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
            <div className="shrink-0 bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-stone-800">
              <h3 className="font-bold text-sm text-amber-300">ပဲရည်အသစ် သတ်မှတ်ခြင်း</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
                title="ပိတ်မည်"
              >
                ✕
              </button>
            </div>

            <form id="add-purity-form" onSubmit={handleAddPurity} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs sm:text-sm custom-scrollbar-y">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Purity Code</label>
                <input
                  type="text"
                  value={newPurityCode}
                  onChange={(e) => setNewPurityCode(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">အမည် (Label)</label>
                <input
                  type="text"
                  value={newPurityLabel}
                  onChange={(e) => setNewPurityLabel(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">ရောင်းဈေး (Sell Price)</label>
                <input
                  type="number"
                  value={newSellPrice}
                  onChange={(e) => setNewSellPrice(Number(e.target.value) || 0)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">ဝယ်ဈေး (Buy Price)</label>
                <input
                  type="number"
                  value={newBuyPrice}
                  onChange={(e) => setNewBuyPrice(Number(e.target.value) || 0)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-bold"
                />
              </div>
            </form>

            <div className="shrink-0 bg-stone-50 px-5 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg font-medium cursor-pointer transition-colors"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="submit"
                form="add-purity-form"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg cursor-pointer transition-colors"
              >
                ထည့်သွင်းမည်
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
