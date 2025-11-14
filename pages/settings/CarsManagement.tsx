import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CarMake, CarModel } from '../../types';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import SearchIcon from '../../components/icons/SearchIcon';
import { GoogleGenAI } from "@google/genai";

const normalizeArabic = (text: string) => {
    if (!text) return '';
    return text.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي');
};

const CarsManagement: React.FC = () => {
    const { 
        settings,
        carMakes, addCarMake, updateCarMake, deleteCarMake, deleteAllCarMakes, deleteModelsByMakeId,
        carModels, addCarModel, updateCarModel, deleteCarModel, 
        showConfirmModal, addNotification, addCarMakesBulk, addCarModelsBulk
    } = useAppContext();
    
    const [isMakeModalOpen, setIsMakeModalOpen] = useState(false);
    const [currentMake, setCurrentMake] = useState<Partial<CarMake>>({});
    const [isEditingMake, setIsEditingMake] = useState(false);
    
    const [isModelModalOpen, setIsModelModalOpen] = useState(false);
    const [currentModel, setCurrentModel] = useState<Partial<CarModel>>({});
    const [isEditingModel, setIsEditingModel] = useState(false);
    
    const [selectedMakeId, setSelectedMakeId] = useState<string | null>(carMakes.length > 0 ? carMakes[0].id : null);
    
    const [isBulkMakeModalOpen, setIsBulkMakeModalOpen] = useState(false);
    const [bulkMakesText, setBulkMakesText] = useState('');
    const [isSavingBulk, setIsSavingBulk] = useState(false);

    const [makeSearchTerm, setMakeSearchTerm] = useState('');
    const [modelSearchTerm, setModelSearchTerm] = useState('');
    const [isBulkModelModalOpen, setIsBulkModelModalOpen] = useState(false);
    const [bulkModelsText, setBulkModelsText] = useState('');
    const [isSavingBulkModels, setIsSavingBulkModels] = useState(false);

    const [makeSearchCriteria, setMakeSearchCriteria] = useState('');
    const [isSearchingMakes, setIsSearchingMakes] = useState(false);
    const [editableFoundMakes, setEditableFoundMakes] = useState<{ name_ar: string; name_en: string; selected: boolean; isDuplicate?: boolean }[]>([]);
    const [isMakeResultsModalOpen, setIsMakeResultsModalOpen] = useState(false);

    const [modelSearchCriteria, setModelSearchCriteria] = useState('');
    const [isSearchingModels, setIsSearchingModels] = useState(false);
    const [editableFoundModels, setEditableFoundModels] = useState<{ name_ar: string; name_en: string; selected: boolean; isDuplicate?: boolean }[]>([]);
    const [isModelResultsModalOpen, setIsModelResultsModalOpen] = useState(false);
    
    const [makeFilter, setMakeFilter] = useState<'all' | 'with_models' | 'without_models'>('all');
    const [isAiFindingModelsForMake, setIsAiFindingModelsForMake] = useState<string | null>(null);
    const [aiSearchCount, setAiSearchCount] = useState(20);

    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";
    const searchInputClasses = "block w-full p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const filteredCarMakes = useMemo(() => {
        let makes = carMakes;

        if (makeFilter === 'with_models') {
            const makeIdsWithModels = new Set(carModels.map(model => model.make_id));
            makes = makes.filter(make => makeIdsWithModels.has(make.id));
        } else if (makeFilter === 'without_models') {
            const makeIdsWithModels = new Set(carModels.map(model => model.make_id));
            makes = makes.filter(make => !makeIdsWithModels.has(make.id));
        }

        if (!makeSearchTerm.trim()) {
            return makes;
        }

        const lowercasedTerm = makeSearchTerm.toLowerCase();
        return makes.filter(make => 
            (make.name_ar && make.name_ar.toLowerCase().includes(lowercasedTerm)) || 
            (make.name_en && make.name_en.toLowerCase().includes(lowercasedTerm))
        );
    }, [carMakes, makeSearchTerm, makeFilter, carModels]);

    const modelsForSelectedMake = useMemo(() => {
        if (!selectedMakeId) return [];
        let models = carModels.filter(model => model.make_id === selectedMakeId);
        
        if (modelSearchTerm.trim()) {
            const lowercasedTerm = modelSearchTerm.toLowerCase();
            models = models.filter(model => 
                (model.name_ar && model.name_ar.toLowerCase().includes(lowercasedTerm)) || 
                (model.name_en && model.name_en.toLowerCase().includes(lowercasedTerm))
            );
        }

        return models;
    }, [carModels, selectedMakeId, modelSearchTerm]);

    const makesWithModels = useMemo(() => {
        return new Set(carModels.map(model => model.make_id));
    }, [carModels]);

    // --- Car Make Handlers ---
    const handleAddMake = () => {
        setCurrentMake({});
        setIsEditingMake(false);
        setIsMakeModalOpen(true);
    };

    const handleEditMake = (make: CarMake) => {
        setCurrentMake(make);
        setIsEditingMake(true);
        setIsMakeModalOpen(true);
    };

    const handleDeleteMake = (make: CarMake) => {
        showConfirmModal({
            title: `حذف ${make.name_ar}`,
            message: 'هل أنت متأكد؟ سيتم حذف جميع الموديلات المرتبطة بهذه الشركة.',
            onConfirm: async () => {
                await deleteCarMake(make.id);
                addNotification({ title: 'نجاح', message: `تم حذف ${make.name_ar}.`, type: 'success' });
            }
        });
    };
    
    const handleDeleteAllMakes = () => {
        showConfirmModal({
            title: 'حذف جميع الشركات',
            message: 'هل أنت متأكد من حذف جميع الشركات المصنعة وجميع موديلاتها؟ لا يمكن التراجع عن هذا الإجراء.',
            onConfirm: async () => {
                try {
                    await deleteAllCarMakes();
                    addNotification({ title: 'نجاح', message: 'تم حذف جميع الشركات والموديلات بنجاح.', type: 'success' });
                } catch (error) {
                    addNotification({ title: 'خطأ', message: 'فشل حذف الشركات.', type: 'error' });
                }
            }
        });
    };

    const handleSaveMake = async () => {
        if (!currentMake.name_ar?.trim()) {
             addNotification({ title: 'خطأ', message: 'الرجاء إدخال اسم الشركة.', type: 'error' });
             return;
        }
        if (isEditingMake) {
            await updateCarMake(currentMake as CarMake);
            addNotification({ title: 'نجاح', message: 'تم تعديل الشركة.', type: 'success' });
        } else {
            await addCarMake(currentMake as Omit<CarMake, 'id'>);
            addNotification({ title: 'نجاح', message: 'تمت إضافة الشركة.', type: 'success' });
        }
        setIsMakeModalOpen(false);
    };
    
    const handleSaveBulkMakes = async () => {
        setIsSavingBulk(true);
        const lines = bulkMakesText.split('\n').filter(line => line.trim() !== '');
        const newMakes: Omit<CarMake, 'id'>[] = [];
        const errors: string[] = [];

        lines.forEach((line, index) => {
            const parts = line.split(':');
            if (parts.length === 2) {
                const name_ar = parts[0].trim();
                const name_en = parts[1].trim();
                if (name_en && name_ar) {
                    newMakes.push({ name_en, name_ar });
                } else {
                    errors.push(`السطر ${index + 1}: أحد الأسماء فارغ.`);
                }
            } else {
                errors.push(`السطر ${index + 1}: تنسيق غير صحيح.`);
            }
        });

        if (errors.length > 0) {
            addNotification({ title: 'خطأ في التنسيق', message: errors.join(' '), type: 'error' });
            setIsSavingBulk(false);
            return;
        }
        
        if (newMakes.length > 0) {
            try {
                await addCarMakesBulk(newMakes);
                addNotification({ title: 'نجاح', message: `تمت إضافة ${newMakes.length} شركة بنجاح.`, type: 'success' });
                setIsBulkMakeModalOpen(false);
                setBulkMakesText('');
            } catch (error) {
                addNotification({ title: 'خطأ', message: 'فشل إضافة الشركات.', type: 'error' });
            }
        } else {
             addNotification({ title: 'تنبيه', message: 'لم يتم العثور على بيانات صالحة للإضافة.', type: 'info' });
        }
        setIsSavingBulk(false);
    };

    // --- Gemini Make Search ---
    const handleSearchForMakes = async () => {
        if (!settings.geminiApiKey) {
            addNotification({ title: 'مفتاح API مطلوب', message: 'لاستخدام البحث الذكي، يرجى إضافة مفتاح Gemini API في الإعدادات.', type: 'error' });
            return;
        }
        setIsSearchingMakes(true);
        try {
            const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
            const existingMakes = carMakes.map(m => m.name_en).join(', ');
            const searchFilter = makeSearchCriteria.trim()
                ? `ركز البحث على ${makeSearchCriteria.trim()}.`
                : '';
            const prompt = `أنت خبير في قواعد بيانات السيارات. قائمتي الحالية للشركات هي: ${existingMakes}. ابحث عن ${aiSearchCount} شركة سيارات أخرى شائعة وغير موجودة في قائمتي. ${searchFilter} يجب أن يكون التنسيق لكل سطر "الاسم العربي : الاسم الإنجليزي". لا تقدم أي شرح، فقط القائمة. استخدم ألف بسيطة (ا) بدلاً من الهمزة (أ إ آ).`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const text = response.text;
            const lines = text.split('\n').filter(line => line.includes(':'));
            const newMakes = lines.slice(0, aiSearchCount).map(line => {
                const parts = line.split(':');
                if (parts.length === 2) {
                    return { name_ar: normalizeArabic(parts[0].trim()), name_en: parts[1].trim() };
                }
                return null;
            }).filter(Boolean) as { name_ar: string; name_en: string }[];

            const existingMakeNamesEN = new Set(carMakes.map(m => m.name_en.toLowerCase().trim()));
            const existingMakeNamesAR = new Set(carMakes.map(m => normalizeArabic(m.name_ar).toLowerCase().trim()));

            if (newMakes.length > 0) {
                setEditableFoundMakes(newMakes.map(make => {
                    const isDuplicate = existingMakeNamesEN.has(make.name_en.toLowerCase().trim()) || existingMakeNamesAR.has(normalizeArabic(make.name_ar).toLowerCase().trim());
                    return { ...make, selected: !isDuplicate, isDuplicate };
                }));
                setIsMakeResultsModalOpen(true);
            } else {
                addNotification({ title: 'لم يتم العثور على نتائج', message: 'لم يتمكن البحث من العثور على شركات جديدة.', type: 'info' });
            }
        } catch (error) {
            console.error("Gemini make search error:", error);
            addNotification({ title: 'خطأ', message: 'فشل البحث باستخدام Gemini. يرجى المحاولة مرة أخرى.', type: 'error' });
        } finally {
            setIsSearchingMakes(false);
        }
    };

    const handleEditableMakeChange = (index: number, field: 'name_ar' | 'name_en' | 'selected', value: string | boolean) => {
        setEditableFoundMakes(prev => {
            const newMakes = [...prev];
            const updatedMake = { ...newMakes[index], [field]: value };
            if(field !== 'selected') {
                updatedMake[field as 'name_ar' | 'name_en'] = value as string;
            } else {
                updatedMake.selected = value as boolean;
            }
            newMakes[index] = updatedMake;
            return newMakes;
        });
    };
    
    const handleSelectAllMakes = (checked: boolean) => {
        setEditableFoundMakes(prev => prev.map(make => ({ ...make, selected: make.isDuplicate ? false : checked })));
    };

    const handleConfirmAddMakes = async () => {
        const makesToAdd = editableFoundMakes
            .filter(make => make.selected && make.name_ar.trim() && make.name_en.trim())
            .map(({ name_ar, name_en }) => ({ name_ar, name_en }));
        
        if (makesToAdd.length > 0) {
            await addCarMakesBulk(makesToAdd);
            addNotification({ title: 'نجاح', message: `تمت إضافة ${makesToAdd.length} شركة جديدة.`, type: 'success' });
        }
        setIsMakeResultsModalOpen(false);
        setEditableFoundMakes([]);
    };


    // --- Car Model Handlers ---
    const handleAddModel = () => {
        if (!selectedMakeId) return;
        setCurrentModel({ make_id: selectedMakeId });
        setIsEditingModel(false);
        setIsModelModalOpen(true);
    };

    const handleEditModel = (model: CarModel) => {
        setCurrentModel(model);
        setIsEditingModel(true);
        setIsModelModalOpen(true);
    };

    const handleDeleteModel = (model: CarModel) => {
        showConfirmModal({
            title: `حذف موديل ${model.name_ar}`,
            message: 'هل أنت متأكد من حذف هذا الموديل؟',
            onConfirm: async () => {
                await deleteCarModel(model.id);
                addNotification({ title: 'نجاح', message: 'تم حذف الموديل.', type: 'success' });
            }
        });
    };

    const handleDeleteAllModelsForMake = () => {
        if (!selectedMakeId) return;
        const make = carMakes.find(m => m.id === selectedMakeId);
        if (!make) return;

        showConfirmModal({
            title: `حذف جميع موديلات ${make.name_ar}`,
            message: 'هل أنت متأكد؟ سيتم حذف جميع الموديلات المرتبطة بهذه الشركة. لا يمكن التراجع عن هذا الإجراء.',
            onConfirm: async () => {
                try {
                    await deleteModelsByMakeId(selectedMakeId);
                    addNotification({ title: 'نجاح', message: `تم حذف جميع موديلات ${make.name_ar}.`, type: 'success' });
                } catch (error) {
                    addNotification({ title: 'خطأ', message: 'فشل حذف الموديلات.', type: 'error' });
                }
            }
        });
    };
    
    const handleSaveModel = async () => {
        if (!currentModel.name_ar?.trim() || !currentModel.make_id) {
            addNotification({ title: 'خطأ', message: 'الرجاء إدخال اسم الموديل.', type: 'error' });
            return;
        }
        if (isEditingModel) {
            await updateCarModel(currentModel as CarModel);
            addNotification({ title: 'نجاح', message: 'تم تعديل الموديل.', type: 'success' });
        } else {
            await addCarModel(currentModel as Omit<CarModel, 'id'>);
            addNotification({ title: 'نجاح', message: 'تمت إضافة الموديل.', type: 'success' });
        }
        setIsModelModalOpen(false);
    };
    
    const handleSaveBulkModels = async () => {
        if (!selectedMakeId) {
            addNotification({ title: 'خطأ', message: 'الرجاء تحديد شركة أولاً.', type: 'error' });
            return;
        }
        setIsSavingBulkModels(true);
        const lines = bulkModelsText.split('\n').filter(line => line.trim() !== '');
        const newModels: Omit<CarModel, 'id'>[] = [];
        const errors: string[] = [];

        lines.forEach((line, index) => {
            const parts = line.split(':');
            if (parts.length === 2) {
                const name_en = parts[0].trim();
                const name_ar = parts[1].trim();
                if (name_en && name_ar) {
                    newModels.push({ name_en, name_ar, make_id: selectedMakeId });
                } else {
                    errors.push(`السطر ${index + 1}: أحد الأسماء فارغ.`);
                }
            } else {
                errors.push(`السطر ${index + 1}: تنسيق غير صحيح.`);
            }
        });

        if (errors.length > 0) {
            addNotification({ title: 'خطأ في التنسيق', message: errors.join(' '), type: 'error' });
            setIsSavingBulkModels(false);
            return;
        }
        
        if (newModels.length > 0) {
            try {
                await addCarModelsBulk(newModels);
                addNotification({ title: 'نجاح', message: `تمت إضافة ${newModels.length} موديل بنجاح.`, type: 'success' });
                setIsBulkModelModalOpen(false);
                setBulkModelsText('');
            } catch (error) {
                addNotification({ title: 'خطأ', message: 'فشل إضافة الموديلات.', type: 'error' });
            }
        } else {
             addNotification({ title: 'تنبيه', message: 'لم يتم العثور على بيانات صالحة للإضافة.', type: 'info' });
        }
        setIsSavingBulkModels(false);
    };

    // --- Gemini Model Search ---
    const handleSearchForModels = async () => {
        if (!selectedMakeId) return;
        if (!settings.geminiApiKey) {
            addNotification({ title: 'مفتاح API مطلوب', message: 'لاستخدام البحث الذكي، يرجى إضافة مفتاح Gemini API في الإعدادات.', type: 'error' });
            return;
        }
        
        setIsSearchingModels(true);
        try {
            const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
            const selectedMake = carMakes.find(m => m.id === selectedMakeId);
            if (!selectedMake) return;

            const existingModels = modelsForSelectedMake.map(m => m.name_en).join(', ');
            const searchFilter = modelSearchCriteria.trim()
                ? `ركز البحث على ${modelSearchCriteria.trim()}.`
                : '';
            const prompt = `أنت خبير في قواعد بيانات السيارات. بالنسبة لشركة "${selectedMake.name_en}", لدي الموديلات التالية بالفعل: ${existingModels}. ابحث عن ${aiSearchCount} موديلًا شائعًا آخر لهذه الشركة ليست في قائمتي. ${searchFilter} يجب أن يكون تنسيق كل سطر "الاسم الإنجليزي:الاسم العربي". مهم جداً: لا تقم بتضمين اسم الشركة ("${selectedMake.name_en}" أو "${selectedMake.name_ar}") في اسم الموديل. لا تقم بتضمين أي شرح إضافي، فقط القائمة. تأكد من أن الأسماء العربية لا تحتوي على همزة (أ إ آ), واستخدم ألفًا بسيطة (ا) بدلاً من ذلك.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const text = response.text;

            const lines = text.split('\n').filter(line => line.includes(':'));
            const newModels = lines.slice(0, aiSearchCount).map(line => {
                const parts = line.split(':');
                if (parts.length === 2) {
                    return { name_en: parts[0].trim(), name_ar: normalizeArabic(parts[1].trim()) };
                }
                return null;
            }).filter(Boolean) as { name_ar: string; name_en: string }[];
            
            const existingModelNamesEN = new Set(modelsForSelectedMake.map(m => m.name_en.toLowerCase().trim()));
            const existingModelNamesAR = new Set(modelsForSelectedMake.map(m => normalizeArabic(m.name_ar).toLowerCase().trim()));

            if (newModels.length > 0) {
                setEditableFoundModels(newModels.map(model => {
                    const isDuplicate = existingModelNamesEN.has(model.name_en.toLowerCase().trim()) || existingModelNamesAR.has(normalizeArabic(model.name_ar).toLowerCase().trim());
                    return { ...model, selected: !isDuplicate, isDuplicate };
                }));
                setIsModelResultsModalOpen(true);
            } else {
                 addNotification({ title: 'القائمة محدثة', message: `لم يتم العثور على موديلات جديدة لـ ${selectedMake.name_ar}.`, type: 'info' });
            }
        } catch (error) {
            console.error("Gemini model search error:", error);
            addNotification({ title: 'خطأ', message: 'فشل البحث باستخدام Gemini. يرجى المحاولة مرة أخرى.', type: 'error' });
        } finally {
            setIsSearchingModels(false);
        }
    };
    
    const handleAiFindModelsForMake = async (make: CarMake) => {
        if (!settings.geminiApiKey) {
            addNotification({ title: 'مفتاح API مطلوب', message: 'لاستخدام البحث الذكي، يرجى إضافة مفتاح Gemini API في الإعدادات.', type: 'error' });
            return;
        }
        
        setIsAiFindingModelsForMake(make.id);
        setSelectedMakeId(make.id); // Ensure the correct make is selected for adding models later

        try {
            const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
            
            const prompt = `أنت خبير في قواعد بيانات السيارات. بالنسبة لشركة "${make.name_en}", ابحث عن ${aiSearchCount} موديلًا شائعًا. يجب أن يكون تنسيق كل سطر "الاسم الإنجليزي:الاسم العربي". مهم جداً: لا تقم بتضمين اسم الشركة ("${make.name_en}" أو "${make.name_ar}") في اسم الموديل. لا تقم بتضمين أي شرح إضافي، فقط القائمة. تأكد من أن الأسماء العربية لا تحتوي على همزة (أ إ آ), واستخدم ألفًا بسيطة (ا) بدلاً من ذلك.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            const text = response.text;

            const lines = text.split('\n').filter(line => line.includes(':'));
            const newModels = lines.slice(0, aiSearchCount).map(line => {
                const parts = line.split(':');
                if (parts.length === 2) {
                    return { name_en: parts[0].trim(), name_ar: normalizeArabic(parts[1].trim()) };
                }
                return null;
            }).filter(Boolean) as { name_ar: string; name_en: string }[];
            
            if (newModels.length > 0) {
                setEditableFoundModels(newModels.map(model => ({ ...model, selected: true, isDuplicate: false })));
                setIsModelResultsModalOpen(true);
            } else {
                 addNotification({ title: 'لم يتم العثور على نتائج', message: `لم يتم العثور على موديلات لـ ${make.name_ar}.`, type: 'info' });
            }
        } catch (error) {
            console.error("Gemini model search error:", error);
            addNotification({ title: 'خطأ', message: 'فشل البحث باستخدام Gemini. يرجى المحاولة مرة أخرى.', type: 'error' });
        } finally {
            setIsAiFindingModelsForMake(null);
        }
    };
    
    const handleEditableModelChange = (index: number, field: 'name_ar' | 'name_en' | 'selected', value: string | boolean) => {
        setEditableFoundModels(prev => {
            const newModels = [...prev];
            const updatedModel = { ...newModels[index], [field]: value };
             if(field !== 'selected') {
                updatedModel[field as 'name_ar' | 'name_en'] = value as string;
            } else {
                updatedModel.selected = value as boolean;
            }
            newModels[index] = updatedModel;
            return newModels;
        });
    };

    const handleSelectAllModels = (checked: boolean) => {
        setEditableFoundModels(prev => prev.map(model => ({ ...model, selected: model.isDuplicate ? false : checked })));
    };

    const handleConfirmAddModels = async () => {
        const modelsToAdd = editableFoundModels
            .filter(model => model.selected && model.name_ar.trim() && model.name_en.trim())
            .map(({ name_ar, name_en }) => ({ name_ar, name_en }));

        if (modelsToAdd.length > 0 && selectedMakeId) {
            const modelsWithMakeId = modelsToAdd.map(model => ({ ...model, make_id: selectedMakeId }));
            await addCarModelsBulk(modelsWithMakeId);
            addNotification({ title: 'نجاح', message: `تمت إضافة ${modelsToAdd.length} موديل جديد.`, type: 'success' });
        }
        setIsModelResultsModalOpen(false);
        setEditableFoundModels([]);
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Makes Column */}
            <div className="md:col-span-1 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <h4 className="text-lg font-bold dark:text-gray-200">الشركات المصنعة ({filteredCarMakes.length})</h4>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <Button onClick={() => setIsBulkMakeModalOpen(true)} variant="secondary" size="sm">إضافة دفعة</Button>
                        <Button onClick={handleAddMake} leftIcon={<Icon name="add" />} size="sm">إضافة</Button>
                        <Button onClick={handleDeleteAllMakes} variant="danger" size="sm" disabled={carMakes.length === 0}>حذف الكل</Button>
                    </div>
                </div>
                <div className="mb-4 p-2 border rounded-lg dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50">
                    <div className="flex gap-2">
                        <input 
                            type="text"
                            placeholder="فلتر بحث اختياري (مثال: سيارات يابانية)"
                            value={makeSearchCriteria}
                            onChange={(e) => setMakeSearchCriteria(e.target.value)}
                            className={formInputClasses + " mt-0 text-sm flex-grow"}
                        />
                        <input
                            type="number"
                            value={aiSearchCount}
                            min="1"
                            max="50"
                            onChange={(e) => setAiSearchCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                            className={formInputClasses + " mt-0 text-sm w-20 text-center"}
                            title="عدد النتائج (1-50)"
                        />
                        <Button onClick={handleSearchForMakes} variant="secondary" disabled={isSearchingMakes} className="p-3">
                            {isSearchingMakes ? <Icon name="refresh-cw" className="w-5 h-5 animate-spin"/> : <Icon name="sparkles" className="w-5 h-5"/>}
                        </Button>
                    </div>
                </div>
                <div className="mb-4 relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input 
                        type="text"
                        placeholder="بحث عن شركة..."
                        value={makeSearchTerm}
                        onChange={(e) => setMakeSearchTerm(e.target.value)}
                        className={searchInputClasses}
                    />
                </div>
                <div className="flex items-center justify-start flex-wrap gap-x-6 gap-y-2 mb-4 p-2 rounded-lg bg-slate-200 dark:bg-slate-900/50">
                    <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                        <input type="radio" name="makeFilter" value="all" checked={makeFilter === 'all'} onChange={() => setMakeFilter('all')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">الكل</span>
                    </label>
                    <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                        <input type="radio" name="makeFilter" value="with_models" checked={makeFilter === 'with_models'} onChange={() => setMakeFilter('with_models')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">لديها موديلات</span>
                    </label>
                    <label className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer">
                        <input type="radio" name="makeFilter" value="without_models" checked={makeFilter === 'without_models'} onChange={() => setMakeFilter('without_models')} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">ليس لديها موديلات</span>
                    </label>
                </div>
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {filteredCarMakes.map(make => {
                        const hasNoModels = !makesWithModels.has(make.id);
                        return (
                            <li key={make.id} className={`flex justify-between items-center p-2 rounded-md cursor-pointer ${selectedMakeId === make.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-gray-200 dark:hover:bg-slate-700'}`} onClick={() => setSelectedMakeId(make.id)}>
                                <span className="font-medium dark:text-gray-200">{make.name_ar} <span className="text-gray-500 text-xs">({make.name_en})</span></span>
                                <div className="flex gap-2 items-center">
                                    {hasNoModels && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleAiFindModelsForMake(make); }} 
                                            className="text-purple-500 p-1 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/50"
                                            title="البحث عن موديلات باستخدام AI"
                                            disabled={isAiFindingModelsForMake === make.id}
                                        >
                                            {isAiFindingModelsForMake === make.id 
                                                ? <Icon name="refresh-cw" className="w-4 h-4 animate-spin"/>
                                                : <Icon name="sparkles" className="w-4 h-4" />
                                            }
                                        </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleEditMake(make); }} className="text-yellow-500"><Icon name="edit" className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteMake(make); }} className="text-red-500"><Icon name="delete" className="w-4 h-4" /></button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </div>
            {/* Models Column */}
            <div className="md:col-span-2">
                {selectedMakeId ? (
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
                         <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                            <h4 className="text-lg font-bold dark:text-gray-200">موديلات لـ "{carMakes.find(m => m.id === selectedMakeId)?.name_ar}" ({modelsForSelectedMake.length})</h4>
                            <div className="flex gap-2 flex-wrap justify-end">
                                <Button onClick={() => setIsBulkModelModalOpen(true)} variant="secondary" size="sm">إضافة دفعة</Button>
                                <Button onClick={handleAddModel} leftIcon={<Icon name="add" />} size="sm">إضافة</Button>
                                <Button onClick={handleDeleteAllModelsForMake} variant="danger" size="sm" disabled={!selectedMakeId || modelsForSelectedMake.length === 0}>حذف الكل</Button>
                            </div>
                        </div>
                        <div className="mb-4 p-2 border rounded-lg dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50">
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    placeholder="فلتر بحث اختياري (مثال: موديلات SUV)"
                                    value={modelSearchCriteria}
                                    onChange={(e) => setModelSearchCriteria(e.target.value)}
                                    className={formInputClasses + " mt-0 text-sm flex-grow"}
                                    disabled={!selectedMakeId}
                                />
                                <input
                                    type="number"
                                    value={aiSearchCount}
                                    min="1"
                                    max="50"
                                    onChange={(e) => setAiSearchCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                                    className={formInputClasses + " mt-0 text-sm w-20 text-center"}
                                    title="عدد النتائج (1-50)"
                                    disabled={!selectedMakeId}
                                />
                                <Button onClick={handleSearchForModels} variant="secondary" disabled={isSearchingModels || !selectedMakeId} className="p-3">
                                    {isSearchingModels ? <Icon name="refresh-cw" className="w-5 h-5 animate-spin"/> : <Icon name="sparkles" className="w-5 h-5"/>}
                                </Button>
                            </div>
                        </div>
                        <div className="mb-4 relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <SearchIcon className="h-5 w-5 text-gray-400" />
                            </span>
                            <input 
                                type="text"
                                placeholder="بحث عن موديل..."
                                value={modelSearchTerm}
                                onChange={(e) => setModelSearchTerm(e.target.value)}
                                className={searchInputClasses}
                            />
                        </div>
                        <ul className="space-y-2">
                           {modelsForSelectedMake.map(model => (
                                <li key={model.id} className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded-md">
                                    <span className="font-medium dark:text-gray-200">{model.name_ar} <span className="text-sm text-slate-500 font-mono">{model.name_en}</span></span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditModel(model)} className="text-yellow-500"><Icon name="edit" className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteModel(model)} className="text-red-500"><Icon name="delete" className="w-4 h-4" /></button>
                                    </div>
                                </li>
                           ))}
                        </ul>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-slate-800/50 rounded-md">
                        <p className="text-gray-500 dark:text-gray-400">اختر شركة لعرض موديلاتها.</p>
                    </div>
                )}
            </div>

            {/* Make Modal */}
            <Modal isOpen={isMakeModalOpen} onClose={() => setIsMakeModalOpen(false)} title={isEditingMake ? 'تعديل شركة' : 'إضافة شركة'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">الاسم (عربي)</label>
                        <input type="text" value={currentMake.name_ar || ''} onChange={e => setCurrentMake(p => ({...p, name_ar: e.target.value}))} className={formInputClasses} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">الاسم (إنجليزي)</label>
                        <input type="text" value={currentMake.name_en || ''} onChange={e => setCurrentMake(p => ({...p, name_en: e.target.value}))} className={formInputClasses} />
                    </div>
                </div>
                <div className="flex justify-end pt-4"><Button onClick={handleSaveMake}>حفظ</Button></div>
            </Modal>
            
            {/* Bulk Make Modal */}
            <Modal isOpen={isBulkMakeModalOpen} onClose={() => setIsBulkMakeModalOpen(false)} title="إضافة شركات دفعة واحدة">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        الصق قائمة الشركات هنا. يجب أن يكون كل سطر يحتوي على اسم الشركة بالعربي ثم نقطتين (:) ثم الاسم بالإنجليزية.
                    </p>
                    <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-md text-xs text-gray-500 dark:text-gray-300">
                        <p>مثال:</p>
                        <pre className="mt-1" dir="ltr" style={{ textAlign: 'left' }}>
                            تويوتا : TOYOTA
                            {"\n"}
                            هيونداي : HYUNDAI
                        </pre>
                    </div>
                    <textarea
                        rows={10}
                        value={bulkMakesText}
                        onChange={(e) => setBulkMakesText(e.target.value)}
                        className={formInputClasses}
                        placeholder="تويوتا : TOYOTA..."
                        dir="rtl"
                        style={{ textAlign: 'right' }}
                    />
                </div>
                <div className="flex justify-end pt-4 mt-2 border-t dark:border-slate-700 gap-2">
                    <Button variant="secondary" onClick={() => setIsBulkMakeModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSaveBulkMakes} disabled={isSavingBulk || !bulkMakesText.trim()}>{isSavingBulk ? 'جاري الحفظ...' : 'حفظ'}</Button>
                </div>
            </Modal>
            
            {/* Gemini Make Results Modal */}
            <Modal isOpen={isMakeResultsModalOpen} onClose={() => setIsMakeResultsModalOpen(false)} title="شركات تم العثور عليها بواسطة AI" size="3xl">
                <p className="mb-4">وجد Gemini الشركات التالية. يمكنك تحديد ما تريد إضافته وتعديل الأسماء قبل الحفظ.</p>
                <div className="max-h-96 overflow-y-auto border rounded-md dark:border-slate-700">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                            <tr>
                                <th className="p-2 w-12"><input type="checkbox" className="rounded" checked={editableFoundMakes.every(m => m.selected)} onChange={e => handleSelectAllMakes(e.target.checked)} /></th>
                                <th className="p-2 text-right">الاسم العربي</th>
                                <th className="p-2 text-right">الاسم الإنجليزي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editableFoundMakes.map((make, index) => (
                                <tr key={index} className={`border-t dark:border-slate-700 ${make.isDuplicate ? 'bg-slate-100 dark:bg-slate-800 opacity-60' : ''}`}>
                                    <td className="p-2 text-center">
                                        <input type="checkbox" className="rounded" checked={make.selected} onChange={e => handleEditableMakeChange(index, 'selected', e.target.checked)} disabled={make.isDuplicate} />
                                    </td>
                                    <td className="p-1">
                                        <input type="text" value={make.name_ar} onChange={e => handleEditableMakeChange(index, 'name_ar', e.target.value)} className="w-full p-2 bg-transparent rounded-md focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500 outline-none" disabled={make.isDuplicate} />
                                    </td>
                                    <td className="p-1">
                                        <div className="flex items-center gap-2">
                                            <input type="text" value={make.name_en} onChange={e => handleEditableMakeChange(index, 'name_en', e.target.value)} className="w-full p-2 bg-transparent rounded-md focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500 outline-none" disabled={make.isDuplicate} />
                                            {make.isDuplicate && <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold whitespace-nowrap">موجود</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsMakeResultsModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleConfirmAddMakes} disabled={editableFoundMakes.filter(m => m.selected).length === 0}>إضافة المحدد ({editableFoundMakes.filter(m => m.selected).length})</Button>
                </div>
            </Modal>
            
            {/* Bulk Model Modal */}
            <Modal isOpen={isBulkModelModalOpen} onClose={() => setIsBulkModelModalOpen(false)} title={`إضافة موديلات دفعة واحدة لـ ${carMakes.find(m => m.id === selectedMakeId)?.name_ar}`}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        الصق قائمة الموديلات هنا. يجب أن يكون كل سطر يحتوي على اسم الموديل بالإنجليزية ثم نقطتين (:) ثم الاسم بالعربية.
                    </p>
                    <div className="p-2 bg-gray-100 dark:bg-slate-700 rounded-md text-xs text-gray-500 dark:text-gray-300">
                        <p>مثال:</p>
                        <pre className="mt-1" dir="ltr" style={{ textAlign: 'left' }}>
                            CAMRY:كامري
                            {"\n"}
                            COROLLA:كورولا
                        </pre>
                    </div>
                    <textarea
                        rows={10}
                        value={bulkModelsText}
                        onChange={(e) => setBulkModelsText(e.target.value)}
                        className={formInputClasses}
                        placeholder="CAMRY:كامري..."
                        dir="ltr"
                        style={{ textAlign: 'left' }}
                    />
                </div>
                <div className="flex justify-end pt-4 mt-2 border-t dark:border-slate-700 gap-2">
                    <Button variant="secondary" onClick={() => setIsBulkModelModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleSaveBulkModels} disabled={isSavingBulkModels || !bulkModelsText.trim()}>{isSavingBulkModels ? 'جاري الحفظ...' : 'حفظ'}</Button>
                </div>
            </Modal>

            {/* Gemini Model Results Modal */}
            <Modal isOpen={isModelResultsModalOpen} onClose={() => setIsModelResultsModalOpen(false)} title={`موديلات تم العثور عليها لـ ${carMakes.find(m => m.id === selectedMakeId)?.name_ar}`} size="3xl">
                <p className="mb-4">وجد Gemini الموديلات التالية. يمكنك تحديد ما تريد إضافته وتعديل الأسماء قبل الحفظ.</p>
                <div className="max-h-96 overflow-y-auto border rounded-md dark:border-slate-700">
                     <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700">
                            <tr>
                                <th className="p-2 w-12"><input type="checkbox" className="rounded" checked={editableFoundModels.every(m => m.selected)} onChange={e => handleSelectAllModels(e.target.checked)} /></th>
                                <th className="p-2 text-right">الاسم الإنجليزي</th>
                                <th className="p-2 text-right">الاسم العربي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editableFoundModels.map((model, index) => (
                                <tr key={index} className={`border-t dark:border-slate-700 ${model.isDuplicate ? 'bg-slate-100 dark:bg-slate-800 opacity-60' : ''}`}>
                                    <td className="p-2 text-center">
                                        <input type="checkbox" className="rounded" checked={model.selected} onChange={e => handleEditableModelChange(index, 'selected', e.target.checked)} disabled={model.isDuplicate} />
                                    </td>
                                    <td className="p-1">
                                        <input type="text" value={model.name_en} onChange={e => handleEditableModelChange(index, 'name_en', e.target.value)} className="w-full p-2 bg-transparent rounded-md focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500 outline-none" disabled={model.isDuplicate} />
                                    </td>
                                    <td className="p-1">
                                        <div className="flex items-center gap-2">
                                            <input type="text" value={model.name_ar} onChange={e => handleEditableModelChange(index, 'name_ar', e.target.value)} className="w-full p-2 bg-transparent rounded-md focus:bg-white dark:focus:bg-slate-800 focus:ring-1 focus:ring-blue-500 outline-none" disabled={model.isDuplicate} />
                                            {model.isDuplicate && <span className="text-xs text-yellow-600 dark:text-yellow-400 font-semibold whitespace-nowrap">موجود</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                    <Button variant="secondary" onClick={() => setIsModelResultsModalOpen(false)}>إلغاء</Button>
                    <Button onClick={handleConfirmAddModels} disabled={editableFoundModels.filter(m => m.selected).length === 0}>إضافة المحدد ({editableFoundModels.filter(m => m.selected).length})</Button>
                </div>
            </Modal>

            {/* Model Modal */}
            <Modal isOpen={isModelModalOpen} onClose={() => setIsModelModalOpen(false)} title={isEditingModel ? 'تعديل موديل' : 'إضافة موديل'}>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">الاسم (عربي)</label>
                        <input type="text" value={currentModel.name_ar || ''} onChange={e => setCurrentModel(p => ({...p, name_ar: e.target.value}))} className={formInputClasses} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">الاسم (إنجليزي)</label>
                        <input type="text" value={currentModel.name_en || ''} onChange={e => setCurrentModel(p => ({...p, name_en: e.target.value}))} className={formInputClasses} />
                    </div>
                </div>
                <div className="flex justify-end pt-4"><Button onClick={handleSaveModel}>حفظ</Button></div>
            </Modal>
        </div>
    );
};

export default CarsManagement;