

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { InspectionRequest, PaymentType, RequestStatus, Expense, EXPENSE_CATEGORIES } from '../types';
import FinancialsTable from '../components/FinancialsTable';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';

const KpiCard: React.FC<{ title: string; value: string; description?: string, colorClass: string }> = ({ title, value, description, colorClass }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg h-full flex flex-col justify-center">
        <h3 className={`font-bold text-lg ${colorClass}`}>{title}</h3>
        <p className="text-4xl font-bold mt-2 text-slate-800 dark:text-slate-200">{value}</p>
        {description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{description}</p>}
    </div>
);

const PieChart: React.FC<{ data: { label: string; value: number; color: string }[]; title: string }> = ({ data, title }) => {
    // FIX: Explicitly type the accumulator to ensure it's treated as a number.
    const total = data.reduce((acc: number, item) => acc + item.value, 0);
    let cumulativePercentage = 0;
    const gradientParts = data.map(item => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const start = cumulativePercentage;
        cumulativePercentage += percentage;
        const end = cumulativePercentage;
        return `${item.color} ${start}% ${end}%`;
    });
    const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md h-full">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">{title}</h3>
            <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                <div
                    className="w-40 h-40 rounded-full"
                    style={{ background: total > 0 ? conicGradient : '#e2e8f0' }}
                />
                <div className="space-y-2 text-sm w-full md:w-auto">
                    {data.filter(item => item.value > 0).map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{item.label}:</span>
                            <span className="text-slate-600 dark:text-slate-400">{item.value.toLocaleString('en-US')} ريال ({total > 0 ? (item.value / total * 100).toFixed(1) : '0'}%)</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AccordionItem: React.FC<{ title: React.ReactNode, children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b dark:border-slate-700 last:border-b-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 text-right hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="font-semibold text-slate-900 dark:text-white">{title}</div>
                <ChevronDownIcon className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};


const Financials: React.FC = () => {
    const { 
        requests, expenses, brokers, settings, employees,
        addExpense, updateExpense, deleteExpense, showConfirmModal, addNotification, uploadImage, authUser 
    } = useAppContext();

    const design = settings.design || 'aero';
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year'>('month');
    const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income');
    
    // Expense Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<Partial<Expense>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [customCategory, setCustomCategory] = useState('');

    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const { filteredRequests, filteredExpenses } = useMemo(() => {
        const now = new Date();
        const startOf = (unit: 'day' | 'week' | 'month' | 'year') => {
            const date = new Date();
            if (unit === 'day') date.setHours(0, 0, 0, 0);
            if (unit === 'week') {
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 0); // Week starts on Sunday
                date.setDate(diff);
                date.setHours(0,0,0,0);
            }
            if (unit === 'month') { date.setDate(1); date.setHours(0, 0, 0, 0); }
            if (unit === 'year') { date.setMonth(0, 1); date.setHours(0, 0, 0, 0); }
            return date;
        };
        const endOf = (unit: 'day' | 'week' | 'month' | 'year') => {
             const date = new Date();
             if (unit === 'day') date.setHours(23, 59, 59, 999);
             // For week, month, year, we don't need an end date, we just check >= start date.
             return date;
        }

        let startDate: Date;
        switch (dateFilter) {
            case 'today': startDate = startOf('day'); break;
            case 'week': startDate = startOf('week'); break;
            case 'month': startDate = startOf('month'); break;
            case 'year': startDate = startOf('year'); break;
            default: startDate = startOf('month');
        }

        const fRequests = requests.filter(r => new Date(r.created_at) >= startDate && r.status === RequestStatus.COMPLETE);
        const fExpenses = expenses.filter(e => new Date(e.date) >= startDate);

        return { filteredRequests: fRequests, filteredExpenses: fExpenses };

    }, [requests, expenses, dateFilter]);

    const financialData = useMemo(() => {
        const totalRevenue = filteredRequests.reduce((sum, req) => sum + req.price, 0);
        const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = totalRevenue - totalExpenses;
        
        // Income pie chart data
        const incomeByPaymentType = filteredRequests.reduce((acc, req) => {
            acc[req.payment_type] = (acc[req.payment_type] || 0) + req.price;
            return acc;
        }, {} as Record<PaymentType, number>);

        const incomePieData = [
            { label: 'نقدي', value: incomeByPaymentType[PaymentType.Cash] || 0, color: '#10b981' },
            { label: 'بطاقة', value: incomeByPaymentType[PaymentType.Card] || 0, color: '#3b82f6' },
            { label: 'تحويل', value: incomeByPaymentType[PaymentType.Transfer] || 0, color: '#f59e0b' },
            { label: 'غير مدفوع', value: incomeByPaymentType[PaymentType.Unpaid] || 0, color: '#ef4444' },
        ];
        
        // Expense pie chart data
        const expenseByCategory = filteredExpenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
            return acc;
        }, {} as Record<string, number>);
        
        const expenseColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1', '#a855f7', '#d946ef'];
        const expensePieData = Object.entries(expenseByCategory)
            // FIX: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([label, value], index) => ({
                label,
                value,
                color: expenseColors[index % expenseColors.length],
            }));

        // Broker performance
        const brokerPerformance: { [key: string]: { name: string, requests: number, revenue: number, commission: number } } = {};
        filteredRequests.forEach(req => {
            if (req.broker) {
                const brokerId = req.broker.id;
                if (!brokerPerformance[brokerId]) {
                    brokerPerformance[brokerId] = { name: brokers.find(b => b.id === brokerId)?.name || 'غير معروف', requests: 0, revenue: 0, commission: 0 };
                }
                brokerPerformance[brokerId].requests++;
                brokerPerformance[brokerId].revenue += req.price;
                brokerPerformance[brokerId].commission += req.broker.commission;
            }
        });
        const brokerPerformanceData = Object.values(brokerPerformance).sort((a,b) => b.revenue - a.revenue);

        return { totalRevenue, totalExpenses, netProfit, incomePieData, expensePieData, brokerPerformanceData };
    }, [filteredRequests, filteredExpenses, brokers]);
    
    // Expense Management Handlers
    const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'غير معروف';
    
    const handleAddExpense = () => {
        setCurrentExpense({ date: new Date().toISOString().split('T')[0], category: EXPENSE_CATEGORIES[0], paymentMethod: 'نقدي', amount: 0, description: '', });
        setReceiptFile(null); setReceiptPreview(null); setCustomCategory(''); setIsEditing(false); setIsModalOpen(true);
    };

    const handleEditExpense = (expense: Expense) => {
        setCurrentExpense({ ...expense, date: expense.date.split('T')[0] });
        setIsEditing(true); setReceiptFile(null); setReceiptPreview(expense.receiptUrl || null);
        const isCustom = !EXPENSE_CATEGORIES.includes(expense.category);
        if (isCustom) { setCustomCategory(expense.category); setCurrentExpense(e => ({...e, category: 'أخرى'})); } 
        else { setCustomCategory(''); }
        setIsModalOpen(true);
    };
    
    const handleDeleteExpense = (expense: Expense) => {
        showConfirmModal({
            title: `حذف مصروف`, message: `هل أنت متأكد من حذف هذا المصروف؟ (${expense.description})`,
            onConfirm: async () => { await deleteExpense(expense.id); addNotification({ title: 'نجاح', message: 'تم حذف المصروف.', type: 'success' }); }
        });
    };
    
    const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) { setReceiptFile(file); setReceiptPreview(URL.createObjectURL(file)); }
    };
    
    const handleSaveExpense = async () => {
        if (!currentExpense.description?.trim() || (currentExpense.amount || 0) <= 0 || !authUser) { addNotification({ title: 'خطأ', message: 'يرجى ملء الوصف والمبلغ بشكل صحيح.', type: 'error' }); return; }
        const category = currentExpense.category === 'أخرى' && customCategory.trim() ? customCategory.trim() : currentExpense.category;
        if (!category) { addNotification({ title: 'خطأ', message: 'الرجاء تحديد فئة المصروف.', type: 'error' }); return; }

        setIsUploading(true);
        try {
            let receiptUrl = currentExpense.receiptUrl;
            if (receiptFile) { receiptUrl = await uploadImage(receiptFile, 'receipts'); } 
            else if (!receiptPreview) { receiptUrl = null; }

            const expenseData = { ...currentExpense, category, amount: Number(currentExpense.amount), receiptUrl, employeeId: authUser.id, };
            if (isEditing) { await updateExpense(expenseData as Expense); addNotification({ title: 'نجاح', message: 'تم تعديل المصروف.', type: 'success' }); } 
            else { await addExpense(expenseData as Omit<Expense, 'id'>); addNotification({ title: 'نجاح', message: 'تمت إضافة المصروف.', type: 'success' }); }
            setIsModalOpen(false);
        } catch (error) { console.error("Failed to save expense:", error); addNotification({ title: 'خطأ', message: 'فشل حفظ المصروف.', type: 'error' }); } 
        finally { setIsUploading(false); }
    };

    const activeFilterClasses = design === 'classic' ? 'bg-teal-600 text-white' : design === 'glass' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white';
    const DateFilterButton: React.FC<{ filter: 'today' | 'week' | 'month' | 'year'; label: string }> = ({ filter, label }) => (
        <button onClick={() => setDateFilter(filter)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${dateFilter === filter ? activeFilterClasses : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'}`}>
            {label}
        </button>
    );
    const activeTabClass = design === 'classic' ? 'border-teal-500 text-teal-600' : design === 'glass' ? 'border-indigo-500 text-indigo-600' : 'border-blue-500 text-blue-600';


    return (
        <div className="container mx-auto space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">البيانات المالية</h2>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-sm">
                    <DateFilterButton filter="today" label="اليوم" />
                    <DateFilterButton filter="week" label="هذا الأسبوع" />
                    <DateFilterButton filter="month" label="هذا الشهر" />
                    <DateFilterButton filter="year" label="هذه السنة" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="إجمالي الإيرادات" value={`${financialData.totalRevenue.toLocaleString()} ريال`} colorClass="text-green-600 dark:text-green-400" />
                <KpiCard title="إجمالي المصروفات" value={`${financialData.totalExpenses.toLocaleString()} ريال`} colorClass="text-red-600 dark:text-red-400" />
                <KpiCard title="صافي الربح" value={`${financialData.netProfit.toLocaleString()} ريال`} colorClass="text-purple-600 dark:text-purple-400" description="(الإيرادات - المصروفات)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PieChart data={financialData.incomePieData} title="توزيع مصادر الدخل" />
                <PieChart data={financialData.expensePieData} title="توزيع فئات المصروفات" />
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex gap-6 px-4">
                        <button onClick={() => setActiveTab('income')} className={`py-4 px-1 border-b-2 font-semibold text-lg ${activeTab === 'income' ? activeTabClass : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            سجل الإيرادات ({filteredRequests.length})
                        </button>
                        <button onClick={() => setActiveTab('expenses')} className={`py-4 px-1 border-b-2 font-semibold text-lg ${activeTab === 'expenses' ? activeTabClass : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            سجل المصروفات ({filteredExpenses.length})
                        </button>
                    </nav>
                </div>
                {activeTab === 'income' ? (
                    <FinancialsTable requests={filteredRequests} title="" />
                ) : (
                    <div className="animate-fade-in">
                        <div className="p-4 flex justify-end">
                            <Button onClick={handleAddExpense} leftIcon={<Icon name="add" />}>إضافة مصروف</Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3">التاريخ</th><th className="px-6 py-3">الفئة</th><th className="px-6 py-3">الوصف</th><th className="px-6 py-3">المبلغ</th><th className="px-6 py-3">طريقة الدفع</th><th className="px-6 py-3">الموظف</th><th className="px-4 py-3">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((expense) => (
                                        <tr key={expense.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString('ar-SA')}</td><td className="px-6 py-4">{expense.category}</td><td className="px-6 py-4">{expense.description}</td><td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{expense.amount.toLocaleString()} ريال</td><td className="px-6 py-4">{expense.paymentMethod}</td><td className="px-6 py-4">{getEmployeeName(expense.employeeId)}</td>
                                            <td className="px-4 py-4 flex items-center gap-1">
                                                {expense.receiptUrl && <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50"><Icon name="document-report" className="w-5 h-5"/></a>}
                                                <button onClick={() => handleEditExpense(expense)} className="p-2 rounded-full text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"><Icon name="edit" className="w-5 h-5"/></button>
                                                <button onClick={() => handleDeleteExpense(expense)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"><Icon name="delete" className="w-5 h-5"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredExpenses.length === 0 && <p className="text-center p-8">لا توجد مصروفات مسجلة لهذه الفترة.</p>}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 p-4 border-b dark:border-slate-700">أداء السماسرة</h3>
                <div>
                    {financialData.brokerPerformanceData.length > 0 ? financialData.brokerPerformanceData.map((broker, index) => (
                        <AccordionItem key={index} title={broker.name}>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div><p className="text-sm text-slate-500 dark:text-slate-400">عدد الطلبات</p><p className="font-bold text-lg text-slate-800 dark:text-slate-200">{broker.requests}</p></div>
                                <div><p className="text-sm text-slate-500 dark:text-slate-400">إجمالي الدخل</p><p className="font-bold text-lg text-green-600 dark:text-green-400">{broker.revenue.toLocaleString()} ريال</p></div>
                                <div><p className="text-sm text-slate-500 dark:text-slate-400">إجمالي العمولة</p><p className="font-bold text-lg text-red-600 dark:text-red-400">{broker.commission.toLocaleString()} ريال</p></div>
                            </div>
                        </AccordionItem>
                    )) : <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">لا توجد بيانات سماسرة لعرضها.</p>}
                </div>
            </div>
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'تعديل مصروف' : 'إضافة مصروف جديد'}>
                <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">التاريخ</label><input type="date" value={currentExpense.date || ''} onChange={e => setCurrentExpense(p => ({...p, date: e.target.value}))} className={formInputClasses} /></div>
                         <div><label className="block text-sm font-medium">المبلغ (ريال)</label><input type="number" value={currentExpense.amount || ''} onChange={e => setCurrentExpense(p => ({...p, amount: Number(e.target.value)}))} className={formInputClasses} /></div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">الفئة</label>
                        <select value={currentExpense.category || ''} onChange={e => setCurrentExpense(p => ({...p, category: e.target.value}))} className={formInputClasses}>
                            {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                         {currentExpense.category === 'أخرى' && <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="اكتب اسم الفئة الجديدة" className={`${formInputClasses} mt-2`} />}
                    </div>
                     <div><label className="block text-sm font-medium">الوصف</label><textarea value={currentExpense.description || ''} onChange={e => setCurrentExpense(p => ({...p, description: e.target.value}))} className={formInputClasses} rows={3}></textarea></div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium">طريقة الدفع</label>
                            <select value={currentExpense.paymentMethod || ''} onChange={e => setCurrentExpense(p => ({...p, paymentMethod: e.target.value as any}))} className={formInputClasses}>
                                <option value="نقدي">نقدي</option><option value="بطاقة">بطاقة</option><option value="تحويل">تحويل</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium">إيصال (اختياري)</label>
                             <div className="mt-1 flex items-center gap-4">
                                <input type="file" id="receipt-upload" accept="image/*" onChange={handleReceiptChange} className="hidden" />
                                <label htmlFor="receipt-upload" className="cursor-pointer bg-white dark:bg-slate-600 px-4 py-2 rounded-lg border dark:border-slate-500">اختر صورة...</label>
                                {receiptPreview && <div className="relative"><img src={receiptPreview} alt="معاينة" className="h-12 w-12 object-cover rounded-md" /><button onClick={() => { setReceiptFile(null); setReceiptPreview(null); setCurrentExpense(p => ({...p, receiptUrl: null})) }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button></div>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSaveExpense} disabled={isUploading}>{isUploading ? 'جاري الحفظ...' : 'حفظ'}</Button>
                </div>
            </Modal>
        </div>
    );
};

export default Financials;