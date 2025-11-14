

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, PaymentType } from '../types';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import SearchIcon from '../components/icons/SearchIcon';
import UsersIcon from '../components/icons/UsersIcon';
import PhoneIcon from '../components/icons/PhoneIcon';
import { uuidv4 } from '../lib/utils';

const Clients: React.FC = () => {
    const { clients, cars, carMakes, carModels, requests, addClient, updateClient, deleteClient, showConfirmModal, addNotification, setPage, setSelectedRequestId, settings, selectedClientId, setSelectedClientId } = useAppContext();
    const design = settings.design || 'aero';
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentClient, setCurrentClient] = useState<Partial<Client>>({});
    const [requestSearchTerm, setRequestSearchTerm] = useState('');


    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";
    const searchInputClasses = "block w-full p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const getCarInfo = (carId: string) => {
        const car = cars.find(c => c.id === carId);
        if (!car) return { name: 'Unknown', plate: '' };
        const make = carMakes.find(m => m.id === car.make_id)?.name_en;
        const model = carModels.find(m => m.id === car.model_id)?.name_en;
        return { name: `${make || ''} ${model || ''}`, plate: car.plate_number };
    };

    const filteredClients = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        if (!lowercasedTerm) return clients;
        return clients.filter(client =>
            client.name.toLowerCase().includes(lowercasedTerm) ||
            client.phone.includes(lowercasedTerm)
        );
    }, [clients, searchTerm]);

    const selectedClient = useMemo(() => {
        return clients.find(c => c.id === selectedClientId);
    }, [clients, selectedClientId]);

    const allClientRequests = useMemo(() => {
        if (!selectedClient) return [];
        return requests.filter(r => r.client_id === selectedClient.id);
    }, [requests, selectedClient]);
    
    const lastVisit = useMemo(() => {
        if (!allClientRequests || allClientRequests.length === 0) {
            return null;
        }

        const lastRequest = [...allClientRequests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        const visitDate = new Date(lastRequest.created_at);
        const today = new Date();
        
        const visitDateDay = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());
        const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const diffTime = todayDay.getTime() - visitDateDay.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        const formattedDate = `${visitDate.getFullYear()}/${visitDate.getMonth() + 1}/${visitDate.getDate()}`;
        const dayOfWeek = visitDate.toLocaleDateString('ar-SA', { weekday: 'long' });

        let daysAgoText = '';
        if (diffDays === 0) {
            daysAgoText = 'اليوم';
        } else if (diffDays === 1) {
            daysAgoText = 'منذ يوم';
        } else if (diffDays === 2) {
            daysAgoText = 'منذ يومين';
        } else if (diffDays >= 3 && diffDays <= 10) {
            daysAgoText = `منذ ${diffDays} أيام`;
        } else {
            daysAgoText = `منذ ${diffDays} يوم`;
        }

        return {
            date: formattedDate,
            dayOfWeek,
            daysAgo: daysAgoText
        };
    }, [allClientRequests]);

    const clientFinancials = useMemo(() => {
        if (!selectedClient) return { totalRevenue: 0, totalPaid: 0, totalRemaining: 0 };
    
        const totalRevenue = allClientRequests.reduce((acc, req) => acc + req.price, 0);
        const totalPaid = allClientRequests
            .filter(req => req.payment_type !== PaymentType.Unpaid)
            .reduce((acc, req) => acc + req.price, 0);
        const totalRemaining = totalRevenue - totalPaid;
    
        return { totalRevenue, totalPaid, totalRemaining };
    }, [allClientRequests, selectedClient]);


    const requestsForClient = useMemo(() => {
        if (!selectedClient) return [];
        
        let clientRequests = allClientRequests;

        const lowercasedTerm = requestSearchTerm.toLowerCase();
        if (lowercasedTerm) {
            clientRequests = clientRequests.filter(req => {
                const carInfo = getCarInfo(req.car_id);
                const carName = req.car_snapshot ? `${req.car_snapshot.make_ar} ${req.car_snapshot.model_ar}` : carInfo.name;
                return carName.toLowerCase().includes(lowercasedTerm) ||
                       carInfo.plate.toLowerCase().includes(lowercasedTerm);
            });
        }

        return clientRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [allClientRequests, selectedClient, requestSearchTerm, cars, carMakes, carModels]);


    const handleAddClient = () => {
        setCurrentClient({ name: '', phone: '' });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleEditClient = (client: Client) => {
        setCurrentClient(client);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDeleteClient = async (client: Client) => {
        showConfirmModal({
            title: `حذف العميل ${client.name}`,
            message: 'هل أنت متأكد من حذف هذا العميل؟ لا يمكن حذف عميل لديه طلبات فحص مسجلة.',
            onConfirm: async () => {
                try {
                    await deleteClient(client.id);
                    addNotification({ title: 'نجاح', message: 'تم حذف العميل بنجاح.', type: 'success' });
                    setSelectedClientId(null);
                } catch (error: any) {
                    addNotification({ title: 'خطأ', message: error.message || 'فشل حذف العميل.', type: 'error' });
                }
            }
        });
    };

    const handleSaveClient = async () => {
        if (!currentClient.name?.trim() || !currentClient.phone?.trim()) {
            addNotification({ title: 'بيانات ناقصة', message: 'الرجاء إدخال الاسم ورقم الهاتف.', type: 'error' });
            return;
        }
        if (currentClient.phone.length !== 10) {
            addNotification({ title: 'خطأ', message: 'رقم الهاتف يجب أن يتكون من 10 أرقام.', type: 'error' });
            return;
        }
        try {
            if (isEditing) {
                await updateClient(currentClient as Client);
                addNotification({ title: 'نجاح', message: 'تم تحديث بيانات العميل.', type: 'success' });
            } else {
                await addClient({ ...currentClient, id: uuidv4() } as Client);
                addNotification({ title: 'نجاح', message: 'تمت إضافة العميل بنجاح.', type: 'success' });
            }
            setIsModalOpen(false);
        } catch (error) {
            addNotification({ title: 'خطأ', message: 'فشلت عملية الحفظ.', type: 'error' });
        }
    };
    

    const primaryColor = design === 'classic' ? 'teal' : design === 'glass' ? 'indigo' : 'blue';
    const selectedClasses = design === 'classic' ? 'bg-teal-100 dark:bg-teal-900/50' : design === 'glass' ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-blue-100 dark:bg-blue-900/50';


    return (
        <div className="container mx-auto">
             <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-200">إدارة العملاء</h2>
             <div className="md:flex md:gap-6 h-[calc(100vh-150px)]">
                {/* Client List */}
                <div className={`md:w-1/3 lg:w-1/4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg flex-col ${selectedClientId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">قائمة العملاء ({filteredClients.length})</h3>
                        <Button onClick={handleAddClient} size="sm" leftIcon={<Icon name="add"/>}>إضافة</Button>
                    </div>
                    <div className="relative mb-4">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="h-5 w-5 text-slate-400"/></span>
                        <input type="text" placeholder="بحث بالاسم أو الهاتف..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={searchInputClasses}/>
                    </div>
                    <ul className="space-y-2 overflow-y-auto flex-grow">
                        {filteredClients.map(client => (
                            <li key={client.id}>
                                <button onClick={() => setSelectedClientId(client.id)} className={`w-full text-right p-3 rounded-md transition-colors ${selectedClientId === client.id ? selectedClasses : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{client.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{client.phone}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Client Details */}
                <div className={`w-full md:w-2/3 lg:w-3/4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg overflow-y-auto ${selectedClientId ? 'block' : 'hidden md:block'}`}>
                    <Button variant="secondary" onClick={() => setSelectedClientId(null)} className="md:hidden mb-4">
                         <Icon name="back" className="w-4 h-4 transform scale-x-[-1]" />
                         <span className="ms-2">العودة للقائمة</span>
                    </Button>
                    {selectedClient ? (
                        <div className="space-y-6 animate-fade-in">
                            <div className="p-4 border rounded-lg dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className={`text-2xl font-bold text-${primaryColor}-600 dark:text-${primaryColor}-400`}>{selectedClient.name}</h3>
                                        <div className="flex items-center gap-2 mt-2 text-slate-600 dark:text-slate-300">
                                            <PhoneIcon className="w-5 h-5"/>
                                            <span>{selectedClient.phone}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => handleEditClient(selectedClient)}><Icon name="edit" className="w-4 h-4"/></Button>
                                        <Button variant="danger" onClick={() => handleDeleteClient(selectedClient)}><Icon name="delete" className="w-4 h-4"/></Button>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-lg font-bold mb-2">البيانات المالية</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                     <div className="p-4 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-center flex flex-col justify-center">
                                        <p className="text-sm text-purple-600 dark:text-purple-400">آخر زيارة</p>
                                        {lastVisit ? (
                                            <div className="mt-1">
                                                <p className="text-xl font-bold text-purple-800 dark:text-purple-200">{lastVisit.date}</p>
                                                <p className="text-md text-purple-700 dark:text-purple-300">{lastVisit.dayOfWeek} ({lastVisit.daysAgo})</p>
                                            </div>
                                        ) : (
                                            <p className="text-lg font-bold text-purple-800 dark:text-purple-200 mt-2">لا توجد زيارات سابقة</p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg text-center">
                                        <p className="text-sm text-green-600 dark:text-green-400">إجمالي الإيرادات</p>
                                        <p className="text-2xl font-bold text-green-800 dark:text-green-200">{clientFinancials.totalRevenue.toLocaleString('en-US')} ريال</p>
                                    </div>
                                    <div className="p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-center">
                                        <p className="text-sm text-blue-600 dark:text-blue-400">المدفوع</p>
                                        <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{clientFinancials.totalPaid.toLocaleString('en-US')} ريال</p>
                                    </div>
                                    <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-lg text-center">
                                        <p className="text-sm text-red-600 dark:text-red-400">المتبقي</p>
                                        <p className="text-2xl font-bold text-red-800 dark:text-red-200">{clientFinancials.totalRemaining.toLocaleString('en-US')} ريال</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-bold mb-2">سجل الطلبات ({requestsForClient.length})</h4>
                                 <div className="relative mb-4">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="h-5 w-5 text-slate-400"/></span>
                                    <input type="text" placeholder="بحث في الطلبات باللوحة أو اسم السيارة..." value={requestSearchTerm} onChange={e => setRequestSearchTerm(e.target.value)} className={searchInputClasses}/>
                                </div>
                                <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
                                     <table className="w-full text-sm">
                                        <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-400">
                                            <tr>
                                                <th className="px-4 py-2">رقم الطلب</th>
                                                <th className="px-4 py-2">السيارة</th>
                                                <th className="px-4 py-2">التاريخ</th>
                                                <th className="px-4 py-2">الحالة</th>
                                                <th className="px-4 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="dark:text-slate-300">
                                            {requestsForClient.map(req => {
                                                const carInfo = getCarInfo(req.car_id);
                                                const carName = req.car_snapshot ? `${req.car_snapshot.make_ar} ${req.car_snapshot.model_ar}` : carInfo.name;
                                                return (
                                                    <tr key={req.id} className="border-t dark:border-slate-700">
                                                        <td className="px-4 py-2">{req.request_number}</td>
                                                        <td className="px-4 py-2">{carName}</td>
                                                        <td className="px-4 py-2">{new Date(req.created_at).toLocaleDateString('en-GB')}</td>
                                                        <td className="px-4 py-2">{req.status}</td>
                                                        <td className="px-4 py-2">
                                                             <Button variant="secondary" size="sm" onClick={() => { setSelectedRequestId(req.id); setPage('print-report'); }}>
                                                                عرض التقرير
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                     </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden md:flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                            <UsersIcon className="w-16 h-16 mb-4"/>
                            <h3 className="text-xl font-semibold">اختر عميل لعرض التفاصيل</h3>
                            <p className="mt-2">أو قم بإضافة عميل جديد للبدء.</p>
                        </div>
                    )}
                </div>
             </div>
             
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">اسم العميل</label>
                        <input type="text" value={currentClient.name || ''} onChange={e => setCurrentClient(p => ({...p, name: e.target.value}))} className={formInputClasses} required/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">رقم الهاتف</label>
                        <input type="tel" value={currentClient.phone || ''} onChange={e => setCurrentClient(p => ({...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10)}))} className={formInputClasses} required placeholder="05xxxxxxxx" style={{ direction: 'ltr', textAlign: 'right' }}/>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSaveClient}>حفظ</Button>
                </div>
            </Modal>
        </div>
    );
};

export default Clients;