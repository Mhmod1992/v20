import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import Button from '../Button';
import Icon from '../Icon';

const GeneralSettingsTab: React.FC = () => {
  const { settings, updateSettings, addNotification } = useAppContext();
  const [appName, setAppName] = useState(settings.appName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [logoPreview, setLogoPreview] = useState(settings.logoUrl);

  useEffect(() => {
    setAppName(settings.appName);
    setLogoUrl(settings.logoUrl);
    setLogoPreview(settings.logoUrl);
  }, [settings]);
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        setLogoUrl(result); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    try {
      await updateSettings({
        appName,
        logoUrl,
      });
      addNotification({ title: 'نجاح', message: 'تم حفظ الإعدادات العامة بنجاح!', type: 'success' });
    } catch(e) {
      // Error notification is handled in context, but we can log it here too
      console.error("Failed to save general settings", e);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">الإعدادات العامة</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="appName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              اسم التطبيق
            </label>
            <input
              type="text"
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              شعار الورشة
            </label>
            <div className="mt-2 flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center border dark:border-gray-600">
                {logoPreview ? (
                  <img src={logoPreview} alt="معاينة الشعار" className="max-w-full max-h-full object-contain" />
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
              {logoUrl && (
                <Button variant="danger" onClick={() => { setLogoUrl(null); setLogoPreview(null); }}>
                  إزالة الشعار
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-4 border-t dark:border-gray-700">
        <Button onClick={handleSaveChanges} leftIcon={<Icon name="save" className="w-5 h-5"/>}>
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
};

export default GeneralSettingsTab;
