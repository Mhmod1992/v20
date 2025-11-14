import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Button from '../components/Button';

const Login: React.FC = () => {
    const { employees, login, settings } = useAppContext();
    const design = settings.design || 'aero';
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const activeEmployees = employees.filter(e => e.is_active);
    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    useEffect(() => {
        if (!selectedEmployeeId && activeEmployees.length > 0) {
            setSelectedEmployeeId(activeEmployees[0].id);
        }
    }, [activeEmployees, selectedEmployeeId]);


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployeeId) {
            setError('الرجاء اختيار اسم الموظف.');
            return;
        }
        setError('');
        setIsLoading(true);
        const success = await login(selectedEmployeeId, pin);
        if (!success) {
            setError('الرقم السري غير صحيح أو الموظف غير نشط.');
            setIsLoading(false);
        }
    };
    
    const getDecorativePanelClasses = () => {
        switch(design) {
            case 'classic': return 'from-teal-500 to-cyan-600';
            case 'glass': return 'from-indigo-500 to-purple-600';
            default: return 'from-blue-500 to-indigo-600';
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen p-4 animate-fade-in">
            <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex overflow-hidden">
                {/* Decorative Panel */}
                <div className={`w-1/2 hidden md:block relative bg-gradient-to-br ${getDecorativePanelClasses()}`}>
                    <div className="absolute inset-0 bg-black/20"></div>
                     <div className="relative z-10 flex flex-col items-center justify-center h-full text-white p-12">
                         {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="w-32 h-32 mb-6 object-contain drop-shadow-lg" />
                         ) : (
                            <h1 className="text-5xl font-bold tracking-tight drop-shadow-lg">Aero</h1>
                         )}
                        <h2 className="text-2xl font-semibold mt-4 text-center">{settings.appName}</h2>
                        <p className="mt-2 text-center text-blue-200">نظامك المتكامل لإدارة ورشة فحص السيارات.</p>
                    </div>
                </div>

                {/* Form Panel */}
                <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
                    <div className="text-center md:hidden mb-8">
                        {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />}
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">تسجيل الدخول</h1>
                        <p className="mt-2 text-slate-600 dark:text-slate-400">مرحباً بك مجدداً!</p>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 hidden md:block mb-6">تسجيل الدخول</h2>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="employee" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                اسم الموظف
                            </label>
                            <select 
                                id="employee"
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                required
                                className={formInputClasses}
                            >
                                <option value="" disabled>-- اختر اسمك --</option>
                                {activeEmployees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="pin" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                الرقم السري (PIN)
                            </label>
                            <input
                                id="pin"
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                required
                                className={formInputClasses}
                                placeholder="••••"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
                        )}

                        <div>
                            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
                                {isLoading ? 'جاري التحقق...' : 'دخول'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;