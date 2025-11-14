import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
// import { roleNames } from './EmployeesManagement'; // Assuming roleNames is exported

const Profile: React.FC = () => {
    const { authUser, updateEmployee, addNotification } = useAppContext();
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    if (!authUser) {
        return (
            <div className="text-center p-8">
                <p>لا يمكن تحميل بيانات المستخدم. الرجاء تسجيل الدخول مرة أخرى.</p>
            </div>
        );
    }

    const handleSavePin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) {
            addNotification({ title: 'خطأ', message: 'الرقم السري يجب أن يتكون من 4 أرقام على الأقل.', type: 'error' });
            return;
        }
        if (pin !== confirmPin) {
            addNotification({ title: 'خطأ', message: 'الرقمان السريان غير متطابقان.', type: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            await updateEmployee({ id: authUser.id, pin: pin });
            addNotification({ title: 'نجاح', message: 'تم تحديث الرقم السري بنجاح.', type: 'success' });
            setPin('');
            setConfirmPin('');
        } catch (error) {
            addNotification({ title: 'خطأ', message: 'فشل تحديث الرقم السري.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    // Fallback for roleNames if not exported
    const getRoleName = (role: 'general_manager' | 'manager' | 'employee') => {
        const names = {
            general_manager: 'مدير عام',
            manager: 'مدير',
            employee: 'موظف',
        };
        return names[role] || role;
    }


    return (
        <div className="container mx-auto max-w-2xl animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-200">الملف الشخصي</h2>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg mb-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">معلومات الموظف</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">الاسم:</span>
                        <span className="text-slate-800 dark:text-slate-200">{authUser.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">الدور الوظيفي:</span>
                        <span className="text-slate-800 dark:text-slate-200">{getRoleName(authUser.role)}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">تغيير الرقم السري (PIN)</h3>
                <form onSubmit={handleSavePin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">الرقم السري الجديد</label>
                        <input
                            type="password"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            className={formInputClasses}
                            placeholder="4 أرقام على الأقل"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">تأكيد الرقم السري الجديد</label>
                        <input
                            type="password"
                            value={confirmPin}
                            onChange={e => setConfirmPin(e.target.value)}
                            className={formInputClasses}
                            placeholder="إعادة إدخال الرقم السري"
                            required
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isSaving} leftIcon={<Icon name="save" className="w-5 h-5" />}>
                            {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;