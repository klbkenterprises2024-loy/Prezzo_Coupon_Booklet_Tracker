/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum CouponType {
  BOGO_LARGE = "BOGO Large",
  BOGO_MEDIUM = "BOGO Medium",
  MEDIUM_TO_LARGE = "Medium to Large",
  COMPLIMENTARY_500 = "Complimentary 500"
}

export function normalizeCouponType(rawType: string | undefined | null): CouponType {
  if (!rawType) return CouponType.BOGO_LARGE;
  const t = String(rawType).trim().toLowerCase();
  if (t.includes("bogo") && t.includes("large")) {
    return CouponType.BOGO_LARGE;
  }
  if (t.includes("bogo") && (t.includes("medium") || t.includes("med"))) {
    return CouponType.BOGO_MEDIUM;
  }
  if ((t.includes("medium") || t.includes("med")) && (t.includes("large") || t.includes("upgrade") || t.includes("upg"))) {
    return CouponType.MEDIUM_TO_LARGE;
  }
  if (t.includes("complimentary") || t.includes("500") || t.includes("comp")) {
    return CouponType.COMPLIMENTARY_500;
  }
  return rawType as CouponType;
}

export interface Coupon {
  type: CouponType;
  index: number; // 1-based index (e.g. 1 to 4 for BOGO Large)
  id: string; // Composite ID like "BOGO_LARGE_1"
  displayName: string; // e.g. "BOGO Large #1"
}

export interface Booklet {
  id: string; // Unique Booklet ID (e.g., booklet number)
  customerName: string;
  customerPhone: string;
  dateSold: string; // YYYY-MM-DD
  pricePaid: number;
  outlet: string; // Outlet where sold
  staffName: string; // Staff member who sold it
  status: "Active" | "Inactive" | "Expired";
  notes?: string;
}

export interface Redemption {
  id: string; // Unique Redemption ID
  bookletId: string;
  couponType: CouponType;
  couponIndex: number; // e.g., 1 to 4
  dateRedeemed: string; // ISO 8601 string
  orderValue: number; // Bill amount
  staffName: string;
  outlet: string;
  notes?: string;
}

export interface Outlet {
  name: string;
  address?: string;
  phone?: string;
}

export interface Staff {
  email: string;
  name: string;
  role: "Admin" | "Staff";
  outlet?: string;
}

export interface SyncState {
  spreadsheetId: string;
  isLinked: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  error: string | null;
}

export interface CouponStatus {
  coupon: Coupon;
  isRedeemed: boolean;
  redemption?: Redemption;
}

export interface BookletWithCoupons extends Booklet {
  coupons: CouponStatus[];
  redeemedCount: number;
  totalCount: number;
  lastOrderDate: string | null;
}
