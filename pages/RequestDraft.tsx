import React from 'react';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';
import Button from '../components/Button';
import CarOutline from '../components/CarOutline';

// This component contains only the content to be printed/displayed on the "paper".
const PrintablePage = ({ request, car, carMake, carModel, inspectionType }) => {
    const { settings } = useAppContext();
    
    const carDetails = React.useMemo(() => {
        if (request.car_snapshot) {
            return {
                makeNameEn: request.car_snapshot.make_en,
                modelNameEn: request.car_snapshot.model_en,
                year: request.car_snapshot.year,
            };
        }
        return {
            makeNameEn: carMake?.name_en || 'غير معروف',
            modelNameEn: carModel?.name_en || 'غير معروف',
            year: car.year,
        };
    }, [request.car_snapshot, car, carMake, carModel]);

    const renderPlate = () => {
        if (car.plate_number.startsWith('شاصي')) {
            return (
                <span className="font-semibold">{car.plate_number}</span>
            );
        }

        const parts = car.plate_number.split(' ').filter(Boolean);
        const arabicLetters = parts.filter(p => !/^\d+$/.test(p)).join('');
        const numbers = parts.find(p => /^\d+$/.test(p)) || '';

        const arToEnMap = new Map();
        settings.plateCharacters.forEach(pc => {
            arToEnMap.set(pc.ar.replace('ـ', ''), pc.en);
        });
        const englishLetters = arabicLetters.split('').map(char => arToEnMap.get(char) || char).join('');

        const formattedArabic = arabicLetters.split('').join(' ');
        const formattedEnglish = englishLetters.split('').reverse().join(' ');
        const formattedNumbers = numbers.split('').join(' ');

        return (
            <span className="inline-block border border-slate-400 dark:border-slate-500 rounded-md px-3 py-1 bg-white dark:bg-slate-700 shadow-sm">
                <span className="font-mono tracking-wider">
                    <span dir="rtl">{formattedArabic}</span>
                    <span className="mx-2 font-sans text-slate-300 dark:text-slate-600">·</span>
                    <span>{formattedEnglish}</span>
                    {numbers && <span className="mx-2 font-sans text-slate-300 dark:text-slate-600">·</span>}
                    {numbers && <span>{formattedNumbers}</span>}
                </span>
            </span>
        );
    };

    return (
        <div 
            className="printable-content bg-white dark:bg-slate-800 flex flex-col w-[210mm] min-h-[297mm] p-[15mm] box-border text-black"
        >
            <header className="relative flex flex-col items-center pb-4">
                <div className="relative w-full flex justify-center items-center">
                    <div className="absolute top-0 left-0 text-lg">
                        <div className="border border-black dark:border-slate-400 rounded px-3 py-2 text-center font-semibold">
                           <strong className="me-2">نوع الفحص:</strong>
                           <span>{inspectionType.name}</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <h1 className="text-4xl font-semibold text-slate-700 dark:text-slate-300 my-2">#{request.request_number}</h1>
                    </div>
                    <div className="absolute top-0 right-0 text-base">
                        <div className="flex flex-col items-end gap-y-1">
                            <div className="flex items-center gap-x-2">
                                <strong>التاريخ:</strong>
                                <span>{new Date(request.created_at).toLocaleDateString('en-GB')}</span>
                            </div>
                            <div className="flex items-center gap-x-2">
                                <strong>الوقت:</strong>
                                <span>{new Date(request.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full">
                    <div className="border-y-2 border-black dark:border-slate-400 py-3 flex justify-between items-baseline gap-4">
                        <div className="flex items-baseline gap-2">
                            <p className="text-xl font-bold">{`${carDetails.makeNameEn} ${carDetails.modelNameEn} ${carDetails.year}`}</p>
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 tracking-widest">Vehicle</p>
                        </div>
                        {renderPlate()}
                    </div>
                </div>
            </header>

            <section className="mt-4 flex-grow flex flex-col">
                <h2 className="text-xl font-bold mb-2">ملاحظات الفحص</h2>
                <div className="flex-grow p-2 lined-paper border border-gray-300 dark:border-slate-600 rounded-md">
                    {/* This div will have the lined background and will expand */}
                </div>
            </section>
        </div>
    );
};


const RequestDraft: React.FC = () => {
    const { 
        selectedRequestId, 
        requests, 
        clients, 
        cars, 
        carMakes, 
        carModels, 
        inspectionTypes, 
        setPage,
        goBack,
        shouldPrintDraft,
        setShouldPrintDraft
    } = useAppContext();

    React.useEffect(() => {
        if (shouldPrintDraft) {
            // Use a short timeout to ensure the content is fully rendered before printing
            const timer = setTimeout(() => {
                window.print();
                setShouldPrintDraft(false); // Reset the state after triggering print
                goBack(); // Go back after printing
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [shouldPrintDraft, setShouldPrintDraft, goBack]);

    const request = requests.find(r => r.id === selectedRequestId);
    
    // Data fetching from context
    const client = request ? clients.find(c => c.id === request.client_id) : undefined;
    const car = request ? cars.find(c => c.id === request.car_id) : undefined;
    const carModel = car ? carModels.find(m => m.id === car.model_id) : undefined;
    const carMake = car ? carMakes.find(m => m.id === car.make_id) : undefined;
    const inspectionType = request ? inspectionTypes.find(i => i.id === request.inspection_type_id) : undefined;

    if (!request || !client || !car || !inspectionType) {
        return (
             <div className="p-8 text-center">
                <p className="text-lg text-gray-700 dark:text-gray-300">جاري تحميل بيانات المسودة...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">إذا استمر هذا الخطأ، الرجاء العودة والمحاولة مرة أخرى.</p>
                <Button onClick={() => setPage('requests')} className="mt-4">
                    العودة للطلبات
                </Button>
            </div>
        );
    }
    
    const handlePrint = () => window.print();
    const handleStartFilling = () => setPage('fill-request');
    const handleBack = () => goBack();

    const pageData = { request, client, car, carMake, carModel, inspectionType };

    return (
        <div> {/* Neutral root element */}
            
            {/* Action Header (No Print) */}
            <div className="no-print sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                 <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        مسودة طلب فحص يدوي
                    </h2>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleBack} leftIcon={<Icon name="back" className="w-5 h-5 transform scale-x-[-1]" />}>
                           العودة
                        </Button>
                        <Button onClick={handleStartFilling} variant="secondary" leftIcon={<Icon name="edit" className="w-5 h-5" />}>
                           بدء التعبئة
                        </Button>
                        <Button onClick={handlePrint} leftIcon={<Icon name="print" className="w-5 h-5" />}>
                            طباعة
                        </Button>
                    </div>
                 </div>
            </div>

            {/* Print Styles */}
            <style type="text/css" media="print">
            {`
                @page {
                    size: A4;
                    margin: 0;
                }
                body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .print-container {
                    padding: 0;
                    margin: 0;
                    background: white;
                }
                .printable-content {
                    border: none !important;
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    width: 100%;
                    height: 100vh; /* Fill the page */
                    color: black !important;
                }
                .printable-content * {
                    color: black !important;
                    border-color: black !important;
                }
                .lined-paper {
                    background-image: linear-gradient(to bottom, transparent calc(2.5rem - 1px), #d1d5db calc(2.5rem - 1px)) !important;
                }
            `}
            </style>
            
            {/* Screen View (will be hidden on print) */}
            <div className="no-print py-8 bg-gray-200 dark:bg-gray-800 flex justify-center">
                 <div className="shadow-2xl">
                    <PrintablePage {...pageData} />
                </div>
            </div>

            {/* Print View (hidden on screen, visible on print) */}
            <div className="hidden print:block print-container">
                <PrintablePage {...pageData} />
            </div>
        </div>
    );
};
export default RequestDraft;