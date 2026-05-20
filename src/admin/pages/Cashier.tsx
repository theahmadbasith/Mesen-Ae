import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Product, Category, Transaction, TransactionItemRecord, PaymentMethod, StoreSettings, Voucher } from '@/hooks/db-hooks';
import { dbAdmin as db, dbDelete } from '@/lib/db';
import { toDatabaseTransaction, toDatabaseTransactionItem, toDatabaseProduct, mapCategory, mapProduct, mapPaymentMethod, mapTransaction, mapTransactionItem, mapStoreSettings } from '@/lib/sync';
import {
  Search, Plus, Minus, ShoppingCart, X, Percent, Tag, CreditCard, Banknote,
  Check, ScanBarcode, Package as PackageIcon, ClipboardList, Save, Pencil,
  User, Hash, Trash2, Barcode, QrCode, Wallet, Building2, LayoutGrid, UtensilsCrossed, CheckCircle, Bell
} from "lucide-react";
import Receipt from '@/components/Receipt';
import BarcodeScanner from '@/admin/components/BarcodeScanner';
import { MidtransPaymentModal } from '@/components/MidtransPaymentModal';
import ProcessingBillsModal from '@/admin/components/CashierProcessingBillsModal';
import OpenBillsModal from '@/admin/components/CashierOpenBillsModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface CartItem {
  product: Product;
  qty: number;
  discountType: 'percentage' | 'nominal' | null;
  discountValue: number;
  selectedVariants?: { groupName: string; optionName: string; price: number }[];
  notes?: string;
}

// Helper function dipindah ke luar agar bisa digunakan dengan aman di dalam useMemo
const getItemSubtotal = (item: CartItem) => {
  const variantsPrice = item.selectedVariants?.reduce((s, v) => s + v.price, 0) || 0;
  const base = (item.product.price + variantsPrice) * item.qty;
  if (item.discountType === 'percentage') return base * (1 - item.discountValue / 100);
  if (item.discountType === 'nominal') return base - item.discountValue;
  return base;
};

// ProcessingBillCard dipindah ke komponen terpisah

export default function Kasir() {
  // ==========================================
  // 1. SEMUA USESTATE
  // ==========================================
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingTxId, setEditingTxId] = useState<number | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [midtransPaymentType, setMidtransPaymentType] = useState<'qris' | 'transfer' | 'e-wallet' | 'lainnya' | null>(null);
  const [txDiscountType, setTxDiscountType] = useState<'percentage' | 'nominal' | null>(null);
  const [txDiscountValue, setTxDiscountValue] = useState('');
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState<'percentage' | 'nominal'>('nominal');
  const [tempDiscountValue, setTempDiscountValue] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [payments, setPayments] = useState<{ methodId: number; methodName: string; amount: number; date: Date }[]>([]);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [lastTxItems, setLastTxItems] = useState<TransactionItemRecord[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [openBillsOpen, setOpenBillsOpen] = useState(false);
  const [editingItemNotes, setEditingItemNotes] = useState<number | null>(null);
  const [processingBillsOpen, setProcessingBillsOpen] = useState(false);
  const [tempItemNotes, setTempItemNotes] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetTx, setCancelTargetTx] = useState<Transaction | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherApplied, setVoucherApplied] = useState<Voucher | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);

  // Variant selection state
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);
  const [variantSelection, setVariantSelection] = useState<Record<string, Record<string, number>>>({});
  const [variantNotes, setVariantNotes] = useState('');

  // ==========================================
  // 2. SEMUA USEREF
  // ==========================================
  const scanInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // 3. DATA FETCH DARI GOOGLE SHEETS
  // ==========================================
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | undefined>(undefined);
  const [openBills, setOpenBills] = useState<Transaction[]>([]);
  const [allBills, setAllBills] = useState<Transaction[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk refresh semua data dari Google Sheets
  const refreshAllData = async () => {
    try {
      const [prods, cats, pms, settings, open, all, voucs] = await Promise.all([
        db.from('products').select('*').then(({ data }) => data?.map(mapProduct) || []),
        db.from('categories').select('*').then(({ data }) => data?.map(mapCategory) || []),
        db.from('payment_methods').select('*').then(({ data }) => data?.map(mapPaymentMethod) || []),
        db.from('store_settings').select('*').single().then(({ data }) => data ? mapStoreSettings(data) : undefined),
        db.from('transactions').select('*').eq('status', 'open').order('date', { ascending: false }).then(({ data }) => data?.map(mapTransaction) || []),
        db.from('transactions').select('*').order('date', { ascending: false }).then(({ data }) => data?.map(mapTransaction) || []),
        db.from('vouchers').select('*').eq('is_active', true).then(({ data }) => data || []),
      ]);
      setProducts(prods);
      setCategories(cats);
      setPaymentMethods(pms);
      setStoreSettings(settings);
      setOpenBills(open);
      setAllBills(all);
      setVouchers(voucs.map((v: any) => ({
        id: v.id,
        code: v.code,
        type: v.type,
        value: v.value,
        isActive: v.is_active,
        applicableProductIds: v.applicable_product_ids || [],
        validUntil: v.valid_until,
      })));
    } catch (err) {
      console.error('[Kasir] Gagal refresh data:', err);
    }
  };

  useEffect(() => {
    refreshAllData().then(() => setLoading(false));

    // Polling: refresh transaksi & produk setiap 5 detik dari Google Sheets
    const pollInterval = setInterval(async () => {
      try {
        const [{ data: openData }, { data: allData }, { data: prodData }] = await Promise.all([
          db.from('transactions').select('*').eq('status', 'open').order('date', { ascending: false }),
          db.from('transactions').select('*').order('date', { ascending: false }),
          db.from('products').select('*'),
        ]);
        if (openData) setOpenBills(openData.map(mapTransaction));
        if (allData) setAllBills(allData.map(mapTransaction));
        if (prodData) setProducts(prodData.map(mapProduct));
      } catch (err) {
        // Polling error — tidak fatal, coba lagi di interval berikutnya
      }
    }, 5000);

    // Polling: panggilan pelayan dari localStorage
    let lastCheckedLength = JSON.parse(localStorage.getItem('waiter_calls') || '[]').length;
    const waiterPollInterval = setInterval(() => {
      const calls = JSON.parse(localStorage.getItem('waiter_calls') || '[]');
      if (calls.length > lastCheckedLength) {
        const newCalls = calls.slice(lastCheckedLength);
        lastCheckedLength = calls.length;
        newCalls.forEach((call: any) => {
          toast(
            <div className="flex items-center gap-3 w-full">
              <div className="bg-primary rounded-full p-2 text-white shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-sm">Panggilan Pelayan!</p>
                <p className="text-xs text-muted-foreground">{String(call.table).toLowerCase().startsWith('meja') ? call.table : `Meja ${call.table}`} membutuhkan bantuan.</p>
              </div>
            </div>,
            { duration: 8000, position: 'top-right' }
          );
        });
      }
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(waiterPollInterval);
    };
  }, []);

  // ==========================================
  // 4. SEMUA USEMEMO (Kalkulasi)
  // ==========================================
  const processingBills = useMemo(() => allBills
    .filter(t => t.kitchenStatus && t.kitchenStatus !== 'pending' && t.kitchenStatus !== 'diantarkan' && t.kitchenStatus !== 'siap')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [allBills]);

  const processingBillsCount = processingBills.length;
  const cartProductIds = useMemo(() => new Set(cart.map(c => c.product.id)), [cart]);

  const filtered = useMemo(() => {
    return products?.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = filterCategory === 'all' || p.categoryId === Number(filterCategory);
      return matchSearch && matchCategory && (p.stock > 0 || cartProductIds.has(p.id!));
    }) ?? [];
  }, [products, search, filterCategory, cartProductIds]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + getItemSubtotal(item), 0), [cart]);

  const txDiscountAmount = useMemo(() => {
    return txDiscountType === 'percentage'
      ? subtotal * (Number(txDiscountValue) || 0) / 100
      : txDiscountType === 'nominal' ? Number(txDiscountValue) || 0 : 0;
  }, [subtotal, txDiscountType, txDiscountValue]);

  const total = useMemo(() => Math.max(0, subtotal - txDiscountAmount), [subtotal, txDiscountAmount]);
  const totalPaidSoFar = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const totalProfit = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price - item.product.hpp) * item.qty, 0) - txDiscountAmount;
  }, [cart, txDiscountAmount]);

  // ==========================================
  // 5. SEMUA USEEFFECT
  // ==========================================
  useEffect(() => {
    if (scanInput === '' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [scanInput]);

  // ==========================================
  // 6. EARLY RETURN (Loading Screen)
  // Tidak boleh ada Hook di bawah garis ini!
  // ==========================================
  if (loading) {
    return (
      <div className="pt-2 pb-24 w-full">
        <div className="flex flex-col md:flex-row gap-0 md:gap-4">
          <div className="flex-1 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-6 w-20 bg-muted animate-pulse rounded" />
              <div className="flex gap-2">
                <div className="h-9 w-28 bg-muted animate-pulse rounded-lg" />
                <div className="h-9 w-28 bg-muted animate-pulse rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-10 bg-muted animate-pulse rounded-lg" />
              <div className="w-10 h-10 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="h-10 bg-muted animate-pulse rounded-lg" />
            <div className="flex gap-2">
              {[1,2,3,4].map(i => <div key={i} className="h-7 w-16 bg-muted animate-pulse rounded-full" />)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="rounded-xl border overflow-hidden">
                  <div className="aspect-square bg-muted animate-pulse" />
                  <div className="p-2.5 space-y-1.5">
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                    <div className="h-2.5 bg-muted animate-pulse rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex md:w-80 lg:w-96 flex-col bg-card rounded-xl border border-border shrink-0 p-4 space-y-3">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="flex-1 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
            </div>
            <div className="h-14 bg-muted animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 7. VARIABEL & FUNGSI HANDLER
  // ==========================================
  const remainingToPay = Math.max(0, total - totalPaidSoFar);
  const currentPaidAmount = Number(paymentAmount) || 0;
  const change = (totalPaidSoFar + currentPaidAmount) - total;

  const doFullReset = () => {
    setCart([]);
    setEditingTxId(null);
    setTxDiscountType(null);
    setTxDiscountValue('');
    setPaymentMethodId('');
    setPaymentAmount('');
    setPayments([]);
    setCustomerName('');
    setTableNumber('');
    setRemarks('');
    setIsQuickAdding(false);
  };

  const addToCart = (product: Product, variants?: { groupName: string; optionName: string; price: number }[], notes?: string) => {
    if (product.variants && product.variants.length > 0 && !variants) {
      setVariantProduct(product);
      setVariantSelection({});
      setVariantNotes('');
      return;
    }

    setCart(prev => {
      const existing = prev.find(c =>
        c.product.id === product.id &&
        JSON.stringify(c.selectedVariants || []) === JSON.stringify(variants || []) &&
        c.notes === notes
      );
      if (existing) {
        if (existing.qty >= product.stock) {
          toast.error('Stok tidak cukup');
          return prev;
        }
        return prev.map(c => c === existing ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { product, qty: 1, discountType: null, discountValue: 0, selectedVariants: variants, notes }];
    });
    setVariantProduct(null);
  };

  const updateQty = (index: number, delta: number) => {
    setCart(prev => prev.map((c, i) => {
      if (i !== index) return c;
      const newQty = c.qty + delta;
      if (newQty <= 0) return c;
      if (newQty > c.product.stock) { toast.error('Stok tidak cukup'); return c; }
      return { ...c, qty: newQty };
    }));
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateItemNotes = (index: number, notes: string) => {
    setCart(prev => prev.map((c, i) => i === index ? { ...c, notes: notes.trim() || undefined } : c));
  };

  const saveOpenBill = async () => {
    if (cart.length === 0) { toast.error('Keranjang kosong'); return; }

    const now = new Date();

    const txPayload = {
      subtotal,
      discount_type: txDiscountType,
      discount_value: Number(txDiscountValue) || 0,
      discount_amount: txDiscountAmount,
      total,
      customer_name: customerName.trim() || null,
      table_number: tableNumber.trim() || null,
      remarks: remarks.trim() || null,
      date: now.toISOString(),
    };

    const itemRecords = cart.map(c => ({
      transaction_id: editingTxId ?? 0,
      product_id: c.product.id!,
      product_name: c.product.name,
      quantity: c.qty,
      price: c.product.price,
      hpp: c.product.hpp,
      discount_type: c.discountType,
      discount_value: c.discountValue,
      discount_amount: c.discountType === 'percentage' ? c.product.price * c.qty * c.discountValue / 100 : c.discountType === 'nominal' ? c.discountValue : 0,
      subtotal: getItemSubtotal(c),
      selected_variants: c.selectedVariants || [],
      notes: c.notes || null,
    }));

    if (editingTxId) {
      const { data: oldItems } = await db.from('transaction_items').select('*').eq('transaction_id', editingTxId);

      await db.from('transactions').update(txPayload).eq('id', editingTxId);
      await db.from('transaction_items').delete().eq('transaction_id', editingTxId);
      await db.from('transaction_items').insert(itemRecords);

      for (const cartItem of cart) {
        const oldItem = oldItems?.find((oi: { product_id: number }) => oi.product_id === cartItem.product.id);
        const oldQty = oldItem?.quantity ?? 0;
        const delta = cartItem.qty - oldQty;
        if (delta !== 0) {
          const { data: prod } = await db.from('products').select('stock').eq('id', cartItem.product.id!).single();
          if (prod) await db.from('products').update({ stock: prod.stock - delta }).eq('id', cartItem.product.id!);
        }
      }
      for (const oldItem of oldItems || []) {
        const stillInCart = cart.find(c => c.product.id === oldItem.product_id);
        if (!stillInCart) {
          const { data: prod } = await db.from('products').select('stock').eq('id', oldItem.product_id).single();
          if (prod) await db.from('products').update({ stock: prod.stock + oldItem.quantity }).eq('id', oldItem.product_id);
        }
      }

      toast.success(`Bill diperbarui!`);
    } else {
      const receiptNumber = `TX${Date.now()}`;

      const txData = {
        ...txPayload,
        receipt_number: receiptNumber,
        status: 'open',
        kitchen_status: 'pending',
        opened_at: now.toISOString(),
      };

      const { data: newTx } = await db.from('transactions').insert([txData]).select('id').single();

      if (newTx?.id) {
        await db.from('transaction_items').insert(itemRecords.map(r => ({ ...r, transaction_id: newTx.id })));

        for (const item of cart) {
          const { data: prod } = await db.from('products').select('stock').eq('id', item.product.id!).single();
          if (prod) await db.from('products').update({ stock: prod.stock - item.qty }).eq('id', item.product.id!);
        }

        toast.success(`Bill ${receiptNumber} disimpan!`);
      }
    }

    doFullReset();
    setCartOpen(false);
  };

  const loadOpenBill = async (tx: Transaction) => {
    if (!tx.id) return;
    const [{ data: items }, { data: prods }] = await Promise.all([
      db.from('transaction_items').select('*').eq('transaction_id', tx.id),
      db.from('products').select('*'),
    ]);

    const allProducts = prods?.map(mapProduct) || [];

    const cartItems: CartItem[] = (items || []).map(item => {
      const product = allProducts.find(p => p.id === item.product_id);
      if (!product) throw new Error(`Produk "${item.product_name}" tidak ditemukan`);
      return {
        product,
        qty: item.quantity,
        discountType: item.discount_type as 'percentage' | 'nominal' | null,
        discountValue: item.discount_value,
        selectedVariants: item.selected_variants || [],
        notes: item.notes,
      };
    });

    setCart(cartItems);
    setEditingTxId(tx.id);
    setTxDiscountType(tx.discountType as 'percentage' | 'nominal' | null);
    setTxDiscountValue(tx.discountType ? String(tx.discountValue) : '');
    setPayments(tx.payments || []);
    setCustomerName(tx.customerName || '');
    setTableNumber(tx.tableNumber || '');
    setRemarks(tx.remarks || '');
    setOpenBillsOpen(false);
    setCartOpen(true);
  };

  const cancelOpenBill = async (tx: Transaction) => {
    if (!tx.id) return;
    const { data: items } = await db.from('transaction_items').select('*').eq('transaction_id', tx.id);
    for (const item of items || []) {
      const { data: prod } = await db.from('products').select('stock').eq('id', item.product_id).single();
      if (prod) await db.from('products').update({ stock: prod.stock + item.quantity }).eq('id', item.product_id);
    }
    await db.from('transaction_items').delete().eq('transaction_id', tx.id);
    await db.from('transactions').delete().eq('id', tx.id);
    toast.success(`Bill ${tx.receiptNumber} dibatalkan`);
    setCancelDialogOpen(false);
    setCancelTargetTx(null);
    if (editingTxId === tx.id) {
      doFullReset();
      setCartOpen(false);
    }
  };

  const handleCancelFromCart = () => {
    const tx = openBills?.find(b => b.id === editingTxId);
    if (tx) {
      setCancelTargetTx(tx);
      setCancelDialogOpen(true);
    }
  };

  const handleCancelFromList = (bill: Transaction) => {
    setCancelTargetTx(bill);
    setCancelDialogOpen(true);
  };

  const handleCheckout = async () => {
    if (totalPaidSoFar + currentPaidAmount < total) {
      toast.error('Jumlah pembayaran kurang dari total');
      return;
    }

    const currentMethod = paymentMethods?.find(m => m.id!.toString() === paymentMethodId);
    if (!currentMethod && currentPaidAmount > 0) {
      toast.error('Pilih metode pembayaran');
      return;
    }

    const isMidtrans = currentMethod && ['qris', 'transfer', 'e-wallet', 'lainnya'].includes(currentMethod.category);
    if (isMidtrans) {
      setCheckoutOpen(false);
      setMidtransPaymentType(currentMethod.category as 'qris' | 'transfer' | 'e-wallet' | 'lainnya');
    } else {
      processCheckoutToDb();
    }
  };

  const processCheckoutToDb = async () => {
    const finalPayments = [...payments];
    const currentMethod = paymentMethods?.find(m => m.id!.toString() === paymentMethodId);

    if (currentPaidAmount > 0 && currentMethod) {
      finalPayments.push({
        methodId: currentMethod.id!,
        methodName: currentMethod.name,
        amount: currentPaidAmount,
        date: new Date()
      });
    }

    const finalPaymentAmount = finalPayments.reduce((sum, p) => sum + p.amount, 0);
    const primaryMethodId = finalPayments.length > 0 ? finalPayments[finalPayments.length - 1].methodId : 0;

    const txPayload = {
      subtotal,
      discount_type: txDiscountType,
      discount_value: Number(txDiscountValue) || 0,
      discount_amount: txDiscountAmount,
      total,
      payment_method_id: primaryMethodId,
      payment_amount: finalPaymentAmount,
      payments: finalPayments,
      change,
      profit: totalProfit,
      customer_name: customerName.trim() || null,
      table_number: tableNumber.trim() || null,
    };

    const itemRecords = cart.map(c => ({
      transaction_id: editingTxId ?? 0,
      product_id: c.product.id!,
      product_name: c.product.name,
      quantity: c.qty,
      price: c.product.price,
      hpp: c.product.hpp,
      discount_type: c.discountType,
      discount_value: c.discountValue,
      discount_amount: c.discountType === 'percentage' ? (c.product.price + (c.selectedVariants?.reduce((s, v) => s + v.price, 0) || 0)) * c.qty * c.discountValue / 100 : c.discountType === 'nominal' ? c.discountValue : 0,
      subtotal: getItemSubtotal(c),
      selected_variants: c.selectedVariants || [],
      notes: c.notes || null,
    }));

    if (editingTxId) {
      const { data: oldItems } = await db.from('transaction_items').select('*').eq('transaction_id', editingTxId);
      const openBillObj = openBills?.find(b => b.id === editingTxId);

      const finalTx = mapTransaction({
        ...txPayload,
        id: editingTxId,
        date: openBillObj ? openBillObj.date : new Date().toISOString(),
        receipt_number: openBillObj ? openBillObj.receiptNumber : `TX${editingTxId}`,
        status: 'completed',
        kitchen_status: 'diproses',
        closed_at: new Date().toISOString(),
      });

      await db.from('transactions').update({
        ...txPayload,
        status: 'completed',
        kitchen_status: 'diproses',
        closed_at: new Date().toISOString(),
      }).eq('id', editingTxId);

      await db.from('transaction_items').delete().eq('transaction_id', editingTxId);
      await db.from('transaction_items').insert(itemRecords);

      for (const cartItem of cart) {
        const oldItem = oldItems?.find((oi: { product_id: number }) => oi.product_id === cartItem.product.id);
        const delta = cartItem.qty - (oldItem?.quantity ?? 0);
        if (delta !== 0) {
          const { data: prod } = await db.from('products').select('stock').eq('id', cartItem.product.id!).single();
          if (prod) await db.from('products').update({ stock: prod.stock - delta }).eq('id', cartItem.product.id!);
        }
      }

      setLastTransaction(finalTx);
      setLastTxItems(itemRecords.map((r, i) => ({
        id: i,
        transactionId: editingTxId,
        productId: r.product_id,
        productName: r.product_name,
        quantity: r.quantity,
        price: r.price,
        hpp: r.hpp,
        discountType: r.discount_type,
        discountValue: r.discount_value,
        discountAmount: r.discount_amount,
        subtotal: r.subtotal,
        selectedVariants: r.selected_variants,
        notes: r.notes
      })));

      toast.success(`Transaksi berhasil!`);
      setReceiptOpen(true);
    } else {
      const receiptNumber = `TX${Date.now()}`;

      const txData = {
        ...txPayload,
        date: new Date().toISOString(),
        receipt_number: receiptNumber,
        status: 'completed',
        kitchen_status: 'diproses',
      };

      const { data: newTx } = await db.from('transactions').insert([txData]).select('id').single();

      if (newTx?.id) {
        await db.from('transaction_items').insert(itemRecords.map(r => ({ ...r, transaction_id: newTx.id })));

        for (const item of cart) {
          const { data: prod } = await db.from('products').select('stock').eq('id', item.product.id!).single();
          if (prod) await db.from('products').update({ stock: prod.stock - item.qty }).eq('id', item.product.id!);
        }

        const finalTx = mapTransaction({
          ...txData,
          id: newTx.id,
        });
        setLastTransaction(finalTx);
        setLastTxItems(itemRecords.map((r, i) => ({
          id: i,
          transactionId: newTx.id,
          productId: r.product_id,
          productName: r.product_name,
          quantity: r.quantity,
          price: r.price,
          hpp: r.hpp,
          discountType: r.discount_type,
          discountValue: r.discount_value,
          discountAmount: r.discount_amount,
          subtotal: r.subtotal,
          selectedVariants: r.selected_variants,
          notes: r.notes
        })));

        toast.success(`Transaksi berhasil! ${receiptNumber}`);
        setReceiptOpen(true);
      }
    }

    doFullReset();
    setCheckoutOpen(false);
    setCartOpen(false);
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const openBillsCount = openBills?.length ?? 0;

  const handleScan = (barcode: string) => {
    setScannerOpen(false);
    const product = products?.find(p => p.sku === barcode || p.barcode === barcode);
    if (product) {
      if (product.stock <= 0) {
        toast.error(`Stok ${product.name} habis`);
        return;
      }
      addToCart(product);
      toast.success(`Ditambahkan: ${product.name}`);
    } else {
      toast.error(`Produk dengan SKU/Barcode "${barcode}" tidak ditemukan`);
    }
  };

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanInput.trim()) {
      const code = scanInput.trim();
      setScanInput('');
      const product = products?.find(p => p.sku === code || p.barcode === code);
      if (product) {
        if (product.stock <= 0) {
          toast.error(`Stok ${product.name} habis`);
          return;
        }
        addToCart(product);
        toast.success(`Ditambahkan: ${product.name}`);
      } else {
        toast.error(`Produk dengan SKU/Barcode "${code}" tidak ditemukan`);
      }
    }
  };

  const rp = (n: number | string) => {
    const val = Number(n) || 0;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  return (
    <div className="pt-2 pb-24 w-full flex flex-col">
      <div className="flex flex-col md:flex-row gap-0 md:gap-4">
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {editingTxId && (
                <Badge variant="secondary" className="text-[10px] font-normal bg-primary/10 text-primary">
                  Editing Bill
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-xs relative"
                onClick={() => setOpenBillsOpen(true)}
              >
                <ClipboardList className="w-4 h-4" />
                Open Bill
                {openBillsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px] px-1 bg-destructive text-destructive-foreground shadow-md border border-white z-10">
                    {openBillsCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs relative border-blue-200 text-blue-600 bg-blue-50"
                onClick={() => setProcessingBillsOpen(true)}
              >
                <UtensilsCrossed className="w-4 h-4" />
                Diproses
                {processingBillsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px] px-1 bg-blue-600 text-white shadow-md border border-white z-10">
                    {processingBillsCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="flex gap-2 mb-2 py-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari produk..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => setScannerOpen(true)}>
              <ScanBarcode className="w-5 h-5" />
            </Button>
          </div>

          {/* SKU / Barcode scan input */}
          <div className="flex gap-2 mb-2 py-1">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={scanInputRef}
                placeholder="Scan / ketik SKU atau Barcode lalu Enter..."
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={handleScanKeyDown}
                className="pl-9 h-10 text-sm"
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1 pr-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
            <button onClick={() => setFilterCategory('all')} className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors', filterCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
              Semua
            </button>
            {categories?.map(c => (
              <button key={c.id} onClick={() => setFilterCategory(c.id!.toString())} className={cn('shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors', filterCategory === c.id!.toString() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  {products && products.length > 0
                    ? 'Semua produk stoknya habis. Tambah stok dulu di menu Stok Masuk.'
                    : 'Belum ada produk. Tambah produk dulu di menu Produk.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {filtered.map(p => (
                  <Card key={p.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]" onClick={() => addToCart(p)}>
                    <CardContent className="p-0">
                      <div className="w-full aspect-square bg-muted rounded-t-lg overflow-hidden flex items-center justify-center">
                        {p.photo ? (
                          <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <PackageIcon className="w-8 h-8 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="p-2.5">
                        <h3 className="text-xs font-semibold truncate">{p.name}</h3>
                        <p className="text-sm font-bold text-primary mt-0.5">Rp {p.price.toLocaleString('id-ID')}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Stok: {p.stock} {p.unit}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Cart Panel */}
        <div className="hidden md:flex md:w-80 lg:w-96 flex-col overflow-hidden bg-card rounded-xl border border-border shrink-0">
          <div className="p-4 border-b border-border shrink-0">
            <h3 className="text-base font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Keranjang ({cartCount} item)
              {editingTxId && <span className="text-xs font-normal text-muted-foreground">— edit</span>}
            </h3>
          </div>
          {cart.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-sm text-muted-foreground">Keranjang kosong</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 p-4">
                {cart.map((item, index) => (
                  <div key={index} className="bg-muted/50 p-3 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.product.name}</p>
                        {item.selectedVariants && item.selectedVariants.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            + {item.selectedVariants.map(v => v.optionName).join(', ')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">Rp {item.product.price.toLocaleString('id-ID')} × {item.qty}</p>
                        <p className="text-sm font-bold text-primary">{rp(getItemSubtotal(item))}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => item.qty === 1 ? removeFromCart(index) : updateQty(index, -1)}>
                          {item.qty === 1 ? <X className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </Button>
                        <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(index, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.notes ? (
                        <button
                          className="flex items-center gap-1 text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full"
                          onClick={() => { setEditingItemNotes(index); setTempItemNotes(item.notes || ''); }}
                        >
                          <Pencil className="w-2.5 h-2.5" />
                          {item.notes}
                        </button>
                      ) : (
                        <button
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => { setEditingItemNotes(index); setTempItemNotes(''); }}
                        >
                          <Pencil className="w-2.5 h-2.5" />
                          Tambah catatan
                        </button>
                      )}
                    </div>
                    {editingItemNotes === index && (
                      <div className="flex gap-2 items-center">
                        <Input
                          autoFocus
                          value={tempItemNotes}
                          onChange={e => setTempItemNotes(e.target.value)}
                          placeholder="Contoh: less sugar..."
                          className="h-8 text-xs"
                          onKeyDown={e => {
                            if (e.key === 'Enter') { updateItemNotes(index, tempItemNotes); setEditingItemNotes(null); }
                            if (e.key === 'Escape') setEditingItemNotes(null);
                          }}
                        />
                        <Button size="sm" className="h-8 text-xs" onClick={() => { updateItemNotes(index, tempItemNotes); setEditingItemNotes(null); }}>OK</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 px-4 mb-2">
                <div className="relative flex-1">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Nama pelanggan"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <div className="relative flex-[0.6]">
                  <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Meja"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-3 px-4 pb-4">
                {txDiscountAmount > 0 ? (
                  <button
                    onClick={() => { setTempDiscountType(txDiscountType!); setTempDiscountValue(txDiscountValue); setDiscountDialogOpen(true); }}
                    className="flex items-center gap-1.5 text-xs text-destructive font-medium"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Diskon: {txDiscountType === 'percentage' ? `${txDiscountValue}%` : `Rp ${Number(txDiscountValue).toLocaleString('id-ID')}`}
                    <span className="text-[10px] underline ml-1">Ubah</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { setTempDiscountType('nominal'); setTempDiscountValue(''); setDiscountDialogOpen(true); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Tambah Diskon</span>
                  </button>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{rp(subtotal)}</span>
                </div>
                {txDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Diskon</span>
                    <span>-{rp(txDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{rp(total)}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-sm font-semibold"
                    onClick={saveOpenBill}
                    disabled={cart.length === 0}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Bill
                  </Button>
                  <Button
                    className="flex-1 h-12 text-sm font-semibold"
                    onClick={() => { setCheckoutOpen(true); setPaymentMethodId(paymentMethods?.[0]?.id?.toString() ?? ''); setPaymentAmount(total.toString()); setIsQuickAdding(false); }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Bayar
                  </Button>
                </div>

                {editingTxId && (
                  <Button
                    variant="outline"
                    className="w-full h-10 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={handleCancelFromCart}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Batalkan Bill Ini
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cart FAB (mobile only) */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="md:hidden fixed bottom-24 right-4 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full shadow-xl active:scale-95 transition-transform z-40"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="font-bold text-sm">{cartCount} item</span>
          <span className="text-sm font-bold">• Rp {total.toLocaleString('id-ID')}</span>
        </button>
      )}

      {/* Cart Sheet (mobile only) */}
      <div className="md:hidden">
        <Sheet open={cartOpen} onOpenChange={(open) => { setCartOpen(open); if (!open) setEditingItemNotes(null); }}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl max-w-lg mx-auto">
            <SheetHeader>
              <SheetTitle className="text-left">
                Keranjang ({cartCount} item)
                {editingTxId && <span className="text-xs font-normal text-muted-foreground ml-2">— edit open bill</span>}
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-full mt-4">
              <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                {cart.map((item, index) => (
                  <div key={index} className="bg-muted/50 p-3 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.product.name}</p>
                        {item.selectedVariants && item.selectedVariants.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            + {item.selectedVariants.map(v => v.optionName).join(', ')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">Rp {item.product.price.toLocaleString('id-ID')} × {item.qty}</p>
                        <p className="text-sm font-bold text-primary">{rp(getItemSubtotal(item))}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => item.qty === 1 ? removeFromCart(index) : updateQty(index, -1)}>
                          {item.qty === 1 ? <X className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        </Button>
                        <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(index, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.notes ? (
                        <button
                          className="flex items-center gap-1 text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full"
                          onClick={() => { setEditingItemNotes(index); setTempItemNotes(item.notes || ''); }}
                        >
                          <Pencil className="w-2.5 h-2.5" />
                          {item.notes}
                        </button>
                      ) : (
                        <button
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => { setEditingItemNotes(index); setTempItemNotes(''); }}
                        >
                          <Pencil className="w-2.5 h-2.5" />
                          Tambah catatan
                        </button>
                      )}
                    </div>
                    {/* Inline notes editor */}
                    {editingItemNotes === index && (
                      <div className="flex gap-2 items-center">
                        <Input
                          autoFocus
                          value={tempItemNotes}
                          onChange={e => setTempItemNotes(e.target.value)}
                          placeholder="Contoh: less sugar..."
                          className="h-8 text-xs"
                          onKeyDown={e => {
                            if (e.key === 'Enter') { updateItemNotes(index, tempItemNotes); setEditingItemNotes(null); }
                            if (e.key === 'Escape') setEditingItemNotes(null);
                          }}
                        />
                        <Button size="sm" className="h-8 text-xs" onClick={() => { updateItemNotes(index, tempItemNotes); setEditingItemNotes(null); }}>OK</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Customer / Table quick inputs */}
              <div className="space-y-2 mb-2">
                <div className="flex bg-muted/50 p-1 rounded-lg">
                  <button 
                    className={cn("flex-1 text-[11px] py-1.5 rounded-md font-bold transition-all", tableNumber === 'Bawa Pulang' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => setTableNumber('Bawa Pulang')}
                  >
                    Bawa Pulang (Take Away)
                  </button>
                  <button 
                    className={cn("flex-1 text-[11px] py-1.5 rounded-md font-bold transition-all", tableNumber !== 'Bawa Pulang' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                    onClick={() => setTableNumber(tableNumber === 'Bawa Pulang' ? '' : tableNumber)}
                  >
                    Makan di Tempat
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Nama pelanggan"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                  {tableNumber !== 'Bawa Pulang' && (
                    <div className="relative flex-[0.6]">
                      <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="No. Meja"
                        value={tableNumber}
                        onChange={e => setTableNumber(e.target.value)}
                        className="pl-8 h-9 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="border-t pt-4 space-y-3 pb-6">
                {txDiscountAmount > 0 ? (
                  <button
                    onClick={() => { setTempDiscountType(txDiscountType!); setTempDiscountValue(txDiscountValue); setDiscountDialogOpen(true); }}
                    className="flex items-center gap-1.5 text-xs text-destructive font-medium"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Diskon: {txDiscountType === 'percentage' ? `${txDiscountValue}%` : `Rp ${Number(txDiscountValue).toLocaleString('id-ID')}`}
                    <span className="text-[10px] underline ml-1">Ubah</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { setTempDiscountType('nominal'); setTempDiscountValue(''); setDiscountDialogOpen(true); }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Tambah Diskon</span>
                  </button>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{rp(subtotal)}</span>
                </div>
                {txDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Diskon</span>
                    <span>-{rp(txDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{rp(total)}</span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 text-sm font-semibold"
                    onClick={saveOpenBill}
                    disabled={cart.length === 0}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Simpan Bill
                  </Button>
                  <Button
                    className="flex-1 h-12 text-sm font-semibold"
                    onClick={() => { setCheckoutOpen(true); setPaymentMethodId(paymentMethods?.[0]?.id?.toString() ?? ''); setPaymentAmount(total.toString()); setIsQuickAdding(false); }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Bayar
                  </Button>
                </div>

                {editingTxId && (
                  <Button
                    variant="outline"
                    className="w-full h-10 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={handleCancelFromCart}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Batalkan Bill Ini
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      <OpenBillsModal
        open={openBillsOpen}
        onOpenChange={setOpenBillsOpen}
        openBills={openBills}
        onLoadBill={loadOpenBill}
        onCancelBill={handleCancelFromList}
      />

      {/* Processing Bills Sheet */}
      <ProcessingBillsModal
        open={processingBillsOpen}
        onOpenChange={setProcessingBillsOpen}
        processingBills={processingBills}
        onCompleteBill={async (id) => {
          await db.from('transactions').update({ status: 'completed' }).eq('id', id);
          toast.success('Pesanan telah diselesaikan!');
          if (processingBills.length <= 1) setProcessingBillsOpen(false);
        }}
      />

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-[500px] w-[95vw] max-h-[90vh] rounded-xl flex flex-col p-0 overflow-hidden border border-border/60 shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/10 shrink-0">
            <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5 overflow-y-auto flex-1 custom-scrollbar">
            <div className="text-center py-3 bg-primary/5 rounded-xl">
              <p className="text-sm text-muted-foreground">Total Bayar</p>
              <p className="text-3xl font-bold text-primary">{rp(total)}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Metode Pembayaran</p>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods?.map(pm => {
                  const isSelected = paymentMethodId === pm.id!.toString();
                  const icons: Record<string, React.ReactNode> = {
                    tunai: <Banknote className="w-5 h-5" />,
                    transfer: <Building2 className="w-5 h-5" />,
                    'e-wallet': <Wallet className="w-5 h-5" />,
                    qris: <QrCode className="w-5 h-5" />,
                    lainnya: <LayoutGrid className="w-5 h-5" />,
                  };
                  const colors: Record<string, string> = {
                    tunai: 'text-green-600 bg-green-50 dark:bg-green-950/30',
                    transfer: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
                    'e-wallet': 'text-violet-600 bg-violet-50 dark:bg-violet-950/30',
                    qris: 'text-primary bg-primary/5',
                    lainnya: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
                  };
                  return (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethodId(pm.id!.toString())}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all active:scale-95',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-muted bg-muted/30 hover:border-primary/40'
                      )}
                    >
                      <span className={cn('p-1.5 rounded-lg', isSelected ? colors[pm.category] || 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted')}>
                        {icons[pm.category] ?? <CreditCard className="w-5 h-5" />}
                      </span>
                      <span className={cn('text-xs font-bold', isSelected ? 'text-primary' : 'text-foreground')}>
                        {pm.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <p className="text-sm font-medium">Jumlah Bayar</p>
                {payments.length > 0 && (
                  <p className="text-xs font-bold text-destructive">
                    Sisa: Rp {remainingToPay.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
              <div className="h-12 flex items-center justify-center rounded-md border border-input bg-background text-lg font-bold text-center px-3">
                {currentPaidAmount > 0 ? `Rp ${currentPaidAmount.toLocaleString('id-ID')}` : 'Rp 0'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[1000, 2000, 5000, 10000, 20000, 50000, 100000].map(nom => (
                  <button
                    key={nom}
                    onClick={() => {
                      if (!isQuickAdding) {
                        setPaymentAmount(String(nom));
                        setIsQuickAdding(true);
                      } else {
                        setPaymentAmount(prev => String((Number(prev) || 0) + nom));
                      }
                    }}
                    className="flex-1 min-w-[calc(25%-6px)] h-9 rounded-lg border border-border bg-muted/50 text-xs font-semibold text-foreground hover:bg-primary/10 hover:border-primary hover:text-primary active:scale-95 transition-all"
                  >
                    {nom >= 1000 ? `${(nom / 1000)}K` : nom}
                  </button>
                ))}
                <button
                  onClick={() => { setPaymentAmount(remainingToPay.toString()); setIsQuickAdding(false); }}
                  className="flex-1 min-w-[calc(25%-6px)] h-9 rounded-lg border border-primary/30 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 active:scale-95 transition-all"
                >
                  Uang Pas
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setPaymentAmount('0'); setIsQuickAdding(false); }}
                  className="flex-1 text-xs text-muted-foreground hover:text-destructive border border-border rounded-lg py-2 transition-colors"
                >
                  Reset Amount
                </button>
                <button
                  onClick={() => {
                    const method = paymentMethods?.find(m => m.id!.toString() === paymentMethodId);
                    if (!method) { toast.error('Pilih metode pembayaran'); return; }
                    if (currentPaidAmount <= 0) { toast.error('Masukkan jumlah'); return; }
                    if (currentPaidAmount > remainingToPay) { toast.error('Jumlah lebih dari sisa tagihan'); return; }
                    setPayments(prev => [...prev, { methodId: method.id!, methodName: method.name, amount: currentPaidAmount, date: new Date() }]);
                    setPaymentAmount('0');
                    setIsQuickAdding(false);
                    setPaymentMethodId('');
                  }}
                  disabled={!paymentMethodId || currentPaidAmount <= 0}
                  className="flex-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg py-2 font-semibold transition-colors disabled:opacity-50"
                >
                  Tambah Cicilan
                </button>
              </div>
            </div>

            {payments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-sm font-semibold">Riwayat Pembayaran (Split Bill)</p>
                {payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">{p.methodName}</p>
                      <p className="text-[10px] text-muted-foreground">{p.date.toLocaleTimeString()}</p>
                    </div>
                    <p className="font-bold">Rp {p.amount.toLocaleString('id-ID')}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex bg-muted/50 p-1 rounded-xl">
                <button 
                  className={cn("flex-1 text-xs py-2 rounded-lg font-bold transition-all", tableNumber === 'Bawa Pulang' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setTableNumber('Bawa Pulang')}
                >
                  Bawa Pulang (Take Away)
                </button>
                <button 
                  className={cn("flex-1 text-xs py-2 rounded-lg font-bold transition-all", tableNumber !== 'Bawa Pulang' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
                  onClick={() => setTableNumber(tableNumber === 'Bawa Pulang' ? '' : tableNumber)}
                >
                  Makan di Tempat
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Nama pelanggan"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="pl-8 h-10 text-sm"
                  />
                </div>
                {tableNumber !== 'Bawa Pulang' && (
                  <div className="relative flex-[0.7]">
                    <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Nomor Meja"
                      value={tableNumber}
                      onChange={e => setTableNumber(e.target.value)}
                      className="pl-8 h-10 text-sm"
                    />
                  </div>
                )}
              </div>
              <Input
                placeholder="Catatan tambahan (opsional)"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="h-10"
              />
            </div>

            {totalPaidSoFar + currentPaidAmount >= total && (
              <div className="flex justify-between items-center bg-success/10 p-3 rounded-xl">
                <span className="text-sm font-medium">Kembalian</span>
                <span className="text-lg font-bold text-success">Rp {change.toLocaleString('id-ID')}</span>
              </div>
            )}

            <Button className="w-full h-12 text-base font-semibold" onClick={handleCheckout} disabled={(!paymentMethodId && payments.length === 0) || totalPaidSoFar + currentPaidAmount < total}>
              <Check className="w-5 h-5 mr-2" />
              Selesaikan Transaksi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-[400px] w-[95vw] max-h-[90vh] rounded-xl flex flex-col p-0 overflow-hidden border border-border/60 shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/10 shrink-0">
            <DialogTitle>Diskon & Voucher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5 overflow-y-auto flex-1 custom-scrollbar">

            {/* === VOUCHER INPUT === */}
            <div className="bg-muted/40 rounded-xl p-3 space-y-2 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kode Voucher</p>
              {voucherApplied ? (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                  <div>
                    <p className="font-bold text-green-700 dark:text-green-400 text-sm font-mono">{voucherApplied.code}</p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      Diskon {voucherApplied.type === 'percentage' ? `${voucherApplied.value}%` : `Rp ${voucherApplied.value.toLocaleString('id-ID')}`} berhasil diterapkan
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                    setVoucherApplied(null);
                    setVoucherCode('');
                    setTxDiscountType(null);
                    setTxDiscountValue('');
                  }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={voucherCode}
                    onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode voucher"
                    className="h-9 text-sm font-mono uppercase"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const found = vouchers.find(v => v.code === voucherCode.trim().toUpperCase());
                        if (found) {
                          setVoucherApplied(found);
                          setTempDiscountType(found.type as 'percentage' | 'nominal');
                          setTempDiscountValue(String(found.value));
                          toast.success(`Voucher ${found.code} berhasil diterapkan!`);
                        } else {
                          toast.error('Kode voucher tidak ditemukan atau tidak aktif');
                        }
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-9 text-xs shrink-0"
                    disabled={voucherLoading || !voucherCode.trim()}
                    onClick={() => {
                      setVoucherLoading(true);
                      const found = vouchers.find(v => v.code === voucherCode.trim().toUpperCase());
                      if (found) {
                        setVoucherApplied(found);
                        setTempDiscountType(found.type as 'percentage' | 'nominal');
                        setTempDiscountValue(String(found.value));
                        toast.success(`Voucher ${found.code} berhasil!`);
                      } else {
                        toast.error('Kode voucher tidak ditemukan atau tidak aktif');
                      }
                      setVoucherLoading(false);
                    }}
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>

            {/* === MANUAL DISCOUNT === */}
            {!voucherApplied && (
              <React.Fragment>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">Jenis Diskon Manual</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTempDiscountType('nominal')}
                      className={cn('p-3 rounded-xl text-sm font-semibold border-2 transition-colors', tempDiscountType === 'nominal' ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-muted/50 text-muted-foreground')}
                    >
                      Nominal (Rp)
                    </button>
                    <button
                      onClick={() => setTempDiscountType('percentage')}
                      className={cn('p-3 rounded-xl text-sm font-semibold border-2 transition-colors', tempDiscountType === 'percentage' ? 'border-primary bg-primary/5 text-primary' : 'border-muted bg-muted/50 text-muted-foreground')}
                    >
                      Persen (%)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{tempDiscountType === 'percentage' ? 'Persentase Diskon' : 'Jumlah Diskon'}</p>
                  <Input
                    type="number"
                    value={tempDiscountValue}
                    onChange={e => setTempDiscountValue(e.target.value)}
                    placeholder={tempDiscountType === 'percentage' ? 'Contoh: 10' : 'Contoh: 5000'}
                    className="h-12 text-lg font-bold text-center"
                  />
                  {tempDiscountType === 'percentage' && Number(tempDiscountValue) > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      = Rp {(subtotal * Number(tempDiscountValue) / 100).toLocaleString('id-ID')} dari Rp {subtotal.toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              </React.Fragment>
            )}

            <div className="flex gap-2">
              {txDiscountType && (
                <Button variant="outline" className="h-11 text-destructive border-destructive/30" onClick={() => {
                  setTxDiscountType(null);
                  setTxDiscountValue('');
                  setVoucherApplied(null);
                  setVoucherCode('');
                  setDiscountDialogOpen(false);
                }}>
                  Hapus
                </Button>
              )}
              <Button className="flex-1 h-11 font-semibold" onClick={() => {
                if (Number(tempDiscountValue) > 0 || voucherApplied) {
                  setTxDiscountType(tempDiscountType);
                  setTxDiscountValue(tempDiscountValue);
                } else {
                  setTxDiscountType(null);
                  setTxDiscountValue('');
                }
                setDiscountDialogOpen(false);
              }}>
                Simpan Diskon
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      {lastTransaction && (
        <Receipt
          open={receiptOpen}
          onClose={() => setReceiptOpen(false)}
          transaction={lastTransaction}
          items={lastTxItems}
          storeSettings={storeSettings}
          paymentMethodName={paymentMethods?.find(pm => pm.id === lastTransaction.paymentMethodId)?.name || 'Tunai'}
        />
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
      />

      {/* Cancel Open Bill Confirmation */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-[400px] w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle>Batalkan Bill?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bill ini akan dihapus dan stok produk akan dikembalikan. Apakah Anda yakin ingin membatalkan bill ini?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => { setCancelDialogOpen(false); setCancelTargetTx(null); }}>
              Tidak
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                if (cancelTargetTx) {
                  cancelOpenBill(cancelTargetTx);
                }
                setCancelDialogOpen(false);
              }}
            >
              Batalkan Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Midtrans Payment Modal */}
      <MidtransPaymentModal
        isOpen={midtransPaymentType !== null}
        paymentType={midtransPaymentType}
        amount={total}
        customerName={customerName}
        onSuccess={() => {
          setMidtransPaymentType(null);
          processCheckoutToDb();
        }}
        onPending={() => {
          setMidtransPaymentType(null);
          toast.warning('Pembayaran pending, silakan selesaikan via Midtrans.');
        }}
        onError={(err) => {
          toast.error('Gagal memproses pembayaran via Midtrans');
          console.error(err);
        }}
        onClose={() => setMidtransPaymentType(null)}
      />

      {/* Variant Selection Dialog */}
      <Dialog open={!!variantProduct} onOpenChange={v => !v && setVariantProduct(null)}>
        <DialogContent className="max-w-[440px] w-[95vw] max-h-[90vh] rounded-xl flex flex-col p-0 overflow-hidden border border-border/60 shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-border/50 bg-muted/10 shrink-0">
            <DialogTitle>{variantProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 px-6 py-5 custom-scrollbar">
            {variantProduct?.variants?.map((group, gIdx) => (
              <div key={gIdx} className="bg-muted/30 rounded-xl p-3 border border-border">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{group.name}</span>
                    <span className="text-[10px] text-muted-foreground">{group.type === 'single' ? 'Pilih satu' : 'Pilih banyak'}</span>
                  </div>
                  {group.required && <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary">WAJIB</Badge>}
                </div>
                <div className="space-y-1.5">
                  {group.options.map((opt, oIdx) => {
                    const isSelected = variantSelection[group.name]?.[opt.name] !== undefined;
                    return (
                      <div
                        key={oIdx}
                        onClick={() => {
                          setVariantSelection(prev => {
                            const newSel = { ...prev };
                            if (!newSel[group.name]) newSel[group.name] = {};
                            if (group.type === 'single') {
                              newSel[group.name] = { [opt.name]: opt.price };
                            } else {
                              if (newSel[group.name][opt.name] !== undefined) delete newSel[group.name][opt.name];
                              else newSel[group.name][opt.name] = opt.price;
                            }
                            return newSel;
                          });
                        }}
                        className={`flex justify-between items-center p-2 rounded-lg cursor-pointer border transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <div className={`w-4 h-4 flex items-center justify-center border ${group.type === 'single' ? 'rounded-full' : 'rounded'} ${isSelected ? 'border-primary bg-primary' : 'border-input'}`}>
                            {isSelected && <div className={`bg-primary-foreground ${group.type === 'single' ? 'w-1.5 h-1.5 rounded-full' : 'w-2 h-2 flex items-center justify-center'}`}>
                              {group.type !== 'single' && <Check className="w-2 h-2" />}
                            </div>}
                          </div>
                          <span>{opt.name}</span>
                        </div>
                        {opt.price > 0 && <span className="text-xs text-muted-foreground">+ Rp {opt.price.toLocaleString('id-ID')}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="space-y-1.5 mt-2">
              <label className="text-xs font-semibold">Catatan</label>
              <Input
                value={variantNotes}
                onChange={e => setVariantNotes(e.target.value)}
                placeholder="Contoh: Jangan pedas..."
                className="h-9"
              />
            </div>
          </div>
          <div className="shrink-0 px-6 pb-5 pt-4 border-t border-border bg-muted/5">
            <Button
              className="w-full"
              disabled={(() => {
                if (!variantProduct?.variants) return false;
                for (const group of variantProduct.variants) {
                  if (group.required && Object.keys(variantSelection[group.name] || {}).length === 0) return true;
                }
                return false;
              })()}
              onClick={() => {
                const flatVariants: { groupName: string; optionName: string; price: number }[] = [];
                for (const groupName in variantSelection) {
                  for (const optionName in variantSelection[groupName]) {
                    flatVariants.push({ groupName, optionName, price: variantSelection[groupName][optionName] });
                  }
                }
                addToCart(variantProduct, flatVariants, variantNotes);
              }}
            >
              Tambah ke Keranjang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
