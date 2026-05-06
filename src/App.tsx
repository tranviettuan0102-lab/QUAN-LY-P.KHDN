import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  ClipboardList, 
  ChevronRight,
  LogOut,
  TrendingUp,
  AlertCircle,
  Settings,
  ShieldCheck,
  UserCircle,
  PlusCircle,
  Save,
  ChevronDown,
  Calendar,
  Trash2,
  Edit2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { Dossier, Customer, ActivityLog, KPI, User, UserRole, KPICategory } from './types';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { KpiDetailModal } from './components/KpiDetailModal';
import { NumericFormat } from 'react-number-format';
import { 
  ensureUserProfile, 
  subscribeToKpis, 
  subscribeToDossiers, 
  subscribeToCustomers, 
  subscribeToLogs, 
  updateKpiValue, 
  addLogEntry,
  testConnection,
  subscribeToUsers,
  createKpi,
  deleteUser,
  addDossier,
  updateDossierStatus,
  addCustomer,
  updateCustomer
} from './services/firebaseService';

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num);
};

// Components
const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-6 py-3 transition-all duration-200 ${
      active 
        ? 'bg-blue-600/20 border-r-4 border-blue-400 text-blue-100' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={18} className="mr-3" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const Card = ({ children, title, className = "", headerAction }: any) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${className}`}>
    {title && (
      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="text-sm font-bold text-[#1a2b4b] uppercase tracking-wide">{title}</h3>
        {headerAction}
      </div>
    )}
    <div className="p-5 flex-1">
      {children}
    </div>
  </div>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [workflowTab, setWorkflowTab] = useState<'Cấp tín dụng' | 'Trình khác'>('Cấp tín dụng');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [newLog, setNewLog] = useState({ description: '', result: '' });
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', role: 'RM' as UserRole, email: '' });
  const [showAddDossier, setShowAddDossier] = useState(false);
  const [newDossier, setNewDossier] = useState({ customerName: '', category: 'Cấp tín dụng' as 'Cấp tín dụng' | 'Trình khác', type: '', status: 'Đang soạn' as 'Đang soạn', amount: 0 });
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', type: 'Ấm' as 'Nóng' | 'Ấm' | 'Lạnh', notes: '' });
  const [loginError, setLoginError] = useState<string | null>(null);

  const [selectedKpiForDetail, setSelectedKpiForDetail] = useState<string | null>(null);
  const [yearlyPlans, setYearlyPlans] = useState<import('./types').YearlyPlan[]>([]);

  // Firebase Auth
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const profile: User = {
            id: user.uid,
            name: user.displayName || 'User',
            role: (user.email?.includes('manager') || user.email === 'phongkhdndanang@gmail.com') ? 'Manager' : 'RM', 
            avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            email: user.email || ''
          };
          try {
            // First ensure it exists or create it
            await ensureUserProfile(profile);
            
            // Then fetch the actual profile from DB so we get their real role if they were changed by an Admin!
            const { getUserProfile } = await import('./services/firebaseService');
            const dbProfile = await getUserProfile(user.uid);
            if (dbProfile) {
              setCurrentUser(dbProfile);
            } else {
              setCurrentUser(profile);
            }
          } catch (e) {
            console.error("Profile sync failed, but continuing...", e);
            setCurrentUser(profile);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.error("Auth sync error:", err);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!currentUser) return;

    // Real-time Subscriptions based on current role
    const unsubKpis = subscribeToKpis(currentUser.id, currentUser.role, setKpis);
    const unsubDossiers = subscribeToDossiers(currentUser.id, currentUser.role, setDossiers);
    const unsubCustomers = subscribeToCustomers(currentUser.id, currentUser.role, setCustomers);
    const unsubLogs = subscribeToLogs(currentUser.id, currentUser.role, setLogs);
    let unsubUsers = () => {};
    let unsubYearlyPlans = () => {};
    if (currentUser.role === 'Manager') {
      unsubUsers = subscribeToUsers(setAllUsers);
    }
    
    // Import and call subscribeToYearlyPlans
    import('./services/firebaseService').then(({ subscribeToYearlyPlans }) => {
      unsubYearlyPlans = subscribeToYearlyPlans(currentUser.id, currentUser.role, setYearlyPlans);
    });

    return () => {
      unsubKpis();
      unsubDossiers();
      unsubCustomers();
      unsubLogs();
      unsubUsers();
      unsubYearlyPlans();
    };
  }, [currentUser?.id, currentUser?.role]);

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('/api/auth/url');
      const { url } = await response.json();
      window.open(url, 'google_oauth', 'width=600,height=700');
    } catch (error) {
      console.error('Failed to start OAuth:', error);
    }
  };

  const userKpis = useMemo(() => {
    return kpis.filter(k => k.userId === currentUser?.id && k.month === selectedMonth && k.year === selectedYear);
  }, [kpis, currentUser, selectedMonth, selectedYear]);

  const aggregateKpis = useMemo(() => {
    const categories: KPICategory[] = ['Dư nợ', 'Huy động', 'Thẻ tín dụng', 'CIF active', 'Doanh số TTQT', 'Thu thuần dịch vụ', 'Bảo hiểm'];
    const monthKpis = kpis.filter(k => k.month === selectedMonth && k.year === selectedYear);
    return categories.map(cat => {
      const filtered = monthKpis.filter(k => k.type === cat);
      return {
        type: cat,
        target: filtered.reduce((acc, curr) => acc + curr.target, 0),
        actual: filtered.reduce((acc, curr) => acc + curr.actual, 0),
      };
    });
  }, [kpis, selectedMonth, selectedYear]);

  const handleKpiUpdate = async (kpiId: string, value: number, field: 'target' | 'actual') => {
    try {
      await updateKpiValue(kpiId, value, field);
    } catch (e) {
      // Fallback for demo if not in Firestore yet
      setKpis(prev => prev.map(k => k.id === kpiId ? { ...k, [field]: value } : k));
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.description) return;
    try {
      await addLogEntry(newLog.description, newLog.result);
      setNewLog({ description: '', result: '' });
    } catch (err) {
      // Offline fallback
      const log: ActivityLog = {
        id: `L${Date.now()}`,
        userId: currentUser?.id || 'anon',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: newLog.description,
        result: newLog.result
      };
      setLogs([log, ...logs]);
      setNewLog({ description: '', result: '' });
    }
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = [2024, 2025, 2026];
    
    return (
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex items-center gap-3">
              <Calendar size={18} className="text-blue-600" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Xem số liệu kỳ:</span>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg border-none outline-none focus:ring-1 focus:ring-blue-400"
              >
                {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg border-none outline-none focus:ring-1 focus:ring-blue-400"
              >
                {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
              </select>
           </div>
           <div className="flex-1"></div>
           <div className="text-[10px] font-bold text-slate-400 italic">
             Dữ liệu cập nhật mới nhất: {format(new Date(), 'HH:mm dd/MM/yyyy')}
           </div>
        </div>

        {currentUser.role === 'RM' && (
          <>
            <h3 className="text-sm font-bold text-[#1a2b4b] uppercase tracking-wide border-b border-slate-200 pb-2 mb-2">Số liệu của Bản thân</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {userKpis.map((kpi, idx) => (
                <div key={`user-${idx}`} className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider truncate">{kpi.type}</p>
                  <div className="flex items-end justify-between">
                    <h3 className="text-xl font-bold text-[#1a2b4b]">
                      {formatNumber(kpi.actual)} <span className="text-[10px] text-slate-400 font-normal">{kpi.type?.includes('Thẻ') ? 'Thẻ' : kpi.type?.includes('CIF') ? 'KH' : 'Tỷ'}</span>
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      (kpi.actual / kpi.target) >= 0.8 ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50'
                    }`}>
                      {kpi.target > 0 ? formatNumber((kpi.actual / kpi.target) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 mt-4 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        idx % 5 === 0 ? 'bg-blue-500' : 
                        idx % 5 === 1 ? 'bg-emerald-500' : 
                        idx % 5 === 2 ? 'bg-orange-400' : 
                        idx % 5 === 3 ? 'bg-indigo-600' : 'bg-slate-700'
                      }`}
                      style={{ width: `${Math.min(100, kpi.target > 0 ? (kpi.actual / kpi.target) * 100 : 0)}%` }}
                    ></div>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 italic text-left">Còn lại: <span className="font-bold text-red-500">{kpi.target > kpi.actual ? formatNumber(kpi.target - kpi.actual) : 'Đã hoàn thành'}</span></p>
                  <p className="text-[9px] text-slate-400 mt-1 italic text-right">Mục tiêu: {formatNumber(kpi.target)}</p>
                </div>
              ))}
              {userKpis.length === 0 && (
                <div className="col-span-full py-4 text-center text-slate-400 text-xs shadow-sm bg-white rounded-xl border border-slate-100 p-5 mt-1 mb-2">Chưa có chỉ tiêu cá nhân.</div>
              )}
            </div>
          </>
        )}

        <h3 className="text-sm font-bold text-[#1a2b4b] uppercase tracking-wide border-b border-slate-200 pb-2 mt-8 mb-2">Số liệu Tổng P.KHDN</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {aggregateKpis.map((kpi, idx) => (
            <div key={`agg-${idx}`} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
              <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider truncate">{kpi.type}</p>
              <div className="flex items-end justify-between">
                <h3 className="text-xl font-bold text-[#1a2b4b]">
                  {formatNumber(kpi.actual)} <span className="text-[10px] text-slate-400 font-normal">{kpi.type?.includes('Thẻ') ? 'Thẻ' : kpi.type?.includes('CIF') ? 'KH' : 'Tỷ'}</span>
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  (kpi.actual / kpi.target) >= 0.8 ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50'
                }`}>
                  {kpi.target > 0 ? formatNumber((kpi.actual / kpi.target) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1 mt-4 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    idx % 5 === 0 ? 'bg-blue-500' : 
                    idx % 5 === 1 ? 'bg-emerald-500' : 
                    idx % 5 === 2 ? 'bg-orange-400' : 
                    idx % 5 === 3 ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
                  style={{ width: `${Math.min(100, kpi.target > 0 ? (kpi.actual / kpi.target) * 100 : 0)}%` }}
                ></div>
              </div>
              <p className="text-[9px] text-slate-400 mt-2 italic text-left">Còn lại: <span className="font-bold text-red-500">{kpi.target > kpi.actual ? formatNumber(kpi.target - kpi.actual) : 'Đã hoàn thành'}</span></p>
              <p className="text-[9px] text-slate-400 mt-1 italic text-right">Mục tiêu tổng: {formatNumber(kpi.target)}</p>
            </div>
          ))}
          {aggregateKpis.length === 0 && (
            <div className="col-span-full py-4 text-center text-slate-400 text-xs shadow-sm bg-white rounded-xl border border-slate-100 p-5 mt-1 mb-2">Chưa có chỉ tiêu P.KHDN.</div>
          )}
        </div>

        <Card title={currentUser.role === 'Manager' ? "Hiệu suất Tổng hợp toàn P.KHDN" : "Tiến độ thực hiện của tôi"}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentUser.role === 'Manager' ? aggregateKpis : userKpis}>
                <XAxis dataKey="type" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#94a3b8'}} tickFormatter={(val: number) => formatNumber(val)} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                  formatter={(value: number) => [formatNumber(value), '']}
                />
                <Legend iconType="circle" wrapperStyle={{fontSize: '10px', paddingTop: '20px'}} />
                <Bar dataKey="actual" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={32} name="Thực hiện" />
                <Bar dataKey="target" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={32} name="Mục tiêu" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const renderKpiManagement = () => {
    const categories: KPICategory[] = ['Dư nợ', 'Huy động', 'Thẻ tín dụng', 'CIF active', 'Doanh số TTQT', 'Thu thuần dịch vụ', 'Bảo hiểm'];
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = [2024, 2025, 2026];
    
    const handleInitializeKpisForUser = async (userId: string) => {
      setIsLoading(true);
      try {
        for (const cat of categories) {
          const safeCat = cat.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]/g, '');
          const kpiId = `KPI-${userId}-${selectedMonth}-${selectedYear}-${safeCat}`;
          const existing = kpis.find(k => k.id === kpiId);
          if (!existing) {
            await createKpi({
              id: kpiId,
              userId,
              type: cat,
              month: selectedMonth,
              year: selectedYear,
              target: 0,
              actual: 0
            });
          }
        }
      } catch (e) {
        console.error("Failed to initialize KPIs:", e);
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddUser = async () => {
      if (!newUser.name || !newUser.email) return;
      try {
        const dummyId = `RM-${Date.now()}`;
        await ensureUserProfile({
          id: dummyId,
          name: newUser.name,
          role: newUser.role,
          email: newUser.email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${dummyId}`
        });
        setShowAddUser(false);
        setNewUser({ name: '', role: 'RM', email: '' });
      } catch (e) {
        console.error("Failed to add user:", e);
      }
    };

    return (
      <div className="space-y-6">
        {/* Month/Year Selection */}
        <div className="flex flex-wrap items-center gap-4 bg-[#1a2b4b] p-4 rounded-xl shadow-lg border border-slate-700">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Thời gian:</span>
             <select 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(Number(e.target.value))}
               className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-blue-500 outline-none"
             >
               {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
             </select>
             <select 
               value={selectedYear} 
               onChange={(e) => setSelectedYear(Number(e.target.value))}
               className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border-none focus:ring-2 focus:ring-blue-500 outline-none"
             >
               {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
             </select>
          </div>
          <div className="flex-1"></div>
          {currentUser?.role === 'Manager' && (
            <button 
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
            >
              <PlusCircle size={16} /> Thêm RM mới
            </button>
          )}
        </div>

        {showAddUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200"
            >
              <h3 className="text-lg font-bold text-[#1a2b4b] mb-6 flex items-center gap-2">
                <Users size={20} className="text-blue-600" /> Thêm RM vào hệ thống
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Họ và tên</label>
                  <input 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nguyễn Văn A"
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Email Đăng nhập</label>
                  <input 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="rm.name@bank.com"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Chức danh</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                  >
                    <option value="RM">Chuyên viên QHKH</option>
                    <option value="Manager">Quản lý (Manager)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleAddUser}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {currentUser?.role === 'RM' ? (
          <Card title={`Số liệu thực hiện Tháng ${selectedMonth}/${selectedYear}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(cat => {
                const kpi = userKpis.find(k => k.type === cat);
                if (!kpi) return null;
                const progress = kpi.target > 0 ? (kpi.actual / kpi.target) * 100 : 0;
                return (
                  <div key={kpi.id} className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col group hover:border-blue-200 transition-all">
                    <div className="flex justify-between items-start mb-4">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.type}</label>
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${progress >= 100 ? 'bg-emerald-100 text-emerald-600' : progress >= 80 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                         {progress.toFixed(0)}%
                       </span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Thực hiện</p>
                        <p className="text-2xl font-black text-blue-600">
                          {formatNumber(kpi.actual)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Mục tiêu</p>
                        <p className="text-sm font-bold text-slate-600">{formatNumber(kpi.target)}</p>
                        <button 
                          onClick={() => setSelectedKpiForDetail(kpi.id)}
                          className="mt-2 text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-bold border border-blue-100 flex items-center justify-end gap-1 ml-auto"
                        >
                          <Plus size={12} /> Nhập chi tiết
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-700 ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                         style={{ width: `${Math.min(100, progress)}%`}} 
                       />
                    </div>
                  </div>
                );
              })}
              {userKpis.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                  <ShieldCheck size={40} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">Bạn chưa được giao chỉ tiêu cho tháng này.</p>
                  <p className="text-xs mt-1">Liên hệ Manager để được phân bổ KPI.</p>
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
               <div className="flex items-center gap-3 text-blue-700">
                  <TrendingUp size={20} />
                  <span className="text-xs font-bold">Dữ liệu được đồng bộ thời gian thực với quản lý P.KHDN</span>
               </div>
               <button 
                  onClick={() => alert("Đã lưu và đồng bộ kết quả mới nhất!")}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
               >
                  <Save size={16} /> Xác nhận chỉ tiêu hiện tại
               </button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200">
               <div>
                  <h3 className="text-sm font-bold text-[#1a2b4b] uppercase tracking-wide">Phân bổ Mục tiêu & Giám sát RMs</h3>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Tháng {selectedMonth} / {selectedYear}</p>
               </div>
               <div className="text-right">
                 <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                   {allUsers.filter(u => u.role === 'RM').length} RMs Active
                 </div>
               </div>
            </div>
  
            <div className="grid grid-cols-1 gap-6">
              {allUsers.filter(u => u.role === 'RM').map(user => {
                const userKpiItems = kpis.filter(k => k.userId === user.id && k.month === selectedMonth && k.year === selectedYear);
                return (
                  <div key={user.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/30">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                            <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="RM" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1a2b4b]">{user.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                         <button 
                           onClick={() => alert("Đã xác nhận chỉ tiêu cho RMs!")}
                           className="flex items-center gap-2 text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/10"
                         >
                           <ShieldCheck size={14} /> Giao chỉ tiêu
                         </button>
                         {userKpiItems.length === 0 ? (
                           <button 
                             onClick={() => handleInitializeKpisForUser(user.id)}
                             className="flex items-center gap-2 text-[10px] bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10"
                           >
                             <PlusCircle size={14} /> Giao chỉ tiêu Tháng {selectedMonth}
                           </button>
                         ) : (
                           <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
                             <ShieldCheck size={12} /> Đã có mục tiêu
                           </div>
                         )}
                         <button 
                           onClick={async () => {
                             if(confirm('Bạn có chắc chắn muốn xóa RM này?')) {
                               await deleteUser(user.id);
                             }
                           }}
                           className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg transition-all border border-red-100"
                           title="Xóa RM"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </div>
                    
                    {userKpiItems.length > 0 && (
                      <div className="p-5">
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                           {categories.map(cat => {
                             const kpi = userKpiItems.find(k => k.type === cat);
                             return (
                               <div key={cat} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                 <label className="text-[9px] font-black text-slate-400 uppercase block truncate">{cat}</label>
                                 {kpi ? (
                                   <div className="space-y-1">
                                     <NumericFormat 
                                       value={kpi.target}
                                       onValueChange={(values) => handleKpiUpdate(kpi.id, values.floatValue || 0, 'target')}
                                       className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-black text-blue-900 focus:ring-1 focus:ring-blue-400 outline-none"
                                       placeholder="Mục tiêu"
                                       thousandSeparator="."
                                       decimalSeparator=","
                                       allowedDecimalSeparators={['.', ',']}
                                     />
                                     <div className="flex justify-between items-center px-1 pt-1 opacity-60">
                                       <span className="text-[8px] font-bold text-slate-400">Đã đạt:</span>
                                       <span className="text-[10px] font-black text-slate-700">{formatNumber(kpi.actual)}</span>
                                     </div>
                                     <button 
                                       onClick={() => setSelectedKpiForDetail(kpi.id)}
                                       className="w-full mt-1 text-[9px] text-blue-600 hover:underline text-center"
                                     >
                                       Xem chi tiết
                                     </button>
                                   </div>
                                 ) : (
                                   <div className="h-12 flex items-center justify-center italic text-[9px] text-slate-300">
                                     -
                                   </div>
                                 )}
                               </div>
                             );
                           })}
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {allUsers.filter(u => u.role === 'RM').length === 0 && (
                <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-white">
                  <Users size={40} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">Chưa có RM nào trong đội ngũ.</p>
                  <p className="text-xs mt-2 text-slate-500 max-w-xs mx-auto">Sử dụng nút "Thêm RM mới" hoặc nhắc RMs đăng nhập hệ thống để bắt đầu phân bổ chỉ tiêu.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedKpiForDetail && (
          <KpiDetailModal 
            kpi={kpis.find(k => k.id === selectedKpiForDetail)!} 
            onClose={() => setSelectedKpiForDetail(null)} 
            isManager={currentUser?.role === 'Manager'} 
          />
        )}
      </div>
    );
  };

  const renderStats = () => {
    // Generate some mock historical data for demonstration
    const historicalData = [
      { name: 'Tháng 1', dưNợ: 120, huyĐộng: 80, thẻ: 15 },
      { name: 'Tháng 2', dưNợ: 135, huyĐộng: 90, thẻ: 25 },
      { name: 'Tháng 3', dưNợ: 125, huyĐộng: 85, thẻ: 20 },
      { name: 'Tháng 4', dưNợ: 145, huyĐộng: 100, thẻ: 40 },
      { name: 'Tháng 5', dưNợ: 160, huyĐộng: 110, thẻ: 55 },
      { name: 'Tháng 6', dưNợ: 190, huyĐộng: 130, thẻ: 80 },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200">
           <div>
              <h3 className="text-sm font-bold text-[#1a2b4b] uppercase tracking-wide">Phân tích & Tăng trưởng</h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Biểu đồ thể hiện tăng trưởng qua các tháng</p>
           </div>
           <div className="flex gap-2">
             <select className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg outline-none">
               <option>Theo Tháng</option>
               <option>Theo Quý</option>
               <option>Theo Ngày</option>
             </select>
           </div>
        </div>
        <Card title="Biểu đồ tiến độ KPIs toàn P.KHDN (Định mức tỷ VNĐ / Thẻ)">
          <div className="h-96 pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historicalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(val: number) => formatNumber(val)} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1a2b4b', marginBottom: '8px' }}
                  formatter={(value: number, name: string) => [formatNumber(value), name]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} />
                <Line type="monotone" name="Dư nợ (Tỷ)" dataKey="dưNợ" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Huy động (Tỷ)" dataKey="huyĐộng" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Thẻ tín dụng" dataKey="thẻ" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const handleAddDossier = async () => {
    if (!newDossier.customerName || !newDossier.type || !currentUser) return;
    try {
      await addDossier({
        id: `HS-${Date.now()}`,
        userId: currentUser.id,
        customerName: newDossier.customerName,
        category: newDossier.category,
        type: newDossier.type,
        status: newDossier.status,
        amount: newDossier.amount
      });
      setShowAddDossier(false);
      setNewDossier({ customerName: '', category: 'Cấp tín dụng', type: '', status: 'Đang soạn', amount: 0 });
    } catch (e) {
      console.error(e);
    }
  };

  const renderWorkflow = () => {
    const filteredDossiers = dossiers.filter(hs => hs.category === workflowTab);

    return (
      <div className="space-y-6">
        <div className="flex gap-2 p-1 bg-slate-200 rounded-lg w-max mb-4">
          <button 
            onClick={() => setWorkflowTab('Cấp tín dụng')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${workflowTab === 'Cấp tín dụng' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Quản lý hồ sơ trình cấp tín dụng
          </button>
          <button 
            onClick={() => setWorkflowTab('Trình khác')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${workflowTab === 'Trình khác' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Quản lý hồ sơ trình khác
          </button>
        </div>

        {showAddDossier && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200"
            >
              <h3 className="text-lg font-bold text-[#1a2b4b] mb-6 flex items-center gap-2">
                 Thêm Hồ sơ mới
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tên KH (Hồ sơ)</label>
                  <input 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newDossier.customerName}
                    onChange={e => setNewDossier({...newDossier, customerName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Phân loại Trình</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                    value={newDossier.category}
                    onChange={e => setNewDossier({...newDossier, category: e.target.value as any})}
                  >
                    <option value="Cấp tín dụng">Trình cấp tín dụng</option>
                    <option value="Trình khác">Trình khác</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nội dung (Loại HS)</label>
                  <input 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newDossier.type}
                    onChange={e => setNewDossier({...newDossier, type: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Số tiền (Triệu VNĐ)</label>
                  <NumericFormat 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newDossier.amount}
                    onValueChange={(values) => setNewDossier({...newDossier, amount: values.floatValue || 0})}
                    thousandSeparator="."
                    decimalSeparator=","
                    allowedDecimalSeparators={['.', ',']}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowAddDossier(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleAddDossier}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  Thêm Hồ sơ
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <Card 
           title={`Tiến độ ${workflowTab} (Workflow)`} 
           headerAction={
             <div className="flex items-center gap-3">
               <button className="text-xs text-blue-600 font-semibold hover:underline">Xem lịch sử &rarr;</button>
               {currentUser?.role === 'RM' && (
                 <button onClick={() => setShowAddDossier(true)} className="flex items-center gap-1 text-[10px] bg-blue-600 text-white px-2 py-1 rounded shadow-sm hover:bg-blue-700 font-bold uppercase transition-all">
                   <PlusCircle size={12} /> Thêm HS
                 </button>
               )}
             </div>
           }
        >
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                  <th className="px-5 py-3">Khách hàng</th>
                  <th className="px-5 py-3">Giai đoạn</th>
                  <th className="px-5 py-3 text-right">Số tiền (Tr)</th>
                  <th className="px-5 py-3">Cập nhật</th>
                  <th className="px-5 py-3 text-center">Trạng thái</th>
                  <th className="px-5 py-3">Cập nhật lúc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDossiers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-medium">Chưa có hồ sơ nào.</td>
                  </tr>
                ) : filteredDossiers.map((hs) => {
                  const daysLag = differenceInDays(new Date(), new Date(hs.updatedAt));
                  const isWarning = daysLag > 3 && hs.status !== 'Giải ngân' && hs.status !== 'Từ chối';
                  const isOwner = currentUser?.id === hs.userId;
                  return (
                    <tr key={hs.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-900">{hs.customerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono italic">{hs.id} - {hs.type}</div>
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {isOwner && (hs.status !== 'Giải ngân') ? (
                          <div className="flex gap-1 items-center">
                            <select 
                              className={`px-2 py-1 rounded-md text-[10px] font-bold border-0 outline-none ring-1 ring-inset ${
                                hs.status === 'Phê duyệt' ? 'bg-purple-50 text-purple-700 ring-purple-200' :
                                hs.status === 'Từ chối' ? 'bg-red-50 text-red-700 ring-red-200' :
                                'bg-slate-50 text-slate-600 ring-slate-200'
                              }`}
                              value={hs.status}
                              onChange={(e) => updateDossierStatus(hs.id, e.target.value as Dossier['status'], currentUser.id)}
                            >
                              <option value="Đang soạn">Đang soạn</option>
                              <option value="Phê duyệt">Phê duyệt</option>
                              <option value="Giải ngân">Giải ngân</option>
                              <option value="Từ chối">Từ chối</option>
                            </select>
                            <Edit2 size={12} className="text-slate-400" />
                          </div>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            hs.status === 'Giải ngân' ? 'bg-emerald-100 text-emerald-700' : 
                            hs.status === 'Phê duyệt' ? 'bg-purple-100 text-purple-700' :
                            hs.status === 'Từ chối' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {hs.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-medium text-slate-900">{formatNumber(hs.amount)}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{daysLag === 0 ? 'Vừa xong' : `${daysLag} ngày trước`}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-center">
                          {isWarning ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 animate-pulse">
                              <span className="w-1.5 h-1.5 mr-1 rounded-full bg-orange-500"></span> CHẬM TIẾN ĐỘ
                            </span>
                          ) : (
                            <div className="text-emerald-500">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[10px] text-slate-400 font-mono">
                        {hs.updatedAt ? new Date(hs.updatedAt).toLocaleString() : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !currentUser) return;
    try {
      await addCustomer({
        id: `CUST-${Date.now()}`,
        userId: currentUser.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        type: newCustomer.type,
        notes: newCustomer.notes
      });
      setShowAddCustomer(false);
      setNewCustomer({ name: '', phone: '', type: 'Ấm', notes: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const renderCRM = () => (
    <>
      {showAddCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200"
          >
            <h3 className="text-lg font-bold text-[#1a2b4b] mb-6 flex items-center gap-2">
               Thêm Khách hàng tiềm năng
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Họ và tên</label>
                <input 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Số điện thoại</label>
                <input 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Đánh giá tiềm năng</label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                  value={newCustomer.type}
                  onChange={e => setNewCustomer({...newCustomer, type: e.target.value as any})}
                >
                  <option value="Nóng">Nóng (Sắp chốt)</option>
                  <option value="Ấm">Ấm (Đang tiếp cận)</option>
                  <option value="Lạnh">Lạnh (Tiềm năng dài hạn)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Ghi chú & Nhu cầu</label>
                <textarea 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20"
                  value={newCustomer.notes}
                  onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowAddCustomer(false)}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Hủy
              </button>
              <button 
                onClick={handleAddCustomer}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              >
                Lưu Thông tin
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((cust) => (
          <div key={cust.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${
              cust.type === 'Nóng' ? 'bg-orange-500' : cust.type === 'Ấm' ? 'bg-blue-400' : 'bg-slate-300'
            }`} />
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-bold text-lg text-[#1a2b4b]">{cust.name}</h4>
                <p className="text-xs text-slate-400 font-mono">{cust.phone}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                cust.type === 'Nóng' ? 'text-orange-600 bg-orange-50' : 
                cust.type === 'Ấm' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100'
              }`}>
                {cust.type}
              </span>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Ghi chú / Nhu cầu</p>
              <p className="text-xs text-slate-600 flex italic">"{cust.notes}"</p>
            </div>
            <button className="w-full py-2 bg-[#1a2b4b] text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors">
              Cập nhật thông tin
            </button>
          </div>
        ))}
        {currentUser?.role === 'RM' && (
          <button onClick={() => setShowAddCustomer(true)} className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 text-slate-400 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-500 transition-all group">
            <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <PlusCircle size={20} />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">Thêm Khách hàng mới</span>
          </button>
        )}
      </div>
    </>
  );

  const renderLogs = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {currentUser?.role === 'RM' && (
        <div className="lg:col-span-1">
          <Card title="Ghi log công việc">
            <form onSubmit={handleAddLog} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Hôm nay bạn đã làm gì?</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:ring-1 focus:ring-blue-400 outline-none transition-shadow h-24 placeholder:text-slate-300"
                  placeholder="VD: Gọi điện tư vấn vay vốn KH A..."
                  value={newLog.description}
                  onChange={(e) => setNewLog({ ...newLog, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Kết quả ghi nhận</label>
                <input
                  className="w-full border border-slate-200 rounded-lg p-3 text-xs focus:ring-1 focus:ring-blue-400 outline-none transition-shadow placeholder:text-slate-300"
                  placeholder="VD: Thành công, khách hẹn gặp thứ 3..."
                  value={newLog.result}
                  onChange={(e) => setNewLog({ ...newLog, result: e.target.value })}
                />
              </div>
              <button className="w-full py-2 bg-[#1a2b4b] text-white text-xs font-bold rounded-lg hover:bg-slate-800 shadow-md transform active:scale-[0.98] transition-all">
                LƯU NHẬT KÝ
              </button>
            </form>
          </Card>
        </div>
      )}
      
      <div className={`lg:col-span-${currentUser?.role === 'RM' ? '2' : '3'}`}>
        <div className="bg-slate-900 rounded-xl p-5 text-white mb-6 flex items-center justify-between shadow-lg overflow-hidden relative">
          <div className="relative z-10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Hiệu suất trong ngày</h4>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-3xl font-bold">14</span>
                <span className="text-[10px] text-slate-400 ml-2 uppercase font-bold tracking-tight">Hoạt động</span>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 uppercase">Hồ sơ</p>
                  <p className="font-bold text-sm">03</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-500 uppercase">Hẹn gặp</p>
                  <p className="font-bold text-sm text-blue-400">05</p>
                </div>
              </div>
            </div>
          </div>
          <TrendingUp size={40} className="text-white/10 absolute -right-2 -bottom-2" />
        </div>

        <Card title="Lịch sử hoạt động gần đây">
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 p-3 rounded-lg border border-slate-50 hover:bg-slate-50 transition-all">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-900">{log.description}</p>
                    <span className="text-[9px] font-mono text-slate-400">{log.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{log.result}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );

  const handleLogout = () => {
    signOut(auth);
  };

  const handleAppLogin = async () => {
    setLoginError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/popup-blocked') {
        setLoginError('Vui lòng cho phép Pop-up trên trình duyệt để đăng nhập.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setLoginError('Tên miền này chưa được cấp phép trong Firebase Console. Vui lòng thêm vào danh sách Authorized Domains.');
      } else {
        setLoginError('Có lỗi xảy ra: ' + err.message);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1a2b4b] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-blue-100 font-bold uppercase tracking-widest text-xs">BankerPro System</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#1a2b4b] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl relative z-10 text-center"
        >
          <div className="w-20 h-20 bg-[#1a2b4b] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3">
             <LayoutDashboard size={40} className="text-blue-400 -rotate-3" />
          </div>
          <h2 className="text-3xl font-extrabold text-[#1a2b4b] mb-2">QUẢN LÝ P.KHDN</h2>
          <p className="text-slate-400 text-sm mb-8">Hệ thống quản trị chi tiêu & Công việc khách hàng</p>
          
          {loginError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs text-left">
              <AlertCircle size={16} className="shrink-0" />
              <span>{loginError}</span>
            </div>
          )}
          
          <button 
            onClick={handleAppLogin}
            className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-700 hover:bg-slate-50 transition-all hover:border-blue-100 hover:shadow-lg group mb-4"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="google" />
            Đăng nhập với Google
          </button>
          
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-8">
            Secured by Banking Standard Encryption
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a2b4b] text-white flex flex-col fixed h-full z-20 shadow-xl border-r border-slate-800">
        <div className="p-6 border-b border-slate-700/50">
          <h1 className="text-xl font-bold tracking-tight uppercase italic flex items-center gap-2">
            P.KHDN <span className="text-blue-400 not-italic">Admin</span>
          </h1>
        </div>

        <nav className="flex-1 py-6">
          <div className="px-6 mb-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">Danh mục</div>
          <SidebarItem icon={LayoutDashboard} label="Dashboard KPI" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem 
            icon={currentUser.role === 'RM' ? PlusCircle : Settings} 
            label={currentUser.role === 'RM' ? "Quản lý Chỉ tiêu" : "Phân bổ Chỉ tiêu"} 
            active={activeTab === 'kpi'} 
            onClick={() => setActiveTab('kpi')} 
          />
          <SidebarItem icon={TrendingUp} label="Phân tích & Thống kê" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
          <SidebarItem icon={FileText} label="Quản lý Hồ sơ" active={activeTab === 'workflow'} onClick={() => setActiveTab('workflow')} />
          <SidebarItem icon={Users} label="CRM Khách hàng" active={activeTab === 'crm'} onClick={() => setActiveTab('crm')} />
          <SidebarItem icon={ClipboardList} label="Nhật ký Ngày" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
        </nav>

        <div className="p-6 bg-slate-900/50 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm shadow-inner overflow-hidden border border-white/20">
               <img src={currentUser.avatar} alt="avatar" />
             </div>
             <div className="overflow-hidden">
               <p className="text-xs font-bold truncate">{currentUser.name}</p>
               <div className="flex items-center gap-1">
                 <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{currentUser.role === 'RM' ? 'Relationship Manager' : 'Business Unit Manager'}</p>
               </div>
             </div>
             <button 
               onClick={handleLogout}
               className="ml-auto text-slate-500 hover:text-white transition-colors"
             >
                <LogOut size={16} />
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-[#1a2b4b] tracking-tight">
            {activeTab === 'dashboard' ? 'Báo cáo Hoạt động Kinh doanh' :
             activeTab === 'workflow' ? 'Phê duyệt & Giải ngân' :
             activeTab === 'crm' ? 'Quản lý Khách hàng Tiềm năng' : 
             activeTab === 'stats' ? 'Phân tích & Tăng trưởng' :
             activeTab === 'kpi' ? (currentUser.role === 'RM' ? 'Cập nhật Chỉ tiêu cá nhân' : 'Phân bổ Chỉ tiêu Đội ngũ') :
             'Báo cáo Nhật ký Công việc'}
          </h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100">
              <ShieldCheck size={12} /> Cloud Sync Active
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Phiên làm việc</p>
              <p className="text-[10px] font-mono text-slate-600">{format(new Date(), 'HH:mm:ss - dd/MM/yyyy')}</p>
            </div>
            <button className="p-2 rounded-full hover:bg-slate-100 relative group transition-colors">
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              <AlertCircle size={20} className="text-slate-400 group-hover:text-[#1a2b4b]" />
            </button>
          </div>
        </header>

        <div className="p-8 flex-1">
          <motion.div
            key={`${activeTab}-${currentUser.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'workflow' && renderWorkflow()}
            {activeTab === 'crm' && renderCRM()}
            {activeTab === 'logs' && renderLogs()}
            {activeTab === 'kpi' && renderKpiManagement()}
            {activeTab === 'stats' && renderStats()}
          </motion.div>
        </div>

        <footer className="px-8 py-4 border-t border-slate-200 bg-white flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-widest font-bold font-mono">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><UserCircle size={10} /> {currentUser.name} ({currentUser.role})</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full" />
            <span>Branch: V-Bank North Area</span>
          </div>
          <span>© 2026 BankerPro Enterprise</span>
        </footer>
      </main>
    </div>
  );
}


