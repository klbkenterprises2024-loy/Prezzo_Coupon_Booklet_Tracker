/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Booklet, Redemption, Outlet, Staff, CouponType } from "../types";

// Default Passcodes
const DEFAULT_ADMIN_PIN = "1973";
const DEFAULT_STAFF_PIN = "4321";

// Keys for localStorage
const KEYS = {
  BOOKLETS: "prezzo_booklets",
  REDEMPTIONS: "prezzo_redemptions",
  OUTLETS: "prezzo_outlets",
  STAFF: "prezzo_staff",
  ADMIN_PIN: "prezzo_admin_pin",
  STAFF_PIN: "prezzo_staff_pin"
};

// Seed Data
const SEED_OUTLETS: Outlet[] = [
  { name: "Antop Hill", address: "Prezzo Pizzeria, Antop Hill", phone: "+91 98200 99999" },
  { name: "Sion", address: "Prezzo Pizzeria, Sion", phone: "+91 98199 88888" }
];

const SEED_STAFF: Staff[] = [
  { email: "loyrego@gmail.com", name: "Loy Rego", role: "Admin", outlet: "Antop Hill" },
  { email: "vikram@prezzo.com", name: "Vikram Singh", role: "Staff", outlet: "Sion" },
  { email: "priya@prezzo.com", name: "Priya Rao", role: "Staff", outlet: "Antop Hill" }
];

const SEED_BOOKLETS: Booklet[] = [
  {
    id: "B-1001",
    customerName: "Amit Patel",
    customerPhone: "+91 98200 12345",
    dateSold: "2026-07-01",
    pricePaid: 1000,
    outlet: "Antop Hill",
    staffName: "Loy Rego",
    status: "Active",
    notes: "Regular customer at Antop Hill"
  },
  {
    id: "B-1002",
    customerName: "Sneha Sharma",
    customerPhone: "+91 98199 54321",
    dateSold: "2026-07-05",
    pricePaid: 1000,
    outlet: "Sion",
    staffName: "Vikram Singh",
    status: "Active",
    notes: "Referred by Priya"
  },
  {
    id: "B-1003",
    customerName: "Rohan Mehta",
    customerPhone: "+91 97730 98765",
    dateSold: "2026-07-10",
    pricePaid: 1000,
    outlet: "Antop Hill",
    staffName: "Priya Rao",
    status: "Active"
  }
];

// Helper to construct IsoDate strings relative to today
const relativeDate = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const SEED_REDEMPTIONS: Redemption[] = [
  {
    id: "R-1",
    bookletId: "B-1001",
    couponType: CouponType.BOGO_LARGE,
    couponIndex: 1,
    dateRedeemed: relativeDate(12),
    orderValue: 1450,
    staffName: "Loy Rego",
    outlet: "Antop Hill",
    notes: "Redeemed for Paneer Makhani Large"
  },
  {
    id: "R-2",
    bookletId: "B-1001",
    couponType: CouponType.BOGO_MEDIUM,
    couponIndex: 1,
    dateRedeemed: relativeDate(10),
    orderValue: 890,
    staffName: "Priya Rao",
    outlet: "Antop Hill"
  },
  {
    id: "R-3",
    bookletId: "B-1002",
    couponType: CouponType.BOGO_LARGE,
    couponIndex: 1,
    dateRedeemed: relativeDate(5),
    orderValue: 1250,
    staffName: "Vikram Singh",
    outlet: "Sion",
    notes: "Pepperoni & Cheese"
  },
  {
    id: "R-4",
    bookletId: "B-1002",
    couponType: CouponType.COMPLIMENTARY_500,
    couponIndex: 1,
    dateRedeemed: relativeDate(2),
    orderValue: 480,
    staffName: "Vikram Singh",
    outlet: "Sion",
    notes: "Complimentary Garlic bread & Coke"
  }
];

export function initializeDatabase(force = false) {
  if (force || !localStorage.getItem(KEYS.BOOKLETS)) {
    localStorage.setItem(KEYS.BOOKLETS, JSON.stringify(SEED_BOOKLETS));
    localStorage.setItem(KEYS.REDEMPTIONS, JSON.stringify(SEED_REDEMPTIONS));
    localStorage.setItem(KEYS.OUTLETS, JSON.stringify(SEED_OUTLETS));
    localStorage.setItem(KEYS.STAFF, JSON.stringify(SEED_STAFF));
  }
  if (force || !localStorage.getItem(KEYS.ADMIN_PIN)) {
    localStorage.setItem(KEYS.ADMIN_PIN, DEFAULT_ADMIN_PIN);
  }
  if (force || !localStorage.getItem(KEYS.STAFF_PIN)) {
    localStorage.setItem(KEYS.STAFF_PIN, DEFAULT_STAFF_PIN);
  }
}

// Getters and Setters
export function getBooklets(): Booklet[] {
  initializeDatabase();
  const saved = localStorage.getItem(KEYS.BOOKLETS);
  return saved ? JSON.parse(saved) : [];
}

export function saveBooklets(booklets: Booklet[]): void {
  localStorage.setItem(KEYS.BOOKLETS, JSON.stringify(booklets));
}

export function getRedemptions(): Redemption[] {
  initializeDatabase();
  const saved = localStorage.getItem(KEYS.REDEMPTIONS);
  return saved ? JSON.parse(saved) : [];
}

export function saveRedemptions(redemptions: Redemption[]): void {
  localStorage.setItem(KEYS.REDEMPTIONS, JSON.stringify(redemptions));
}

export function getOutlets(): Outlet[] {
  initializeDatabase();
  const saved = localStorage.getItem(KEYS.OUTLETS);
  return saved ? JSON.parse(saved) : [];
}

export function saveOutlets(outlets: Outlet[]): void {
  localStorage.setItem(KEYS.OUTLETS, JSON.stringify(outlets));
}

export function getStaff(): Staff[] {
  initializeDatabase();
  const saved = localStorage.getItem(KEYS.STAFF);
  return saved ? JSON.parse(saved) : [];
}

export function saveStaff(staff: Staff[]): void {
  localStorage.setItem(KEYS.STAFF, JSON.stringify(staff));
}

export function getPasscodes(): { adminPin: string; staffPin: string } {
  initializeDatabase();
  const adminPin = localStorage.getItem(KEYS.ADMIN_PIN) || DEFAULT_ADMIN_PIN;
  const staffPin = localStorage.getItem(KEYS.STAFF_PIN) || DEFAULT_STAFF_PIN;
  return { adminPin, staffPin };
}

export function savePasscodes(adminPin: string, staffPin: string): void {
  localStorage.setItem(KEYS.ADMIN_PIN, adminPin);
  localStorage.setItem(KEYS.STAFF_PIN, staffPin);
}

// Backup & Import
export function exportDatabaseBackup(): string {
  const data = {
    booklets: getBooklets(),
    redemptions: getRedemptions(),
    outlets: getOutlets(),
    staff: getStaff(),
    adminPin: localStorage.getItem(KEYS.ADMIN_PIN) || DEFAULT_ADMIN_PIN,
    staffPin: localStorage.getItem(KEYS.STAFF_PIN) || DEFAULT_STAFF_PIN,
    exportedAt: new Date().toISOString()
  };
  return JSON.stringify(data, null, 2);
}

export function importDatabaseBackup(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.booklets && Array.isArray(parsed.booklets)) {
      saveBooklets(parsed.booklets);
    }
    if (parsed.redemptions && Array.isArray(parsed.redemptions)) {
      saveRedemptions(parsed.redemptions);
    }
    if (parsed.outlets && Array.isArray(parsed.outlets)) {
      saveOutlets(parsed.outlets);
    }
    if (parsed.staff && Array.isArray(parsed.staff)) {
      saveStaff(parsed.staff);
    }
    if (parsed.adminPin && typeof parsed.adminPin === "string") {
      localStorage.setItem(KEYS.ADMIN_PIN, parsed.adminPin);
    }
    if (parsed.staffPin && typeof parsed.staffPin === "string") {
      localStorage.setItem(KEYS.STAFF_PIN, parsed.staffPin);
    }
    return true;
  } catch (e) {
    console.error("Failed to import database backup:", e);
    return false;
  }
}
