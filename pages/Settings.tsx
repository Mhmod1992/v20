import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Permission, SettingsPage } from '../types';
import Icon from '../components/Icon';
// Import sub-pages
import GeneralSettings from './settings/GeneralSettings';
import PlateSettings from './settings/PlateSettings';
import InspectionSettings from './settings/InspectionSettings';
import CarsManagement from './settings/CarsManagement';
import EmployeesManagement from './settings/EmployeesManagement';
import ReportSettings from './settings/ReportSettings';
import AppearanceSettings from './settings/AppearanceSettings';
import ApiSettings from './settings/ApiSettings';

const Settings: React.FC = () => {
    const { settingsPage, setSettingsPage, can, settings } = useAppContext();
    const design = settings.design || 'aero';

    const subPageComponents: Record<SettingsPage, React.ComponentType> = {
        'general': GeneralSettings,
        'appearance': AppearanceSettings,
        'plate': PlateSettings,
        'report': ReportSettings,
        'request': InspectionSettings,
        'cars': CarsManagement,
        'employees': EmployeesManagement,
        'api': ApiSettings,
    };
    
    const navItems: { id: SettingsPage; name: string; icon: any, permission: Permission | null }[] = [
        { id: 'general', name: 'عام', icon: 'settings', permission: 'manage_settings_general' },
        { id: 'appearance', name: 'المظهر', icon: 'appearance', permission: 'manage_settings_general' },
        { id: 'report', name: 'إعدادات التقرير', icon: 'document-report', permission: 'manage_settings_general' },
        { id: 'plate', name: 'لوحة السيارة', icon: 'report', permission: 'manage_settings_technical' },
        { id: 'request', name: 'الفحص', icon: 'findings', permission: 'manage_settings_technical' },
        { id: 'cars', name: 'السيارات', icon: 'cars', permission: 'manage_settings_technical' },
        { id: 'employees', name: 'الموظفين', icon: 'employee', permission: 'manage_employees' },
        { id: 'api', name: 'Gemini API', icon: 'sparkles', permission: 'manage_settings_general' },
    ];

    const visibleNavItems = navItems.filter(item => item.permission === null || can(item.permission));

    const ComponentToRender = subPageComponents[settingsPage] || GeneralSettings;

    const getActiveTabClasses = () => {
        switch (design) {
            case 'classic':
                return 'border-teal-500 text-teal-600 dark:text-teal-400';
            case 'glass':
                return 'border-indigo-500 text-indigo-600 dark:text-indigo-400';
            default: // aero
                return 'border-blue-500 text-blue-600 dark:text-blue-400';
        }
    };

    return (
        <div className="container mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">الإعدادات</h2>
            <div className="bg-white dark:bg-slate-800 p-2 sm:p-4 rounded-xl shadow-lg">
                <nav className="flex flex-wrap" aria-label="Settings Tabs">
                    {visibleNavItems.map(item => (
                         <button
                            key={item.id}
                            onClick={() => setSettingsPage(item.id)}
                            className={`flex items-center gap-2 whitespace-nowrap pb-3 pt-2 px-2 sm:px-4 border-b-2 font-medium text-sm sm:text-md focus:outline-none transition-colors duration-200 ${
                                settingsPage === item.id
                                ? getActiveTabClasses()
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                            <Icon name={item.icon} className="w-5 h-5" />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </nav>
            </div>
            <div className="w-full bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-lg min-h-[60vh]">
                <ComponentToRender />
            </div>
        </div>
    );
};

export default Settings;