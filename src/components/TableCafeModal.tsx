import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Coffee, Utensils, Plus, Minus, ShoppingBag, Zap } from 'lucide-react';
import { SnookerTable, MenuItem } from '../types';
import { CAFE_MENU } from '../constants';

interface TableCafeModalProps {
  isOpen: boolean;
  table: SnookerTable | null;
  menuItems: MenuItem[];
  categories: string[];
  onAddMenuItem?: (item: Omit<MenuItem, 'id'>) => void;
  onClose: () => void;
  onAddOrder: (tableId: string, orderItems: { item: MenuItem, quantity: number }[]) => void;
}

export default function TableCafeModal({ isOpen, table, menuItems, categories: propCategories, onAddMenuItem, onClose, onAddOrder }: TableCafeModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemData, setNewItemData] = useState({ name: '', price: '' });
  
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [cart, setCart] = React.useState<{ item: MenuItem, quantity: number, assignedToPlayerName?: string }[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('All');

  React.useEffect(() => {
    if (isOpen && table) {
      setCart(table.currentCart || []);
      setSelectedRecipient('All');
    }
  }, [isOpen, table]);

  if (!table) return null;

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const name = newCategoryName.trim();
      setSelectedCategory(name);
      setIsAddingCategory(false);
      setNewCategoryName('');
      setIsAddingItem(true); // Open item creation for the new category
    }
  };

  const categories = ['All', ...propCategories];
  if (selectedCategory !== 'All' && !categories.includes(selectedCategory)) {
    categories.push(selectedCategory);
  }

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddNewItem = () => {
    if (newItemData.name && newItemData.price && onAddMenuItem) {
      // If we are on "All", we should probably use the first valid category
      const catToUse = selectedCategory === 'All' ? (propCategories[0] || 'Beverage') : selectedCategory;
      
      onAddMenuItem({
        name: newItemData.name,
        price: parseFloat(newItemData.price),
        category: catToUse
      });
      setIsAddingItem(false);
      setNewItemData({ name: '', price: '' });
    }
  };

  // Cart Helper Functions
  const calculateTotal = () => {
    return cart.reduce((acc, i) => acc + (i.item.price * i.quantity), 0);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 1) + delta)
    }));
  };

  const addToCart = (item: MenuItem) => {
    const qty = quantities[item.id] || 1;
    if (qty <= 0) return;

    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id && (i.assignedToPlayerName || 'All') === selectedRecipient);
      if (existing) {
        // Increase quantity instead of duplicate
        return prev.map(i => (i.item.id === item.id && (i.assignedToPlayerName || 'All') === selectedRecipient) ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { item, quantity: qty, assignedToPlayerName: selectedRecipient }];
    });
    
    // Reset quantity input
    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
  };

  const removeFromCart = (itemId: string, recipientName?: string) => {
    setCart(prev => prev.filter(i => !(i.item.id === itemId && (i.assignedToPlayerName || 'All') === (recipientName || 'All'))));
  };

  const handleConfirmOrder = () => {
    if (cart.length > 0) {
      onAddOrder(table.id, cart);
      setCart([]);
      onClose();
    }
  };

  const cartTotal = calculateTotal();

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-obsidian-950/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-5xl bg-obsidian-900 border border-white/10 rounded-2xl flex flex-col max-h-[90vh] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-obsidian-900 sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyber-lime/10 rounded-xl text-cyber-lime">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-cyber-lime uppercase tracking-tight flex items-center gap-2">
                    Cafe Terminal
                  </h3>
                  <p className="font-mono text-[10px] text-on-surface-variant/60 uppercase tracking-widest mt-1">
                    Node Connection: {table.number} • Player: {table.player || 'Guest'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-all text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex h-full overflow-hidden">
              {/* Menu Section */}
              <div className="flex-1 flex flex-col border-r border-white/5 bg-obsidian-950/20">
                {/* Search & Filters */}
                <div className="p-4 border-b border-white/5 space-y-4">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-cyber-lime transition-colors" size={18} />
                    <input
                      type="text"
                      placeholder="SCAN INVENTORY..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-obsidian-950 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-cyber-lime/30 focus:bg-obsidian-900 transition-all font-mono text-xs uppercase tracking-widest placeholder:text-on-surface-variant/20"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleSelectCategory(cat)}
                        className={`px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest border transition-all ${
                          selectedCategory === cat 
                            ? 'bg-cyber-lime border-cyber-lime text-black shadow-[0_0_15px_rgba(188,255,95,0.3)]' 
                            : 'bg-white/5 border-white/10 text-on-surface-variant hover:border-white/20'
                        }`}
                      >
                        {cat === 'Beverage' ? 'Drinks' : cat === 'All' ? 'Full Sync' : cat}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsAddingCategory(true)}
                      className="px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest border border-white/10 bg-white/5 text-cyber-lime hover:bg-cyber-lime/10 transition-all flex items-center gap-2"
                    >
                      <Plus size={12} /> New Group
                    </button>
                  </div>

                  {isAddingCategory && (
                    <div className="flex gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                      <input 
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="CATEGORY NAME..."
                        className="flex-1 bg-obsidian-950 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono uppercase tracking-widest outline-none focus:border-cyber-lime/30"
                      />
                      <button 
                        onClick={handleAddCategory}
                        className="bg-cyber-lime text-black px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest"
                      >
                        Add
                      </button>
                      <button 
                        onClick={() => setIsAddingCategory(false)}
                        className="text-on-surface-variant/40 hover:text-white px-2"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {isAddingItem && (
                    <div className="flex flex-col gap-3 p-4 bg-cyber-lime/5 rounded-xl border border-cyber-lime/20 animate-in slide-in-from-top duration-300">
                      <p className="text-[10px] font-mono text-cyber-lime uppercase tracking-[0.2em] mb-1">Add Product to [{selectedCategory}]</p>
                      <div className="flex gap-2">
                        <input 
                          autoFocus
                          value={newItemData.name}
                          onChange={(e) => setNewItemData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="ITEM NAME..."
                          className="flex-[2] bg-obsidian-950 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono uppercase tracking-widest outline-none focus:border-cyber-lime/50"
                        />
                        <input 
                          type="number"
                          value={newItemData.price}
                          onChange={(e) => setNewItemData(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="PRICE..."
                          className="flex-1 bg-obsidian-950 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono uppercase tracking-widest outline-none focus:border-cyber-lime/50"
                        />
                        <button 
                          onClick={handleAddNewItem}
                          className="bg-cyber-lime text-black px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(188,255,95,0.2)]"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setIsAddingItem(false)}
                          className="text-on-surface-variant/40 hover:text-white px-2"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {filteredItems.length === 0 && !isAddingItem && (
                    <div className="h-40 flex flex-col items-center justify-center text-center opacity-40">
                      <p className="font-mono text-[10px] uppercase tracking-[0.3em]">No items in this sector</p>
                      <button 
                        onClick={() => setIsAddingItem(true)}
                        className="mt-4 text-[10px] font-bold text-cyber-lime uppercase tracking-widest hover:underline"
                      >
                        + Add First Item
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredItems.map((item) => (
                      <div 
                        key={item.id}
                        className="flex flex-col p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-all group"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2.5 bg-white/5 rounded-lg text-on-surface-variant group-hover:text-cyber-lime transition-colors">
                            {item.category === 'Beverage' ? <Coffee size={18} /> : <Utensils size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs uppercase tracking-normal truncate group-hover:text-cyber-lime transition-colors">{item.name}</h4>
                            <p className="text-[10px] font-mono text-on-surface-variant/40 uppercase tracking-widest pt-0.5">₹{item.price.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-auto">
                          <div className="flex items-center bg-obsidian-950 rounded-lg p-1 border border-white/5 flex-1 justify-between">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 px-2 hover:text-cyber-lime transition-colors text-on-surface-variant"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-mono text-xs font-bold text-cyber-lime">{quantities[item.id] || 1}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 px-2 hover:text-cyber-lime transition-colors text-on-surface-variant"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => addToCart(item)}
                            className="bg-cyber-lime/10 text-cyber-lime p-2 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-cyber-lime hover:text-black transition-all border border-cyber-lime/20"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cart Section (The Sidebar) */}
              {(() => {
                const playersList = (table.player || '').split(',').map(s => s.trim()).filter(Boolean);
                const hasMultipleRecipients = playersList.length > 1;

                return (
                  <div className="w-80 flex flex-col bg-obsidian-900 border-l border-white/5">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                      <h4 className="font-mono text-xs font-bold text-on-surface-variant uppercase tracking-[0.2em] flex items-center gap-2">
                        Current Order <span className="bg-cyber-lime/20 text-cyber-lime px-2 py-0.5 rounded-full text-[9px]">{cart.length}</span>
                      </h4>
                    </div>

                    {hasMultipleRecipients && (
                      <div className="px-6 py-4 border-b border-white/5 bg-cyber-lime/[0.01]">
                        <span className="block font-mono text-[9px] text-cyber-lime/75 uppercase tracking-[0.15em] font-bold mb-2.5">
                          Order Recipient
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            key="all-recipient"
                            type="button"
                            onClick={() => setSelectedRecipient('All')}
                            className={`px-2.5 py-1 rounded-md text-[9px] font-mono uppercase tracking-wider border font-bold transition-all ${
                              selectedRecipient === 'All'
                                ? 'bg-cyber-lime border-cyber-lime text-black shadow-[0_0_10px_rgba(188,255,95,0.25)]'
                                : 'bg-white/5 border-white/10 text-on-surface-variant/70 hover:border-white/20'
                            }`}
                          >
                            ALL (Shared)
                          </button>
                          {playersList.map((p, pIdx) => (
                            <button
                              key={`p-${pIdx}`}
                              type="button"
                              onClick={() => setSelectedRecipient(p)}
                              className={`px-2.5 py-1 rounded-md text-[9px] font-mono uppercase tracking-wider border font-bold transition-all ${
                                selectedRecipient === p
                                  ? 'bg-cyber-lime border-cyber-lime text-black shadow-[0_0_10px_rgba(188,255,95,0.25)]'
                                  : 'bg-white/5 border-white/10 text-on-surface-variant/70 hover:border-white/20'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-20">
                          <ShoppingBag size={40} className="text-on-surface-variant" />
                          <p className="font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                            Order stream empty.<br/>Select items to begin.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cart.map((cartItem) => {
                            const recipientLabel = cartItem.assignedToPlayerName || 'All';
                            const keySpec = `${cartItem.item.id}-${recipientLabel}`;
                            return (
                              <div key={keySpec} className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex justify-between items-center group">
                                <div className="max-w-[150px]">
                                  <p className="text-[10px] font-bold uppercase tracking-tight flex flex-wrap items-center gap-1.5">
                                    <span>{cartItem.item.name}</span>
                                    {hasMultipleRecipients && (
                                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold uppercase tracking-wider leading-none ${
                                        recipientLabel === 'All'
                                          ? 'bg-white/10 text-white/50 border border-white/10'
                                          : 'bg-cyber-lime/15 text-cyber-lime border border-cyber-lime/25'
                                      }`}>
                                        For: {recipientLabel}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[9px] font-mono text-on-surface-variant/40 mt-0.5">
                                    {cartItem.quantity}x ₹{cartItem.item.price.toFixed(2)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-mono font-bold text-on-surface">₹{(cartItem.item.price * cartItem.quantity).toFixed(2)}</span>
                                  <button 
                                    onClick={() => removeFromCart(cartItem.item.id, cartItem.assignedToPlayerName)}
                                    className="p-1.5 text-on-surface-variant/40 hover:text-pulse-red transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer / Confirm */}
                    <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                      <div className="flex justify-between items-center mb-6">
                        <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">Aggregate Total</span>
                        <span className="text-2xl font-mono font-bold text-cyber-lime">₹{cartTotal.toFixed(2)}</span>
                      </div>

                      <button 
                        onClick={handleConfirmOrder}
                        disabled={cart.length === 0}
                        className="w-full py-4 bg-cyber-lime text-black font-bold uppercase tracking-[0.2em] text-xs shadow-[0_0_20px_rgba(188,255,95,0.2)] hover:shadow-[0_0_40px_rgba(188,255,95,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-20 disabled:shadow-none disabled:hover:scale-100 transition-all flex items-center justify-center gap-3"
                      >
                        Confirm Order <Zap size={16} fill="currentColor" />
                      </button>
                      
                      <p className="mt-4 text-[9px] font-mono text-on-surface-variant/30 uppercase tracking-[0.1em] text-center leading-normal">
                        Proceeding will commit this sum to the active table session balance.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
