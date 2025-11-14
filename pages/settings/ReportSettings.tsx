import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ReportSettings, Client, Car, CarMake, CarModel, InspectionType, CustomFindingCategory, PredefinedFinding, InspectionRequest, PaymentType, RequestStatus, CustomReportTemplate } from '../../types';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import InspectionReport from '../../components/InspectionReport';
import { compressImageToBase64, uuidv4 } from '../../lib/utils';
import ChevronDownIcon from '../../components/icons/ChevronDownIcon';
import Modal from '../../components/Modal';
import { GoogleGenAI, Type } from "@google/genai";


// --- Helper Components ---
const PRESET_COLORS = ['#ffffff', '#f1f5f9', '#e2e8f0', '#94a3b8', '#475569', '#1e293b', '#fef2f2', '#ef4444', '#dc2626', '#b91c1c', '#e0f2fe', '#3b82f6', '#2563eb', '#1e40af', '#f0fdfa', '#14b8a6', '#0d9488', '#134e4a', '#fefce8', '#eab308', '#ca8a04', '#a16207', '#eef2ff', '#6366f1', '#4f46e5', '#3730a3'];
const ColorInput: React.FC<{ label: string; value: string; onChange: (color: string) => void }> = ({ label, value, onChange }) => {
    const safeValue = value || '';
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <div className="mt-1 flex items-stretch p-1 border rounded-md dark:border-slate-600 bg-white dark:bg-slate-700 focus-within:ring-2 focus-within:ring-blue-500">
                <input type="color" value={safeValue} onChange={e => onChange(e.target.value)} className="w-10 h-8 p-0 border-none cursor-pointer bg-transparent"/>
                <input type="text" value={safeValue} onChange={e => onChange(e.target.value)} className="w-full px-2 bg-transparent dark:text-slate-200 focus:outline-none" placeholder="#aabbcc"/>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">{PRESET_COLORS.map(color => ( <button key={color} type="button" onClick={() => onChange(color)} className={`w-5 h-5 rounded-full border dark:border-slate-600 ${safeValue.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-offset-1 dark:ring-offset-slate-800 ring-blue-500' : ''}`} style={{ backgroundColor: color }} />))}</div>
        </div>
    );
};

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b dark:border-slate-700 last:border-b-0">
            <button
                type="button"
                className="flex justify-between items-center w-full py-3 px-1 text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
                className={`grid transition-all duration-500 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <div className="pt-2 pb-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Built-in Presets ---
const builtInPresets: { name: string; description: string; settings: Partial<ReportSettings> }[] = [
    { name: 'Aero', description: 'تصميم عصري وحيوي باللون الأزرق.', settings: { primaryColor: '#3b82f6', appNameColor: '#2563eb', sectionTitleBackgroundColor: '#e0f2fe', sectionTitleFontColor: '#0369a1', findingsHeaderBackgroundColor: '#2563eb', findingContainerBackgroundColor: '#f8fafc' } },
    { name: 'Classic', description: 'تصميم أنيق باللون الأخضر المائل للزرقة.', settings: { primaryColor: '#14b8a6', appNameColor: '#0d9488', sectionTitleBackgroundColor: '#f0fdfa', sectionTitleFontColor: '#134e4a', findingsHeaderBackgroundColor: '#0d9488', findingContainerBackgroundColor: '#f0fdfa' } },
    { name: 'Glass', description: 'تصميم زجاجي شفاف مع تأثير بنفسجي.', settings: { primaryColor: '#6366f1', appNameColor: '#4f46e5', sectionTitleBackgroundColor: '#eef2ff', sectionTitleFontColor: '#3730a3', findingsHeaderBackgroundColor: '#4f46e5', findingContainerBackgroundColor: '#eef2ff' } },
    { name: 'Night Sky', description: 'تصميم داكن وأنيق بألوان هادئة.', settings: { pageBackgroundColor: '#111827', textColor: '#d1d5db', primaryColor: '#818cf8', appNameColor: '#a78bfa', borderColor: '#374151', sectionTitleBackgroundColor: '#1f2937', sectionTitleFontColor: '#c7d2fe', findingsHeaderBackgroundColor: '#3730a3', findingContainerBackgroundColor: '#1f2937' } },
    { name: 'Professional', description: 'تصميم بسيط واحترافي بخطوط واضحة.', settings: { pageBackgroundColor: '#ffffff', textColor: '#1f2937', primaryColor: '#0ea5e9', appNameColor: '#0284c7', borderColor: '#e5e7eb', sectionTitleBackgroundColor: '#f0f9ff', sectionTitleFontColor: '#0369a1', fontFamily: "'Inter', sans-serif", findingsHeaderBackgroundColor: '#0ea5e9', findingContainerBackgroundColor: '#f9fafb' } },
    { name: 'Vintage', description: 'تصميم كلاسيكي دافئ بألوان ترابية.', settings: { pageBackgroundColor: '#fdf6e3', textColor: '#586e75', primaryColor: '#cb4b16', appNameColor: '#b58900', borderColor: '#d1c7a8', sectionTitleBackgroundColor: '#eee8d5', sectionTitleFontColor: '#657b83', fontFamily: "'Amiri', serif", findingsHeaderBackgroundColor: '#b58900', findingContainerBackgroundColor: '#fdf6e3' } },
];

type Tab = 'templates' | 'colors' | 'layout' | 'text' | 'branding';

const ReportSettingsPage: React.FC = () => {
    const { settings, updateSettings, addNotification, showConfirmModal, setPage, setSettingsPage } = useAppContext();
    const [reportSettings, setReportSettings] = useState<ReportSettings>(settings.reportSettings);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    
    // AI Assistant State
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const [activeTab, setActiveTab] = useState<Tab>('templates');
    const [activeSubTab, setActiveSubTab] = useState<'templates' | 'ai'>('templates');

    const availableFonts = [ 
        { name: 'Tajawal (افتراضي)', value: "'Tajawal', sans-serif" }, 
        { name: 'Cairo', value: "'Cairo', sans-serif" }, 
        { name: 'Noto Sans Arabic', value: "'Noto Sans Arabic', sans-serif" },
        { name: 'Amiri', value: "'Amiri', serif" },
        { name: 'Lalezar', value: "'Lalezar', cursive" },
        { name: 'Markazi Text', value: "'Markazi Text', serif" },
    ];

    useEffect(() => { setReportSettings(settings.reportSettings); }, [settings.reportSettings]);

    const handleSettingChange = (key: keyof ReportSettings, value: any) => { setReportSettings(prev => ({ ...prev, [key]: value })); };
    const handleQrStyleChange = (key: 'dotsOptions' | 'cornersSquareOptions' | 'color', value: any) => {
        setReportSettings(prev => ({
            ...prev,
            qrCodeStyle: {
                ...prev.qrCodeStyle,
                [key]: value
            }
        }));
    };

    const handleGenerateDesign = async (prompt?: string) => {
        if (!settings.geminiApiKey) {
            addNotification({ title: 'مفتاح API مطلوب', message: 'لاستخدام مساعد التصميم، يرجى إضافة مفتاح Gemini API في تبويب "Gemini API".', type: 'error' });
            setSettingsPage('api');
            return;
        }
        if (!prompt) {
             addNotification({ title: 'مطلوب وصف', message: 'الرجاء كتابة وصف للتصميم الذي تريده.', type: 'info' });
            return;
        }

        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
            
            const schema = {
                type: Type.OBJECT,
                properties: {
                    primaryColor: { type: Type.STRING, description: "Hex code for the main accent color (links, icons)." },
                    appNameColor: { type: Type.STRING, description: "Hex code for the workshop name in the header." },
                    sectionTitleBackgroundColor: { type: Type.STRING, description: "Hex code for the background of secondary titles like 'Inspection Results'." },
                    sectionTitleFontColor: { type: Type.STRING, description: "Hex code for the text of secondary titles." },
                    findingsHeaderBackgroundColor: { type: Type.STRING, description: "Hex code for the background of main category headers like 'Exterior Body'." },
                    findingsHeaderFontColor: { type: Type.STRING, description: "Hex code for the text of main category headers." },
                    pageBackgroundColor: { type: Type.STRING, description: "Hex code for the overall page background." },
                    textColor: { type: Type.STRING, description: "Hex code for main paragraphs and details." },
                    borderColor: { type: Type.STRING, description: "Hex code for borders and separators." },
                    findingContainerBackgroundColor: { type: Type.STRING, description: "Hex code for the background area containing finding items." },
                    fontFamily: { type: Type.STRING, description: "The CSS font-family string. Choose one from the provided list that best fits the theme.", enum: availableFonts.map(f => f.value) },
                    findingCardSize: { type: Type.STRING, description: "Size of the finding cards. 'small' fits more per row, 'large' fits fewer.", enum: ['small', 'medium', 'large'] },
                    noteImageSize: { type: Type.STRING, description: "Aspect ratio for note images. 'small' is wide, 'medium' is standard, 'large' is square.", enum: ['small', 'medium', 'large'] },
                    noteImageBorderRadius: { type: Type.STRING, description: "The corner roundness for note images. '0rem' is sharp, '0.75rem' is very round.", enum: ['0rem', '0.25rem', '0.5rem', '0.75rem'] },
                },
                required: ["primaryColor", "appNameColor", "sectionTitleBackgroundColor", "sectionTitleFontColor", "findingsHeaderBackgroundColor", "findingsHeaderFontColor", "pageBackgroundColor", "textColor", "borderColor", "findingContainerBackgroundColor", "fontFamily", "findingCardSize", "noteImageSize", "noteImageBorderRadius"]
            };

            const systemInstruction = "You are an expert UI/UX designer specializing in creating professional and visually appealing reports. Generate a complete and harmonious design theme for a car inspection report based on the user's description. This includes selecting a full color palette, choosing an appropriate font from the provided list, and deciding on layout elements like card sizes and image styles. YOU MUST return all values as a valid JSON object matching the provided schema. Ensure excellent contrast and readability. Do not include any explanatory text, only the JSON object.";
            
            const finalPrompt = prompt === 'random' 
                ? "Generate a completely new, creative, and professional design for a car inspection report. Be unique and ensure the design is clean and readable."
                : `Generate a complete report design based on this theme: "${prompt}"`;
                
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: finalPrompt,
                config: { responseMimeType: "application/json", responseSchema: schema, systemInstruction: systemInstruction },
            });

            const generatedDesign = JSON.parse(response.text);
            setReportSettings(prev => ({ ...prev, ...generatedDesign }));
            addNotification({ title: 'نجاح!', message: 'تم إنشاء وتطبيق التصميم الجديد.', type: 'success' });

        } catch (error) {
            console.error("Gemini design generation error:", error);
            addNotification({ title: 'خطأ', message: 'فشل إنشاء التصميم. يرجى المحاولة مرة أخرى أو التأكد من صحة مفتاح API.', type: 'error' });
        } finally {
            setIsGenerating(false);
        }
    };


    const applyPreset = (presetSettings: Partial<ReportSettings>) => setReportSettings(prev => ({ ...prev, ...presetSettings }));
    const applyCustomTemplate = (template: CustomReportTemplate) => setReportSettings(template.settings);

    const handleOpenSaveModal = () => {
        setNewTemplateName('');
        setIsSaveModalOpen(true);
    };

    const handleSaveCustomTemplate = async () => {
        if (!newTemplateName.trim()) {
            addNotification({ title: 'خطأ', message: 'الرجاء إدخال اسم للقالب.', type: 'error' });
            return;
        }
        const newTemplate: CustomReportTemplate = {
            id: uuidv4(),
            name: newTemplateName.trim(),
            settings: reportSettings,
        };
        try {
            await updateSettings({ customReportTemplates: [...settings.customReportTemplates, newTemplate] });
            addNotification({ title: 'نجاح', message: `تم حفظ قالب "${newTemplate.name}"`, type: 'success' });
            setIsSaveModalOpen(false);
        } catch (error) {
            console.error('Failed to save custom template', error);
        }
    };

    const handleDeleteCustomTemplate = (id: string) => {
        showConfirmModal({
            title: 'حذف القالب',
            message: 'هل أنت متأكد من حذف هذا القالب المخصص؟',
            onConfirm: async () => {
                try {
                    await updateSettings({ customReportTemplates: settings.customReportTemplates.filter(t => t.id !== id) });
                    addNotification({ title: 'نجاح', message: 'تم حذف القالب.', type: 'success' });
                } catch (error) {
                    console.error('Failed to delete custom template', error);
                }
            }
        });
    };
    
    const handleSave = async () => {
        try {
            await updateSettings({ reportSettings });
            addNotification({ title: 'نجاح', message: 'تم حفظ إعدادات التقرير بنجاح!', type: 'success' });
        } catch (error) { console.error('Failed to save report settings', error); }
    };

    const handleCustomFieldChange = (id: string, key: 'label' | 'value', text: string) => { handleSettingChange('headerCustomFields', reportSettings.headerCustomFields.map(f => f.id === id ? { ...f, [key]: text } : f)); };
    const addCustomField = () => { handleSettingChange('headerCustomFields', [...(reportSettings.headerCustomFields || []), { id: uuidv4(), label: 'عنوان جديد', value: 'قيمة جديدة' }]); };
    const removeCustomField = (id: string) => { handleSettingChange('headerCustomFields', reportSettings.headerCustomFields.filter(f => f.id !== id)); };
    
    const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const dataUrl = await compressImageToBase64(file, { maxWidth: 200, maxHeight: 200, quality: 0.8 });
                handleSettingChange('workshopStampUrl', dataUrl);
            } catch (error) {
                 addNotification({ title: 'خطأ', message: 'فشل ضغط الصورة.', type: 'error' });
            }
        }
    };
    
    const getSubTabClasses = (tabName: 'templates' | 'ai') => {
        const isActive = activeSubTab === tabName;
        const base = 'pb-3 px-1 border-b-2 font-medium text-md focus:outline-none whitespace-nowrap';
        if (isActive) {
            return `${base} border-blue-500 text-blue-600 dark:text-blue-400`;
        }
        return `${base} border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600`;
    };

    const navItems: { id: Tab; name: string; icon: any }[] = [
        { id: 'templates', name: 'القوالب و AI', icon: 'sparkles' },
        { id: 'colors', name: 'الألوان', icon: 'appearance' },
        { id: 'layout', name: 'التنسيق والهيكل', icon: 'document-report' },
        { id: 'text', name: 'النصوص والحقول', icon: 'edit' },
        { id: 'branding', name: 'الهوية والرمز', icon: 'scan-plate' },
    ];

    // --- Mock Data for Preview ---
    const fullSettingsForPreview = useMemo(() => ({
        ...settings,
        reportSettings: reportSettings,
    }), [settings, reportSettings]);
    const mockClient: Client = { id: 'mock-client', name: 'اسم العميل', phone: '0501234567' };
    const mockCarMake: CarMake = { id: 'mock-make', name_ar: 'تويوتا', name_en: 'Toyota' };
    const mockCarModel: CarModel = { id: 'mock-model', make_id: 'mock-make', name_ar: 'كامري', name_en: 'Camry' };
    const mockCar: Car = { id: 'mock-car', make_id: 'mock-make', model_id: 'mock-model', year: 2023, plate_number: 'أ ب ج 1234' };
    const mockCategories: CustomFindingCategory[] = [{ id: 'cat-body', name: 'البودي الخارجي' },{ id: 'cat-notes', name: 'الصور والملاحظات المرفقة' },{ id: 'cat-general', name: 'ملاحظات عامة' },];
    const mockFindings: PredefinedFinding[] = [{ id: 'find-bumper', name: 'الصدام الأمامي', category_id: 'cat-body', options: ['سليم', 'مرشوش'], reference_image: 'https://i.ibb.co/68qB5s2/front-bumper.jpg' },{ id: 'find-hood', name: 'الكبوت', category_id: 'cat-body', options: ['سليم', 'تعديل'], reference_image: 'https://i.ibb.co/Xz9dK2B/hood.jpg' },];
    const mockInspectionType: InspectionType = { id: 'mock-type', name: 'فحص كامل', price: 350, finding_category_ids: ['cat-body', 'cat-notes', 'cat-general'] };
    const mockRequest: InspectionRequest = { id: 'mock-req', request_number: 1001, client_id: 'mock-client', car_id: 'mock-car', inspection_type_id: 'mock-type', payment_type: PaymentType.Cash, price: 350, status: RequestStatus.COMPLETE, created_at: new Date().toISOString(), employee_id: 'mock-emp', inspection_data: {}, structured_findings: [{ findingId: 'find-bumper', findingName: 'الصدام الأمامي', value: 'مرشوش', categoryId: 'cat-body' },{ findingId: 'find-hood', findingName: 'الكبوت', value: 'سليم', categoryId: 'cat-body' },], general_notes: [{ id: 'gn-1', text: 'هذه معاينة للملاحظات النصية في التقرير.', authorId: 'mock-author', authorName: 'موظف' }], category_notes: { 'cat-notes': [{ id: 'cn-1', text: 'خدش على الباب الأيمن.', authorId: 'mock-author', authorName: 'موظف', image: 'https://i.ibb.co/68qB5s2/front-bumper.jpg' },]}, activity_log: [], attached_files: [], };
    
    return (
        <div className="animate-fade-in">
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Settings Panel */}
                <div className="lg:col-span-1 flex flex-col lg:h-[calc(100vh-220px)]">
                    <div className="flex flex-col border-r dark:border-slate-700 h-full">
                        {/* Tab Navigation */}
                        <div className="flex-shrink-0 px-4">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`flex items-center gap-3 w-full text-right p-3 my-1 rounded-lg text-md font-semibold transition-colors ${activeTab === item.id ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                                >
                                    <Icon name={item.icon} className="w-5 h-5" />
                                    <span>{item.name}</span>
                                </button>
                            ))}
                        </div>
                        {/* Save Button */}
                        <div className="mt-auto p-4 border-t dark:border-slate-700">
                             <Button onClick={handleSave} leftIcon={<Icon name="save" className="w-5 h-5"/>} className="w-full">حفظ التغييرات</Button>
                        </div>
                    </div>
                </div>

                {/* Tab Content Panel */}
                <div className="lg:col-span-2 lg:h-[calc(100vh-220px)] lg:overflow-y-auto lg:pr-4">
                    {/* Templates & AI Tab */}
                    <div id="templates" className={`space-y-6 ${activeTab === 'templates' ? 'block' : 'hidden'}`}>
                        <fieldset id="fieldset-templates-main">
                            <div className="border-b dark:border-slate-700 mb-4">
                                <nav className="-mb-px flex gap-4">
                                    <button onClick={() => setActiveSubTab('templates')} className={getSubTabClasses('templates')}>القوالب</button>
                                    <button onClick={() => setActiveSubTab('ai')} className={getSubTabClasses('ai')}>مساعد AI</button>
                                </nav>
                            </div>
                            
                            {activeSubTab === 'templates' && (
                                <div className="animate-fade-in space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-slate-600 dark:text-slate-400 text-sm mb-2">قوالب جاهزة</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {builtInPresets.map(preset => ( <Button key={preset.name} size="sm" variant="secondary" onClick={() => applyPreset(preset.settings)} className="w-full justify-start">{preset.name}</Button>))}
                                        </div>
                                    </div>
                                    {settings.customReportTemplates.length > 0 && (
                                        <div>
                                            <h4 className="font-semibold text-slate-600 dark:text-slate-400 text-sm mt-4 mb-2">قوالبي المحفوظة</h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {settings.customReportTemplates.map(template => (
                                                    <div key={template.id} className="relative group">
                                                        <Button size="sm" variant="secondary" onClick={() => applyCustomTemplate(template)} className="w-full justify-start pr-8">{template.name}</Button>
                                                        <button onClick={() => handleDeleteCustomTemplate(template.id)} className="absolute top-1/2 -translate-y-1/2 right-1 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Icon name="delete" className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <Button onClick={handleOpenSaveModal} size="sm" leftIcon={<Icon name="save" className="w-4 h-4" />} className="mt-4">حفظ التصميم الحالي كقالب</Button>
                                </div>
                            )}
                            
                            {activeSubTab === 'ai' && (
                                <fieldset id="fieldset-ai-assistant" className="animate-fade-in">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-md mb-2 flex items-center gap-2">
                                        <Icon name="sparkles" className="w-5 h-5 text-purple-500" />
                                        مساعد التصميم الذكي (AI)
                                    </h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">صف التصميم الذي تريده بالكامل (ألوان، خطوط، تنسيق)، وسيقوم Gemini بابتكاره لك.</p>
                                    <div className="space-y-2">
                                        <textarea 
                                            rows={3} 
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            className="w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-purple-500"
                                            placeholder="مثال: تصميم رسمي بخطوط واضحة وصور كبيرة، أو تصميم فني بألوان الطبيعة وخط يدوي..."
                                        />
                                        <div className="flex items-center gap-2">
                                            <Button onClick={() => handleGenerateDesign(aiPrompt)} disabled={isGenerating || !aiPrompt.trim()} className="bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 shadow-md shadow-purple-500/20">
                                                {isGenerating ? <Icon name="refresh-cw" className="w-5 h-5 animate-spin" /> : <Icon name="sparkles" className="w-5 h-5" />}
                                                <span>{isGenerating ? 'جاري...' : 'توليد من الوصف'}</span>
                                            </Button>
                                            <Button onClick={() => handleGenerateDesign('random')} disabled={isGenerating} variant="secondary">
                                                <Icon name="refresh-cw" className={isGenerating ? "w-5 h-5 animate-spin" : "w-5 h-5"} />
                                                <span>إنشاء تصميم جديد</span>
                                            </Button>
                                        </div>
                                    </div>
                                </fieldset>
                            )}
                        </fieldset>
                    </div>

                     {/* Colors Tab */}
                    <div id="colors" className={`space-y-6 ${activeTab === 'colors' ? 'block' : 'hidden'}`}>
                        <fieldset id="fieldset-colors-primary" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">الألوان الأساسية</legend>
                            <ColorInput label="لون التمييز (للأيقونات والروابط)" value={reportSettings.primaryColor} onChange={color => handleSettingChange('primaryColor', color)} />
                            <ColorInput label="لون اسم الورشة" value={reportSettings.appNameColor} onChange={color => handleSettingChange('appNameColor', color)} />
                            <ColorInput label="لون النص الأساسي" value={reportSettings.textColor} onChange={color => handleSettingChange('textColor', color)} />
                        </fieldset>
                        <fieldset id="fieldset-colors-section-titles" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">ألوان رؤوس الأقسام</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ColorInput label="خلفية رأس القسم الكبير" value={reportSettings.findingsHeaderBackgroundColor} onChange={color => handleSettingChange('findingsHeaderBackgroundColor', color)} />
                                <ColorInput label="خط رأس القسم الكبير" value={reportSettings.findingsHeaderFontColor} onChange={color => handleSettingChange('findingsHeaderFontColor', color)} />
                                <ColorInput label="خلفية عناوين الأقسام" value={reportSettings.sectionTitleBackgroundColor} onChange={color => handleSettingChange('sectionTitleBackgroundColor', color)} />
                                <ColorInput label="خط عناوين الأقسام" value={reportSettings.sectionTitleFontColor} onChange={color => handleSettingChange('sectionTitleFontColor', color)} />
                            </div>
                        </fieldset>
                        <fieldset id="fieldset-colors-backgrounds" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">ألوان الخلفيات والإطارات</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ColorInput label="خلفية التقرير" value={reportSettings.pageBackgroundColor} onChange={color => handleSettingChange('pageBackgroundColor', color)} />
                                <ColorInput label="لون الإطارات والفواصل" value={reportSettings.borderColor} onChange={color => handleSettingChange('borderColor', color)} />
                                <ColorInput label="خلفية حاوية بنود الفحص" value={reportSettings.findingContainerBackgroundColor} onChange={color => handleSettingChange('findingContainerBackgroundColor', color)} />
                                <ColorInput label="لون إطار صورة الملاحظة" value={reportSettings.noteImageBorderColor} onChange={color => handleSettingChange('noteImageBorderColor', color)} />
                            </div>
                        </fieldset>
                    </div>

                    {/* Layout Tab */}
                    <div id="layout" className={`space-y-6 ${activeTab === 'layout' ? 'block' : 'hidden'}`}>
                         <fieldset id="fieldset-layout-cards" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">أحجام البطاقات والصور</legend>
                            <div>
                                <label className="block text-sm font-medium mb-1">حجم بطاقات الفحص</label>
                                <div className="flex gap-2">
                                    {(['small', 'medium', 'large'] as const).map(size => (
                                        <label key={size} className={`flex-1 p-2 border rounded-md cursor-pointer text-center ${reportSettings.findingCardSize === size ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'dark:border-slate-600'}`}>
                                            <input type="radio" name="findingCardSize" value={size} checked={reportSettings.findingCardSize === size} onChange={() => handleSettingChange('findingCardSize', size)} className="sr-only" />
                                            {size === 'small' ? 'صغير' : size === 'medium' ? 'متوسط' : 'كبير'}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">حجم صورة الملاحظة</label>
                                <select value={reportSettings.noteImageSize} onChange={e => handleSettingChange('noteImageSize', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600">
                                    <option value="small">صغير (مستطيل)</option>
                                    <option value="medium">متوسط (4:3)</option>
                                    <option value="large">كبير (مربع)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">تدوير حواف صورة الملاحظة</label>
                                <select value={reportSettings.noteImageBorderRadius} onChange={e => handleSettingChange('noteImageBorderRadius', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600">
                                    <option value="0rem">بدون (حادة)</option><option value="0.25rem">صغير</option><option value="0.5rem">متوسط</option><option value="0.75rem">كبير</option>
                                </select>
                            </div>
                        </fieldset>
                         <fieldset id="fieldset-layout-page" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">ترقيم الصفحات</legend>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="showPageNumbers" checked={reportSettings.showPageNumbers} onChange={e => handleSettingChange('showPageNumbers', e.target.checked)} className="h-4 w-4 rounded" />
                                <label htmlFor="showPageNumbers">إظهار أرقام الصفحات في التذييل</label>
                            </div>
                        </fieldset>
                    </div>
                    
                    {/* Text & Fields Tab */}
                    <div id="text" className={`space-y-6 ${activeTab === 'text' ? 'block' : 'hidden'}`}>
                        <fieldset id="fieldset-text-font" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">الخطوط</legend>
                            <label className="block text-sm font-medium mb-1">خط التقرير</label>
                            <select value={reportSettings.fontFamily} onChange={e => handleSettingChange('fontFamily', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600">
                                {availableFonts.map(font => ( <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.name}</option>))}
                            </select>
                        </fieldset>
                         <fieldset id="fieldset-text-disclaimer" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">نص إخلاء المسؤولية</legend>
                            <textarea rows={3} value={reportSettings.disclaimerText} onChange={e => handleSettingChange('disclaimerText', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700" />
                        </fieldset>
                        <fieldset id="fieldset-text-fields" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">حقول مخصصة بالرأس</legend>
                            <div className="space-y-2">
                                {reportSettings.headerCustomFields?.map(field => (
                                    <div key={field.id} className="flex items-center gap-2">
                                        <input type="text" placeholder="العنوان" value={field.label} onChange={e => handleCustomFieldChange(field.id, 'label', e.target.value)} className="w-1/3 p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                        <input type="text" placeholder="القيمة" value={field.value} onChange={e => handleCustomFieldChange(field.id, 'value', e.target.value)} className="flex-grow p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                        <Button type="button" variant="danger" size="sm" onClick={() => removeCustomField(field.id)} className="p-2"><Icon name="delete" className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="secondary" size="sm" onClick={addCustomField} leftIcon={<Icon name="add" className="w-4 h-4" />} className="mt-2">إضافة حقل</Button>
                        </fieldset>
                    </div>

                    {/* Branding & QR Tab */}
                    <div id="branding" className={`space-y-6 ${activeTab === 'branding' ? 'block' : 'hidden'}`}>
                        <fieldset id="fieldset-branding-stamp" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">ختم الورشة</legend>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">سيظهر الختم في تذييل التقرير.</p>
                            <div className="mt-2 flex items-center gap-4">
                                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center border dark:border-gray-600">
                                    {reportSettings.workshopStampUrl ? <img src={reportSettings.workshopStampUrl} alt="معاينة الختم" className="max-w-full max-h-full object-contain p-1" /> : <span className="text-xs text-gray-500">لا يوجد ختم</span>}
                                </div>
                                <input type="file" id="stamp-upload" className="hidden" accept="image/png, image/jpeg" onChange={handleStampUpload} />
                                <label htmlFor="stamp-upload" className="cursor-pointer bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600">تغيير</label>
                                {reportSettings.workshopStampUrl && <Button variant="danger" onClick={() => handleSettingChange('workshopStampUrl', null)}>إزالة</Button>}
                            </div>
                        </fieldset>
                        <fieldset id="fieldset-branding-qr" className={`p-4 border rounded-lg dark:border-slate-700 space-y-4`}>
                            <legend className="px-2 font-semibold">رمز QR</legend>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="showQr" checked={reportSettings.showQrCode} onChange={e => handleSettingChange('showQrCode', e.target.checked)} className="h-4 w-4 rounded" />
                                <label htmlFor="showQr">إظهار رمز QR في الرأس</label>
                            </div>
                            {reportSettings.showQrCode && (
                                <div className="space-y-4 animate-fade-in">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">محتوى الرمز</label>
                                        <input type="text" value={reportSettings.qrCodeContent} onChange={e => handleSettingChange('qrCodeContent', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600" />
                                        <p className="text-xs text-slate-500 mt-1">{'يمكنك استخدام `{request_number}` كمتغير لرقم الطلب.'}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <ColorInput label="لون الرمز" value={reportSettings.qrCodeStyle.color} onChange={color => handleQrStyleChange('color', color)} />
                                        <div>
                                            <label className="block text-xs font-medium mb-1">شكل النقاط</label>
                                            <select value={reportSettings.qrCodeStyle.dotsOptions.style} onChange={e => handleQrStyleChange('dotsOptions', { style: e.target.value })} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 text-sm">
                                                <option value="square">مربعات</option><option value="dots">نقاط</option><option value="rounded">ناعم</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">شكل الزوايا</label>
                                            <select value={reportSettings.qrCodeStyle.cornersSquareOptions.style} onChange={e => handleQrStyleChange('cornersSquareOptions', { style: e.target.value })} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 text-sm">
                                                <option value="square">مربع</option><option value="dot">نقطة</option><option value="extra-rounded">دائري</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">الموضع</label>
                                            <select value={reportSettings.qrCodePosition} onChange={e => handleSettingChange('qrCodePosition', e.target.value as 'left' | 'right')} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 text-sm">
                                                <option value="left">يسار</option><option value="right">يمين</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">الحجم</label>
                                            <select value={reportSettings.qrCodeSize} onChange={e => handleSettingChange('qrCodeSize', e.target.value)} className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600 text-sm">
                                                <option value="80px">صغير</option><option value="96px">متوسط</option><option value="112px">كبير</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </fieldset>
                    </div>
                </div>

                {/* Live Preview Panel */}
                <div className="lg:col-span-2">
                    <div className="lg:sticky lg:top-20">
                        <div className="border-2 border-dashed dark:border-slate-600 p-2 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-900/50">
                            <div className="transform scale-[0.8] origin-top shadow-lg w-[125%] -mx-[12.5%] bg-white report-wrapper">
                                <InspectionReport
                                    request={mockRequest}
                                    client={mockClient}
                                    car={mockCar}
                                    carMake={mockCarMake}
                                    carModel={mockCarModel}
                                    inspectionType={mockInspectionType}
                                    customFindingCategories={mockCategories}
                                    predefinedFindings={mockFindings}
                                    settings={fullSettingsForPreview}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="حفظ القالب" size="md">
                <div className="space-y-4">
                    <p>أدخل اسمًا للقالب الحالي لحفظه واستخدامه لاحقًا.</p>
                    <div>
                        <label htmlFor="template-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">اسم القالب</label>
                        <input
                            id="template-name"
                            type="text"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            className="mt-1 block w-full p-2 border rounded-md dark:bg-slate-700 dark:border-slate-600"
                            placeholder="مثال: تصميمي الأنيق"
                        />
                    </div>
                </div>
                <div className="flex justify-end items-center gap-3 pt-6 mt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsSaveModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSaveCustomTemplate} disabled={!newTemplateName.trim()}>حفظ القالب</Button>
                </div>
            </Modal>
        </div>
    );
};

export default ReportSettingsPage;