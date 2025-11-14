import React, { useMemo, useEffect, useRef } from 'react';
import { InspectionRequest, Client, Car, CarMake, CarModel, InspectionType, CustomFindingCategory, PredefinedFinding, Settings, Note, StructuredFinding, ReportSettings } from '../types';

interface InspectionReportProps {
    request: InspectionRequest;
    client: Client;
    car: Car;
    carMake?: CarMake;
    carModel?: CarModel;
    inspectionType: InspectionType;
    customFindingCategories: CustomFindingCategory[];
    // FIX: Changed type from 'PredefinedFindings' to 'PredefinedFinding' to resolve the type error.
    predefinedFindings: PredefinedFinding[];
    settings: Settings;
}

// Satisfy TS that this is on the window object from the script tag
declare const QRCodeStyling: any;

// --- SVG Icons (defined locally for simplicity) ---
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>;
const CarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM14.5 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" /><path fillRule="evenodd" d="M1.326 9.522a2.5 2.5 0 012.09-2.09l1.454-.363a2.5 2.5 0 012.383 1.13l.343.514a2.5 2.5 0 002.383.98l1.63-.272a2.5 2.5 0 012.632 2.632l-.272 1.63a2.5 2.5 0 00.98 2.383l.514.343a2.5 2.5 0 011.13 2.383l-.363 1.454a2.5 2.5 0 01-2.09 2.09l-1.454.363a2.5 2.5 0 01-2.383-1.13l-.343-.514a2.5 2.5 0 00-2.383-.98l-1.63.272a2.5 2.5 0 01-2.632-2.632l.272-1.63a2.5 2.5 0 00-.98-2.383l-.514-.343a2.5 2.5 0 01-1.13-2.383l.363-1.454z" clipRule="evenodd" /></svg>;
const DocumentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;


const ReportHeader: React.FC<{ appName: string; logoUrl: string | null; settings: ReportSettings; requestNumber: number; }> = ({ appName, logoUrl, settings, requestNumber }) => {
    const qrCodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!settings.showQrCode || !qrCodeRef.current || typeof QRCodeStyling === 'undefined') return;

        const content = (settings.qrCodeContent || '').replace('{request_number}', String(requestNumber));
        const size = parseInt(settings.qrCodeSize, 10) || 96;

        const qrCode = new QRCodeStyling({
            width: size,
            height: size,
            data: content,
            margin: 0,
            dotsOptions: {
                color: settings.qrCodeStyle?.color || '#000000',
                type: settings.qrCodeStyle?.dotsOptions?.style || 'square',
            },
            cornersSquareOptions: {
                color: settings.qrCodeStyle?.color || '#000000',
                type: settings.qrCodeStyle?.cornersSquareOptions?.style || 'square',
            },
            backgroundOptions: {
                color: 'transparent',
            },
        });
        
        // Clear previous QR code and append new one
        qrCodeRef.current.innerHTML = '';
        qrCode.append(qrCodeRef.current);

    }, [settings.showQrCode, settings.qrCodeContent, settings.qrCodeSize, settings.qrCodeStyle, requestNumber]);


    return (
        <header data-setting-section="colors-backgrounds" className={`flex justify-between items-start pb-4 mb-4 border-b-2 ${settings.qrCodePosition === 'right' ? 'flex-row-reverse' : ''}`} style={{ borderColor: settings.borderColor }}>
            <div className="text-right">
                <h1 data-setting-section="colors-primary" className="text-3xl font-bold" style={{ color: settings.appNameColor }}>{appName}</h1>
                <p className="mt-1" style={{ color: settings.textColor, opacity: 0.8 }}>تقرير فحص فني للسيارات</p>
            </div>
            <div className="flex items-center gap-4">
                {settings.showQrCode && (
                    <div data-setting-section="branding-qr" className="border flex items-center justify-center bg-white" style={{ borderColor: settings.borderColor, width: settings.qrCodeSize, height: settings.qrCodeSize }}>
                       <div ref={qrCodeRef} />
                    </div>
                )}
                {logoUrl && <img src={logoUrl} alt="Workshop Logo" className="h-24 w-auto max-w-[200px] object-contain" />}
            </div>
        </header>
    );
};


const DetailsSection: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <section className="details-section grid grid-cols-3 gap-4 mb-6 text-sm">
        {children}
    </section>
);

const InfoBlock: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; settings: ReportSettings; }> = ({ title, icon, children, settings }) => (
    <div data-setting-section="colors-backgrounds" className="info-block border rounded-lg p-3" style={{ borderColor: settings.borderColor }}>
        <h3 data-setting-section="colors-primary" className="text-sm font-bold flex items-center gap-2 mb-2 border-b pb-1" style={{ color: settings.primaryColor, borderColor: settings.borderColor }}>
            {icon}
            {title}
        </h3>
        <div className="space-y-1">{children}</div>
    </div>
);

const InfoPair: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between items-center gap-2">
        <span className="font-semibold whitespace-nowrap">{label}:</span>
        <div className="text-left">{value || '-'}</div>
    </div>
);

const FindingCategorySection: React.FC<{ title: string, children: React.ReactNode; settings: ReportSettings; }> = ({ title, children, settings }) => (
    <div data-setting-section="colors-backgrounds" className="finding-category mb-4 border rounded-lg overflow-hidden" style={{ borderColor: settings.borderColor }}>
        <h3 data-setting-section="colors-section-titles" className="text-xl font-bold p-2 text-center" style={{ backgroundColor: settings.findingsHeaderBackgroundColor, color: settings.findingsHeaderFontColor }}>{title}</h3>
        <div className="p-3" style={{
            backgroundColor: settings.findingContainerBackgroundColor,
        }}>
            {children}
        </div>
    </div>
);


const FindingItem: React.FC<{ finding: StructuredFinding; predefinedFinding?: PredefinedFinding; settings: ReportSettings; }> = ({ finding, predefinedFinding, settings }) => (
    <div data-setting-section="layout-cards" className="finding-item border rounded-lg text-center flex flex-col shadow-sm bg-white overflow-hidden" style={{ borderColor: settings.borderColor }}>
        {/* Image container - at the top */}
        <div className="h-36 bg-gray-50 flex items-center justify-center p-2 border-b" style={{ borderColor: settings.borderColor }}>
             {predefinedFinding?.reference_image ? (
                <img 
                    src={predefinedFinding.reference_image} 
                    alt={finding.findingName} 
                    className="max-w-full max-h-full object-contain"
                    style={{ objectPosition: predefinedFinding?.reference_image_position || 'center' }}
                />
            ) : (
                <span className="text-xs text-gray-400">لا توجد صورة</span>
            )}
        </div>
        
        {/* Name - in the middle */}
        <div className="p-3 flex-grow flex items-center justify-center">
             <h4 className="font-bold text-sm">{finding.findingName}</h4>
        </div>
        
        {/* Result - at the bottom */}
        {finding.value?.trim() && (
            <div className="bg-gray-100 p-2 font-semibold border-t" style={{ borderColor: settings.borderColor }}>
                <p className="text-sm">{finding.value}</p>
            </div>
        )}
    </div>
);


const ImageNoteCard: React.FC<{ note: Note; categoryName: string; settings: ReportSettings; }> = ({ note, categoryName, settings }) => {
    const sizeClasses = {
        small: 'aspect-[16/9]',
        medium: 'aspect-[4/3]',
        large: 'aspect-square',
    };
    const aspectClass = sizeClasses[settings.noteImageSize] || 'aspect-[4/3]';

    return (
        <div data-setting-section="layout-cards" className="image-note-card bg-white rounded-lg border shadow-sm flex flex-col" style={{ borderColor: settings.borderColor }}>
            {note.image && (
                <img 
                    src={note.image} 
                    alt="Note image" 
                    className={`object-cover w-full ${aspectClass}`}
                    style={{
                        borderBottom: `1px solid ${settings.noteImageBorderColor}`,
                    }}
                />
            )}
            <div className="p-3 flex-grow flex flex-col">
                <p className="text-xs font-bold mb-1" style={{ color: settings.primaryColor }}>
                    {categoryName}
                </p>
                <p className="text-sm flex-grow mb-2" style={{ color: settings.textColor }}>{note.text}</p>
                {note.authorName && (
                    <p className="text-xs font-semibold mt-auto pt-2 border-t" style={{ color: settings.textColor, opacity: 0.7, borderColor: settings.borderColor }}>
                       {note.authorName}
                    </p>
                )}
            </div>
        </div>
    );
};

const FormattedPlate: React.FC<{ plateNumber: string; settings: Settings }> = ({ plateNumber, settings }) => {

    const parts = plateNumber.split(' ').filter(Boolean);

    const arabicLettersRaw = parts.filter(p => !/^\d+$/.test(p)).join('');

    const englishNumbersRaw = parts.find(p => /^\d+$/.test(p)) || '';



    // Map Arabic to English characters

    const arToEnMap = new Map<string, string>();

    if (settings?.plateCharacters) {

        settings.plateCharacters.forEach(pc => {

            arToEnMap.set(pc.ar.replace('ـ', ''), pc.en); // Ensure mapping uses normalized Arabic chars

        });

    }



    const englishLettersMapped = arabicLettersRaw.split('').map(char => arToEnMap.get(char) || char).join('');



    const arabicLetters = arabicLettersRaw.split('');

    const englishLetters = englishLettersMapped.split('');

    const numbers = englishNumbersRaw.split('');



    return (

        // Set dir to rtl to ensure correct right-to-left layout for flex containers

        <div className="flex flex-row items-start gap-3" dir="rtl">

            {/* Letters Section - Appears on the right */}

            <div className="flex flex-row gap-1">

                {arabicLetters.map((arLetter, index) => (

                    <div key={index} className="flex flex-col items-center font-bold leading-none">

                        <span className="text-sm">{arLetter}</span>

                        <span className="font-sans text-[10px]">{englishLetters[index] || ''}</span>

                    </div>

                ))}

            </div>



            {/* Numbers Section - Appears on the left */}

            <div className="flex flex-row tracking-tight">

                {numbers.map((num, index) => (

                    <div key={index} className="flex flex-col items-center font-bold leading-none">

                        <span className="font-numeric text-sm">{num}</span>

                        <span className="font-numeric text-[10px]">{num}</span>

                    </div>

                ))}

            </div>

        </div>

    );

};


const InspectionReport = React.forwardRef<HTMLDivElement, InspectionReportProps>((props, ref) => {
    const { request, client, car, carMake, carModel, inspectionType, customFindingCategories, predefinedFindings, settings } = props;
    const { appName, logoUrl, reportSettings } = settings;

    const carDetails = useMemo(() => {
        if (request.car_snapshot) {
            return {
                makeNameEn: request.car_snapshot.make_en,
                modelNameEn: request.car_snapshot.model_en,
                makeNameAr: request.car_snapshot.make_ar,
                modelNameAr: request.car_snapshot.model_ar,
                year: request.car_snapshot.year,
            };
        }
        return {
            makeNameEn: carMake?.name_en || 'غير معروف',
            modelNameEn: carModel?.name_en || 'غير معروف',
            makeNameAr: carMake?.name_ar || 'غير معروف',
            modelNameAr: carModel?.name_ar || 'غير معروف',
            year: car.year,
        };
    }, [request.car_snapshot, car, carMake, carModel]);

    const visibleCategoryIds = inspectionType.finding_category_ids;
    
    const cardSizeClasses = {
        small: 'grid-cols-4',
        medium: 'grid-cols-3',
        large: 'grid-cols-2',
    };
    const gridClass = cardSizeClasses[reportSettings.findingCardSize] || 'grid-cols-3';

    const hasAnyFindings = useMemo(() => {
        const { structured_findings, general_notes, category_notes } = request;
        if (structured_findings && structured_findings.length > 0) return true;
        if (general_notes && general_notes.length > 0) return true;
        if (category_notes && Object.values(category_notes).some(notes => notes && (notes as Note[]).length > 0)) return true;
        return false;
    }, [request]);

    const allImageNotes = useMemo(() => {
        const collectedNotes: { note: Note; categoryName: string }[] = [];

        // From categories
        visibleCategoryIds.forEach(catId => {
            const category = customFindingCategories.find(c => c.id === catId);
            if (category) {
                const notesForCategory = (request.category_notes[catId] as Note[]) || [];
                const imageNotes = notesForCategory.filter(note => !!note.image);
                imageNotes.forEach(note => {
                    collectedNotes.push({ note, categoryName: category.name });
                });
            }
        });

        // From general notes
        const generalImageNotes = ((request.general_notes as Note[]) || []).filter(note => !!note.image);
        generalImageNotes.forEach(note => {
            collectedNotes.push({ note, categoryName: 'ملاحظات عامة' });
        });
        
        return collectedNotes;
    }, [request.category_notes, request.general_notes, visibleCategoryIds, customFindingCategories]);

    const generalTextOnlyNotes = ((request.general_notes as Note[]) || []).filter(note => !note.image);

    return (
        <div ref={ref} className="p-4 sm:p-6 print:p-0" dir="rtl" style={{
            backgroundColor: reportSettings.pageBackgroundColor,
            color: reportSettings.textColor,
            // @ts-ignore
            '--report-font-family': reportSettings.fontFamily,
            fontFamily: reportSettings.fontFamily,
            fontSize: reportSettings.baseFontSize,
        }}>
            <div className="report-header-section">
                <ReportHeader appName={appName} logoUrl={logoUrl} settings={reportSettings} requestNumber={request.request_number} />

                {reportSettings.headerCustomFields && reportSettings.headerCustomFields.length > 0 && (
                    <section data-setting-section="text-fields" className="header-custom-fields grid grid-cols-3 gap-x-4 gap-y-2 mb-4 p-2 border-b" style={{ borderColor: reportSettings.borderColor }}>
                        {reportSettings.headerCustomFields.map(field => (
                            <div key={field.id} className="text-sm">
                               <span className="font-semibold">{field.label}:</span> {field.value}
                            </div>
                        ))}
                    </section>
                )}
                
                <DetailsSection>
                    <InfoBlock title="بيانات العميل" icon={<UserIcon />} settings={reportSettings}>
                        <InfoPair label="الاسم" value={client.name} />
                        <InfoPair label="الجوال" value={client.phone} />
                    </InfoBlock>
                    <InfoBlock title="بيانات السيارة" icon={<CarIcon />} settings={reportSettings}>
                        <InfoPair 
                            label="النوع" 
                            value={
                                <>
                                    {`${carDetails.makeNameEn} ${carDetails.modelNameEn}`}
                                    <div className="text-xs" style={{ opacity: 0.7 }}>
                                        {`${carDetails.makeNameAr} ${carDetails.modelNameAr}`}
                                    </div>
                                </>
                            } 
                        />
                        <InfoPair label="الموديل" value={carDetails.year} />
                        <InfoPair 
                            label={car.plate_number.startsWith('شاصي') ? 'رقم الشاصي' : 'اللوحة'} 
                            value={
                                car.plate_number.startsWith('شاصي') 
                                ? <span className="font-mono tracking-wider">{car.plate_number.replace('شاصي ', '')}</span> 
                                : <FormattedPlate plateNumber={car.plate_number} settings={settings} />
                            }
                        />
                    </InfoBlock>
                    <InfoBlock title="بيانات الطلب" icon={<DocumentIcon />} settings={reportSettings}>
                         <InfoPair label="رقم التقرير" value={<strong>#{request.request_number}</strong>} />
                         <InfoPair label="التاريخ" value={new Date(request.created_at).toLocaleDateString('en-GB')} />
                         <InfoPair label="الوقت" value={new Date(request.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })} />
                         <InfoPair label="نوع الفحص" value={inspectionType.name} />
                    </InfoBlock>
                </DetailsSection>
            </div>

            {hasAnyFindings && (
                <div className="my-4">
                    <h2 data-setting-section="colors-section-titles" className="text-2xl font-bold text-center py-2 rounded-lg" style={{ backgroundColor: reportSettings.sectionTitleBackgroundColor, color: reportSettings.sectionTitleFontColor }}>
                        نتائج الفحص الفني
                    </h2>
                </div>
            )}
            
            {visibleCategoryIds.map(catId => {
                const category = customFindingCategories.find(c => c.id === catId);
                if (!category) return null;

                const findingsForCategory = request.structured_findings.filter(f => f.categoryId === catId);
                const textOnlyNotes = ((request.category_notes[catId] as Note[]) || []).filter(note => !note.image);

                if (findingsForCategory.length === 0 && textOnlyNotes.length === 0) return null;

                return (
                    <FindingCategorySection 
                        title={category.name} 
                        key={catId}
                        settings={reportSettings}
                    >
                        {findingsForCategory.length > 0 && (
                            <div className={`grid ${gridClass} gap-3`}>
                                {findingsForCategory.map(finding => {
                                    const predefined = predefinedFindings.find(pf => pf.id === finding.findingId);
                                    return <FindingItem key={finding.findingId} finding={finding} predefinedFinding={predefined} settings={reportSettings} />
                                })}
                            </div>
                        )}
                        
                        {textOnlyNotes.length > 0 && (
                            <div data-setting-section="text-disclaimer" className={`bg-white rounded-lg border p-3 shadow-sm ${findingsForCategory.length > 0 ? 'mt-4 pt-3 border-t' : ''}`} style={{ borderColor: reportSettings.borderColor }}>
                                <h4 className="font-bold text-sm mb-2" style={{ color: reportSettings.textColor, opacity: 0.9 }}>
                                    {findingsForCategory.length > 0 ? 'ملاحظات إضافية:' : 'ملاحظات:'}
                                </h4>
                                <ul className="space-y-1 list-disc list-inside pr-4">
                                    {textOnlyNotes.map(note => (
                                        <li key={note.id} className="text-sm" style={{ color: reportSettings.textColor }}>
                                            {note.text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </FindingCategorySection>
                );
            })}

            {generalTextOnlyNotes.length > 0 && (
                <FindingCategorySection 
                    title="ملاحظات عامة"
                    settings={reportSettings}
                >
                    <div data-setting-section="text-disclaimer" className="bg-white rounded-lg border p-3 shadow-sm" style={{ borderColor: reportSettings.borderColor }}>
                        <h4 className="font-bold text-sm mb-2" style={{ color: reportSettings.textColor, opacity: 0.9 }}>
                            {request.structured_findings.length > 0 ? 'ملاحظات إضافية:' : 'ملاحظات:'}
                        </h4>
                        <ul className="space-y-1 list-disc list-inside pr-4">
                            {generalTextOnlyNotes.map(note => (
                                <li key={note.id} className="text-sm" style={{ color: reportSettings.textColor }}>
                                    {note.text}
                                    </li>
                            ))}
                        </ul>
                    </div>
                </FindingCategorySection>
            )}
            
            {allImageNotes.length > 0 && (
                <FindingCategorySection 
                    title="الصور والملاحظات المرفقة"
                    settings={reportSettings}
                >
                    <div className="grid grid-cols-3 gap-3">
                        {allImageNotes.map(({ note, categoryName }) => (
                            <ImageNoteCard key={note.id} note={note} categoryName={categoryName} settings={reportSettings} />
                        ))}
                    </div>
                </FindingCategorySection>
            )}

            <footer className="border-t-2 text-xs space-y-4 mt-4 pt-4" style={{ borderColor: reportSettings.borderColor, color: reportSettings.textColor, opacity: 0.8 }}>
                 <p data-setting-section="text-disclaimer">
                    <span className="font-bold">إخلاء مسؤولية:</span> {reportSettings.disclaimerText}
                </p>
                <div className="flex justify-end items-end">
                     <div data-setting-section="branding-stamp" className="text-center">
                        <p className="font-bold">ختم الورشة</p>
                        {reportSettings.workshopStampUrl ? (
                            <img src={reportSettings.workshopStampUrl} alt="ختم الورشة" className="w-24 h-24 object-contain mt-1" />
                        ) : (
                            <div className="w-24 h-24 border-2 border-dashed mt-1" style={{ borderColor: reportSettings.borderColor, opacity: 0.5 }}></div>
                        )}
                    </div>
                </div>
            </footer>
             {reportSettings.showPageNumbers && (
                <div className="page-footer-container"></div>
             )}
        </div>
    );
});

export default InspectionReport;