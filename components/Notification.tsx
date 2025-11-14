import React, { useState, useEffect } from 'react';
import { Notification as NotificationType } from '../types';

const Notification: React.FC<{ notification: NotificationType; onDismiss: (id: string) => void; }> = ({ notification, onDismiss }) => {
    const [isExiting, setIsExiting] = useState(false);
    const { id, title, message, type } = notification;

    useEffect(() => {
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, 4500); // Start exit animation 0.5s before removing

        const removeTimer = setTimeout(() => {
            onDismiss(id);
        }, 5000); // Remove completely after 5s

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(removeTimer);
        };
    }, [id, onDismiss]);

    const handleDismissClick = () => {
        setIsExiting(true);
        // Remove from DOM after animation completes
        setTimeout(() => onDismiss(id), 400);
    };

    const typeClasses = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600',
    };

    const Icon: React.FC = () => {
        switch (type) {
            case 'success': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
            case 'error': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />;
            case 'info': return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
            default: return null;
        }
    };

    return (
        <div className={`relative flex items-center p-4 rounded-xl shadow-2xl w-full text-white overflow-hidden ${typeClasses[type]} ${isExiting ? 'animate-fade-out-down' : 'animate-slide-in-up'}`}>
            <div className="flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <Icon />
                </svg>
            </div>
            <div className="ms-4 me-3 flex-1">
                <p className="text-md font-bold">{title}</p>
                <p className="mt-1 text-sm text-white/90">{message}</p>
            </div>
            <div className="ms-auto -mx-1.5 -my-1.5">
                <button onClick={handleDismissClick} className="inline-flex rounded-full p-1.5 text-white/80 hover:bg-white/20 focus:outline-none">
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
            <div className={`absolute bottom-0 left-0 h-1 bg-white/30 animate-progress-bar`}></div>
        </div>
    );
};

export default Notification;
