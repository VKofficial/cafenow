import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Printer, CheckCircle2, XCircle, Trash2, 
  Coffee, FileText, ChevronRight, PlusCircle, MinusCircle, 
  X, Check, Receipt, ShoppingCart, HelpCircle, AlertTriangle,
  QrCode, CreditCard, Banknote, Calendar, Filter, ArrowUpRight, Download, History, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CafeBill, CafeBillItem, MenuItem, Member } from '../types';
import { supabaseService } from '../services/supabaseService';

interface CafeBillsViewProps {
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
  members?: Member[];
  onBillSettled?: () => void;
}

export default function CafeBillsView({ onNotify, members, onBillSettled }: CafeBillsViewProps) {
  const [bills, setBills] = useState<CafeBill[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING'); // Default to PENDING for Active Bills tab
  const [selectedBill, setSelectedBill] = useState<CafeBill | null>(null);
  const [billIdToDelete, setBillIdToDelete] = useState<string | null>(null);

  // Billing History filtering states
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'ALL' | 'CASH' | 'UPI' | 'PAY_LATER'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;
  const [inspectTx, setInspectTx] = useState<any | null>(null);

  // New bill creation state
  const [isNewBillOpen, setIsNewBillOpen] = useState<boolean>(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState<boolean>(false);
  const [cart, setCart] = useState<{ id: string; name: string; price: number; quantity: number }[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const fetchedBills = await supabaseService.getCafeBills();
      setBills(fetchedBills);
      
      const fetchedMenuItems = await supabaseService.getMenuItems();
      setMenuItems(fetchedMenuItems);
      
      // Fetch transactions for Billing History tab
      const fetchedTxs = await supabaseService.getTransactions();
      const filteredTxs = fetchedTxs.filter((t: any) => 
        t.duration === 'Cafe Standalone Sale' || 
        (t.tableNumber && t.tableNumber.startsWith('C-'))
      );
      setTransactions(filteredTxs);
      
      // Auto-select first bill if any
      if (fetchedBills.length > 0 && !selectedBill) {
        setSelectedBill(fetchedBills[0]);
      } else if (fetchedBills.length > 0) {
        // Refresh selected bill details
        const refreshed = fetchedBills.find(b => b.id === selectedBill?.id);
        if (refreshed) {
          setSelectedBill(refreshed);
        }
      }
    } catch (e) {
      console.error('Error loading bills:', e);
      if (onNotify) onNotify('Failed to load billing records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setIsNewBillOpen(false);
    setEditingBillId(null);
    setCustomerName('');
    setSelectedMemberId('');
    setMemberSearchQuery('');
    setIsMemberDropdownOpen(false);
    setCart([]);
    setSelectedMenuItemId('');
    setItemQuantity(1);
  };

  const handleStartEditBill = (bill: CafeBill) => {
    setEditingBillId(bill.id);
    setCustomerName(bill.customer_name);
    setSelectedMemberId(bill.member_id || '');
    setMemberSearchQuery('');
    setIsMemberDropdownOpen(false);
    
    // Map items list to cart format
    const mappedCart = (bill.items || []).map(item => ({
      id: item.menu_item_id || '',
      name: item.menu_item_name || 'Cafe Product',
      price: item.price,
      quantity: item.quantity
    }));
    setCart(mappedCart);
    setIsNewBillOpen(true);
  };

  const handleCreateBill = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0) {
      if (onNotify) onNotify('Please add at least one menu item to the bill.', 'error');
      return;
    }

    try {
      const itemsToSubmit = cart.map(c => ({
        menu_item_id: c.id,
        menu_item_name: c.name,
        quantity: c.quantity,
        price: c.price,
        subtotal: c.price * c.quantity
      }));

      if (editingBillId) {
        const success = await supabaseService.updateCafeBill(editingBillId, customerName || 'Cash Customer', itemsToSubmit, selectedMemberId || null);
        if (success) {
          if (onNotify) onNotify('Bill updated successfully!', 'success');
          handleCloseDrawer();
          
          // Refresh list and selected bill representation
          const fetchedBills = await supabaseService.getCafeBills();
          setBills(fetchedBills);
          const refreshed = fetchedBills.find(b => b.id === editingBillId);
          if (refreshed) {
            setSelectedBill(refreshed);
          }
        } else {
          if (onNotify) onNotify('Error updating bill record', 'error');
        }
      } else {
        const response = await supabaseService.createCafeBill(customerName || 'Cash Customer', itemsToSubmit, selectedMemberId || null);
        if (response) {
          if (onNotify) onNotify('Bill created successfully!', 'success');
          handleCloseDrawer();
          
          // Reload and set newly active bill
          const fetchedBills = await supabaseService.getCafeBills();
          setBills(fetchedBills);
          const added = fetchedBills.find(b => b.id === response.id);
          if (added) {
            setSelectedBill(added);
          } else if (fetchedBills.length > 0) {
            setSelectedBill(fetchedBills[0]);
          }
        }
      }
    } catch (e) {
      console.error('Error in handleCreateBill:', e);
      if (onNotify) onNotify('Error processing bill record', 'error');
    }
  };

  const handleUpdateStatus = async (billId: string, status: 'PAID' | 'CANCELLED', paymentMethod: 'CASH' | 'UPI' | 'PAY_LATER' = 'CASH') => {
    try {
      const success = await supabaseService.updateCafeBillStatus(billId, status, paymentMethod);
      if (success) {
        if (onNotify) onNotify(`Bill status updated to ${status}!`, 'success');
        
        // Refresh both bills and transactions
        await loadData();
        
        if (onBillSettled) {
          onBillSettled();
        }
      } else {
        if (onNotify) onNotify('Failed to update status', 'error');
      }
    } catch (e) {
      console.error(e);
      if (onNotify) onNotify('Error updating bill', 'error');
    }
  };

  const handleDeleteBill = (billId: string) => {
    setBillIdToDelete(billId);
  };

  const handleConfirmDeleteBill = async () => {
    if (!billIdToDelete) return;
    try {
      const success = await supabaseService.deleteCafeBill(billIdToDelete);
      if (success) {
        if (onNotify) onNotify('Bill successfully deleted.', 'success');
        setSelectedBill(null);
        
        // Refresh
        const fetchedBills = await supabaseService.getCafeBills();
        setBills(fetchedBills);
        if (fetchedBills.length > 0) {
          setSelectedBill(fetchedBills[0]);
        }
      } else {
        if (onNotify) onNotify('Failed to delete bill.', 'error');
      }
    } catch (e) {
      console.error(e);
      if (onNotify) onNotify('Error deleting bill', 'error');
    } finally {
      setBillIdToDelete(null);
    }
  };

  // Cart operations
  const addToCart = () => {
    if (!selectedMenuItemId) {
      if (onNotify) onNotify('Select a menu item first.', 'error');
      return;
    }
    const item = menuItems.find(m => m.id === selectedMenuItemId);
    if (!item) return;

    const existingIdx = cart.findIndex(c => c.id === item.id);
    if (existingIdx > -1) {
      const updated = [...cart];
      updated[existingIdx].quantity += itemQuantity;
      setCart(updated);
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: itemQuantity
      }]);
    }
    setItemQuantity(1);
    setSelectedMenuItemId('');
    if (onNotify) onNotify(`Added ${item.name} to list.`, 'success');
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const updated = cart.map(c => {
      if (c.id === itemId) {
        const newQty = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQty };
      }
      return c;
    });
    setCart(updated);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(c => c.id !== itemId));
  };

  const calculateCartTotal = () => {
    return cart.reduce((sum, c) => sum + (c.price * c.quantity), 0);
  };

  const handlePrint = (bill: CafeBill) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      if (onNotify) onNotify("Please allow popups to print receipts.", 'error');
      return;
    }
    
    const assignedMember = members?.find(m => m.id === bill.member_id);
    
    const itemsHtml = (bill.items || []).map(item => `
      <tr>
        <td style="padding: 6px 0; text-align: left; font-family: monospace; font-size: 12px; border-bottom: 1px dashed #eee;">${item.menu_item_name || 'Item'}</td>
        <td style="padding: 6px 0; text-align: center; font-family: monospace; font-size: 12px; border-bottom: 1px dashed #eee;">${item.quantity}</td>
        <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 12px; border-bottom: 1px dashed #eee;">₹${item.price}</td>
        <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 12px; border-bottom: 1px dashed #eee;">₹${item.subtotal}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${bill.bill_number}</title>
          <style>
            @page { size: 80px 200px; margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: 280px; margin: 20px auto; color: #000; text-align: center; }
            .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
            .header p { margin: 2px 0; font-size: 10px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            th { font-size: 10px; text-transform: uppercase; border-bottom: 1px dashed #000; padding: 4px 0; }
            .total { font-weight: bold; font-size: 14px; text-align: right; margin-top: 15px; }
            .footer { font-size: 9px; margin-top: 20px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>CAFE BILL</h2>
            <p>CLUB RECEIPT INVOICE</p>
            <p>Bill: ${bill.bill_number}</p>
            <p>Date: ${new Date(bill.created_at).toLocaleString()}</p>
            <p>Cust: ${bill.customer_name || 'Cash Customer'}</p>
            ${assignedMember ? `<p>Member: ${assignedMember.name} [👤]</p>` : ''}
            <p>Status: ${bill.status}</p>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="total">GRAND TOTAL: ₹${bill.total_amount}</div>
          <div class="divider"></div>
          <div class="footer">
            <p>Thank you for visiting us!</p>
            <p>Please come again.</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    if (onNotify) onNotify(`Preparing print output for ${bill.bill_number}...`, 'success');
  };

  // Filter and search computation for Active Bills
  const filteredBills = bills.filter(bill => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      bill.bill_number.toLowerCase().includes(query) || 
      bill.customer_name.toLowerCase().includes(query);

    // active views show only PENDING
    const matchesStatus = bill.status === 'PENDING';

    return matchesSearch && matchesStatus;
  });

  // Filter and search computation for Billing History Transactions
  const filteredTransactions = transactions.filter(t => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      (t.tableNumber || '').toLowerCase().includes(query) || 
      (t.playerName || '').toLowerCase().includes(query) ||
      (t.paymentMethod || '').toLowerCase().includes(query);
    
    const matchesMethod = selectedMethod === 'ALL' || t.paymentMethod === selectedMethod;
    
    // Date filter parsing
    const txDateObj = new Date(t.date);
    const txDateStr = isNaN(txDateObj.getTime()) ? '' : txDateObj.toISOString().split('T')[0];
    
    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && txDateStr >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && txDateStr <= endDate;
    }
    
    return matchesSearch && matchesMethod && matchesDate;
  });

  const handleQuickRange = (rangeType: '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'clear') => {
    if (rangeType === 'clear') {
      setStartDate('');
      setEndDate('');
      return;
    }

    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (rangeType === '7days') {
      start.setDate(today.getDate() - 6);
    } else if (rangeType === '30days') {
      start.setDate(today.getDate() - 29);
    } else if (rangeType === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (rangeType === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Date & Time',
      'Invoice No.',
      'Customer Name',
      'Payment Method',
      'Amount (INR)'
    ];

    const rows = filteredTransactions.map(t => {
      const formattedDate = new Date(t.date).toISOString().replace('T', ' ').substring(0, 19);
      const cleanPlayerName = (t.playerName || '').replace(/"/g, '""');
      return [
        `"TXN_${t.id.toUpperCase().slice(-6)}"`,
        `"${formattedDate}"`,
        `"${t.tableNumber}"`,
        `"${cleanPlayerName}"`,
        `"${t.paymentMethod}"`,
        t.amount.toFixed(2)
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `cafe_billing_history_${today}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredRevenue = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
  const totalRevenue = transactions.reduce((acc, t) => acc + t.amount, 0);

  // Pagination for Billing History
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndexValue = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndexValue);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-on-surface">
            CAFE STANDALONE BILLING
          </h2>
          <p className="text-xs text-on-surface-variant font-mono uppercase tracking-widest mt-1">
            Complete billing panel for Cafe-Only nodes
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBillId(null);
            setCustomerName('');
            setSelectedMemberId('');
            setMemberSearchQuery('');
            setCart([]);
            setIsNewBillOpen(true);
          }}
          className="bg-cyber-lime text-black hover:bg-cyber-lime/90 font-mono text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <Plus size={16} />
          Create Standalone Bill
        </button>
      </div>

      {/* Subviews Segmented Switcher */}
      <div className="flex border-b border-white/5 bg-white/[0.01] p-1 rounded-xl w-fit">
        <button
          onClick={() => {
            setActiveTab('ACTIVE');
            setSelectedBill(null);
            setSearchQuery('');
          }}
          className={`px-6 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'ACTIVE' 
              ? 'bg-cyber-lime text-black shadow-lg shadow-cyber-lime/10' 
              : 'text-on-surface-variant/60 hover:text-on-surface'
          }`}
        >
          Active Bills
        </button>
        <button
          onClick={() => {
            setActiveTab('HISTORY');
            setSelectedBill(null);
            setSearchQuery('');
          }}
          className={`px-6 py-2 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'HISTORY' 
              ? 'bg-cyber-lime text-black shadow-lg shadow-cyber-lime/10' 
              : 'text-on-surface-variant/60 hover:text-on-surface'
          }`}
        >
          Billing History
        </button>
      </div>

      {activeTab === 'ACTIVE' ? (
        /* ACTIVE BILLS VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Section: Search and Active Bills */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-technical border-white/5 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search Input */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-on-surface-variant/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search active orders by customer or bill number..."
                  className="w-full bg-white/5 border border-white/5 focus:border-cyber-lime/30 text-xs text-on-surface placeholder:text-on-surface-variant/30 pl-10 pr-4 py-2 rounded-lg outline-none font-sans transition-all"
                />
              </div>
            </div>

            {/* Bills List / Table */}
            <div className="glass-technical border-white/5 rounded-xl overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-on-surface-variant/40 font-mono text-xs uppercase tracking-widest">
                  Retrieving active cafe bills...
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="p-12 text-center text-on-surface-variant/40 font-mono text-xs uppercase tracking-widest">
                  No active bills found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5 text-[9px] font-mono text-on-surface-variant/50 uppercase tracking-widest">
                        <th className="p-4">Bill No</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Date & Time</th>
                        <th className="p-4 text-right">Items Count</th>
                        <th className="p-4 text-right">Total Amount</th>
                        <th className="p-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredBills.map((bill) => {
                        const isSelected = selectedBill?.id === bill.id;
                        const date = new Date(bill.created_at);
                        const formattedDate = isNaN(date.getTime()) 
                          ? 'N/A' 
                          : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                        const totalItemsCount = bill.items?.reduce((c, i) => c + i.quantity, 0) || 0;
                        const assignedMember = members?.find(m => m.id === bill.member_id);

                        return (
                          <tr
                            key={bill.id}
                            onClick={() => setSelectedBill(bill)}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-cyber-lime/10 text-on-surface' 
                                : 'hover:bg-white/[0.02]/40 text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            <td className="p-4 font-mono font-bold text-cyber-lime text-[11px]">
                              {bill.bill_number}
                            </td>
                            <td className="p-4 capitalize truncate max-w-[120px] font-medium">
                              {bill.customer_name}
                              {assignedMember && (
                                <span className="block text-[8.5px] text-neon-blue font-mono uppercase tracking-wider mt-0.5">
                                  [👤 {assignedMember.name}]
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-mono text-on-surface-variant/60">
                              {formattedDate}
                            </td>
                            <td className="p-4 text-right font-mono">
                              {totalItemsCount}
                            </td>
                            <td className="p-4 text-right font-mono font-bold">
                              ₹{bill.total_amount}
                            </td>
                            <td className="p-4 text-center">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
                                {bill.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Interactive Receipt & Checkout controls */}
          <div className="lg:col-span-5 h-full">
            {selectedBill ? (
              <div className="glass-technical border-white/5 rounded-xl p-5 space-y-6 flex flex-col justify-between h-auto">
                {/* Receipt Header Actions */}
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <Receipt size={16} className="text-cyber-lime" />
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface">
                      Receipt Preview
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePrint(selectedBill)}
                      className="p-1.5 bg-white/5 hover:bg-white/10 hover:text-cyber-lime text-on-surface border border-white/5 rounded-md transition-all cursor-pointer"
                      title="Print Receipt"
                    >
                      <Printer size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteBill(selectedBill.id)}
                      className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-md transition-all cursor-pointer"
                      title="Delete / Void Active Bill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Thermal Receipt Visual Container */}
                <div className="bg-zinc-950/80 rounded-lg p-5 border border-white/5 space-y-4 font-mono text-xs text-zinc-300">
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-white tracking-widest">CAFE RECEIPT</h3>
                    <p className="text-[10px] text-zinc-500">BILL NO: {selectedBill.bill_number}</p>
                    <p className="text-[10px] text-zinc-500">
                      DATE: {new Date(selectedBill.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="border-t border-dashed border-zinc-800 my-2"></div>

                  <div className="space-y-1 text-[11px]">
                    <p><span className="text-zinc-500">CUSTOMER:</span> {selectedBill.customer_name}</p>
                    {(() => {
                      const assignedMember = members?.find(m => m.id === selectedBill.member_id);
                      return assignedMember ? (
                        <p><span className="text-zinc-500">ASSIGNED MEMBER:</span> <span className="text-neon-blue font-bold">{assignedMember.name} ({assignedMember.contact})</span></p>
                      ) : null;
                    })()}
                    <p>
                      <span className="text-zinc-500">STATUS:</span> 
                      <span className="ml-2 uppercase font-bold text-amber-400">{selectedBill.status}</span>
                    </p>
                  </div>

                  <div className="border-t border-dashed border-zinc-800 my-2"></div>

                  {/* Items loop */}
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between font-bold text-zinc-500 text-[9px] pb-1">
                      <span>ITEM BREAKDOWN</span>
                      <span>QTY x RATE</span>
                      <span className="text-right">TOTAL</span>
                    </div>

                    {(selectedBill.items || []).length === 0 ? (
                      <div className="text-center text-zinc-600 italic py-2">No items associated.</div>
                    ) : (
                      (selectedBill.items || []).map((item) => (
                        <div key={item.id} className="flex justify-between text-zinc-300">
                          <div className="truncate max-w-[140px] font-sans font-medium text-white">{item.menu_item_name || 'MenuItem'}</div>
                          <div className="text-zinc-500 font-mono text-[10px]">{item.quantity} x ₹{item.price}</div>
                          <div className="text-right font-mono font-bold text-zinc-200">₹{item.subtotal}</div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-dashed border-zinc-800 my-3"></div>

                  <div className="flex justify-between items-center text-sm font-bold text-white">
                    <span>GRAND TOTAL</span>
                    <span className="text-cyber-lime font-mono text-base font-extrabold">₹{selectedBill.total_amount}</span>
                  </div>
                </div>

                {/* Settle Panel */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
                  <div className="text-[10px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                    Settle Invoice Payment
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedBill.id, 'PAID', 'CASH')}
                      className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase text-[10px] tracking-wider py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      Pay Cash
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedBill.id, 'PAID', 'UPI')}
                      className="bg-neon-blue font-bold text-black hover:bg-neon-blue/90 uppercase text-[10px] tracking-wider py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <QrCode size={13} />
                      Pay UPI
                    </button>
                  </div>
                  
                  {selectedBill.member_id ? (
                    <button
                      onClick={() => handleUpdateStatus(selectedBill.id, 'PAID', 'PAY_LATER')}
                      className="w-full bg-[#ff4b91]/10 border border-[#ff4b91]/30 hover:bg-[#ff4b91]/20 text-[#ff4b91] font-bold uppercase text-[10px] tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CreditCard size={13} />
                      Add to Dues (Pay Later)
                    </button>
                  ) : (
                    <div className="text-[10px] font-mono text-on-surface-variant/40 text-center py-1">
                      (No member linked. Cannot settle with "Pay Later")
                    </div>
                  )}
                  
                  <div className="border-t border-white/5 my-2"></div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEditBill(selectedBill)}
                      className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-on-surface font-bold uppercase text-[10px] tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileText size={13} />
                      Edit Bill
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedBill.id, 'CANCELLED')}
                      className="flex-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold uppercase text-[10px] tracking-wider py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <XCircle size={13} />
                      Void Bill
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-technical border-white/5 rounded-xl p-12 text-center text-on-surface-variant/40 font-mono text-xs uppercase tracking-widest flex flex-col items-center justify-center min-h-[350px]">
                <FileText size={40} className="text-on-surface-variant/20 mb-3" />
                Select an active invoice from the list to inspect breakdown, settle status, update items, or print receipt.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* BILLING HISTORY VIEW */
        <div className="space-y-6">
          {/* Stats Summary Panel */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-technical p-5 rounded-2xl border border-white/5 bg-white/[0.01]">
              <p className="text-[9px] font-mono text-on-surface-variant/60 uppercase tracking-[0.2em] mb-2 font-bold">Selected Revenue</p>
              <h3 className="text-2xl font-bold text-cyber-lime font-mono">₹{filteredRevenue.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</h3>
              <p className="text-[8px] font-mono text-on-surface-variant/40 mt-1 uppercase tracking-wider">₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 0 })} Historical Total</p>
            </div>
            <div className="glass-technical p-5 rounded-2xl border border-white/5 bg-white/[0.01]">
              <p className="text-[9px] font-mono text-on-surface-variant/60 uppercase tracking-[0.2em] mb-2 font-bold">Settled Transactions</p>
              <h3 className="text-2xl font-bold text-neon-blue font-mono">{filteredTransactions.length}</h3>
              <p className="text-[8px] font-mono text-on-surface-variant/40 mt-1 uppercase tracking-wider">{transactions.length} Historical total</p>
            </div>
            <div className="glass-technical p-5 rounded-2xl border border-white/5 bg-white/[0.01]">
              <p className="text-[9px] font-mono text-on-surface-variant/60 uppercase tracking-[0.2em] mb-2 font-bold">Average Cafe Bill</p>
              <h3 className="text-2xl font-bold text-on-surface font-mono">₹{filteredTransactions.length > 0 ? (filteredRevenue / filteredTransactions.length).toFixed(0) : '0'}</h3>
              <p className="text-[8px] font-mono text-on-surface-variant/40 mt-1 uppercase tracking-wider">average of filtered range</p>
            </div>
            <div className="glass-technical p-5 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-mono text-on-surface-variant/60 uppercase tracking-[0.2em] mb-1 font-semibold">Data Export</p>
                <p className="text-[8px] font-mono text-on-surface-variant/40 uppercase tracking-widest leading-normal">Generate offline spreadsheet</p>
              </div>
              <button 
                onClick={handleExportCSV}
                className="w-full mt-3 py-2.5 bg-neon-blue/15 hover:bg-neon-blue/25 text-neon-blue border border-neon-blue/30 hover:border-neon-blue rounded-xl text-[9px] font-bold font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={12} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 bg-white/[0.01] p-5 rounded-2xl border border-white/5">
            {/* Search and Method filters */}
            <div className="xl:col-span-5 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                <div className="p-2 bg-neon-blue/10 rounded-lg text-neon-blue">
                  <Search size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Search & Filter</h4>
                  <p className="text-on-surface-variant font-mono text-[8px] uppercase tracking-widest mt-0.5">Filter by customer, payment or bill ID</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search settled invoices..."
                  className="w-full bg-white/5 border border-white/5 focus:border-neon-blue/30 text-xs px-3 py-2.5 rounded-lg text-on-surface font-mono placeholder:text-on-surface-variant/30 outline-none"
                />
                
                {/* Payment method selector */}
                <div className="flex gap-1.5 w-full overflow-x-auto">
                  {['ALL', 'CASH', 'UPI', 'PAY_LATER'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedMethod(method as any)}
                      className={`flex-1 min-w-[65px] px-2 py-1.5 rounded-md font-mono text-[9px] uppercase tracking-wider font-semibold border transition-all cursor-pointer text-center ${
                        selectedMethod === method 
                          ? 'bg-neon-blue text-black border-neon-blue' 
                          : 'bg-white/5 text-on-surface-variant/70 border-white/5 hover:border-white/10 hover:text-on-surface'
                      }`}
                    >
                      {method === 'PAY_LATER' ? 'LATER' : method}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date Filters Column */}
            <div className="xl:col-span-7 flex flex-col gap-4 border-t xl:border-t-0 xl:border-l border-white/5 pt-4 xl:pt-0 xl:pl-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-2">
                <div className="p-2 bg-cyber-lime/10 rounded-lg text-cyber-lime">
                  <Calendar size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Timeline Window</h4>
                  <p className="text-on-surface-variant font-mono text-[8px] uppercase tracking-widest mt-0.5">Filter records across historical dates</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '7 Days', range: '7days' },
                    { label: '30 Days', range: '30days' },
                    { label: 'This Month', range: 'thisMonth' },
                    { label: 'Last Month', range: 'lastMonth' },
                    { label: 'Reset', range: 'clear' },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      onClick={() => handleQuickRange(btn.range as any)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 hover:text-white rounded text-[8px] font-mono uppercase tracking-widest text-on-surface-variant/80 transition-all cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="block text-[8px] font-mono uppercase text-on-surface-variant/60 font-medium">Start Date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 focus:border-cyber-lime/30 font-mono text-[10px] text-zinc-300 px-3 py-2 rounded-lg outline-none cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[8px] font-mono uppercase text-on-surface-variant/60 font-medium">End Date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 focus:border-cyber-lime/30 font-mono text-[10px] text-zinc-300 px-3 py-2 rounded-lg outline-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="glass-technical border-white/5 rounded-xl overflow-hidden">
            {paginatedTransactions.length === 0 ? (
              <div className="p-16 text-center text-on-surface-variant/40 font-mono text-xs uppercase tracking-widest">
                No matching historic transactions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 text-[9px] font-mono text-on-surface-variant/50 uppercase tracking-widest">
                      <th className="p-4">Tx ID</th>
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Bill Number</th>
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Payment Method</th>
                      <th className="p-4 text-right">Settled Amount</th>
                      <th className="p-4 text-center">Inspect / Print</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedTransactions.map((tx) => {
                      const assignedMember = members?.find(m => m.id === tx.memberId);
                      return (
                        <tr key={tx.id} className="hover:bg-white/[0.01]/50 text-on-surface-variant hover:text-on-surface transition-colors">
                          <td className="p-4 font-mono text-[10px] font-bold text-neon-blue">
                            TXN_{tx.id.toUpperCase().slice(-6)}
                          </td>
                          <td className="p-4 font-mono text-[10px]">
                            {new Date(tx.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="p-4 font-mono text-cyber-lime font-bold">
                            {tx.tableNumber}
                          </td>
                          <td className="p-4 capitalize font-semibold text-on-surface">
                            {tx.playerName}
                            {assignedMember && (
                              <span className="block text-[8px] text-neon-blue font-mono uppercase tracking-widest mt-0.5">
                                [👤 {assignedMember.name}]
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider border ${
                              tx.paymentMethod === 'UPI' 
                                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                                : tx.paymentMethod === 'PAY_LATER' 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 font-bold' 
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                              {tx.paymentMethod === 'PAY_LATER' ? 'LATER DUES' : tx.paymentMethod}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono font-extrabold text-white">
                            ₹{tx.amount.toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => setInspectTx(tx)}
                              className="px-3 py-1 bg-white/5 hover:bg-neon-blue/10 text-on-surface-variant hover:text-neon-blue border border-white/5 hover:border-neon-blue/30 rounded text-[9px] font-mono font-semibold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center bg-white/[0.01] px-4 py-3 border-t border-white/5">
                    <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase">
                      Showing row {startIndex + 1} to {endIndexValue} of {totalItems} matches
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className={`p-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none`}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[10px] font-mono text-white bg-white/5 px-2.5 py-1.5 rounded border border-white/5 font-semibold">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-1.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 text-on-surface-variant hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none`}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Detailed inspect slidover panel */}
          <AnimatePresence>
            {inspectTx && (
              <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInspectTx(null)} />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="relative w-full max-w-md bg-zinc-950 border-l border-white/5 h-full flex flex-col shadow-2xl z-10 p-6"
                >
                  <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <History size={16} className="text-cyber-lime" />
                      <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-on-surface">INVOICE DETAILS</h3>
                    </div>
                    <button onClick={() => setInspectTx(null)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-on-surface-variant/80 transition-all cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                  
                  {/* Thermal Receipt view */}
                  <div className="flex-1 overflow-y-auto space-y-4">
                    <div className="bg-zinc-900 p-5 rounded-xl border border-white/5 font-mono text-xs space-y-3">
                      <div className="text-center space-y-1">
                        <h4 className="text-white font-bold tracking-widest text-sm">CAFE BILL</h4>
                        <p className="text-[10px] text-zinc-500">SETTLED INVOICE</p>
                        <p className="text-[10px] text-zinc-500 font-bold">TXID: TXN_{inspectTx.id.toUpperCase().slice(-6)}</p>
                        <p className="text-[10px] text-zinc-500">DATE: {new Date(inspectTx.date).toLocaleString()}</p>
                      </div>
                      <div className="border-t border-dashed border-zinc-800"></div>
                      <div className="text-[11px] space-y-1">
                        <p><span className="text-zinc-500">INVOICE NO:</span> <span className="text-white">{inspectTx.tableNumber}</span></p>
                        <p><span className="text-zinc-500">CUSTOMER:</span> <span className="text-white">{inspectTx.playerName}</span></p>
                        {(() => {
                          const assignedMember = members?.find(m => m.id === inspectTx.memberId);
                          return assignedMember ? (
                            <p><span className="text-zinc-500">ASSIGNED MEMBER:</span> <span className="text-neon-blue font-bold">{assignedMember.name} [👤]</span></p>
                          ) : null;
                        })()}
                        <p><span className="text-zinc-500">PAY VIA:</span> <span className="text-cyber-lime font-bold">{inspectTx.paymentMethod}</span></p>
                      </div>
                      <div className="border-t border-dashed border-zinc-800"></div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between text-[9px] text-zinc-500 font-bold">
                          <span>ITEM BREAKDOWN</span>
                          <span>QTY x RATE</span>
                          <span className="text-right">TOTAL</span>
                        </div>
                        {(inspectTx.items || []).length === 0 ? (
                          <div className="text-center text-zinc-600 italic py-1">No items mapped.</div>
                        ) : (
                          (inspectTx.items || []).map((i: any, index: number) => (
                            <div key={index} className="flex justify-between text-zinc-300">
                              <div className="truncate max-w-[140px] font-sans font-medium text-white">{i.name || 'Food / Beverage item'}</div>
                              <div className="text-zinc-500 font-mono text-[10px]">{i.quantity} x ₹{i.price}</div>
                              <div className="text-right font-mono font-bold text-zinc-200">₹{(i.price * i.quantity)}</div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="border-t border-dashed border-zinc-800"></div>
                      <div className="flex justify-between font-bold text-white text-sm">
                        <span>GRAND TOTAL</span>
                        <span className="text-cyber-lime font-mono text-base font-extrabold">₹{inspectTx.amount}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="pt-4 border-t border-white/5 flex gap-2">
                    <button
                      onClick={() => {
                        const mockBill: CafeBill = {
                          id: inspectTx.id,
                          club_id: '',
                          bill_number: inspectTx.tableNumber,
                          customer_name: inspectTx.playerName,
                          total_amount: inspectTx.amount,
                          status: 'PAID',
                          created_at: inspectTx.date,
                          updated_at: inspectTx.date,
                          member_id: inspectTx.memberId,
                          items: (inspectTx.items || []).map((i: any, index: number) => ({
                            id: String(index),
                            bill_id: inspectTx.id,
                            menu_item_id: '',
                            quantity: i.quantity,
                            price: i.price,
                            subtotal: i.price * i.quantity,
                            menu_item_name: i.name
                          }))
                        };
                        handlePrint(mockBill);
                      }}
                      className="flex-1 bg-cyber-lime text-black py-3 rounded-lg font-bold font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all hover:bg-cyber-lime/90 cursor-pointer"
                    >
                      <Printer size={15} />
                      Print Receipt
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* New Invoice Creator overlay drawer */}
      <AnimatePresence>
        {isNewBillOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseDrawer}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sidebar Drawer container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-xl bg-zinc-950 border-l border-white/5 h-full flex flex-col shadow-2xl z-10"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-cyber-lime" />
                  <h3 className="text-sm font-bold font-mono uppercase tracking-widest text-on-surface">
                    {editingBillId ? 'EDIT ACTIVE BILL' : 'CREATE STANDALONE BILL'}
                  </h3>
                </div>
                <button
                  onClick={handleCloseDrawer}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-on-surface-variant/80 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body (Scrollable) */}
              <form onSubmit={handleCreateBill} className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Customer Details */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/60 font-semibold">
                    Customer Name / Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name (Default: Cash Customer)..."
                    className="w-full bg-white/5 border border-white/5 focus:border-cyber-lime/30 text-xs text-on-surface placeholder:text-on-surface-variant/20 px-3 py-2.5 rounded-lg outline-none font-sans"
                  />
                </div>

                {/* Member Assignment (Optional) */}
                <div className="space-y-2 relative">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/60 font-semibold">
                      Assign Member (Optional)
                    </label>
                    {selectedMemberId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMemberId('');
                          setMemberSearchQuery('');
                        }}
                        className="text-[9px] font-mono uppercase text-[#ff4b91] hover:underline animate-fade-in"
                      >
                        [Clear Selection]
                      </button>
                    )}
                  </div>
                  
                  {/* Search Input for Members */}
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        isMemberDropdownOpen 
                          ? memberSearchQuery 
                          : (() => {
                              const m = members?.find(m => m.id === selectedMemberId);
                              return m ? `${m.name} (${m.contact})` : '';
                            })()
                      }
                      onChange={(e) => {
                        setMemberSearchQuery(e.target.value);
                        setIsMemberDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setIsMemberDropdownOpen(true);
                        const m = members?.find(m => m.id === selectedMemberId);
                        if (m) {
                          setMemberSearchQuery(m.name);
                        } else {
                          setMemberSearchQuery('');
                        }
                      }}
                      placeholder="Search member by name or contact..."
                      className="w-full bg-white/5 border border-white/5 focus:border-cyber-lime/30 text-xs text-on-surface placeholder:text-on-surface-variant/20 px-3 py-2.5 rounded-lg outline-none font-sans"
                    />
                    <div className="absolute right-3 top-2.5 text-on-surface-variant/40 flex items-center gap-1.5">
                      <Search size={14} />
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  {isMemberDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 max-h-48 overflow-y-auto bg-zinc-950 border border-white/10 mt-1 rounded-lg shadow-xl divide-y divide-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMemberId('');
                          setMemberSearchQuery('');
                          setIsMemberDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-[10px] text-on-surface-variant/60 hover:bg-white/5 font-mono uppercase transition-colors"
                      >
                        --- No Member (Standalone Cash Customer) ---
                      </button>
                      {(() => {
                        const filtered = (members || []).filter(m => {
                          if (!memberSearchQuery) return true;
                          const q = memberSearchQuery.toLowerCase();
                          return m.name.toLowerCase().includes(q) || m.contact.toLowerCase().includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="p-3 text-[11px] font-mono text-on-surface-variant/40 text-center">
                              No members found
                            </div>
                          );
                        }

                        return filtered.map(m => (
                          <button
                            type="button"
                            key={m.id}
                            onClick={() => {
                              setSelectedMemberId(m.id);
                              setCustomerName(m.name);
                              setIsMemberDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 text-xs text-on-surface hover:bg-cyber-lime/15 transition-colors flex items-center justify-between ${selectedMemberId === m.id ? 'bg-cyber-lime/10 border-l-2 border-cyber-lime font-semibold' : ''}`}
                          >
                            <div>
                              <div className="font-sans font-medium text-on-surface">{m.name}</div>
                              <div className="text-[10px] font-mono text-on-surface-variant/60 mt-0.5">{m.contact}</div>
                            </div>
                            <div className="text-[10px] font-mono text-cyber-lime font-bold">
                              Due: ₹{m.dueAmount || 0}
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Backdrop toggle wrapper to click outside and close */}
                  {isMemberDropdownOpen && (
                    <div 
                      className="fixed inset-0 z-40 cursor-default" 
                      onClick={() => setIsMemberDropdownOpen(false)}
                    />
                  )}
                </div>

                {/* Add Menu Item selector panel */}
                <div className="glass-technical border-white/5 p-4 rounded-xl space-y-4">
                  <div className="text-[10px] font-mono text-cyber-lime font-bold uppercase tracking-wider">
                    Add Food / Cafe Item
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Item Dropdown */}
                    <div className="sm:col-span-8 space-y-1.5">
                      <label className="block text-[8px] font-mono uppercase tracking-wider text-on-surface-variant/50">
                        Menu Product
                      </label>
                      <select
                        value={selectedMenuItemId}
                        onChange={(e) => setSelectedMenuItemId(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/5 focus:border-cyber-lime/30 text-xs text-on-surface h-10 px-2 rounded-lg outline-none font-sans"
                      >
                        <option value="">-- Choose Menu Item --</option>
                        {menuItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} (₹{item.price}) - {item.category}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Selector */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-[8px] font-mono uppercase tracking-wider text-on-surface-variant/50">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-zinc-900 border border-white/5 focus:border-cyber-lime/30 text-xs font-mono text-center h-10 rounded-lg outline-none"
                      />
                    </div>

                    {/* Append Button */}
                    <div className="sm:col-span-2 h-10">
                      <button
                        type="button"
                        onClick={addToCart}
                        className="w-full h-full bg-white/5 hover:bg-cyber-lime/20 border border-white/5 hover:border-cyber-lime/30 hover:text-cyber-lime rounded-lg flex items-center justify-center transition-all"
                        title="Add to Invoice list"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Selected Item breakdown table */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase tracking-wider font-bold text-on-surface-variant/60">
                    Added Cafe Items ({cart.length})
                  </h4>

                  {cart.length === 0 ? (
                    <div className="text-center bg-white/[0.01] border border-white/5 p-8 rounded-xl text-on-surface-variant/30 font-mono text-xs uppercase tracking-widest">
                      Your temporary invoice is empty. Choose a menu product and add it above.
                    </div>
                  ) : (
                    <div className="border border-white/5 rounded-lg overflow-hidden divide-y divide-white/5 font-sans">
                      {cart.map((item) => (
                        <div key={item.id} className="p-3 bg-white/[0.01] flex items-center justify-between text-xs transition-colors hover:bg-white/[0.02]">
                          <div>
                            <div className="font-bold text-white font-sans uppercase">{item.name}</div>
                            <div className="text-[10px] text-on-surface-variant/50 font-mono mt-0.5">
                              Unit price: ₹{item.price}
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="text-on-surface-variant/60 hover:text-white transition-colors"
                              >
                                <MinusCircle size={16} />
                              </button>
                              <span className="font-mono text-xs font-bold text-white min-w-[15px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="text-on-surface-variant/60 hover:text-white transition-colors"
                              >
                                <PlusCircle size={16} />
                              </button>
                            </div>

                            {/* Line subtotal */}
                            <div className="font-mono font-bold text-right text-white min-w-[60px]">
                              ₹{item.price * item.quantity}
                            </div>

                            {/* Drop line item */}
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-400 hover:text-red-500 transition-colors p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>

              {/* Drawer Footer Summary & Submit */}
              <div className="p-5 border-t border-white/5 bg-white/[0.01]/80 space-y-4">
                <div className="flex justify-between items-center text-sm font-bold font-mono">
                  <span className="text-on-surface-variant uppercase tracking-wider text-xs">Dynamic Bill Total:</span>
                  <span className="text-lg text-cyber-lime font-extrabold font-mono">₹{calculateCartTotal()}</span>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-on-surface font-mono text-xs font-bold uppercase tracking-widest py-3 border border-white/5 rounded-lg transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    disabled={cart.length === 0}
                    onClick={() => handleCreateBill()}
                    className={`flex-1 font-mono text-xs font-bold uppercase tracking-widest py-3 rounded-lg text-center flex items-center justify-center gap-2 shadow-lg transition-all ${
                      cart.length === 0 
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                        : 'bg-cyber-lime text-black hover:bg-cyber-lime/90'
                    }`}
                  >
                    <Check size={16} />
                    Save & Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Cafe Bill Deletion Confirmation Modal */}
      <AnimatePresence>
        {billIdToDelete && (() => {
          const targetBill = bills.find(b => b.id === billIdToDelete);
          return (
            <div id="cafe-bill-delete-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-zinc-950 border border-outline/20 p-8 rounded-2xl shadow-2xl relative"
              >
                <div className="flex items-center gap-4 text-red-500 mb-6">
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <AlertTriangle size={24} className="text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60">BILL ARCHIVE DECOMMISSION</h3>
                    <h2 className="text-md font-bold text-white uppercase tracking-tight">Purge Invoice Record?</h2>
                  </div>
                </div>

                <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-1 font-semibold">
                  Invoice ID: {billIdToDelete.slice(0, 8)}...
                </p>
                {targetBill && (
                  <p className="text-sm text-on-surface-variant/90 mb-4 leading-relaxed">
                    Are you sure you want to permanently delete the invoice for customer <span className="text-white font-semibold">"{targetBill.customer_name || 'Walk-in Customer'}"</span>?
                    Totaling <span className="text-white font-semibold">₹{targetBill.total_price?.toFixed(2)}</span>.
                  </p>
                )}
                <p className="text-xs text-on-surface-variant/60 mb-8 font-mono">
                  This action is irreversible. All associated receipt indexes will be permanently purged from the database logs.
                </p>

                <div className="flex gap-3 justify-end">
                  <button
                    id="cancel-cafe-bill-delete-btn"
                    onClick={() => setBillIdToDelete(null)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-colors text-on-surface cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-cafe-bill-delete-btn"
                    onClick={handleConfirmDeleteBill}
                    className="px-5 py-2.5 bg-red-650 hover:bg-red-700 text-white rounded-lg font-mono text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
