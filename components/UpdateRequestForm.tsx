import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Client, Car, InspectionRequest, PaymentType, CarMake, CarModel, CarSnapshot } from '../types';
import Button from './Button';
import { uuidv4 } from '../lib/utils';
import LicensePlatePreview from './LicensePlatePreview';
import PlusIcon from './icons/PlusIcon';

interface UpdateRequestFormProps {
    request: InspectionRequest;
    onCancel: () => void;
    onSuccess: () => void;
}

const UpdateRequestForm: React.FC<UpdateRequestFormProps> = ({ request, onCancel, onSuccess }) => {
    const {
        clients, cars, carMakes, carModels, inspectionTypes, brokers, settings,
        updateRequestAndAssociatedData, addClient, addNotification,
        findOrCreateCarMake, findOrCreateCarModel
    } = useAppContext();

    // Form state
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [carMakeId, setCarMakeId] = useState('');
    const [carModelId, setCarModelId] = useState('');
    const [carYear, setCarYear] = useState(new Date().getFullYear());
    const [plateChars, setPlateChars] = useState('');
    const [plateNums, setPlateNums] = useState('');
    const [inspectionTypeId, setInspectionTypeId] = useState('');
    const [inspectionPrice, setInspectionPrice] = useState<number | ''>(0);
    const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.Unpaid);
    const [paymentNote, setPaymentNote] = useState('');
    const [useBroker, setUseBroker] = useState(false);
    const [brokerId, setBrokerId] = useState('');
    const [brokerCommission, setBrokerCommission] = useState(0);
    const [useChassisNumber, setUseChassisNumber] = useState(false);
    const [chassisNumber, setChassisNumber] = useState('');
    const [carMakeSearchTerm, setCarMakeSearchTerm] = useState('');
    const [isMakeDropdownOpen, setIsMakeDropdownOpen] = useState(false);
    const makeDropdownRef = useRef<HTMLDivElement>(null);
    const [carModelSearchTerm, setCarModelSearchTerm] = useState('');
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const modelDropdownRef = useRef<HTMLDivElement>(null);
     
    // State for client suggestions
    const [phoneSuggestions, setPhoneSuggestions] = useState<Client[]>([]);
    const [nameSuggestions, setNameSuggestions] = useState<Client[]>([]);
    const [isPhoneSuggestionsOpen, setIsPhoneSuggestionsOpen] = useState(false);
    const [isNameSuggestionsOpen, setIsNameSuggestionsOpen] = useState(false);
    const phoneInputRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLDivElement>(null);

     // State for keyboard navigation
    const formRef = useRef<HTMLFormElement>(null);
    const [nameSuggestionIndex, setNameSuggestionIndex] = useState(-1);
    const [phoneSuggestionIndex, setPhoneSuggestionIndex] = useState(-1);
    const [makeSuggestionIndex, setMakeSuggestionIndex] = useState(-1);
    const [modelSuggestionIndex, setModelSuggestionIndex] = useState(-1);
    
    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    // Populate state from props on component mount/prop change
    useEffect(() => {
        if (!request) return;

        const currentClient = clients.find(c => c.id === request.client_id);
        if (currentClient) {
            setClientName(currentClient.name);
            setClientPhone(currentClient.phone);
        }

        const currentCar = cars.find(c => c.id === request.car_id);
        if (currentCar) {
            setCarMakeId(currentCar.make_id);
            const make = carMakes.find(m => m.id === currentCar.make_id);
            if (make) setCarMakeSearchTerm(make.name_en);

            setCarModelId(currentCar.model_id);
            const model = carModels.find(m => m.id === currentCar.model_id);
            if(model) setCarModelSearchTerm(model.name_en);

            setCarYear(currentCar.year);

            if (currentCar.plate_number.startsWith('شاصي ')) {
                setUseChassisNumber(true);
                setChassisNumber(currentCar.plate_number.replace('شاصي ', ''));
            } else {
                setUseChassisNumber(false);
                const parts = currentCar.plate_number.split(' ');
                const nums = (parts.pop() || '').replace(/\s/g, '');
                const chars = parts.join('').replace(/\s/g, '');
                setPlateNums(nums.split('').join(' '));
                setPlateChars(chars.split('').join(' '));
            }
        }
        
        setInspectionTypeId(request.inspection_type_id);
        setInspectionPrice(request.price);
        setPaymentType(request.payment_type);
        setPaymentNote(request.payment_note || '');
        
        if (request.broker) {
            setUseBroker(true);
            setBrokerId(request.broker.id);
            setBrokerCommission(request.broker.commission);
        } else {
            setUseBroker(false);
        }
    }, [request]);
    
    const normalizedPlateCharacters = useMemo(() => {
        return settings.plateCharacters.map(pc => ({
            ...pc,
            ar: pc.ar.replace('ـ', '')
        }));
    }, [settings.plateCharacters]);
    
    const allowedPlateChars = useMemo(() => {
        const allowed = new Set<string>();
        normalizedPlateCharacters.forEach((pc) => {
            allowed.add(pc.ar);
            allowed.add(pc.en.toLowerCase());
            allowed.add(pc.en.toUpperCase());
        });
        return allowed;
    }, [normalizedPlateCharacters]);

    const filteredCarMakes = useMemo(() => {
        const term = carMakeSearchTerm.toLowerCase().trim();
        if (!term) return carMakes;
        return carMakes.filter(make => (make.name_ar && make.name_ar.toLowerCase().includes(term)) || (make.name_en && make.name_en.toLowerCase().includes(term)));
    }, [carMakeSearchTerm, carMakes]);

    const filteredCarModels = useMemo(() => {
        if (!carMakeId) return [];
        const term = carModelSearchTerm.toLowerCase().trim();
        const modelsForMake = carModels.filter(model => model.make_id === carMakeId);
        if (!term) return modelsForMake;
        return modelsForMake.filter(model => (model.name_ar && model.name_ar.toLowerCase().includes(term)) || (model.name_en && model.name_en.toLowerCase().includes(term)));
    }, [carModelSearchTerm, carModels, carMakeId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (makeDropdownRef.current && !makeDropdownRef.current.contains(event.target as Node)) {
                setIsMakeDropdownOpen(false);
            }
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
                setIsModelDropdownOpen(false);
            }
            if (phoneInputRef.current && !phoneInputRef.current.contains(event.target as Node)) setIsPhoneSuggestionsOpen(false);
            if (nameInputRef.current && !nameInputRef.current.contains(event.target as Node)) setIsNameSuggestionsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInspectionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newTypeId = e.target.value;
        setInspectionTypeId(newTypeId);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
        setClientPhone(digits);
        if (digits.trim().length < 4) {
            setPhoneSuggestions([]);
            setIsPhoneSuggestionsOpen(false);
            return;
        }
        const matchingClients = clients.filter(c => c.phone.includes(digits));
        setPhoneSuggestions(matchingClients);
        setIsPhoneSuggestionsOpen(matchingClients.length > 0);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setClientName(name);
        if (name.trim().length < 4) {
            setNameSuggestions([]);
            setIsNameSuggestionsOpen(false);
            return;
        }
        const matchingClients = clients.filter(c => c.name && c.name.toLowerCase().includes(name.toLowerCase()));
        setNameSuggestions(matchingClients);
        setIsNameSuggestionsOpen(matchingClients.length > 0);
    };

    const handleSuggestionClick = (client: Client) => {
        setClientName(client.name);
        setClientPhone(client.phone);
        setIsPhoneSuggestionsOpen(false);
        setIsNameSuggestionsOpen(false);
    };
    
    const handlePlateCharChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let filteredChars = '';
        for (const char of value.replace(/\s/g, '')) {
            if (allowedPlateChars.has(char)) {
                filteredChars += char;
            }
        }
        const finalChars = filteredChars.slice(0, 4);
        setPlateChars(finalChars.split('').join(' '));
    };

    const handlePlateNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawNums = e.target.value.replace(/\D/g, '').slice(0, 4);
        setPlateNums(rawNums.split('').join(' '));
    };

    const focusNext = (current: HTMLElement) => {
        if (!formRef.current) return;
        const elements = Array.from(formRef.current.elements).filter(
            (el: HTMLElement) => el.offsetParent !== null && !el.hasAttribute('disabled') && el.tabIndex !== -1
        ) as HTMLElement[];
        const currentIndex = elements.indexOf(current);
        const nextElement = elements[currentIndex + 1];
        if (nextElement) {
            nextElement.focus();
        }
    };
    
    const handleClientSelection = (client: Client, currentInput?: HTMLElement) => {
        handleSuggestionClick(client);
        if (currentInput) {
            setTimeout(() => focusNext(currentInput), 0);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'name' | 'phone' | 'make' | 'model') => {
        let suggestions: any[], isOpen: boolean, setIndex: Function, index: number, selectFn: Function, setOpen: Function;
    
        switch (type) {
            case 'name': [suggestions, isOpen, setIndex, index, selectFn, setOpen] = [nameSuggestions, isNameSuggestionsOpen, setNameSuggestionIndex, nameSuggestionIndex, handleClientSelection, setIsNameSuggestionsOpen]; break;
            case 'phone': [suggestions, isOpen, setIndex, index, selectFn, setOpen] = [phoneSuggestions, isPhoneSuggestionsOpen, setPhoneSuggestionIndex, phoneSuggestionIndex, handleClientSelection, setIsPhoneSuggestionsOpen]; break;
            case 'make': [suggestions, isOpen, setIndex, index, selectFn, setOpen] = [filteredCarMakes, isMakeDropdownOpen, setMakeSuggestionIndex, makeSuggestionIndex, handleMakeSelection, setIsMakeDropdownOpen]; break;
            case 'model': [suggestions, isOpen, setIndex, index, selectFn, setOpen] = [filteredCarModels, isModelDropdownOpen, setModelSuggestionIndex, modelSuggestionIndex, handleModelSelection, setIsModelDropdownOpen]; break;
            default: return;
        }
    
        if (!isOpen || suggestions.length === 0) return;
    
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setIndex((prev: number) => (prev + 1) % suggestions.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setIndex((prev: number) => (prev - 1 + suggestions.length) % suggestions.length);
                break;
            case 'Enter':
                 if (index > -1) {
                    e.preventDefault();
                    selectFn(suggestions[index], e.currentTarget);
                } else if(type === 'make' || type === 'model') {
                    e.preventDefault();
                    setOpen(false);
                    focusNext(e.currentTarget);
                }
                break;
            case 'Tab':
                if (index > -1) {
                    e.preventDefault();
                    selectFn(suggestions[index], e.currentTarget);
                } else if (type === 'make' || type === 'model') {
                    setOpen(false);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setOpen(false);
                break;
        }
    };

    const handleMakeSelection = (make: CarMake, currentInput?: HTMLElement) => {
        setCarMakeId(make.id);
        setCarModelId('');
        setCarMakeSearchTerm(make.name_en);
        setCarModelSearchTerm('');
        setIsMakeDropdownOpen(false);
        if (currentInput) {
            setTimeout(() => focusNext(currentInput), 0);
        } else if (formRef.current) {
            (formRef.current.elements.namedItem('carModelSearch') as HTMLInputElement)?.focus();
        }
    };
    
    const handleModelSelection = (model: CarModel, currentInput?: HTMLElement) => {
        setCarModelId(model.id);
        setCarModelSearchTerm(model.name_en);
        setIsModelDropdownOpen(false);
        if (currentInput) {
            setTimeout(() => focusNext(currentInput), 0);
        }
    };
    
    // --- Plate Preview Logic ---
    const { arToEnMap, enToArMap } = useMemo(() => {
        const arToEn = new Map<string, string>();
        const enToAr = new Map<string, string>();
        normalizedPlateCharacters.forEach(pc => {
            arToEn.set(pc.ar, pc.en);
            enToAr.set(pc.en.toUpperCase(), pc.ar);
        });
        return { arToEnMap: arToEn, enToArMap: enToAr };
    }, [normalizedPlateCharacters]);

    const { previewArabicChars, previewEnglishChars } = useMemo(() => {
        const chars = plateChars.replace(/\s/g, '').slice(0, 4);
        let arabic = '';
        let english = '';

        for (const char of chars) {
            const upperChar = char.toUpperCase();
            if (arToEnMap.has(char)) { // It's Arabic
                arabic += char;
                english += arToEnMap.get(char) || '';
            } else if (enToArMap.has(upperChar)) { // It's English
                arabic += enToArMap.get(upperChar) || '';
                english += upperChar;
            }
        }
        return { previewArabicChars: arabic, previewEnglishChars: english };
    }, [plateChars, arToEnMap, enToArMap]);

    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const convertToArabicNumerals = (numStr: string): string => {
        return numStr.replace(/\s/g, '').split('').map(digit => arabicNumerals[parseInt(digit, 10)] || digit).join('');
    };
    
    const englishTop = previewEnglishChars; // Letters
    const arabicBottom = previewArabicChars; // Letters
    const englishBottom = useMemo(() => plateNums.replace(/\s/g, '').replace(/\D/g, '').slice(0, 4), [plateNums]); // Numbers
    const arabicTop = useMemo(() => convertToArabicNumerals(englishBottom), [englishBottom]); // Numbers


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (clientPhone.length !== 10) {
            addNotification({ title: 'بيانات ناقصة', message: 'رقم الهاتف يجب أن يتكون من 10 أرقام.', type: 'error' });
            return;
        }
        if (!carMakeSearchTerm.trim() || !carModelSearchTerm.trim()) {
            addNotification({ title: 'بيانات ناقصة', message: 'الرجاء إدخال شركة وموديل السيارة.', type: 'error' });
            return;
        }
        if (Number(inspectionPrice) <= 0) {
            addNotification({ title: 'بيانات ناقصة', message: 'قيمة الفحص يجب أن تكون أكبر من صفر.', type: 'error' });
            return;
        }

        try {
            let client = clients.find(c => c.phone === clientPhone);
            if (!client) {
                client = { id: uuidv4(), name: clientName, phone: clientPhone };
                await addClient(client);
            }

            const make = await findOrCreateCarMake(carMakeSearchTerm);
            const model = await findOrCreateCarModel(carModelSearchTerm, make.id);

            const rawPlateChars = plateChars.replace(/\s/g, '');
            let arabicPlateChars = '';
            for (const char of rawPlateChars) {
                const upperChar = char.toUpperCase();
                if (enToArMap.has(upperChar)) {
                    arabicPlateChars += enToArMap.get(upperChar);
                } else {
                    arabicPlateChars += char;
                }
            }

            const plateNumber = useChassisNumber ? `شاصي ${chassisNumber}` : `${arabicPlateChars} ${plateNums.replace(/\s/g, '')}`;
            
            const car_snapshot: CarSnapshot = {
                make_ar: make.name_ar,
                make_en: make.name_en,
                model_ar: model.name_ar,
                model_en: model.name_en,
                year: carYear
            };

            const payload = {
                originalRequest: request,
                formData: {
                    client_id: client.id,
                    car: {
                        make_id: make.id,
                        model_id: model.id,
                        year: carYear,
                        plate_number: plateNumber,
                    },
                    request: {
                        inspection_type_id: inspectionTypeId,
                        payment_type: paymentType,
                        price: Number(inspectionPrice),
                        payment_note: (paymentType === PaymentType.Transfer || paymentType === PaymentType.Unpaid) && paymentNote.trim() ? paymentNote.trim() : undefined,
                        broker: useBroker && brokerId ? { id: brokerId, commission: brokerCommission } : null,
                        car_snapshot: car_snapshot,
                    }
                }
            };
            
            await updateRequestAndAssociatedData(payload);
            addNotification({ title: 'نجاح', message: 'تم تحديث الطلب بنجاح.', type: 'success' });
            onSuccess();
        } catch (error) {
            console.error("Failed to update request:", error);
            addNotification({ title: 'خطأ في تحديث الطلب', message: 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.', type: 'error' });
        }
    };
    
    const activeBrokers = brokers.filter(b => b.is_active);
    const highlightClass = 'bg-blue-100 dark:bg-slate-600';

    return (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
             {/* Client Info */}
              <fieldset className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm">
                  <legend className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">1. بيانات العميل</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative" ref={nameInputRef}>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم العميل</label>
                          <input type="text" value={clientName} onChange={handleNameChange} onKeyDown={(e) => handleKeyDown(e, 'name')} required className={formInputClasses} />
                           {isNameSuggestionsOpen && nameSuggestions.length > 0 && (
                                <ul className="absolute z-20 w-full bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                    {nameSuggestions.map((client, index) => (
                                        <li key={client.id} onMouseDown={() => handleClientSelection(client)} onMouseOver={() => setNameSuggestionIndex(index)} className={`px-4 py-2 cursor-pointer dark:text-slate-200 ${index === nameSuggestionIndex ? highlightClass : 'hover:bg-blue-50 dark:hover:bg-slate-600/50'}`}>
                                            {client.name} - <span className="text-slate-500 dark:text-slate-400">{client.phone}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                      </div>
                      <div className="relative" ref={phoneInputRef}>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
                          <input type="tel" value={clientPhone} onChange={handlePhoneChange} onKeyDown={(e) => handleKeyDown(e, 'phone')} required placeholder="05xxxxxxxx" maxLength={10} style={{ direction: 'ltr', textAlign: 'right' }} className={formInputClasses} />
                           {isPhoneSuggestionsOpen && phoneSuggestions.length > 0 && (
                                <ul className="absolute z-20 w-full bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                    {phoneSuggestions.map((client, index) => (
                                        <li key={client.id} onMouseDown={() => handleClientSelection(client)} onMouseOver={() => setPhoneSuggestionIndex(index)} className={`px-4 py-2 cursor-pointer dark:text-slate-200 ${index === phoneSuggestionIndex ? highlightClass : 'hover:bg-blue-50 dark:hover:bg-slate-600/50'}`}>
                                            <span style={{ direction: 'ltr', display: 'inline-block' }}>{client.phone}</span> ({client.name})
                                        </li>
                                    ))}
                                </ul>
                            )}
                      </div>
                  </div>
              </fieldset>
              
              {/* Car Info */}
              <fieldset className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm">
                  <legend className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">2. بيانات السيارة</legend>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="relative" ref={makeDropdownRef}>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الشركة</label>
                          <input type="text" value={carMakeSearchTerm} onChange={(e) => { setCarMakeSearchTerm(e.target.value); setIsMakeDropdownOpen(true); if(carMakeId) { setCarMakeId(''); setCarModelId(''); setCarModelSearchTerm('');} }} onFocus={() => setIsMakeDropdownOpen(true)} onKeyDown={(e) => handleKeyDown(e, 'make')} placeholder="ابحث أو اختر" className={formInputClasses} />
                          {isMakeDropdownOpen && (
                              <ul className="absolute z-20 w-full bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                                  {filteredCarMakes.map((make, index) => (
                                      <li 
                                          key={make.id} 
                                          onMouseDown={() => handleMakeSelection(make)}
                                          onMouseOver={() => setMakeSuggestionIndex(index)}
                                          className={`px-4 py-2 cursor-pointer dark:text-slate-200 ${index === makeSuggestionIndex ? highlightClass : 'hover:bg-blue-50 dark:hover:bg-slate-600/50'}`}
                                      >
                                        {make.name_en}
                                      </li>
                                  ))}
                                  {carMakeSearchTerm.trim() && !filteredCarMakes.some(m => m.name_en.toLowerCase() === carMakeSearchTerm.trim().toLowerCase() || (m.name_ar && m.name_ar.toLowerCase() === carMakeSearchTerm.trim().toLowerCase())) && (
                                      <li
                                        onMouseDown={() => {
                                            setIsMakeDropdownOpen(false);
                                            const modelInput = formRef.current?.elements.namedItem('carModelSearch') as HTMLInputElement;
                                            if(modelInput) modelInput.focus();
                                        }}
                                        className="px-4 py-2 cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600/50 flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <span>إضافة "{carMakeSearchTerm}"</span>
                                    </li>
                                  )}
                              </ul>
                          )}
                      </div>
                      <div className="relative" ref={modelDropdownRef}>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الموديل</label>
                          <input type="text" name="carModelSearch" value={carModelSearchTerm} onChange={(e) => { setCarModelSearchTerm(e.target.value); setIsModelDropdownOpen(true); }} onFocus={() => setIsModelDropdownOpen(true)} onKeyDown={(e) => handleKeyDown(e, 'model')} placeholder="ابحث أو اختر" disabled={!carMakeSearchTerm.trim()} required className={`${formInputClasses} disabled:bg-slate-100 dark:disabled:bg-slate-800`} />
                          {isModelDropdownOpen && carMakeId && (
                              <ul className="absolute z-10 w-full bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                                  {filteredCarModels.map((model, index) => (
                                      <li 
                                          key={model.id} 
                                          onMouseDown={() => handleModelSelection(model)}
                                          onMouseOver={() => setModelSuggestionIndex(index)}
                                          className={`px-4 py-2 cursor-pointer dark:text-slate-200 ${index === modelSuggestionIndex ? highlightClass : 'hover:bg-blue-50 dark:hover:bg-slate-600/50'}`}
                                      >
                                        {model.name_en}
                                      </li>
                                  ))}
                                   {carModelSearchTerm.trim() && !filteredCarModels.some(m => m.name_en.toLowerCase() === carModelSearchTerm.trim().toLowerCase() || (m.name_ar && m.name_ar.toLowerCase() === carModelSearchTerm.trim().toLowerCase())) && (
                                      <li
                                        onMouseDown={() => {
                                            setIsModelDropdownOpen(false);
                                        }}
                                        className="px-4 py-2 cursor-pointer text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600/50 flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <span>إضافة "{carModelSearchTerm}"</span>
                                    </li>
                                  )}
                              </ul>
                          )}
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">سنة الصنع</label>
                          <input type="number" value={carYear} onChange={e => setCarYear(Number(e.target.value))} required className={formInputClasses} />
                      </div>
                  </div>
                  <div className="border-t dark:border-slate-700 pt-6 mt-6">
                        <div className="flex items-center">
                            <input type="checkbox" id="update-use-chassis" checked={useChassisNumber} onChange={() => setUseChassisNumber(!useChassisNumber)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <label htmlFor="update-use-chassis" className="ms-2 block text-sm text-slate-900 dark:text-slate-300">استخدام رقم الشاصي (VIN) بدلاً من اللوحة</label>
                        </div>
                  </div>
                   {!useChassisNumber ? (
                      <div className="mt-4 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم اللوحة</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input type="text" placeholder="الأحرف" value={plateChars} onChange={handlePlateCharChange} required={!useChassisNumber} className={`${formInputClasses} text-center`} style={{direction: 'ltr'}}/>
                                <input type="text" placeholder="الأرقام" value={plateNums} onChange={handlePlateNumChange} required={!useChassisNumber} className={`${formInputClasses} text-center`} style={{direction: 'ltr'}}/>
                            </div>
                          </div>
                           <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg shadow-inner">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 text-center">معاينة</label>
                                <LicensePlatePreview 
                                    arabicTop={arabicTop}
                                    arabicBottom={arabicBottom}
                                    englishTop={englishTop}
                                    englishBottom={englishBottom}
                                    settings={settings.platePreviewSettings}
                                />
                           </div>
                      </div>
                  ) : (
                      <div className="mt-4 animate-fade-in">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">رقم الشاصي (VIN)</label>
                          <input type="text" value={chassisNumber} onChange={e => setChassisNumber(e.target.value.toUpperCase())} required={useChassisNumber} style={{direction: 'ltr'}} className={formInputClasses}/>
                      </div>
                  )}
              </fieldset>
              
              {/* Request Details */}
              <fieldset className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm">
                  <legend className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">3. تفاصيل الطلب</legend>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الفحص</label>
                            <select value={inspectionTypeId} onChange={handleInspectionTypeChange} required className={formInputClasses}>{inspectionTypes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">قيمة الفحص (ريال)</label>
                            <input type="number" value={inspectionPrice} onChange={e => setInspectionPrice(e.target.value === '' ? '' : Number(e.target.value))} required className={formInputClasses} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">طريقة الدفع</label>
                            <select value={paymentType} onChange={e => setPaymentType(e.target.value as PaymentType)} required className={formInputClasses}>{Object.values(PaymentType).map(pt => (<option key={pt} value={pt}>{pt}</option>))}</select>
                             {(paymentType === PaymentType.Transfer || paymentType === PaymentType.Unpaid) && (
                                <div className="mt-2 animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    ملاحظة للطلب
                                    </label>
                                    <input 
                                        type="text" 
                                        value={paymentNote} 
                                        onChange={e => setPaymentNote(e.target.value)}
                                        placeholder={paymentType === PaymentType.Transfer ? 'مثال: حوالة بنكية، رقم العملية...' : 'مثال: سيتم الدفع غداً...'}
                                        className={formInputClasses}
                                    />
                                </div>
                            )}
                        </div>
                  </div>
              </fieldset>

              {/* Broker Details */}
              <fieldset className="bg-white dark:bg-slate-800/50 p-6 rounded-lg shadow-sm">
                  <legend className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">4. السمسار (اختياري)</legend>
                   <div className="flex items-center">
                        <input type="checkbox" id="update-use-broker" checked={useBroker} onChange={() => setUseBroker(!useBroker)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <label htmlFor="update-use-broker" className="ms-2 block text-sm text-slate-900 dark:text-slate-300">تضمين سمسار في الطلب</label>
                    </div>
                  {useBroker && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 animate-fade-in">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اختر السمسار</label>
                          <select value={brokerId} onChange={e => { const b = brokers.find(br => br.id === e.target.value); setBrokerId(e.target.value); setBrokerCommission(b?.default_commission || 0); }} className={formInputClasses}>
                              <option value="">اختر</option>
                              {activeBrokers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">قيمة العمولة (ريال)</label>
                          <input type="number" value={brokerCommission} onChange={e => setBrokerCommission(Number(e.target.value))} className={formInputClasses} />
                      </div>
                  </div>
                  )}
              </fieldset>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>إلغاء</Button>
                <Button type="submit">حفظ التعديلات</Button>
            </div>
        </form>
    );
};

export default UpdateRequestForm;