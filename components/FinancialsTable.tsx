import React from 'react';
import { InspectionRequest, PaymentType } from '../types';
import { useAppContext } from '../context/AppContext';

interface FinancialsTableProps {
  requests: InspectionRequest[];
  title: string;
}

const FinancialsTable: React.FC<FinancialsTableProps> = ({ requests, title }) => {
  const { clients, cars, carMakes, carModels } = useAppContext();

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || 'غير معروف';
  };
  
  const getCarInfo = (carId: string) => {
    const car = cars.find(c => c.id === carId);
    if (!car) return 'سيارة غير معروفة';
    const make = carMakes.find(m => m.id === car.make_id)?.name_ar;
    const model = carModels.find(m => m.id === car.model_id)?.name_ar;
    return `${make || ''} ${model || ''} (${car.year})`;
  };
  
  const getPaymentTypeLabel = (type: PaymentType) => {
    if (type === PaymentType.Cash) return 'كاش';
    return type;
  };


  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 p-4 border-b dark:border-slate-700">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">العميل</th>
              <th className="px-6 py-3">السيارة</th>
              <th className="px-6 py-3">التاريخ</th>
              <th className="px-6 py-3">المبلغ</th>
              <th className="px-6 py-3">طريقة الدفع</th>
              <th className="px-6 py-3">ملاحظات الدفع</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{request.request_number}</td>
                <td className="px-6 py-4">{getClientName(request.client_id)}</td>
                <td className="px-6 py-4">{getCarInfo(request.car_id)}</td>
                <td className="px-6 py-4">{new Date(request.created_at).toLocaleDateString('en-GB')}</td>
                <td className="px-6 py-4 font-semibold">{request.price.toLocaleString('en-US')} ريال</td>
                <td className="px-6 py-4">{getPaymentTypeLabel(request.payment_type)}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{request.payment_note || '-'}</td>
              </tr>
            ))}
            {requests.length === 0 && (
                <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-500 dark:text-slate-400">
                        لا توجد معاملات مالية تطابق الفلاتر المحددة.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancialsTable;