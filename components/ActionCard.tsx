import React from 'react';
import ArrowRightIcon from './icons/ArrowRightIcon';
import { useAppContext } from '../context/AppContext';

interface ActionCardProps {
  title: string;
  icon: React.ReactElement<{ className?: string }>;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, icon, onClick }) => {
  const { settings } = useAppContext();
  const design = settings.design || 'aero';

  const primaryColor = design === 'classic' ? 'teal' : design === 'glass' ? 'indigo' : 'blue';

  const getCardDesignClasses = () => {
    if (design === 'glass') {
        const intensity = settings.glassmorphismIntensity || 5;
        const opacity = 1.0 - (intensity * 0.05);
        const darkOpacity = 1.0 - (intensity * 0.04);
        const blurLevels: { [key: number]: string } = {1: 'sm', 2: 'sm', 3: '', 4: '', 5: 'md', 6: 'md', 7: 'lg', 8: 'lg', 9: 'xl', 10: 'xl' };
        const blur = blurLevels[intensity] || 'md';
        const blurClass = `backdrop-blur${blur ? `-${blur}` : ''}`;
        const glassBg = `bg-white/[${opacity.toFixed(2)}] dark:bg-slate-800/[${darkOpacity.toFixed(2)}] ${blurClass}`;
        return `${glassBg} border-white/20 dark:border-slate-700/50 shadow-lg`;
    }
    return 'bg-white dark:bg-slate-800 border-transparent dark:border-slate-700/50 shadow-lg';
  };

  const cardBaseClasses = `w-full h-36 text-right rounded-xl overflow-hidden relative group p-4 z-0 border focus:outline-none focus:ring-2 focus:ring-${primaryColor}-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900`;
  const cardDesignClasses = getCardDesignClasses();

  return (
    <button 
        onClick={onClick}
        className={`${cardBaseClasses} ${cardDesignClasses}`}
    >
      <div className={`circle absolute h-16 w-16 -top-8 -right-8 rounded-full bg-${primaryColor}-600 group-hover:scale-[1000%] duration-500 z-[-1]`} />
      
      <div className="relative z-10 flex flex-col justify-between h-full items-start">
        <div>
            {React.cloneElement(icon, { className: `h-8 w-8 mb-2 text-${primaryColor}-600 dark:text-${primaryColor}-400 group-hover:text-white duration-500` })}
            <h3 className="z-20 font-bold text-slate-800 dark:text-slate-200 group-hover:text-white duration-500 text-lg">
                {title}
            </h3>
        </div>

        <div className={`text-sm flex items-center gap-2 font-semibold text-${primaryColor}-700 dark:text-${primaryColor}-400 group-hover:text-white duration-500`}>
            <span className={`relative before:h-[0.12em] before:absolute before:w-full before:content-[''] before:bg-${primaryColor}-700 dark:before:bg-${primaryColor}-400 group-hover:before:bg-white duration-300 before:bottom-0 before:left-0`}>
                اذهب الآن
            </span>
            <ArrowRightIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </button>
  );
}

export default ActionCard;