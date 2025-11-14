import React, { useState, useRef, useEffect } from 'react';
import { InspectionRequest, RequestStatus } from '../types';
import { useAppContext } from '../context/AppContext';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import PrinterIcon from './icons/PrinterIcon';
import RefreshCwIcon from './icons/RefreshCwIcon';
import FileTextIcon from './icons/FileTextIcon';
import UndoIcon from './icons/UndoIcon';

interface RequestTableProps {
  requests: InspectionRequest[];
  title: string;
  onOpenUpdateModal?: (request: InspectionRequest) => void;
  plateDisplayLanguage?: 'ar' | 'en';
  setPlateDisplayLanguage?: React.Dispatch<React.SetStateAction<'ar' | 'en'>>;
  isRefreshing?: boolean;
}

const RequestTable: React.FC<RequestTableProps> = ({ requests, title, onOpenUpdateModal, plateDisplayLanguage = 'ar', setPlateDisplayLanguage, isRefreshing }) => {
  const { 
    clients, cars, carMakes, carModels, settings,
    setPage, setSelectedRequestId, showConfirmModal, 
    deleteRequest, addNotification, can, updateRequest
  } = useAppContext();
  const design = settings.design || 'aero';
  
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
            setOpenActionMenuId(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const getStatusClass = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.COMPLETE:
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case RequestStatus.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case RequestStatus.NEW:
         if (design === 'classic') return 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300';
         if (design === 'glass') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300';
         return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  const getClientInfo = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return {
      name: client?.name || 'غير معروف',
      phone: client?.phone || '',
    };
  };
  
  const getCarInfo = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return { name: 'غير معروف', plate: '' };
    const make = carMakes.find(m => m.id === car.make_id)?.name_en;
    const model = carModels.find(m => m.id === car.model_id)?.name_en;

    if (car.plate_number.startsWith('شاصي')) {
        return {
          name: `${make || ''} ${model || ''} (${car.year})`,
          plate: car.plate_number,
        };
    }

    const plateParts = car.plate_number.split(' ');
    const plateLettersString = plateParts.filter(part => !/^\d+$/.test(part)).join('');
    const plateNumbers = plateParts.find(part => /^\d+$/.test(part)) || '';
    
    let finalPlateLetters = '';
    if (plateDisplayLanguage === 'en' && settings?.plateCharacters) {
        const arToEnMap = new Map<string, string>();
        settings.plateCharacters.forEach(pc => {
            arToEnMap.set(pc.ar.replace('ـ', ''), pc.en);
        });
        finalPlateLetters = plateLettersString.split('').map(char => arToEnMap.get(char) || char).reverse().join(' ');
    } else {
        finalPlateLetters = plateLettersString.split('').join(' ');
    }

    const plateDisplay = [finalPlateLetters, plateNumbers].filter(Boolean).join('  ');

    return {
      name: `${make || ''} ${model || ''} (${car.year})`,
      plate: plateDisplay,
    };
  };

  const handleEdit = (requestId: string) => {
    setSelectedRequestId(requestId);
    setPage('fill-request');
  };
  
  const handlePrint = (requestId: string) => {
    setSelectedRequestId(requestId);
    setPage('print-report');
  };
  
  const handleViewDraft = (requestId: string) => {
    setSelectedRequestId(requestId);
    setPage('request-draft');
  };

  const handleDelete = (request: InspectionRequest) => {
    showConfirmModal({
        title: `حذف الطلب رقم ${request.request_number}`,
        message: 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
        onConfirm: async () => {
            try {
                await deleteRequest(request.id);
                addNotification({ title: 'نجاح', message: 'تم حذف الطلب بنجاح.', type: 'success' });
            } catch (error) {
                addNotification({ title: 'خطأ', message: 'فشل حذف الطلب.', type: 'error' });
            }
        }
    });
  };

  const handleRevertStatus = (request: InspectionRequest) => {
    showConfirmModal({
        title: `إعادة فتح الطلب`,
        message: `هل أنت متأكد من تغيير حالة الطلب رقم ${request.request_number} إلى "قيد التنفيذ"؟`,
        onConfirm: async () => {
            try {
                await updateRequest({ ...request, status: RequestStatus.IN_PROGRESS });
                addNotification({ title: 'نجاح', message: 'تم إعادة فتح الطلب.', type: 'success' });
            } catch (error) {
                addNotification({ title: 'خطأ', message: 'فشل تغيير حالة الطلب.', type: 'error' });
            }
        }
    });
};

  const primaryColor = design === 'classic' ? 'teal' : design === 'glass' ? 'indigo' : 'blue';
  const toggleCheckedClasses = design === 'classic' ? 'peer-checked:bg-teal-600' : design === 'glass' ? 'peer-checked:bg-indigo-600' : 'peer-checked:bg-blue-600';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-x-auto">
      <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
        <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            {isRefreshing && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 animate-pulse" title="يتم التحديث تلقائياً">
                    <RefreshCwIcon className="w-3 h-3 animate-spin" />
                    <span>تحديث...</span>
                </div>
            )}
        </div>
        {setPlateDisplayLanguage && (
          <label htmlFor="plate-lang-toggle" className="flex items-center cursor-pointer">
            <span className="mr-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              عرض الأحرف الإنجليزية
            </span>
            <div className="relative">
              <input 
                type="checkbox" 
                id="plate-lang-toggle" 
                className="sr-only peer"
                checked={plateDisplayLanguage === 'en'}
                onChange={(e) => setPlateDisplayLanguage(e.target.checked ? 'en' : 'ar')}
              />
              <div className={`w-11 h-6 bg-slate-200 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 ${toggleCheckedClasses}`}></div>
            </div>
          </label>
        )}
      </div>
      
      {requests.length > 0 ? (
        <table className="w-full text-sm text-right rtl:text-right text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                <tr>
                    <th scope="col" className="px-4 py-3">رقم الطلب</th>
                    <th scope="col" className="px-6 py-3">العميل</th>
                    <th scope="col" className="px-6 py-3 sticky right-0 bg-slate-50 dark:bg-slate-700 z-10 md:static">السيارة</th>
                    <th scope="col" className="px-6 py-3">الحالة</th>
                    <th scope="col" className="px-6 py-3">التاريخ</th>
                    <th scope="col" className="px-6 py-3">السعر</th>
                    <th scope="col" className="px-4 py-3 text-left">إجراءات</th>
                </tr>
            </thead>
            <tbody>
                {requests.map((request) => {
                    const clientInfo = getClientInfo(request.client_id);
                    const carInfo = getCarInfo(request.car_id);
                    const carDisplayName = request.car_snapshot
                        ? `${request.car_snapshot.make_en} ${request.car_snapshot.model_en} (${request.car_snapshot.year})`
                        : carInfo.name;

                    return (
                        <tr key={request.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 align-middle">
                            <td className="px-4 py-2 font-bold text-slate-900 whitespace-nowrap dark:text-white">
                                #{request.request_number}
                            </td>
                            <td className="px-6 py-2">
                                <div className="font-medium text-slate-900 dark:text-white">{clientInfo.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{clientInfo.phone}</div>
                            </td>
                            <td className="px-6 py-2 sticky right-0 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 md:static z-10">
                                <div className="font-medium text-slate-900 dark:text-white">{carDisplayName}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{carInfo.plate}</div>
                            </td>
                             <td className="px-6 py-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusClass(request.status)}`}>
                                    {request.status}
                                </span>
                            </td>
                            <td className="px-6 py-2">
                                <div>{new Date(request.created_at).toLocaleDateString('en-GB')}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(request.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                            </td>
                             <td className="px-6 py-2 font-semibold text-slate-800 dark:text-slate-200">
                                {request.price.toLocaleString('en-US')} <span className="text-xs">ريال</span>
                            </td>
                            <td className="px-4 py-2 text-left">
                                <div className="flex items-center justify-start gap-1">
                                    {onOpenUpdateModal && can('update_requests_data') && (
                                        request.status === RequestStatus.COMPLETE && can('change_request_status') ? (
                                            <div className="relative inline-block text-left" ref={openActionMenuId === request.id ? actionMenuRef : null}>
                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenActionMenuId(openActionMenuId === request.id ? null : request.id)}
                                                        className={`p-2 rounded-full text-${primaryColor}-500 hover:bg-${primaryColor}-100 dark:hover:bg-${primaryColor}-900/50 transition-colors`}
                                                        aria-haspopup="true"
                                                        aria-expanded={openActionMenuId === request.id}
                                                        title="خيارات التحديث"
                                                    >
                                                        <RefreshCwIcon className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {openActionMenuId === request.id && (
                                                    <div
                                                        className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 dark:ring-slate-700 focus:outline-none z-10 animate-fade-in"
                                                        role="menu"
                                                        aria-orientation="vertical"
                                                    >
                                                        <div className="py-1" role="none">
                                                            <button
                                                                onClick={() => {
                                                                    onOpenUpdateModal(request);
                                                                    setOpenActionMenuId(null);
                                                                }}
                                                                className="flex items-center gap-3 w-full text-right px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                                role="menuitem"
                                                            >
                                                                <RefreshCwIcon className="w-4 h-4" />
                                                                <span>تحديث الطلب</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    handleRevertStatus(request);
                                                                    setOpenActionMenuId(null);
                                                                }}
                                                                className="flex items-center gap-3 w-full text-right px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                                role="menuitem"
                                                            >
                                                                <UndoIcon className="w-4 h-4" />
                                                                <span>إعادة فتح الطلب</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => onOpenUpdateModal(request)}
                                                className={`p-2 rounded-full text-${primaryColor}-500 hover:bg-${primaryColor}-100 dark:hover:bg-${primaryColor}-900/50 transition-colors`}
                                                title="تحديث بيانات الطلب"
                                            >
                                                <RefreshCwIcon className="w-5 h-5" />
                                            </button>
                                        )
                                    )}

                                    {can('fill_requests') && (
                                        <button
                                            onClick={() => handleEdit(request.id)}
                                            className="p-2 rounded-full text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
                                            title="تعبئة بيانات الفحص"
                                        >
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleViewDraft(request.id)}
                                        className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                        title="عرض المسودة"
                                    >
                                        <FileTextIcon className="w-5 h-5" />
                                    </button>
                                    {can('print_request') && (
                                        <button
                                            onClick={() => handlePrint(request.id)}
                                            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                                            title="معاينة وطباعة"
                                        >
                                            <PrinterIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                    {can('delete_requests') && (
                                        <button
                                            onClick={() => handleDelete(request)}
                                            className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                            title="حذف الطلب"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
      ) : (
         <p className="p-6 text-center text-slate-500 dark:text-slate-400">
            لا توجد طلبات لعرضها.
         </p>
      )}
    </div>
  );
};

export default RequestTable;