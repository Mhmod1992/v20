import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Expense, EXPENSE_CATEGORIES } from '../types';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { uuidv4 } from '../lib/utils';

const KpiCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <h3 className="text-slate-500 dark:text-slate-400 text-md">{title}</h3>
        <p className="text-3xl font-bold mt-2 text-slate-800 dark:text-slate-200">{value}</p>
    </div>
);

const Expenses: React.FC = () => {
    const { expenses, employees, addExpense, updateExpense, deleteExpense, showConfirmModal, addNotification, uploadImage, authUser } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<Partial<Expense>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [customCategory, setCustomCategory] = useState('');

    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const summaryStats = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const monthExpenses = expenses.filter(e => new Date(e.date) >= startOfMonth);
        const todayExpenses = monthExpenses.filter(e => new Date(e.date) >= startOfToday);

        return {
            monthTotal: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
            todayTotal: todayExpenses.reduce((sum, e) => sum + e.amount, 0),
            monthCount: monthExpenses.length
        };
    }, [expenses]);

    const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'غير معروف';
    
    const handleAdd = () => {
        setCurrentExpense({
            date: new Date().toISOString().split('T')[0], // Today's date
            category: EXPENSE_CATEGORIES[0],
            paymentMethod: 'نقدي',
            amount: 0,
            description: '',
        });
        setReceiptFile(null);
        setReceiptPreview(null);
        setCustomCategory('');
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleEdit = (expense: Expense) => {
        setCurrentExpense({ ...expense, date: expense.date.split('T')[0] });
        setIsEditing(true);
        setReceiptFile(null);
        setReceiptPreview(expense.receiptUrl || null);
        const isCustom = !EXPENSE_CATEGORIES.includes(expense.category);
        if (isCustom) {
            setCustomCategory(expense.category);
            setCurrentExpense(e => ({...e, category: 'أخرى'}));
        } else {
            setCustomCategory('');
        }
        setIsModalOpen(true);
    };
    
    const handleDelete = (expense: Expense) => {
        showConfirmModal({
            title: `حذف مصروف`,
            message: `هل أنت متأكد من حذف هذا المصروف؟ (${expense.description})`,
            onConfirm: async () => {
                await deleteExpense(expense.id);
                addNotification({ title: 'نجاح', message: 'تم حذف المصروف.', type: 'success' });
            }
        });
    };
    
    const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReceiptFile(file);
            setReceiptPreview(URL.createObjectURL(file));
        }
    };
    
    const handleSave = async () => {
        if (!currentExpense.description?.trim() || (currentExpense.amount || 0) <= 0 || !authUser) {
            addNotification({ title: 'خطأ', message: 'يرجى ملء الوصف والمبلغ بشكل صحيح.', type: 'error' });
            return;
        }
        
        const category = currentExpense.category === 'أخرى' && customCategory.trim() ? customCategory.trim() : currentExpense.category;
        if (!category) {
             addNotification({ title: 'خطأ', message: 'الرجاء تحديد فئة المصروف.', type: 'error' });
            return;
        }

        setIsUploading(true);

        try {
            let receiptUrl = currentExpense.receiptUrl;
            if (receiptFile) {
                receiptUrl = await uploadImage(receiptFile, 'receipts');
            } else if (!receiptPreview) { // If preview was cleared
                receiptUrl = null;
            }

            const expenseData = {
                ...currentExpense,
                category,
                amount: Number(currentExpense.amount),
                receiptUrl,
                employeeId: authUser.id,
            };

            if (isEditing) {
                await updateExpense(expenseData as Expense);
                addNotification({ title: 'نجاح', message: 'تم تعديل المصروف.', type: 'success' });
            } else {
                await addExpense(expenseData as Omit<Expense, 'id'>);
                addNotification({ title: 'نجاح', message: 'تمت إضافة المصروف.', type: 'success' });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to save expense:", error);
            addNotification({ title: 'خطأ', message: 'فشل حفظ المصروف.', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div className="container mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">إدارة المصروفات</h2>
                <Button onClick={handleAdd} leftIcon={<Icon name="add" />}>إضافة مصروف</Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <KpiCard title="إجمالي المصروفات (هذا الشهر)" value={`${summaryStats.monthTotal.toLocaleString()} ريال`} />
                <KpiCard title="إجمالي المصروفات (اليوم)" value={`${summaryStats.todayTotal.toLocaleString()} ريال`} />
                <KpiCard title="عدد المصروفات (هذا الشهر)" value={summaryStats.monthCount.toLocaleString()} />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-sm text-right text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">التاريخ</th>
                            <th scope="col" className="px-6 py-3">الفئة</th>
                            <th scope="col" className="px-6 py-3">الوصف</th>
                            <th scope="col" className="px-6 py-3">المبلغ</th>
                            <th scope="col" className="px-6 py-3">طريقة الدفع</th>
                            <th scope="col" className="px-6 py-3">الموظف</th>
                            <th scope="col" className="px-4 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {expenses.map((expense) => (
                            <tr key={expense.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(expense.date).toLocaleDateString('ar-SA')}</td>
                                <td className="px-6 py-4">{expense.category}</td>
                                <td className="px-6 py-4">{expense.description}</td>
                                <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{expense.amount.toLocaleString()} ريال</td>
                                <td className="px-6 py-4">{expense.paymentMethod}</td>
                                <td className="px-6 py-4">{getEmployeeName(expense.employeeId)}</td>
                                <td className="px-4 py-4 flex items-center gap-1">
                                    {expense.receiptUrl && <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50"><Icon name="document-report" className="w-5 h-5"/></a>}
                                    <button onClick={() => handleEdit(expense)} className="p-2 rounded-full text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/50"><Icon name="edit" className="w-5 h-5"/></button>
                                    <button onClick={() => handleDelete(expense)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"><Icon name="delete" className="w-5 h-5"/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {expenses.length === 0 && <p className="text-center p-8">لا توجد مصروفات مسجلة.</p>}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'تعديل مصروف' : 'إضافة مصروف جديد'}>
                <div className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">التاريخ</label>
                            <input type="date" value={currentExpense.date || ''} onChange={e => setCurrentExpense(p => ({...p, date: e.target.value}))} className={formInputClasses} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium">المبلغ (ريال)</label>
                            <input type="number" value={currentExpense.amount || ''} onChange={e => setCurrentExpense(p => ({...p, amount: Number(e.target.value)}))} className={formInputClasses} />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium">الفئة</label>
                        <select value={currentExpense.category || ''} onChange={e => setCurrentExpense(p => ({...p, category: e.target.value}))} className={formInputClasses}>
                            {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                         {currentExpense.category === 'أخرى' && (
                             <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="اكتب اسم الفئة الجديدة" className={`${formInputClasses} mt-2`} />
                         )}
                    </div>
                     <div>
                        <label className="block text-sm font-medium">الوصف</label>
                        <textarea value={currentExpense.description || ''} onChange={e => setCurrentExpense(p => ({...p, description: e.target.value}))} className={formInputClasses} rows={3}></textarea>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium">طريقة الدفع</label>
                            <select value={currentExpense.paymentMethod || ''} onChange={e => setCurrentExpense(p => ({...p, paymentMethod: e.target.value as any}))} className={formInputClasses}>
                                <option value="نقدي">نقدي</option>
                                <option value="بطاقة">بطاقة</option>
                                <option value="تحويل">تحويل</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium">إيصال (اختياري)</label>
                             <div className="mt-1 flex items-center gap-4">
                                <input type="file" id="receipt-upload" accept="image/*" onChange={handleReceiptChange} className="hidden" />
                                <label htmlFor="receipt-upload" className="cursor-pointer bg-white dark:bg-slate-600 px-4 py-2 rounded-lg border dark:border-slate-500">
                                    اختر صورة...
                                </label>
                                {receiptPreview && (
                                    <div className="relative">
                                        <img src={receiptPreview} alt="معاينة" className="h-12 w-12 object-cover rounded-md" />
                                        <button onClick={() => { setReceiptFile(null); setReceiptPreview(null); setCurrentExpense(p => ({...p, receiptUrl: null})) }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSave} disabled={isUploading}>{isUploading ? 'جاري الحفظ...' : 'حفظ'}</Button>
                </div>
            </Modal>
        </div>
    );
};

export default Expenses;