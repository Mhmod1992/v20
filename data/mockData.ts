

import { InspectionRequest, Client, Car, RequestStatus, CarMake, CarModel, InspectionType, Broker, PaymentType, CustomFindingCategory, PredefinedFinding, Settings, Employee, Permission, Note, PERMISSIONS, Expense } from '../types';

export const mockClients: Client[] = [
  { id: 'cli-1', name: 'عبدالله محمد', phone: '0501234567' },
  { id: 'cli-2', name: 'سالم أحمد', phone: '0557654321' },
  { id: 'cli-3', name: 'خالد يوسف', phone: '0533344556' },
];

export const mockCarMakes: CarMake[] = [
  { id: 'make-1', name_ar: 'تويوتا', name_en: 'Toyota' },
  { id: 'make-2', name_ar: 'هيونداي', name_en: 'Hyundai' },
  { id: 'make-3', name_ar: 'فورد', name_en: 'Ford' },
];

export const mockCarModels: CarModel[] = [
  { id: 'model-1', make_id: 'make-1', name_ar: 'كامري', name_en: 'Camry' },
  { id: 'model-2', make_id: 'make-1', name_ar: 'كورولا', name_en: 'Corolla' },
  { id: 'model-3', make_id: 'make-2', name_ar: 'سوناتا', name_en: 'Sonata' },
  { id: 'model-4', make_id: 'make-2', name_ar: 'إلنترا', name_en: 'Elantra' },
  { id: 'model-5', make_id: 'make-3', name_ar: 'تورس', name_en: 'Taurus' },
  { id: 'model-6', make_id: 'make-3', name_ar: 'إكسبلورر', name_en: 'Explorer' },
];

export const mockCars: Car[] = [
  { id: 'car-1', make_id: 'make-1', model_id: 'model-1', year: 2022, plate_number: 'أ ب ج 1234' },
  { id: 'car-2', make_id: 'make-2', model_id: 'model-3', year: 2021, plate_number: 'د هـ و 5678' },
  { id: 'car-3', make_id: 'make-3', model_id: 'model-5', year: 2023, plate_number: 'س ص ط 9012' },
  { id: 'car-4', make_id: 'make-3', model_id: 'model-5', year: 2022, plate_number: 'ق ر ك 3456' },
  { id: 'car-5', make_id: 'make-1', model_id: 'model-1', year: 2020, plate_number: 'ل م ن 7890' },
];

export const mockCustomFindingCategories: CustomFindingCategory[] = [
    { id: 'cat-1', name: 'البودي الخارجي' },
    { id: 'cat-2', name: 'المحرك وناقل الحركة' },
    { id: 'cat-3', name: 'الشاصيه ونظام التعليق' },
    { id: 'cat-4', name: 'الفحص بالكمبيوتر' },
];

export const mockPredefinedFindings: PredefinedFinding[] = [
    { id: 'find-1', name: 'الصدام الأمامي', category_id: 'cat-1', options: ['سليم', 'مرشوش', 'مغير', 'تالف'], reference_image: 'https://i.ibb.co/68qB5s2/front-bumper.jpg' },
    { id: 'find-2', name: 'الكبوت', category_id: 'cat-1', options: ['سليم', 'مرشوش', 'مغير', 'تالف'], reference_image: 'https://i.ibb.co/Xz9dK2B/hood.jpg' },
    { id: 'find-3', name: 'الرفرف الأمامي يمين', category_id: 'cat-1', options: ['سليم', 'مرشوش', 'مغير', 'تالف'] },
    { id: 'find-4', name: 'حالة المحرك', category_id: 'cat-2', options: ['ممتازة', 'جيدة', 'تحتاج صيانة'] },
    { id: 'find-5', name: 'حالة ناقل الحركة', category_id: 'cat-2', options: ['ممتازة', 'جيدة', 'يوجد تأخير'] },
    { id: 'find-6', name: 'أضرار الشاصيه', category_id: 'cat-3', options: ['لا يوجد', 'ضربة خفيفة', 'ضربة قوية'] },
    { id: 'find-7', name: 'نتيجة فحص الكمبيوتر', category_id: 'cat-4', options: ['لا توجد أكواد أعطال', 'يوجد أكواد أعطال'] },
];


export const mockInspectionTypes: InspectionType[] = [
    { id: 'type-1', name: 'فحص كامل', price: 350, finding_category_ids: ['cat-1', 'cat-2', 'cat-3', 'cat-4'] },
    { id: 'type-2', name: 'فحص كمبيوتر', price: 150, finding_category_ids: ['cat-4'] },
    { id: 'type-3', name: 'فحص بودي', price: 200, finding_category_ids: ['cat-1', 'cat-3'] },
];

export const mockBrokers: Broker[] = [
    { id: 'broker-1', name: 'مكتب النهضة', default_commission: 50, is_active: true },
    { id: 'broker-2', name: 'معرض الفلاح', default_commission: 75, is_active: true },
    { id: 'broker-3', name: 'سمسار مستقل', default_commission: 30, is_active: false },
];

export const mockSettings: Settings = {
    appName: "نظام ورشة المستقبل",
    logoUrl: null, // "https://example.com/logo.png"
    design: 'aero',
    sidebarStyle: 'default',
    headerStyle: 'default',
    backgroundImageUrl: null,
    backgroundColor: null,
    glassmorphismIntensity: 5,
    geminiApiKey: null,
    databaseCapacity: 500,
    storageCapacity: 1, // 1 GB
    plateCharacters: [
        { ar: 'أ', en: 'A' }, { ar: 'ب', en: 'B' }, { ar: 'ح', en: 'J' },
        { ar: 'د', en: 'D' }, { ar: 'ر', en: 'R' }, { ar: 'س', en: 'S' },
        { ar: 'ص', en: 'X' }, { ar: 'ط', en: 'T' }, { ar: 'ع', en: 'E' },
        { ar: 'ق', en: 'G' }, { ar: 'ك', en: 'K' }, { ar: 'ل', en: 'L' },
        { ar: 'م', en: 'Z' }, { ar: 'ن', en: 'N' }, { ar: 'هـ', en: 'H' },
        { ar: 'و', en: 'U' }, { ar: 'ى', en: 'V' }
    ],
    platePreviewSettings: {
        backgroundColor: '#FFFFFF',
        borderColor: '#000000',
        fontColor: '#000000',
        fontFamily: 'monospace',
        fontSize: '32px',
        letterSpacing: '0.1em',
        separatorImageUrl: null,
        separatorWidth: 'auto',
        separatorHeight: '80%',
    },
    reportSettings: {
        primaryColor: '#3b82f6', // blue-500
        appNameColor: '#2563eb', // blue-600
        sectionTitleBackgroundColor: '#e0f2fe', // sky-100
        sectionTitleFontColor: '#0369a1', // sky-700
        findingsHeaderBackgroundColor: '#2563eb', // blue-600
        findingsHeaderFontColor: '#ffffff', // white
        noteImageBorderColor: '#e2e8f0', // slate-200
        noteImageBorderRadius: '0.5rem', // rounded-lg
        fontFamily: "'Tajawal', sans-serif",
        baseFontSize: '12px',
        pageBackgroundColor: '#ffffff',
        textColor: '#1e293b', // slate-800
        borderColor: '#cbd5e1', // slate-300
        disclaimerText: 'هذا التقرير يعكس حالة السيارة وقت الفحص بناءً على فحص ظاهري وفني بالأجهزة المتاحة. الورشة غير مسؤولة عن أي أعطال قد تظهر مستقبلًا أو لم يتم اكتشافها أثناء الفحص.',
        showQrCode: true,
        findingContainerBackgroundColor: '#f8fafc', // slate-50
        qrCodePosition: 'left',
        qrCodeSize: '96px', // medium: w-24 h-24
        headerCustomFields: [
            { id: 'field-1', label: 'السجل التجاري', value: '1234567890' },
            { id: 'field-2', label: 'الرقم الضريبي', value: '0987654321' },
        ],
        findingCardSize: 'medium',
        showPageNumbers: true,
        noteImageSize: 'medium',
        qrCodeContent: 'https://example.com/report/{request_number}',
        workshopStampUrl: null,
        qrCodeStyle: {
            dotsOptions: { style: 'square' },
            cornersSquareOptions: { style: 'square' },
            color: '#000000'
        }
    },
    customReportTemplates: [],
};

const allPermissions: Permission[] = Object.keys(PERMISSIONS) as Permission[];

export const mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    name: 'أحمد علي (مدير عام)',
    role: 'general_manager',
    is_active: true,
    permissions: allPermissions,
  },
  {
    id: 'emp-2',
    name: 'محمد خالد (موظف)',
    role: 'employee',
    is_active: true,
    permissions: ['view_dashboard', 'fill_requests', 'create_requests'],
  },
  {
    id: 'emp-3',
    name: 'سارة عبدالله (مدير)',
    role: 'manager',
    is_active: true,
    permissions: [
        'view_dashboard', 
        'manage_clients', 
        'create_requests', 
        'update_requests_data', 
        'fill_requests', 
        'delete_requests',
        'manage_settings_general',
        'manage_expenses',
    ],
  },
];


// Helper to generate recent dates for mock data
const today = new Date();
const getRecentDate = (daysAgo: number, hour: number) => {
    const date = new Date(today);
    date.setDate(today.getDate() - daysAgo);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
};

export const mockExpenses: Expense[] = [
  {
    id: 'exp-1',
    date: getRecentDate(2, 10),
    category: 'قطع غيار',
    description: 'شراء فلاتر زيت لسيارات تويوتا',
    amount: 450,
    paymentMethod: 'نقدي',
    employeeId: 'emp-3',
  },
  {
    id: 'exp-2',
    date: getRecentDate(5, 14),
    category: 'فواتير (كهرباء, ماء, انترنت)',
    description: 'فاتورة الكهرباء لشهر يونيو',
    amount: 1200,
    paymentMethod: 'تحويل',
    employeeId: 'emp-3',
    receiptUrl: 'https://via.placeholder.com/150/92c950/ffffff?text=Receipt',
  },
  {
    id: 'exp-3',
    date: new Date().toISOString(),
    category: 'صيانة معدات',
    description: 'تصليح جهاز فحص الكمبيوتر',
    amount: 800,
    paymentMethod: 'بطاقة',
    employeeId: 'emp-1',
  },
];


export const mockRequests: InspectionRequest[] = [
  {
    id: 'req-1',
    request_number: 1001,
    client_id: 'cli-1',
    car_id: 'car-1',
    car_snapshot: { make_ar: 'تويوتا', make_en: 'Toyota', model_ar: 'كامري', model_en: 'Camry', year: 2022 },
    inspection_type_id: 'type-1',
    payment_type: PaymentType.Card,
    price: 350,
    status: RequestStatus.COMPLETE,
    created_at: getRecentDate(1, 10), // 1 day ago at 10:00
    employee_id: 'emp-1',
    broker: { id: 'broker-1', commission: 50 },
    inspection_data: {}, general_notes: [], category_notes: {}, voice_memos: {}, structured_findings: [], activity_log: [], attached_files: [],
  },
  {
    id: 'req-2',
    request_number: 1002,
    client_id: 'cli-2',
    car_id: 'car-2',
    inspection_type_id: 'type-2',
    payment_type: PaymentType.Cash,
    price: 150,
    status: RequestStatus.IN_PROGRESS,
    created_at: getRecentDate(2, 11), // 2 days ago at 11:30
    employee_id: 'emp-2',
    inspection_data: {},
    general_notes: [
        {
            id: 'gn-1',
            text: 'السيارة بحالة عامة جيدة وتحتاج فقط للإصلاحات المذكورة.',
            authorId: 'emp-2',
            authorName: 'محمد خالد (موظف)'
        }
    ],
    category_notes: {
        'cat-4': [
            {
                id: 'cn-1',
                text: 'تم العثور على رمز خطأ P0135 يشير إلى مشكلة في دائرة سخان حساس الأكسجين.',
                authorId: 'emp-2',
                authorName: 'محمد خالد (موظف)'
            }
        ]
    },
    voice_memos: {},
    structured_findings: [
        {
            findingId: 'find-7',
            findingName: 'نتيجة فحص الكمبيوتر',
            value: 'يوجد أكواد أعطال',
            categoryId: 'cat-4',
        }
    ],
    activity_log: [],
    attached_files: [],
  },
  {
    id: 'req-3',
    request_number: 1003,
    client_id: 'cli-3',
    car_id: 'car-3',
    inspection_type_id: 'type-1',
    payment_type: PaymentType.Unpaid,
    price: 350,
    status: RequestStatus.IN_PROGRESS,
    created_at: getRecentDate(3, 15), // 3 days ago at 15:00
    employee_id: 'emp-1',
    inspection_data: {}, general_notes: [], category_notes: {}, voice_memos: {}, structured_findings: [], activity_log: [], attached_files: [],
  },
    {
    id: 'req-4',
    request_number: 1004,
    client_id: 'cli-1',
    car_id: 'car-4',
    inspection_type_id: 'type-1',
    payment_type: PaymentType.Cash,
    price: 350,
    status: RequestStatus.COMPLETE,
    created_at: getRecentDate(4, 9), // 4 days ago at 09:00
    employee_id: 'emp-2',
    broker: { id: 'broker-2', commission: 75 },
    inspection_data: {}, general_notes: [], category_notes: {}, voice_memos: {}, structured_findings: [], activity_log: [], attached_files: [],
  },
  {
    id: 'req-5',
    request_number: 1005,
    client_id: 'cli-2',
    car_id: 'car-5',
    inspection_type_id: 'type-3',
    payment_type: PaymentType.Card,
    price: 200,
    status: RequestStatus.COMPLETE,
    created_at: getRecentDate(5, 14), // 5 days ago at 14:20
    employee_id: 'emp-1',
    inspection_data: {}, general_notes: [], category_notes: {}, voice_memos: {}, structured_findings: [], activity_log: [], attached_files: [],
  },
];