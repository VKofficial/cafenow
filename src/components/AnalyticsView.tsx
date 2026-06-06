import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Filter, Coffee, Utensils, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction, Expenditure } from '../types';

const isRealCafeItem = (item: any) => {
  if (!item || !item.name) return false;
  const nameLower = item.name.toLowerCase();
  
  // Specific exclusions for system/billing non-cafe operations
  if (nameLower.includes('split bill share') ||
      nameLower.includes('member due') ||
      nameLower.includes('due settle') ||
      nameLower.includes('pay later') ||
      nameLower.includes('fallback') ||
      (nameLower.startsWith('split bill') && !nameLower.includes('(shared)'))) {
    return false;
  }
  
  return true;
};

interface AnalyticsViewProps {
  transactions: Transaction[];
  expenditures: Expenditure[];
  subscriptionPlan?: 'cafe_only' | 'snooker_only' | 'full';
}

type TimeFrame = 'Daily' | 'Weekly' | 'Monthly';

export default function AnalyticsView({ transactions, expenditures, subscriptionPlan = 'full' }: AnalyticsViewProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('Daily');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'PAY_LATER'>('ALL');
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeTransactions = useMemo(() => {
    let list = transactions;
    if (useCustomRange) {
      if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        list = list.filter(t => new Date(t.date) >= start);
      }
      if (endDate) {
        const end = new Date(endDate + 'T23:59:59');
        list = list.filter(t => new Date(t.date) <= end);
      }
    }

    // Adapt transaction amounts based on subscription plan
    return list.map(t => {
      const cafeItems = t.items?.filter(isRealCafeItem) || [];
      const cafeAmount = cafeItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      
      if (subscriptionPlan === 'snooker_only') {
        return {
          ...t,
          amount: Math.max(0, t.amount - cafeAmount)
        };
      } else if (subscriptionPlan === 'cafe_only') {
        return {
          ...t,
          amount: cafeAmount
        };
      }
      return t;
    }).filter(t => t.amount > 0);
  }, [transactions, useCustomRange, startDate, endDate, subscriptionPlan]);

  const activeExpenditures = useMemo(() => {
    let list = expenditures;
    if (useCustomRange) {
      if (startDate) {
        const start = new Date(startDate + 'T00:00:00');
        list = list.filter(e => new Date(e.date) >= start);
      }
      if (endDate) {
        const end = new Date(endDate + 'T23:59:59');
        list = list.filter(e => new Date(e.date) <= end);
      }
    }

    return list.filter(e => {
      const desc = (e.description || '').toLowerCase();
      const isCafeExpense = e.category === 'Supplies' || 
                            desc.includes('cafe') || 
                            desc.includes('food') || 
                            desc.includes('drink') || 
                            desc.includes('coke') || 
                            desc.includes('coffee') || 
                            desc.includes('tea') || 
                            desc.includes('canteen') || 
                            desc.includes('beverage') || 
                            desc.includes('kitchen') || 
                            desc.includes('snack');
      
      if (subscriptionPlan === 'cafe_only') {
        return isCafeExpense;
      } else if (subscriptionPlan === 'snooker_only') {
        return !isCafeExpense;
      }
      return true;
    });
  }, [expenditures, useCustomRange, startDate, endDate, subscriptionPlan]);

  const handleQuickRange = (rangeType: '7days' | '30days' | 'thisMonth' | 'lastMonth' | 'clear') => {
    if (rangeType === 'clear') {
      setUseCustomRange(false);
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

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    setStartDate(startStr);
    setEndDate(endStr);
    setUseCustomRange(true);
  };

  const processedData = useMemo(() => {
    const dataMap: Record<string, { label: string, income: number, expense: number }> = {};

    const getLocalYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Helper to get start of week
    const getStartOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      return new Date(d.setDate(diff));
    };

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      if (timeFrame === 'Daily') {
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      } else if (timeFrame === 'Weekly') {
        const start = getStartOfWeek(date);
        return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    };

    const getKey = (dateStr: string) => {
      const date = new Date(dateStr);
      if (timeFrame === 'Daily') {
        return getLocalYMD(date);
      } else if (timeFrame === 'Weekly') {
        const start = getStartOfWeek(date);
        return getLocalYMD(start);
      } else {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }
    };

    // Filter transactions by payment method
    const filteredTransactions = paymentMethodFilter === 'ALL' 
      ? activeTransactions 
      : activeTransactions.filter(t => t.paymentMethod === paymentMethodFilter);

    // Filter expenditures by payment method
    const filteredExpenditures = paymentMethodFilter === 'ALL' 
      ? activeExpenditures 
      : activeExpenditures.filter(e => (e.paymentMethod || 'CASH') === paymentMethodFilter);

    // Process Income (Filtered Transactions)
    filteredTransactions.forEach(t => {
      const key = getKey(t.date);
      if (!dataMap[key]) {
        dataMap[key] = { label: formatDate(t.date), income: 0, expense: 0 };
      }
      dataMap[key].income += t.amount;
    });

    // Process Expenses (Filtered Expenditures)
    filteredExpenditures.forEach(e => {
      const key = getKey(e.date);
      if (!dataMap[key]) {
        dataMap[key] = { label: formatDate(e.date), income: 0, expense: 0 };
      }
      dataMap[key].expense += e.amount;
    });

    // Convert to array and sort by key
    const result = Object.entries(dataMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => ({
        ...data,
        profit: data.income - data.expense
      }));

    return useCustomRange ? result : result.slice(-15); // Show last 15 points on automated, all on custom
  }, [activeTransactions, activeExpenditures, timeFrame, paymentMethodFilter, useCustomRange]);

  const summary = useMemo(() => {
    const filteredTransactions = paymentMethodFilter === 'ALL' 
      ? activeTransactions 
      : activeTransactions.filter(t => t.paymentMethod === paymentMethodFilter);

    const filteredExpenditures = paymentMethodFilter === 'ALL' 
      ? activeExpenditures 
      : activeExpenditures.filter(e => (e.paymentMethod || 'CASH') === paymentMethodFilter);

    const totalIncome = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = filteredExpenditures.reduce((acc, e) => acc + e.amount, 0);
    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense
    };
  }, [activeTransactions, activeExpenditures, paymentMethodFilter]);

  // Compute today's specific metrics (regardless of overall filter state to stay accurate)
  const todayMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Fallback support for local date components
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const localTodayStr = `${year}-${month}-${day}`;

    const todayTransactions = transactions.filter(t => {
      const tStr = (t.date || '').split('T')[0];
      return tStr === todayStr || tStr === localTodayStr;
    });

    const todayExpenditures = expenditures.filter(e => {
      const eStr = (e.date || '').split('T')[0];
      return eStr === todayStr || eStr === localTodayStr;
    });

    const income = todayTransactions.reduce((acc, t) => acc + t.amount, 0);
    const expense = todayExpenditures.reduce((acc, e) => acc + e.amount, 0);

    return {
      income,
      expense,
      profit: income - expense,
      transactionCount: todayTransactions.length
    };
  }, [transactions, expenditures]);

  const paymentMethodBreakdown = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const localDate = new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const localTodayStr = `${year}-${month}-${day}`;

    const isToday = (dateStr: string) => {
      const dStr = (dateStr || '').split('T')[0];
      return dStr === todayStr || dStr === localTodayStr;
    };

    const methods: ('CASH' | 'UPI' | 'PAY_LATER')[] = ['CASH', 'UPI', 'PAY_LATER'];

    return methods.map(method => {
      const todayTx = transactions.filter(t => t.paymentMethod === method && isToday(t.date));
      const todayInc = todayTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const totalTx = activeTransactions.filter(t => t.paymentMethod === method);
      const totalInc = totalTx.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const todayExp = expenditures.filter(e => (e.paymentMethod || 'CASH') === method && isToday(e.date));
      const todayExpAmount = todayExp.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const totalExp = activeExpenditures.filter(e => (e.paymentMethod || 'CASH') === method);
      const totalExpAmount = totalExp.reduce((sum, e) => sum + Number(e.amount || 0), 0);

      return {
        method,
        todayIncome: todayInc,
        totalIncome: totalInc,
        totalExpense: totalExpAmount,
        netProfit: totalInc - totalExpAmount
      };
    });
  }, [transactions, activeTransactions, expenditures, activeExpenditures]);

  // Compute continuous profit history for the trend line (30-day or custom date range)
  const profitTrendData = useMemo(() => {
    const dataMap: Record<string, { label: string; income: number; expense: number }> = {};
    
    const getLocalYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let rangeDates: Date[] = [];
    if (useCustomRange && startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      const current = new Date(start);
      // Limit to max 366 days to avoid browser freezing in case of massive ranges
      let safetyCounter = 0;
      while (current <= end && safetyCounter < 366) {
        rangeDates.push(new Date(current));
        current.setDate(current.getDate() + 1);
        safetyCounter++;
      }
    } else {
      // Default last 30 days
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        rangeDates.push(d);
      }
    }

    rangeDates.forEach(d => {
      const keyStr = getLocalYMD(d);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      dataMap[keyStr] = { label, income: 0, expense: 0 };
    });

    // Accumulate total income on matching days
    activeTransactions.forEach(t => {
      const date = new Date(t.date);
      const keyStr = getLocalYMD(date);
      if (dataMap[keyStr]) {
        dataMap[keyStr].income += t.amount;
      }
    });

    // Accumulate total expenses on matching days
    activeExpenditures.forEach(e => {
      const date = new Date(e.date);
      const keyStr = getLocalYMD(date);
      if (dataMap[keyStr]) {
        dataMap[keyStr].expense += e.amount;
      }
    });

    // Sort chronologically
    return Object.entries(dataMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, val]) => ({
        dateKey,
        label: val.label,
        income: val.income,
        expense: val.expense,
        profit: val.income - val.expense
      }));
  }, [activeTransactions, activeExpenditures, useCustomRange, startDate, endDate]);

  // profit trend metrics
  const profitTrendStats = useMemo(() => {
    if (profitTrendData.length === 0) return { positiveDays: 0, highestProfit: 0, averageProfit: 0 };
    const profits = profitTrendData.map(d => d.profit);
    const positiveDays = profitTrendData.filter(d => d.profit > 0).length;
    const highestProfit = Math.max(...profits, 0);
    const averageProfit = profits.reduce((acc, p) => acc + p, 0) / profitTrendData.length;
    
    return {
      positiveDays,
      highestProfit,
      averageProfit
    };
  }, [profitTrendData]);

  // Compute Cafe-only performance data based on chosen timeFrame
  const cafeData = useMemo(() => {
    const dataMap: Record<string, { label: string; income: number; expense: number }> = {};

    const getLocalYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getStartOfWeek = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    };

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      if (timeFrame === 'Daily') {
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      } else if (timeFrame === 'Weekly') {
        const start = getStartOfWeek(date);
        return `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    };

    const getKey = (dateStr: string) => {
      const date = new Date(dateStr);
      if (timeFrame === 'Daily') {
        return getLocalYMD(date);
      } else if (timeFrame === 'Weekly') {
        const start = getStartOfWeek(date);
        return getLocalYMD(start);
      } else {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }
    };

    // Aggregate Cafe Income from transaction items
    activeTransactions.forEach(t => {
      if (!t.items || t.items.length === 0) return;
      const key = getKey(t.date);
      if (!dataMap[key]) {
        dataMap[key] = { label: formatDate(t.date), income: 0, expense: 0 };
      }
      
      const realItems = t.items.filter(isRealCafeItem);
      const itemsSum = realItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      dataMap[key].income += itemsSum;
    });

    // Aggregate Cafe Expenses
    activeExpenditures.forEach(e => {
      const desc = (e.description || '').toLowerCase();
      const isCafeExpense = e.category === 'Supplies' || 
                            desc.includes('cafe') || 
                            desc.includes('food') || 
                            desc.includes('drink') || 
                            desc.includes('coke') || 
                            desc.includes('coffee') || 
                            desc.includes('tea') || 
                            desc.includes('canteen') || 
                            desc.includes('beverage') || 
                            desc.includes('kitchen') || 
                            desc.includes('snack');
      
      if (!isCafeExpense) return;
      const key = getKey(e.date);
      if (!dataMap[key]) {
        dataMap[key] = { label: formatDate(e.date), income: 0, expense: 0 };
      }
      dataMap[key].expense += e.amount;
    });

    const result = Object.entries(dataMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, data]) => ({
        ...data,
        profit: data.income - data.expense
      }));

    return useCustomRange ? result : result.slice(-15);
  }, [activeTransactions, activeExpenditures, timeFrame, useCustomRange]);

  // Aggregate global Cafe parameters
  const cafeStats = useMemo(() => {
    let totalCafeIncome = 0;
    let totalCafeExpense = 0;

    activeTransactions.forEach(t => {
      if (t.items) {
        const realItems = t.items.filter(isRealCafeItem);
        totalCafeIncome += realItems.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
      }
    });

    activeExpenditures.forEach(e => {
      const desc = (e.description || '').toLowerCase();
      const isCafeExpense = e.category === 'Supplies' || 
                            desc.includes('cafe') || 
                            desc.includes('food') || 
                            desc.includes('drink') || 
                            desc.includes('coke') || 
                            desc.includes('coffee') || 
                            desc.includes('tea') || 
                            desc.includes('canteen') || 
                            desc.includes('beverage') || 
                            desc.includes('kitchen') || 
                            desc.includes('snack');
      if (isCafeExpense) {
        totalCafeExpense += e.amount;
      }
    });

    const netProfit = totalCafeIncome - totalCafeExpense;
    const marginPercent = totalCafeIncome > 0 ? (netProfit / totalCafeIncome) * 100 : 0;

    return {
      totalCafeIncome,
      totalCafeExpense,
      netProfit,
      marginPercent
    };
  }, [activeTransactions, activeExpenditures]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const income = payload[0].value;
      const expense = payload[1]?.value || 0;
      const profit = income - expense;
      
      return (
        <div className="glass-technical p-4 border-neon-blue/30 rounded-lg shadow-xl animate-fade-in">
          <p className="font-mono text-xs text-on-surface-variant uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1">
            <p className="flex justify-between gap-8 items-center text-neon-blue">
              <span className="text-[10px] font-bold">INCOME:</span>
              <span className="font-mono font-bold">₹{income.toFixed(2)}</span>
            </p>
            <p className="flex justify-between gap-8 items-center text-neon-pink">
              <span className="text-[10px] font-bold">EXPENSE:</span>
              <span className="font-mono font-bold">₹{expense.toFixed(2)}</span>
            </p>
            <div className="pt-2 mt-2 border-t border-white/10">
              <p className={`flex justify-between gap-8 items-center ${profit >= 0 ? 'text-cyber-lime' : 'text-neon-pink'}`}>
                <span className="text-[10px] font-bold">PROFIT:</span>
                <span className="font-mono font-bold">₹{profit.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const ProfitTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const profit = payload[0].value;
      const data = payload[0].payload;
      return (
        <div className="glass-technical p-4 border-cyber-lime/30 rounded-lg shadow-xl animate-fade-in">
          <p className="font-mono text-xs text-on-surface-variant uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <p className="flex justify-between gap-6 items-center text-on-surface-variant/70">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Day's Income:</span>
              <span className="font-mono">₹{data.income.toFixed(2)}</span>
            </p>
            <p className="flex justify-between gap-6 items-center text-on-surface-variant/70">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant">Day's Expense:</span>
              <span className="font-mono">₹{data.expense.toFixed(2)}</span>
            </p>
            <div className="pt-2 mt-2 border-t border-white/10">
              <p className={`flex justify-between gap-6 items-center font-bold ${profit >= 0 ? 'text-cyber-lime' : 'text-neon-pink'}`}>
                <span className="text-[10px] uppercase font-bold">Net Profit:</span>
                <span className="font-mono">₹{profit.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CafeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const income = payload[0]?.value || 0;
      const expense = payload[1]?.value || 0;
      const profit = income - expense;
      return (
        <div className="glass-technical p-4 border-purple-500/35 rounded-lg shadow-xl animate-fade-in">
          <p className="font-mono text-xs text-on-surface-variant uppercase tracking-wider mb-2">{label}</p>
          <div className="space-y-1">
            <p className="flex justify-between gap-8 items-center text-neon-blue">
              <span className="text-[10px] font-bold">CAFE INCOME:</span>
              <span className="font-mono font-bold">₹{income.toFixed(2)}</span>
            </p>
            <p className="flex justify-between gap-8 items-center text-neon-pink">
              <span className="text-[10px] font-bold">CAFE EXPENSE:</span>
              <span className="font-mono font-bold">₹{expense.toFixed(2)}</span>
            </p>
            <div className="pt-2 mt-2 border-t border-white/10">
              <p className={`flex justify-between gap-8 items-center ${profit >= 0 ? 'text-cyber-lime' : 'text-neon-pink'}`}>
                <span className="text-[10px] font-bold">NET MARGIN:</span>
                <span className="font-mono font-bold">₹{profit.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="px-10 py-6 space-y-8">
      {/* Dashboard Filters Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Payment Method Filters */}
        <div className="xl:col-span-5 flex flex-col justify-between gap-4 bg-on-surface/5 border border-outline/20 p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neon-blue/10 rounded-lg text-neon-blue">
              <Filter size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Payment Method Filter</h4>
              <p className="text-on-surface-variant font-mono text-[9px] uppercase tracking-widest mt-0.5">Filter income & expenditures</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { id: 'ALL', label: 'All Methods' },
              { id: 'CASH', label: 'Cash' },
              { id: 'UPI', label: 'UPI' },
              { id: 'PAY_LATER', label: 'Pay Later' }
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethodFilter(method.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold font-mono tracking-widest uppercase transition-all cursor-pointer ${
                  paymentMethodFilter === method.id 
                    ? 'bg-neon-blue text-on-primary shadow-lg shadow-neon-blue/20' 
                    : 'bg-on-surface/5 border border-outline/10 text-on-surface-variant hover:text-on-surface hover:border-outline/30'
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Filter */}
        <div className="xl:col-span-7 flex flex-col md:flex-row gap-5 bg-on-surface/5 border border-outline/20 p-5 rounded-2xl">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyber-lime/10 rounded-lg text-cyber-lime">
                <Calendar size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-wider">Profit Analysis Period</h4>
                <p className="text-on-surface-variant font-mono text-[9px] uppercase tracking-widest mt-0.5">
                  {useCustomRange && startDate && endDate 
                    ? `Active Range: ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : 'Displaying All-time aggregate values'}
                </p>
              </div>
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-mono font-bold text-on-surface-variant uppercase tracking-widest block">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setUseCustomRange(true);
                  }}
                  className="w-full bg-on-surface/5 border border-outline/10 hover:border-outline/30 focus:border-neon-blue/50 text-on-surface py-2 px-3 rounded-xl text-xs font-mono focus:outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-mono font-bold text-on-surface-variant uppercase tracking-widest block">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setUseCustomRange(true);
                  }}
                  className="w-full bg-on-surface/5 border border-outline/10 hover:border-outline/30 focus:border-neon-blue/50 text-on-surface py-2 px-3 rounded-xl text-xs font-mono focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-2.5 md:min-w-[180px]">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { type: '7days', label: 'Last 7 Days' },
                { type: '30days', label: 'Last 30 Days' },
                { type: 'thisMonth', label: 'This Month' },
                { type: 'lastMonth', label: 'Last Month' }
              ].map(preset => (
                <button
                  key={preset.type}
                  onClick={() => handleQuickRange(preset.type as any)}
                  className="px-2 py-1.5 rounded-lg text-[9px] font-bold font-mono tracking-wider uppercase border border-outline/10 hover:border-outline/30 hover:bg-on-surface/5 text-on-surface-variant hover:text-on-surface transition-all cursor-pointer text-center"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {useCustomRange && (
              <button
                onClick={() => handleQuickRange('clear')}
                className="w-full py-2 rounded-xl text-[9px] font-bold font-mono tracking-widest uppercase bg-neon-pink/15 hover:bg-neon-pink/25 border border-neon-pink/30 text-neon-pink transition-all cursor-pointer"
              >
                Clear Custom Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[
          { 
            title: 'Total Income', 
            value: summary.totalIncome, 
            icon: TrendingUp, 
            color: 'text-neon-blue', 
            bg: 'bg-neon-blue/10',
            border: 'border-neon-blue/20',
            description: 'All-time total sales'
          },
          { 
            title: 'Total Expenses', 
            value: summary.totalExpense, 
            icon: TrendingDown, 
            color: 'text-neon-pink', 
            bg: 'bg-neon-pink/10',
            border: 'border-neon-pink/20',
            description: 'All-time ops spend'
          },
        ].map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`glass p-6 rounded-2xl border ${item.border} relative overflow-hidden group`}
          >
            <div className={`absolute top-0 right-0 w-24 h-24 ${item.bg} blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity`} />
            <div className="flex items-center gap-4 relative z-10">
              <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                <item.icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-on-surface-variant font-mono text-[10px] uppercase tracking-widest truncate">{item.title}</p>
                <h3 className={`text-2xl font-bold font-mono mt-1 ${item.color} truncate`}>
                  ₹{item.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-on-surface-variant/50 font-mono text-[9px] uppercase mt-1 tracking-wider truncate">
                  {item.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* SECTION: Payment Method Breakdown Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-technical p-6 rounded-2xl border border-outline/10 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyber-lime/10 rounded-lg text-cyber-lime border border-cyber-lime/20">
            <Filter size={18} />
          </div>
          <div>
            <h4 className="text-base font-bold text-on-surface uppercase tracking-wider">Payment Channel Performance Breakdown</h4>
            <p className="text-on-surface-variant font-mono text-[9px] uppercase tracking-widest mt-0.5">Segregated metrics of transactions and expenditures</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs text-on-surface border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-on-surface-variant text-[10px] uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4 text-right">Today's Income</th>
                <th className="py-3 px-4 text-right">Total Income</th>
                <th className="py-3 px-4 text-right">Total Expense</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paymentMethodBreakdown.map((row) => {
                const isProfitPositive = row.netProfit >= 0;
                const methodLabel = row.method === 'CASH' ? 'Cash' : row.method === 'UPI' ? 'UPI' : 'Pay Later';
                const badgeColor = row.method === 'CASH' ? 'text-cyber-lime bg-cyber-lime/10 border-cyber-lime/20' : row.method === 'UPI' ? 'text-neon-blue bg-neon-blue/10 border-neon-blue/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20';

                return (
                  <tr key={row.method} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-sans font-bold text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${badgeColor}`}>
                        {methodLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-sm font-bold text-cyber-lime">
                      ₹{row.todayIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right text-sm font-bold text-neon-blue">
                      ₹{row.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right text-sm text-neon-pink">
                      ₹{row.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3.5 px-4 text-right text-sm font-bold ${isProfitPositive ? 'text-cyber-lime' : 'text-neon-pink'}`}>
                      ₹{row.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Main Chart Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-technical p-8 rounded-2xl border border-outline/10"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-on-surface/5 rounded-lg border border-outline/20">
               <Calendar size={18} className="text-neon-blue" />
             </div>
             <div>
                <h4 className="text-lg font-bold">Revenue Analytics</h4>
                <p className="text-on-surface-variant font-mono text-[10px] uppercase tracking-widest">Temporal Growth Matrix</p>
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 w-full md:w-auto md:justify-end">
            {/* Prominent Live Today Indicator requested */}
            <div className="flex items-center gap-3 bg-cyber-lime/10 border border-cyber-lime/20 px-4 py-2.5 rounded-xl">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-lime opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyber-lime"></span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant font-mono uppercase tracking-widest block">Today's Income</span>
                <span className="text-sm font-bold font-mono text-cyber-lime block mt-0.5">₹{todayMetrics.income.toLocaleString('en-IN', { minimumFractionDigits: 1 })}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-1 bg-on-surface/5 rounded-xl border border-outline/20">
              {['Daily', 'Weekly', 'Monthly'].map((frame) => (
                <button
                  key={frame}
                  onClick={() => setTimeFrame(frame as TimeFrame)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold font-mono tracking-widest uppercase transition-all ${
                    timeFrame === frame 
                      ? 'bg-neon-blue text-on-primary shadow-lg shadow-neon-blue/20' 
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {frame}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#ffffff40" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
                tickFormatter={(val) => val}
              />
              <YAxis 
                stroke="#ffffff40" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
              <Legend 
                verticalAlign="top" 
                align="right"
                wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                iconType="rect"
              />
              <Bar 
                dataKey="income" 
                name="Income" 
                fill="#00dbf2" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              >
                {processedData.map((_entry, index) => (
                  <Cell key={`cell-income-${index}`} fillOpacity={0.8} />
                ))}
              </Bar>
              <Bar 
                dataKey="expense" 
                name="Expenditure" 
                fill="#f43f5e" 
                radius={[4, 4, 0, 0]} 
                barSize={32}
              >
                {processedData.map((_entry, index) => (
                  <Cell key={`cell-expense-${index}`} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-neon-blue shadow-[0_0_8px_#00dbf2]" />
                 <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">Positive Cashflow</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-neon-pink shadow-[0_0_8px_#f43f5e]" />
                 <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">Resource Outflow</span>
              </div>
           </div>
           
           <div className="text-[10px] font-mono text-on-surface-variant/40 uppercase tracking-[0.2em] flex items-center gap-2">
              <Filter size={12} className="text-neon-blue/40" />
              Dataset Range: Last 15 Cycles ({timeFrame})
           </div>
        </div>
      </motion.div>



      {/* SECTION: Cafe-only Financial Performance */}
      {subscriptionPlan !== 'snooker_only' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-technical p-8 rounded-2xl border border-outline/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400">
                <Coffee size={18} />
              </div>
              <div>
                <h4 className="text-lg font-bold">Cafe-Only Financial Performance</h4>
                <p className="text-on-surface-variant font-mono text-[10px] uppercase tracking-widest">Excludes table charges & play times</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="bg-white/5 border border-purple-500/10 px-4 py-2 rounded-xl text-left min-w-[120px]">
                <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest">Cafe Sales</p>
                <p className="text-sm font-bold font-mono text-neon-blue mt-0.5">₹{cafeStats.totalCafeIncome.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</p>
              </div>
              <div className="bg-white/5 border border-purple-500/10 px-4 py-2 rounded-xl text-left min-w-[120px]">
                <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest">Cafe Expenses</p>
                <p className="text-sm font-bold font-mono text-neon-pink mt-0.5">₹{cafeStats.totalCafeExpense.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</p>
              </div>
              <div className="bg-white/5 border border-purple-500/10 px-4 py-2 rounded-xl text-left min-w-[120px]">
                <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest">Cafe Net Margin</p>
                <p className="text-sm font-bold font-mono text-cyber-lime mt-0.5 font-bold">₹{cafeStats.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 1 })} ({cafeStats.marginPercent.toFixed(1)}%)</p>
              </div>
            </div>
          </div>

          {cafeData.length === 0 ? (
            <div className="h-[300px] flex flex-col justify-center items-center text-center border border-dashed border-white/10 rounded-2xl py-12">
              <Utensils size={36} className="text-on-surface-variant/20 mb-3" />
              <p className="text-sm font-bold text-on-surface uppercase tracking-widest">No Cafe Sales Logged</p>
              <p className="text-xs text-on-surface-variant font-mono mt-1 uppercase max-w-sm">Items checked out via table bills or cafe menus will populate this module.</p>
            </div>
          ) : (
            <>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cafeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      stroke="#ffffff40" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                    />
                    <YAxis 
                      stroke="#ffffff40" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip content={<CafeTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                    <Legend 
                      verticalAlign="top" 
                      align="right"
                      wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                      iconType="rect"
                    />
                    <Bar 
                      dataKey="income" 
                      name="Cafe Income" 
                      fill="#bbff2c" 
                      radius={[4, 4, 0, 0]} 
                      barSize={24}
                    >
                      {cafeData.map((_entry, index) => (
                        <Cell key={`cell-cafe-income-${index}`} fillOpacity={0.8} />
                      ))}
                    </Bar>
                    <Bar 
                      dataKey="expense" 
                      name="Cafe Expenditure" 
                      fill="#a855f7" 
                      radius={[4, 4, 0, 0]} 
                      barSize={24}
                    >
                      {cafeData.map((_entry, index) => (
                        <Cell key={`cell-cafe-expense-${index}`} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyber-lime shadow-[0_0_8px_#39ff14]" />
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">Cafe Revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">Cafe Raw Spend</span>
                  </div>
                </div>
                
                <div className="text-[10px] font-mono text-on-surface-variant/40 uppercase tracking-[0.2em] flex items-center gap-2">
                  Dataset Range: Last 15 Cycles ({timeFrame})
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
