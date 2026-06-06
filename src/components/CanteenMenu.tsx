import React, { useState } from 'react';
import { Coffee, CupSoda, Utensils, Zap, IceCream, Search, Plus, X, History, Clock, Edit, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { SnookerTable, MenuItem, AdminRole, Transaction, AdminAccount } from '../types';
import { CAFE_MENU } from '../constants';
import CafeOrderModal from './CanteenOrderModal';
import { supabaseService } from '../services/supabaseService';

interface CafeMenuProps {
  tables: SnookerTable[];
  menuItems: MenuItem[];
  categories: string[];
  onAddOrder?: (tableId: string, item: MenuItem, quantity: number) => void;
  onAddMenuItem?: (item: Omit<MenuItem, 'id'>) => void;
  onDeleteMenuItem?: (id: string) => void;
  onUpdateMenuItem?: (item: MenuItem) => void;
  onDeleteCategory?: (name: string) => void;
  role?: AdminRole;
  permissions?: AdminAccount['permissions'];
  transactions?: Transaction[];
  deletingMenuItemId?: string | null;
}

export default function CafeMenu({ tables, menuItems, categories: propCategories, onAddOrder, onAddMenuItem, onDeleteMenuItem, onUpdateMenuItem, onDeleteCategory, role, permissions, transactions, deletingMenuItemId }: CafeMenuProps) {
  const finalPermissions = permissions || (role === 'admin2' ? 'CAFE' : role === 'admin1' ? 'SNOOKER' : 'BOTH');
  const canManage = finalPermissions !== 'SNOOKER';
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: propCategories[0] || 'Beverage' });

  const fulfilledOrders = React.useMemo(() => {
    return (transactions || [])
      .filter(t => t.items && t.items.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions]);

  const activeCafeOrdersCount = React.useMemo(() => {
    return tables.reduce((sum, t) => sum + (t.currentCart || []).reduce((s, ci) => s + (ci.quantity || 1), 0), 0);
  }, [tables]);

  const handleOpenOrder = (item: MenuItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleConfirmOrder = (tableId: string, quantity: number) => {
    if (selectedItem && onAddOrder) {
      onAddOrder(tableId, selectedItem, quantity);
    }
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      price: String(item.price),
      category: item.category
    });
    setIsAddingItem(true);
  };

  const handleAddItem = () => {
    if (newItem.name && newItem.price) {
      if (editingItem) {
        const updatedItem = {
          ...editingItem,
          name: newItem.name,
          price: parseFloat(newItem.price),
          category: newItem.category
        };
        if (onUpdateMenuItem) {
          onUpdateMenuItem(updatedItem);
        } else {
          supabaseService.updateMenuItem(updatedItem);
        }
        setEditingItem(null);
      } else {
        if (onAddMenuItem) {
          onAddMenuItem({
            name: newItem.name,
            price: parseFloat(newItem.price),
            category: newItem.category
          });
        }
      }
      setIsAddingItem(false);
      // Reset name/price but keep the category we just used to make adding multiple items easier
      setNewItem(prev => ({ ...prev, name: '', price: '' }));
    }
  };

  const handleCancelAddOrEdit = () => {
    setIsAddingItem(false);
    setNewItem({ name: '', price: '', category: propCategories[0] || 'Beverage' });
    setEditingItem(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete.id;
    if (onDeleteMenuItem) {
      onDeleteMenuItem(id);
    } else {
      await supabaseService.deleteMenuItem(id);
    }
    setItemToDelete(null);
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      const name = newCategoryName.trim();
      setSelectedCategory(name);
      setIsAddingCategory(false);
      setNewCategoryName('');
      setIsAddingItem(true);
      setNewItem(prev => ({ ...prev, category: name }));
    }
  };

  const handleDeleteCategoryClick = (categoryName: string) => {
    setCategoryToDelete(categoryName);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    if (selectedCategory === categoryToDelete) {
      setSelectedCategory('All');
    }
    if (onDeleteCategory) {
      onDeleteCategory(categoryToDelete);
    } else {
      await supabaseService.deleteMenuCategory(categoryToDelete);
    }
    setCategoryToDelete(null);
  };

  const categories = ['All', ...propCategories];
  if (selectedCategory !== 'All' && !categories.includes(selectedCategory)) {
    categories.push(selectedCategory);
  }

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (cat !== 'All') {
      setNewItem(prev => ({ ...prev, category: cat }));
    }
  };

  return (
    <div className="px-10 pb-20">
      <div className="mb-12 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="relative group w-full lg:max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-cyber-lime transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search cafe inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-cyber-lime/30 focus:bg-white/[0.07] transition-all font-mono text-sm uppercase tracking-widest placeholder:text-on-surface-variant/20"
          />
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-full items-center gap-1">
          {categories.map((cat) => (
            <div 
              key={cat} 
              className={`flex items-center rounded-lg transition-all ${
                selectedCategory === cat 
                  ? 'bg-cyber-lime text-black shadow-[0_0_15px_rgba(188,255,95,0.3)]' 
                  : 'hover:bg-white/5'
              }`}
            >
              <button
                onClick={() => handleSelectCategory(cat)}
                className={`px-5 py-2 font-mono text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'text-black' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {cat === 'All' ? 'Full Menu' : `${cat}s`}
              </button>
              {cat !== 'All' && canManage && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategoryClick(cat);
                  }}
                  className={`pr-3 pl-1 py-2 flex items-center justify-center transition-colors ${
                    selectedCategory === cat
                      ? 'text-black/60 hover:text-red-700'
                      : 'text-on-surface-variant/40 hover:text-pulse-red'
                  }`}
                  title={`Delete Category ${cat}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="px-4 py-2 text-cyber-lime hover:bg-white/5 rounded-lg transition-all"
            title="Add Category"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {isAddingCategory && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8 p-6 glass-technical rounded-xl border-cyber-lime/20 overflow-hidden"
        >
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="block font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 mb-2">New Sector ID</label>
              <input 
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="ENTER CATEGORY NAME..."
                className="w-full bg-obsidian-950 border border-white/10 rounded-lg px-4 py-3 text-xs font-mono uppercase tracking-[0.2em] outline-none focus:border-cyber-lime/50"
              />
            </div>
            <div className="flex gap-2 pt-5">
              <button 
                onClick={handleAddCategory}
                className="bg-cyber-lime text-black px-8 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg"
              >
                Establish
              </button>
              <button 
                onClick={() => setIsAddingCategory(false)}
                className="p-3 text-on-surface-variant/40 hover:text-pulse-red transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {isAddingItem && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-8 p-6 glass-technical rounded-xl border-cyber-lime/20 overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 mb-2">Item Designation</label>
              <input 
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                placeholder="PRODUCT NAME..."
                className="w-full bg-obsidian-950 border border-white/10 rounded-lg px-4 py-3 text-xs font-mono uppercase tracking-widest outline-none focus:border-cyber-lime/50"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 mb-2">Credit Value (₹)</label>
              <input 
                type="number"
                value={newItem.price}
                onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                placeholder="PRICE..."
                className="w-full bg-obsidian-950 border border-white/10 rounded-lg px-4 py-3 text-xs font-mono uppercase tracking-widest outline-none focus:border-cyber-lime/50"
              />
            </div>
            <div>
              <label className="block font-mono text-[9px] uppercase tracking-widest text-on-surface-variant/60 mb-2">Sector Assignment</label>
              <select 
                value={newItem.category}
                onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-obsidian-950 border border-white/10 rounded-lg px-4 py-3 text-xs font-mono uppercase tracking-widest outline-none focus:border-cyber-lime/50 text-white"
              >
                {categories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleAddItem}
                className="flex-1 bg-cyber-lime text-black py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-lg"
              >
                {editingItem ? 'Update Item' : 'Log Entry'}
              </button>
              <button 
                onClick={handleCancelAddOrEdit}
                className="p-3 text-on-surface-variant/40 hover:text-pulse-red transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="mb-8 flex justify-end">
        {!isAddingItem && !isAddingCategory && (
          <button 
            onClick={() => setIsAddingItem(true)}
            className="flex items-center gap-2 px-6 py-3 bg-cyber-lime/10 text-cyber-lime border border-cyber-lime/30 rounded-xl font-mono text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-cyber-lime hover:text-black transition-all group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Add New Inventory
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-technical p-6 rounded-xl border-white/5 hover:border-cyber-lime/30 group transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-lg text-on-surface-variant group-hover:text-cyber-lime transition-colors">
                {item.category === 'Beverage' ? <Coffee size={20} /> : item.category === 'Snack' ? <Utensils size={20} /> : <IceCream size={20} />}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-mono text-[9px] text-on-surface-variant/40 uppercase tracking-widest pt-1">
                  ID: {item.id.slice(0, 4)}
                </span>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(item);
                      }}
                      className="p-1.5 text-on-surface-variant/50 hover:text-cyber-lime hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                      title="Edit Menu Item"
                    >
                      <Edit size={14} />
                    </button>
                    <button 
                      disabled={deletingMenuItemId === item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                      }}
                      className={`p-1.5 transition-all text-on-surface-variant/50 cursor-pointer z-10 ${
                        deletingMenuItemId === item.id 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:text-pulse-red hover:scale-110 active:scale-95'
                      }`}
                      title="Delete Menu Item"
                    >
                      {deletingMenuItemId === item.id ? (
                        <Loader2 size={14} className="animate-spin text-pulse-red" />
                      ) : (
                        <X size={14} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-on-surface mb-1 group-hover:text-cyber-lime transition-colors uppercase tracking-tight">
                {item.name}
              </h3>
              <p className="font-mono text-[10px] text-on-surface-variant/60 uppercase tracking-widest mb-6">
                {item.category}
              </p>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold font-mono text-cyber-lime">
                ₹{item.price.toFixed(2)}
              </span>
              <button 
                onClick={() => handleOpenOrder(item)}
                className="bg-white/5 hover:bg-cyber-lime hover:text-black px-4 py-2 rounded font-mono text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                Add Order
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <CafeOrderModal 
        isOpen={isModalOpen}
        item={selectedItem}
        tables={tables}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmOrder}
        role={role}
        permissions={finalPermissions}
      />

      {/* Custom Delete Confirmation Modal */}
      {itemToDelete && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-obsidian-900 border border-pulse-red/30 p-8 rounded-2xl shadow-2xl relative"
          >
            <div className="flex items-center gap-4 text-pulse-red mb-6">
              <div className="p-3 bg-pulse-red/10 rounded-lg">
                <X size={24} className="text-pulse-red" />
              </div>
              <div>
                <h3 className="font-mono text-xs uppercase tracking-widest text-on-surface-variant/60">CONFIRM INVENTORY PURGE</h3>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Decommission Item?</h2>
              </div>
            </div>

            <p className="text-sm text-on-surface-variant/80 mb-8 leading-relaxed">
              Are you sure you want to permanently delete <span className="text-white font-semibold">"{itemToDelete.name}"</span>?
              This action belongs to a destructive administrative clearance and cannot be undone.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                id="cancel-delete-btn"
                onClick={() => setItemToDelete(null)}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest transition-colors text-on-surface cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                disabled={deletingMenuItemId === itemToDelete.id}
                onClick={handleConfirmDelete}
                className="flex items-center gap-2 px-6 py-3 bg-pulse-red hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
              >
                {deletingMenuItemId === itemToDelete.id ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Purging...
                  </>
                ) : (
                  "Delete Item"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Custom Category Delete Confirmation Modal */}
      {categoryToDelete && (() => {
        const itemsInCategory = menuItems.filter(item => item.category === categoryToDelete);
        return (
          <div id="category-delete-confirm-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-obsidian-900 border border-pulse-red/30 p-8 rounded-2xl shadow-2xl relative"
            >
              <div className="flex items-center gap-4 text-pulse-red mb-6">
                <div className="p-3 bg-pulse-red/10 rounded-lg">
                  <AlertTriangle size={24} className="text-pulse-red" />
                </div>
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-widest text-on-surface-variant/60">CONFIRM CATEGORY PURGE</h3>
                  <h2 className="text-lg font-bold text-white uppercase tracking-tight">Decommission Category?</h2>
                </div>
              </div>

              <p className="text-sm text-on-surface-variant/80 mb-4 leading-relaxed">
                Are you sure you want to permanently delete the category <span className="text-white font-semibold">"{categoryToDelete}"</span>?
              </p>

              {itemsInCategory.length > 0 && (
                <div className="mb-6 p-4 bg-red-950/20 border border-pulse-red/20 rounded-xl">
                  <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-2">
                    ⚠️ WARNING: {itemsInCategory.length} item(s) lose active filters:
                  </p>
                  <ul className="text-xs text-on-surface-variant/70 space-y-1 max-h-24 overflow-y-auto list-disc pl-4 font-mono">
                    {itemsInCategory.map(itm => (
                      <li key={itm.id}>{itm.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-on-surface-variant/60 mb-8 font-mono">
                This database deletion belongs to administrative authorization tier and cannot be undone.
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  id="cancel-category-delete-btn"
                  onClick={() => setCategoryToDelete(null)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest transition-colors text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-category-delete-btn"
                  onClick={handleConfirmDeleteCategory}
                  className="px-6 py-3 bg-pulse-red hover:bg-red-700 text-white rounded-xl font-mono text-[10px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
                >
                  Delete Category
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

    </div>
  );
}
