/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Booklet, Redemption, Outlet, Staff, CouponType, normalizeCouponType } from "../types";

function parseCouponIndex(val: any, rawType?: any): number {
  // First, check if the rawType has a clear index at the end, e.g. bogo_large_2, bogo_large_3, BOGO Large #2
  const typeStr = String(rawType || "").trim().toLowerCase();
  
  // Pattern matches things like: "bogo_large_2", "bogo large #2", "bogo_medium_3", "bogo_medium_1"
  // Let's find any number at the end of the type string, optionally preceded by _ or # or space or hyphen.
  const endingNumMatch = typeStr.match(/(?:_|\s|#|-)+([1-4])$/) || typeStr.match(/([1-4])$/);
  if (endingNumMatch) {
    const idx = parseInt(endingNumMatch[1], 10);
    if (!isNaN(idx) && idx >= 1 && idx <= 4) {
      return idx;
    }
  }

  if (val === undefined || val === null) return 1;
  const str = String(val).trim();
  const digits = str.match(/\d+/);
  if (digits) {
    return parseInt(digits[0], 10);
  }
  const parsed = parseInt(str, 10);
  return isNaN(parsed) ? 1 : parsed;
}

function parseNumericValue(val: any): number {
  if (val === undefined || val === null) return 0;
  const str = String(val).trim().replace(/,/g, "");
  const digits = str.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (digits) {
    return parseFloat(digits[0]);
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

// Standard headers for our spreadsheet schema
export const HEADERS = {
  BOOKLETS: ["Booklet ID", "Customer Name", "Customer Phone", "Date Sold", "Price Paid", "Outlet", "Staff Name", "Status", "Notes"],
  REDEMPTIONS: ["Redemption ID", "Booklet ID", "Coupon Type", "Coupon Index", "Date Redeemed", "Order Value", "Staff Name", "Outlet", "Notes"],
  OUTLETS: ["Outlet Name", "Address", "Phone"],
  STAFF: ["Email", "Name", "Role", "Outlet"]
};

// Helper to make fetch calls to the Google Sheets API
async function apiCall(
  endpoint: string,
  method: "GET" | "POST" | "PUT",
  token: string,
  body?: any
) {
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = `Sheets API error (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      message = errJson.error?.message || message;
    } catch {
      message = errText || message;
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * Validates connection to the spreadsheet and returns available sheets/tabs.
 */
export async function getSpreadsheetDetails(spreadsheetId: string, token: string) {
  const data = await apiCall(spreadsheetId, "GET", token);
  const sheets = data.sheets || [];
  return {
    title: data.properties?.title || "Untitled Spreadsheet",
    sheetNames: sheets.map((s: any) => s.properties?.title as string)
  };
}

/**
 * Creates missing sheets and writes headers.
 */
export async function initializeSpreadsheet(spreadsheetId: string, token: string) {
  const { sheetNames } = await getSpreadsheetDetails(spreadsheetId, token);
  
  const requests: any[] = [];
  const sheetsToCreate = [
    { name: "Booklets", headers: HEADERS.BOOKLETS },
    { name: "Redemptions", headers: HEADERS.REDEMPTIONS },
    { name: "Outlets", headers: HEADERS.OUTLETS },
    { name: "Staff", headers: HEADERS.STAFF }
  ];

  // 1. Add sheets if they don't exist
  for (const sheet of sheetsToCreate) {
    // case-insensitive check
    const exists = sheetNames.some(name => name.toLowerCase() === sheet.name.toLowerCase());
    if (!exists) {
      requests.push({
        addSheet: {
          properties: {
            title: sheet.name
          }
        }
      });
    }
  }

  if (requests.length > 0) {
    await apiCall(`${spreadsheetId}:batchUpdate`, "POST", token, { requests });
  }

  // 2. Write headers for sheets (safe to do, won't overwrite existing if we do cell A1 only)
  // Let's write them specifically to ensure correct column structure
  for (const sheet of sheetsToCreate) {
    // Find the actual name as in the sheet (could be different casing, but we'll write to our version)
    const targetName = sheetNames.find(name => name.toLowerCase() === sheet.name.toLowerCase()) || sheet.name;
    
    // Check if range is empty first or write conditionally
    try {
      const currentValues = await apiCall(`${spreadsheetId}/values/${targetName}!A1:Z1`, "GET", token);
      if (!currentValues.values || currentValues.values.length === 0 || currentValues.values[0].length === 0) {
        // Write headers
        await apiCall(
          `${spreadsheetId}/values/${targetName}!A1:append?valueInputOption=USER_ENTERED`,
          "POST",
          token,
          { values: [sheet.headers] }
        );
      }
    } catch (e) {
      console.warn(`Error writing headers to ${targetName}:`, e);
    }
  }
}

/**
 * Fetches all sheets data and parses them.
 */
export async function fetchAllData(spreadsheetId: string, token: string) {
  const { sheetNames } = await getSpreadsheetDetails(spreadsheetId, token);
  
  // Resolve exact names of sheets (case-insensitive fallback)
  const bookletsTab = sheetNames.find(n => n.toLowerCase() === "booklets") || "Booklets";
  const redemptionsTab = sheetNames.find(n => n.toLowerCase() === "redemptions") || "Redemptions";
  const outletsTab = sheetNames.find(n => n.toLowerCase() === "outlets") || "Outlets";
  const staffTab = sheetNames.find(n => n.toLowerCase() === "staff") || "Staff";

  // Fetch in parallel
  const [bookletsRes, redemptionsRes, outletsRes, staffRes] = await Promise.all([
    apiCall(`${spreadsheetId}/values/${bookletsTab}!A1:Z`, "GET", token).catch(() => ({ values: [] })),
    apiCall(`${spreadsheetId}/values/${redemptionsTab}!A1:Z`, "GET", token).catch(() => ({ values: [] })),
    apiCall(`${spreadsheetId}/values/${outletsTab}!A1:Z`, "GET", token).catch(() => ({ values: [] })),
    apiCall(`${spreadsheetId}/values/${staffTab}!A1:Z`, "GET", token).catch(() => ({ values: [] }))
  ]);

  // Parse Booklets
  const booklets: Booklet[] = [];
  const bookletsRows = bookletsRes.values || [];
  if (bookletsRows.length > 1) {
    const headers = bookletsRows[0].map((h: string) => h.toLowerCase().trim());
    for (let i = 1; i < bookletsRows.length; i++) {
      const row = bookletsRows[i];
      if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows
      
      const booklet: any = {
        id: String(row[headers.indexOf("booklet id")] || row[0] || "").trim(),
        customerName: row[headers.indexOf("customer name")] || row[1] || "",
        customerPhone: row[headers.indexOf("customer phone")] || row[2] || "",
        dateSold: row[headers.indexOf("date sold")] || row[3] || "",
        pricePaid: parseNumericValue(row[headers.indexOf("price paid")] || row[4]),
        outlet: row[headers.indexOf("outlet")] || row[5] || "Antop Hill",
        staffName: row[headers.indexOf("staff name")] || row[6] || "",
        status: (row[headers.indexOf("status")] || row[7] || "Active") as any,
        notes: row[headers.indexOf("notes")] || row[8] || ""
      };
      booklets.push(booklet);
    }
  }

  // Parse Redemptions
  const redemptions: Redemption[] = [];
  const redemptionsRows = redemptionsRes.values || [];
  if (redemptionsRows.length > 1) {
    const headers = redemptionsRows[0].map((h: string) => h.toLowerCase().trim());
    for (let i = 1; i < redemptionsRows.length; i++) {
      const row = redemptionsRows[i];
      if (!row || row.length === 0 || !row[0]) continue;
      
      const r: any = {
        id: row[headers.indexOf("redemption id")] || row[0] || "",
        bookletId: String(row[headers.indexOf("booklet id")] || row[1] || "").trim(),
        couponType: normalizeCouponType(row[headers.indexOf("coupon type")] || row[2] || ""),
        couponIndex: parseCouponIndex(
          headers.indexOf("coupon index") >= 0 ? row[headers.indexOf("coupon index")] : row[3],
          headers.indexOf("coupon type") >= 0 ? row[headers.indexOf("coupon type")] : row[2]
        ),
        dateRedeemed: row[headers.indexOf("date redeemed")] || row[4] || "",
        orderValue: parseNumericValue(row[headers.indexOf("order value")] || row[5]),
        staffName: row[headers.indexOf("staff name")] || row[6] || "",
        outlet: row[headers.indexOf("outlet")] || row[7] || "Antop Hill",
        notes: row[headers.indexOf("notes")] || row[8] || ""
      };
      redemptions.push(r);
    }
  }

  // Parse Outlets
  const outlets: Outlet[] = [];
  const outletsRows = outletsRes.values || [];
  if (outletsRows.length > 1) {
    const headers = outletsRows[0].map((h: string) => h.toLowerCase().trim());
    for (let i = 1; i < outletsRows.length; i++) {
      const row = outletsRows[i];
      if (!row || row.length === 0 || !row[0]) continue;
      
      outlets.push({
        name: row[headers.indexOf("outlet name")] || row[0] || "",
        address: row[headers.indexOf("address")] || row[1] || "",
        phone: row[headers.indexOf("phone")] || row[2] || ""
      });
    }
  } else {
    // Add default outlet if none exists
    outlets.push({ name: "Antop Hill", address: "Prezzo Pizzeria, Antop Hill", phone: "" });
  }

  // Parse Staff
  const staff: Staff[] = [];
  const staffRows = staffRes.values || [];
  if (staffRows.length > 1) {
    const headers = staffRows[0].map((h: string) => h.toLowerCase().trim());
    for (let i = 1; i < staffRows.length; i++) {
      const row = staffRows[i];
      if (!row || row.length === 0 || !row[0]) continue;
      
      staff.push({
        email: row[headers.indexOf("email")] || row[0] || "",
        name: row[headers.indexOf("name")] || row[1] || "",
        role: (row[headers.indexOf("role")] || row[2] || "Staff") as "Admin" | "Staff",
        outlet: row[headers.indexOf("outlet")] || row[3] || ""
      });
    }
  }

  return { booklets, redemptions, outlets, staff, tabs: { bookletsTab, redemptionsTab, outletsTab, staffTab } };
}

/**
 * Adds a new Booklet row.
 */
export async function appendBooklet(
  spreadsheetId: string,
  tabName: string,
  booklet: Booklet,
  token: string
) {
  const values = [
    [
      booklet.id,
      booklet.customerName,
      booklet.customerPhone,
      booklet.dateSold,
      booklet.pricePaid,
      booklet.outlet,
      booklet.staffName,
      booklet.status,
      booklet.notes || ""
    ]
  ];
  return apiCall(
    `${spreadsheetId}/values/${tabName}!A1:append?valueInputOption=USER_ENTERED`,
    "POST",
    token,
    { values }
  );
}

/**
 * Adds a new Redemption row.
 */
export async function appendRedemption(
  spreadsheetId: string,
  tabName: string,
  redemption: Redemption,
  token: string
) {
  const values = [
    [
      redemption.id,
      redemption.bookletId,
      redemption.couponType,
      redemption.couponIndex,
      redemption.dateRedeemed,
      redemption.orderValue,
      redemption.staffName,
      redemption.outlet,
      redemption.notes || ""
    ]
  ];
  return apiCall(
    `${spreadsheetId}/values/${tabName}!A1:append?valueInputOption=USER_ENTERED`,
    "POST",
    token,
    { values }
  );
}

/**
 * Updates an existing Booklet row (e.g. status changes).
 */
export async function updateBookletRow(
  spreadsheetId: string,
  tabName: string,
  rowNum: number, // 2-indexed sheet row number
  booklet: Booklet,
  token: string
) {
  const values = [
    [
      booklet.id,
      booklet.customerName,
      booklet.customerPhone,
      booklet.dateSold,
      booklet.pricePaid,
      booklet.outlet,
      booklet.staffName,
      booklet.status,
      booklet.notes || ""
    ]
  ];
  return apiCall(
    `${spreadsheetId}/values/${tabName}!A${rowNum}:I${rowNum}?valueInputOption=USER_ENTERED`,
    "PUT",
    token,
    { values }
  );
}

/**
 * Adds a new Outlet row.
 */
export async function appendOutlet(
  spreadsheetId: string,
  tabName: string,
  outlet: Outlet,
  token: string
) {
  const values = [
    [
      outlet.name,
      outlet.address || "",
      outlet.phone || ""
    ]
  ];
  return apiCall(
    `${spreadsheetId}/values/${tabName}!A1:append?valueInputOption=USER_ENTERED`,
    "POST",
    token,
    { values }
  );
}

/**
 * Adds a new Staff row.
 */
export async function appendStaff(
  spreadsheetId: string,
  tabName: string,
  staffMember: Staff,
  token: string
) {
  const values = [
    [
      staffMember.email,
      staffMember.name,
      staffMember.role,
      staffMember.outlet || ""
    ]
  ];
  return apiCall(
    `${spreadsheetId}/values/${tabName}!A1:append?valueInputOption=USER_ENTERED`,
    "POST",
    token,
    { values }
  );
}
