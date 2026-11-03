import React, { useState } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { Expense } from '../types/gold';
import { formatMMK, formatNumber } from '../services/calculationEngine';
import {
  ReceiptText,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  TrendingDown,
  PieChart,
} from 'lucide-react';

export const Expenses: React.FC = () => {
  const { expenses, addExpense, deleteExpense, currentUser } = useGoldShop();

  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState<Expense['category']>('Electricity');
  const [amount, setAmount] = useState<number>(50000);
  const [note, setNote] = useState('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    addExpense({
      date,
      category,
      amount,
      note,
      recordedBy: currentUser.name,
    });

    setAmount(50000);
    setNote('');
    setShowAddModal(false);
  };

  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
              ဆိုင်တွင်း အသုံးစရိတ် စီမံခန့်ခွဲမှု (Shop Expenses)
            </h2>
            <p className="text-xs text-stone-500">
              မီးခ၊ လခ၊ ဆိုင်ပြင်စရိတ်၊ သယ်ယူပို့ဆောင်ရေးနှင့် အထွေထွေ အသုံးစရိတ်များ
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>အသုံးစရိတ် အသစ်ထည့်မည်</span>
        </button>
      </div>

      {/* Expense summary KPI cards with Dark Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-400" />
            <span>အသုံးစရိတ် ကုန်ကျမှု အကျဉ်းချုပ် (Expenses KPI Overview)</span>
          </span>
          <span className="text-xs text-stone-300">
            စုစုပေါင်း မှတ်တမ်း: <span className="font-bold text-amber-300 font-mono">{expenses.length}</span> ကြိမ်
          </span>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50/40">
          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              စုစုပေါင်း အသုံးစရိတ် (Total Expenses)
            </span>
            <div className="text-2xl font-black text-rose-600 font-mono">{formatMMK(totalExpense)}</div>
            <div className="text-xs text-stone-400 mt-1">စာရင်းသွင်းထားသော အကြိမ်: {expenses.length} ကြိမ်</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              ယနေ့ ကုန်ကျစရိတ် (Today's Expense)
            </span>
            <div className="text-2xl font-black text-stone-900 font-mono">
              {formatMMK(
                expenses
                  .filter((e) => e.date === new Date().toISOString().split('T')[0])
                  .reduce((sum, e) => sum + e.amount, 0)
              )}
            </div>
            <div className="text-xs text-stone-400 mt-1">ယနေ့ရက်စွဲဖြင့် အသုံးစရိတ် စုစုပေါင်း</div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              အသုံးအများဆုံး ကဏ္ဍ (Top Spending Category)
            </span>
            <div className="text-lg font-black text-amber-950">
              {(() => {
                const catTotals: Record<string, number> = {};
                expenses.forEach((e) => {
                  catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
                });
                const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
                return top ? `${top[0]} (${formatMMK(top[1])})` : 'မရှိသေးပါ';
              })()}
            </div>
            <div className="text-xs text-stone-400 mt-1">ကုန်ကျငွေ အများဆုံး အသုံးစရိတ်</div>
          </div>
        </div>
      </div>

      {/* Expenses Table with Dark Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-amber-400" />
            <span>အသုံးစရိတ် စာရင်းဇယား (Detailed Expenses Log)</span>
          </span>
          <span className="text-xs text-stone-300">
            စာရင်း: {expenses.length} ခု
          </span>
        </div>

        <div className="overflow-x-auto pb-1 custom-scrollbar-x">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="bg-stone-950 text-stone-200 font-bold border-b border-stone-800">
              <tr>
                <th className="py-3 px-4 text-white">ရက်စွဲ (Date)</th>
                <th className="py-3 px-4 text-stone-300">အမျိုးအစား (Category)</th>
                <th className="py-3 px-4 text-stone-300">အကြောင်းအရာ / မှတ်ချက်</th>
                <th className="py-3 px-4 text-stone-300">မှတ်တမ်းတင်သူ</th>
                <th className="py-3 px-4 text-right text-rose-400">ပမာဏ (Amount MMK)</th>
                <th className="py-3 px-4 text-center text-stone-300">ဖျက်မည်</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-400">
                    မှတ်တမ်းတင်ထားသော အသုံးစရိတ် မရှိသေးပါ
                  </td>
                </tr>
              ) : (
                expenses.map((exp, idx) => (
                  <tr
                    key={exp.id}
                    className={`transition-colors ${
                      idx % 2 === 0
                        ? 'bg-white hover:bg-amber-50/70'
                        : 'bg-stone-50/80 hover:bg-amber-100/60'
                    }`}
                  >
                    <td className="py-3 px-4 text-stone-700 font-mono font-medium">{exp.date}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-stone-100 font-bold text-stone-800 border border-stone-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-700 font-medium">{exp.note || '-'}</td>
                    <td className="py-3 px-4 text-stone-500">{exp.recordedBy}</td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 text-sm font-mono">
                      -{formatMMK(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {(currentUser.role === 'Admin' || currentUser.role === 'Manager') && (
                        <button
                          type="button"
                          onClick={() => deleteExpense(exp.id)}
                          className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-stone-100 cursor-pointer transition"
                          title="ဖျက်မည်"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD EXPENSE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-auto overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
            <div className="shrink-0 bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-stone-800">
              <h3 className="font-bold text-sm sm:text-base text-amber-300 leading-normal">အသုံးစရိတ် အသစ်ထည့်သွင်းခြင်း</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
                title="ပိတ်မည်"
              >
                ✕
              </button>
            </div>

            <form id="add-expense-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs sm:text-sm custom-scrollbar-y">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">ရက်စွဲ (Date)</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">အမျိုးအစား (Category)</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Expense['category'])}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none"
                >
                  <option value="Electricity">မီးခ (Electricity)</option>
                  <option value="Salary">လခ (Staff Salary)</option>
                  <option value="Rent">ဆိုင်ငှားခ (Shop Rent)</option>
                  <option value="Repair">ပြင်ဆင်စရိတ် (Shop Repair)</option>
                  <option value="Transportation">သယ်ယူစရိတ် (Transportation)</option>
                  <option value="Other">အထွေထွေ (General Expenses)</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">ကုန်ကျငွေ (Amount MMK)</label>
                <input
                  type="number"
                  step="5000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">အကြောင်းအရာ (Note / Description)</label>
                <input
                  type="text"
                  placeholder="ဥပမာ- စက်တင်ဘာလ မီတာခပေးချေခြင်း"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm focus:outline-none"
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
                form="add-expense-form"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg cursor-pointer transition-colors"
              >
                မှတ်တမ်းတင်မည်
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
