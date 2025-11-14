import React from 'react';
import { useAppContext } from '../context/AppContext';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement<{ className?: string }>;
  color: 'blue' | 'yellow' | 'green' | 'indigo';
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, color }) => {
  const { settings } = useAppContext();
  const design = settings.design || 'aero';

  const colorClasses = {
    blue: {
      bg: design === 'classic' ? 'bg-teal-100 dark:bg-teal-900/50' : design === 'glass' ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-blue-100 dark:bg-blue-900/50',
      text: design === 'classic' ? 'text-teal-600 dark:text-teal-400' : design === 'glass' ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/50',
      text: 'text-yellow-600 dark:text-yellow-400',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/50',
      text: 'text-green-600 dark:text-green-400',
    },
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/50',
      text: 'text-indigo-600 dark:text-indigo-400',
    },
  };

  const selectedColor = colorClasses[color] || colorClasses.blue;
  
  const cardBaseClasses = "p-6 rounded-xl flex items-center justify-between transition-all hover:shadow-xl hover:-translate-y-1";
  
  const getCardDesignClasses = () => {
      if (design === 'glass') {
          const intensity = settings.glassmorphismIntensity || 5;
          const opacity = 1.0 - (intensity * 0.05);
          const darkOpacity = 1.0 - (intensity * 0.04);
          const blurLevels: { [key: number]: string } = {1: 'sm', 2: 'sm', 3: '', 4: '', 5: 'md', 6: 'md', 7: 'lg', 8: 'lg', 9: 'xl', 10: 'xl' };
          const blur = blurLevels[intensity] || 'md';
          const blurClass = `backdrop-blur${blur ? `-${blur}` : ''}`;
          const glassBg = `bg-white/[${opacity.toFixed(2)}] dark:bg-slate-800/[${darkOpacity.toFixed(2)}] ${blurClass}`;
          return `${glassBg} border border-white/20 dark:border-slate-700/50 shadow-lg`;
      }
      return 'bg-white dark:bg-slate-800 shadow-lg';
  };
  const cardDesignClasses = getCardDesignClasses();

  return (
    <div className={`${cardBaseClasses} ${cardDesignClasses}`}>
      <div>
        <p className="text-md font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-2">{value}</p>
      </div>
      <div className={`p-4 rounded-full ${selectedColor.bg}`}>
        {React.cloneElement(icon, {
          className: `w-8 h-8 ${selectedColor.text}`
        })}
      </div>
    </div>
  );
};

export default DashboardCard;