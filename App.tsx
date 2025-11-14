

import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import Clients from './pages/Clients';
import Settings from './pages/Settings';
// FIX: Changed import to a named import to resolve the module resolution error.
import { FillRequest } from './pages/FillRequest';
import PrintReport from './pages/PrintReport';
import NotificationContainer from './components/NotificationContainer';
import ConfirmModal from './components/ConfirmModal';
import SetupWizard from './pages/SetupWizard';
import Login from './pages/Login';
import Financials from './pages/Financials';
import Expenses from './pages/Expenses';
import { Page } from './types';
import RequestDraft from './pages/RequestDraft';
import Profile from './pages/employees/Profile';
import Brokers from './pages/Brokers';
import NewRequestSuccessModal from './components/NewRequestSuccessModal';

const AppContent: React.FC = () => {
  const { page, setPage, isLoading, isSetupComplete, authUser, can, settings } = useAppContext();
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (authUser) {
      // If the current page is the dashboard but the user doesn't have permission,
      // redirect them to the first available page.
      if (page === 'dashboard' && !can('view_dashboard')) {
        const availablePages: Page[] = [];
        if (can('view_financials')) availablePages.push('financials');
        // FIX: Add 'expenses' page to the list of available pages for redirection.
        if (can('manage_expenses')) availablePages.push('expenses');
        const canAccessRequests = can('create_requests') || can('fill_requests') || can('update_requests_data') || can('delete_requests');
        if (canAccessRequests) availablePages.push('requests');
        if (can('manage_clients')) availablePages.push('clients');
        if (can('manage_brokers')) availablePages.push('brokers');
        const canManageSettings = can('manage_settings_general') || can('manage_settings_technical') || can('manage_employees');
        if (canManageSettings) availablePages.push('settings');
        
        if (availablePages.length > 0) {
          setPage(availablePages[0]);
        }
      }
    }
  }, [authUser, page, can, setPage]);

  React.useEffect(() => {
    const bgContainer = document.getElementById('background-container');
    const blobs = [
        document.getElementById('blob-1'),
        document.getElementById('blob-2'),
        document.getElementById('blob-3')
    ];
    if (!bgContainer) return;

    const hideBlobs = () => blobs.forEach(blob => { if (blob) blob.style.display = 'none'; });
    const showBlobs = () => blobs.forEach(blob => { if (blob) blob.style.display = 'block'; });

    if (settings.backgroundImageUrl) {
        bgContainer.style.backgroundImage = `url(${settings.backgroundImageUrl})`;
        bgContainer.style.backgroundColor = '';
        hideBlobs();
    } else if (settings.backgroundColor) {
        bgContainer.style.backgroundImage = '';
        bgContainer.style.backgroundColor = settings.backgroundColor;
        hideBlobs();
    } else {
        bgContainer.style.backgroundImage = '';
        bgContainer.style.backgroundColor = '';
        showBlobs();
    }
  }, [settings.backgroundImageUrl, settings.backgroundColor]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-4">جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  // Render setup wizard if setup is not complete
  if (!isSetupComplete) {
    return <SetupWizard />;
  }

  // If setup is complete but no user is authenticated, show login page
  if (!authUser) {
    return <Login />;
  }

  const mainContent = () => {
    switch (page) {
      case 'dashboard':
        return can('view_dashboard') ? <Dashboard /> : null;
      case 'financials':
        return can('view_financials') ? <Financials /> : null;
      case 'requests':
        return <Requests />;
      case 'clients':
        return can('manage_clients') ? <Clients /> : null;
      case 'brokers':
        return can('manage_brokers') ? <Brokers /> : null;
      case 'settings':
        return <Settings />;
      case 'fill-request':
        return can('fill_requests') ? <FillRequest /> : null;
      case 'print-report':
        return <PrintReport />;
      // FIX: Add the 'expenses' page to the router.
      case 'expenses':
        return can('manage_expenses') ? <Expenses /> : null;
      case 'request-draft':
        return <RequestDraft />;
      case 'profile':
        return <Profile />;
      default:
        return can('view_dashboard') ? <Dashboard /> : null;
    }
  };

  // Pages that take over the whole screen
  if (page === 'print-report' || page === 'request-draft' || page === 'fill-request') {
    return mainContent();
  }

  return (
    <div className="flex h-screen text-slate-800 dark:text-slate-200">
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100/80 dark:bg-slate-900/80 p-4 sm:p-6">
          {mainContent()}
        </main>
      </div>
      <NotificationContainer />
      <ConfirmModal />
      <NewRequestSuccessModal />
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;