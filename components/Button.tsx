import React from 'react';
import { useAppContext } from '../context/AppContext';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'whatsapp';
  leftIcon?: React.ReactNode;
  size?: 'sm' | 'md';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', leftIcon, className = '', size = 'md', ...props }) => {
  const { settings } = useAppContext();
  const design = settings.design || 'aero';

  const baseClasses = "flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-60 disabled:cursor-not-allowed";
  
  const getPrimaryVariant = () => {
    switch (design) {
        case 'classic':
            return 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500 shadow-md shadow-teal-500/20 hover:shadow-lg hover:shadow-teal-500/30';
        case 'glass':
            return 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30';
        default: // aero
            return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30';
    }
  }

  const variantClasses = {
    primary: getPrimaryVariant(),
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 focus:ring-slate-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    whatsapp: 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`} {...props}>
      {leftIcon}
      {children}
    </button>
  );
};

export default Button;