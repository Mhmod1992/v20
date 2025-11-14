

import React from 'react';
import PlusIcon from './icons/PlusIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import PrinterIcon from './icons/PrinterIcon';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import CameraIcon from './icons/CameraIcon';
import DocumentReportIcon from './icons/DocumentReportIcon';
import SettingsIcon from './icons/SettingsIcon';
import SaveIcon from './icons/SaveIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import CarIcon from './icons/CarIcon';
import IdentificationIcon from './icons/IdentificationIcon';
import DownloadIcon from './icons/DownloadIcon';
import PhoneIcon from './icons/PhoneIcon';
import DollarSignIcon from './icons/DollarSignIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import XIcon from './icons/XIcon';
import HistoryIcon from './icons/HistoryIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ImageIcon from './icons/ImageIcon';
import PaintBrushIcon from './icons/PaintBrushIcon';
import ViewfinderIcon from './icons/ViewfinderIcon';
import SparklesIcon from './icons/SparklesIcon';
import RefreshCwIcon from './icons/RefreshCwIcon';


interface IconProps {
  name: 'add' | 'back' | 'print' | 'delete' | 'edit' | 'camera' | 'document-report' | 'settings' | 'save' | 'chevron-right' | 'employee' | 'broker' | 'findings' | 'cars' | 'report' | 'download' | 'phone' | 'dollar-sign' | 'microphone' | 'close' | 'history' | 'chevron-down' | 'check-circle' | 'gallery' | 'appearance' | 'scan-plate' | 'sparkles' | 'refresh-cw';
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, className }) => {
  switch (name) {
    case 'add':
      return <PlusIcon className={className} />;
    case 'back':
      return <ArrowLeftIcon className={className} />;
    case 'print':
        return <PrinterIcon className={className} />;
    case 'delete':
        return <TrashIcon className={className} />;
    case 'edit':
        return <EditIcon className={className} />;
    case 'camera':
        return <CameraIcon className={className} />;
    case 'document-report':
        return <DocumentReportIcon className={className} />;
    case 'settings':
        return <SettingsIcon className={className} />;
    case 'save':
        return <SaveIcon className={className} />;
    case 'chevron-right':
        return <ChevronRightIcon className={className} />;
    case 'employee':
        return <UserCircleIcon className={className} />;
    case 'broker':
        return <BriefcaseIcon className={className} />;
    case 'findings':
        return <ClipboardListIcon className={className} />;
    case 'cars':
        return <CarIcon className={className} />;
    case 'report':
        return <IdentificationIcon className={className} />;
    case 'download':
        return <DownloadIcon className={className} />;
    case 'phone':
        return <PhoneIcon className={className} />;
    case 'dollar-sign':
        return <DollarSignIcon className={className} />;
    case 'microphone':
        return <MicrophoneIcon className={className} />;
    case 'close':
        return <XIcon className={className} />;
    case 'history':
        return <HistoryIcon className={className} />;
    case 'chevron-down':
        return <ChevronDownIcon className={className} />;
    case 'check-circle':
        return <CheckCircleIcon className={className} />;
    case 'gallery':
        return <ImageIcon className={className} />;
    case 'appearance':
        return <PaintBrushIcon className={className} />;
    case 'scan-plate':
        return <ViewfinderIcon className={className} />;
    case 'sparkles':
        return <SparklesIcon className={className} />;
    case 'refresh-cw':
        return <RefreshCwIcon className={className} />;
    default:
      return null;
  }
};

export default Icon;