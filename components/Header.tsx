import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import SearchIcon from './icons/SearchIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import LogOutIcon from './icons/LogOutIcon';
import RefreshCwIcon from './icons/RefreshCwIcon';
import BellIcon from './icons/BellIcon';
import UserCircleIcon from './icons/UserCircleIcon';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { 
    theme, toggleTheme, authUser, logout, isRefreshing, settings,
    appNotifications, markNotificationAsRead, markAllNotificationsAsRead, setPage
  } = useAppContext();

  const design = settings.design || 'aero';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  const unreadCount = appNotifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const getGlassClasses = () => {
      const intensity = settings.glassmorphismIntensity || 5;
      const opacity = 1.0 - (intensity * 0.065);
      const darkOpacity = 1.0 - (intensity * 0.05);
      const blurLevels: { [key: number]: string } = {1: 'sm', 2: 'sm', 3: '', 4: '', 5: 'md', 6: 'md', 7: 'lg', 8: 'lg', 9: 'xl', 10: 'xl' };
      const blur = blurLevels[intensity] || 'md';
      const blurClass = `backdrop-blur${blur ? `-${blur}` : ''}`;
      const glassBg = `bg-white/[${opacity.toFixed(2)}] dark:bg-slate-800/[${darkOpacity.toFixed(2)}] ${blurClass}`;

      return {
          header: `${glassBg} border-b border-white/20 dark:border-slate-700/50`,
          dropdown: `bg-white/[${(opacity + 0.3).toFixed(2)}] dark:bg-slate-800/[${(darkOpacity + 0.2).toFixed(2)}] backdrop-blur-lg border dark:border-slate-700`,
      };
  };

  const { headerClasses, menuDropdownClasses } = useMemo(() => {
      const headerStyle = settings.headerStyle || 'default';

      if (design === 'glass') {
          const classes = getGlassClasses();
          // Elevated style can add more shadow even to glass
          const elevatedShadow = headerStyle === 'elevated' ? 'shadow-xl' : 'shadow-lg';
          return { headerClasses: `${classes.header} ${elevatedShadow}`, menuDropdownClasses: classes.dropdown };
      }
      
      const elevatedShadow = headerStyle === 'elevated' ? 'shadow-lg' : 'shadow-sm';

      return {
          headerClasses: `bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 ${elevatedShadow}`,
          menuDropdownClasses: 'bg-white dark:bg-slate-800 border dark:border-slate-700'
      };
  }, [design, settings.glassmorphismIntensity, settings.headerStyle]);


  return (
    <header className={`relative flex items-center justify-between h-16 px-6 ${headerClasses}`}>
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-slate-500 dark:text-slate-400 focus:outline-none md:hidden">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H20M4 12H20M4 18H11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </button>
        <div className="relative mx-4 hidden md:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
               <SearchIcon className="h-5 w-5 text-slate-400" />
            </span>
            <input 
                className="w-full py-2 pl-10 pr-4 text-slate-700 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 border border-transparent rounded-lg focus:outline-none focus:bg-white dark:focus:bg-slate-600 focus:border-blue-500" 
                type="text" 
                placeholder="بحث..." 
            />
        </div>
      </div>

      {isRefreshing && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 animate-pulse pointer-events-none">
            <RefreshCwIcon className="w-4 h-4 animate-spin" />
            <span>جاري تحديث البيانات...</span>
        </div>
      )}

      <div className="flex items-center gap-2 sm:gap-4">
        <button onClick={toggleTheme} className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:outline-none">
          {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
        </button>
        
        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
            <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 focus:outline-none">
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unreadCount}</span>}
            </button>
            {isNotificationsOpen && (
                <div className={`absolute left-0 mt-2 w-80 rounded-lg shadow-xl z-20 animate-fade-in ${menuDropdownClasses}`}>
                    <div className="p-3 font-semibold border-b dark:border-slate-700">الإشعارات</div>
                    <div className="max-h-80 overflow-y-auto">
                        {appNotifications.slice(0, 5).map(notification => (
                            <div key={notification.id} onClick={() => markNotificationAsRead(notification.id)} className="flex items-start gap-3 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 cursor-pointer">
                                {!notification.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>}
                                <div className={notification.isRead ? 'ms-5' : ''}>
                                    <p className="font-semibold">{notification.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{notification.message}</p>
                                </div>
                            </div>
                        ))}
                         {appNotifications.length === 0 && <p className="p-4 text-center text-sm text-slate-500">لا توجد إشعارات جديدة.</p>}
                    </div>
                    {unreadCount > 0 && <div className="p-2 border-t dark:border-slate-700"><button onClick={markAllNotificationsAsRead} className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline">تحديد الكل كمقروء</button></div>}
                </div>
            )}
        </div>


        {authUser && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-700/50 focus:outline-none"
            >
              <span className="font-semibold text-slate-700 dark:text-slate-200">{authUser.name}</span>
              <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isMenuOpen && (
              <div className={`absolute left-0 mt-2 w-48 rounded-lg shadow-xl z-20 animate-fade-in ${menuDropdownClasses}`}>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); setPage('profile'); setIsMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 rounded-t-lg"
                >
                    <UserCircleIcon className="w-5 h-5 text-slate-500" />
                    <span>الملف الشخصي</span>
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); logout(); setIsMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 rounded-b-lg"
                >
                  <LogOutIcon className="w-5 h-5 text-red-500" />
                  <span>تسجيل الخروج</span>
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;