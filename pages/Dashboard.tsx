import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import DashboardCard from '../components/DashboardCard';
import RequestTable from '../components/RequestTable';
import { RequestStatus, Page } from '../types';
import FileTextIcon from '../components/icons/FileTextIcon';
import UsersIcon from '../components/icons/UsersIcon';
import PlusIcon from '../components/icons/PlusIcon';
import RefreshCwIcon from '../components/icons/RefreshCwIcon';
import ActionCard from '../components/ActionCard';
import SettingsIcon from '../components/icons/SettingsIcon';

const Dashboard: React.FC = () => {
  const { requests, clients, authUser, setPage, can, setInitialRequestModalState } = useAppContext();

  const visibleRequests = useMemo(() => {
    if (authUser?.role === 'employee') {
      return requests.filter(r => r.status !== RequestStatus.COMPLETE);
    }
    return requests;
  }, [requests, authUser]);

  const totalRequests = visibleRequests.length;
  const inProgressRequests = visibleRequests.filter(r => r.status === RequestStatus.IN_PROGRESS || r.status === RequestStatus.NEW).length;
  const completedRequests = visibleRequests.filter(r => r.status === RequestStatus.COMPLETE).length;
  const totalClients = clients.length;

  const latestRequests = [...visibleRequests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  
  const actionCards = useMemo(() => {
    const cards = [];

    if (can('create_requests')) {
      cards.push({
        id: 'new-request',
        title: 'إنشاء طلب جديد',
        icon: <PlusIcon />,
        onClick: () => {
          setInitialRequestModalState('new');
          setPage('requests');
        },
      });
    }

    const canAccessRequests = can('create_requests') || can('fill_requests') || can('update_requests_data') || can('delete_requests');
    if (canAccessRequests) {
      cards.push({
        id: 'manage-requests',
        title: 'إدارة الطلبات',
        icon: <FileTextIcon />,
        onClick: () => setPage('requests'),
      });
    }

    if (can('manage_clients')) {
      cards.push({
        id: 'manage-clients',
        title: 'إدارة العملاء',
        icon: <UsersIcon />,
        onClick: () => setPage('clients'),
      });
    }

    const canManageSettings = can('manage_settings_general') || can('manage_settings_technical') || can('manage_brokers') || can('manage_employees');
    if (canManageSettings) {
      cards.push({
        id: 'settings',
        title: 'الإعدادات',
        icon: <SettingsIcon />,
        onClick: () => setPage('settings'),
      });
    }
    
    return cards;
  }, [can, setPage, setInitialRequestModalState]);


  return (
    <div className="container mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-200">لوحة التحكم</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard 
          title="إجمالي الطلبات" 
          value={totalRequests} 
          icon={<FileTextIcon />}
          color="blue" 
        />
        <DashboardCard 
          title="طلبات قيد التنفيذ" 
          value={inProgressRequests} 
          icon={<RefreshCwIcon />}
          color="yellow"
        />
        <DashboardCard 
          title="طلبات مكتملة" 
          value={completedRequests} 
          icon={<FileTextIcon />}
          color="green"
        />
        <DashboardCard 
          title="إجمالي العملاء" 
          value={totalClients} 
          icon={<UsersIcon />}
          color="indigo"
        />
      </div>

      {actionCards.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">إجراءات سريعة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {actionCards.map(card => (
              <ActionCard
                key={card.id}
                title={card.title}
                icon={card.icon}
                onClick={card.onClick}
              />
            ))}
          </div>
        </div>
      )}

      <RequestTable 
        requests={latestRequests} 
        title="أحدث 5 طلبات" 
      />
    </div>
  );
};

export default Dashboard;