import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { InspectionRequest, RequestStatus } from '../types';
import RequestTable from '../components/RequestTable';
import Button from '../components/Button';
import PlusIcon from '../components/icons/PlusIcon';
import SearchIcon from '../components/icons/SearchIcon';
import FilterIcon from '../components/icons/FilterIcon';
import Modal from '../components/Modal';
import NewRequestForm from '../components/NewRequestForm';
import UpdateRequestForm from '../components/UpdateRequestForm';

const Requests: React.FC = () => {
  const { requests, clients, cars, can, authUser, settings, initialRequestModalState, setInitialRequestModalState, isRefreshing } = useAppContext();
  const design = settings.design || 'aero';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'الكل'>('الكل');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'month'>('today');
  const [plateDisplayLanguage, setPlateDisplayLanguage] = useState<'ar' | 'en'>('ar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [requestToUpdate, setRequestToUpdate] = useState<InspectionRequest | null>(null);

  const searchInputClasses = "block w-full p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

  useEffect(() => {
    if (initialRequestModalState === 'new') {
      if (can('create_requests')) {
        setIsModalOpen(true);
      }
      setInitialRequestModalState(null); // Reset after use
    }
  }, [initialRequestModalState, setInitialRequestModalState, can]);

  const handleOpenUpdateModal = (request: InspectionRequest) => {
    setRequestToUpdate(request);
    setIsUpdateModalOpen(true);
  };
  
  const { arToEnMap, enToArMap } = useMemo(() => {
    const arToEn = new Map<string, string>();
    const enToAr = new Map<string, string>();
    if (settings?.plateCharacters) {
        settings.plateCharacters.forEach(pc => {
            const normalizedAr = pc.ar.replace('ـ', '');
            arToEn.set(normalizedAr, pc.en);
            enToAr.set(pc.en.toUpperCase(), normalizedAr);
        });
    }
    return { arToEnMap: arToEn, enToArMap: enToAr };
  }, [settings?.plateCharacters]);


  const filteredRequests = useMemo(() => {
    let reqs = requests;
    if (authUser?.role === 'employee') {
        reqs = reqs.filter(r => r.status !== RequestStatus.COMPLETE);
    }
    
    const dateFilteredReqs = reqs.filter(req => {
        if (dateFilter === 'all') return true;

        const reqDate = new Date(req.created_at);
        const now = new Date();

        if (dateFilter === 'today') {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            return reqDate >= startOfToday && reqDate <= endOfToday;
        }

        if (dateFilter === 'yesterday') {
            const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
            return reqDate >= startOfYesterday && reqDate <= endOfYesterday;
        }

        if (dateFilter === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return reqDate >= startOfMonth && reqDate <= endOfMonth;
        }
        return true;
    });

    const statusFilteredReqs = dateFilteredReqs.filter(req => {
        if (statusFilter === 'الكل') return true;
        return req.status === statusFilter;
    });

    const search = searchTerm.toLowerCase().trim();
    if (!search) {
        return statusFilteredReqs;
    }

    const getPlateSearchVariations = (term: string) => {
        const normalizedTerm = term.toLowerCase().replace(/\s/g, '');
        if (!normalizedTerm) return [];

        let translatedTerm = '';
        for (const char of term.replace(/\s/g, '')) {
            const upperChar = char.toUpperCase();
            if (arToEnMap.has(char)) {
                translatedTerm += arToEnMap.get(char)?.toLowerCase() || char;
            } else if (enToArMap.has(upperChar)) {
                translatedTerm += enToArMap.get(upperChar) || char;
            } else {
                translatedTerm += char;
            }
        }
        
        const variations = new Set([normalizedTerm]);
        if (translatedTerm.toLowerCase() !== normalizedTerm) {
            variations.add(translatedTerm.toLowerCase());
        }
        return Array.from(variations);
    };

    const searchVariations = getPlateSearchVariations(search);

    return statusFilteredReqs.filter(req => {
        const client = clients.find(c => c.id === req.client_id);
        const car = cars.find(c => c.id === req.car_id);

        const clientNameMatch = client?.name?.toLowerCase().includes(search);
        const clientPhoneMatch = client?.phone?.includes(search);
        const requestNumberMatch = req.request_number.toString().includes(search);
        
        let plateMatch = false;
        if (car?.plate_number && searchVariations.length > 0) {
            const plateNumberForSearch = car.plate_number.toLowerCase().replace(/\s/g, '');
            plateMatch = searchVariations.some(variation => plateNumberForSearch.includes(variation));
        }
        
        return requestNumberMatch || clientNameMatch || clientPhoneMatch || plateMatch;
    });
  }, [requests, searchTerm, statusFilter, dateFilter, clients, cars, authUser, arToEnMap, enToArMap]);
  
  const totalCount = filteredRequests.length;
  const inProgressCount = filteredRequests.filter(r => r.status === RequestStatus.IN_PROGRESS || r.status === RequestStatus.NEW).length;
  const completeCount = filteredRequests.filter(r => r.status === RequestStatus.COMPLETE).length;

  const getTotalCardClasses = () => {
      switch(design) {
        case 'classic': return { bg: 'bg-teal-100 dark:bg-teal-900/50', text: 'text-teal-800 dark:text-teal-300', label: 'text-teal-600 dark:text-teal-400' };
        case 'glass': return { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-800 dark:text-indigo-300', label: 'text-indigo-600 dark:text-indigo-400' };
        default: return { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300', label: 'text-blue-600 dark:text-blue-400' };
      }
  }
  const totalCardClasses = getTotalCardClasses();
  
  const activeFilterClasses = design === 'classic' ? 'bg-teal-600 text-white shadow' : design === 'glass' ? 'bg-indigo-600 text-white shadow' : 'bg-blue-600 text-white shadow';
  
  const DateFilterButton: React.FC<{ filter: 'all' | 'today' | 'yesterday' | 'month'; label: string }> = ({ filter, label }) => (
    <button
        onClick={() => setDateFilter(filter)}
        className={`flex-1 text-center font-semibold py-2 px-3 rounded-lg transition-all duration-200 text-sm ${dateFilter === filter ? activeFilterClasses : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
    >
        {label}
    </button>
  );
    
  return (
    <div className="container mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">إدارة الطلبات</h2>
        {can('create_requests') && (
            <Button onClick={() => setIsModalOpen(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>
              إنشاء طلب جديد
            </Button>
        )}
      </div>

      {/* Date Filters */}
      <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl flex items-center gap-1 mb-6">
          <DateFilterButton filter="all" label="الكل" />
          <DateFilterButton filter="today" label="اليوم" />
          <DateFilterButton filter="yesterday" label="أمس" />
          <DateFilterButton filter="month" label="هذا الشهر" />
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="h-5 w-5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="بحث برقم الطلب, اسم العميل, أو رقم اللوحة..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={searchInputClasses}
            />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FilterIcon className="h-5 w-5 text-slate-400" />
            </span>
             <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as RequestStatus | 'الكل')}
                className={`${searchInputClasses} appearance-none`}
              >
              <option value="الكل">الكل</option>
              <option value={RequestStatus.NEW}>جديد</option>
              <option value={RequestStatus.IN_PROGRESS}>قيد التنفيذ</option>
              {authUser?.role !== 'employee' && (
                <option value={RequestStatus.COMPLETE}>مكتمل</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Counts */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className={`p-4 ${totalCardClasses.bg} rounded-lg`}>
          <p className={`text-xl font-bold ${totalCardClasses.text}`}>{totalCount}</p>
          <p className={`text-sm ${totalCardClasses.label}`}>الإجمالي</p>
        </div>
        <div className="p-4 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
          <p className="text-xl font-bold text-yellow-800 dark:text-yellow-300">{inProgressCount}</p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">قيد التنفيذ</p>
        </div>
        <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg">
          <p className="text-xl font-bold text-green-800 dark:text-green-300">{completeCount}</p>
          <p className="text-sm text-green-600 dark:text-green-400">مكتمل</p>
        </div>
      </div>
      
      <RequestTable 
        requests={filteredRequests} 
        title="قائمة الطلبات" 
        onOpenUpdateModal={handleOpenUpdateModal} 
        plateDisplayLanguage={plateDisplayLanguage} 
        setPlateDisplayLanguage={setPlateDisplayLanguage}
        isRefreshing={isRefreshing}
      />
      
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="إنشاء طلب فحص جديد" size="4xl">
        <NewRequestForm
            onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {requestToUpdate && (
        <Modal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} title={`تحديث بيانات الطلب رقم ${requestToUpdate.request_number}`} size="4xl">
            <UpdateRequestForm
                request={requestToUpdate}
                onCancel={() => setIsUpdateModalOpen(false)}
                onSuccess={() => setIsUpdateModalOpen(false)}
            />
        </Modal>
      )}

    </div>
  );
};

export default Requests;