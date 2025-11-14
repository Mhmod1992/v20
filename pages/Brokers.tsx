import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Broker } from '../types';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Icon from '../components/Icon';

const Brokers: React.FC = () => {
    const { brokers, addBroker, updateBroker, deleteBroker, showConfirmModal, addNotification, requests } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentBroker, setCurrentBroker] = useState<Partial<Broker>>({});
    const [isEditing, setIsEditing] = useState(false);
    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const brokerStats = useMemo(() => {
        const stats: { [key: string]: { requestCount: number; totalRevenue: number; totalCommission: number } } = {};
        brokers.forEach(broker => {
            const relatedRequests = requests.filter(req => req.broker?.id === broker.id);
            stats[broker.id] = {
                requestCount: relatedRequests.length,
                totalRevenue: relatedRequests.reduce((sum, req) => sum + req.price, 0),
                totalCommission: relatedRequests.reduce((sum, req) => sum + (req.broker?.commission || 0), 0)
            };
        });
        return stats;
    }, [brokers, requests]);


    const handleAdd = () => {
        setCurrentBroker({ name: '', default_commission: 0, is_active: true });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleEdit = (broker: Broker) => {
        setCurrentBroker(broker);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = (broker: Broker) => {
        showConfirmModal({
            title: `حذف ${broker.name}`,
            message: 'هل أنت متأكد من حذف هذا السمسار؟',
            onConfirm: async () => {
                await deleteBroker(broker.id);
                addNotification({ title: 'نجاح', message: 'تم حذف السمسار.', type: 'success' });
            }
        });
    };

    const handleSave = async () => {
        if (!currentBroker.name?.trim()) {
            addNotification({ title: 'خطأ', message: 'الرجاء إدخال اسم السمسار.', type: 'error' });
            return;
        }
        if (isEditing) {
            await updateBroker(currentBroker as Broker);
            addNotification({ title: 'نجاح', message: 'تم تعديل السمسار.', type: 'success' });
        } else {
            await addBroker(currentBroker as Omit<Broker, 'id'>);
            addNotification({ title: 'نجاح', message: 'تمت إضافة السمسار.', type: 'success' });
        }
        setIsModalOpen(false);
    };

    return (
        <div className="container mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">إدارة السماسرة</h2>
                <Button onClick={handleAdd} leftIcon={<Icon name="add" />}>إضافة سمسار</Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brokers.map(broker => {
                    const stats = brokerStats[broker.id] || { requestCount: 0, totalRevenue: 0, totalCommission: 0 };
                    return (
                        <div key={broker.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
                            <div className="p-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{broker.name}</h3>
                                        <span className={`px-2 py-0.5 mt-1 inline-block rounded-full text-xs font-semibold ${broker.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                            {broker.is_active ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => handleEdit(broker)}><Icon name="edit" className="w-4 h-4"/></Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDelete(broker)}><Icon name="delete" className="w-4 h-4"/></Button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-700/50 mt-auto text-center">
                                <div className="bg-white dark:bg-slate-800 p-3">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">الطلبات</p>
                                    <p className="font-bold text-xl text-slate-800 dark:text-slate-200">{stats.requestCount}</p>
                                </div>
                                 <div className="bg-white dark:bg-slate-800 p-3">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي الدخل</p>
                                    <p className="font-bold text-xl text-green-600 dark:text-green-400">{stats.totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-3">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي العمولة</p>
                                    <p className="font-bold text-xl text-red-600 dark:text-red-400">{stats.totalCommission.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {brokers.length === 0 && (
                 <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <p className="text-slate-500 dark:text-slate-400">لا يوجد سماسرة مضافون حالياً.</p>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'تعديل سمسار' : 'إضافة سمسار'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">الاسم</label>
                        <input type="text" value={currentBroker.name || ''} onChange={e => setCurrentBroker(p => ({...p, name: e.target.value}))} className={formInputClasses} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">العمولة الافتراضية (ريال)</label>
                        <input type="number" value={currentBroker.default_commission || 0} onChange={e => setCurrentBroker(p => ({...p, default_commission: Number(e.target.value)}))} className={formInputClasses} />
                    </div>
                    <div>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={currentBroker.is_active} onChange={e => setCurrentBroker(p => ({...p, is_active: e.target.checked}))} className="rounded" />
                            <span>نشط</span>
                        </label>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSave}>حفظ</Button>
                </div>
            </Modal>
        </div>
    );
};

export default Brokers;