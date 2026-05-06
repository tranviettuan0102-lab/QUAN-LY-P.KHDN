import { Customer, Dossier, KPI, ActivityLog, User } from '../types';

export const MOCK_USERS: User[] = [
  { id: 'RM001', name: 'Trần Việt Tuấn', role: 'RM', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
  { id: 'RM002', name: 'Nguyễn Thu Hà', role: 'RM', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
  { id: 'MG001', name: 'Sếp Tổng', role: 'Manager', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Manager' },
];

export const MOCK_KPI: KPI[] = [
  { id: 'k1', userId: 'RM001', type: 'Dư nợ', target: 50, actual: 42, month: 4, year: 2026 },
  { id: 'k2', userId: 'RM001', type: 'Huy động', target: 30, actual: 15, month: 4, year: 2026 },
  { id: 'k3', userId: 'RM001', type: 'Bảo hiểm', target: 2, actual: 1.8, month: 4, year: 2026 },
  { id: 'k4', userId: 'RM001', type: 'Thẻ tín dụng', target: 100, actual: 85, month: 4, year: 2026 },
  { id: 'k5', userId: 'RM001', type: 'CIF active', target: 50, actual: 30, month: 4, year: 2026 },
  
  { id: 'k6', userId: 'RM002', type: 'Dư nợ', target: 40, actual: 20, month: 4, year: 2026 },
  { id: 'k7', userId: 'RM002', type: 'Huy động', target: 20, actual: 18, month: 4, year: 2026 },
  { id: 'k8', userId: 'RM002', type: 'Bảo hiểm', target: 1, actual: 0.5, month: 4, year: 2026 },
  { id: 'k9', userId: 'RM002', type: 'Thẻ tín dụng', target: 80, actual: 40, month: 4, year: 2026 },
  { id: 'k10', userId: 'RM002', type: 'CIF active', target: 40, actual: 25, month: 4, year: 2026 },
];

export const MOCK_DOSSIERS: Dossier[] = [
  { id: 'HS001', customerName: 'Nguyễn Văn An', category: 'Cấp tín dụng', type: 'Vay mua nhà', status: 'Phê duyệt', amount: 2500, updatedAt: '2026-04-20T10:00:00Z', userId: 'RM001' },
  { id: 'HS002', customerName: 'Trần Thị Bình', category: 'Cấp tín dụng', type: 'Vay kinh doanh', status: 'Phê duyệt', amount: 500, updatedAt: '2026-04-24T08:30:00Z', userId: 'RM001' },
  { id: 'HS003', customerName: 'Lê Văn Cường', category: 'Cấp tín dụng', type: 'Tiêu dùng', status: 'Đang soạn', amount: 50, updatedAt: '2026-04-21T15:00:00Z', userId: 'RM001' },
  { id: 'HS004', customerName: 'Phạm Minh Đức', category: 'Trình khác', type: 'Phát hành bảo lãnh', status: 'Giải ngân', amount: 800, updatedAt: '2026-04-22T09:00:00Z', userId: 'RM001' },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'C001', name: 'Hoàng Văn Hải', phone: '0901234567', type: 'Nóng', notes: 'Thích Golf, đang tìm gói vay mua xe sang.', userId: 'RM001' },
  { id: 'C002', name: 'Đặng Thu Thảo', phone: '0988776655', type: 'Ấm', notes: 'Quan tâm bảo hiểm nhân thọ cho con.', userId: 'RM001' },
  { id: 'C003', name: 'Vũ Minh Tuấn', phone: '0912121212', type: 'Lạnh', notes: 'Khách hàng cũ, thích trà đạo.', userId: 'RM001' },
];

export const MOCK_LOGS: ActivityLog[] = [
  { id: 'L001', date: '2026-04-25', description: 'Gọi điện tư vấn khách hàng Hải', result: 'Hẹn gặp trực tiếp vào thứ 2', userId: 'RM001' },
  { id: 'L002', date: '2026-04-25', description: 'Hoàn thiện hồ sơ thẩm định chị Bình', result: 'Đã đẩy lên hệ thống phê duyệt', userId: 'RM001' },
];
