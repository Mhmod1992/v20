import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import Modal from './Modal';
import Button from './Button';
import { useAppContext } from '../context/AppContext';
import Icon from './Icon';

interface CameraScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanComplete: (plateData: { letters: string, numbers: string }) => void;
}

const CameraScannerModal: React.FC<CameraScannerModalProps> = ({ isOpen, onClose, onScanComplete }) => {
    const { addNotification, settings } = useAppContext();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanLanguage, setScanLanguage] = useState<'ar' | 'en'>('ar');

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        const startCamera = async () => {
            if (isOpen) {
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
                    setError("لا يمكن الوصول إلى الكاميرا. يرجى التأكد من منح الصلاحية والمحاولة مرة أخرى.");
                    addNotification({ title: "خطأ في الكاميرا", message: "لا يمكن الوصول إلى الكاميرا.", type: 'error'});
                }
            } else {
                stopCamera();
            }
        };

        startCamera();

        return () => {
            stopCamera();
        };
    }, [isOpen, stopCamera, addNotification]);
    
    const handleCapture = async () => {
        if (!settings.geminiApiKey) {
            addNotification({
                title: 'مفتاح API مطلوب',
                message: 'الرجاء الانتقال إلى الإعدادات -> Gemini API لإضافة مفتاح أولاً.',
                type: 'error'
            });
            onClose();
            return;
        }

        if (!videoRef.current || !canvasRef.current) return;
        
        setIsLoading(true);
        setError(null);
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) {
            setError("لا يمكن الوصول إلى سياق الرسم.");
            setIsLoading(false);
            return;
        }

        // --- Smart Cropping & Compression Logic ---
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Define crop area based on the viewfinder (80% width, 40% height, centered)
        const cropWidth = videoWidth * 0.8;
        const cropHeight = videoHeight * 0.4;
        const cropX = (videoWidth - cropWidth) / 2;
        const cropY = (videoHeight - cropHeight) / 2;

        // Define output canvas size, maintaining aspect ratio and capping max dimension
        const MAX_DIMENSION = 800;
        let canvasWidth = cropWidth;
        let canvasHeight = cropHeight;

        if (canvasWidth > canvasHeight) {
            if (canvasWidth > MAX_DIMENSION) {
                canvasHeight = Math.round((canvasHeight * MAX_DIMENSION) / canvasWidth);
                canvasWidth = MAX_DIMENSION;
            }
        } else {
            if (canvasHeight > MAX_DIMENSION) {
                canvasWidth = Math.round((canvasWidth * MAX_DIMENSION) / canvasHeight);
                canvasHeight = MAX_DIMENSION;
            }
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        // Draw only the cropped and resized portion of the video frame onto the canvas
        context.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvasWidth, canvasHeight);

        const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        try {
            const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
            const imagePart = {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image,
                },
            };
            
            const prompt = scanLanguage === 'ar'
                ? `From the provided image of a Saudi Arabian license plate, extract only the Arabic letters and the numbers. Respond with the letters first, followed by a space, then the numbers. For example: "ب د ر 1453". If you cannot find any, respond with an empty string.`
                : `From the provided image of a Saudi Arabian license plate, extract only the English letters and the numbers. Respond with the letters first, followed by a space, then the numbers. For example: "B D R 1453". If you cannot find any, respond with an empty string.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: prompt }] },
            });

            const text = response.text.trim();
            
            if (!text) {
                onScanComplete({ letters: '', numbers: '' });
                return;
            }
            
            const textWithoutSpaces = text.replace(/\s+/g, '');
            let letters = '';
            let numbers = '';

            if (scanLanguage === 'ar') {
                letters = (textWithoutSpaces.match(/[\u0621-\u064A]+/g) || []).join('');
            } else {
                letters = (textWithoutSpaces.match(/[a-zA-Z]+/g) || []).join('').toUpperCase();
            }
            numbers = (textWithoutSpaces.match(/\d+/g) || []).join('');
            
            onScanComplete({ letters, numbers });
            
        } catch (apiError: any) {
            console.error("Gemini API error:", apiError);
            let userMessage = "فشل الاتصال في خدمة التعرف على النص.";
            let detailedError = "حدث خطأ غير متوقع أثناء تحليل الصورة.";
    
            if (apiError && apiError.message) {
                if (apiError.message.includes('API key not valid')) {
                    userMessage = "مفتاح API غير صالح.";
                    detailedError = "الرجاء مراجعة المفتاح المحفوظ في الإعدادات.";
                } else if (apiError.message.toLowerCase().includes('network') || apiError.message.includes('fetch failed')) {
                     userMessage = "مشكلة في الشبكة.";
                     detailedError = "تعذر الوصول إلى خوادم Gemini. قد تكون هناك مشكلة مؤقتة في الخدمة أو الشبكة.";
                } else if (apiError.message.includes('400')) { // Bad Request
                    userMessage = "طلب غير صالح.";
                    detailedError = "تم إرسال بيانات غير صالحة للخدمة. قد تكون الصورة كبيرة جداً أو غير واضحة.";
                } else if (apiError.message.includes('500')) { // Server Error
                     userMessage = "خطأ في الخادم.";
                     detailedError = "حدث خطأ في خوادم Gemini. الرجاء المحاولة مرة أخرى لاحقاً.";
                }
            }
            
            setError(`${detailedError} حاول مرة أخرى.`);
            addNotification({ title: "خطأ في التحليل", message: userMessage, type: 'error'});

        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="مسح لوحة السيارة" size="3xl">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                {error ? (
                    <div className="text-center text-white p-4">
                        <p className="font-semibold">حدث خطأ</p>
                        <p className="text-sm">{error}</p>
                    </div>
                ) : (
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                )}

                {/* Viewfinder overlay */}
                {!error && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-4/5 h-2/5 border-4 border-white/50 rounded-xl shadow-lg" style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}></div>
                    </div>
                )}
                
                {isLoading && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10">
                        <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="mt-4 text-lg font-semibold">جاري التعرف على اللوحة...</p>
                    </div>
                )}
                
                <canvas ref={canvasRef} className="hidden"></canvas>
            </div>
            <div className="mt-4 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">اختر لغة الأحرف على اللوحة:</p>
                <div className="inline-flex rounded-lg shadow-sm bg-slate-100 dark:bg-slate-700 p-1" role="group">
                    <button
                        type="button"
                        onClick={() => setScanLanguage('ar')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${scanLanguage === 'ar' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow' : 'text-slate-500 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800'}`}
                    >
                        حروف عربية
                    </button>
                    <button
                        type="button"
                        onClick={() => setScanLanguage('en')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${scanLanguage === 'en' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow' : 'text-slate-500 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800'}`}
                    >
                        حروف إنجليزية
                    </button>
                </div>
            </div>
            <div className="mt-4 flex justify-center">
                <Button onClick={handleCapture} disabled={isLoading || !!error} size="md" className="py-4 px-8 rounded-full text-lg">
                    <Icon name="camera" className="w-6 h-6"/>
                    <span className="ms-2">التقاط</span>
                </Button>
            </div>
        </Modal>
    );
};
export default CameraScannerModal;