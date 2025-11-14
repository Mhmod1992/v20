

// FIX: Add 'expenses' to the Page type definition.
export type Page = 'dashboard' | 'requests' | 'clients' | 'settings' | 'fill-request' | 'print-report' | 'financials' | 'request-draft' | 'profile' | 'brokers' | 'expenses';

export enum RequestStatus {
  IN_PROGRESS = 'قيد التنفيذ',
  COMPLETE = 'مكتمل',
  NEW = 'جديد',
}

export enum PaymentType {
  Cash = 'نقدي',
  Card = 'بطاقة',
  Transfer = 'تحويل',
  Unpaid = 'غير مدفوع',
}

export type Role = 'general_manager' | 'manager' | 'employee';

export const PERMISSIONS = {
  view_dashboard: 'عرض لوحة التحكم',
  view_financials: 'عرض البيانات المالية',
  manage_clients: 'ادارة العملاء',
  create_requests: 'إنشاء طلبات',
  fill_requests: 'تعبئة بيانات الفحص',
  update_requests_data: 'تحديث بيانات الطلب الأساسية',
  delete_requests: 'حذف الطلبات',
  view_request_info: 'عرض بطاقة معلومات الطلب',
  print_request: 'معاينة وطباعة الطلب',
  view_activity_log: 'عرض سجل النشاط',
  manage_notes: 'إدارة الملاحظات (إضافة/تعديل/حذف)',
  manage_findings: 'إدارة بنود الفحص (إضافة/تعديل/حذف)',
  change_request_status: 'تغيير حالة الطلب (مثل تحديد كمكتمل)',
  manage_employees: 'إدارة الموظفين والصلاحيات',
  manage_settings_general: 'إدارة الإعدادات العامة والتقرير',
  manage_settings_technical: 'إدارة الإعدادات الفنية (الفحص والسيارات)',
  manage_brokers: 'إدارة السماسرة',
  manage_expenses: 'إدارة المصروفات',
} as const;

export type Permission = keyof typeof PERMISSIONS;


export interface Client {
  id: string;
  name: string;
  phone: string;
}

export interface CarMake {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface CarModel {
  id: string;
  make_id: string;
  name_ar: string;
  name_en: string;
}

export interface Car {
  id: string;
  make_id: string;
  model_id: string;
  year: number;
  plate_number: string;
}

export interface InspectionType {
  id:string;
  name: string;
  price: number;
  finding_category_ids: string[];
}

export interface Broker {
  id: string;
  name: string;
  default_commission: number;
  is_active: boolean;
}

export interface Note {
    id: string;
    text: string;
    image?: string;
    authorId: string;
    authorName: string;
    status?: 'saving' | 'saved' | 'error';
}

export interface CustomFindingCategory {
    id: string;
    name: string;
}

export interface StructuredFinding {
    findingId: string;
    findingName: string;
    value: string;
    categoryId: string;
    status?: 'saving' | 'saved' | 'error';
}

export interface PredefinedFinding {
    id: string;
    name: string;
    category_id: string;
    options: string[];
    reference_image?: string;
    group?: string;
    reference_image_position?: string;
}

export interface AttachedFile {
  name: string;
  type: string;
  data: string; // base64 encoded
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  employeeId: string;
  employeeName: string;
  action: string; 
  details: string;
  imageUrl?: string;
}

export interface VoiceMemo {
    id: string;
    audioData: string; // base64 encoded audio blob
    authorId: string;
    authorName: string;
    createdAt: string;
    duration: number; // in seconds
    status?: 'saving' | 'saved' | 'error';
    transcription?: string;
    isTranscribing?: boolean;
    isEditingTranscription?: boolean;
}

export interface CarSnapshot {
  make_ar: string;
  make_en: string;
  model_ar: string;
  model_en: string;
  year: number;
}

export interface InspectionRequest {
  id: string;
  request_number: number;
  client_id: string;
  car_id: string;
  car_snapshot?: CarSnapshot;
  inspection_type_id: string;
  payment_type: PaymentType;
  price: number;
  status: RequestStatus;
  created_at: string;
  employee_id: string | null;
  broker?: {
    id: string;
    commission: number;
  };
  payment_note?: string;
  inspection_data: Record<string, any>;
  general_notes: Note[];
  category_notes: Record<string, Note[]>;
  voice_memos?: Record<string, VoiceMemo[]>; // Key is categoryId or 'general'
  structured_findings: StructuredFinding[];
  activity_log: ActivityLog[];
  attached_files: AttachedFile[];
}

export interface Expense {
  id: string;
  date: string; // ISO string
  category: string;
  description: string;
  amount: number;
  paymentMethod: 'نقدي' | 'بطاقة' | 'تحويل';
  receiptUrl?: string | null;
  employeeId: string;
}

export const EXPENSE_CATEGORIES = [
  'قطع غيار',
  'صيانة معدات',
  'فواتير (كهرباء, ماء, انترنت)',
  'رواتب',
  'إيجار',
  'تسويق',
  'مستلزمات مكتبية',
  'أخرى'
];


export interface PlateCharacterMap {
  ar: string;
  en: string;
}

export interface PlatePreviewSettings {
    backgroundColor: string;
    borderColor: string;
    fontColor: string;
    fontFamily: string;
    fontSize: string;
    letterSpacing: string;
    separatorImageUrl: string | null;
    separatorWidth: string;
    separatorHeight: string;
}

export interface QrCodeStyle {
  dotsOptions: {
    style: 'dots' | 'rounded' | 'square';
  };
  cornersSquareOptions: {
    style: 'dot' | 'square' | 'extra-rounded';
  };
  color: string;
}

export interface ReportSettings {
  primaryColor: string;
  appNameColor: string;
  sectionTitleBackgroundColor: string;
  sectionTitleFontColor: string;
  findingsHeaderBackgroundColor: string;
  findingsHeaderFontColor: string;
  noteImageBorderColor: string;
  noteImageBorderRadius: string;
  fontFamily: string;
  baseFontSize: string;
  pageBackgroundColor: string;
  textColor: string;
  borderColor: string;
  disclaimerText: string;
  showQrCode: boolean;
  findingContainerBackgroundColor: string;
  qrCodePosition: 'left' | 'right';
  qrCodeSize: string;
  headerCustomFields: { id: string; label: string; value: string }[];
  findingCardSize: 'small' | 'medium' | 'large';
  showPageNumbers: boolean;
  noteImageSize: 'small' | 'medium' | 'large';
  qrCodeContent: string;
  workshopStampUrl: string | null;
  // New properties for QR code styling
  qrCodeStyle: QrCodeStyle;
}

export interface CustomReportTemplate {
  id: string;
  name: string;
  settings: ReportSettings;
}

export interface Settings {
  appName: string;
  logoUrl: string | null;
  design: 'aero' | 'classic' | 'glass';
  sidebarStyle: 'default' | 'minimal';
  headerStyle: 'default' | 'elevated';
  backgroundImageUrl: string | null;
  backgroundColor: string | null;
  glassmorphismIntensity: number; // Value from 1 to 10
  plateCharacters: PlateCharacterMap[];
  platePreviewSettings: PlatePreviewSettings;
  reportSettings: ReportSettings;
  customReportTemplates: CustomReportTemplate[];
  geminiApiKey: string | null;
  databaseCapacity: number; // in MB
  storageCapacity: number; // in GB
}

export type SettingsPage = 'general' | 'appearance' | 'request' | 'employees' | 'cars' | 'plate' | 'report' | 'api';

export interface Employee {
  id: string;
  name: string;
  role: Role;
  permissions: Permission[];
  is_active: boolean;
  pin?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}


export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}