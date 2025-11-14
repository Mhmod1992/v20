

import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CustomFindingCategory, InspectionType, PredefinedFinding } from '../../types';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Icon from '../../components/Icon';

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

// --- Sub-components for managing categories and findings ---

const CategoriesAndFindingsManagement: React.FC = () => {
    const { customFindingCategories, addFindingCategory, updateFindingCategory, deleteFindingCategory, showConfirmModal, addNotification } = useAppContext();
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Partial<CustomFindingCategory>>({});
    const [isEditingCategory, setIsEditingCategory] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    useEffect(() => {
        if (!selectedCategoryId && customFindingCategories.length > 0) {
            setSelectedCategoryId(customFindingCategories[0].id);
        }
        if (selectedCategoryId && !customFindingCategories.some(c => c.id === selectedCategoryId)) {
            setSelectedCategoryId(customFindingCategories.length > 0 ? customFindingCategories[0].id : null);
        }
    }, [customFindingCategories, selectedCategoryId]);

    const handleAddCategory = () => {
        setCurrentCategory({ name: '' });
        setIsEditingCategory(false);
        setIsCategoryModalOpen(true);
    };

    const handleEditCategory = (category: CustomFindingCategory) => {
        setCurrentCategory(category);
        setIsEditingCategory(true);
        setIsCategoryModalOpen(true);
    };

    const handleDeleteCategory = (id: string) => {
        showConfirmModal({
            title: 'تأكيد الحذف',
            message: 'سيتم حذف جميع بنود الفحص المرتبطة بهذا التبويب. هل أنت متأكد؟',
            onConfirm: async () => {
                await deleteFindingCategory(id);
                addNotification({ title: 'نجاح', message: 'تم حذف التبويب.', type: 'success' });
            }
        });
    };

    const handleSaveCategory = async () => {
        if (!currentCategory.name?.trim()) {
            addNotification({ title: 'بيانات ناقصة', message: 'الرجاء إدخال اسم التبويب.', type: 'error' });
            return;
        }
        if (isEditingCategory) {
            await updateFindingCategory(currentCategory as CustomFindingCategory);
            addNotification({ title: 'نجاح', message: 'تم تعديل التبويب بنجاح.', type: 'success' });
        } else {
            await addFindingCategory(currentCategory as Omit<CustomFindingCategory, 'id'>);
            addNotification({ title: 'نجاح', message: 'تمت إضافة التبويب بنجاح.', type: 'success' });
        }
        setIsCategoryModalOpen(false);
    };
    
    const selectedCategory = customFindingCategories.find(c => c.id === selectedCategoryId);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-bold dark:text-gray-200">تبويبات الفحص</h4>
                    <Button onClick={handleAddCategory} leftIcon={<Icon name="add"/>}>إضافة</Button>
                </div>
                <ul className="space-y-2">
                    {customFindingCategories.map(category => (
                        <li key={category.id} className={`flex justify-between items-center p-2 rounded-md cursor-pointer ${selectedCategoryId === category.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`} onClick={() => setSelectedCategoryId(category.id)}>
                            <span className="font-medium dark:text-gray-200">{category.name}</span>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleEditCategory(category); }} className="text-yellow-500 hover:text-yellow-400"><Icon name="edit" className="w-4 h-4"/></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }} className="text-red-500 hover:text-red-400"><Icon name="delete" className="w-4 h-4"/></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="md:col-span-2">
                {selectedCategoryId && selectedCategory ? (
                    <FindingsManagement categoryId={selectedCategoryId} categoryName={selectedCategory.name} />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-800/50 rounded-md">
                        <p className="text-gray-500 dark:text-gray-400">الرجاء اختيار تبويب لعرض بنوده.</p>
                    </div>
                )}
            </div>
            <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={isEditingCategory ? 'تعديل تبويب' : 'إضافة تبويب جديد'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم التبويب</label>
                        <input type="text" value={currentCategory.name || ''} onChange={e => setCurrentCategory({ ...currentCategory, name: e.target.value })} className={formInputClasses} />
                    </div>
                    <div className="flex justify-end pt-4"><Button onClick={handleSaveCategory}>حفظ</Button></div>
                </div>
            </Modal>
        </div>
    );
};


const FindingsManagement: React.FC<{ categoryId: string; categoryName: string }> = ({ categoryId, categoryName }) => {
    const { predefinedFindings, addPredefinedFinding, updatePredefinedFinding, deletePredefinedFinding, showConfirmModal, addNotification } = useAppContext();
    const findingsForCategory = predefinedFindings.filter(f => f.category_id === categoryId);
    
    const groupedFindings = useMemo(() => {
        const groups: { [key: string]: PredefinedFinding[] } = {};
        findingsForCategory.forEach(finding => {
            const groupName = finding.group || 'عام'; // Default group name
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(finding);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [findingsForCategory]);

    const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
    const [currentFinding, setCurrentFinding] = useState<Partial<PredefinedFinding>>({ options: [] });
    const [isEditingFinding, setIsEditingFinding] = useState(false);
    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const handleAddFinding = () => {
        setCurrentFinding({ category_id: categoryId, name: '', options: [], reference_image: undefined, group: '' });
        setIsEditingFinding(false);
        setIsFindingModalOpen(true);
    };

    const handleEditFinding = (finding: PredefinedFinding) => {
        setCurrentFinding(finding);
        setIsEditingFinding(true);
        setIsFindingModalOpen(true);
    };

    const handleDeleteFinding = (id: string) => {
        showConfirmModal({
            title: 'تأكيد الحذف',
            message: 'هل أنت متأكد من حذف هذا البند؟',
            onConfirm: async () => {
                await deletePredefinedFinding(id);
                addNotification({ title: 'نجاح', message: 'تم حذف البند.', type: 'success' });
            }
        });
    };
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressedDataUrl = await compressImageToBase64(file, { maxWidth: 400, maxHeight: 400, quality: 0.7 });
                setCurrentFinding(prev => ({ ...prev, reference_image: compressedDataUrl }));
            } catch (error) {
                console.error("Reference image compression failed:", error);
                addNotification({ title: 'خطأ', message: 'فشل ضغط الصورة المرجعية.', type: 'error' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    setCurrentFinding(prev => ({ ...prev, reference_image: reader.result as string }));
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleSaveFinding = async () => {
        if (!currentFinding.name?.trim() || !currentFinding.category_id) {
            addNotification({ title: 'بيانات ناقصة', message: 'الرجاء إدخال اسم البند.', type: 'error' });
            return;
        }
        if (isEditingFinding) {
            await updatePredefinedFinding(currentFinding as PredefinedFinding);
            addNotification({ title: 'نجاح', message: 'تم تعديل البند.', type: 'success' });
        } else {
            await addPredefinedFinding(currentFinding as Omit<PredefinedFinding, 'id'>);
            addNotification({ title: 'نجاح', message: 'تمت إضافة البند.', type: 'success' });
        }
        setIsFindingModalOpen(false);
    };
    
    return (
        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-bold dark:text-gray-200">بنود فحص لـ "{categoryName}"</h4>
                <Button onClick={handleAddFinding} leftIcon={<Icon name="add"/>}>إضافة بند</Button>
            </div>
            
            <div className="space-y-6">
                {groupedFindings.map(([groupName, findings]) => (
                    <div key={groupName}>
                        <h5 className="font-semibold text-md text-slate-600 dark:text-slate-400 mb-3 border-b pb-2 dark:border-slate-600">{groupName}</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {findings.map(finding => (
                                <div key={finding.id} className="bg-white dark:bg-slate-700 rounded-lg shadow-md border dark:border-slate-600 overflow-hidden flex flex-col transition-shadow hover:shadow-xl">
                                    <div className="h-40 bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 dark:text-slate-500">
                                        {finding.reference_image ? (
                                            <img src={finding.reference_image} alt={finding.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Icon name="gallery" className="w-12 h-12" />
                                        )}
                                    </div>
                                    <div className="p-4 flex-grow flex flex-col">
                                        <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex-grow">{finding.name}</h5>
                                        {finding.options && finding.options.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {finding.options.map(option => (
                                                    <span key={option} className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-full">
                                                        {option}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mt-auto flex justify-end gap-2 pt-2">
                                            <Button variant="secondary" size="sm" onClick={() => handleEditFinding(finding)}>
                                                <Icon name="edit" className="w-4 h-4"/>
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteFinding(finding.id)}>
                                                <Icon name="delete" className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {findingsForCategory.length === 0 && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 border-2 border-dashed dark:border-slate-700 rounded-lg">
                    <p>لا توجد بنود فحص مضافة لهذا التبويب.</p>
                    <p className="text-sm mt-1">يمكنك إضافة بند جديد بالضغط على زر "إضافة بند".</p>
                </div>
            )}

            <Modal isOpen={isFindingModalOpen} onClose={() => setIsFindingModalOpen(false)} title={isEditingFinding ? 'تعديل بند' : 'إضافة بند جديد'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم البند</label>
                        <input type="text" value={currentFinding.name || ''} onChange={e => setCurrentFinding({ ...currentFinding, name: e.target.value })} className={formInputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">المجموعة (اختياري)</label>
                        <input 
                            type="text" 
                            value={currentFinding.group || ''} 
                            onChange={e => setCurrentFinding({ ...currentFinding, group: e.target.value })} 
                            className={formInputClasses}
                            placeholder="مثال: الجهة اليمنى، السقف"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الحالات (افصل بفاصلة)</label>
                        <input type="text" value={Array.isArray(currentFinding.options) ? currentFinding.options.join(', ') : ''} onChange={e => setCurrentFinding({ ...currentFinding, options: e.target.value.split(',').map(s => s.trim()) })} className={formInputClasses} placeholder="سليم, مرشوش, تالف"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">صورة مرجعية (اختياري)</label>
                        <div className="mt-1 flex items-center gap-4">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-slate-600 rounded-md flex items-center justify-center border dark:border-slate-500">
                                {currentFinding.reference_image ? (
                                    <img src={currentFinding.reference_image} alt="معاينة" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <Icon name="camera" className="w-8 h-8 text-gray-400" />
                                )}
                            </div>
                            <input type="file" id="finding-image-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            <div className="flex flex-col gap-2">
                                 <label htmlFor="finding-image-upload" className="cursor-pointer bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors font-semibold text-sm">
                                    تغيير الصورة
                                </label>
                                {currentFinding.reference_image && (
                                    <Button variant="danger" onClick={() => setCurrentFinding(p => ({ ...p, reference_image: undefined }))}>
                                        إزالة
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4"><Button onClick={handleSaveFinding}>حفظ</Button></div>
                </div>
            </Modal>
        </div>
    );
};


const InspectionsManagement: React.FC = () => {
    const { inspectionTypes, addInspectionType, updateInspectionType, deleteInspectionType, customFindingCategories, showConfirmModal, addNotification } = useAppContext();
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [currentType, setCurrentType] = useState<Partial<InspectionType>>({ finding_category_ids: [] });
    const [isEditingType, setIsEditingType] = useState(false);
    const [expandedTypeId, setExpandedTypeId] = useState<string | null>(null);
    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const handleAddType = () => {
        // FIX: Add price property when creating a new type
        setCurrentType({ name: '', price: 0, finding_category_ids: [] });
        setIsEditingType(false);
        setIsTypeModalOpen(true);
    };

    const handleEditType = (type: InspectionType) => {
        setCurrentType(type);
        setIsEditingType(true);
        setIsTypeModalOpen(true);
    };

    const handleDeleteType = (id: string) => {
        showConfirmModal({
            title: 'تأكيد الحذف',
            message: 'هل أنت متأكد من حذف نوع الفحص هذا؟',
            onConfirm: async () => {
                await deleteInspectionType(id);
                addNotification({ title: 'نجاح', message: 'تم حذف نوع الفحص.', type: 'success' });
            }
        });
    };

    const handleSaveType = async () => {
        if (!currentType.name?.trim()) {
            addNotification({ title: 'بيانات ناقصة', message: 'الرجاء إدخال اسم النوع.', type: 'error' });
            return;
        }
        if (isEditingType) {
            await updateInspectionType(currentType as InspectionType);
             addNotification({ title: 'نجاح', message: 'تم تعديل النوع.', type: 'success' });
        } else {
            await addInspectionType(currentType as Omit<InspectionType, 'id'>);
             addNotification({ title: 'نجاح', message: 'تمت إضافة النوع.', type: 'success' });
        }
        setIsTypeModalOpen(false);
    };
    
    const handleCategoryToggle = (catId: string) => {
        setCurrentType(prev => {
            const currentIds = new Set(prev?.finding_category_ids || []);
            if (currentIds.has(catId)) {
                currentIds.delete(catId);
            } else {
                currentIds.add(catId);
            }
            return { ...prev, finding_category_ids: Array.from(currentIds) };
        });
    };

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">أنواع الفحص</h3>
                <Button onClick={handleAddType} leftIcon={<Icon name="add"/>}>إضافة نوع</Button>
            </div>
            {inspectionTypes.map(type => (
               <div key={type.id} className="bg-white dark:bg-gray-700 rounded-md shadow-sm overflow-hidden transition-all duration-300 border dark:border-slate-600">
                  <div className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600/50" onClick={() => setExpandedTypeId(prevId => prevId === type.id ? null : type.id)}>
                    <div className="flex items-center gap-3">
                       <Icon name="chevron-right" className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedTypeId === type.id ? 'rotate-90' : ''}`} />
                       <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">{type.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{type.price} ريال</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleEditType(type); }}><Icon name="edit" className="w-4 h-4"/></Button>
                        <Button variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteType(type.id); }}><Icon name="delete" className="w-4 h-4"/></Button>
                    </div>
                  </div>
                  {expandedTypeId === type.id && (
                    <div className="px-6 pb-4 pt-2 border-t dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 animate-fade-in">
                        <h4 className="font-semibold mb-2 text-sm text-gray-700 dark:text-gray-300">تبويبات الفحص المربوطة:</h4>
                        {type.finding_category_ids.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 marker:text-teal-500">
                            {type.finding_category_ids.map(catId => {
                              const category = customFindingCategories.find(c => c.id === catId);
                              return category ? <li key={catId}>{category.name}</li> : null;
                            })}
                          </ul>
                        ) : ( <p className="text-sm text-gray-500">لا توجد تبويبات مربوطة.</p> )}
                    </div>
                  )}
                </div>
            ))}
             <Modal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} title={isEditingType ? 'تعديل نوع الفحص' : 'إضافة نوع فحص جديد'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">اسم النوع</label>
                        <input type="text" value={currentType.name || ''} onChange={e => setCurrentType(prev => ({...prev, name: e.target.value}))} required className={formInputClasses}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">السعر</label>
                        <input type="number" value={currentType.price || 0} onChange={e => setCurrentType(prev => ({...prev, price: Number(e.target.value)}))} required className={formInputClasses}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">التبويبات المضمنة</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                            {customFindingCategories.map(cat => (
                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <input type="checkbox" checked={currentType.finding_category_ids?.includes(cat.id)} onChange={() => handleCategoryToggle(cat.id)} className="rounded"/>
                                    {cat.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end pt-4"><Button onClick={handleSaveType}>حفظ</Button></div>
                </div>
            </Modal>
        </div>
    );
};


const InspectionSettings: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'types' | 'categories'>('types');

    return (
        <div className="animate-fade-in">
            <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-8 rtl:space-x-reverse" aria-label="Inspection Settings Tabs">
                    <button
                        onClick={() => setActiveSubTab('types')}
                        className={`${activeSubTab === 'types' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-lg focus:outline-none`}
                    >
                        أنواع الفحص
                    </button>
                    <button
                        onClick={() => setActiveSubTab('categories')}
                        className={`${activeSubTab === 'categories' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-600'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-lg focus:outline-none`}
                    >
                        تبويبات وبنود الفحص
                    </button>
                </nav>
            </div>
            <div>
                {activeSubTab === 'types' && <InspectionsManagement />}
                {activeSubTab === 'categories' && <CategoriesAndFindingsManagement />}
            </div>
        </div>
    );
};

export default InspectionSettings;