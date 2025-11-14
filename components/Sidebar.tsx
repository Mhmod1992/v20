

import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import HomeIcon from './icons/HomeIcon';
import FileTextIcon from './icons/FileTextIcon';
import UsersIcon from './icons/UsersIcon';
import SettingsIcon from './icons/SettingsIcon';
import { Page } from '../types';
import DollarSignIcon from './icons/DollarSignIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';

interface SidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, setSidebarOpen }) => {
  const { page, setPage, can, settings, setSettingsPage } = useAppContext();
  const design = settings.design || 'aero';

  const handleNavigation = (view: Page) => {
    setPage(view);
    if (window.innerWidth < 768) { // md breakpoint
        setSidebarOpen(false);
    }
  };

  const navItems = useMemo(() => {
    const items = [];
    if (can('view_dashboard')) {
      items.push({ id: 'dashboard', label: 'لوحة التحكم', icon: HomeIcon });
    }

    if (can('view_financials')) {
      items.push({ id: 'financials', label: 'المالية', icon: DollarSignIcon });
    }

    // FIX: Add navigation item for the Expenses page.
    if (can('manage_expenses')) {
      items.push({ id: 'expenses', label: 'المصروفات', icon: ClipboardListIcon });
    }

    const canAccessRequests = can('create_requests') || can('fill_requests') || can('update_requests_data') || can('delete_requests');
    if (canAccessRequests) {
      items.push({ id: 'requests', label: 'إدارة الطلبات', icon: FileTextIcon });
    }
    
    if (can('manage_clients')) {
      items.push({ id: 'clients', label: 'إدارة العملاء', icon: UsersIcon });
    }

    if (can('manage_brokers')) {
      items.push({ id: 'brokers', label: 'إدارة السماسرة', icon: BriefcaseIcon });
    }

    const canManageOtherSettings = can('manage_settings_general') || can('manage_settings_technical') || can('manage_employees');
    if (canManageOtherSettings) {
      items.push({ id: 'settings', label: 'الإعدادات', icon: SettingsIcon });
    }
    return items;
  }, [can]);
  
  const baseClasses = "fixed md:relative inset-y-0 right-0 z-30 w-56 transform transition-transform duration-300 ease-in-out";
  const openClasses = "translate-x-0";
  const closedClasses = "translate-x-full md:translate-x-0";

  const getDesignClasses = () => {
    const sidebarStyle = settings.sidebarStyle || 'default';
    const minimalBorder = sidebarStyle === 'minimal' ? '' : 'border-l border-slate-200 dark:border-slate-700';
    const minimalGlassBorder = sidebarStyle === 'minimal' ? '' : 'border-l border-white/20 dark:border-slate-700/50';

    switch (design) {
        case 'glass':
            const intensity = settings.glassmorphismIntensity || 5;
            const opacity = 1.0 - (intensity * 0.065);
            const darkOpacity = 1.0 - (intensity * 0.05);
            const blurLevels: { [key: number]: string } = {1: 'sm', 2: 'sm', 3: '', 4: '', 5: 'md', 6: 'md', 7: 'lg', 8: 'lg', 9: 'xl', 10: 'xl' };
            const blur = blurLevels[intensity] || 'md';
            const blurClass = `backdrop-blur${blur ? `-${blur}` : ''}`;
            const glassBg = `bg-white/[${opacity.toFixed(2)}] dark:bg-slate-800/[${darkOpacity.toFixed(2)}] ${blurClass}`;
            
            return {
                sidebar: `${glassBg} ${minimalGlassBorder}`,
                header: 'border-b border-white/20 dark:border-slate-700/50',
                logo: 'text-indigo-600 dark:text-indigo-400',
                active: 'bg-white/50 dark:bg-white/20 text-indigo-700 dark:text-white font-semibold shadow-lg',
                inactive: 'text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-white/10'
            };
        case 'classic':
            return {
                sidebar: `bg-white dark:bg-slate-800 ${minimalBorder}`,
                header: 'border-b border-slate-200 dark:border-slate-700',
                logo: 'text-teal-600 dark:text-teal-400',
                active: 'bg-teal-50 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 font-semibold shadow-sm',
                inactive: 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            };
        default: // aero
            return {
                sidebar: `bg-white dark:bg-slate-800 ${minimalBorder}`,
                header: 'border-b border-slate-200 dark:border-slate-700',
                logo: 'text-blue-600 dark:text-blue-400',
                active: 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold shadow-sm',
                inactive: 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            };
    }
  };

  const designClasses = getDesignClasses();

  return (
    <>
        {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-20 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
        <aside className={`${baseClasses} ${isSidebarOpen ? openClasses : closedClasses} ${designClasses.sidebar}`}>
        <div className={`flex items-center justify-center h-16 ${designClasses.header}`}>
            <h1 className={`text-2xl font-bold ${designClasses.logo} tracking-tight`}>Aero</h1>
        </div>
        <nav className="p-3 space-y-1">
            {navItems.map(item => {
                const isActive = page === item.id;
                return (
                    <a
                        key={item.id}
                        href="#"
                        onClick={(e) => { 
                            e.preventDefault(); 
                            if (item.id === 'settings') {
                                setSettingsPage('general');
                                handleNavigation('settings');
                            } else {
                                handleNavigation(item.id as Page);
                            }
                        }}
                        className={`flex items-center gap-x-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                        isActive
                        ? designClasses.active
                        : designClasses.inactive
                        }`}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="text-sm">{item.label}</span>
                    </a>
                );
            })}
        </nav>
        </aside>
    </>
  );
};

export default Sidebar;