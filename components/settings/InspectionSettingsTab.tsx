

import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { InspectionType, CustomFindingCategory, PredefinedFinding } from '../../types';
import Button from '../Button';
import Icon from '../Icon';
import Modal from '../Modal';

const uuidv4 = () => crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); });


const InspectionSettingsTab: React.FC = () => {
    const {
        inspectionTypes, addInspectionType, updateInspectionType, deleteInspectionType,
        customFindingCategories, addFindingCategory, updateFindingCategory, deleteFindingCategory,
        predefinedFindings, addPredefinedFinding, updatePredefinedFinding, deletePredefinedFinding,
    } = useAppContext();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<React.ReactNode>(null);
    const [modalTitle, setModalTitle] = useState('');
    const [expandedTypeId, setExpandedTypeId] = useState<string | null>(null);

    // --- Inspection Type Management ---
    const handleAddType = () => {
        setModalTitle('إضافة نوع فحص جديد');
        setModalContent(<TypeForm onClose={() => setIsModalOpen(false)} onSave={addInspectionType} />);
        setIsModalOpen(true);
    };

    const handleEditType = (type: InspectionType) => {
        setModalTitle('تعديل نوع الفحص');
        setModalContent(<TypeForm type={type} onClose={() => setIsModalOpen(false)} onSave={(data) => updateInspectionType({ ...data, id: type.id } as InspectionType)} />);
        setIsModalOpen(true);
    };

    // --- Finding Category Management ---
    const handleAddCategory = () => {
        setModalTitle('إضافة تبويب فحص جديد');
        setModalContent(<CategoryForm onClose={() => setIsModalOpen(false)} onSave={addFindingCategory} />);
        setIsModalOpen(true);
    };
    
    const handleEditCategory = (category: CustomFindingCategory) => {
        setModalTitle('تعديل تبويب الفحص');
        setModalContent(<CategoryForm category={category} onClose={() => setIsModalOpen(false)} onSave={(data) => updateFindingCategory({ ...data, id: category.id })} />);
        setIsModalOpen(true);
    };

    // --- Predefined Finding Management ---
    const handleAddFinding = () => {
        setModalTitle('إضافة بند فحص جديد');
        setModalContent(<FindingForm onClose={() => setIsModalOpen(false)} onSave={addPredefinedFinding} />);
        setIsModalOpen(true);
    };

    const handleEditFinding = (finding: PredefinedFinding) => {
        setModalTitle('تعديل بند الفحص');
        setModalContent(<FindingForm finding={finding} onClose={() => setIsModalOpen(false)} onSave={(data) => updatePredefinedFinding({ ...data, id: finding.id })} />);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-10">
            {/* Inspection Types Section */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">أنواع الفحص</h3>
                    <Button onClick={handleAddType} leftIcon={<Icon name="add" className="w-5 h-5"/>}>
                        إضافة نوع
                    </Button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2">
                    {inspectionTypes.map(type => (
                       <div key={type.id} className="bg-white dark:bg-gray-700 rounded-md shadow-sm overflow-hidden transition-all duration-300">
                          <div 
                            className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600/50"
                            onClick={() => setExpandedTypeId(prevId => prevId === type.id ? null : type.id)}
                          >
                            <div className="flex items-center gap-3">
                               <Icon name="chevron-right" className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedTypeId === type.id ? 'rotate-90' : ''}`} />
                               <div>
                                  <p className="font-semibold text-gray-800 dark:text-gray-200">{type.name}</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{type.price} ريال</p>
                               </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleEditType(type); }}><Icon name="edit" className="w-4 h-4"/></Button>
                                <Button variant="danger" onClick={(e) => { e.stopPropagation(); deleteInspectionType(type.id); }}><Icon name="delete" className="w-4 h-4"/></Button>
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
                                ) : (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد تبويبات مربوطة. يمكنك تعديل النوع لإضافة تبويبات.</p>
                                )}
                            </div>
                          )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Finding Categories Section */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">إدارة تبويبات الفحص</h3>
                     <Button onClick={handleAddCategory} leftIcon={<Icon name="add" className="w-5 h-5"/>}>
                        إضافة تبويب
                    </Button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2">
                    {customFindingCategories.map(cat => (
                         <div key={cat.id} className="flex justify-between items-center bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{cat.name}</p>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => handleEditCategory(cat)}><Icon name="edit" className="w-4 h-4"/></Button>
                                <Button variant="danger" onClick={() => deleteFindingCategory(cat.id)}><Icon name="delete" className="w-4 h-4"/></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            
            {/* Predefined Findings Section */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">إدارة بنود الفحص</h3>
                     <Button onClick={handleAddFinding} leftIcon={<Icon name="add" className="w-5 h-5"/>}>
                        إضافة بند
                    </Button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2">
                    {predefinedFindings.map(finding => (
                         <div key={finding.id} className="flex justify-between items-center bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{finding.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full inline-block mt-1">
                                    {customFindingCategories.find(c => c.id === finding.category_id)?.name || 'غير مصنف'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => handleEditFinding(finding)}><Icon name="edit" className="w-4 h-4"/></Button>
                                <Button variant="danger" onClick={() => deletePredefinedFinding(finding.id)}><Icon name="delete" className="w-4 h-4"/></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
                {modalContent}
            </Modal>
        </div>
    );
};


// --- FORMS ---

const TypeForm: React.FC<{ type?: InspectionType, onClose: () => void, onSave: (data: any) => void }> = ({ type, onClose, onSave }) => {
    const { customFindingCategories } = useAppContext();
    const [name, setName] = useState(type?.name || '');
    // FIX: Accessing `price` property which exists on InspectionType now.
    const [price, setPrice] = useState(type?.price || 0);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(type?.finding_category_ids || []));

    const handleCategoryToggle = (catId: string) => {
        setSelectedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(catId)) newSet.delete(catId);
            else newSet.add(catId);
            return newSet;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, price, finding_category_ids: Array.from(selectedCategories) });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">اسم النوع</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
            </div>
            <div>
                <label className="block text-sm font-medium">السعر (ريال)</label>
                <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} required className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
            </div>
            <div>
                <label className="block text-sm font-medium mb-2">تبويبات الفحص المضمنة</label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded-md dark:border-gray-600">
                    {customFindingCategories.map(cat => (
                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                            <input type="checkbox" checked={selectedCategories.has(cat.id)} onChange={() => handleCategoryToggle(cat.id)} className="rounded"/>
                            {cat.name}
                        </label>
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700"><Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button><Button type="submit">حفظ</Button></div>
        </form>
    );
};

const CategoryForm: React.FC<{ category?: CustomFindingCategory, onClose: () => void, onSave: (data: any) => void }> = ({ category, onClose, onSave }) => {
    const [name, setName] = useState(category?.name || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name });
        onClose();
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">اسم التبويب</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700"><Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button><Button type="submit">حفظ</Button></div>
        </form>
    );
};

const FindingForm: React.FC<{ finding?: PredefinedFinding, onClose: () => void, onSave: (data: any) => void }> = ({ finding, onClose, onSave }) => {
    const { customFindingCategories } = useAppContext();
    const [name, setName] = useState(finding?.name || '');
    const [categoryId, setCategoryId] = useState(finding?.category_id || '');
    const [options, setOptions] = useState(finding?.options.join(', ') || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, category_id: categoryId, options: options.split(',').map(o => o.trim()).filter(Boolean) });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium">اسم البند</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
            </div>
             <div>
                <label className="block text-sm font-medium">التبويب</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="">اختر تبويب...</option>
                    {customFindingCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium">الحالات المحتملة (افصل بينها بفاصلة ,)</label>
                <input type="text" value={options} onChange={e => setOptions(e.target.value)} placeholder="مثال: سليم, مرشوش, تالف" className="mt-1 block w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"/>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700"><Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button><Button type="submit">حفظ</Button></div>
        </form>
    );
};


export default InspectionSettingsTab;