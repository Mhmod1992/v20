import React from 'react';
import { useAppContext } from '../context/AppContext';
import Modal from './Modal';
import Button from './Button';

const ConfirmModal: React.FC = () => {
  const { confirmModalState, hideConfirmModal } = useAppContext();
  const { isOpen, title, message, onConfirm } = confirmModalState;

  const handleConfirm = () => {
    onConfirm();
    hideConfirmModal();
  };

  return (
    <Modal isOpen={isOpen} onClose={hideConfirmModal} title={title} size="md">
      <div className="py-4">
        <p className="text-gray-700 dark:text-gray-300">{message}</p>
      </div>
      <div className="flex justify-end pt-4 border-t dark:border-gray-700">
        <Button onClick={hideConfirmModal} variant="secondary">
          إلغاء
        </Button>
        <Button onClick={handleConfirm} variant="danger" className="mr-3">
          تأكيد
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
