import React, { useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import InspectionReport from '../components/InspectionReport';
import Icon from '../components/Icon';
import Button from '../components/Button';
import WhatsappIcon from '../components/icons/WhatsappIcon';

// A robust script loader that tries a primary URL and falls back to a secondary URL.
const loadScript = (primaryUrl: string, fallbackUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = primaryUrl;
        script.onload = () => resolve();
        script.onerror = () => {
            console.warn(`Failed to load script from ${primaryUrl}. Trying fallback...`);
            const fallbackScript = document.createElement('script');
            fallbackScript.src = fallbackUrl;
            fallbackScript.onload = () => resolve();
            fallbackScript.onerror = () => reject(new Error(`Failed to load script from both primary and fallback URLs.`));
            document.head.appendChild(fallbackScript);
        };
        document.head.appendChild(script);
    });
};


const PrintReport: React.FC = () => {
    const { 
        selectedRequestId, requests, clients, cars, carMakes, 
        carModels, inspectionTypes, setPage, predefinedFindings, 
        customFindingCategories, settings, addNotification, goBack 
    } = useAppContext();

    const reportRef = useRef<HTMLDivElement>(null);
    const request = requests.find(r => r.id === selectedRequestId);
    const client = request ? clients.find(c => c.id === request.client_id) : undefined;
    const car = request ? cars.find(c => c.id === request.car_id) : undefined;
    const carModel = car ? carModels.find(m => m.id === car.model_id) : undefined;
    const carMake = car ? carMakes.find(m => m.id === car.make_id) : undefined;
    const inspectionType = request ? inspectionTypes.find(i => i.id === request.inspection_type_id) : undefined;


    const handlePrint = () => {
        window.print();
    };
    
    const generatePdfInstance = async () => {
        const reportElement = reportRef.current;
        if (!reportElement) return null;
        
        try {
            // Check if libraries are already loaded. If not, load them dynamically with fallbacks.
            if (typeof (window as any).jspdf === 'undefined' || typeof (window as any).html2canvas === 'undefined') {
                await Promise.all([
                    (window as any).jspdf ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'),
                    (window as any).html2canvas ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')
                ]);
            }
            
            // Final check to ensure libraries are now available
            if (typeof (window as any).jspdf === 'undefined' || typeof (window as any).html2canvas === 'undefined') {
                throw new Error("PDF libraries could not be loaded.");
            }

            await document.fonts.ready;

            const canvas = await (window as any).html2canvas(reportElement, {
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                scale: 2,
            });
            
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = (window as any).jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasHeight / canvasWidth;
            const imgHeight = pdfWidth * ratio;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            return pdf;
        } catch(e) {
            console.error("PDF Generation Error:", e);
            addNotification({ title: 'خطأ', message: 'حدث خطأ أثناء تحميل أو توليد الملف. الرجاء التأكد من اتصالك بالإنترنت والمحاولة مرة أخرى.', type: 'error'});
            return null;
        }
    };

    const handleWhatsAppShare = async () => {
        if (!navigator.share) {
            addNotification({
                title: 'غير مدعوم',
                message: 'متصفحك لا يدعم مشاركة الملفات مباشرة. حاول تحميل الملف ثم مشاركته.',
                type: 'info'
            });
            return;
        }

        const spinner = document.createElement('div');
        spinner.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; color: white; font-size: 1.5rem;">جاري تجهيز الملف للمشاركة...</div>`;
        document.body.appendChild(spinner);

        try {
            const pdf = await generatePdfInstance();
            if (pdf) {
                const blob = pdf.output('blob');
                const file = new File([blob], `report-${request?.request_number || 'inspection'}.pdf`, { type: 'application/pdf' });
                const shareData = {
                    files: [file],
                    title: `تقرير فحص رقم ${request?.request_number}`,
                    text: `تقرير فحص سيارة: ${carMake?.name_ar || request?.car_snapshot?.make_ar} ${carModel?.name_ar || request?.car_snapshot?.model_ar}`,
                };

                if (navigator.canShare && navigator.canShare(shareData)) {
                    await navigator.share(shareData);
                } else {
                    addNotification({ title: 'خطأ', message: 'لا يمكن مشاركة هذا الملف.', type: 'error' });
                }
            }
        } catch (error) {
            if ((error as Error).name !== 'AbortError') { // Ignore user cancellation
                console.error('Error sharing:', error);
                addNotification({ title: 'خطأ', message: 'فشلت عملية المشاركة.', type: 'error' });
            }
        } finally {
            if (document.body.contains(spinner)) {
                document.body.removeChild(spinner);
            }
        }
    };

    const handleDownloadPdf = async () => {
        const spinner = document.createElement('div');
        spinner.innerHTML = `<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999; color: white; font-size: 1.5rem;">جاري توليد الملف...</div>`;
        document.body.appendChild(spinner);
        
        try {
            const pdf = await generatePdfInstance();
            if (pdf) {
                pdf.save(`report-${request?.request_number || 'inspection'}.pdf`);
            }
        } finally {
            if (document.body.contains(spinner)) {
                document.body.removeChild(spinner);
            }
        }
    };

    if (!request) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                <p className="text-xl text-gray-700 dark:text-gray-300 mb-4">لم يتم العثور على الطلب المحدد.</p>
                <Button onClick={() => setPage('requests')}>العودة إلى قائمة الطلبات</Button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-900 min-h-screen">
            <header className="no-print bg-white dark:bg-slate-800 p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-xl font-bold">معاينة التقرير</h2>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={goBack}>
                        <Icon name="back" className="w-5 h-5 transform scale-x-[-1]" />
                        <span className="hidden sm:inline ms-2">العودة</span>
                    </Button>
                    <Button onClick={handleWhatsAppShare} variant="whatsapp">
                        <WhatsappIcon className="w-5 h-5" />
                        <span className="hidden sm:inline ms-2">مشاركة واتساب</span>
                    </Button>
                     <Button variant="secondary" onClick={handlePrint}>
                        <Icon name="print" className="w-5 h-5" />
                        <span className="hidden sm:inline ms-2">طباعة</span>
                    </Button>
                    <Button onClick={handleDownloadPdf}>
                        <Icon name="document-report" className="w-5 h-5" />
                        <span className="hidden sm:inline ms-2">تحميل PDF</span>
                    </Button>
                </div>
            </header>
            <main className="py-4 sm:py-8 flex justify-center print-container print:py-0 print:sm:py-0">
                <div className="report-wrapper max-w-[190mm] w-full bg-white shadow-lg print:shadow-none">
                    { client && car && inspectionType ?
                        <InspectionReport
                            ref={reportRef}
                            request={request}
                            client={client}
                            car={car}
                            carMake={carMake}
                            carModel={carModel}
                            inspectionType={inspectionType}
                            customFindingCategories={customFindingCategories}
                            predefinedFindings={predefinedFindings}
                            settings={settings}
                        />
                         : <div className="p-8 text-center">جاري تحميل بيانات التقرير...</div>
                    }
                </div>
            </main>
        </div>
    );
};

export default PrintReport;