

import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { InspectionRequest } from '../../types';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import { formatBytes } from '../../lib/utils';


const CircularProgress: React.FC<{ percentage: number, size?: number, strokeWidth?: number }> = ({ percentage, size = 160, strokeWidth = 12 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let color = 'stroke-blue-500';
    if (percentage > 90) color = 'stroke-red-500';
    else if (percentage > 75) color = 'stroke-yellow-500';

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="w-full h-full" viewBox={`0 0 ${size} ${size}`}>
                <circle
                    className="text-slate-200 dark:text-slate-700"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={`transition-all duration-500 ease-in-out ${color}`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-700 dark:text-slate-200">{Math.round(percentage)}%</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">مستخدم</span>
            </div>
        </div>
    );
};

const DatabaseManagement: React.FC = () => {
    const { requests, clients, cars, carMakes, carModels, deleteRequestsBatch, showConfirmModal, addNotification, settings, updateSettings, currentDbUsage, currentStorageUsage } = useAppContext();

    // State for filters and selection
    const [filterType, setFilterType] = useState<'month' | 'range'>('month');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
    const [capacityInput, setCapacityInput] = useState<number>(settings.databaseCapacity || 500);
    const [storageCapacityInput, setStorageCapacityInput] = useState<number>(settings.storageCapacity || 1);
    
    useEffect(() => {
        setCapacityInput(settings.databaseCapacity || 500);
        setStorageCapacityInput(settings.storageCapacity || 1);
    }, [settings.databaseCapacity, settings.storageCapacity]);

    const formInputClasses = "block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const availableYears = useMemo(() => {
        const years = new Set(requests.map(r => new Date(r.created_at).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [requests]);

    const months = [
        { value: 1, name: 'يناير' }, { value: 2, name: 'فبراير' }, { value: 3, name: 'مارس' },
        { value: 4, name: 'أبريل' }, { value: 5, name: 'مايو' }, { value: 6, name: 'يونيو' },
        { value: 7, name: 'يوليو' }, { value: 8, name: 'أغسطس' }, { value: 9, name: 'سبتمبر' },
        { value: 10, name: 'أكتوبر' }, { value: 11, name: 'نوفمبر' }, { value: 12, name: 'ديسمبر' },
    ];

    const filteredRequests = useMemo(() => {
        return requests.filter(request => {
            const requestDate = new Date(request.created_at);
            if (filterType === 'month') {
                if(!selectedYear || !selectedMonth) return false;
                return requestDate.getFullYear() === selectedYear && requestDate.getMonth() + 1 === selectedMonth;
            }
            if (filterType === 'range') {
                if (!startDate || !endDate) return false;
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                return requestDate >= start && requestDate <= end;
            }
            return true;
        });
    }, [requests, filterType, selectedYear, selectedMonth, startDate, endDate]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRequestIds(new Set(filteredRequests.map(r => r.id)));
        } else {
            setSelectedRequestIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedRequestIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const selectedRequests = useMemo(() => {
        return requests.filter(r => selectedRequestIds.has(r.id));
    }, [requests, selectedRequestIds]);

    const totalSelectedSize = useMemo(() => {
        const estimateObjectSize = (obj: any) => new Blob([JSON.stringify(obj)]).size;
        return selectedRequests.reduce((acc, req) => acc + estimateObjectSize(req), 0);
    }, [selectedRequests]);

    const handleDeleteSelected = () => {
        if (selectedRequestIds.size === 0) return;
        showConfirmModal({
            title: `حذف ${selectedRequestIds.size} طلب`,
            message: 'هل أنت متأكد من حذف الطلبات المحددة بشكل نهائي؟ سيتم حذف جميع الصور والملفات الصوتية المرتبطة بها أيضاً. لا يمكن التراجع عن هذا الإجراء.',
            onConfirm: async () => {
                try {
                    await deleteRequestsBatch(Array.from(selectedRequestIds));
                    addNotification({ title: 'نجاح', message: 'تم حذف الطلبات المحددة بنجاح.', type: 'success' });
                    setSelectedRequestIds(new Set());
                } catch (error) {
                    addNotification({ title: 'خطأ', message: 'فشل حذف الطلبات.', type: 'error' });
                }
            }
        });
    };

    const handleExportSelected = () => {
        if (selectedRequests.length === 0) return;
        const dataStr = JSON.stringify(selectedRequests, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        link.download = `requests-backup-${date}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addNotification({ title: 'نجاح', message: `تم تجهيز ملف النسخ الاحتياطي للتحميل.`, type: 'success' });
    };

    const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || 'غير معروف';
    const getCarInfo = (carId: string) => {
        const car = cars.find(c => c.id === carId);
        if (!car) return 'غير معروف';
        const make = carMakes.find(m => m.id === car.make_id)?.name_ar;
        const model = carModels.find(m => m.id === car.model_id)?.name_ar;
        return `${make} ${model}`;
    };
    
    const isAllSelected = filteredRequests.length > 0 && selectedRequestIds.size === filteredRequests.length;
    
    // DB Calculations
    const totalDbCapacityBytes = (settings.databaseCapacity || 500) * 1024 * 1024;
    const dbUsagePercentage = Math.min((currentDbUsage / totalDbCapacityBytes) * 100, 100);
    const remainingDbBytes = Math.max(0, totalDbCapacityBytes - currentDbUsage);

    const handleSaveCapacity = async () => {
        if (capacityInput > 0) {
            try {
                await updateSettings({ databaseCapacity: capacityInput });
                addNotification({ title: 'نجاح', message: 'تم تحديث سعة قاعدة البيانات.', type: 'success' });
            } catch (error) { /* handled in context */ }
        } else {
            addNotification({ title: 'خطأ', message: 'السعة يجب أن تكون أكبر من صفر.', type: 'error' });
        }
    };
    
    // Storage Calculations
    const totalStorageCapacityBytes = (settings.storageCapacity || 1) * 1024 * 1024 * 1024;
    const storageUsagePercentage = Math.min((currentStorageUsage / totalStorageCapacityBytes) * 100, 100);
    const remainingStorageBytes = Math.max(0, totalStorageCapacityBytes - currentStorageUsage);

    const handleSaveStorageCapacity = async () => {
        if (storageCapacityInput > 0) {
            try {
                await updateSettings({ storageCapacity: storageCapacityInput });
                addNotification({ title: 'نجاح', message: 'تم تحديث سعة التخزين.', type: 'success' });
            } catch (error) { /* handled in context */ }
        } else {
            addNotification({ title: 'خطأ', message: 'السعة يجب أن تكون أكبر من صفر.', type: 'error' });
        }
    };


    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">استخدام البيانات والتخزين</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    {/* Database Usage Card */}
                    <div className="p-4 border rounded-lg dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex flex-col items-center">
                        <h4 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4">استخدام قاعدة البيانات (Database)</h4>
                        <CircularProgress percentage={dbUsagePercentage} />
                        <div className="w-full mt-4 space-y-2">
                             <div>
                                <label className="block text-sm font-medium mb-1">السعة الإجمالية (MB)</label>
                                <div className="flex gap-2">
                                    <input type="number" value={capacityInput} onChange={e => setCapacityInput(Number(e.target.value))} className={formInputClasses} />
                                    <Button onClick={handleSaveCapacity}>حفظ</Button>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700/50 p-3 rounded-lg">
                                <div className="flex justify-between"><span>المستخدم:</span> <span className="font-bold">{formatBytes(currentDbUsage)}</span></div>
                                <div className="flex justify-between"><span>المتبقي:</span> <span className="font-bold">{formatBytes(remainingDbBytes)}</span></div>
                                <hr className="border-slate-200 dark:border-slate-600"/>
                                <div className="flex justify-between"><span>الإجمالي:</span> <span className="font-bold">{formatBytes(totalDbCapacityBytes)}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Storage Usage Card */}
                     <div className="p-4 border rounded-lg dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex flex-col items-center">
                        <h4 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4">استخدام التخزين (Storage)</h4>
                        <CircularProgress percentage={storageUsagePercentage} />
                        <div className="w-full mt-4 space-y-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">السعة الإجمالية (GB)</label>
                                <div className="flex gap-2">
                                    <input type="number" value={storageCapacityInput} onChange={e => setStorageCapacityInput(Number(e.target.value))} className={formInputClasses} />
                                    <Button onClick={handleSaveStorageCapacity}>حفظ</Button>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700/50 p-3 rounded-lg">
                                <div className="flex justify-between"><span>المستخدم:</span> <span className="font-bold">{formatBytes(currentStorageUsage)}</span></div>
                                <div className="flex justify-between"><span>المتبقي:</span> <span className="font-bold">{formatBytes(remainingStorageBytes)}</span></div>
                                <hr className="border-slate-200 dark:border-slate-600"/>
                                <div className="flex justify-between"><span>الإجمالي:</span> <span className="font-bold">{formatBytes(totalStorageCapacityBytes)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">أداة حذف الطلبات القديمة</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">استخدم هذه الأداة لتحديد وحذف الطلبات القديمة لتوفير مساحة في قاعدة البيانات والتخزين.</p>
            </div>
            
            <div className="p-4 border rounded-lg dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">نوع الفلترة</label>
                         <div className="flex items-center gap-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg">
                            <label className={`flex-1 text-center text-sm px-2 py-1 rounded-md cursor-pointer transition-colors ${filterType === 'month' ? 'bg-white dark:bg-slate-900 shadow font-semibold text-teal-600' : 'text-gray-600 dark:text-gray-300'}`}>
                                <input type="radio" name="filterType" value="month" checked={filterType === 'month'} onChange={() => setFilterType('month')} className="sr-only"/>
                                بالشهر والسنة
                            </label>
                            <label className={`flex-1 text-center text-sm px-2 py-1 rounded-md cursor-pointer transition-colors ${filterType === 'range' ? 'bg-white dark:bg-slate-900 shadow font-semibold text-teal-600' : 'text-gray-600 dark:text-gray-300'}`}>
                                <input type="radio" name="filterType" value="range" checked={filterType === 'range'} onChange={() => setFilterType('range')} className="sr-only"/>
                                نطاق زمني
                            </label>
                        </div>
                    </div>
                    {filterType === 'month' ? (
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-sm font-medium mb-1">السنة</label>
                                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={formInputClasses}>
                                    {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium mb-1">الشهر</label>
                                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className={formInputClasses}>
                                    {months.map(month => <option key={month.value} value={month.value}>{month.name}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                         <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">من تاريخ</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={formInputClasses} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">إلى تاريخ</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={formInputClasses} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border rounded-lg dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">النتائج:</span> {filteredRequests.length} طلب | 
                    <span className="font-semibold"> المحدد:</span> {selectedRequestIds.size} طلب |
                    <span className="font-semibold"> الحجم التقريبي:</span> {formatBytes(totalSelectedSize)}
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleExportSelected} variant="secondary" disabled={selectedRequestIds.size === 0} leftIcon={<Icon name="download" className="w-4 h-4"/>}>تصدير المحدد</Button>
                    <Button onClick={handleDeleteSelected} variant="danger" disabled={selectedRequestIds.size === 0} leftIcon={<Icon name="delete" className="w-4 h-4"/>}>حذف المحدد</Button>
                </div>
            </div>

            <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
                 <table className="w-full text-sm text-right">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-4 py-3">
                                <input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="rounded" />
                            </th>
                            <th className="px-6 py-3">رقم الطلب</th>
                            <th className="px-6 py-3">العميل</th>
                            <th className="px-6 py-3">السيارة</th>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">الحالة</th>
                            <th className="px-6 py-3">الحجم</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800">
                        {filteredRequests.map(request => (
                            <tr key={request.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                <td className="px-4 py-2">
                                    <input type="checkbox" checked={selectedRequestIds.has(request.id)} onChange={() => handleSelectOne(request.id)} className="rounded" />
                                </td>
                                <td className="px-6 py-2 font-medium text-gray-900 dark:text-white">{request.request_number}</td>
                                <td className="px-6 py-2">{getClientName(request.client_id)}</td>
                                <td className="px-6 py-2">{getCarInfo(request.car_id)}</td>
                                <td className="px-6 py-2">{new Date(request.created_at).toLocaleDateString('ar-SA')}</td>
                                <td className="px-6 py-2">{request.status}</td>
                                <td className="px-6 py-2 text-xs">{formatBytes(new Blob([JSON.stringify(request)]).size)}</td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                 {filteredRequests.length === 0 && (
                     <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                        لا توجد طلبات تطابق معايير البحث المحددة.
                     </div>
                 )}
            </div>
        </div>
    );
};

export default DatabaseManagement;