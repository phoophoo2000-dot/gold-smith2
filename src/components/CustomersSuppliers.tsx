import React, { useState } from 'react';
import { useGoldShop } from '../context/GoldShopContext';
import { Customer, Supplier, PaymentMethod } from '../types/gold';
import { formatMMK, formatNumber } from '../services/calculationEngine';
import {
  Users,
  Building2,
  Plus,
  Search,
  Wallet,
  Phone,
  MapPin,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { DebtSettlementModal } from './DebtSettlementModal';

export const CustomersSuppliers: React.FC = () => {
  const {
    customers,
    addCustomer,
    settleCustomerBalance,
    suppliers,
    addSupplier,
    sales,
  } = useGoldShop();

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Settle Balance modal
  const [settlingCustomer, setSettlingCustomer] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('Cash');

  // Add Customer modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Add Supplier modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');

  const handleOpenSettle = (customer: Customer) => {
    setSettlingCustomer(customer);
    setSettleAmount(customer.outstandingBalance);
  };

  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingCustomer || settleAmount <= 0) return;

    settleCustomerBalance(settlingCustomer.id, settleAmount, settleMethod);
    setSettlingCustomer(null);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    addCustomer({
      name: custName,
      phone: custPhone,
      address: custAddress,
      notes: custNotes,
    });

    setCustName('');
    setCustPhone('');
    setCustAddress('');
    setCustNotes('');
    setShowAddCustomerModal(false);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    addSupplier({
      name: supName,
      phone: supPhone,
      address: supAddress,
    });

    setSupName('');
    setSupPhone('');
    setSupAddress('');
    setShowAddSupplierModal(false);
  };

  const validCustomers = customers.filter(
    (c) => !c.id.startsWith('__sys_') && !c.id.startsWith('__system_')
  );

  const filteredCustomers = validCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCustomerDebt = validCustomers.reduce((acc, c) => acc + (c.outstandingBalance || 0), 0);
  const totalSupplierPayable = suppliers.reduce((acc, s) => acc + (s.outstandingBalance || 0), 0);
  const totalPurchasedSum = validCustomers.reduce((acc, c) => acc + (c.totalPurchased || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">
              ဖောက်သည်နှင့် ကုန်သည် စီမံခန့်ခွဲမှု
            </h2>
            <p className="text-xs text-stone-500">
              Customers, Suppliers & Outstanding Balances (ကျန်ငွေမှတ်တမ်း)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (activeTab === 'customers' ? setShowAddCustomerModal(true) : setShowAddSupplierModal(true))}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeTab === 'customers' ? 'ဖောက်သည်အသစ် ထည့်မည်' : 'Supplier အသစ် ထည့်မည်'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Overview with Dark Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800">
          <span className="font-bold text-white text-sm flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-400" />
            <span>ဖောက်သည်များနှင့် ကုန်သည်များ အကျဉ်းချုပ် (Directory & Balance Summary)</span>
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-300">ဖောက်သည် စုစုပေါင်း:</span>
            <span className="font-bold text-amber-300 bg-stone-800 px-2.5 py-0.5 rounded border border-stone-700 font-mono">
              {customers.length} ဦး
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50/40">
          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              ဖောက်သည်များထံမှ ကောက်ခံရန်ကျန်ငွေ (Receivables)
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
              {formatMMK(totalCustomerDebt)}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              အကြွေးကျန်ရှိသူ: {customers.filter((c) => c.outstandingBalance > 0).length} ဦး
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              ကုန်သည် / ပန်းထိမ်ဆိုင် ပေးရန်ကျန်ငွေ (Payables)
            </span>
            <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono">
              {formatMMK(totalSupplierPayable)}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              Supplier စုစုပေါင်း: {suppliers.length} ယောက်
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-xs border border-stone-200">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              ဖောက်သည်များ စုစုပေါင်းဝယ်ယူထားငွေ (Lifetime Sales)
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
              {formatMMK(totalPurchasedSum)}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              အရောင်းမှတ်တမ်းများ အားလုံးပေါင်း
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar with Dark Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            {activeTab === 'customers' ? (
              <Users className="w-4 h-4 text-amber-400" />
            ) : (
              <Building2 className="w-4 h-4 text-blue-400" />
            )}
            <span className="font-bold text-white text-sm">
              {activeTab === 'customers'
                ? `ဖောက်သည်များ စာရင်း (${customers.length} ဦး)`
                : `ကုန်သည် / ပန်းထိမ်ဆိုင်များ စာရင်း (${suppliers.length} ခု)`}
            </span>
          </div>

          {/* Tab Switch Buttons */}
          <div className="flex items-center bg-stone-800 p-0.5 rounded-lg border border-stone-700 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ဖောက်သည်များ</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>ကုန်သည်/ပန်းထိမ်</span>
            </button>
          </div>
        </div>

        {/* Search within current directory */}
        <div className="p-3 sm:p-4 bg-stone-50/50 border-b border-stone-200">
          <div className="relative max-w-md">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={activeTab === 'customers' ? 'ဖောက်သည်အမည် သို့မဟုတ် ဖုန်းနံပါတ် ရှာရန်...' : 'ကုန်သည်အမည် သို့မဟုတ် ဖုန်းနံပါတ် ရှာရန်...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Main Content Area */}
        {activeTab === 'customers' ? (
          <div className="overflow-x-auto pb-1 custom-scrollbar-x">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-stone-950 text-stone-200 font-bold border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4 text-white">ဖောက်သည်အမည် (Customer Name)</th>
                  <th className="py-3 px-4 text-stone-300">ဖုန်းနံပါတ်</th>
                  <th className="py-3 px-4 text-stone-300">လိပ်စာ / မှတ်ချက်</th>
                  <th className="py-3 px-4 text-right text-stone-300">ဝယ်ယူဖူးသောပမာဏ</th>
                  <th className="py-3 px-4 text-right text-stone-300">ရောင်းချပေးထားငွေ</th>
                  <th className="py-3 px-4 text-right text-rose-400">ကျန်ငွေ (Credit Balance)</th>
                  <th className="py-3 px-4 text-center text-stone-300">လုပ်ဆောင်ချက်</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      ရှာဖွေမှုနှင့် ကိုက်ညီသော ဖောက်သည်မရှိပါ
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust, idx) => (
                    <tr
                      key={cust.id}
                      className={`transition-colors ${
                        idx % 2 === 0
                          ? 'bg-white hover:bg-amber-50/70'
                          : 'bg-stone-50/80 hover:bg-amber-100/60'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-stone-900">{cust.name}</td>
                      <td className="py-3 px-4 text-stone-600 font-mono">{cust.phone || '-'}</td>
                      <td className="py-3 px-4 text-stone-500 max-w-xs truncate">
                        {cust.address || cust.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-stone-900 font-mono">
                        {formatMMK(cust.totalPurchased)}
                      </td>
                      <td className="py-3 px-4 text-right text-stone-600 font-mono">
                        {formatMMK(cust.totalSoldBack)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {cust.outstandingBalance > 0 ? (
                          <span className="font-bold text-rose-600">
                            {formatMMK(cust.outstandingBalance)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">ကျန်ငွေမရှိ</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cust.outstandingBalance > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenSettle(cust)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-[11px] shadow-xs cursor-pointer"
                          >
                            ကျန်ငွေရှင်းမည်
                          </button>
                        ) : (
                          <span className="text-stone-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto pb-1 custom-scrollbar-x">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-stone-950 text-stone-200 font-bold border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4 text-white">ကုန်သည် / ပန်းထိမ် အမည်</th>
                  <th className="py-3 px-4 text-stone-300">ဖုန်းနံပါတ်</th>
                  <th className="py-3 px-4 text-stone-300">လိပ်စာ</th>
                  <th className="py-3 px-4 text-right text-amber-400">စုစုပေါင်းသွင်းငွေ (Total Supplied)</th>
                  <th className="py-3 px-4 text-right text-stone-200">ဆိုင်မှ ပေးရန်ကျန်ငွေ (Payable)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/60">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      ရှာဖွေမှုနှင့် ကိုက်ညီသော ကုန်သည်/ပန်းထိမ် မရှိပါ
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((sup, idx) => (
                    <tr
                      key={sup.id}
                      className={`transition-colors ${
                        idx % 2 === 0
                          ? 'bg-white hover:bg-amber-50/70'
                          : 'bg-stone-50/80 hover:bg-amber-100/60'
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-stone-900">{sup.name}</td>
                      <td className="py-3 px-4 text-stone-600 font-mono">{sup.phone}</td>
                      <td className="py-3 px-4 text-stone-500">{sup.address}</td>
                      <td className="py-3 px-4 text-right font-medium text-stone-900 font-mono">
                        {formatMMK(sup.totalSupplied)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-stone-800 font-mono">
                        {sup.outstandingBalance > 0 ? formatMMK(sup.outstandingBalance) : '0 MMK'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: SETTLE CUSTOMER BALANCE */}
      {settlingCustomer && (
        <DebtSettlementModal
          customer={settlingCustomer}
          onClose={() => setSettlingCustomer(null)}
        />
      )}

      {/* MODAL: ADD CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-auto overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
            <div className="shrink-0 bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-stone-800">
              <h3 className="font-bold text-sm text-amber-300">ဖောက်သည် အသစ်ထည့်သွင်းခြင်း</h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
                title="ပိတ်မည်"
              >
                ✕
              </button>
            </div>

            <form id="add-customer-form" onSubmit={handleSaveCustomer} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs sm:text-sm custom-scrollbar-y">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">အမည် (Name)</label>
                <input
                  type="text"
                  required
                  placeholder="ဒေါ် / ဦး..."
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">ဖုန်းနံပါတ် (Phone)</label>
                <input
                  type="text"
                  placeholder="09-..."
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">နေရပ်လိပ်စာ (Address)</label>
                <input
                  type="text"
                  placeholder="မြို့နယ် / မြို့..."
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">မှတ်ချက် (Notes)</label>
                <input
                  type="text"
                  placeholder="VIP ဖောက်သည် စသဖြင့်"
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm focus:outline-none"
                />
              </div>
            </form>

            <div className="shrink-0 bg-stone-50 px-5 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="px-3.5 py-2 bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-lg font-medium cursor-pointer transition-colors"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="submit"
                form="add-customer-form"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg cursor-pointer transition-colors"
              >
                သိမ်းဆည်းမည်
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-auto overflow-hidden border border-stone-200 flex flex-col max-h-[92vh]">
            <div className="shrink-0 bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-stone-800">
              <h3 className="font-bold text-sm sm:text-base text-amber-300 leading-normal">ကုန်သည် / ပန်းထိမ်ဆိုင် အသစ်ထည့်သွင်းခြင်း</h3>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 cursor-pointer transition-colors"
                title="ပိတ်မည်"
              >
                ✕
              </button>
            </div>

            <form id="add-supplier-form" onSubmit={handleSaveSupplier} className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs sm:text-sm custom-scrollbar-y">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Supplier / လုပ်ငန်းအမည်</label>
                <input
                  type="text"
                  required
                  placeholder="ရွှေတိုက် / အလုပ်ရုံအမည်"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">ဖုန်းနံပါတ်</label>
                <input
                  type="text"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">လိပ်စာ</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg px-3 py-2.5 text-xs sm:text-sm"
                />
              </div>
            </form>

            <div className="shrink-0 bg-stone-50 px-5 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="px-3.5 py-2 bg-white border border-stone-300 hover:bg-stone-200 text-stone-700 rounded-lg font-medium cursor-pointer transition-colors"
              >
                မလုပ်တော့ပါ
              </button>
              <button
                type="submit"
                form="add-supplier-form"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg cursor-pointer transition-colors"
              >
                သိမ်းဆည်းမည်
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
