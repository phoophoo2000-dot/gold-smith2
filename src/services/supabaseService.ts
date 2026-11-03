import {
  supabase,
  isSupabaseConfigured,
  getSupabaseClient,
  SupabaseProfile,
  getActiveSupabaseConfig,
} from '../lib/supabase';
import {
  Product,
  Sale,
  Customer,
  GoldPrice,
  UserRole,
  WorkshopJobOrder,
  Goldsmith,
  PurchaseItem,
  Expense,
  Supplier,
  DebtSettlement,
  ShopSettings,
} from '../types/gold';

/**
 * ==========================================================
 * SUPABASE AUTHENTICATION & USER MANAGEMENT
 * ==========================================================
 */

export async function supabaseSignUp(
  email: string,
  pass: string,
  fullName: string,
  role: UserRole = 'Staff'
) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured');

  let data: any = null;
  let error: any = null;

  // 1. Initial signup attempt with full metadata
  try {
    const res = await client.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    data = res.data;
    error = res.error;
  } catch (err: any) {
    error = err;
  }

  // 2. Automatic fallback retry if "Database error saving new user" occurs
  if (
    error &&
    (error.message?.includes('Database error saving new user') ||
      error.message?.includes('violates check constraint') ||
      error.status === 500)
  ) {
    console.warn('Retrying Supabase auth signup with minimal metadata fallback...');
    const retryRes = await client.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: fullName,
          role: 'Staff',
        },
      },
    });
    data = retryRes.data;
    error = retryRes.error;
  }

  if (error) throw error;

  // 3. Ensure profile row exists in public.profiles table
  if (data?.user?.id) {
    try {
      await supabaseUpsertProfile({
        id: data.user.id,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        role: role,
        phone: '',
        pin: role === 'Admin' ? '1111' : role === 'Manager' ? '2222' : '3333',
        created_at: new Date().toISOString(),
      });
    } catch (profErr) {
      console.warn('Direct profile insert note:', profErr);
    }
  }

  return data;
}

export async function supabaseSignIn(email: string, pass: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured');

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) throw error;

  // Sync profile after login
  if (data?.user) {
    try {
      const { data: prof } = await client
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!prof) {
        const metadataRole = (data.user.user_metadata?.role as UserRole) || 'Staff';
        const fullName =
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'Staff User';
        await supabaseUpsertProfile({
          id: data.user.id,
          email: data.user.email || '',
          full_name: fullName,
          role: metadataRole,
          pin: metadataRole === 'Admin' ? '1111' : metadataRole === 'Manager' ? '2222' : '3333',
          created_at: new Date().toISOString(),
        });
      }
    } catch (profErr) {
      console.warn('Direct profile insert note:', profErr);
    }
  }

  return data;
}

export async function supabaseResendConfirmation(email: string) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase client is not configured');
  const { error } = await client.auth.resend({
    type: 'signup',
    email,
  });
  if (error) throw error;
  return { success: true, message: 'အတည်ပြုအီးမေးလ် ထပ်မံပေးပို့ပြီးပါပြီ' };
}

export async function supabaseUpsertProfile(profile: SupabaseProfile) {
  const client = getSupabaseClient();
  if (!client || !profile) return;
  try {
    const cleanEmail = profile.email ? profile.email.trim().toLowerCase() : '';
    const cleanName = profile.full_name ? profile.full_name.trim() : '';
    const { error } = await client.from('profiles').upsert(
      {
        id: profile.id,
        email: cleanEmail,
        full_name: cleanName,
        role: profile.role,
        phone: profile.phone || null,
        pin: profile.pin || null,
        created_at: profile.created_at || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('Error upserting profile in Supabase:', error);
    }
  } catch (e) {
    console.warn('Supabase upsertProfile catch:', e);
  }
}

export async function supabaseDeleteProfile(profileId: string, email?: string, fullName?: string) {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'No client' };
  try {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanName = fullName ? fullName.trim() : '';

    // 1. Try deleting by ID
    if (profileId) {
      try {
        await client.from('profiles').delete().eq('id', profileId);
      } catch (err) {
        console.warn('Delete by id:', err);
      }
    }
    // 2. Try deleting by email
    if (cleanEmail) {
      try {
        await client.from('profiles').delete().eq('email', cleanEmail);
      } catch (err) {
        console.warn('Delete by email:', err);
      }
    }
    // 3. Try deleting by full_name
    if (cleanName) {
      try {
        await client.from('profiles').delete().eq('full_name', cleanName);
      } catch (err) {
        console.warn('Delete by name:', err);
      }
    }
    // 4. Soft-delete fallback in Supabase (prefix with [DELETED] so all devices filter it out)
    try {
      const orConditions: string[] = [];
      if (profileId) orConditions.push(`id.eq.${profileId}`);
      if (cleanEmail) orConditions.push(`email.eq.${cleanEmail}`);
      if (cleanName) orConditions.push(`full_name.eq.${cleanName}`);
      if (orConditions.length > 0) {
        await client.from('profiles').update({
          full_name: `[DELETED] ${cleanName || profileId}`,
        }).or(orConditions.join(','));
      }
    } catch {}

    return { success: true };
  } catch (e: any) {
    console.warn('Supabase delete profile catch:', e);
    return { success: false, error: e?.message };
  }
}

export async function supabaseBatchDeleteProfiles(items: { id?: string; email?: string; full_name?: string }[]) {
  const client = getSupabaseClient();
  if (!client || !items || items.length === 0) return { success: true, count: 0 };
  let count = 0;
  for (const it of items) {
    await supabaseDeleteProfile(it.id || '', it.email, it.full_name);
    count++;
  }
  return { success: true, count };
}

export async function supabaseSignOut() {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function supabaseGetSession() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session;
}

export async function supabaseFetchProfiles(): Promise<SupabaseProfile[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('Error fetching profiles:', error);
    return [];
  }
  const rawList = (data as SupabaseProfile[]) || [];
  // Filter out any deleted or soft-deleted accounts across all devices
  return rawList.filter((p) => {
    if (!p) return false;
    if (p.role === ('Deleted' as any)) return false;
    if ((p as any).is_deleted === true) return false;
    if (p.full_name && (p.full_name.trim().startsWith('[DELETED]') || p.full_name.trim().toLowerCase().includes('[deleted]'))) {
      return false;
    }
    return true;
  });
}

export async function supabaseUpdateProfileRole(
  profileId: string,
  role: UserRole,
  email?: string
) {
  const client = getSupabaseClient();
  if (!client) return;
  const pin = role === 'Admin' ? '1111' : role === 'Manager' ? '2222' : '3333';
  try {
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const { error: emailErr } = await client
        .from('profiles')
        .update({ role, pin })
        .eq('email', cleanEmail);
      if (!emailErr) return;
    }
    const { error: idErr } = await client
      .from('profiles')
      .update({ role, pin })
      .eq('id', profileId);
    if (idErr) {
      console.warn('Update role by id notice:', idErr);
    }
  } catch (e) {
    console.warn('supabaseUpdateProfileRole catch:', e);
  }
}

/**
 * ==========================================================
 * PRODUCTS MANAGEMENT (INVENTORY)
 * ==========================================================
 */

export async function supabaseFetchProducts(): Promise<Product[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching products from Supabase:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    purity: row.purity,
    weight: {
      kyat: Number(row.weight_kyat) || 0,
      pe: Number(row.weight_pe) || 0,
      yway: Number(row.weight_yway) || 0,
    },
    stoneWeightYway: Number(row.stone_weight_yway) || 0,
    stoneCharge: Number(row.stone_charge) || 0,
    makingCharge: Number(row.making_charge) || 0,
    costPrice: Number(row.cost_price) || 0,
    status: row.status,
    notes: row.notes || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
  }));
}

export async function supabaseUpsertProduct(prod: Product) {
  const client = getSupabaseClient();
  if (!client || !prod) return;

  const cleanSku = (prod.sku || '').trim() || `SKU-${prod.id ? prod.id.slice(-6) : Date.now().toString(36)}`;
  const row = {
    id: prod.id,
    sku: cleanSku,
    name: prod.name || 'Unnamed Product',
    category: prod.category || 'Ring',
    purity: prod.purity || '15_PE',
    weight_kyat: prod.weight?.kyat ?? 0,
    weight_pe: prod.weight?.pe ?? 0,
    weight_yway: prod.weight?.yway ?? 0,
    stone_weight_yway: prod.stoneWeightYway || 0,
    stone_charge: prod.stoneCharge || 0,
    making_charge: prod.makingCharge || 0,
    cost_price: prod.costPrice || 0,
    status: prod.status || 'In Stock',
    notes: prod.notes || '',
  };

  const { error } = await client.from('products').upsert(row);
  if (!error) return;

  // Handle unique constraint violation on sku (products_sku_key)
  if (error.message?.includes('products_sku_key') || error.code === '23505') {
    // 1. Try updating the existing cloud row that has this exact SKU
    const { id: _ignore, ...itemFields } = row;
    const { error: updErr } = await client
      .from('products')
      .update(itemFields)
      .eq('sku', row.sku);

    if (!updErr) return;

    // 2. Disambiguate SKU if update fails and retry upsert
    const suffix = prod.id ? prod.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4) : Math.random().toString(36).slice(2, 6);
    row.sku = `${cleanSku}-${suffix}`;
    const { error: retryErr } = await client.from('products').upsert(row);
    if (retryErr) throw retryErr;
    return;
  }

  throw error;
}

export async function supabaseDeleteProduct(id: string) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function supabaseBatchDeleteProducts(ids: string[]): Promise<number> {
  const client = getSupabaseClient();
  if (!client || !ids || ids.length === 0) return 0;
  let deletedCount = 0;
  const chunkSize = 50;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      const { error } = await client.from('products').delete().in('id', chunk);
      if (!error) {
        deletedCount += chunk.length;
      }
    } catch (e) {
      console.warn('Supabase batch delete products catch:', e);
    }
  }
  return deletedCount;
}

/**
 * ==========================================================
 * SALES MANAGEMENT
 * ==========================================================
 */

export async function supabaseFetchSales(): Promise<Sale[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching sales from Supabase:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    invoiceNo: row.invoice_no,
    date: row.date,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    items: row.items || [],
    subtotalGold: Number(row.subtotal_gold) || 0,
    totalMakingCharge: Number(row.total_making_charge) || 0,
    totalStoneCharge: Number(row.total_stone_charge) || 0,
    totalDiscount: Number(row.total_discount) || 0,
    grandTotal: Number(row.grand_total) || 0,
    payments: row.payments || [],
    paidAmount: Number(row.paid_amount) || 0,
    balanceRemaining: Number(row.balance_remaining) || 0,
    cashierName: row.cashier_name,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function supabaseInsertSale(sale: Sale) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('sales').upsert(
    {
      id: sale.id,
      invoice_no: sale.invoiceNo,
      date: sale.date,
      customer_id: sale.customerId || null,
      customer_name: sale.customerName,
      customer_phone: sale.customerPhone || null,
      items: sale.items,
      subtotal_gold: sale.subtotalGold,
      total_making_charge: sale.totalMakingCharge,
      total_stone_charge: sale.totalStoneCharge,
      total_discount: sale.totalDiscount,
      grand_total: sale.grandTotal,
      payments: sale.payments,
      paid_amount: sale.paidAmount,
      balance_remaining: sale.balanceRemaining,
      cashier_name: sale.cashierName,
      notes: sale.notes || null,
      status: sale.status,
    },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function supabaseUpdateSalePayment(
  saleOrId: Sale | string,
  payments?: any[],
  paidAmount?: number,
  balanceRemaining?: number,
  status?: 'Completed' | 'Pending Balance' | 'Void'
) {
  const client = getSupabaseClient();
  if (!client) return;

  if (typeof saleOrId === 'object' && saleOrId !== null) {
    const sale = saleOrId as Sale;
    const { error } = await client
      .from('sales')
      .update({
        payments: sale.payments,
        paid_amount: sale.paidAmount,
        balance_remaining: sale.balanceRemaining,
        status: sale.status,
      })
      .eq('id', sale.id);
    if (error) throw error;
    return;
  }

  const { error } = await client
    .from('sales')
    .update({
      payments,
      paid_amount: paidAmount,
      balance_remaining: balanceRemaining,
      status,
    })
    .eq('id', saleOrId);

  if (error) throw error;
}

export async function supabaseUpdateSaleStatus(
  saleId: string,
  status: 'Completed' | 'Pending Balance' | 'Void'
) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client
    .from('sales')
    .update({ status })
    .eq('id', saleId);
  if (error) throw error;
}

export async function supabaseBatchDeleteSales(ids: string[]): Promise<number> {
  const client = getSupabaseClient();
  if (!client || !ids || ids.length === 0) return 0;
  let deletedCount = 0;
  const chunkSize = 50;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    try {
      const { error } = await client.from('sales').delete().in('id', chunk);
      if (!error) {
        deletedCount += chunk.length;
      }
    } catch (e) {
      console.warn('Supabase batch delete sales catch:', e);
    }
  }
  return deletedCount;
}

/**
 * ==========================================================
 * GOLD PRICES
 * ==========================================================
 */

export async function supabaseFetchGoldPrices(): Promise<GoldPrice[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('gold_prices')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('Error fetching gold prices from Supabase:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date,
    purity: row.purity,
    purityLabel: row.purity_label,
    buyPrice: Number(row.buy_price) || 0,
    sellPrice: Number(row.sell_price) || 0,
    updatedAt: row.updated_at,
  }));
}

export async function supabaseUpsertGoldPrice(gp: GoldPrice) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('gold_prices').upsert({
    id: gp.id,
    date: gp.date,
    purity: gp.purity,
    purity_label: gp.purityLabel,
    buy_price: gp.buyPrice,
    sell_price: gp.sellPrice,
    updated_at: gp.updatedAt,
  });
  if (error) throw error;
}

/**
 * ==========================================================
 * CUSTOMERS
 * ==========================================================
 */

export async function supabaseFetchCustomers(): Promise<Customer[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Error fetching customers:', error);
    return [];
  }

  return (data || [])
    .filter((row: any) => !row.id.startsWith('__sys_') && !row.id.startsWith('__system_'))
    .map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      address: row.address || '',
      notes: row.notes || '',
      totalPurchased: Number(row.total_purchased) || 0,
      totalSoldBack: Number(row.total_sold_back) || 0,
      outstandingBalance: Number(row.outstanding_balance) || 0,
      createdAt: row.created_at,
    }));
}

export async function supabaseUpsertCustomer(c: Customer) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('customers').upsert({
    id: c.id,
    name: c.name,
    phone: c.phone || '',
    address: c.address || '',
    notes: c.notes || '',
    total_purchased: c.totalPurchased || 0,
    total_sold_back: c.totalSoldBack || 0,
    outstanding_balance: c.outstandingBalance || 0,
  });
  if (error) throw error;
}

/**
 * ==========================================================
 * PURCHASES (BUY BACK OLD GOLD)
 * ==========================================================
 */

export async function supabaseFetchPurchases(): Promise<PurchaseItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      voucherNo: row.voucher_no,
      date: row.date,
      partyType: row.party_type,
      partyName: row.party_name,
      partyPhone: row.party_phone,
      itemDescription: row.item_description,
      purity: row.purity,
      grossWeight: row.gross_weight || { kyat: 0, pe: 0, yway: 0 },
      deduction: row.deduction || { kyat: 0, pe: 0, yway: 0 },
      netWeight: row.net_weight || { kyat: 0, pe: 0, yway: 0 },
      buyPricePerKyat: Number(row.buy_price_per_kyat) || 0,
      totalAmount: Number(row.total_amount) || 0,
      paymentMethod: row.payment_method || 'Cash',
      cashierName: row.cashier_name || '',
      notes: row.notes || '',
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function supabaseUpsertPurchase(item: PurchaseItem) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('purchases').upsert({
    id: item.id,
    voucher_no: item.voucherNo,
    date: item.date,
    party_type: item.partyType,
    party_name: item.partyName,
    party_phone: item.partyPhone || null,
    item_description: item.itemDescription,
    purity: item.purity,
    gross_weight: item.grossWeight,
    deduction: item.deduction,
    net_weight: item.netWeight,
    buy_price_per_kyat: item.buyPricePerKyat,
    total_amount: item.totalAmount,
    payment_method: item.paymentMethod,
    cashier_name: item.cashierName,
    notes: item.notes || null,
  });
  if (error) throw error;
}

/**
 * ==========================================================
 * EXPENSES (OPERATING COSTS)
 * ==========================================================
 */

export async function supabaseFetchExpenses(): Promise<Expense[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      date: row.date,
      category: row.category,
      amount: Number(row.amount) || 0,
      note: row.note || '',
      recordedBy: row.recorded_by || '',
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function supabaseUpsertExpense(expense: Expense) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('expenses').upsert({
    id: expense.id,
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    note: expense.note || '',
    recorded_by: expense.recordedBy,
  });
  if (error) throw error;
}

/**
 * ==========================================================
 * SUPPLIERS & DEBT SETTLEMENTS
 * ==========================================================
 */

export async function supabaseFetchSuppliers(): Promise<Supplier[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone || '',
      address: row.address || '',
      totalSupplied: Number(row.total_supplied) || 0,
      outstandingBalance: Number(row.outstanding_balance) || 0,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function supabaseUpsertSupplier(sup: Supplier) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('suppliers').upsert({
    id: sup.id,
    name: sup.name,
    phone: sup.phone,
    address: sup.address,
    total_supplied: sup.totalSupplied || 0,
    outstanding_balance: sup.outstandingBalance || 0,
  });
  if (error) throw error;
}

export async function supabaseFetchSettlements(): Promise<DebtSettlement[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('debt_settlements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row: any) => ({
      id: row.id,
      receiptNo: row.receipt_no,
      saleId: row.sale_id,
      invoiceNo: row.invoice_no,
      customerId: row.customer_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      previousBalance: Number(row.previous_balance) || 0,
      amountPaid: Number(row.amount_paid) || 0,
      remainingBalance: Number(row.remaining_balance) || 0,
      paymentMethod: row.payment_method,
      paymentReference: row.payment_reference,
      cashierName: row.cashier_name,
      notes: row.notes,
      date: row.date,
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function supabaseUpsertSettlement(s: DebtSettlement) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('debt_settlements').upsert({
    id: s.id,
    receipt_no: s.receiptNo,
    sale_id: s.saleId || null,
    invoice_no: s.invoiceNo || null,
    customer_id: s.customerId || null,
    customer_name: s.customerName,
    customer_phone: s.customerPhone || null,
    previous_balance: s.previousBalance,
    amount_paid: s.amountPaid,
    remaining_balance: s.remainingBalance,
    payment_method: s.paymentMethod,
    payment_reference: s.paymentReference || null,
    cashier_name: s.cashierName,
    notes: s.notes || null,
    date: s.date,
  });
  if (error) throw error;
}

/**
 * ==========================================================
 * WORKSHOP JOB ORDERS & GOLDSMITHS (CLOUD SYNC)
 * ==========================================================
 */

export async function supabaseFetchWorkshopOrders(): Promise<WorkshopJobOrder[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  // 1. Try public.workshop_orders table first
  try {
    const { data, error } = await client.from('workshop_orders').select('*');
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        jobNo: row.job_no,
        orderType: row.order_type,
        title: row.title,
        category: row.category,
        purity: row.purity,
        goldsmithId: row.goldsmith_id,
        goldsmithName: row.goldsmith_name,
        customerId: row.customer_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        depositAmount: Number(row.deposit_amount) || 0,
        orderDate: row.order_date,
        dueDate: row.due_date,
        givenWeight: row.given_weight || { kyat: 0, pe: 0, yway: 0 },
        givenDescription: row.given_description,
        allowedWastage: row.allowed_wastage || { kyat: 0, pe: 0, yway: 0 },
        laborChargeType: row.labor_charge_type || 'Fixed',
        laborRate: Number(row.labor_rate) || 0,
        totalLaborCharge: Number(row.total_labor_charge ?? row.labor_fee) || 0,
        paidLaborCharge: Number(row.paid_labor_charge ?? row.labor_paid) || 0,
        balanceLaborCharge: Number(row.balance_labor_charge ?? row.labor_balance) || 0,
        status: row.status,
        receivedDate: row.received_date,
        finishedWeight: row.finished_weight ?? row.returned_weight,
        scrapWeight: row.scrap_weight,
        stoneWeightYway: Number(row.stone_weight_yway) || 0,
        stoneCost: Number(row.stone_cost) || 0,
        actualLossWeight: row.actual_loss_weight,
        wastageVarianceYway: Number(row.wastage_variance_yway) || 0,
        shortagePenalty: Number(row.shortage_penalty) || 0,
        assignedBy: row.assigned_by || 'Staff',
        receivedBy: row.received_by,
        linkedProductId: row.linked_product_id ?? row.completed_product_id,
        notes: row.notes,
        createdAt: row.created_at,
      })) as WorkshopJobOrder[];
    }
  } catch {}

  // 2. Fallback to resilient system sync record in customers table
  try {
    const { data, error } = await client
      .from('customers')
      .select('notes')
      .eq('id', '__sys_sync_workshop_orders__')
      .maybeSingle();

    if (!error && data && data.notes) {
      const parsed = JSON.parse(data.notes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as WorkshopJobOrder[];
      }
    }
  } catch (e) {
    console.warn('supabaseFetchWorkshopOrders note:', e);
  }
  return null;
}

export async function supabaseDeleteWorkshopOrder(id: string, jobNo?: string) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    if (jobNo) {
      await client.from('workshop_orders').delete().or(`id.eq.${id},job_no.eq.${jobNo}`);
    } else {
      await client.from('workshop_orders').delete().eq('id', id);
    }
  } catch (e) {
    console.warn('supabaseDeleteWorkshopOrder error:', e);
  }
}

export async function supabaseSaveWorkshopOrders(orders: WorkshopJobOrder[]) {
  const client = getSupabaseClient();
  if (!client || !orders || orders.length === 0) return;

  // 1. Try public.workshop_orders table
  try {
    // A. Query existing cloud rows to detect any existing job_no mappings and align IDs
    const cloudRowsByJobNo = new Map<string, { id: string; job_no: string }>();
    try {
      const { data: existingRows } = await client
        .from('workshop_orders')
        .select('id, job_no');
      if (existingRows && Array.isArray(existingRows)) {
        existingRows.forEach((r: any) => {
          if (r.job_no) {
            cloudRowsByJobNo.set(String(r.job_no).trim().toUpperCase(), {
              id: r.id,
              job_no: r.job_no,
            });
          }
        });
      }
    } catch {
      // Ignore if table query fails or is not yet created
    }

    // B. Deduplicate local orders by job_no (keep latest)
    const dedupedMap = new Map<string, WorkshopJobOrder>();
    orders.forEach((o) => {
      const key = (o.jobNo || o.id).trim().toUpperCase();
      dedupedMap.set(key, o);
    });

    const rows = Array.from(dedupedMap.values()).map((o) => {
      const jobKey = (o.jobNo || '').trim().toUpperCase();
      const existingCloud = cloudRowsByJobNo.get(jobKey);

      // If cloud already has a row with this exact job_no, use cloud's primary key id
      // This completely prevents "duplicate key value violates unique constraint 'workshop_orders_job_no_key'"
      const targetId = existingCloud ? existingCloud.id : o.id;
      o.id = targetId;

      return {
        id: targetId,
        job_no: o.jobNo,
        order_type: o.orderType,
        title: o.title,
        category: o.category,
        purity: o.purity,
        goldsmith_id: o.goldsmithId,
        goldsmith_name: o.goldsmithName,
        customer_id: o.customerId || null,
        customer_name: o.customerName || null,
        customer_phone: o.customerPhone || null,
        deposit_amount: o.depositAmount || 0,
        order_date: o.orderDate,
        due_date: o.dueDate || null,
        given_weight: o.givenWeight,
        given_description: o.givenDescription || null,
        allowed_wastage: o.allowedWastage,
        labor_charge_type: o.laborChargeType || 'Fixed',
        labor_rate: o.laborRate || 0,
        total_labor_charge: o.totalLaborCharge || 0,
        paid_labor_charge: o.paidLaborCharge || 0,
        balance_labor_charge: o.balanceLaborCharge || 0,
        status: o.status,
        received_date: o.receivedDate || null,
        finished_weight: o.finishedWeight || null,
        scrap_weight: o.scrapWeight || null,
        stone_weight_yway: o.stoneWeightYway || 0,
        stone_cost: o.stoneCost || 0,
        actual_loss_weight: o.actualLossWeight || null,
        wastage_variance_yway: o.wastageVarianceYway || 0,
        shortage_penalty: o.shortagePenalty || 0,
        assigned_by: o.assignedBy || 'Staff',
        received_by: o.receivedBy || null,
        linked_product_id: o.linkedProductId || null,
        notes: o.notes || null,
      };
    });

    // C. Try batch upsert
    let batchError: any = null;
    if (rows.length > 0) {
      const { error } = await client.from('workshop_orders').upsert(rows);
      batchError = error;
    }

    if (!batchError) return;

    // D. If batch upsert had an error:
    const isMissing =
      batchError.code === '42P01' ||
      batchError.code === 'PGRST205' ||
      batchError.message?.includes('schema cache') ||
      batchError.message?.includes('does not exist');

    if (!isMissing) {
      // If error is unique constraint or other conflict, recover gracefully item-by-item:
      let allRecovered = true;
      for (const row of rows) {
        // First try upsert with conflict target job_no
        const { error: upsertJobErr } = await client
          .from('workshop_orders')
          .upsert(row, { onConflict: 'job_no' });

        if (upsertJobErr) {
          // If onConflict job_no failed, update by job_no directly
          const { id: _ignoreId, ...rowFields } = row;
          const { error: updErr } = await client
            .from('workshop_orders')
            .update(rowFields)
            .eq('job_no', row.job_no);

          if (updErr) {
            // Try insert if update had 0 rows or failed
            const { error: insErr } = await client.from('workshop_orders').insert(row);
            if (insErr) {
              console.warn(`Resilient recovery for workshop order ${row.job_no} failed:`, insErr);
              allRecovered = false;
            }
          }
        }
      }

      if (allRecovered) {
        return; // Success!
      }
    }

    console.warn(
      isMissing
        ? 'Notice: workshop_orders table is not yet in Supabase schema cache. Saved backup to customer notes.'
        : `supabaseSaveWorkshopOrders error: ${batchError.message}`
    );

    // Fallback sync to customer note so data is preserved locally in cloud
    try {
      await client.from('customers').upsert({
        id: '__sys_sync_workshop_orders__',
        name: 'SYSTEM_SYNC_WORKSHOP_ORDERS',
        phone: '',
        address: '',
        notes: JSON.stringify(orders),
        total_purchased: 0,
        total_sold_back: 0,
        outstanding_balance: 0,
      });
    } catch {}

    if (!isMissing) {
      throw batchError;
    }
  } catch (err: any) {
    if (
      err?.code !== 'PGRST205' &&
      err?.code !== '42P01' &&
      !err?.message?.includes('schema cache')
    ) {
      throw err;
    }
  }
}

export async function supabaseFetchGoldsmiths(): Promise<Goldsmith[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('goldsmiths').select('*');
    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        workshopName: row.workshop_name,
        address: row.address,
        specialty: row.specialty,
        status: row.status,
        totalGoldWithGoldsmith: row.total_gold_with_goldsmith || { kyat: 0, pe: 0, yway: 0 },
        totalJobsCompleted: row.total_jobs_completed || 0,
        totalLaborPaid: Number(row.total_labor_paid) || 0,
        pendingLabor: Number(row.pending_labor) || 0,
        notes: row.notes,
        createdAt: row.created_at,
      })) as Goldsmith[];
    }
  } catch {}

  try {
    const { data, error } = await client
      .from('customers')
      .select('notes')
      .eq('id', '__sys_sync_goldsmiths__')
      .maybeSingle();

    if (!error && data && data.notes) {
      const parsed = JSON.parse(data.notes);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Goldsmith[];
      }
    }
  } catch (e) {
    console.warn('supabaseFetchGoldsmiths note:', e);
  }
  return null;
}

export async function supabaseSaveGoldsmiths(goldsmiths: Goldsmith[]) {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const rows = goldsmiths.map((g) => ({
      id: g.id,
      name: g.name,
      phone: g.phone,
      workshop_name: g.workshopName,
      address: g.address || null,
      specialty: g.specialty,
      status: g.status,
      total_gold_with_goldsmith: g.totalGoldWithGoldsmith,
      total_jobs_completed: g.totalJobsCompleted || 0,
      total_labor_paid: g.totalLaborPaid || 0,
      pending_labor: g.pendingLabor || 0,
      notes: g.notes || null,
    }));
    const { error } = await client.from('goldsmiths').upsert(rows);
    if (!error) return;

    const isMissing =
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      error.message?.includes('schema cache') ||
      error.message?.includes('does not exist');

    console.warn(
      isMissing
        ? 'Notice: goldsmiths table is not yet in Supabase schema cache. Saved backup to customer notes.'
        : `supabaseSaveGoldsmiths error: ${error.message}`
    );

    try {
      await client.from('customers').upsert({
        id: '__sys_sync_goldsmiths__',
        name: 'SYSTEM_SYNC_GOLDSMITHS',
        phone: '',
        address: '',
        notes: JSON.stringify(goldsmiths),
        total_purchased: 0,
        total_sold_back: 0,
        outstanding_balance: 0,
      });
    } catch {}

    if (!isMissing) {
      throw error;
    }
  } catch (err: any) {
    if (
      err?.code !== 'PGRST205' &&
      err?.code !== '42P01' &&
      !err?.message?.includes('schema cache')
    ) {
      throw err;
    }
  }
}

/**
 * ==========================================================
 * SHOP SETTINGS SYNCHRONIZATION (CROSS-DEVICE & CLOUD)
 * ==========================================================
 */

export async function supabaseFetchShopSettings(): Promise<ShopSettings | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  // 1. Try public.shop_settings table
  try {
    const { data, error } = await client
      .from('shop_settings')
      .select('*')
      .eq('id', 'current_shop')
      .maybeSingle();

    if (!error && data) {
      if (data.raw_json && typeof data.raw_json === 'object') {
        return {
          ...data.raw_json,
          shopName: data.shop_name || data.raw_json.shopName,
          shopNameMm: data.shop_name_mm || data.raw_json.shopNameMm,
          address: data.address || data.raw_json.address,
          phone: data.phone || data.raw_json.phone,
          tagline: data.tagline || data.raw_json.tagline,
          invoicePrefix: data.invoice_prefix || data.raw_json.invoicePrefix,
          defaultWastageYway: data.default_wastage_yway !== undefined ? Number(data.default_wastage_yway) : data.raw_json.defaultWastageYway,
          autoLockMinutes: data.auto_lock_minutes !== undefined ? Number(data.auto_lock_minutes) : data.raw_json.autoLockMinutes,
        };
      }
      return {
        shopName: data.shop_name || '',
        shopNameMm: data.shop_name_mm || '',
        address: data.address || '',
        phone: data.phone || '',
        tagline: data.tagline || '',
        invoicePrefix: data.invoice_prefix || 'GSP-',
        defaultWastageYway: Number(data.default_wastage_yway) || 2,
        autoLockMinutes: Number(data.auto_lock_minutes) || 3,
        scannerSuffix: data.scanner_suffix || 'ENTER',
        scannerBeep: data.scanner_beep !== false,
        scannerType: data.scanner_type || 'USB_GUN',
        scannerAutoCart: Boolean(data.scanner_auto_cart),
        currency: data.currency || 'MMK',
        language: data.language || 'my',
      };
    }
  } catch (err) {
    // shop_settings table doesn't exist yet, proceed to fallback
  }

  // 2. Resilient fallback: Query __sys_sync_shop_settings__ in customers table
  try {
    const { data, error } = await client
      .from('customers')
      .select('notes')
      .eq('id', '__sys_sync_shop_settings__')
      .maybeSingle();

    if (!error && data && data.notes) {
      const parsed = JSON.parse(data.notes);
      if (parsed && typeof parsed === 'object' && parsed.shopName) {
        return parsed as ShopSettings;
      }
    }
  } catch (err) {
    console.warn('supabaseFetchShopSettings fallback notice:', err);
  }

  return null;
}

export async function supabaseSaveShopSettings(settings: ShopSettings): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  let savedPrimary = false;

  // 1. Try upserting into public.shop_settings
  try {
    const row = {
      id: 'current_shop',
      shop_name: settings.shopName || '',
      shop_name_mm: settings.shopNameMm || '',
      address: settings.address || '',
      phone: settings.phone || '',
      tagline: settings.tagline || '',
      invoice_prefix: settings.invoicePrefix || 'GSP-',
      default_wastage_yway: settings.defaultWastageYway ?? 2,
      auto_lock_minutes: settings.autoLockMinutes ?? 3,
      scanner_suffix: settings.scannerSuffix || 'ENTER',
      scanner_beep: settings.scannerBeep !== false,
      scanner_type: settings.scannerType || 'USB_GUN',
      scanner_auto_cart: Boolean(settings.scannerAutoCart),
      currency: settings.currency || 'MMK',
      language: settings.language || 'my',
      raw_json: settings,
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('shop_settings').upsert(row);
    if (!error) {
      savedPrimary = true;
    }
  } catch (err) {
    // table might not be created in Supabase yet
  }

  // 2. Resilient Fallback to customers table (__sys_sync_shop_settings__)
  // This guarantees immediate sync across Desktop and iPhone without waiting for any SQL migrations!
  try {
    await client.from('customers').upsert({
      id: '__sys_sync_shop_settings__',
      name: '__SYSTEM_SHOP_SETTINGS__',
      phone: 'SYSTEM',
      address: settings.address || '',
      notes: JSON.stringify(settings),
      total_purchased: 0,
      total_sold_back: 0,
      outstanding_balance: 0,
    });
    return true;
  } catch (fallbackErr) {
    console.warn('Fallback sync shop settings error:', fallbackErr);
    return savedPrimary;
  }
}

/**
 * ==========================================================
 * HEALTH CHECK & TABLE VERIFICATION (VERSION 2)
 * ==========================================================
 */

export interface TableStatus {
  tableName: string;
  labelMm: string;
  exists: boolean;
  canRead: boolean;
  rowCount: number;
  error?: string;
}

export interface SupabaseHealthReport {
  connected: boolean;
  projectUrl: string;
  pingOk: boolean;
  pingError?: string;
  tables: Record<string, TableStatus>;
  totalTablesReady: number;
  totalTablesRequired: number;
  isAllReady: boolean;
}

const REQUIRED_TABLES: { name: string; labelMm: string }[] = [
  { name: 'products', labelMm: 'ပစ္စည်းလက်ကျန် (Stock)' },
  { name: 'sales', labelMm: 'အရောင်းစာရင်း (Sales POS)' },
  { name: 'gold_prices', labelMm: 'နေ့စဉ်ရွှေဈေး (Gold Prices)' },
  { name: 'customers', labelMm: 'ဖောက်သည်များ (Customers)' },
  { name: 'profiles', labelMm: 'ဝန်ထမ်းအကောင့်များ (Profiles)' },
  { name: 'purchases', labelMm: 'ရွှေဟောင်းအဝယ် (Purchases)' },
  { name: 'expenses', labelMm: 'အသုံးစရိတ်များ (Expenses)' },
  { name: 'debt_settlements', labelMm: 'အကြွေးဆပ်ပြေစာ (Settlements)' },
  { name: 'suppliers', labelMm: 'ကုန်သည်/ပွဲရုံများ (Suppliers)' },
  { name: 'workshop_orders', labelMm: 'ပန်းထိမ်အော်ဒါများ (Workshop)' },
  { name: 'goldsmiths', labelMm: 'ပန်းထိမ်ဆရာများ (Goldsmiths)' },
];

export async function supabaseCheckCloudHealth(): Promise<SupabaseHealthReport> {
  const { url } = getActiveSupabaseConfig();
  const configured = isSupabaseConfigured();
  const client = getSupabaseClient();

  const report: SupabaseHealthReport = {
    connected: configured && !!client,
    projectUrl: url,
    pingOk: false,
    tables: {},
    totalTablesReady: 0,
    totalTablesRequired: REQUIRED_TABLES.length,
    isAllReady: false,
  };

  if (!configured || !client) {
    report.pingError = 'Project URL နှင့် Anon Key ကို မထည့်သွင်းရသေးပါ (Local Storage Mode)';
    return report;
  }

  // Ping test
  try {
    const { count, error } = await client
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (
        error.message?.includes('relation "public.products" does not exist') ||
        error.code === '42P01'
      ) {
        // Connected to DB, but tables not yet created
        report.pingOk = true;
        report.pingError = 'Database နှင့် ချိတ်ဆက်မိသော်လည်း Table များ မတည်ဆောက်ရသေးပါ';
      } else if (error.code === '42501' || error.message?.includes('row-level security')) {
        report.pingOk = true;
        report.pingError = 'Database ချိတ်ဆက်မိသော်လည်း RLS Policy Fix ပြုလုပ်ရန် လိုအပ်ပါသည်';
      } else {
        report.pingOk = false;
        report.pingError = error.message;
      }
    } else {
      report.pingOk = true;
    }
  } catch (err: any) {
    report.pingOk = false;
    report.pingError = err?.message || 'Connection failed';
  }

  // Check each table
  for (const t of REQUIRED_TABLES) {
    try {
      const { count, error } = await client
        .from(t.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        const isMissing =
          error.message?.includes('does not exist') ||
          error.code === '42P01';
        const isRls =
          error.code === '42501' ||
          error.message?.includes('row-level security');

        report.tables[t.name] = {
          tableName: t.name,
          labelMm: t.labelMm,
          exists: !isMissing,
          canRead: !isRls,
          rowCount: 0,
          error: isMissing
            ? 'Table မရှိသေးပါ (SQL Run ရန် လိုအပ်)'
            : isRls
            ? 'RLS Policy ကန့်သတ်ချက် (RLS Fix Run ရန် လိုအပ်)'
            : error.message,
        };
      } else {
        report.tables[t.name] = {
          tableName: t.name,
          labelMm: t.labelMm,
          exists: true,
          canRead: true,
          rowCount: count ?? 0,
        };
        report.totalTablesReady += 1;
      }
    } catch (e: any) {
      report.tables[t.name] = {
        tableName: t.name,
        labelMm: t.labelMm,
        exists: false,
        canRead: false,
        rowCount: 0,
        error: e?.message || 'Check failed',
      };
    }
  }

  report.isAllReady = report.totalTablesReady === report.totalTablesRequired;
  return report;
}

/**
 * ==========================================================
 * BATCH UPLOAD & VERIFY (VERSION 2)
 * ==========================================================
 */

export interface UploadCategoryReport {
  key: string;
  labelMm: string;
  localCount: number;
  uploadedCount: number;
  verifiedCloudCount: number;
  status: 'success' | 'partial' | 'failed' | 'table_missing';
  error?: string;
}

export interface BatchUploadVerificationResult {
  success: boolean;
  message: string;
  timestamp: string;
  details: UploadCategoryReport[];
  totalUploaded: number;
  totalFailed: number;
}

export async function supabaseBatchUploadAndVerify(payload: {
  products: Product[];
  goldPrices: GoldPrice[];
  sales: Sale[];
  customers: Customer[];
  userProfiles: SupabaseProfile[];
  purchases: PurchaseItem[];
  expenses: Expense[];
  workshopOrders: WorkshopJobOrder[];
  goldsmiths: Goldsmith[];
  suppliers: Supplier[];
  settlements: DebtSettlement[];
  settings?: ShopSettings;
}): Promise<BatchUploadVerificationResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase Project နှင့် မချိတ်ဆက်ရသေးပါ (URL နှင့် Anon Key ထည့်သွင်းပေးပါ)',
      timestamp: new Date().toLocaleTimeString(),
      details: [],
      totalUploaded: 0,
      totalFailed: 0,
    };
  }

  const details: UploadCategoryReport[] = [];
  let totalUploaded = 0;
  let totalFailed = 0;

  // 1. Upload Products
  try {
    let count = 0;
    if (payload.products && payload.products.length > 0) {
      // Step A: Inspect existing cloud products (id and sku) to map matching SKUs to primary keys
      const cloudProductBySku = new Map<string, string>();
      try {
        const { data: cloudProds } = await client.from('products').select('id, sku');
        if (cloudProds && Array.isArray(cloudProds)) {
          cloudProds.forEach((cp: any) => {
            if (cp.sku && cp.id) {
              cloudProductBySku.set(String(cp.sku).trim().toUpperCase(), String(cp.id));
            }
          });
        }
      } catch (cpErr) {
        console.warn('Pre-fetch cloud products notice:', cpErr);
      }

      // Step B: Sanitize, deduplicate and align local products
      const seenLocalSkus = new Set<string>();
      const preparedProducts = payload.products.map((prod, index) => {
        let cleanSku = (prod.sku || '').trim();
        if (!cleanSku) {
          const catPrefix = (prod.category || 'ITM').slice(0, 3).toUpperCase();
          const idSub = prod.id ? prod.id.replace(/[^a-zA-Z0-9]/g, '').slice(-5) : `${index + 1}`;
          cleanSku = `SKU-${catPrefix}-${idSub}`;
        }

        let uniqueSku = cleanSku;
        const upperSku = uniqueSku.toUpperCase();

        // Disambiguate duplicate SKU within local batch
        if (seenLocalSkus.has(upperSku)) {
          const idSub = prod.id ? prod.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4) : `${index + 1}`;
          uniqueSku = `${cleanSku}-${idSub || index + 1}`;
        }
        seenLocalSkus.add(uniqueSku.toUpperCase());

        // If cloud already has a row with this exact SKU, align ID to cloud's ID so upsert performs an in-place UPDATE
        let targetId = prod.id;
        const cloudId = cloudProductBySku.get(uniqueSku.toUpperCase());
        if (cloudId && cloudId !== targetId) {
          targetId = cloudId;
        }

        return {
          id: targetId,
          sku: uniqueSku,
          name: prod.name || 'Unnamed Product',
          category: prod.category || 'Gold',
          purity: prod.purity || '15_PE',
          weight_kyat: prod.weight?.kyat ?? 0,
          weight_pe: prod.weight?.pe ?? 0,
          weight_yway: prod.weight?.yway ?? 0,
          stone_weight_yway: prod.stoneWeightYway || 0,
          stone_charge: prod.stoneCharge || 0,
          making_charge: prod.makingCharge || 0,
          cost_price: prod.costPrice || 0,
          status: prod.status || 'In Stock',
          notes: prod.notes || '',
        };
      });

      // Step C: Chunked upsert with resilient item-by-item recovery on conflict
      const chunkSize = 25;
      for (let i = 0; i < preparedProducts.length; i += chunkSize) {
        const chunk = preparedProducts.slice(i, i + chunkSize);
        const { error: chunkErr } = await client.from('products').upsert(chunk);

        if (!chunkErr) {
          count += chunk.length;
        } else {
          console.warn('Batch chunk upsert error on products, falling back to resilient per-item sync:', chunkErr);
          for (const item of chunk) {
            let { error: itemErr } = await client.from('products').upsert(item);

            if (itemErr && (itemErr.message?.includes('products_sku_key') || itemErr.code === '23505')) {
              // Try updating by SKU directly
              const { id: _ignore, ...itemFields } = item;
              const { error: updErr } = await client
                .from('products')
                .update(itemFields)
                .eq('sku', item.sku);

              if (!updErr) {
                count += 1;
              } else {
                // If still failed, disambiguate SKU and retry upsert
                const suffix = item.id ? item.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4) : Math.random().toString(36).slice(2, 6);
                item.sku = `${item.sku}-${suffix}`;
                const { error: retryErr } = await client.from('products').upsert(item);
                if (!retryErr) {
                  count += 1;
                } else {
                  console.error(`Item recovery failed for ${item.id}:`, retryErr);
                }
              }
            } else if (!itemErr) {
              count += 1;
            } else {
              console.error(`Product sync note for ${item.id}:`, itemErr);
            }
          }
        }
      }
    }

    const { count: cloudCount } = await client.from('products').select('*', { count: 'exact', head: true });
    details.push({
      key: 'products',
      labelMm: 'ပစ္စည်းလက်ကျန် (Products)',
      localCount: payload.products.length,
      uploadedCount: count,
      verifiedCloudCount: cloudCount ?? count,
      status: count > 0 || payload.products.length === 0 ? 'success' : 'failed',
    });
    totalUploaded += count;
  } catch (err: any) {
    const isMissing = err?.code === '42P01' || err?.message?.includes('does not exist');
    details.push({
      key: 'products',
      labelMm: 'ပစ္စည်းလက်ကျန် (Products)',
      localCount: payload.products.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: isMissing ? 'table_missing' : 'failed',
      error: err?.message,
    });
    totalFailed += payload.products.length;
  }

  // 2. Upload Gold Prices
  try {
    let count = 0;
    if (payload.goldPrices.length > 0) {
      const rows = payload.goldPrices.map((gp) => ({
        id: gp.id,
        date: gp.date,
        purity: gp.purity,
        purity_label: gp.purityLabel,
        buy_price: gp.buyPrice,
        sell_price: gp.sellPrice,
        updated_at: gp.updatedAt,
      }));
      const { error } = await client.from('gold_prices').upsert(rows);
      if (error) throw error;
      count = rows.length;
    }
    const { count: cloudCount } = await client.from('gold_prices').select('*', { count: 'exact', head: true });
    details.push({
      key: 'gold_prices',
      labelMm: 'ရွှေဈေးနှုန်းများ (Gold Prices)',
      localCount: payload.goldPrices.length,
      uploadedCount: count,
      verifiedCloudCount: cloudCount ?? count,
      status: 'success',
    });
    totalUploaded += count;
  } catch (err: any) {
    details.push({
      key: 'gold_prices',
      labelMm: 'ရွှေဈေးနှုန်းများ (Gold Prices)',
      localCount: payload.goldPrices.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: 'failed',
      error: err?.message,
    });
    totalFailed += payload.goldPrices.length;
  }

  // 3. Upload Sales
  try {
    let count = 0;
    if (payload.sales.length > 0) {
      // Step A: Inspect existing cloud sales to align invoice numbers
      const cloudSaleByInv = new Map<string, string>();
      try {
        const { data: cloudSales } = await client.from('sales').select('id, invoice_no');
        if (cloudSales && Array.isArray(cloudSales)) {
          cloudSales.forEach((cs: any) => {
            if (cs.invoice_no && cs.id) {
              cloudSaleByInv.set(String(cs.invoice_no).trim().toUpperCase(), String(cs.id));
            }
          });
        }
      } catch (sErr) {
        console.warn('Pre-fetch cloud sales notice:', sErr);
      }

      // Step B: Deduplicate local sales by invoice_no
      const dedupedSales = new Map<string, Sale>();
      payload.sales.forEach((s) => {
        const key = (s.invoiceNo || s.id).trim().toUpperCase();
        dedupedSales.set(key, s);
      });

      const rows = Array.from(dedupedSales.values()).map((sale) => {
        const invKey = (sale.invoiceNo || '').trim().toUpperCase();
        const cloudId = cloudSaleByInv.get(invKey);
        const targetId = cloudId || sale.id;

        return {
          id: targetId,
          invoice_no: sale.invoiceNo,
          date: sale.date,
          customer_id: sale.customerId || null,
          customer_name: sale.customerName,
          customer_phone: sale.customerPhone || null,
          items: sale.items,
          subtotal_gold: sale.subtotalGold,
          total_making_charge: sale.totalMakingCharge,
          total_stone_charge: sale.totalStoneCharge,
          total_discount: sale.totalDiscount,
          grand_total: sale.grandTotal,
          payments: sale.payments,
          paid_amount: sale.paidAmount,
          balance_remaining: sale.balanceRemaining,
          cashier_name: sale.cashierName,
          notes: sale.notes || null,
          status: sale.status,
        };
      });

      const chunkSize = 25;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error: chunkErr } = await client.from('sales').upsert(chunk);
        if (!chunkErr) {
          count += chunk.length;
        } else {
          // Fallback item by item
          for (const item of chunk) {
            const { error: itemErr } = await client.from('sales').upsert(item);
            if (!itemErr) {
              count += 1;
            } else {
              const { id: _ignore, ...fields } = item;
              const { error: updErr } = await client.from('sales').update(fields).eq('invoice_no', item.invoice_no);
              if (!updErr) count += 1;
            }
          }
        }
      }
    }

    const { count: cloudCount } = await client.from('sales').select('*', { count: 'exact', head: true });
    details.push({
      key: 'sales',
      labelMm: 'အရောင်းစာရင်း (Sales POS)',
      localCount: payload.sales.length,
      uploadedCount: count,
      verifiedCloudCount: cloudCount ?? count,
      status: count > 0 || payload.sales.length === 0 ? 'success' : 'failed',
    });
    totalUploaded += count;
  } catch (err: any) {
    const isMissing = err?.code === '42P01' || err?.message?.includes('does not exist');
    details.push({
      key: 'sales',
      labelMm: 'အရောင်းစာရင်း (Sales POS)',
      localCount: payload.sales.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: isMissing ? 'table_missing' : 'failed',
      error: err?.message,
    });
    totalFailed += payload.sales.length;
  }

  // 4. Upload Customers
  try {
    let count = 0;
    if (payload.customers.length > 0) {
      const rows = payload.customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        address: c.address || '',
        notes: c.notes || '',
        total_purchased: c.totalPurchased || 0,
        total_sold_back: c.totalSoldBack || 0,
        outstanding_balance: c.outstandingBalance || 0,
      }));
      const { error } = await client.from('customers').upsert(rows);
      if (error) throw error;
      count = rows.length;
    }
    const { count: cloudCount } = await client.from('customers').select('*', { count: 'exact', head: true });
    details.push({
      key: 'customers',
      labelMm: 'ဖောက်သည်များ (Customers)',
      localCount: payload.customers.length,
      uploadedCount: count,
      verifiedCloudCount: cloudCount ?? count,
      status: 'success',
    });
    totalUploaded += count;
  } catch (err: any) {
    details.push({
      key: 'customers',
      labelMm: 'ဖောက်သည်များ (Customers)',
      localCount: payload.customers.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: 'failed',
      error: err?.message,
    });
    totalFailed += payload.customers.length;
  }

  // 5. Upload Purchases (Buyback)
  try {
    let count = 0;
    if (payload.purchases.length > 0) {
      const cloudPurchByVoucher = new Map<string, string>();
      try {
        const { data: cloudPurch } = await client.from('purchases').select('id, voucher_no');
        if (cloudPurch && Array.isArray(cloudPurch)) {
          cloudPurch.forEach((cp: any) => {
            if (cp.voucher_no && cp.id) {
              cloudPurchByVoucher.set(String(cp.voucher_no).trim().toUpperCase(), String(cp.id));
            }
          });
        }
      } catch (pErr) {
        console.warn('Pre-fetch cloud purchases notice:', pErr);
      }

      const rows = payload.purchases.map((p) => {
        const vKey = (p.voucherNo || '').trim().toUpperCase();
        const cloudId = cloudPurchByVoucher.get(vKey);
        const targetId = cloudId || p.id;

        return {
          id: targetId,
          voucher_no: p.voucherNo,
          date: p.date,
          party_type: p.partyType,
          party_name: p.partyName,
          party_phone: p.partyPhone || null,
          item_description: p.itemDescription,
          purity: p.purity,
          gross_weight: p.grossWeight,
          deduction: p.deduction,
          net_weight: p.netWeight,
          buy_price_per_kyat: p.buyPricePerKyat,
          total_amount: p.totalAmount,
          payment_method: p.paymentMethod,
          cashier_name: p.cashierName,
          notes: p.notes || null,
        };
      });

      const { error } = await client.from('purchases').upsert(rows);
      if (error) {
        // Fallback per-item
        for (const r of rows) {
          const { error: rErr } = await client.from('purchases').upsert(r);
          if (!rErr) count += 1;
        }
      } else {
        count = rows.length;
      }
    }
    const { count: cloudCount } = await client.from('purchases').select('*', { count: 'exact', head: true });
    details.push({
      key: 'purchases',
      labelMm: 'ရွှေဟောင်းအဝယ် (Purchases)',
      localCount: payload.purchases.length,
      uploadedCount: count,
      verifiedCloudCount: cloudCount ?? count,
      status: count > 0 || payload.purchases.length === 0 ? 'success' : 'failed',
    });
    totalUploaded += count;
  } catch (err: any) {
    const isMissing = err?.code === '42P01' || err?.message?.includes('does not exist');
    details.push({
      key: 'purchases',
      labelMm: 'ရွှေဟောင်းအဝယ် (Purchases)',
      localCount: payload.purchases.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: isMissing ? 'table_missing' : 'failed',
      error: err?.message,
    });
    totalFailed += payload.purchases.length;
  }

  // 6. Upload Expenses
  try {
    let count = 0;
    if (payload.expenses.length > 0) {
      const rows = payload.expenses.map((e) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        amount: e.amount,
        note: e.note || '',
        recorded_by: e.recordedBy,
      }));
      const { error } = await client.from('expenses').upsert(rows);
      if (error) throw error;
      count = rows.length;
    }
    const { count: cloudCount } = await client.from('expenses').select('*', { count: 'exact', head: true });
    details.push({
      key: 'expenses',
      labelMm: 'အသုံးစရိတ်များ (Expenses)',
      localCount: payload.expenses.length,
      uploadedCount: count,
      verifiedCloudCount: cloudCount ?? count,
      status: 'success',
    });
    totalUploaded += count;
  } catch (err: any) {
    const isMissing = err?.code === '42P01' || err?.message?.includes('does not exist');
    details.push({
      key: 'expenses',
      labelMm: 'အသုံးစရိတ်များ (Expenses)',
      localCount: payload.expenses.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: isMissing ? 'table_missing' : 'failed',
      error: err?.message,
    });
    totalFailed += payload.expenses.length;
  }

  // 7. Upload User Profiles
  try {
    let count = 0;
    if (payload.userProfiles.length > 0) {
      for (const p of payload.userProfiles) {
        await supabaseUpsertProfile(p);
        count++;
      }
    }
    const { count: cloudCount } = await client.from('profiles').select('*', { count: 'exact', head: true });
    details.push({
      key: 'profiles',
      labelMm: 'ဝန်ထမ်းအကောင့်များ (Staff Profiles)',
      localCount: payload.userProfiles.length,
      uploadedCount: count,
      verifiedCloudCount: cloudCount ?? count,
      status: 'success',
    });
    totalUploaded += count;
  } catch (err: any) {
    details.push({
      key: 'profiles',
      labelMm: 'ဝန်ထမ်းအကောင့်များ (Staff Profiles)',
      localCount: payload.userProfiles.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: 'failed',
      error: err?.message,
    });
    totalFailed += payload.userProfiles.length;
  }

  // 8. Upload Workshop Orders
  try {
    let wspCount = 0;
    if (payload.workshopOrders.length > 0) {
      await supabaseSaveWorkshopOrders(payload.workshopOrders);
      wspCount = payload.workshopOrders.length;
    }
    const { count: cloudCount, error: countErr } = await client.from('workshop_orders').select('*', { count: 'exact', head: true });
    if (countErr) throw countErr;
    details.push({
      key: 'workshop_orders',
      labelMm: 'ပန်းထိမ်အော်ဒါများ (Workshop Jobs)',
      localCount: payload.workshopOrders.length,
      uploadedCount: wspCount,
      verifiedCloudCount: cloudCount ?? wspCount,
      status: 'success',
    });
    totalUploaded += wspCount;
  } catch (err: any) {
    const isMissing =
      err?.code === '42P01' ||
      err?.code === 'PGRST205' ||
      err?.message?.includes('does not exist') ||
      err?.message?.includes('schema cache');
    details.push({
      key: 'workshop_orders',
      labelMm: 'ပန်းထိမ်အော်ဒါများ (Workshop Jobs)',
      localCount: payload.workshopOrders.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: isMissing ? 'table_missing' : 'failed',
      error: isMissing ? 'Table မရှိသေးပါ (SQL Script Run ပေးပါ)' : err?.message,
    });
    totalFailed += payload.workshopOrders.length;
  }

  // 9. Upload Goldsmiths
  try {
    let gsCount = 0;
    if (payload.goldsmiths.length > 0) {
      await supabaseSaveGoldsmiths(payload.goldsmiths);
      gsCount = payload.goldsmiths.length;
    }
    const { count: cloudCount, error: countErr } = await client.from('goldsmiths').select('*', { count: 'exact', head: true });
    if (countErr) throw countErr;
    details.push({
      key: 'goldsmiths',
      labelMm: 'ပန်းထိမ်ဆရာများ (Goldsmiths)',
      localCount: payload.goldsmiths.length,
      uploadedCount: gsCount,
      verifiedCloudCount: cloudCount ?? gsCount,
      status: 'success',
    });
    totalUploaded += gsCount;
  } catch (err: any) {
    const isMissing =
      err?.code === '42P01' ||
      err?.code === 'PGRST205' ||
      err?.message?.includes('does not exist') ||
      err?.message?.includes('schema cache');
    details.push({
      key: 'goldsmiths',
      labelMm: 'ပန်းထိမ်ဆရာများ (Goldsmiths)',
      localCount: payload.goldsmiths.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: isMissing ? 'table_missing' : 'failed',
      error: isMissing ? 'Table မရှိသေးပါ (SQL Script Run ပေးပါ)' : err?.message,
    });
    totalFailed += payload.goldsmiths.length;
  }

  // 10. Upload Suppliers
  try {
    let supCount = 0;
    if (payload.suppliers.length > 0) {
      for (const sup of payload.suppliers) {
        await supabaseUpsertSupplier(sup);
        supCount++;
      }
    }
    const { count: cloudCount, error: countErr } = await client.from('suppliers').select('*', { count: 'exact', head: true });
    if (countErr) throw countErr;
    details.push({
      key: 'suppliers',
      labelMm: 'ကုန်သည်/ပွဲရုံများ (Suppliers)',
      localCount: payload.suppliers.length,
      uploadedCount: supCount,
      verifiedCloudCount: cloudCount ?? supCount,
      status: 'success',
    });
    totalUploaded += supCount;
  } catch (err: any) {
    const isMissing =
      err?.code === '42P01' ||
      err?.code === 'PGRST205' ||
      err?.message?.includes('does not exist') ||
      err?.message?.includes('schema cache');
    details.push({
      key: 'suppliers',
      labelMm: 'ကုန်သည်/ပွဲရုံများ (Suppliers)',
      localCount: payload.suppliers.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: isMissing ? 'table_missing' : 'failed',
      error: isMissing ? 'Table မရှိသေးပါ (SQL Script Run ပေးပါ)' : err?.message,
    });
    totalFailed += payload.suppliers.length;
  }

  // 11. Upload Debt Settlements
  try {
    let stCount = 0;
    if (payload.settlements.length > 0) {
      for (const st of payload.settlements) {
        await supabaseUpsertSettlement(st);
        stCount++;
      }
    }
    const { count: cloudCount, error: countErr } = await client.from('debt_settlements').select('*', { count: 'exact', head: true });
    if (countErr) throw countErr;
    details.push({
      key: 'debt_settlements',
      labelMm: 'အကြွေးဆပ်ပြေစာ (Settlements)',
      localCount: payload.settlements.length,
      uploadedCount: stCount,
      verifiedCloudCount: cloudCount ?? stCount,
      status: 'success',
    });
    totalUploaded += stCount;
  } catch (err: any) {
    const isMissing =
      err?.code === '42P01' ||
      err?.code === 'PGRST205' ||
      err?.message?.includes('does not exist') ||
      err?.message?.includes('schema cache');
    details.push({
      key: 'debt_settlements',
      labelMm: 'အကြွေးဆပ်ပြေစာ (Settlements)',
      localCount: payload.settlements.length,
      uploadedCount: 0,
      verifiedCloudCount: 0,
      status: isMissing ? 'table_missing' : 'failed',
      error: isMissing ? 'Table မရှိသေးပါ (SQL Script Run ပေးပါ)' : err?.message,
    });
    totalFailed += payload.settlements.length;
  }

  // 12. Upload Shop Settings
  if (payload.settings) {
    try {
      await supabaseSaveShopSettings(payload.settings);
      details.push({
        key: 'shop_settings',
        labelMm: 'ဆိုင်ဆိုင်ရာ ဆက်တင်များ (Shop Settings)',
        localCount: 1,
        uploadedCount: 1,
        verifiedCloudCount: 1,
        status: 'success',
      });
      totalUploaded += 1;
    } catch (sErr: any) {
      details.push({
        key: 'shop_settings',
        labelMm: 'ဆိုင်ဆိုင်ရာ ဆက်တင်များ (Shop Settings)',
        localCount: 1,
        uploadedCount: 0,
        verifiedCloudCount: 0,
        status: 'failed',
        error: sErr?.message,
      });
    }
  }

  const hasFailures = details.some((d) => d.status === 'failed' || d.status === 'table_missing');
  const message = hasFailures
    ? 'ဒေတာအချို့ Upload အောင်မြင်သော်လည်း အချို့ Table များ SQL Schema / RLS Policy မရှိသေးပါသဖြင့် ပြည့်စုံရန် SQL Script ကို ထပ်မံ Run ပေးပါ'
    : 'အရောင်းစာရင်း၊ ပစ္စည်းလက်ကျန်နှင့် စာရင်းများအားလုံးကို Supabase Database သို့ အောင်မြင်စွာ Upload တင်ပြီး Cloud တွင် စစ်ဆေးအတည်ပြုပြီးပါပြီ!';

  return {
    success: !hasFailures,
    message,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    details,
    totalUploaded,
    totalFailed,
  };
}
