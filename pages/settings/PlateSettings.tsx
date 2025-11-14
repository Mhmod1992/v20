import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Settings } from '../../types';
import Icon from '../../components/Icon';
import Button from '../../components/Button';

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

const PlateSettings: React.FC = () => {
    const { settings, updateSettings, addNotification } = useAppContext();
    const [currentSettings, setCurrentSettings] = useState<Settings>(settings);

    const formInputClasses = "block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    useEffect(() => {
        setCurrentSettings(settings);
    }, [settings]);

    const handleSave = async () => {
        try {
            await updateSettings(currentSettings);
            addNotification({ title: 'نجاح', message: 'تم حفظ إعدادات اللوحة بنجاح!', type: 'success' });
        } catch (error) {
             console.error('Failed to save plate settings', error);
        }
    };
    
    const handlePlateCharChange = (index: number, key: 'ar' | 'en', value: string) => {
        setCurrentSettings(prev => {
           const updatedChars = [...prev.plateCharacters];
           updatedChars[index] = { ...updatedChars[index], [key]: value };
           return {...prev, plateCharacters: updatedChars};
        });
    };
    
    const addPlateChar = () => {
        setCurrentSettings(prev => ({
            ...prev,
            plateCharacters: [...prev.plateCharacters, { ar: '', en: '' }],
        }));
    }

    const removePlateChar = (index: number) => {
        setCurrentSettings(prev => ({
            ...prev,
            plateCharacters: prev.plateCharacters.filter((_, i) => i !== index),
        }));
    }
    
    const handlePreviewSettingChange = (key: keyof Settings['platePreviewSettings'], value: string | null) => {
        setCurrentSettings(prev => ({
            ...prev,
            platePreviewSettings: {
                ...prev.platePreviewSettings,
                [key]: value
            }
        }));
    };
    
    const handleSeparatorImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedDataUrl = await compressImageToBase64(file, { maxWidth: 80, maxHeight: 120, quality: 0.7 });
                handlePreviewSettingChange('separatorImageUrl', compressedDataUrl);
            } catch (error) {
                console.error("Separator image compression failed:", error);
                addNotification({ title: 'خطأ', message: 'فشل ضغط صورة الفاصل.', type: 'error' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    handlePreviewSettingChange('separatorImageUrl', reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        } else {
             handlePreviewSettingChange('separatorImageUrl', null);
        }
    };
    
    const { platePreviewSettings } = currentSettings;
     const previewContainerStyle: React.CSSProperties = {
        backgroundColor: platePreviewSettings.backgroundColor,
        borderColor: platePreviewSettings.borderColor,
    };
    const previewTextStyle: React.CSSProperties = {
        color: platePreviewSettings.fontColor,
        fontFamily: platePreviewSettings.fontFamily,
        fontSize: platePreviewSettings.fontSize,
        letterSpacing: platePreviewSettings.letterSpacing,
    };
    const separatorImageStyle: React.CSSProperties = {
        width: platePreviewSettings.separatorWidth,
        height: platePreviewSettings.separatorHeight,
    };


    return (
         <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">أحرف اللوحة</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">تحديد الأحرف المسموح بها وتحويلها بين العربية والإنجليزية.</p>
                    <div className="grid grid-cols-3 gap-2 font-bold text-center border-b dark:border-slate-700 pb-2 dark:text-gray-300">
                        <span>عربي</span>
                        <span>إنجليزي</span>
                        <span/>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {currentSettings.plateCharacters.map((char, index) => (
                            <div key={index} className="grid grid-cols-3 gap-2 items-center mt-2">
                                <input type="text" value={char.ar} onChange={e => handlePlateCharChange(index, 'ar', e.target.value)} className={`${formInputClasses} text-center`} />
                                <input type="text" value={char.en} onChange={e => handlePlateCharChange(index, 'en', e.target.value.toUpperCase())} className={`${formInputClasses} text-center`} />
                                <button onClick={() => removePlateChar(index)} className="text-red-500 p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 justify-self-center"><Icon name="delete"/></button>
                            </div>
                        ))}
                    </div>
                     <button onClick={addPlateChar} className="mt-4 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline">+ إضافة حرف جديد</button>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">تصميم معاينة اللوحة</h3>
                     <div className="mb-4">
                        <div 
                            className="flex items-center justify-evenly border-2 rounded-md h-20 p-2 max-w-sm mx-auto"
                            style={previewContainerStyle}
                        >
                            <span className="font-bold tracking-widest" style={previewTextStyle}>
                                V J H
                            </span>
                             {platePreviewSettings.separatorImageUrl ? (
                                <img src={platePreviewSettings.separatorImageUrl} alt="Separator" className="object-contain mx-2" style={separatorImageStyle} />
                            ) : (
                                <div style={{ backgroundColor: platePreviewSettings.borderColor }} className="w-px h-12 mx-2"></div>
                            )}
                            <span className="font-bold tracking-widest" style={previewTextStyle}>
                                1 2 3 4
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm dark:text-gray-300">
                        <div className="col-span-2">
                            <label className="font-medium">عائلة الخط (Font Family)</label>
                            <input type="text" value={platePreviewSettings.fontFamily} onChange={e => handlePreviewSettingChange('fontFamily', e.target.value)} className={formInputClasses} placeholder="'Courier New', monospace"/>
                        </div>
                        <div>
                            <label className="font-medium">لون الخلفية</label>
                            <input type="color" value={platePreviewSettings.backgroundColor} onChange={e => handlePreviewSettingChange('backgroundColor', e.target.value)} className="w-full p-1 h-12 border border-gray-300 dark:border-slate-600 rounded-md"/>
                        </div>
                         <div>
                            <label className="font-medium">لون الإطار</label>
                            <input type="color" value={platePreviewSettings.borderColor} onChange={e => handlePreviewSettingChange('borderColor', e.target.value)} className="w-full p-1 h-12 border border-gray-300 dark:border-slate-600 rounded-md"/>
                        </div>
                         <div>
                            <label className="font-medium">لون الخط</label>
                            <input type="color" value={platePreviewSettings.fontColor} onChange={e => handlePreviewSettingChange('fontColor', e.target.value)} className="w-full p-1 h-12 border border-gray-300 dark:border-slate-600 rounded-md"/>
                        </div>
                        <div>
                            <label className="font-medium">تباعد الأحرف (Letter Spacing)</label>
                            <input type="text" value={platePreviewSettings.letterSpacing} onChange={e => handlePreviewSettingChange('letterSpacing', e.target.value)} className={formInputClasses} placeholder="4px"/>
                        </div>
                         <div className="col-span-2">
                            <label className="font-medium">حجم الخط (Font Size)</label>
                            <input type="text" value={platePreviewSettings.fontSize} onChange={e => handlePreviewSettingChange('fontSize', e.target.value)} className={formInputClasses} placeholder="32px"/>
                        </div>
                         <div className="col-span-2">
                            <label className="font-medium">صورة الفاصل</label>
                             <input type="file" accept="image/*" onChange={handleSeparatorImageChange} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-700 dark:file:text-slate-300 dark:hover:file:bg-slate-600"/>
                        </div>
                        <div>
                            <label className="font-medium">عرض الفاصل (Width)</label>
                            <input type="text" value={platePreviewSettings.separatorWidth} onChange={e => handlePreviewSettingChange('separatorWidth', e.target.value)} className={formInputClasses} placeholder="auto or 20px"/>
                        </div>
                         <div>
                            <label className="font-medium">ارتفاع الفاصل (Height)</label>
                            <input type="text" value={platePreviewSettings.separatorHeight} onChange={e => handlePreviewSettingChange('separatorHeight', e.target.value)} className={formInputClasses} placeholder="40px"/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t dark:border-slate-700">
                <Button onClick={handleSave} leftIcon={<Icon name="save" className="w-5 h-5"/>}>
                    حفظ الإعدادات
                </Button>
            </div>
        </div>
    );
};

export default PlateSettings;