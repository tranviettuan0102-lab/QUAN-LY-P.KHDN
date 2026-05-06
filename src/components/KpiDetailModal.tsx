import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { KPI, KpiDetail } from '../types';
import { subscribeToKpiDetails, addKpiDetail, updateKpiValue } from '../services/firebaseService';
import { format } from 'date-fns';
import { NumericFormat } from 'react-number-format';

const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num);

interface Props {
  kpi: KPI;
  onClose: () => void;
  isManager: boolean;
}

export const KpiDetailModal = ({ kpi, onClose, isManager }: Props) => {
  const [details, setDetails] = useState<KpiDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCustomer, setNewCustomer] = useState('');
  const [newCif, setNewCif] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');

  useEffect(() => {
    const unsub = subscribeToKpiDetails(kpi.id, (data) => {
      setDetails(data);
      setLoading(false);
    });
    return () => unsub();
  }, [kpi.id]);

  const handleAdd = async () => {
    if (!newCustomer || !newCif || newAmount === '') return;
    try {
      await addKpiDetail({
        id: `KD-${Date.now()}`,
        kpiId: kpi.id,
        customerName: newCustomer,
        cif: newCif,
        amount: Number(newAmount),
        date: format(new Date(), 'yyyy-MM-dd')
      });
      
      const newTotal = kpi.actual + Number(newAmount);
      await updateKpiValue(kpi.id, newTotal, 'actual');

      setNewCustomer('');
      setNewCif('');
      setNewAmount('');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-[#1a2b4b]">Chi tiết phát sinh</h3>
            <p className="text-xs text-slate-500 font-medium">{kpi.type} - Tháng {kpi.month}/{kpi.year}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!isManager && (
            <div className="mb-6 flex gap-3 items-end p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tên khách hàng</label>
                <input 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  placeholder="Khách hàng A..."
                />
              </div>
              <div className="w-1/4">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Số CIF</label>
                <input 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newCif}
                  onChange={(e) => setNewCif(e.target.value)}
                  placeholder="Nhập CIF..."
                />
              </div>
              <div className="w-1/4">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Giá trị phát sinh</label>
                <NumericFormat 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newAmount}
                  onValueChange={(values) => setNewAmount(values.floatValue || '')}
                  placeholder="0"
                  thousandSeparator="."
                  decimalSeparator=","
                  allowedDecimalSeparators={['.', ',']}
                />
              </div>
              <button 
                onClick={handleAdd}
                disabled={!newCustomer || !newCif || newAmount === ''}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus size={16} /> Thêm
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold">
                <tr>
                  <th className="px-4 py-3 border-b border-slate-200">Khách hàng</th>
                  <th className="px-4 py-3 border-b border-slate-200">CIF</th>
                  <th className="px-4 py-3 border-b border-slate-200">Giá trị</th>
                  <th className="px-4 py-3 border-b border-slate-200">Ngày ghi nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Đang tải...</td></tr>
                ) : details.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Chưa có phát sinh nào</td></tr>
                ) : (
                  details.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{d.customerName}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs">{d.cif}</td>
                      <td className="px-4 py-3 font-bold text-blue-700">{formatNumber(d.amount)}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{d.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
