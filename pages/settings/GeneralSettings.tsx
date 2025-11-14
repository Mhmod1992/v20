

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import DatabaseManagement from './DatabaseManagement';

const compressImageToBase64 = (file: File, options: { maxWidth: number; maxHeight: number; quality: number; }): Promise<string> => {
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
      
      resolve(canvas.toDataURL('image/jpeg', options.quality));
    };
    img.onerror = (error) => {
        URL.revokeObjectURL(img.src);
        reject(error);
    }
  });
};

const WorkshopDetails: React.FC = () => {
  const { settings, updateSettings, addNotification } = useAppContext();
  const [currentSettings, setCurrentSettings] = useState(settings);
  const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);
  
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        try {
            const compressedDataUrl = await compressImageToBase64(file, { maxWidth: 300, maxHeight: 300, quality: 0.8 });
            setCurrentSettings(prev => ({...prev, logoUrl: compressedDataUrl}));
        } catch (error) {
            console.error("Logo compression failed:", error);
            addNotification({ title: 'خطأ', message: 'فشل ضغط الصورة. سيتم استخدام الصورة الأصلية.', type: 'error' });
            const reader = new FileReader();
            reader.onloadend = () => {
                setCurrentSettings(prev => ({...prev, logoUrl: reader.result as string}));
            };
            reader.readAsDataURL(file);
        }
    }
  };

  const handleSaveChanges = async () => {
    try {
        await updateSettings({
            appName: currentSettings.appName,
            logoUrl: currentSettings.logoUrl,
        });
        addNotification({ title: 'نجاح', message: 'تم حفظ الإعدادات العامة بنجاح!', type: 'success' });
    } catch (error) {
        // Error notification is handled by the context's updateSettings function
        console.error('Failed to save general settings', error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">تفاصيل الورشة</h3>
        <div className="space-y-6">
          <div>
            <label htmlFor="appName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              اسم التطبيق
            </label>
            <input
              type="text"
              id="appName"
              value={currentSettings.appName}
              onChange={(e) => setCurrentSettings(prev => ({...prev, appName: e.target.value}))}
              className={formInputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              شعار الورشة
            </label>
            <div className="mt-2 flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center border dark:border-gray-600">
                {currentSettings.logoUrl ? (
                  <img src={currentSettings.logoUrl} alt="معاينة الشعار" className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-500">لا يوجد شعار</span>
                )}
              </div>
              <input
                type="file"
                id="logo-upload"
                className="hidden"
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleLogoChange}
              />
              <label htmlFor="logo-upload" className="cursor-pointer bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors font-semibold">
                تغيير الشعار
              </label>
              {currentSettings.logoUrl && (
                <Button variant="danger" onClick={() => setCurrentSettings(prev => ({...prev, logoUrl: null}))}>
                  إزالة الشعار
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end pt-6 border-t dark:border-gray-700">
        <Button onClick={handleSaveChanges} leftIcon={<Icon name="save" className="w-5 h-5"/>}>
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
};

const GeneralSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'details' | 'database'>('details');
    const { themeSetting, setThemeSetting } = useAppContext();
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="p-4 border rounded-lg dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">المظهر</h3>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      اختر السمة المفضلة للتطبيق
                    </label>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg max-w-sm">
                        <button onClick={() => setThemeSetting('light')} className={`flex-1 text-center font-medium py-2 rounded-md transition-all ${themeSetting === 'light' ? 'bg-white dark:bg-slate-700 shadow text-teal-600' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}>
                            فاتح
                        </button>
                        <button onClick={() => setThemeSetting('dark')} className={`flex-1 text-center font-medium py-2 rounded-md transition-all ${themeSetting === 'dark' ? 'bg-white dark:bg-slate-700 shadow text-teal-600' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}>
                            داكن
                        </button>
                        <button onClick={() => setThemeSetting('system')} className={`flex-1 text-center font-medium py-2 rounded-md transition-all ${themeSetting === 'system' ? 'bg-white dark:bg-slate-700 shadow text-teal-600' : 'text-gray-500 hover:bg-white/50 dark:hover:bg-slate-800'}`}>
                            النظام
                        </button>
                    </div>
                  </div>
            </div>
            <div className="border-b border-gray-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6 rtl:space-x-reverse" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`${
                            activeTab === 'details'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300'
                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-md focus:outline-none`}
                    >
                        تفاصيل الورشة
                    </button>
                    <button
                        onClick={() => setActiveTab('database')}
                        className={`${
                            activeTab === 'database'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:border-gray-300'
                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-md focus:outline-none`}
                    >
                        إدارة البيانات
                    </button>
                </nav>
            </div>
            <div>
                {activeTab === 'details' && <WorkshopDetails />}
                {activeTab === 'database' && <DatabaseManagement />}
            </div>
        </div>
    );
};


export default GeneralSettings;