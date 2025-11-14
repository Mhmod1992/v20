import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Employee, Role, Permission, PERMISSIONS } from '../../types';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import UserCircleIcon from '../../components/icons/UserCircleIcon';

const roleNames: Record<Role, string> = {
    general_manager: 'مدير عام',
    manager: 'مدير',
    employee: 'موظف',
};

const defaultPermissionsByRole: Record<Role, Permission[]> = {
    general_manager: Object.keys(PERMISSIONS) as Permission[],
    manager: [
        'view_dashboard',
        'view_financials',
        'manage_clients',
        'create_requests',
        'fill_requests',
        'update_requests_data',
        'delete_requests',
        'view_request_info',
        'print_request',
        'view_activity_log',
        'manage_notes',
        'manage_findings',
        'change_request_status',
        'manage_brokers',
    ],
    employee: [
        'view_dashboard',
        'create_requests',
        'fill_requests',
        'view_request_info',
        'manage_notes',
        'manage_findings',
    ],
};

const permissionGroups: Record<string, Permission[]> = {
    'الوصول العام': ['view_dashboard', 'view_financials'],
    'إدارة الطلبات': [
        'create_requests', 'update_requests_data', 'delete_requests'
    ],
    'تعبئة الفحص': [
        'fill_requests', 'view_request_info', 'print_request', 'view_activity_log',
        'manage_notes', 'manage_findings', 'change_request_status'
    ],
    'إدارة': [
        'manage_clients', 'manage_employees', 'manage_brokers'
    ],
    'الإعدادات': [
        'manage_settings_general', 'manage_settings_technical'
    ]
};


const EmployeesManagement: React.FC = () => {
    const { employees, addEmployee, updateEmployee, deleteEmployee, showConfirmModal, addNotification } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState<Partial<Employee>>({});
    const [isEditing, setIsEditing] = useState(false);
    const formInputClasses = "mt-1 block w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-200 transition-colors duration-200";

    const handleAdd = () => {
        const defaultRole: Role = 'employee';
        setCurrentEmployee({
            name: '',
            role: defaultRole,
            is_active: true,
            permissions: defaultPermissionsByRole[defaultRole],
            pin: ''
        });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const handleEdit = (employee: Employee) => {
        setCurrentEmployee({ ...employee, pin: '' }); // Clear pin field for editing
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleDelete = (employee: Employee) => {
        showConfirmModal({
            title: `حذف الموظف ${employee.name}`,
            message: 'هل أنت متأكد من حذف هذا الموظف؟',
            onConfirm: async () => {
                await deleteEmployee(employee.id);
                addNotification({ title: 'نجاح', message: 'تم حذف الموظف.', type: 'success' });
            }
        });
    };

    const handlePermissionChange = (permission: Permission) => {
        setCurrentEmployee(prev => {
            const currentPermissions = prev.permissions || [];
            const newPermissions = currentPermissions.includes(permission)
                ? currentPermissions.filter(p => p !== permission)
                : [...currentPermissions, permission];
            return { ...prev, permissions: newPermissions };
        });
    };
    
    const handleRoleChange = (newRole: Role) => {
        setCurrentEmployee(prev => ({
            ...prev,
            role: newRole,
            permissions: defaultPermissionsByRole[newRole] || []
        }));
    };

    const handleSave = async () => {
        if (!currentEmployee.name?.trim()) {
            addNotification({ title: 'خطأ', message: 'الرجاء إدخال اسم الموظف.', type: 'error' });
            return;
        }

        if (!isEditing && (!currentEmployee.pin || currentEmployee.pin.length < 4)) {
            addNotification({ title: 'خطأ', message: 'الرقم السري للموظف الجديد يجب أن يتكون من 4 أرقام على الأقل.', type: 'error' });
            return;
        }

        if (isEditing && currentEmployee.pin && currentEmployee.pin.length < 4) {
            addNotification({ title: 'خطأ', message: 'الرقم السري الجديد يجب أن يتكون من 4 أرقام على الأقل.', type: 'error' });
            return;
        }

        const employeeData: Partial<Employee> = {
            id: currentEmployee.id,
            name: currentEmployee.name,
            role: currentEmployee.role || 'employee',
            is_active: currentEmployee.is_active ?? true,
            permissions: currentEmployee.role === 'general_manager' ? Object.keys(PERMISSIONS) as Permission[] : (currentEmployee.permissions || []),
        };

        // Only include the pin if it has been changed
        if (currentEmployee.pin && currentEmployee.pin.trim() !== '') {
            employeeData.pin = currentEmployee.pin;
        }

        if (isEditing) {
            await updateEmployee(employeeData as Pick<Employee, 'id'> & Partial<Employee>);
            addNotification({ title: 'نجاح', message: 'تم تعديل الموظف.', type: 'success' });
        } else {
            const { id, ...newEmployeeData } = employeeData;
            await addEmployee(newEmployeeData as Omit<Employee, 'id'>);
            addNotification({ title: 'نجاح', message: 'تمت إضافة الموظف.', type: 'success' });
        }
        setIsModalOpen(false);
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">إدارة الموظفين والصلاحيات</h3>
                <Button onClick={handleAdd} leftIcon={<Icon name="add" />}>إضافة موظف</Button>
            </div>
            <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm text-right">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3">الاسم</th>
                            <th className="px-6 py-3">الدور</th>
                            <th className="px-6 py-3">الحالة</th>
                            <th className="px-6 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.length > 0 ? (
                            employees.map(employee => (
                                <tr key={employee.id} className="border-b dark:border-gray-700">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{employee.name}</td>
                                    <td className="px-6 py-4">{roleNames[employee.role]}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${employee.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                                            {employee.is_active ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <Button variant="secondary" onClick={() => handleEdit(employee)}><Icon name="edit" className="w-4 h-4"/></Button>
                                        <Button variant="danger" onClick={() => handleDelete(employee)}><Icon name="delete" className="w-4 h-4"/></Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr>
                                <td colSpan={4}>
                                    <div className="text-center p-8">
                                        <UserCircleIcon className="w-16 h-16 mx-auto text-gray-400" />
                                        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-200">لا يوجد موظفون بعد</h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">ابدأ بإضافة موظفك الأول لإدارة الطلبات.</p>
                                        <div className="mt-6">
                                            <Button onClick={handleAdd} leftIcon={<Icon name="add" />}>
                                                إضافة موظف جديد
                                            </Button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? 'تعديل موظف' : 'إضافة موظف'}>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium">الاسم</label>
                        <input type="text" value={currentEmployee.name || ''} onChange={e => setCurrentEmployee(p => ({...p, name: e.target.value}))} className={formInputClasses} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium">الدور</label>
                        <select value={currentEmployee.role} onChange={e => handleRoleChange(e.target.value as Role)} className={formInputClasses}>
                            <option value="employee">موظف</option>
                            <option value="manager">مدير</option>
                            <option value="general_manager">مدير عام</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">الرقم السري (PIN)</label>
                        <input 
                            type="password"
                            value={currentEmployee.pin || ''}
                            onChange={e => setCurrentEmployee(p => ({ ...p, pin: e.target.value }))}
                            className={formInputClasses}
                            placeholder={isEditing ? 'اتركه فارغاً لعدم التغيير' : '4 أرقام على الأقل'}
                            minLength={4}
                        />
                    </div>

                    {currentEmployee.role !== 'general_manager' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium mb-2">الصلاحيات</label>
                            <div className="space-y-4 p-4 border rounded-md dark:border-slate-600 max-h-72 overflow-y-auto">
                                {Object.entries(permissionGroups).map(([groupName, groupPermissions]) => (
                                    <div key={groupName}>
                                        <h4 className="font-semibold text-gray-600 dark:text-gray-400 mb-2 border-b pb-1 dark:border-slate-600">{groupName}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {(groupPermissions as Permission[]).map((key) => {
                                                if (!(key in PERMISSIONS)) return null;
                                                return (
                                                    <label key={key} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-600/50 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            id={`perm-${key}`}
                                                            className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                                                            checked={currentEmployee.permissions?.includes(key)}
                                                            onChange={() => handlePermissionChange(key)}
                                                        />
                                                        <span className="text-gray-700 dark:text-gray-300">{PERMISSIONS[key]}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {currentEmployee.role === 'general_manager' && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md text-center">
                            المدير العام يمتلك جميع الصلاحيات تلقائياً.
                        </div>
                    )}
                    
                    <div>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={currentEmployee.is_active} onChange={e => setCurrentEmployee(p => ({...p, is_active: e.target.checked}))} className="rounded" />
                            <span>نشط</span>
                        </label>
                    </div>
                </div>
                <div className="flex justify-end pt-4 mt-6 border-t dark:border-slate-600">
                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="ms-3">إلغاء</Button>
                    <Button onClick={handleSave}>حفظ</Button>
                </div>
            </Modal>
        </div>
    );
};

export default EmployeesManagement;