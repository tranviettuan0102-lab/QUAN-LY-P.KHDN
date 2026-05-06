/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PotentialType = 'Nóng' | 'Ấm' | 'Lạnh';
export type UserRole = 'RM' | 'Manager';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  email?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: PotentialType;
  notes: string;
  userId: string;
}

export type KPICategory = 'Dư nợ' | 'Huy động' | 'Thẻ tín dụng' | 'CIF active' | 'Doanh số TTQT' | 'Thu thuần dịch vụ' | 'Bảo hiểm';

export interface YearlyPlan {
  id: string; // userId-year-type
  userId: string;
  year: number;
  type: KPICategory;
  target: number;
}

export interface KpiDetail {
  id: string;
  kpiId: string;
  customerName: string;
  cif: string;
  amount: number;
  date: string;
}

export interface KPI {
  id: string; // userId-month-year-type
  userId: string;
  type: KPICategory;
  month: number;
  year: number;
  target: number;
  actual: number;
}

export type DossierStatus = 'Đang soạn' | 'Phê duyệt' | 'Giải ngân' | 'Từ chối';
export type DossierCategory = 'Cấp tín dụng' | 'Trình khác';

export interface Dossier {
  id: string;
  customerName: string;
  category: DossierCategory;
  type: string;
  status: DossierStatus;
  amount: number;
  updatedAt: string;
  userId: string;
}

export interface ActivityLog {
  id: string;
  date: string;
  description: string;
  result: string;
  userId: string;
}
