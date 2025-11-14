import React from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './Modal';
import Button from './Button';
import CheckCircleIcon from './icons/CheckCircleIcon';
import Icon from './Icon';

const NewRequestSuccessModal: React.FC = () => {
    const { 
        newRequestSuccessState, 
        hideNewRequestSuccessModal, 
        setPage, 
        setSelectedRequestId,
        setShouldPrintDraft
    } = useAppContext();

    if (!newRequestSuccessState.isOpen) {
        return null;
    }

    const handleGoToRequests = () => {
        hideNewRequestSuccessModal();
        setPage('requests');
    };

    const handlePrintDraft = () => {
        if (newRequestSuccessState.requestId) {
            setSelectedRequestId(newRequestSuccessState.requestId);
            setShouldPrintDraft(true);
            setPage('request-draft');
        }
        hideNewRequestSuccessModal();
    };

    return (
        <Modal 
            isOpen={newRequestSuccessState.isOpen} 
            onClose={hideNewRequestSuccessModal} 
            title="تم إنشاء الطلب بنجاح" 
            size="md"
        >
            <div className="text-center py-8">
                <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                <p className="text-xl text-slate-800 dark:text-slate-200">
                    رقم الطلب الجديد هو:
                </p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                    #{newRequestSuccessState.requestNumber}
                </p>
            </div>
            <div className="flex justify-center gap-4 pt-4 border-t dark:border-slate-700">
                <Button onClick={handleGoToRequests} variant="secondary">
                    العودة إلى الطلبات
                </Button>
                <Button onClick={handlePrintDraft} leftIcon={<Icon name="print" className="w-5 h-5" />}>
                    طباعة مسودة
                </Button>
            </div>
        </Modal>
    );
};

export default NewRequestSuccessModal;