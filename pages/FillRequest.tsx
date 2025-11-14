

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { InspectionRequest, RequestStatus, StructuredFinding, Note, PaymentType, ActivityLog, Settings, PredefinedFinding, VoiceMemo } from '../types';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import RefreshCwIcon from '../components/icons/RefreshCwIcon';
import Button from '../components/Button';
import SearchIcon from '../components/icons/SearchIcon';
import Drawer from '../components/Drawer';
import MoreVerticalIcon from '../components/icons/MoreVerticalIcon';
import { uuidv4 } from '../lib/utils';
import ImageGallery from '../components/ImageGallery';
import ChevronDownIcon from '../components/icons/ChevronDownIcon';
import { GoogleGenAI } from "@google/genai";

// Local Icons
const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"/></svg>;


interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  target?: any; // Custom property added in the component
}

const compressImage = (file: File, options: { maxWidth: number; maxHeight: number; quality: number; }): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
        return reject(new Error('File is not an image.'));
    }
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > options.maxWidth) {
          height = Math.round((height * options.maxWidth) / width);
          width = options.maxWidth;
        }
      } else {
        if (height > options.maxHeight) {
          width = Math.round((width * options.maxHeight) / height);
          height = options.maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(img.src);
        return reject(new Error('Could not get canvas context'));
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(img.src);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Canvas to Blob conversion failed'));
          }
          // Preserve original file name for reference, but change extension.
          const fileName = file.name.split('.').slice(0, -1).join('.') + '.jpg';
          const newFile = new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        },
        'image/jpeg',
        options.quality
      );
    };
    img.onerror = (error) => {
        URL.revokeObjectURL(img.src);
        reject(error);
    }
  });
};

const formatTime = (timeInSeconds: number) => {
    const totalSeconds = Math.floor(timeInSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(1, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const AudioPlayer: React.FC<{ audioData: string; duration: number }> = ({ audioData, duration }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const onTimeUpdate = () => setCurrentTime(audio.currentTime);
            const onEnded = () => {
                setIsPlaying(false);
                setCurrentTime(0);
            };

            audio.addEventListener('timeupdate', onTimeUpdate);
            audio.addEventListener('ended', onEnded);
            
            return () => {
                audio.removeEventListener('timeupdate', onTimeUpdate);
                audio.removeEventListener('ended', onEnded);
            };
        }
    }, []);
    
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-2 w-full">
            <audio ref={audioRef} src={audioData} preload="metadata"></audio>
            <button onClick={togglePlayPause} className="p-2 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200">
                {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
            <div className="flex-grow flex items-center gap-2">
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 w-16 text-center">
                    {formatTime(currentTime)} / {formatTime(duration)}
                </span>
            </div>
        </div>
    );
};

const Accordion: React.FC<{ title: string | React.ReactNode, count: number, targetId: string, openSections: Set<string>, setOpenSections: React.Dispatch<React.SetStateAction<Set<string>>>, children: React.ReactNode }> = ({ title, count, targetId, openSections, setOpenSections, children }) => {
    const isOpen = openSections.has(targetId);
    const toggle = () => {
        setOpenSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(targetId)) {
                newSet.delete(targetId);
            } else {
                newSet.add(targetId);
            }
            return newSet;
        });
    };

    return (
        <div className="border dark:border-slate-700 rounded-lg">
            <button onClick={toggle} className="w-full flex justify-between items-center p-3 text-right hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{title}</span>
                    {count > 0 && <span className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-full px-2 py-0.5">{count}</span>}
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

const StatusIndicator: React.FC<{status?: 'saving' | 'saved' | 'error'}> = ({ status }) => {
    if (status === 'saving') {
        return <span className="text-xs text-yellow-500 animate-pulse ms-2">جاري الحفظ...</span>;
    }
    if (status === 'error') {
        return <span className="text-xs text-red-500 ms-2 font-semibold">فشل الحفظ</span>;
    }
    if (status === 'saved') {
        return <span className="text-xs text-green-500 ms-2 animate-fadeOut font-semibold">✓ تم الحفظ</span>;
    }
    return null;
};

const formatLogDetails = (details: string) => {
    // This regex will find text within double quotes
    const regex = /"([^"]*)"/g;
    const parts = details.split(regex);

    return (
        <>
            {parts.map((part, index) => {
                // Parts at odd indices are the quoted strings
                if (index % 2 === 1) {
                    return <strong key={index} className="font-bold text-gray-800 dark:text-gray-200 mx-1">"{part}"</strong>;
                }
                return part;
            })}
        </>
    );
};

const MiniPlateDisplay: React.FC<{ plateNumber: string; settings: Settings; }> = ({ plateNumber, settings }) => {
    if (!plateNumber) return null;
    
    if (plateNumber.startsWith('شاصي')) {
        return <span className="font-mono tracking-wider bg-white dark:bg-slate-700 border border-black dark:border-slate-500 rounded-md px-3 py-1 text-sm">{plateNumber}</span>;
    }

    const parts = plateNumber.split(' ');
    const arLetters = parts.filter(p => !/^\d+$/.test(p)).join('');
    const numbers = parts.find(p => /^\d+$/.test(p)) || '';
    
    const arToEnMap = new Map<string, string>();
    if (settings?.plateCharacters) {
        settings.plateCharacters.forEach((pc: { ar: string, en: string }) => {
            arToEnMap.set(pc.ar.replace('ـ', ''), pc.en);
        });
    }
    
    const enLetters = arLetters.split('').map(char => arToEnMap.get(char) || char).join('');

    return (
        <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-700 border-2 border-black dark:border-slate-500 rounded-lg px-3 py-1.5 font-mono shadow-md text-black dark:text-white">
                <div className="text-center">
                    <div className="font-bold text-sm sm:text-base tracking-widest">{arLetters.split('').join(' ')}</div>
                    <div className="font-bold text-[10px] sm:text-xs tracking-wider opacity-80">{enLetters.split('').reverse().join(' ')}</div>
                </div>
                <div className="w-px h-8 sm:h-10 bg-black dark:bg-slate-500"></div>
                <div className="font-bold text-sm sm:text-base tracking-widest">
                    {numbers.split('').join(' ')}
                </div>
            </div>
        </div>
    );
};


interface CameraPageProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const CameraPage: React.FC<CameraPageProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      if (isOpen) {
        stopCamera();
        setError(null);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          setError("لا يمكن الوصول إلى الكاميرا. يرجى التأكد من منح الصلاحية.");
        }
      } else {
        stopCamera();
      }
    };
    startCamera();
    return () => stopCamera();
  }, [isOpen, stopCamera]);
  
  // Orientation check
  useEffect(() => {
    if (!isOpen || !videoRef.current) return;
    const checkOrientation = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA
        const { videoWidth, videoHeight } = videoRef.current;
        setIsLandscape(videoWidth > videoHeight);
      }
    };
    const interval = setInterval(checkOrientation, 300);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleCaptureClick = () => {
    if (!videoRef.current || !canvasRef.current || !isLandscape) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
      onClose();
    }, 'image/jpeg', 0.9);
  };
  
   const handleVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    if (!streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities();

    // @ts-ignore: `pointsOfInterest` is not in all TS lib versions for MediaTrackCapabilities
    if (capabilities.focusMode && capabilities.focusMode.includes('manual') && capabilities.pointsOfInterest) {
      const rect = video.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      track.applyConstraints({
        advanced: [{
          pointsOfInterest: [{ x, y }]
        } as any]
      }).catch(e => console.error("Tap to focus failed:", e));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center animate-fade-in" dir="ltr">
      <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" onClick={handleVideoClick} />
      
      {!isLandscape && !error && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white text-center p-4 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin-slow">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <h3 className="text-2xl font-bold mt-4" dir="rtl">الرجاء إمالة الهاتف</h3>
            <p className="mt-2 text-lg" dir="rtl">يجب التقاط الصور بالوضع العرضي.</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white text-center p-4 z-10" dir="rtl">
            <h3 className="text-2xl font-bold">حدث خطأ</h3>
            <p className="mt-2 text-lg">{error}</p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 z-20">
        <button onClick={onClose} className="bg-black/50 text-white rounded-full p-3 hover:bg-black/75 transition-colors">
            <Icon name="close" className="w-6 h-6" />
        </button>
      </div>
      
      <div className="absolute bottom-8 z-20">
        <button 
            onClick={handleCaptureClick} 
            disabled={!isLandscape || !!error}
            className="w-20 h-20 rounded-full bg-white ring-4 ring-white/30 disabled:bg-gray-400 disabled:opacity-50 transition-all"
            aria-label="التقاط صورة"
        />
      </div>

      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
};

// FIX: Changed to a named export to resolve module resolution error.
export const FillRequest: React.FC = () => {
    const { 
        authUser, selectedRequestId, requests, clients, cars, carMakes, 
        carModels, inspectionTypes, setPage, setSettingsPage, predefinedFindings, customFindingCategories,
        setSelectedRequestId, updateRequest, addNotification, fetchAndUpdateSingleRequest, uploadImage,
        deleteImage, can, settings, goBack, showConfirmModal 
    } = useAppContext();
    
    const design = settings.design || 'aero';
    const primaryColorName = design === 'classic' ? 'teal' : design === 'glass' ? 'indigo' : 'blue';

    const request = useMemo(() => requests.find(r => r.id === selectedRequestId), [requests, selectedRequestId]);
    
    const [generalNotes, setGeneralNotes] = useState<Note[]>([]);
    const [structuredFindings, setStructuredFindings] = useState<StructuredFinding[]>([]);
    const [categoryNotes, setCategoryNotes] = useState<Record<string, Note[]>>({});
    const [voiceMemos, setVoiceMemos] = useState<Record<string, VoiceMemo[]>>({});
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    
    const [newGeneralNote, setNewGeneralNote] = useState({ text: '', image: null as string | null });
    const [newGeneralNoteFile, setNewGeneralNoteFile] = useState<File | null>(null);
    const [newCategoryNote, setNewCategoryNote] = useState({ text: '', image: null as string | null });
    const [newCategoryNoteFile, setNewCategoryNoteFile] = useState<File | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
    const [selectedFindingsInModal, setSelectedFindingsInModal] = useState<Set<string>>(new Set());
    const [isEditNoteModalOpen, setIsEditNoteModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<{ note: Note; categoryId: string | 'general' } | null>(null);
    const [modalNoteData, setModalNoteData] = useState<{ text: string; image: string | null }>({ text: '', image: null });
    const [modalNoteFile, setModalNoteFile] = useState<File | null>(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    
    // Voice input state
    const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
    const [listeningTarget, setListeningTarget] = useState<string | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Voice Memo Recording State
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const isCancellingRef = useRef(false);
    const recordingTargetRef = useRef<string | null>(null);
    const [recordingState, setRecordingState] = useState<{ status: 'idle' | 'recording' | 'processing', target: string | null, duration: number }>({ status: 'idle', target: null, duration: 0 });
    const timerIntervalRef = useRef<number | null>(null);
    
    const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
    const [isCompletionToggled, setIsCompletionToggled] = useState(false);
    const addNoteInputRef = useRef<HTMLInputElement>(null);
    
    // Dropdown states and refs
    const [isGeneralNoteDropdownOpen, setIsGeneralNoteDropdownOpen] = useState(false);
    const [isCategoryNoteDropdownOpen, setIsCategoryNoteDropdownOpen] = useState(false);
    const generalNoteDropdownRef = useRef<HTMLDivElement>(null);
    const categoryNoteDropdownRef = useRef<HTMLDivElement>(null);
    const generalNoteUploadInputRef = useRef<HTMLInputElement>(null);
    const categoryNoteUploadInputRef = useRef<HTMLInputElement>(null);
    
    // State for new camera page
    const [isCameraPageOpen, setIsCameraPageOpen] = useState(false);
    const [captureTarget, setCaptureTarget] = useState<'general' | string | null>(null);

    // Accordion state
    const [isHeaderOpen, setIsHeaderOpen] = useState(false);
    const [openVoiceMemoSections, setOpenVoiceMemoSections] = useState<Set<string>>(new Set());
    
    // Deletion visual state
    const [deletingNoteIds, setDeletingNoteIds] = useState<Set<string>>(new Set());
    const [deletingFindingIds, setDeletingFindingIds] = useState<Set<string>>(new Set());


    const inspectionType = useMemo(() => request ? inspectionTypes.find(i => i.id === request.inspection_type_id) : undefined, [request, inspectionTypes]);
    const visibleFindingCategories = useMemo(() => {
        const visibleIds = inspectionType?.finding_category_ids || [];
        return customFindingCategories.filter(c => visibleIds.includes(c.id));
    }, [inspectionType, customFindingCategories]);
    
    const arToEnMap = useMemo(() => {
        const map = new Map<string, string>();
        if (settings?.plateCharacters) {
            settings.plateCharacters.forEach(pc => {
                map.set(pc.ar.replace('ـ', ''), pc.en);
            });
        }
        return map;
    }, [settings?.plateCharacters]);

    const allImages = useMemo(() => {
        if (!request) return [];
        const images: {
            id: string;
            imageUrl: string;
            text: string;
            categoryName: string;
            authorName: string;
        }[] = [];

        // General Notes
        ((request.general_notes as Note[]) || []).forEach(note => {
            if (note.image) {
                images.push({
                    id: note.id,
                    imageUrl: note.image,
                    text: note.text,
                    categoryName: 'ملاحظات عامة',
                    authorName: note.authorName || 'غير معروف',
                });
            }
        });

        // Category Notes
        Object.entries(request.category_notes || {}).forEach(([catId, notes]) => {
            const category = customFindingCategories.find(c => c.id === catId);
            const categoryName = category ? category.name : 'قسم غير معروف';
            ((notes as Note[]) || []).forEach(note => {
                if (note.image) {
                    images.push({
                        id: note.id,
                        imageUrl: note.image,
                        text: note.text,
                        categoryName: categoryName,
                        authorName: note.authorName || 'غير معروف',
                    });
                }
            });
        });

        return images;
    }, [request, customFindingCategories]);

    const getDefaultTab = useCallback(() => {
        const tabsInOrder = [
            ...visibleFindingCategories.map(c => c.id),
            'general-notes',
            'gallery',
        ];
        return tabsInOrder[0];
    }, [visibleFindingCategories]);
    
    const [activeTabId, setActiveTabId] = useState<string>(getDefaultTab());
    
    const debounceTimeoutRef = useRef<number | null>(null);
    const inspectionDataRef = useRef({ generalNotes, categoryNotes, structuredFindings, voiceMemos, activityLog });
    const prevRequestRef = useRef<InspectionRequest | undefined>(undefined);

    const createActivityLog = useCallback((action: string, details: string, imageUrl?: string): ActivityLog | null => {
        if (!authUser) return null;
        return {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            employeeId: authUser.id,
            employeeName: authUser.name,
            action,
            details,
            imageUrl,
        };
    }, [authUser]);

    const performSave = useCallback(async (isFinalSave = false, finalStatus?: RequestStatus, overrides?: { activityLog?: ActivityLog[] }) => {
        if (!request) return;
        const { generalNotes: currentGeneralNotes, categoryNotes: currentCategoryNotes, structuredFindings: currentFindings, voiceMemos: currentVoiceMemos } = inspectionDataRef.current;
        const finalActivityLog = overrides?.activityLog ?? inspectionDataRef.current.activityLog;

        const clean = (items: (Note | StructuredFinding)[]) => items.map(({ status, ...item }: any) => item);
        const cleanCategoryNotes = (notesMap: Record<string, Note[]>) => {
            const newMap: Record<string, Note[]> = {};
            for (const key in notesMap) { newMap[key] = clean(notesMap[key]) as Note[]; }
            return newMap;
        };
        const cleanVoiceMemos = (memosMap: Record<string, VoiceMemo[]>) => {
            const newMap: Record<string, VoiceMemo[]> = {};
            for (const key in memosMap) { newMap[key] = (memosMap[key] || []).map(({ status, isTranscribing, isEditingTranscription, ...memo }) => memo as VoiceMemo); }
            return newMap;
        }
        const updatedRequest: InspectionRequest = {
            ...request,
            general_notes: clean(currentGeneralNotes) as Note[],
            category_notes: cleanCategoryNotes(currentCategoryNotes),
            voice_memos: cleanVoiceMemos(currentVoiceMemos),
            structured_findings: clean(currentFindings) as StructuredFinding[],
            activity_log: finalActivityLog,
            status: finalStatus || request.status
        };

        try {
            await updateRequest(updatedRequest);
            const updateStatus = <T extends { status?: string }>(items: T[]): T[] => items.map(item => item.status === 'saving' ? { ...item, status: 'saved' } : item);
            setGeneralNotes(prev => updateStatus(prev));
            setStructuredFindings(prev => updateStatus(prev));
            setCategoryNotes(prev => { const newMap = { ...prev }; for (const key in newMap) { newMap[key] = updateStatus(newMap[key]); } return newMap; });
            setVoiceMemos(prev => { const newMap = { ...prev }; for (const key in newMap) { newMap[key] = updateStatus(newMap[key]); } return newMap; });
        } catch (error) {
            console.error("Failed to auto-save request:", error);
            const updateStatusToError = <T extends { status?: string }>(items: T[]): T[] => items.map(item => item.status === 'saving' ? { ...item, status: 'error' } : item);
            setGeneralNotes(prev => updateStatusToError(prev));
            setStructuredFindings(prev => updateStatusToError(prev));
            setCategoryNotes(prev => { const newMap = { ...prev }; for (const key in newMap) { newMap[key] = updateStatusToError(newMap[key]); } return newMap; });
            setVoiceMemos(prev => { const newMap = { ...prev }; for (const key in newMap) { newMap[key] = updateStatusToError(newMap[key]); } return newMap; });
            throw error;
        }
    }, [request, updateRequest]);

    const debouncedSave = useCallback(() => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = window.setTimeout(() => { performSave(); }, 1500);
    }, [performSave]);
    
    const addActivityLogEntry = useCallback((action: string, details: string, imageUrl?: string) => {
        const newLog = createActivityLog(action, details, imageUrl);
        if(newLog) {
            setActivityLog(prev => [newLog, ...prev]);
            debouncedSave();
        }
    }, [createActivityLog, debouncedSave]);


    // Automatically update status from NEW to IN_PROGRESS
    useEffect(() => {
        if (request && request.status === RequestStatus.NEW && can('change_request_status')) {
            const newLog = createActivityLog('تغيير حالة الطلب', 'تم تغيير الحالة من "جديد" إلى "قيد التنفيذ"');
            if (newLog) {
                const updatedRequest = { 
                    ...request, 
                    status: RequestStatus.IN_PROGRESS,
                    activity_log: [newLog, ...(request.activity_log || [])] 
                };
                updateRequest(updatedRequest).catch(err => {
                    console.error("Failed to update status to In Progress:", err);
                    addNotification({ title: 'خطأ', message: 'فشل تحديث حالة الطلب تلقائياً.', type: 'error'});
                });
            }
        }
    }, [request, can, updateRequest, createActivityLog, addNotification]);

    useEffect(() => {
        inspectionDataRef.current = { generalNotes, categoryNotes, structuredFindings, voiceMemos, activityLog };
    }, [generalNotes, categoryNotes, structuredFindings, voiceMemos, activityLog]);
    
    // Automatic data refresh polling
    useEffect(() => {
        if (!selectedRequestId) return;
        const intervalId = setInterval(() => fetchAndUpdateSingleRequest(selectedRequestId), 2000);
        return () => clearInterval(intervalId);
    }, [selectedRequestId, fetchAndUpdateSingleRequest]);

    // Effect for closing dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (generalNoteDropdownRef.current && !generalNoteDropdownRef.current.contains(event.target as Node)) {
                setIsGeneralNoteDropdownOpen(false);
            }
            if (categoryNoteDropdownRef.current && !categoryNoteDropdownRef.current.contains(event.target as Node)) {
                setIsCategoryNoteDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!request) {
            setGeneralNotes([]); 
            setStructuredFindings([]); 
            setCategoryNotes({});
            setVoiceMemos({});
            setActivityLog([]);
            prevRequestRef.current = undefined;
            return;
        };

        const previousRequest = prevRequestRef.current;
        
        if (previousRequest && previousRequest.id === request.id && JSON.stringify(previousRequest) !== JSON.stringify(request)) {
            const mergeWithLocal = (localItems: any[], remoteItems: any[]): any[] => {
                const localUnsaved = localItems.filter(n => n.status === 'saving' || n.isTranscribing || n.isEditingTranscription);
                const localUnsavedIds = new Set(localUnsaved.map(n => n.id));
                const remoteToKeep = (remoteItems || []).filter(n => !localUnsavedIds.has(n.id));
                
                // For items that are not unsaved, we need to merge properties like `isEditingTranscription`
                const updatedRemote = remoteToKeep.map(remoteItem => {
                    const localVersion = localItems.find(localItem => localItem.id === remoteItem.id && !localUnsavedIds.has(localItem.id));
                    return localVersion ? { ...remoteItem, isEditingTranscription: localVersion.isEditingTranscription } : remoteItem;
                });
                
                return [...updatedRemote, ...localUnsaved];
            };

            setGeneralNotes(current => mergeWithLocal(current, request.general_notes || []));
            setCategoryNotes(current => {
                const remote = request.category_notes || {};
                const merged: Record<string, Note[]> = {};
                const allKeys = new Set([...Object.keys(current), ...Object.keys(remote)]);
                allKeys.forEach(key => {
                    merged[key] = mergeWithLocal(current[key] || [], remote[key] || []);
                });
                return merged;
            });
            setVoiceMemos(current => {
                const remote = request.voice_memos || {};
                const merged: Record<string, VoiceMemo[]> = {};
                const allKeys = new Set([...Object.keys(current), ...Object.keys(remote)]);
                allKeys.forEach(key => {
                    merged[key] = mergeWithLocal(current[key] || [], remote[key] || []);
                });
                return merged;
            });

            setStructuredFindings(currentLocalFindings => {
                const localUnsavedFindings = currentLocalFindings.filter(f => f.status === 'saving');
                const localUnsavedIds = new Set(localUnsavedFindings.map(f => f.findingId));
                const remoteFindingsToKeep = (request.structured_findings || []).filter(f => !localUnsavedIds.has(f.findingId));
                return [...remoteFindingsToKeep, ...localUnsavedFindings];
            });

            setActivityLog(request.activity_log || []);
        } else if (!previousRequest || previousRequest.id !== request.id) {
            setGeneralNotes(request.general_notes || []);
            setStructuredFindings(request.structured_findings || []);
            setCategoryNotes(request.category_notes || {});
            setVoiceMemos(request.voice_memos || {});
            setActivityLog(request.activity_log || []);
            setActiveTabId(getDefaultTab());
        }
        prevRequestRef.current = request;

    }, [request, getDefaultTab]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            setIsSpeechRecognitionSupported(true);
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'ar-SA';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                     if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                const target = (recognition as any).target;
                if (finalTranscript) {
                    if (target === 'general') {
                        setNewGeneralNote(prev => ({ ...prev, text: (prev.text + ' ' + finalTranscript).trim() }));
                    } else if (target) {
                        setNewCategoryNote(prev => ({ ...prev, text: (prev.text + ' ' + finalTranscript).trim() }));
                    }
                }
            };
            
            recognition.onend = () => {
                setListeningTarget(null);
            };

            recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                addNotification({ title: 'خطأ في التعرف الصوتي', message: `حدث خطأ: ${event.error}`, type: 'error' });
                setListeningTarget(null);
            };

            recognitionRef.current = recognition;
        } else {
            setIsSpeechRecognitionSupported(false);
            console.warn("Web Speech API is not supported by this browser.");
        }

        return () => {
            recognitionRef.current?.stop();
        };
    }, [addNotification]);
    
    const handleToggleListening = (target: 'general' | string) => {
        const recognition = recognitionRef.current;
        if (!recognition) return;

        if (listeningTarget === target) {
            recognition.stop();
        } else {
            if (listeningTarget) {
                recognition.stop();
            }
            (recognition as any).target = target;
            recognition.start();
            setListeningTarget(target);
        }
    };

    const client = clients.find(c => c.id === request?.client_id);
    const car = cars.find(c => c.id === request?.car_id);
    const carModel = carModels.find(m => m.id === car?.model_id);
    const carMake = carMakes.find(m => m.id === car?.make_id);
    const formattedPhone = client?.phone && client.phone.length === 10 ? `${client.phone.slice(0, 3)} ${client.phone.slice(3, 6)} ${client.phone.slice(6)}` : client?.phone;

    const handleImageChange = async (
        e: React.ChangeEvent<HTMLInputElement>,
        stateSetter: React.Dispatch<React.SetStateAction<{ text: string; image: string | null }>>,
        fileSetter: React.Dispatch<React.SetStateAction<File | null>>
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            const originalPreviewUrl = URL.createObjectURL(file);
            stateSetter(prev => {
                if (prev.image && prev.image.startsWith('blob:')) {
                    URL.revokeObjectURL(prev.image);
                }
                return { ...prev, image: originalPreviewUrl };
            });
            
            try {
                const compressedFile = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
                fileSetter(compressedFile);
            } catch (error) {
                console.error("Image compression failed:", error);
                addNotification({ title: 'خطأ', message: 'فشل ضغط الصورة، سيتم استخدام الصورة الأصلية.', type: 'error' });
                fileSetter(file);
            }
        }
        e.target.value = '';
    };

    const handleCaptureComplete = useCallback(async (file: File) => {
        if (!captureTarget) return;

        const stateSetter = captureTarget === 'general' ? setNewGeneralNote : setNewCategoryNote;
        const fileSetter = captureTarget === 'general' ? setNewGeneralNoteFile : setNewCategoryNoteFile;

        const originalPreviewUrl = URL.createObjectURL(file);
        stateSetter(prev => {
            if (prev.image && prev.image.startsWith('blob:')) {
                URL.revokeObjectURL(prev.image);
            }
            return { ...prev, image: originalPreviewUrl };
        });
        
        try {
            const compressedFile = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
            fileSetter(compressedFile);
        } catch (error) {
            console.error("Image compression failed:", error);
            addNotification({ title: 'خطأ', message: 'فشل ضغط الصورة، سيتم استخدام الصورة الأصلية.', type: 'error' });
            fileSetter(file);
        }
    }, [captureTarget, addNotification]);

    const handleAddGeneralNote = async () => {
        if ((!newGeneralNote.text.trim() && !newGeneralNoteFile) || !authUser || isUploading) return;
    
        setIsUploading(true);
        const noteId = uuidv4();
        
        const placeholderNote: Note = { 
            id: noteId, 
            text: newGeneralNote.text.trim(), 
            image: newGeneralNote.image || undefined,
            status: 'saving', 
            authorId: authUser.id, 
            authorName: authUser.name 
        };
        setGeneralNotes(prev => [...prev, placeholderNote]);
    
        const fileToUpload = newGeneralNoteFile;
        const textToSave = newGeneralNote.text.trim();
        
        setNewGeneralNote({ text: '', image: null });
        setNewGeneralNoteFile(null);
    
        try {
            let imageUrl: string | undefined = undefined;
            if (fileToUpload) {
                imageUrl = await uploadImage(fileToUpload, 'note_images');
            }
    
            addActivityLogEntry('إضافة ملاحظة عامة', `"${textToSave}"`, imageUrl);

            const finalNote: Note = { ...placeholderNote, text: textToSave, image: imageUrl, status: 'saving' };
            setGeneralNotes(prev => prev.map(n => n.id === noteId ? finalNote : n));
            
            debouncedSave();
    
        } catch (error) {
             addNotification({ title: 'خطأ', message: 'فشل رفع الصورة، لن يتم حفظ الملاحظة.', type: 'error' });
             setGeneralNotes(prev => prev.filter(n => n.id !== noteId));
             // To-Do: remove the activity log entry for the failed note
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveGeneralNote = async (idToRemove: string) => {
        if (deletingNoteIds.has(idToRemove) || !request) return;
    
        const noteToDelete = generalNotes.find(note => note.id === idToRemove);
        if (!noteToDelete) return;
    
        setDeletingNoteIds(prev => new Set(prev).add(idToRemove));
    
        try {
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    
            if (noteToDelete.image) {
                deleteImage(noteToDelete.image).catch(err => {
                    console.error("Failed to delete image from storage", err);
                    addNotification({ title: 'تحذير', message: 'فشل حذف الصورة من الخادم.', type: 'error' });
                });
            }
            
            const newGeneralNotes = generalNotes.filter(note => note.id !== idToRemove);
            const newLog = createActivityLog('حذف ملاحظة عامة', `"${noteToDelete.text}"`, noteToDelete.image);
            const newActivityLog = newLog ? [newLog, ...activityLog] : activityLog;
    
            const updatedRequest: InspectionRequest = {
                ...request,
                general_notes: newGeneralNotes.map(({ status, ...rest }) => rest as Note),
                activity_log: newActivityLog,
            };
            
            await updateRequest(updatedRequest);
    
        } catch (error) {
            console.error("Deletion failed:", error);
            addNotification({ title: 'خطأ', message: 'فشل حذف الملاحظة.', type: 'error' });
        } finally {
            setDeletingNoteIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(idToRemove);
                return newSet;
            });
        }
    };
    
    const handleAddCategoryNote = async (categoryId: string | null) => {
        if ((!newCategoryNote.text.trim() && !newCategoryNoteFile) || !categoryId || !authUser || isUploading) return;
    
        setIsUploading(true);
        const noteId = uuidv4();
        
        const placeholderNote: Note = { 
            id: noteId, 
            text: newCategoryNote.text.trim(), 
            image: newCategoryNote.image || undefined,
            status: 'saving', 
            authorId: authUser.id, 
            authorName: authUser.name 
        };
        setCategoryNotes(prev => ({ ...prev, [categoryId]: [...(prev[categoryId] || []), placeholderNote] }));
        
        const fileToUpload = newCategoryNoteFile;
        const textToSave = newCategoryNote.text.trim();
        const categoryName = customFindingCategories.find(c => c.id === categoryId)?.name || 'غير معروف';
    
        setNewCategoryNote({ text: '', image: null });
        setNewCategoryNoteFile(null);
    
        try {
            let imageUrl: string | undefined = undefined;
            if (fileToUpload) {
                imageUrl = await uploadImage(fileToUpload, 'note_images');
            }
    
            addActivityLogEntry('إضافة ملاحظة', `"${textToSave}" في قسم "${categoryName}"`, imageUrl);

            const finalNote: Note = { ...placeholderNote, text: textToSave, image: imageUrl, status: 'saving' };
    
            setCategoryNotes(prev => ({ ...prev, [categoryId]: prev[categoryId].map(n => n.id === noteId ? finalNote : n) }));
            
            debouncedSave();
    
        } catch (error) {
             addNotification({ title: 'خطأ', message: 'فشل رفع الصورة، لن يتم حفظ الملاحظة.', type: 'error' });
             setCategoryNotes(prev => ({ ...prev, [categoryId]: (prev[categoryId] || []).filter(n => n.id !== noteId) }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemoveCategoryNote = async (categoryId: string, idToRemove: string) => {
        if (deletingNoteIds.has(idToRemove) || !request) return;

        const notesForCategory = categoryNotes[categoryId] || [];
        const noteToDelete = notesForCategory.find(note => note.id === idToRemove);
        if (!noteToDelete) return;

        setDeletingNoteIds(prev => new Set(prev).add(idToRemove));

        try {
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

            if (noteToDelete.image) {
                deleteImage(noteToDelete.image).catch(err => {
                    console.error("Failed to delete image from storage", err);
                    addNotification({ title: 'تحذير', message: 'فشل حذف الصورة من الخادم.', type: 'error' });
                });
            }

            const newNotesForCategory = notesForCategory.filter(note => note.id !== idToRemove);
            const newCategoryNotes = { ...categoryNotes, [categoryId]: newNotesForCategory };

            const categoryName = customFindingCategories.find(c => c.id === categoryId)?.name || 'غير معروف';
            const newLog = createActivityLog('حذف ملاحظة', `"${noteToDelete.text}" من قسم "${categoryName}"`, noteToDelete.image);
            const newActivityLog = newLog ? [newLog, ...activityLog] : activityLog;
            
            const cleanCategoryNotes = (notesMap: Record<string, Note[]>) => {
                const newMap: Record<string, Note[]> = {};
                for (const key in notesMap) { newMap[key] = (notesMap[key] || []).map(({ status, ...rest }) => rest) as Note[]; }
                return newMap;
            };

            const updatedRequest: InspectionRequest = {
                ...request,
                category_notes: cleanCategoryNotes(newCategoryNotes),
                activity_log: newActivityLog,
            };

            await updateRequest(updatedRequest);

        } catch (error) {
            console.error("Deletion failed:", error);
            addNotification({ title: 'خطأ', message: 'فشل حذف الملاحظة.', type: 'error' });
        } finally {
            setDeletingNoteIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(idToRemove);
                return newSet;
            });
        }
    };
    
    const openEditNoteModal = (note: Note, categoryId: string | 'general') => { 
        setEditingNote({ note, categoryId }); 
        setModalNoteData({ text: note.text, image: note.image || null });
        setModalNoteFile(null);
        setIsEditNoteModalOpen(true); 
    };
    
    const handleSaveEditedNote = async () => {
        if (!editingNote || isUploading) return;
    
        const originalNote = editingNote.note;
        const { categoryId } = editingNote;
    
        setIsUploading(true);
    
        try {
            let finalImageUrl = modalNoteData.image || undefined;
            if (modalNoteFile) {
                finalImageUrl = await uploadImage(modalNoteFile, 'note_images');
                if (originalNote.image && originalNote.image !== finalImageUrl) {
                  // Delete the old image only if a new one was successfully uploaded
                  deleteImage(originalNote.image).catch(err => {
                      console.error("Failed to delete old image from storage.", err);
                      addNotification({ title: 'تحذير', message: 'فشل حذف الصورة القديمة من الخادم.', type: 'error' });
                  });
                }
            } else if (originalNote.image && !modalNoteData.image) {
                // Image was removed
                deleteImage(originalNote.image).catch(err => {
                    console.error("Failed to delete old image from storage.", err);
                    addNotification({ title: 'تحذير', message: 'فشل حذف الصورة القديمة من الخادم.', type: 'error' });
                });
            }

            const updatedNote: Note = { ...originalNote, text: modalNoteData.text, image: finalImageUrl, status: 'saving' };

            const textChanged = originalNote.text !== modalNoteData.text;
            const imageChanged = originalNote.image !== finalImageUrl;
            
            if (!textChanged && !imageChanged) {
                setIsEditNoteModalOpen(false);
                setEditingNote(null);
                setIsUploading(false);
                return; // Nothing to save or log
            }

            let logDetails = `تم تغيير النص القديم "${originalNote.text}" إلى النص الجديد "${modalNoteData.text}".`;
            if (imageChanged) {
                logDetails = `تم تغيير النص من "${originalNote.text}" إلى "${modalNoteData.text}" وتحديث الصورة.`;
            } else if (textChanged) {
                logDetails = `تم تغيير النص من "${originalNote.text}" إلى "${modalNoteData.text}".`;
            } else { // Only image changed
                logDetails = `تم تحديث صورة الملاحظة "${modalNoteData.text}".`;
            }
    
            if (categoryId === 'general') {
                setGeneralNotes(prev => prev.map(n => n.id === originalNote.id ? updatedNote : n));
                addActivityLogEntry('تعديل ملاحظة عامة', logDetails, finalImageUrl);
            } else {
                setCategoryNotes(prev => ({ ...prev, [categoryId]: prev[categoryId].map(n => n.id === originalNote.id ? updatedNote : n) }));
                const categoryName = customFindingCategories.find(c => c.id === categoryId)?.name || 'غير معروف';
                addActivityLogEntry('تعديل ملاحظة', `${logDetails} في قسم "${categoryName}"`, finalImageUrl);
            }
            
            setIsEditNoteModalOpen(false);
            setEditingNote(null);
        } catch (error) {
            addNotification({ title: 'خطأ', message: 'فشل حفظ التعديل.', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };
    
    const openImagePreview = (imageUrl: string) => { setPreviewImageUrl(imageUrl); setIsPreviewModalOpen(true); };
    
    const handleSave = async () => { 
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); 
        try { 
            const newLog = createActivityLog('حفظ مؤقت', 'تم حفظ جميع التغييرات يدوياً.');
            const newLogArray = newLog ? [newLog, ...activityLog] : activityLog;
            setActivityLog(newLogArray);
            await performSave(false, undefined, { activityLog: newLogArray }); 
            addNotification({ title: 'نجاح', message: 'تم حفظ التغييرات بنجاح.', type: 'success' }); 
        } catch {} 
    };
    
    const handleComplete = async () => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        const newLog = createActivityLog('تغيير حالة الطلب', 'تم تحديد الطلب كمكتمل');
        const newLogArray = newLog ? [newLog, ...activityLog] : activityLog;
        setActivityLog(newLogArray);
        try { 
            await performSave(true, RequestStatus.COMPLETE, { activityLog: newLogArray }); 
            addNotification({ title: 'نجاح', message: 'تم تحديد الطلب كمكتمل.', type: 'success' }); 
            setPage('requests'); 
        } catch {} 
    };

    const handleTabSwitch = (tabId: string) => { setActiveTabId(tabId); if (tabId !== 'general-notes') { setNewCategoryNote({ text: '', image: null }); setNewCategoryNoteFile(null); } };
    
    const handleModalFindingToggle = (findingId: string) => setSelectedFindingsInModal(prev => { const newSet = new Set(prev); if (newSet.has(findingId)) newSet.delete(findingId); else newSet.add(findingId); return newSet; });
    const handleAddSelectedFindings = () => {
        const findingsToAdd = predefinedFindings.filter(f => selectedFindingsInModal.has(f.id));
        const newStructuredFindings: StructuredFinding[] = findingsToAdd.map(finding => ({ findingId: finding.id, findingName: finding.name, value: finding.options[0] || '', categoryId: finding.category_id, status: 'saving' }));
        setStructuredFindings(prev => [...prev, ...newStructuredFindings]);
        
        const activeCategory = customFindingCategories.find(c => c.id === activeTabId);
        const categoryName = activeCategory?.name || 'قسم غير معروف';
        const findingNames = findingsToAdd.map(f => `"${f.name}"`).join('، ');
        addActivityLogEntry('إضافة بنود فحص', `تمت إضافة: ${findingNames} إلى قسم "${categoryName}"`);

        setIsFindingModalOpen(false);
    };

    const handleFindingValueChange = (findingId: string, newValue: string) => { 
        setStructuredFindings(prev => prev.map(sf => sf.findingId === findingId ? { ...sf, value: newValue, status: 'saving' } : sf)); 
        const finding = structuredFindings.find(sf => sf.findingId === findingId);
        if (finding) {
            addActivityLogEntry('تغيير قيمة بند', `تم تغيير قيمة "${finding.findingName}" إلى "${newValue}"`);
        }
    };
    
    const handleRemoveFinding = async (findingId: string) => {
        if (deletingFindingIds.has(findingId) || !request) return;
    
        const findingToDelete = structuredFindings.find(sf => sf.findingId === findingId);
        if (!findingToDelete) return;
    
        setDeletingFindingIds(prev => new Set(prev).add(findingId));
    
        try {
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    
            const newStructuredFindings = structuredFindings.filter(sf => sf.findingId !== findingId);
            
            const categoryName = customFindingCategories.find(c => c.id === findingToDelete.categoryId)?.name || 'غير معروف';
            const newLog = createActivityLog('حذف بند فحص', `تم حذف بند "${findingToDelete.findingName}" من قسم "${categoryName}"`);
            const newActivityLog = newLog ? [newLog, ...activityLog] : activityLog;
    
            const updatedRequest: InspectionRequest = {
                ...request,
                structured_findings: newStructuredFindings.map(({ status, ...rest }) => rest as StructuredFinding),
                activity_log: newActivityLog,
            };
    
            await updateRequest(updatedRequest);
            
        } catch (error) {
            console.error("Deletion failed:", error);
            addNotification({ title: 'خطأ', message: 'فشل حذف البند.', type: 'error' });
        } finally {
            setDeletingFindingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(findingId);
                return newSet;
            });
        }
    };

    const handlePreviewAndPrint = () => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        performSave(true).then(() => {
            setSelectedRequestId(request!.id);
            setPage('print-report');
        }).catch(err => {
            addNotification({ title: 'خطأ', message: 'فشل حفظ التغييرات قبل المعاينة.', type: 'error' });
        });
    };
    
    const getCategoryCount = useCallback((categoryId: string) => {
        const findingsCount = structuredFindings.filter(sf => sf.categoryId === categoryId).length;
        const notesCount = categoryNotes[categoryId]?.length || 0;
        const memosCount = voiceMemos[categoryId]?.length || 0;
        return findingsCount + notesCount + memosCount;
    }, [structuredFindings, categoryNotes, voiceMemos]);

    const generalNotesCount = generalNotes.length;
    const generalMemosCount = voiceMemos['general']?.length || 0;
    const activityLogCount = activityLog.length;

    // --- Voice Memo Recording Logic ---
    const handleStartRecording = useCallback(async (target: string) => {
        if (recordingState.status === 'recording' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            addNotification({ title: 'خطأ', message: 'المتصفح لا يدعم تسجيل الصوت أو الميكروفون غير متاح.', type: 'error' });
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];
            isCancellingRef.current = false;
            recordingTargetRef.current = target;

            recorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

                const currentTarget = recordingTargetRef.current;

                if (isCancellingRef.current || !currentTarget) {
                    setRecordingState({ status: 'idle', target: null, duration: 0 });
                    return;
                }

                setRecordingState({ status: 'processing', target: currentTarget, duration: 0 });

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];

                const audioUrl = URL.createObjectURL(audioBlob);
                const audioElement = new Audio(audioUrl);
                audioElement.onloadedmetadata = () => {
                    const duration = audioElement.duration;
                    URL.revokeObjectURL(audioUrl);

                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = () => {
                        if (!authUser) return;
                        const newMemo: VoiceMemo = {
                            id: uuidv4(),
                            audioData: reader.result as string,
                            authorId: authUser.id,
                            authorName: authUser.name,
                            createdAt: new Date().toISOString(),
                            duration: duration,
                            status: 'saving'
                        };
                        setVoiceMemos(prev => ({ ...prev, [currentTarget]: [...(prev[currentTarget] || []), newMemo] }));
                        const categoryName = currentTarget === 'general' ? 'عامة' : customFindingCategories.find(c => c.id === currentTarget)?.name || 'غير معروف';
                        addActivityLogEntry('إضافة مذكرة صوتية', `في قسم "${categoryName}"`);
                        debouncedSave();
                        setRecordingState({ status: 'idle', target: null, duration: 0 });
                    };
                };
            };

            recorder.start();
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            const startTime = Date.now();
            timerIntervalRef.current = window.setInterval(() => {
                setRecordingState(prev => ({ ...prev, duration: (Date.now() - startTime) / 1000 }));
            }, 500);
            setRecordingState({ status: 'recording', target, duration: 0 });
        } catch (err) {
            console.error("Error starting recording:", err);
            addNotification({ title: 'خطأ في الميكروفون', message: 'لم يتم منح إذن الوصول إلى الميكروفون.', type: 'error' });
        }
    }, [addNotification, authUser, customFindingCategories, addActivityLogEntry, debouncedSave, recordingState.status]);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            isCancellingRef.current = false;
            mediaRecorderRef.current.stop();
        }
    }, []);

    const handleCancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            isCancellingRef.current = true;
            mediaRecorderRef.current.stop();
        }
    }, []);

    const handleTranscribe = async (target: string, memoId: string) => {
        if (!settings.geminiApiKey) {
            addNotification({ title: 'مفتاح API مطلوب', message: 'لاستخدام النسخ الصوتي، يرجى إضافة مفتاح Gemini API في الإعدادات.', type: 'error' });
            setPage('settings');
            setSettingsPage('api');
            return;
        }
    
        setVoiceMemos(prev => {
            const memos = prev[target] || [];
            return {
                ...prev,
                [target]: memos.map(m => m.id === memoId ? { ...m, isTranscribing: true } : m)
            };
        });
    
        const memo = (voiceMemos[target] || []).find(m => m.id === memoId);
        if (!memo) return;
    
        try {
            const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
            const base64Audio = memo.audioData.split(',')[1];
            const mimeType = memo.audioData.match(/data:(.*);/)?.[1] || 'audio/webm';
    
            const audioPart = { inlineData: { mimeType, data: base64Audio } };
            const textPart = { text: "Transcribe this Arabic audio recording accurately. The recording is a voice memo from a car mechanic during a vehicle inspection." };
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [audioPart, textPart] },
            });
            
            const transcription = response.text;
    
            setVoiceMemos(prev => {
                const memos = prev[target] || [];
                return {
                    ...prev,
                    [target]: memos.map(m => m.id === memoId ? { ...m, transcription, isTranscribing: false, status: 'saving' } : m)
                };
            });
    
            const categoryName = target === 'general' ? 'عامة' : customFindingCategories.find(c => c.id === target)?.name || 'غير معروف';
            addActivityLogEntry('نسخ مذكرة صوتية', `في قسم "${categoryName}"`);
            debouncedSave();
    
        } catch (error) {
            console.error("Transcription error:", error);
            addNotification({ title: 'خطأ', message: 'فشل النسخ الصوتي. الرجاء المحاولة مرة أخرى.', type: 'error' });
            setVoiceMemos(prev => {
                const memos = prev[target] || [];
                return {
                    ...prev,
                    [target]: memos.map(m => m.id === memoId ? { ...m, isTranscribing: false } : m)
                };
            });
        }
    };

    if (!request) {
        return <div className="p-6 dark:text-gray-300">الرجاء اختيار طلب أولاً. <button onClick={() => setPage('requests')} className="text-blue-600 dark:text-blue-400">العودة للطلبات</button></div>;
    }
    
    const handleDeleteVoiceMemo = (target: string, memoId: string) => {
        const categoryName = target === 'general' ? 'عامة' : customFindingCategories.find(c => c.id === target)?.name || 'غير معروف';
        
        showConfirmModal({
            title: 'حذف المذكرة الصوتية',
            message: 'هل أنت متأكد من حذف هذه المذكرة الصوتية؟',
            onConfirm: () => {
                setVoiceMemos(prev => ({
                    ...prev,
                    [target]: (prev[target] || []).filter(memo => memo.id !== memoId)
                }));
                addActivityLogEntry('حذف مذكرة صوتية', `من قسم "${categoryName}"`);
                debouncedSave();
            }
        })
    };
    
    const toggleEditTranscription = (target: string, memoId: string) => {
        setVoiceMemos(prev => {
            const memos = prev[target] || [];
            return {
                ...prev,
                [target]: memos.map(m => m.id === memoId ? { ...m, isEditingTranscription: !m.isEditingTranscription } : { ...m, isEditingTranscription: false })
            };
        });
    };
    
    const handleTranscriptionChange = (target: string, memoId: string, newText: string) => {
        setVoiceMemos(prev => {
            const memos = prev[target] || [];
            return {
                ...prev,
                [target]: memos.map(m => m.id === memoId ? { ...m, transcription: newText } : m)
            };
        });
    };

    const saveEditedTranscription = (target: string, memoId: string) => {
        setVoiceMemos(prev => {
            const memos = prev[target] || [];
            return {
                ...prev,
                [target]: memos.map(m => m.id === memoId ? { ...m, isEditingTranscription: false, status: 'saving' } : m)
            };
        });
        const categoryName = target === 'general' ? 'عامة' : customFindingCategories.find(c => c.id === target)?.name || 'غير معروف';
        addActivityLogEntry('تعديل نسخة صوتية', `في قسم "${categoryName}"`);
        debouncedSave();
    };

    const handleCancelEdit = (target: string, memoId: string) => {
        const originalMemo = request?.voice_memos?.[target]?.find(m => m.id === memoId);
        setVoiceMemos(prev => {
            const memos = prev[target] || [];
            return {
                ...prev,
                [target]: memos.map(m => m.id === memoId ? { ...m, isEditingTranscription: false, transcription: originalMemo?.transcription || m.transcription } : m)
            };
        });
    };

    const handleAddTranscriptionAsNote = (target: string, memo: VoiceMemo) => {
        if (!memo.transcription || !authUser) return;

        const newNote: Note = {
            id: uuidv4(),
            text: memo.transcription,
            authorId: authUser.id,
            authorName: authUser.name,
            status: 'saving'
        };

        const categoryName = target === 'general' ? 'عامة' : customFindingCategories.find(c => c.id === target)?.name || 'غير معروف';

        if (target === 'general') {
            setGeneralNotes(prev => [...prev, newNote]);
        } else {
            setCategoryNotes(prev => ({
                ...prev,
                [target]: [...(prev[target] || []), newNote]
            }));
        }

        addActivityLogEntry('إضافة ملاحظة من نسخة صوتية', `"${memo.transcription}" في قسم "${categoryName}"`);
        addNotification({ title: "تمت الإضافة", message: "تمت إضافة النسخة الصوتية كملاحظة جديدة.", type: 'success'});
        debouncedSave();
    };

    const scrollToNote = (noteId: string) => {
        const noteElement = document.getElementById(`note-${noteId}`);
        if (noteElement) {
            noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            noteElement.classList.add('animate-highlight');
            setTimeout(() => {
                noteElement.classList.remove('animate-highlight');
            }, 2500);
        }
    };

    const LastNoteHint: React.FC<{ note: Note | null; onClick: () => void }> = ({ note, onClick }) => {
        if (!note) return null;
        const truncate = (text: string, length: number) => text.length > length ? text.substring(0, length) + '...' : text;
        return (
            <div
                onClick={onClick}
                className="text-xs text-slate-500 dark:text-slate-400 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700 cursor-pointer"
            >
                <strong className="text-slate-600 dark:text-slate-300">آخر ملاحظة:</strong>
                <span className="mx-1">"{truncate(note.text, 60)}"</span>
                <em className="text-slate-400">(اضغط للانتقال)</em>
            </div>
        );
    };

    const renderVoiceMemos = (target: string) => (
        <div className="mb-6">
            <div className="mb-3 p-3 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                {recordingState.status === 'recording' && recordingState.target === target ? (
                    <div className="flex flex-col items-center justify-center animate-fade-in gap-3">
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                            </span>
                            <span className="font-semibold text-red-600 dark:text-red-400">جاري التسجيل...</span>
                            <span className="font-mono text-lg text-slate-700 dark:text-slate-200">{formatTime(recordingState.duration)}</span>
                        </div>
                        <div className="flex items-center justify-center gap-4 w-full mt-2">
                            <Button onClick={handleCancelRecording} variant="secondary">
                                <Icon name="close" className="w-5 h-5" />
                                <span className="ms-2">إلغاء</span>
                            </Button>
                            <Button onClick={handleStopRecording} className="bg-red-600 hover:bg-red-700 text-white">
                                <StopIcon className="w-5 h-5" />
                                <span className="ms-2">إيقاف وحفظ</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        onClick={() => handleStartRecording(target)}
                        disabled={recordingState.status !== 'idle' || !can('manage_notes')}
                        className="w-full"
                        variant="secondary"
                        leftIcon={<Icon name="microphone" className="w-5 h-5"/>}
                    >
                        {recordingState.status === 'processing' && recordingState.target === target ? 'جاري المعالجة...' : 'بدء تسجيل مذكرة صوتية'}
                    </Button>
                )}
            </div>
            <Accordion title="المناقشات الصوتية" count={voiceMemos[target]?.length || 0} targetId={`voice-${target}`} openSections={openVoiceMemoSections} setOpenSections={setOpenVoiceMemoSections}>
                {(voiceMemos[target] || []).length > 0 ? (
                    <div className="space-y-3">
                        {(voiceMemos[target] || []).map(memo => (
                            <div key={memo.id} className="bg-white dark:bg-slate-700/50 p-3 rounded-lg border dark:border-slate-700 flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                    <div className="flex-grow w-full">
                                        <AudioPlayer audioData={memo.audioData} duration={memo.duration} />
                                    </div>
                                    <div className="flex items-center justify-between w-full sm:w-auto">
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            <p>{memo.authorName}</p>
                                            <p>{new Date(memo.createdAt).toLocaleString('en-GB', { timeStyle: 'short', dateStyle: 'short' })}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusIndicator status={memo.status} />
                                            <button onClick={() => handleDeleteVoiceMemo(target, memo.id)} className="p-1 text-red-500 hover:text-red-700" title="حذف المذكرة"><Icon name="delete" className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t dark:border-slate-600 pt-3">
                                    {!memo.transcription && !memo.isTranscribing && (
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => handleTranscribe(target, memo.id)}
                                            disabled={!settings.geminiApiKey || !can('manage_notes')}
                                            title={!can('manage_notes') ? 'صلاحية إدارة الملاحظات مطلوبة' : !settings.geminiApiKey ? 'الرجاء إضافة مفتاح Gemini API' : ''}
                                            leftIcon={<Icon name="sparkles" className="w-4 h-4" />}
                                        >
                                            تحويل إلى نص
                                        </Button>
                                    )}
                                    {memo.isTranscribing && (
                                        <Button size="sm" variant="secondary" disabled leftIcon={<Icon name="refresh-cw" className="w-4 h-4 animate-spin" />}>
                                            جاري النسخ...
                                        </Button>
                                    )}
                                    {memo.transcription && (
                                        <div className="space-y-3">
                                            {memo.isEditingTranscription ? (
                                                <div className="animate-fade-in">
                                                    <textarea
                                                        value={memo.transcription}
                                                        onChange={(e) => handleTranscriptionChange(target, memo.id, e.target.value)}
                                                        className="w-full p-2 border rounded-md dark:bg-slate-900/50 dark:border-slate-600 text-md"
                                                        rows={4}
                                                    />
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Button size="sm" onClick={() => saveEditedTranscription(target, memo.id)}>حفظ</Button>
                                                        <Button size="sm" variant="secondary" onClick={() => handleCancelEdit(target, memo.id)}>إلغاء</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">النص:</p>
                                                    <p className="text-md bg-slate-100 dark:bg-slate-900/50 p-3 rounded-md whitespace-pre-wrap">{memo.transcription}</p>
                                                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                                                        <Button size="sm" variant="secondary" onClick={() => toggleEditTranscription(target, memo.id)} leftIcon={<Icon name="edit" className="w-4 h-4" />}>تعديل</Button>
                                                        <Button size="sm" variant="secondary" onClick={() => handleAddTranscriptionAsNote(target, memo)} leftIcon={<Icon name="add" className="w-4 h-4" />}>إضافة كملاحظة</Button>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => handleTranscribe(target, memo.id)}
                                                            disabled={!settings.geminiApiKey || !can('manage_notes')}
                                                            title={!can('manage_notes') ? 'صلاحية إدارة الملاحظات مطلوبة' : !settings.geminiApiKey ? 'الرجاء إضافة مفتاح Gemini API' : ''}
                                                            leftIcon={<Icon name="refresh-cw" className="w-4 h-4" />}
                                                        >
                                                            إعادة النسخ
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                        لا توجد مذكرات صوتية مسجلة لهذا القسم.
                    </p>
                )}
            </Accordion>
        </div>
    );


    const renderFindingsForCategory = (categoryId: string) => {
        if (!categoryId) return null;
        const activeCategory = customFindingCategories.find(c => c.id === categoryId);
        if (!activeCategory) return null;
        const currentCategoryNotes = categoryNotes[categoryId] || [];
        const lastCategoryNote = currentCategoryNotes.length > 0 ? currentCategoryNotes[currentCategoryNotes.length - 1] : null;

        
        const addedFindings = structuredFindings.filter(sf => sf.categoryId === categoryId);
        const availableFindings = predefinedFindings.filter(f => f.category_id === categoryId && !addedFindings.some(sf => sf.findingId === f.id));

        const groupsAvailable: { [key: string]: PredefinedFinding[] } = {};
        availableFindings.forEach(finding => {
            const groupName = finding.group || 'عام';
            if (!groupsAvailable[groupName]) {
                groupsAvailable[groupName] = [];
            }
            groupsAvailable[groupName].push(finding);
        });
        const groupedAvailableFindings = Object.entries(groupsAvailable).sort(([a], [b]) => a.localeCompare(b));

        const groupsAdded: { [key: string]: { finding: StructuredFinding, predefined?: PredefinedFinding }[] } = {};
        addedFindings.forEach(finding => {
            const predefined = predefinedFindings.find(pf => pf.id === finding.findingId);
            const groupName = predefined?.group || 'عام';
            if (!groupsAdded[groupName]) {
                groupsAdded[groupName] = [];
            }
            groupsAdded[groupName].push({ finding, predefined });
        });
        const groupedAddedFindings = Object.entries(groupsAdded).sort(([a], [b]) => a.localeCompare(b));


        return (
            <div key={activeTabId} className="animate-fade-in">
                 {renderVoiceMemos(categoryId)}
                 <div className="p-4 border dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50 mb-6 flex justify-between items-center">
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">إضافة بنود للفحص</h4>
                    <Button 
                        onClick={() => { setSelectedFindingsInModal(new Set()); setIsFindingModalOpen(true); }} 
                        leftIcon={<Icon name="add" className="w-5 h-5"/>}
                        disabled={!can('manage_findings')}
                        title={!can('manage_findings') ? 'صلاحية إدارة بنود الفحص مطلوبة' : ''}
                    >
                        اختيار بنود
                    </Button>
                </div>

                {groupedAddedFindings.length > 0 && (
                    <div>
                        <h4 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">البنود المضافة</h4>
                        <div className="space-y-6">
                            {groupedAddedFindings.map(([groupName, findingsInGroup]) => (
                                <div key={groupName}>
                                    <h5 className="font-semibold text-md text-slate-600 dark:text-slate-400 mb-3 border-b pb-2 dark:border-slate-600">{groupName}</h5>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-7 gap-4">
                                        {findingsInGroup.map(({ finding, predefined }) => {
                                            const isDeleting = deletingFindingIds.has(finding.findingId);
                                            return (
                                            <div key={finding.findingId} className={`relative bg-white dark:bg-slate-700/50 rounded-lg shadow-md border dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1 animate-slide-in-down ${isDeleting ? 'opacity-50' : ''}`}>
                                                {predefined?.reference_image && (
                                                    <div className="h-20 bg-gray-200 dark:bg-slate-800 cursor-pointer group relative" onClick={() => openImagePreview(predefined.reference_image!)}>
                                                        <img src={predefined.reference_image} alt={finding.findingName} className="w-full h-full object-cover" style={{ objectPosition: predefined?.reference_image_position || 'center' }} />
                                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                                           <SearchIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="p-2 flex justify-between items-start border-b dark:border-slate-600">
                                                    <div className="flex-grow">
                                                        <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{finding.findingName}</h5>
                                                        <StatusIndicator status={finding.status} />
                                                    </div>
                                                    {can('manage_findings') && <button onClick={() => handleRemoveFinding(finding.findingId)} disabled={isDeleting} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"><Icon name="delete" className="w-4 h-4" /></button>}
                                                </div>
                                                <div className="p-3 bg-gray-50 dark:bg-slate-800 flex-grow">
                                                    {predefined && predefined.options && predefined.options.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {predefined.options.map(option => (
                                                                <button
                                                                    key={option}
                                                                    onClick={() => handleFindingValueChange(finding.findingId, option)}
                                                                    disabled={!can('manage_findings') || isDeleting}
                                                                    className={`px-2 py-0.5 text-xs rounded-full transition-all duration-200 font-medium ${finding.value === option ? `bg-${primaryColorName}-600 text-white shadow-lg scale-105` : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                >
                                                                    {option}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <input 
                                                            type="text" 
                                                            value={finding.value} 
                                                            onChange={(e) => handleFindingValueChange(finding.findingId, e.target.value)} 
                                                            disabled={!can('manage_findings') || isDeleting}
                                                            className={`w-full p-1.5 border-gray-200 dark:border-slate-600 focus:border-${primaryColorName}-500 rounded-md bg-white dark:bg-slate-700 dark:text-gray-200 focus:ring-1 focus:ring-${primaryColorName}-500 transition disabled:bg-gray-100 dark:disabled:bg-slate-800 text-sm`} 
                                                            placeholder="أدخل الحالة..." 
                                                        />
                                                    )}
                                                </div>
                                                {isDeleting && (
                                                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 flex flex-col items-center justify-center rounded-lg z-10">
                                                        <RefreshCwIcon className="w-8 h-8 animate-spin text-slate-500" />
                                                        <span className="text-sm mt-2 text-slate-500 font-semibold">جاري الحذف...</span>
                                                    </div>
                                                )}
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="mt-6 pt-4 border-t dark:border-slate-700"><h4 className="text-lg font-semibold mb-2">ملاحظات على {activeCategory?.name}</h4>
                    <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-xl">
                        <LastNoteHint 
                            note={lastCategoryNote}
                            onClick={() => lastCategoryNote && scrollToNote(lastCategoryNote.id)} 
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-grow relative">
                                <input type="text" placeholder={`أضف ملاحظة جديدة لـ ${activeCategory?.name}...`} value={newCategoryNote.text} onChange={e => setNewCategoryNote(prev => ({ ...prev, text: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategoryNote(activeTabId); } }} className={`w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 pl-20 focus:ring-2 focus:ring-${primaryColorName}-500 transition disabled:cursor-not-allowed`} disabled={!can('manage_notes')} title={!can('manage_notes') ? 'صلاحية إدارة الملاحظات مطلوبة' : ''}/>
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {isSpeechRecognitionSupported && (
                                        <div className="relative">
                                            <button type="button" onClick={() => handleToggleListening(activeTabId)} className={`p-1 text-gray-500 hover:text-${primaryColorName}-500 ${listeningTarget === activeTabId ? 'text-red-500 animate-pulse' : ''}`} aria-label="إملاء صوتي" title={listeningTarget === activeTabId ? 'إيقاف الإملاء' : 'بدء الإملاء'}>
                                                <Icon name="microphone" className="w-5 h-5" />
                                            </button>
                                            {listeningTarget === activeTabId && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded-md shadow-lg whitespace-nowrap animate-fade-in z-10">
                                                    جاري الاستماع...
                                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700"></div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {newCategoryNote.text && (
                                        <button type="button" onClick={() => setNewCategoryNote(prev => ({...prev, text: ''}))} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="مسح النص" title="مسح النص">
                                            <Icon name="close" className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                             <div className="flex items-center gap-2">
                                <div className="relative" ref={categoryNoteDropdownRef}>
                                    <Button type="button" variant="secondary" onClick={() => setIsCategoryNoteDropdownOpen(prev => !prev)} disabled={!can('manage_notes')} className="px-3 py-2 flex items-center">
                                        <Icon name="camera" className="h-5 w-5 me-2" />
                                        <span>صورة</span>
                                        <Icon name="chevron-down" className="h-4 w-4 ms-1" />
                                    </Button>
                                    {isCategoryNoteDropdownOpen && (
                                        <div className="absolute bottom-full mb-2 w-48 bg-white dark:bg-slate-700 rounded-md shadow-lg border dark:border-slate-600 z-10 animate-fade-in">
                                            <button type="button" onClick={() => { setCaptureTarget(activeTabId); setIsCameraPageOpen(true); setIsCategoryNoteDropdownOpen(false); }} className="flex items-center gap-3 w-full text-right px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-t-md">
                                                <Icon name="camera" className="w-5 h-5" />
                                                <span>التقاط صورة</span>
                                            </button>
                                            <input type="file" className="hidden" accept="image/*" ref={categoryNoteUploadInputRef} onChange={e => { handleImageChange(e, setNewCategoryNote, setNewCategoryNoteFile); setIsCategoryNoteDropdownOpen(false); }}/>
                                            <button type="button" onClick={() => categoryNoteUploadInputRef.current?.click()} className="flex items-center gap-3 w-full text-right px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-b-md">
                                                <Icon name="gallery" className="w-5 h-5" />
                                                <span>رفع من الجهاز</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {newCategoryNote.image && <div className="relative"><img src={newCategoryNote.image} className="h-10 w-10 object-cover rounded" onClick={() => openImagePreview(newCategoryNote.image!)} /><button onClick={() => { if (newCategoryNote.image) URL.revokeObjectURL(newCategoryNote.image); setNewCategoryNote(p => ({...p, image: null})); setNewCategoryNoteFile(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">&times;</button></div>}
                                <Button onClick={() => handleAddCategoryNote(activeTabId)} disabled={isUploading || !can('manage_notes')}>{isUploading ? '...' : 'إضافة'}</Button>
                            </div>
                        </div>
                        {currentCategoryNotes.length > 0 && (
                            <ul className="space-y-3 mt-4">
                                {currentCategoryNotes.map((note) => {
                                    const isDeleting = deletingNoteIds.has(note.id);
                                    return (
                                    <li key={note.id} id={`note-${note.id}`} className={`relative flex justify-between items-start bg-white dark:bg-slate-700 p-3 border rounded-lg gap-3 animate-slide-in-down hover:shadow-lg hover:-translate-y-1 transform transition-all duration-300 ${isDeleting ? 'opacity-50' : ''}`}>
                                        <div className="flex items-start gap-3 flex-grow">{note.image && <img src={note.image} alt="صورة ملاحظة" className="w-16 h-16 object-cover rounded-md cursor-pointer border p-1" onClick={() => openImagePreview(note.image!)} />}<div className="flex-grow pt-1"><span>{note.text}</span>{note.authorName && <span className="block text-xs text-gray-500 mt-1">أضافها: {note.authorName}</span>}</div><StatusIndicator status={note.status} /></div>
                                        {can('manage_notes') && <div className="flex items-center gap-2 pt-1"><button onClick={() => openEditNoteModal(note, activeTabId)} disabled={isDeleting} className="text-yellow-500 hover:text-yellow-700 p-1"><Icon name="edit" className="w-5 h-5" /></button><button onClick={() => handleRemoveCategoryNote(activeTabId, note.id)} disabled={isDeleting} className="text-red-500 hover:text-red-700 p-1"><Icon name="delete" className="w-5 h-5" /></button></div>}
                                        {isDeleting && (
                                            <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 flex flex-col items-center justify-center rounded-lg z-10">
                                                <RefreshCwIcon className="w-6 h-6 animate-spin text-slate-500" />
                                                <span className="text-xs mt-2 text-slate-500 font-semibold">جاري الحذف...</span>
                                            </div>
                                        )}
                                    </li>
                                )})}
                            </ul>
                        )}
                    </div>
                </div>
                 <Modal isOpen={isFindingModalOpen} onClose={() => setIsFindingModalOpen(false)} title={`اختيار بنود لـ ${activeCategory?.name}`}>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1 border rounded-md dark:border-slate-600">
                        {groupedAvailableFindings.length > 0 ? (
                            groupedAvailableFindings.map(([groupName, findingsInGroup]) => (
                                <div key={groupName}>
                                    <h4 className="font-semibold bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md sticky top-0 z-10">{groupName}</h4>
                                    <div className="pt-2">
                                        {findingsInGroup.map(finding => (
                                            <label key={finding.id} className="flex items-center p-3 hover:bg-gray-100 rounded-md cursor-pointer gap-4 dark:hover:bg-slate-700">
                                                <input type="checkbox" checked={selectedFindingsInModal.has(finding.id)} onChange={() => handleModalFindingToggle(finding.id)} className="h-5 w-5 rounded" />
                                                {finding.reference_image && (<img src={finding.reference_image} alt={finding.name} className="w-16 h-16 object-cover rounded-md border dark:border-slate-600" />)}
                                                <span className="ms-3 dark:text-gray-200">{finding.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center p-4"> تم إضافة جميع البنود المتاحة.</p>
                        )}
                    </div>
                    <div className="flex justify-end pt-4 mt-4 border-t gap-2"><Button variant="secondary" onClick={() => setIsFindingModalOpen(false)}>إلغاء</Button><Button onClick={handleAddSelectedFindings} disabled={selectedFindingsInModal.size === 0}>إضافة ({selectedFindingsInModal.size}) بنود </Button></div>
                </Modal>
            </div>
        )
    };
    
    return (
        <div className="max-w-6xl mx-auto pb-24 px-4 sm:px-6">
            <div className="flex justify-between items-start mb-6 no-print pt-4">
                <Button type="button" onClick={goBack} variant="secondary" leftIcon={<Icon name="back" className="w-5 h-5 transform scale-x-[-1]" />}>
                    <span className="hidden sm:inline">العودة</span>
                    <span className="sm:hidden">عودة</span>
                </Button>

                <div className="relative">
                    <button 
                        onClick={() => setIsHeaderOpen(!isHeaderOpen)}
                        className="flex items-center gap-4 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
                        aria-expanded={isHeaderOpen}
                        aria-controls="request-details-panel"
                    >
                        <div className="text-right">
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                معلومات الطلب #{request.request_number}
                            </span>
                            {inspectionType && (
                                <span className="block text-sm text-slate-500 dark:text-slate-400">
                                    {inspectionType.name}
                                </span>
                            )}
                        </div>
                        <ChevronDownIcon className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isHeaderOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isHeaderOpen && (
                        <div 
                            id="request-details-panel"
                            className="absolute top-full right-0 mt-2 w-[400px] bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-700 animate-fade-in z-30"
                        >
                            <div className="px-4 sm:px-6 py-4">
                                {car && carMake && carModel && settings && (
                                    <div className="text-center text-gray-600 dark:text-gray-300 flex flex-col items-center justify-center gap-2">
                                        <span className="text-gray-800 dark:text-gray-200 whitespace-nowrap tracking-wide text-lg font-bold">
                                            {carMake.name_en.toUpperCase()} {carModel.name_en.toUpperCase()} &bull; {car.year}
                                        </span>
                                        {(() => {
                                            if (car.plate_number.startsWith('شاصي')) {
                                                return <span className="font-mono tracking-wider text-lg">{car.plate_number}</span>;
                                            }
                                            
                                            const parts = car.plate_number.split(' ');
                                            const arabicLetters = parts.filter(p => !/^\d+$/.test(p)).join('');
                                            const numbers = parts.find(p => /^\d+$/.test(p)) || '';

                                            const englishLetters = arabicLetters.split('').map(char => arToEnMap.get(char) || '?').join('');

                                            const formattedEnglish = englishLetters.split('').reverse().join(' ');
                                            const formattedArabic = arabicLetters.split('').join(' ');
                                            const formattedNumbers = numbers.split('').join(' ');

                                            return (
                                                <span className="font-mono tracking-wider text-xl">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{formattedArabic}</span>
                                                    <span className="text-slate-400 dark:text-slate-500 font-sans mx-2">•</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">{formattedEnglish}</span>
                                                    <span className="text-slate-400 dark:text-slate-500 font-sans mx-2">•</span>
                                                    <span className={`font-bold text-${primaryColorName}-600 dark:text-${primaryColorName}-400`}>{formattedNumbers}</span>
                                                </span>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {can('view_request_info') ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                            <div className="flex items-center gap-4">
                                <div className={`flex-shrink-0 bg-${primaryColorName}-100 dark:bg-${primaryColorName}-900/50 p-3 rounded-full`}>
                                    <Icon name="employee" className={`w-8 h-8 text-${primaryColorName}-600 dark:text-${primaryColorName}-400`} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">العميل</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{client?.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300" style={{direction: 'ltr', textAlign: 'right'}}>{formattedPhone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-right sm:text-left w-full sm:w-auto justify-end">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">السيارة</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{carMake?.name_ar} {carModel?.name_ar}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{car?.year}</p>
                                </div>
                                <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full">
                                    <Icon name="cars" className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 h-full content-center">
                            <div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <Icon name="report" className="w-5 h-5" />
                                    <span>اللوحة</span>
                                </div>
                                <div className="mt-2">
                                  {car && settings && <MiniPlateDisplay plateNumber={car.plate_number} settings={settings} />}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <Icon name="findings" className="w-5 h-5" />
                                    <span>نوع الفحص</span>
                                </div>
                                <p className={`mt-1 font-bold text-lg text-${primaryColorName}-600 dark:text-${primaryColorName}-400`}>{inspectionType?.name}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 bg-yellow-100 text-yellow-800 rounded-lg text-center dark:bg-yellow-900/50 dark:text-yellow-300 mb-6">
                    ليس لديك صلاحية عرض معلومات الطلب الأساسية.
                </div>
            )}
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
                <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-b dark:border-slate-700 p-2 rounded-t-2xl"><nav className="flex gap-2 overflow-x-auto">
                    
                    {visibleFindingCategories.map(category => {
                        const count = getCategoryCount(category.id);
                        return ( 
                            <button key={category.id} onClick={() => handleTabSwitch(category.id)} className={`flex items-center gap-2 whitespace-nowrap py-3 px-5 rounded-lg border-b-4 font-semibold text-lg transition-colors duration-200 ${activeTabId === category.id ? `border-${primaryColorName}-500 text-${primaryColorName}-600 dark:text-${primaryColorName}-400 bg-gray-50 dark:bg-slate-800` : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
                            <Icon name="findings" className="w-5 h-5"/> <span>{category.name}</span>
                            {count > 0 && (
                                <span className={`bg-${primaryColorName}-600 text-white text-xs font-semibold rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center`}>
                                    {count}
                                </span>
                            )}
                            </button>
                        );
                    })}
                    <button key="general-notes" onClick={() => handleTabSwitch('general-notes')} className={`flex items-center gap-2 whitespace-nowrap py-3 px-5 rounded-lg border-b-4 font-semibold text-lg transition-colors duration-200 ${activeTabId === 'general-notes' ? `border-${primaryColorName}-500 text-${primaryColorName}-600 dark:text-${primaryColorName}-400 bg-gray-50 dark:bg-slate-800` : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
                        <Icon name="document-report" className="w-5 h-5"/> <span>ملاحظات عامة</span>
                        {(generalNotesCount + generalMemosCount) > 0 && (
                            <span className={`bg-${primaryColorName}-600 text-white text-xs font-semibold rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center`}>
                                {generalNotesCount + generalMemosCount}
                            </span>
                        )}
                    </button>
                     <button key="gallery" onClick={() => handleTabSwitch('gallery')} className={`flex items-center gap-2 whitespace-nowrap py-3 px-5 rounded-lg border-b-4 font-semibold text-lg transition-colors duration-200 ${activeTabId === 'gallery' ? `border-${primaryColorName}-500 text-${primaryColorName}-600 dark:text-${primaryColorName}-400 bg-gray-50 dark:bg-slate-800` : 'border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700/50'}`}>
                        <Icon name="gallery" className="w-5 h-5"/> <span>معرض الصور</span>
                        {allImages.length > 0 && (
                            <span className={`bg-${primaryColorName}-600 text-white text-xs font-semibold rounded-full h-5 min-w-[1.25rem] px-1 flex items-center justify-center`}>
                                {allImages.length}
                            </span>
                        )}
                    </button>
                </nav></div>
                
                <div className="p-6">
                    {activeTabId === 'gallery' && (
                         <div key="gallery" className="animate-fade-in">
                            <ImageGallery images={allImages} onImageClick={openImagePreview} />
                        </div>
                    )}
                    {activeTabId === 'general-notes' && (
                        <div key="general-notes" className="animate-fade-in">
                            {renderVoiceMemos('general')}
                            <div className="bg-gray-100 dark:bg-slate-900/50 p-4 rounded-xl">
                                <LastNoteHint 
                                    note={generalNotes.length > 0 ? generalNotes[generalNotes.length - 1] : null}
                                    onClick={() => {
                                        const lastNote = generalNotes[generalNotes.length - 1];
                                        if (lastNote) scrollToNote(lastNote.id);
                                    }} 
                                />
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="flex-grow relative">
                                        <input type="text" ref={addNoteInputRef} placeholder="أضف ملاحظة عامة جديدة..." value={newGeneralNote.text} onChange={e => setNewGeneralNote(prev => ({ ...prev, text: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGeneralNote(); }}} className={`w-full p-3 border rounded-lg dark:bg-slate-700 dark:border-slate-600 pl-20 focus:ring-2 focus:ring-${primaryColorName}-500 transition disabled:cursor-not-allowed`} disabled={!can('manage_notes')} title={!can('manage_notes') ? 'صلاحية إدارة الملاحظات مطلوبة' : ''}/>
                                        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            {isSpeechRecognitionSupported && (
                                                <div className="relative">
                                                    <button type="button" onClick={() => handleToggleListening('general')} className={`p-1 text-gray-500 hover:text-${primaryColorName}-500 ${listeningTarget === 'general' ? 'text-red-500 animate-pulse' : ''}`} aria-label="إملاء صوتي" title={listeningTarget === 'general' ? 'إيقاف الإملاء' : 'بدء الإملاء'}>
                                                        <Icon name="microphone" className="w-5 h-5" />
                                                    </button>
                                                    {listeningTarget === 'general' && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded-md shadow-lg whitespace-nowrap animate-fade-in z-10">
                                                            جاري الاستماع...
                                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {newGeneralNote.text && (
                                                <button type="button" onClick={() => setNewGeneralNote(prev => ({...prev, text: ''}))} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="مسح النص" title="مسح النص">
                                                    <Icon name="close" className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative" ref={generalNoteDropdownRef}>
                                            <Button type="button" variant="secondary" onClick={() => setIsGeneralNoteDropdownOpen(prev => !prev)} disabled={!can('manage_notes')} className="px-3 py-2 flex items-center">
                                                <Icon name="camera" className="h-5 w-5 me-2" />
                                                <span>صورة</span>
                                                <Icon name="chevron-down" className="h-4 w-4 ms-1" />
                                            </Button>
                                            {isGeneralNoteDropdownOpen && (
                                                <div className="absolute bottom-full mb-2 w-48 bg-white dark:bg-slate-700 rounded-md shadow-lg border dark:border-slate-600 z-10 animate-fade-in">
                                                    <button type="button" onClick={() => { setCaptureTarget('general'); setIsCameraPageOpen(true); setIsGeneralNoteDropdownOpen(false); }} className="flex items-center gap-3 w-full text-right px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-t-md">
                                                        <Icon name="camera" className="w-5 h-5" />
                                                        <span>التقاط صورة</span>
                                                    </button>
                                                    <input type="file" className="hidden" accept="image/*" ref={generalNoteUploadInputRef} onChange={e => { handleImageChange(e, setNewGeneralNote, setNewGeneralNoteFile); setIsGeneralNoteDropdownOpen(false); }}/>
                                                    <button type="button" onClick={() => generalNoteUploadInputRef.current?.click()} className="flex items-center gap-3 w-full text-right px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-b-md">
                                                        <Icon name="gallery" className="w-5 h-5" />
                                                        <span>رفع من الجهاز</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {newGeneralNote.image && <div className="relative"><img src={newGeneralNote.image} className="h-10 w-10 object-cover rounded" onClick={() => openImagePreview(newGeneralNote.image!)} /><button onClick={() => { if (newGeneralNote.image) URL.revokeObjectURL(newGeneralNote.image); setNewGeneralNote(p => ({...p, image: null})); setNewGeneralNoteFile(null); }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs">&times;</button></div>}
                                        <Button onClick={handleAddGeneralNote} disabled={isUploading || !can('manage_notes')}>{isUploading ? '...' : 'إضافة'}</Button>
                                    </div>
                                </div>
                                {generalNotes.length > 0 && (
                                    <ul className="space-y-3 mt-4">
                                        {generalNotes.map((note) => {
                                            const isDeleting = deletingNoteIds.has(note.id);
                                            return (
                                            <li key={note.id} id={`note-${note.id}`} className={`relative flex justify-between items-start bg-white dark:bg-slate-700 p-3 border rounded-lg gap-3 animate-slide-in-down hover:shadow-lg hover:-translate-y-1 transform transition-all duration-300 ${isDeleting ? 'opacity-50' : ''}`}>
                                                <div className="flex items-start gap-3 flex-grow">{note.image && <img src={note.image} alt="صورة ملاحظة" className="w-16 h-16 object-cover rounded-md cursor-pointer border p-1" onClick={() => openImagePreview(note.image!)} />}<div className="flex-grow pt-1"><span>{note.text}</span>{note.authorName && <span className="block text-xs text-gray-500 mt-1">أضافها: {note.authorName}</span>}</div><StatusIndicator status={note.status} /></div>
                                                {can('manage_notes') && <div className="flex items-center gap-2 pt-1"><button onClick={() => openEditNoteModal(note, 'general')} disabled={isDeleting} className="text-yellow-500 hover:text-yellow-700 p-1"><Icon name="edit" className="w-5 h-5" /></button><button onClick={() => handleRemoveGeneralNote(note.id)} disabled={isDeleting} className="text-red-500 hover:text-red-700 p-1"><Icon name="delete" className="w-5 h-5" /></button></div>}
                                                {isDeleting && (
                                                    <div className="absolute inset-0 bg-white/70 dark:bg-slate-800/70 flex flex-col items-center justify-center rounded-lg z-10">
                                                        <RefreshCwIcon className="w-6 h-6 animate-spin text-slate-500" />
                                                        <span className="text-xs mt-2 text-slate-500 font-semibold">جاري الحذف...</span>
                                                    </div>
                                                )}
                                            </li>
                                        )})}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTabId !== 'general-notes' && activeTabId !== 'gallery' && renderFindingsForCategory(activeTabId)}
                </div>
            </div>
            
            <div className="fixed bottom-0 right-0 left-0 bg-white/80 dark:bg-slate-900/80 p-4 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] border-t dark:border-slate-700 z-30">
                <div className="container mx-auto flex justify-center items-center gap-2 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button variant="secondary" onClick={handleSave} className="p-2" title="حفظ مؤقت">
                            <Icon name="save" className="w-5 h-5" />
                        </Button>
                        
                        {can('view_activity_log') && (
                            <Button variant="secondary" onClick={() => setIsActivityDrawerOpen(true)} className="p-2 relative" title="سجل النشاط">
                                <Icon name="history" className="w-5 h-5" />
                                {activityLogCount > 0 && (
                                    <span className={`absolute -top-1.5 -right-1.5 bg-${primaryColorName}-600 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white dark:border-slate-900`}>
                                        {activityLogCount > 9 ? '9+' : activityLogCount}
                                    </span>
                                )}
                            </Button>
                        )}

                        {can('print_request') && (
                            <Button variant="secondary" onClick={handlePreviewAndPrint} leftIcon={<Icon name="print" className="w-5 h-5"/>}>
                                <span className="hidden sm:inline">معاينة وطباعة</span>
                            </Button>
                        )}

                        {can('change_request_status') && (
                            <div className="flex items-center gap-2 p-1 rounded-lg bg-gray-200 dark:bg-slate-700 transition-all duration-300">
                                <label htmlFor="completion-toggle" className="flex items-center cursor-pointer px-2 py-1">
                                    <div className="relative">
                                        <input id="completion-toggle" type="checkbox" className="sr-only" checked={isCompletionToggled} onChange={() => setIsCompletionToggled(!isCompletionToggled)} />
                                        <div className="block bg-gray-400 dark:bg-slate-600 w-10 h-5 rounded-full"></div>
                                        <div className={`dot absolute right-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${isCompletionToggled ? `-translate-x-5 bg-${primaryColorName}-500` : ''}`}></div>
                                    </div>
                                    <div className="mr-2 text-gray-700 dark:text-gray-200 font-semibold text-sm hidden sm:block">
                                        جاهز للإكمال؟
                                    </div>
                                </label>
                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isCompletionToggled ? 'max-w-xs' : 'max-w-0'}`}>
                                    <Button 
                                        onClick={handleComplete} 
                                        className="font-bold whitespace-nowrap animate-highlight"
                                        disabled={!isCompletionToggled}
                                    >
                                        <Icon name="check-circle" className="w-5 h-5" />
                                        <span className="mr-1 hidden sm:inline">تأكيد الإكمال</span>
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


             <Drawer
                isOpen={isActivityDrawerOpen}
                onClose={() => setIsActivityDrawerOpen(false)}
                title="سجل النشاط"
            >
                <div className={`relative border-r-2 border-gray-200 dark:border-slate-700 pr-8 space-y-8`}>
                     {activityLog.length > 0 ? (
                        activityLog.map(log => (
                            <div key={log.id} className="relative">
                                <div className={`absolute top-1 -right-[9px] w-4 h-4 bg-white dark:bg-slate-900 rounded-full border-2 border-${primaryColorName}-500`}></div>
                                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{log.employeeName}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                {log.action}: <span className="text-gray-700 dark:text-gray-300">{formatLogDetails(log.details)}</span>
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                    {log.imageUrl && (
                                        <img
                                            src={log.imageUrl}
                                            alt="صورة متعلقة بالنشاط"
                                            className="mt-3 w-24 h-24 object-cover rounded-md border p-1 dark:border-slate-600"
                                        />
                                    )}
                                </div>
                            </div>
                        ))
                     ) : (
                         <p className="text-gray-500 dark:text-gray-400">لا توجد أنشطة مسجلة لهذا الطلب بعد.</p>
                     )}
                </div>
            </Drawer>
            
            <Modal isOpen={isEditNoteModalOpen} onClose={() => setIsEditNoteModalOpen(false)} title="تعديل الملاحظة" size="lg">
                <div>
                    <textarea value={modalNoteData.text} onChange={e => setModalNoteData(p => ({...p, text: e.target.value}))}
                        className="w-full p-2 border rounded-md dark:bg-slate-900/50 dark:border-slate-600 text-md"
                        rows={4}
                    />
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">الصورة المرفقة</label>
                        <div className="flex items-center gap-4">
                            {modalNoteData.image && (
                                <div className="relative">
                                    <img src={modalNoteData.image} alt="معاينة" className="w-24 h-24 object-cover rounded-md border p-1 dark:border-slate-600" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (modalNoteData.image && modalNoteData.image.startsWith('blob:')) {
                                                URL.revokeObjectURL(modalNoteData.image);
                                            }
                                            setModalNoteData(p => ({ ...p, image: null }));
                                            setModalNoteFile(null);
                                        }}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 w-6 h-6 flex items-center justify-center"
                                    >
                                        <Icon name="close" className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <label className="cursor-pointer bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors font-semibold">
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async e => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const originalPreviewUrl = URL.createObjectURL(file);
                                            setModalNoteData(prev => {
                                                if (prev.image && prev.image.startsWith('blob:')) {
                                                    URL.revokeObjectURL(prev.image);
                                                }
                                                return { ...prev, image: originalPreviewUrl };
                                            });
                                            try {
                                                const compressedFile = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.7 });
                                                setModalNoteFile(compressedFile);
                                            } catch (error) {
                                                addNotification({ title: 'خطأ', message: 'فشل ضغط الصورة.', type: 'error' });
                                                setModalNoteFile(file);
                                            }
                                        }
                                        e.target.value = '';
                                    }}
                                />
                                {modalNoteData.image ? 'تغيير الصورة' : 'إضافة صورة'}
                            </label>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsEditNoteModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSaveEditedNote} disabled={isUploading}>
                        {isUploading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                    </Button>
                </div>
            </Modal>
            
            <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} size="4xl" title="معاينة الصورة">
                {previewImageUrl && <img src={previewImageUrl} alt="معاينة مكبرة" className="max-w-full max-h-[80vh] mx-auto" />}
            </Modal>
            
            <CameraPage 
                isOpen={isCameraPageOpen}
                onClose={() => setIsCameraPageOpen(false)}
                onCapture={handleCaptureComplete}
            />
        </div>
    );
};