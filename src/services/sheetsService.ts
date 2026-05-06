/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KPI, Dossier, Customer, ActivityLog } from '../types';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function fetchSheetData(spreadsheetId: string, range: string, accessToken: string) {
  const response = await fetch(`${BASE_URL}/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
  }
  const data = await response.json();
  return data.values || [];
}

export function mapKpiData(values: any[]): KPI[] {
  // Assuming headers: ID_NV, Loai_Chi_Tieu, Muc_Tieu, Thuc_Hien
  const now = new Date();
  return values.slice(1).map((row, i) => ({
    id: row[0] || `k${i}`,
    userId: 'RM001', // Default for now
    type: row[1] as any,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    target: Number(row[2]) || 0,
    actual: Number(row[3]) || 0,
  }));
}

export function mapDossierData(values: any[]): Dossier[] {
  // Assuming headers: ID_HS, Ten_KH, Phan_Loai, Loai_HS, Trang_Thai, So_Tien, Ngay_Cap_Nhat, ID_NV
  return values.slice(1).map((row) => ({
    id: row[0],
    customerName: row[1],
    category: (row[2] === 'Trình khác' ? 'Trình khác' : 'Cấp tín dụng') as any,
    type: row[3],
    status: (row[4] === 'Tiếp nhận' ? 'Đang soạn' : row[4] === 'Thẩm định' ? 'Phê duyệt' : row[4]) as any,
    amount: Number(row[5]) || 0,
    updatedAt: row[6] || new Date().toISOString(),
    userId: row[7] || 'RM001',
  }));
}

export function mapCustomerData(values: any[]): Customer[] {
  // Assuming headers: ID_KH, Ten_KH, SDT, Loai_TN, Ghi_Chu, ID_NV
  return values.slice(1).map((row) => ({
    id: row[0],
    name: row[1],
    phone: row[2],
    type: row[3] as any,
    notes: row[4],
    userId: row[5] || 'RM001',
  }));
}

export function mapLogData(values: any[]): ActivityLog[] {
  // Assuming headers: ID_Log, Ngay, Noi_Dung, Ket_Qua, ID_NV
  return values.slice(1).map((row) => ({
    id: row[0],
    date: row[1],
    description: row[2],
    result: row[3],
    userId: row[4] || 'RM001',
  }));
}
