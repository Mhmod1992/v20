import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Permission, PERMISSIONS } from '../types';
import Button from '../components/Button';

const SetupWizard: React.FC = () => {
    const { addEmployee, addNotification, settings } = useAppContext();
    const [employeeName, setEmployeeName] = useState('');
    const [pin, setPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employeeName.trim() || !pin.trim()) {
            addNotification({ title: 'خطأ', message: 'الرجاء إدخال اسم المدير والرقم السري.', type: 'error' });
            return;
        }
        if (pin.length < 4) {
            addNotification({ title: 'خطأ', message: 'الرقم السري يجب أن يتكون من 4 أرقام على الأقل.', type: 'error' });
            return;
        }
        setIsSubmitting(true);
        try {
            const allPermissions: Permission[] = Object.keys(PERMISSIONS) as Permission[];
            
            const newEmployee = {
                name: employeeName,
                role: 'general_manager' as const,
                is_active: true,
                permissions: allPermissions,
                pin: pin,
            };
            await addEmployee(newEmployee);
            // The context will automatically handle setting authUser and isSetupComplete to true
            addNotification({ title: 'أهلاً بك!', message: 'تم إعداد حسابك بنجاح.', type: 'success' });
        } catch (error) {
            addNotification({ title: 'خطأ', message: 'فشل إنشاء الموظف. الرجاء المحاولة مرة أخرى.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 animate-fade-in">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
                <div className="text-center">
                    {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="w-24 h-24 mx-auto mb-4 object-contain" />}
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">أهلاً بك في {settings.appName}</h1>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">للبدء، نحتاج إلى إعداد أول مستخدم للنظام والذي سيكون المدير العام.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="employeeName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">اسم المدير العام</label>
                        <input
                            id="employeeName"
                            type="text"
                            value={employeeName}
                            onChange={(e) => setEmployeeName(e.target.value)}
                            required
                            className={formInputClasses}
                            placeholder="مثال: أحمد علي"
                        />
                    </div>
                     <div>
                        <label htmlFor="pin" className="block text-sm font-medium text-slate-700 dark:text-slate-300">الرقم السري (PIN)</label>
                        <input
                            id="pin"
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            required
                            minLength={4}
                            className={formInputClasses}
                            placeholder="4 أرقام على الأقل"
                        />
                    </div>
                    <div>
                        <Button type="submit" className="w-full text-lg" disabled={isSubmitting}>
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ وبدء الاستخدام'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SetupWizard;