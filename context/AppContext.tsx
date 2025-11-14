

import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { supabase } from '../lib/supabaseClient';
import { 
    InspectionRequest, Client, Car, CarMake, CarModel, InspectionType, 
    Broker, CustomFindingCategory, PredefinedFinding, Settings, Employee,
    SettingsPage, Notification, ConfirmModalState, Permission, Note, Page, AppNotification, Expense
} from '../types';
import { mockSettings } from '../data/mockData';
import { uuidv4, estimateObjectSize } from '../lib/utils';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  themeSetting: 'light' | 'dark' | 'system';
  setThemeSetting: (theme: 'light' | 'dark' | 'system') => void;
  page: Page;
  setPage: (page: Page) => void;
  goBack: () => void;
  settingsPage: SettingsPage;
  setSettingsPage: (page: SettingsPage) => void;
  requests: InspectionRequest[];
  clients: Client[];
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  cars: Car[];
  carMakes: CarMake[];
  carModels: CarModel[];
  inspectionTypes: InspectionType[];
  brokers: Broker[];
  employees: Employee[];
  expenses: Expense[];
  customFindingCategories: CustomFindingCategory[];
  predefinedFindings: PredefinedFinding[];
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
  authUser: Employee | null;
  login: (employeeId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  addRequest: (request: Omit<InspectionRequest, 'request_number'>) => Promise<InspectionRequest>;
  updateRequest: (updatedRequest: InspectionRequest) => Promise<void>;
  fetchAndUpdateSingleRequest: (requestId: string) => Promise<void>;
  updateRequestAndAssociatedData: (payload: {
    originalRequest: InspectionRequest;
    formData: {
        client_id: string;
        car: Partial<Omit<Car, 'id'>>;
        request: Partial<Omit<InspectionRequest, 'id' | 'client_id' | 'car_id' | 'broker'>> & { broker: { id: string; commission: number; } | null; };
    };
  }) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  deleteRequestsBatch: (ids: string[]) => Promise<void>;
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addCar: (car: Car) => Promise<void>;
  uploadImage: (file: File, bucket: string) => Promise<string>;
  deleteImage: (imageUrl: string) => Promise<void>;
  addInspectionType: (type: Omit<InspectionType, 'id'>) => Promise<void>;
  updateInspectionType: (type: InspectionType) => Promise<void>;
  deleteInspectionType: (id: string) => Promise<void>;
  addFindingCategory: (category: Omit<CustomFindingCategory, 'id'>) => Promise<void>;
  updateFindingCategory: (category: CustomFindingCategory) => Promise<void>;
  deleteFindingCategory: (id: string) => Promise<void>;
  addPredefinedFinding: (finding: Omit<PredefinedFinding, 'id'>) => Promise<void>;
  updatePredefinedFinding: (finding: PredefinedFinding) => Promise<void>;
  deletePredefinedFinding: (id: string) => Promise<void>;
  addCarMake: (make: Omit<CarMake, 'id'>) => Promise<CarMake>;
  addCarMakesBulk: (makes: Omit<CarMake, 'id'>[]) => Promise<void>;
  updateCarMake: (make: CarMake) => Promise<void>;
  deleteCarMake: (id: string) => Promise<void>;
  deleteAllCarMakes: () => Promise<void>;
  addCarModel: (model: Omit<CarModel, 'id'>) => Promise<CarModel>;
  addCarModelsBulk: (models: Omit<CarModel, 'id'>[]) => Promise<void>;
  updateCarModel: (model: CarModel) => Promise<void>;
  deleteCarModel: (id: string) => Promise<void>;
  deleteModelsByMakeId: (makeId: string) => Promise<void>;
  addBroker: (broker: Omit<Broker, 'id'>) => Promise<Broker>;
  updateBroker: (broker: Broker) => Promise<void>;
  deleteBroker: (id: string) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employee: Pick<Employee, 'id'> & Partial<Omit<Employee, 'id'>>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  appNotifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  confirmModalState: ConfirmModalState;
  showConfirmModal: (modalState: Omit<ConfirmModalState, 'isOpen'>) => void;
  hideConfirmModal: () => void;
  isLoading: boolean;
  isRefreshing: boolean;
  isSetupComplete: boolean;
  can: (permission: Permission) => boolean;
  findOrCreateCarMake: (name: string) => Promise<CarMake>;
  findOrCreateCarModel: (name: string, makeId: string) => Promise<CarModel>;
  initialRequestModalState: 'new' | null;
  setInitialRequestModalState: (state: 'new' | null) => void;
  currentDbUsage: number;
  currentStorageUsage: number;
  newRequestSuccessState: { isOpen: boolean; requestNumber: number | null; requestId: string | null; };
  showNewRequestSuccessModal: (requestId: string, requestNumber: number) => void;
  hideNewRequestSuccessModal: () => void;
  shouldPrintDraft: boolean;
  setShouldPrintDraft: (shouldPrint: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useLocalStorage<Page[]>('pageHistory', ['dashboard']);
  const page = history[history.length - 1] || 'dashboard';

  const setPage = useCallback((newPage: Page) => {
    setHistory(prev => {
        if (prev[prev.length - 1] === newPage) return prev; // Don't add duplicates
        const newHistory = [...prev, newPage];
        // Cap history size to prevent it from growing indefinitely
        if (newHistory.length > 20) {
            return newHistory.slice(newHistory.length - 20);
        }
        return newHistory;
    });
  }, [setHistory]);

  const goBack = useCallback(() => {
    setHistory(prev => {
        if (prev.length > 1) {
            return prev.slice(0, -1); // Pop the last page
        }
        return prev; // Stay on the last page if it's the only one
    });
  }, [setHistory]);

  const [lastPage, setLastPage] = useState<Page | null>(null);
  const [settingsPage, setSettingsPage] = useLocalStorage<SettingsPage>('currentSettingsPage', 'general');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [requests, setRequests] = useState<InspectionRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useLocalStorage<string | null>('selectedRequestId', null);
  const [selectedClientId, setSelectedClientId] = useLocalStorage<string | null>('selectedClientId', null);

  const [settings, setSettings] = useState<Settings>(mockSettings);
  const [carMakes, setCarMakes] = useState<CarMake[]>([]);
  const [carModels, setCarModels] = useState<CarModel[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inspectionTypes, setInspectionTypes] = useState<InspectionType[]>([]);
  const [customFindingCategories, setCustomFindingCategories] = useState<CustomFindingCategory[]>([]);
  const [predefinedFindings, setPredefinedFindings] = useState<PredefinedFinding[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [confirmModalState, setConfirmModalState] = useState<ConfirmModalState>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [authUser, setAuthUser] = useState<Employee | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [initialRequestModalState, setInitialRequestModalState] = useState<'new' | null>(null);
  const [newRequestSuccessState, setNewRequestSuccessState] = useState<{ isOpen: boolean; requestNumber: number | null; requestId: string | null; }>({ isOpen: false, requestNumber: null, requestId: null });
  const [shouldPrintDraft, setShouldPrintDraft] = useState(false);

  // Theme Management
  const [themeSetting, setThemeSetting] = useLocalStorage<'light' | 'dark' | 'system'>('theme', 'system');
  const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Effective theme

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
        const isSystemDark = mediaQuery.matches;
        const isDark = themeSetting === 'dark' || (themeSetting === 'system' && isSystemDark);
        
        root.classList.toggle('dark', isDark);
        setTheme(isDark ? 'dark' : 'light');
    };

    updateTheme(); // Apply on load and setting change

    // Listen for changes in system preference
    mediaQuery.addEventListener('change', updateTheme);
    return () => {
        mediaQuery.removeEventListener('change', updateTheme);
    };
  }, [themeSetting]);

  const toggleTheme = () => {
    // This function provides a quick way to switch between light and dark,
    // overriding the 'system' preference. It's based on the current effective theme.
    setThemeSetting(theme === 'light' ? 'dark' : 'light');
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = uuidv4();
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);
  
  const refreshData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
        const [
            requestsRes, clientsRes, carsRes, carMakesRes, carModelsRes,
            inspectionTypesRes, brokersRes, employeesRes,
            customFindingCategoriesRes, predefinedFindingsRes, settingsRes,
            expensesRes
        ] = await Promise.all([
            supabase.from('inspection_requests').select('*').order('created_at', { ascending: false }),
            supabase.from('clients').select('*'),
            supabase.from('cars').select('*'),
            supabase.from('car_makes').select('*').order('name_ar'),
            supabase.from('car_models').select('*').order('name_ar'),
            supabase.from('inspection_types').select('*'),
            supabase.from('brokers').select('*'),
            supabase.from('employees').select('*'),
            supabase.from('custom_finding_categories').select('*'),
            supabase.from('predefined_findings').select('*'),
            supabase.from('app_settings').select('settings_data').limit(1).single(),
            supabase.from('expenses').select('*').order('date', { ascending: false }),
        ]);

        const results = [
            requestsRes, clientsRes, carsRes, carMakesRes, carModelsRes,
            inspectionTypesRes, brokersRes, employeesRes,
            customFindingCategoriesRes, predefinedFindingsRes, settingsRes,
            expensesRes
        ];
        for (const res of results) {
            if (res.error && res.error.code !== 'PGRST116') { // Ignore error for empty settings table
                 throw res.error;
            }
        }
        
        const fetchedSettingsData = settingsRes.data?.settings_data;
        const finalSettings = {
            ...mockSettings,
            ...(fetchedSettingsData || {}),
            plateCharacters: fetchedSettingsData?.plateCharacters || mockSettings.plateCharacters,
            platePreviewSettings: {
                ...mockSettings.platePreviewSettings,
                ...(fetchedSettingsData?.platePreviewSettings || {}),
            },
            reportSettings: {
                ...mockSettings.reportSettings,
                ...(fetchedSettingsData?.reportSettings || {}),
            },
        };
        setSettings(finalSettings);

        setRequests(requestsRes.data || []);
        setClients(clientsRes.data || []);
        setCars(carsRes.data || []);
        setCarMakes(carMakesRes.data || []);
        setCarModels(carModelsRes.data || []);
        setInspectionTypes(inspectionTypesRes.data || []);
        setBrokers(brokersRes.data || []);
        setCustomFindingCategories(customFindingCategoriesRes.data || []);
        setPredefinedFindings(predefinedFindingsRes.data || []);
        setExpenses(expensesRes.data || []);
        setAppNotifications([
            { id: '1', title: 'طلب جديد', message: 'تم إنشاء طلب جديد برقم 1006', isRead: false, createdAt: new Date().toISOString() },
            { id: '2', title: 'حالة الطلب', message: 'تم تحديث حالة الطلب #1004 إلى مكتمل', isRead: false, createdAt: new Date(Date.now() - 3600 * 1000).toISOString() },
            { id: '3', title: 'تنبيه نظام', message: 'تم تحديث إعدادات التقرير بنجاح.', isRead: true, createdAt: new Date(Date.now() - 3600 * 1000 * 5).toISOString() },
        ]);

        let employeesData: Employee[] = employeesRes.data || [];
        setEmployees(employeesData);
        
        if (isInitialLoad) {
            if (employeesData.length > 0) {
                 setIsSetupComplete(true);
                 // Check for a logged-in user in localStorage
                 const loggedInEmployeeId = window.localStorage.getItem('loggedInEmployeeId');
                 if (loggedInEmployeeId) {
                    const user = employeesData.find(e => e.id === loggedInEmployeeId && e.is_active);
                    if (user) {
                      setAuthUser(user);
                    }
                 }
            } else {
                setIsSetupComplete(false);
            }
        }
        
    } catch (error: any) {
        console.error("Error fetching/refreshing data:", error.message || error);
        addNotification({ title: 'خطأ فادح', message: 'فشل تحميل البيانات من الخادم.', type: 'error' });
    } finally {
        if (isInitialLoad) {
            setIsLoading(false);
        } else {
            setIsRefreshing(false);
        }
    }
  }, [addNotification]);
  
  // Initial data fetch
  useEffect(() => {
    refreshData(true);
  }, []);

  // One-time refresh for pages that don't need polling
  useEffect(() => {
    const pagesToRefreshOn: Page[] = ['dashboard', 'clients', 'settings', 'financials', 'profile', 'brokers', 'expenses'];
    if (page !== lastPage && pagesToRefreshOn.includes(page)) {
        refreshData(false);
    }
    setLastPage(page);
  }, [page, lastPage, refreshData]);

  // Polling mechanism for the requests page
  useEffect(() => {
    let intervalId: number | undefined;

    if (page === 'requests') {
        // Initial refresh when navigating to the page
        refreshData(false); 
        
        // Start polling every 10 seconds
        intervalId = window.setInterval(() => {
            refreshData(false);
        }, 10000);
    }

    // Cleanup function to stop polling when the page changes
    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [page, refreshData]);

  const login = async (employeeId: string, pin: string): Promise<boolean> => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee && employee.pin === pin && employee.is_active) {
        setAuthUser(employee);
        window.localStorage.setItem('loggedInEmployeeId', employee.id);
        addNotification({ title: `أهلاً بك، ${employee.name}`, message: 'تم تسجيل الدخول بنجاح.', type: 'success' });
        return true;
    }
    return false;
  };

  const logout = () => {
    setAuthUser(null);
    window.localStorage.removeItem('loggedInEmployeeId');
    setHistory(['dashboard']);
    setSelectedRequestId(null);
    setSelectedClientId(null);
    setSettingsPage('general');
    addNotification({ title: 'تسجيل الخروج', message: 'تم تسجيل خروجك بنجاح.', type: 'info' });
  };


  const can = (permission: Permission): boolean => {
    if (!authUser) return false;
    if (authUser.role === 'general_manager') {
      return true;
    }
    return (authUser.permissions || []).includes(permission);
  };

  // --- Global UI Functions ---
  const markNotificationAsRead = (id: string) => {
    setAppNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };
  const markAllNotificationsAsRead = () => {
      setAppNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };
  const showConfirmModal = (modalState: Omit<ConfirmModalState, 'isOpen'>) => setConfirmModalState({ ...modalState, isOpen: true });
  const hideConfirmModal = () => setConfirmModalState(prev => ({ ...prev, isOpen: false }));
  
  const showNewRequestSuccessModal = (requestId: string, requestNumber: number) => {
    setNewRequestSuccessState({ isOpen: true, requestId, requestNumber });
  };
  const hideNewRequestSuccessModal = () => {
    setNewRequestSuccessState({ isOpen: false, requestId: null, requestNumber: null });
  };


  // --- Supabase CRUD Functions ---
  const uploadImage = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
    
    if (!data.publicUrl) {
        throw new Error('Could not get public URL for uploaded file.');
    }
    
    return data.publicUrl;
  };

  const deleteImage = async (imageUrl: string): Promise<void> => {
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      // Expected URL format: /storage/v1/object/public/[BUCKET]/[...FILE_PATH]
      const bucketIndex = pathParts.findIndex(part => part === 'public') + 1;
      if (bucketIndex === 0 || bucketIndex >= pathParts.length) {
          throw new Error('Invalid Supabase storage URL format.');
      }
      const bucketName = pathParts[bucketIndex];
      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      if (!bucketName || !filePath) {
          throw new Error('Could not parse bucket name or file path from URL.');
      }

      const { error } = await supabase.storage.from(bucketName).remove([filePath]);
      if (error) {
        // Log the error but don't throw, as the file might already be deleted.
        console.warn(`Supabase: Could not delete file ${filePath}. Reason:`, error.message);
      }
    } catch (error) {
      console.error("Error deleting image from storage:", error);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const isObject = (item: any) => item && typeof item === 'object' && !Array.isArray(item);
    
    const mergeDeep = (target: any, source: any): any => {
      let output = { ...target };
      if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
          if (isObject(source[key])) {
            if (!(key in target)) {
              Object.assign(output, { [key]: source[key] });
            } else {
              output[key] = mergeDeep(target[key], source[key]);
            }
          } else {
            Object.assign(output, { [key]: source[key] });
          }
        });
      }
      return output;
    };
    
    const originalSettings = settings;
    const updatedSettings = mergeDeep(settings, newSettings);
    setSettings(updatedSettings);

    const { error } = await supabase
      .from('app_settings')
      .update({ settings_data: updatedSettings })
      .eq('id', 1); // Assuming a single row of settings with ID 1

    if (error) {
      console.error("Failed to save settings to DB:", error);
      setSettings(originalSettings); // Revert on failure
      addNotification({ title: 'خطأ', message: 'فشل حفظ الإعدادات في قاعدة البيانات.', type: 'error' });
      throw error;
    }
  };
  
  const addRequest = async (request: Omit<InspectionRequest, 'request_number'>): Promise<InspectionRequest> => {
    const getNextRequestNumber = () => {
        if (requests.length === 0) return 1001;
        const maxNum = Math.max(...requests.map(r => Number(r.request_number) || 0));
        return maxNum + 1;
    };
    const fullRequest: InspectionRequest = { ...request, request_number: getNextRequestNumber() };
    const { data, error } = await supabase.from('inspection_requests').insert(fullRequest).select();
    if (error) { 
        console.error("Supabase error adding request:", error);
        throw error; 
    }
    const newRequest = data[0];
    setRequests(prev => [newRequest, ...prev]);
    return newRequest;
  };

  const addClient = async (client: Client) => {
      const { error } = await supabase.from('clients').insert(client);
      if (error) { 
          console.error("Supabase error adding client:", error);
          throw error; 
      }
      setClients(prev => [...prev, client]);
  };

  const updateClient = async (client: Client) => {
    const { error } = await supabase.from('clients').update(client).eq('id', client.id);
    if (error) {
        console.error("Supabase error updating client:", error);
        throw error;
    }
    setClients(prev => prev.map(c => c.id === client.id ? client : c));
  };

  const deleteClient = async (id: string) => {
    const hasRequests = requests.some(req => req.client_id === id);
    if (hasRequests) {
        const error = new Error('لا يمكن حذف عميل لديه طلبات فحص مرتبطة به.');
        console.error(error.message);
        throw error;
    }
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) {
        console.error("Supabase error deleting client:", error);
        throw error;
    }
    setClients(prev => prev.filter(c => c.id !== id));
  };


  const addCar = async (car: Car) => {
      const { error } = await supabase.from('cars').insert(car);
      if (error) { 
          console.error("Supabase error adding car:", error);
          throw error; 
      }
      setCars(prev => [...prev, car]);
  };
  
  const updateRequest = async (updatedRequest: InspectionRequest): Promise<void> => {
      const { error } = await supabase.from('inspection_requests').update(updatedRequest).eq('id', updatedRequest.id);
      if (error) { 
          console.error("Supabase error updating request:", error);
          throw error; 
      }
      setRequests(prev => prev.map(r => r.id === updatedRequest.id ? updatedRequest : r));
  };
  
  const fetchAndUpdateSingleRequest = useCallback(async (requestId: string) => {
      if (!requestId) return;
      const { data, error } = await supabase
          .from('inspection_requests')
          .select('*')
          .eq('id', requestId)
          .single();
      
      if (error) {
          // If the error code is PGRST116, it means no rows were found (0 or more than 1),
          // which can happen if the request was deleted by another user.
          // We can safely ignore this specific error during polling to avoid console spam.
          if (error.code !== 'PGRST116') {
            console.error("Error fetching single request for polling:", error.message || error);
          }
          return;
      }

      if (data) {
          setRequests(prevRequests => 
              prevRequests.map(req => req.id === requestId ? data : req)
          );
      }
  }, []);


  const updateRequestAndAssociatedData = async (payload: {
    originalRequest: InspectionRequest;
    formData: {
        client_id: string;
        car: Partial<Omit<Car, 'id'>>;
        request: Partial<Omit<InspectionRequest, 'id' | 'client_id' | 'car_id' | 'broker'>> & { broker: { id: string; commission: number; } | null; };
    };
  }) => {
    const { originalRequest, formData } = payload;
    const { client_id, car: carData, request: requestData } = formData;

    const { error: carError } = await supabase.from('cars').update(carData).eq('id', originalRequest.car_id);
    if (carError) { console.error("Supabase car update error:", carError); throw carError; }
    setCars(prev => prev.map(c => c.id === originalRequest.car_id ? { ...c, ...carData, id: originalRequest.car_id } as Car : c));

    const updatedRequestPayload = {
        ...requestData,
        client_id: client_id,
        broker: requestData.broker,
    };
    const { data, error: requestError } = await supabase.from('inspection_requests').update(updatedRequestPayload).eq('id', originalRequest.id).select().single();
    if (requestError) { console.error("Supabase request update error:", requestError); throw requestError; }
    setRequests(prev => prev.map(r => r.id === originalRequest.id ? data : r));
};

  
  const deleteRequest = async (id: string): Promise<void> => {
      // Find the request to be deleted to get image URLs
      const requestToDelete = requests.find(r => r.id === id);

      if (requestToDelete) {
          const imageUrls: string[] = [];
          ((requestToDelete.general_notes as Note[]) || []).forEach(note => {
              if (note.image) imageUrls.push(note.image);
          });
          Object.values((requestToDelete.category_notes as Record<string, Note[]>) || {}).forEach(noteArray => {
              (noteArray || []).forEach(note => {
                  if (note.image) imageUrls.push(note.image);
              });
          });

          if (imageUrls.length > 0) {
              // Concurrently delete all associated images from storage
              // The deleteImage function is designed not to throw on failure, just log.
              await Promise.all(imageUrls.map(url => deleteImage(url)));
          }
      } else {
          console.warn(`Request with ID ${id} not found in local state. Could not delete associated images.`);
      }
      
      const { error } = await supabase.from('inspection_requests').delete().eq('id', id);
      if (error) { 
          console.error("Supabase error deleting request:", error);
          throw error; 
      }
      setRequests(prev => prev.filter(r => r.id !== id));
  };

  const deleteRequestsBatch = async (ids: string[]): Promise<void> => {
      const requestsToDelete = requests.filter(r => ids.includes(r.id));
      const allImageUrls: string[] = [];

      requestsToDelete.forEach(request => {
          ((request.general_notes as Note[]) || []).forEach(note => {
              if (note.image) allImageUrls.push(note.image);
          });
          Object.values((request.category_notes as Record<string, Note[]>) || {}).forEach(noteArray => {
              (noteArray || []).forEach(note => {
                  if (note.image) allImageUrls.push(note.image);
              });
          });
      });

      if (allImageUrls.length > 0) {
          await Promise.all(allImageUrls.map(url => deleteImage(url)));
      }
      
      const { error } = await supabase.from('inspection_requests').delete().in('id', ids);
      if (error) {
          console.error("Supabase error batch deleting requests:", error);
          throw error;
      }
      
      setRequests(prev => prev.filter(r => !ids.includes(r.id)));
  };

  const addInspectionType = async (type: Omit<InspectionType, 'id'>) => {
      const newType = { ...type, id: uuidv4() };
      const { error } = await supabase.from('inspection_types').insert(newType);
      if (error) { console.error("Supabase error:", error); throw error; }
      setInspectionTypes(prev => [...prev, newType]);
  };
  const updateInspectionType = async (type: InspectionType) => {
      const { error } = await supabase.from('inspection_types').update(type).eq('id', type.id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setInspectionTypes(prev => prev.map(t => t.id === type.id ? type : t));
  };
  const deleteInspectionType = async (id: string) => {
      const { error } = await supabase.from('inspection_types').delete().eq('id', id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setInspectionTypes(prev => prev.filter(t => t.id !== id));
  };

  const addFindingCategory = async (cat: Omit<CustomFindingCategory, 'id'>) => {
      const newCat = { ...cat, id: uuidv4() };
      const { error } = await supabase.from('custom_finding_categories').insert(newCat);
      if (error) { console.error("Supabase error:", error); throw error; }
      setCustomFindingCategories(prev => [...prev, newCat]);
  };
  const updateFindingCategory = async (cat: CustomFindingCategory) => {
      const { error } = await supabase.from('custom_finding_categories').update(cat).eq('id', cat.id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setCustomFindingCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
  };
  const deleteFindingCategory = async (id: string) => {
      const { error } = await supabase.from('custom_finding_categories').delete().eq('id', id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setCustomFindingCategories(prev => prev.filter(c => c.id !== id));
      setPredefinedFindings(prev => prev.filter(f => f.category_id !== id));
  };

  const addPredefinedFinding = async (f: Omit<PredefinedFinding, 'id'>) => {
      const newFinding = { ...f, id: uuidv4() };
      const { error } = await supabase.from('predefined_findings').insert(newFinding);
      if (error) { console.error("Supabase error:", error); throw error; }
      setPredefinedFindings(prev => [...prev, newFinding]);
  };
  const updatePredefinedFinding = async (f: PredefinedFinding) => {
      const { error } = await supabase.from('predefined_findings').update(f).eq('id', f.id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setPredefinedFindings(prev => prev.map(pf => pf.id === f.id ? f : pf));
  };
  const deletePredefinedFinding = async (id: string) => {
      const { error } = await supabase.from('predefined_findings').delete().eq('id', id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setPredefinedFindings(prev => prev.filter(pf => pf.id !== id));
  };
  
  const addCarMake = async (make: Omit<CarMake, 'id'>): Promise<CarMake> => {
      const newMake = { ...make, id: uuidv4() };
      const { error } = await supabase.from('car_makes').insert(newMake);
      if (error) { console.error("Supabase error:", error); throw error; }
      setCarMakes(prev => [...prev, newMake].sort((a, b) => a.name_ar.localeCompare(b.name_ar)));
      return newMake;
  };

  const findOrCreateCarMake = async (name: string): Promise<CarMake> => {
    const searchTerm = name.trim();
    if (!searchTerm) throw new Error("Car make name cannot be empty.");

    const existingMake = carMakes.find(m => m.name_en.toLowerCase() === searchTerm.toLowerCase());
    if (existingMake) {
        return existingMake;
    }
    
    // If not found, create it. Use the english name for arabic as a fallback.
    return await addCarMake({ name_en: searchTerm, name_ar: searchTerm });
  };

  const addCarMakesBulk = async (makes: Omit<CarMake, 'id'>[]) => {
      const makesWithIds = makes.map(make => ({ ...make, id: uuidv4() }));
      const { error } = await supabase.from('car_makes').insert(makesWithIds);
      if (error) { 
          console.error("Supabase error bulk adding car makes:", error);
          throw error; 
      }
      setCarMakes(prev => [...prev, ...makesWithIds].sort((a,b) => a.name_ar.localeCompare(b.name_ar)));
  };
  const updateCarMake = async (make: CarMake) => {
      const { error } = await supabase.from('car_makes').update(make).eq('id', make.id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setCarMakes(prev => prev.map(m => m.id === make.id ? make : m));
  };
  const deleteCarMake = async (id: string) => {
      const { error } = await supabase.from('car_makes').delete().eq('id', id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setCarMakes(prev => prev.filter(m => m.id !== id));
      setCarModels(prev => prev.filter(m => m.make_id !== id));
  };

  const deleteAllCarMakes = async () => {
    const { data: makes, error: fetchError } = await supabase.from('car_makes').select('id');
    if (fetchError) {
        console.error("Supabase error fetching car makes for deletion:", fetchError);
        throw fetchError;
    }
    if (!makes || makes.length === 0) {
        return; // Nothing to delete
    }
    const makeIds = makes.map(m => m.id);

    // Delete associated models first to maintain referential integrity
    const { error: modelsError } = await supabase.from('car_models').delete().in('make_id', makeIds);
    if (modelsError) {
        console.error("Supabase error deleting car models:", modelsError);
        throw modelsError;
    }

    // Then delete the makes
    const { error: makesError } = await supabase.from('car_makes').delete().in('id', makeIds);
    if (makesError) {
        console.error("Supabase error deleting car makes:", makesError);
        throw makesError;
    }

    setCarMakes([]);
    setCarModels([]);
  };

  const addCarModel = async (model: Omit<CarModel, 'id'>): Promise<CarModel> => {
      const newModel = { ...model, id: uuidv4() };
      const { error } = await supabase.from('car_models').insert(newModel);
      if (error) { console.error("Supabase error:", error); throw error; }
      setCarModels(prev => [...prev, newModel].sort((a, b) => a.name_ar.localeCompare(b.name_ar)));
      return newModel;
  };
  
  const findOrCreateCarModel = async (name: string, makeId: string): Promise<CarModel> => {
      const searchTerm = name.trim();
      if (!searchTerm) throw new Error("Car model name cannot be empty.");

      const existingModel = carModels.find(m => m.make_id === makeId && m.name_en.toLowerCase() === searchTerm.toLowerCase());
      if (existingModel) {
          return existingModel;
      }

      return await addCarModel({ name_en: searchTerm, name_ar: searchTerm, make_id: makeId });
  };


  const addCarModelsBulk = async (models: Omit<CarModel, 'id'>[]) => {
      const modelsWithIds = models.map(model => ({ ...model, id: uuidv4() }));
      const { error } = await supabase.from('car_models').insert(modelsWithIds);
      if (error) { 
          console.error("Supabase error bulk adding car models:", error);
          throw error; 
      }
      setCarModels(prev => [...prev, ...modelsWithIds].sort((a,b) => a.name_ar.localeCompare(b.name_ar)));
  };
  const updateCarModel = async (model: CarModel) => {
      const { error } = await supabase.from('car_models').update(model).eq('id', model.id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setCarModels(prev => prev.map(m => m.id === model.id ? model : m));
  };
  const deleteCarModel = async (id: string) => {
      const { error } = await supabase.from('car_models').delete().eq('id', id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setCarModels(prev => prev.filter(m => m.id !== id));
  };
  
  const deleteModelsByMakeId = async (makeId: string) => {
    const { error } = await supabase.from('car_models').delete().eq('make_id', makeId);
    if (error) {
        console.error("Supabase error deleting models by make ID:", error);
        throw error;
    }
    setCarModels(prev => prev.filter(model => model.make_id !== makeId));
  };

  const addBroker = async (broker: Omit<Broker, 'id'>): Promise<Broker> => {
      const newBroker = { ...broker, id: uuidv4() };
      const { data, error } = await supabase.from('brokers').insert(newBroker).select().single();
      if (error) { console.error("Supabase error:", error); throw error; }
      setBrokers(prev => [...prev, data]);
      return data;
  };
  const updateBroker = async (broker: Broker) => {
      const { error } = await supabase.from('brokers').update(broker).eq('id', broker.id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setBrokers(prev => prev.map(b => b.id === broker.id ? broker : b));
  };
  const deleteBroker = async (id: string) => {
      const { error } = await supabase.from('brokers').delete().eq('id', id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setBrokers(prev => prev.filter(b => b.id !== id));
  };

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: uuidv4() };
    const { data, error } = await supabase.from('expenses').insert(newExpense).select().single();
    if (error) { console.error("Supabase error adding expense:", error); throw error; }
    setExpenses(prev => [data, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  const updateExpense = async (expense: Expense) => {
      const { error } = await supabase.from('expenses').update(expense).eq('id', expense.id);
      if (error) { console.error("Supabase error updating expense:", error); throw error; }
      setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };
  const deleteExpense = async (id: string) => {
      const expenseToDelete = expenses.find(e => e.id === id);
      if (expenseToDelete && expenseToDelete.receiptUrl) {
          await deleteImage(expenseToDelete.receiptUrl);
      }
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) { console.error("Supabase error deleting expense:", error); throw error; }
      setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addEmployee = async (emp: Omit<Employee, 'id'>) => {
      const { data, error } = await supabase.from('employees').insert(emp).select().single();
      if (error) { console.error("Supabase error:", error); throw error; }
      
      setEmployees(prevEmployees => {
          const newEmployees = [...prevEmployees, data];
          if (newEmployees.length === 1) {
              setAuthUser(data);
              window.localStorage.setItem('loggedInEmployeeId', data.id);
              setIsSetupComplete(true);
          }
          return newEmployees;
      });
  };
  const updateEmployee = async (emp: Pick<Employee, 'id'> & Partial<Omit<Employee, 'id'>>) => {
      const { id, ...updateData } = emp;
      const { data, error } = await supabase.from('employees').update(updateData).eq('id', id).select().single();
      if (error) { console.error("Supabase error:", error); throw error; }
      
      setEmployees(prev => prev.map(e => e.id === id ? data : e));
      
      if (authUser?.id === id) {
          setAuthUser(data);
      }
  };
  const deleteEmployee = async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) { console.error("Supabase error:", error); throw error; }
      setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const currentStorageUsage = useMemo(() => {
    // Storage is primarily voice memos (base64 data) and images (URLs).
    // We can only accurately measure the size of data we have, which is voice memos.
    // We'll estimate the size of the voice_memos objects.
    let storageSize = 0;
    requests.forEach(req => {
        if (req.voice_memos) {
            storageSize += estimateObjectSize(req.voice_memos);
        }
    });
    return storageSize;
  }, [requests]);

  const currentDbUsage = useMemo(() => {
    // To get a more distinct value for DB usage, we calculate the size of requests
    // without the bulky voice memos, which we've designated as "storage".
    const requestsWithoutStorage = requests.map(({ voice_memos, ...rest }) => rest);
    
    const dbSize = [
        requestsWithoutStorage, clients, cars, carMakes, carModels,
        inspectionTypes, brokers, employees, customFindingCategories,
        predefinedFindings, settings
    ].reduce((acc, current) => acc + estimateObjectSize(current), 0);

    return dbSize;
  }, [requests, clients, cars, carMakes, carModels, inspectionTypes, brokers, employees, customFindingCategories, predefinedFindings, settings]);
  
  const value: AppContextType = {
    theme, toggleTheme, themeSetting, setThemeSetting, page, setPage, goBack, settingsPage, setSettingsPage,
    requests, clients, selectedClientId, setSelectedClientId, cars, carMakes, carModels, inspectionTypes, brokers, employees, expenses,
    customFindingCategories, predefinedFindings, selectedRequestId,
    setSelectedRequestId, authUser, login, logout, settings, updateSettings,
    addRequest, updateRequest, fetchAndUpdateSingleRequest, updateRequestAndAssociatedData, deleteRequest, deleteRequestsBatch, addClient, updateClient, deleteClient, addCar,
    uploadImage,
    deleteImage,
    addInspectionType, updateInspectionType, deleteInspectionType,
    addFindingCategory, updateFindingCategory, deleteFindingCategory,
    addPredefinedFinding, updatePredefinedFinding, deletePredefinedFinding,
    addCarMake, addCarMakesBulk, updateCarMake, deleteCarMake, deleteAllCarMakes,
    addCarModel, addCarModelsBulk, updateCarModel, deleteCarModel, deleteModelsByMakeId,
    addBroker, updateBroker, deleteBroker,
    addExpense, updateExpense, deleteExpense,
    addEmployee, updateEmployee, deleteEmployee,
    notifications, addNotification, removeNotification,
    appNotifications, markNotificationAsRead, markAllNotificationsAsRead,
    confirmModalState, showConfirmModal, hideConfirmModal,
    isLoading,
    isRefreshing,
    isSetupComplete,
    can,
    findOrCreateCarMake,
    findOrCreateCarModel,
    initialRequestModalState,
    setInitialRequestModalState,
    currentDbUsage,
    currentStorageUsage,
    newRequestSuccessState,
    showNewRequestSuccessModal,
    hideNewRequestSuccessModal,
    shouldPrintDraft,
    setShouldPrintDraft,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};