/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  getSpreadsheetDetails,
  initializeSpreadsheet,
  fetchAllData,
  appendBooklet,
  appendRedemption,
  appendOutlet,
  appendStaff
} from "./lib/googleSheets";
import {
  Booklet,
  Redemption,
  Outlet,
  Staff,
  SyncState,
  BookletWithCoupons,
  CouponType,
  CouponStatus,
  normalizeCouponType
} from "./types";

import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import BookletList from "./components/BookletList";
import BookletDetail from "./components/BookletDetail";
import AddBookletForm from "./components/AddBookletForm";
import OutletManager from "./components/OutletManager";
import StaffManager from "./components/StaffManager";
import SheetSettings from "./components/SheetSettings";
import { googleSignIn, initAuth, logout as googleSignOut } from "./lib/auth";

import {
  Pizza,
  LayoutDashboard,
  BookOpen,
  Store,
  Users,
  Database,
  LogOut,
  RefreshCw,
  User as UserIcon,
  ShieldAlert,
  MapPin,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DEFAULT_SPREADSHEET_ID = "1WyE-409xzE1AtyvkEbBa8upOUdhxlyM8wzmKEDa-qAI";

export default function App() {
  // Auth state
  const [user, setUser] = useState<{ displayName: string; email: string; uid: string } | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("prezzo_sheets_token") || null;
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);

  // Sheets data state with localStorage fallbacks
  const [booklets, setBooklets] = useState<Booklet[]>(() => {
    const saved = localStorage.getItem("prezzo_booklets");
    return saved ? JSON.parse(saved) : [];
  });
  const [redemptions, setRedemptions] = useState<Redemption[]>(() => {
    const saved = localStorage.getItem("prezzo_redemptions");
    return saved ? JSON.parse(saved) : [];
  });
  const [outlets, setOutlets] = useState<Outlet[]>(() => {
    const saved = localStorage.getItem("prezzo_outlets");
    if (saved) return JSON.parse(saved);
    return [
      { name: "Antop Hill", address: "Prezzo Pizzeria, Antop Hill", phone: "" },
      { name: "Sion", address: "Prezzo Pizzeria, Sion", phone: "" }
    ];
  });
  const [staffList, setStaffList] = useState<Staff[]>(() => {
    const saved = localStorage.getItem("prezzo_staff");
    if (saved) return JSON.parse(saved);
    return [
      { email: "loyrego@gmail.com", name: "Loy Rego", role: "Admin", outlet: "Antop Hill" }
    ];
  });
  const [sheetTabs, setSheetTabs] = useState<any>({});

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>({
    spreadsheetId: localStorage.getItem("prezzo_spreadsheet_id") || DEFAULT_SPREADSHEET_ID,
    isLinked: false,
    isSyncing: false,
    lastSyncTime: null,
    error: null
  });

  // UI Navigation state
  const [activeTab, setActiveTab] = useState<"dashboard" | "registry" | "outlets" | "staff" | "sync">("dashboard");
  const [selectedBookletId, setSelectedBookletId] = useState<string | null>(null);
  const [showAddBooklet, setShowAddBooklet] = useState(false);
  const [activeOutlet, setActiveOutlet] = useState<string>("Antop Hill");
  const [currentUserRole, setCurrentUserRole] = useState<"Admin" | "Staff">("Staff");

  // Load auth session on app load and listen to Google Auth state changes
  useEffect(() => {
    // 1. Try restoring from localStorage first
    const savedSession = localStorage.getItem("prezzo_session");
    if (savedSession) {
      try {
        const { user: savedUser, role: savedRole, outlet: savedOutlet } = JSON.parse(savedSession);
        setUser(savedUser);
        setCurrentUserRole(savedRole || "Staff");
        if (savedOutlet) {
          setActiveOutlet(savedOutlet);
        }
      } catch (e) {
        console.error("Failed to parse saved session", e);
      }
    }

    // 2. Setup Firebase Google Auth listener to capture fresh access tokens
    const unsubscribe = initAuth(
      (googleUser, accessToken) => {
        setToken(accessToken);
        localStorage.setItem("prezzo_sheets_token", accessToken);

        const email = googleUser.email?.toLowerCase().trim() || "";
        let role: "Admin" | "Staff" = "Staff";
        let outlet = "Antop Hill";

        if (email === "loyrego@gmail.com") {
          role = "Admin";
        } else {
          const foundStaff = staffList.find(s => s.email.toLowerCase().trim() === email);
          if (foundStaff) {
            role = foundStaff.role;
            outlet = foundStaff.outlet || "Antop Hill";
          }
        }

        const userObj = {
          displayName: googleUser.displayName || googleUser.email || "Staff",
          email: googleUser.email || "",
          uid: googleUser.uid
        };

        setUser(userObj);
        setCurrentUserRole(role);
        setActiveOutlet(outlet);
        localStorage.setItem("prezzo_session", JSON.stringify({ user: userObj, role, outlet }));
        setUnauthorizedEmail(null);
      },
      () => {
        // Not logged in or expired token - do nothing, keep current local session active
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem("prezzo_booklets", JSON.stringify(booklets));
  }, [booklets]);

  useEffect(() => {
    localStorage.setItem("prezzo_redemptions", JSON.stringify(redemptions));
  }, [redemptions]);

  useEffect(() => {
    localStorage.setItem("prezzo_outlets", JSON.stringify(outlets));
  }, [outlets]);

  useEffect(() => {
    localStorage.setItem("prezzo_staff", JSON.stringify(staffList));
  }, [staffList]);

  // Sync spreadsheet on load if we have a token
  useEffect(() => {
    if (token && token !== "local-token" && syncState.spreadsheetId) {
      loadSpreadsheetData(syncState.spreadsheetId, token);
    }
  }, [token, syncState.spreadsheetId]);

  // Load spreadsheet data and run validations
  const loadSpreadsheetData = async (spreadsheetId: string, currentToken: string) => {
    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));
    try {
      // Validate spreadsheet connection
      await getSpreadsheetDetails(spreadsheetId, currentToken);
      
      // Load all tables
      const data = await fetchAllData(spreadsheetId, currentToken);
      
      setBooklets(data.booklets);
      setRedemptions(data.redemptions);
      if (data.outlets.length > 0) {
        setOutlets(data.outlets);
        // Default active outlet if current active is not in list
        if (!data.outlets.some(o => o.name === activeOutlet)) {
          setActiveOutlet(data.outlets[0].name);
        }
      }
      setStaffList(data.staff);
      setSheetTabs(data.tabs);

      setSyncState(prev => ({
        ...prev,
        spreadsheetId,
        isLinked: true,
        lastSyncTime: new Date().toISOString(),
        error: null
      }));

      // Validate the logged in user against staff roster from Google Sheets
      if (user) {
        validateUserRole(user, data.staff);
      }
    } catch (e: any) {
      console.error("Sheets loading error:", e);
      setSyncState(prev => ({
        ...prev,
        isLinked: false,
        error: `Could not connect to Google Sheet: ${e.message}`
      }));
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  // Validate user roles and access control
  const validateUserRole = (firebaseUser: { displayName: string; email: string }, staffRoster: Staff[]) => {
    const email = firebaseUser.email?.toLowerCase().trim() || "";
    
    // Super administrator fallback
    if (email === "loyrego@gmail.com") {
      setCurrentUserRole("Admin");
      setUnauthorizedEmail(null);
      return;
    }

    // If staff roster is empty, allow access (so admin can populate sheet initially)
    if (staffRoster.length === 0) {
      setCurrentUserRole("Admin");
      setUnauthorizedEmail(null);
      return;
    }

    // Check if email matches employee list
    const foundStaff = staffRoster.find(s => s.email.toLowerCase().trim() === email);
    if (foundStaff) {
      setCurrentUserRole(foundStaff.role);
      setUnauthorizedEmail(null);
      // Pre-select their primary outlet if configured
      if (foundStaff.outlet) {
        setActiveOutlet(foundStaff.outlet);
      }
    } else {
      // Access Denied
      setUnauthorizedEmail(firebaseUser.email);
    }
  };

  // Login handler
  const handleLogin = async (codeOrEmail: string) => {
    setIsLoggingIn(true);
    setAuthError(null);
    setUnauthorizedEmail(null);
    try {
      const cleaned = codeOrEmail.trim().toLowerCase();
      if (!cleaned) {
        throw new Error("Please enter a login code or email.");
      }

      // Preset codes
      const presetMap: Record<string, { name: string; email: string; role: "Admin" | "Staff"; outlet: string }> = {
        "1973": { name: "Loy Rego", email: "loyrego@gmail.com", role: "Admin", outlet: "Antop Hill" }
      };

      let loggedInUser = null;

      if (presetMap[cleaned]) {
        const p = presetMap[cleaned];
        loggedInUser = {
          displayName: p.name,
          email: p.email,
          role: p.role,
          outlet: p.outlet
        };
      } else {
        // Check if it matches roster in staffList (which loads from localStorage/Sheets)
        const foundStaff = staffList.find(s => s.email.toLowerCase().trim() === cleaned);
        if (foundStaff) {
          loggedInUser = {
            displayName: foundStaff.name,
            email: foundStaff.email,
            role: foundStaff.role,
            outlet: foundStaff.outlet || "Antop Hill"
          };
        } else if (cleaned === "loyrego@gmail.com") {
          loggedInUser = {
            displayName: "Loy Rego",
            email: "loyrego@gmail.com",
            role: "Admin" as const,
            outlet: "Antop Hill"
          };
        }
      }

      if (loggedInUser) {
        const userObj = {
          displayName: loggedInUser.displayName,
          email: loggedInUser.email,
          uid: loggedInUser.email
        };
        setUser(userObj);
        setCurrentUserRole(loggedInUser.role);
        setActiveOutlet(loggedInUser.outlet);
        localStorage.setItem("prezzo_session", JSON.stringify({ user: userObj, role: loggedInUser.role, outlet: loggedInUser.outlet }));
        setUnauthorizedEmail(null);
        
        // If we have a saved token, try to load spreadsheet data
        const savedToken = localStorage.getItem("prezzo_sheets_token");
        if (savedToken && syncState.spreadsheetId) {
          loadSpreadsheetData(syncState.spreadsheetId, savedToken);
        }
      } else {
        throw new Error("Invalid login code or unauthorized staff email.");
      }
    } catch (e: any) {
      setAuthError(e.message || "Failed to log in");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    setUser(null);
    setCurrentUserRole("Staff");
    setSelectedBookletId(null);
    setToken(null);
    localStorage.removeItem("prezzo_session");
    localStorage.removeItem("prezzo_sheets_token");
    try {
      await googleSignOut();
    } catch (e) {
      console.warn("Failed to sign out from Google Auth:", e);
    }
  };

  // Google Login handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    setUnauthorizedEmail(null);
    try {
      const result = await googleSignIn();
      if (result) {
        const { user: googleUser, accessToken } = result;
        
        // Save the access token
        handleSaveToken(accessToken);

        const email = googleUser.email?.toLowerCase().trim() || "";
        let role: "Admin" | "Staff" = "Staff";
        let outlet = "Antop Hill";

        if (email === "loyrego@gmail.com") {
          role = "Admin";
        } else {
          // Check staff list
          const foundStaff = staffList.find(s => s.email.toLowerCase().trim() === email);
          if (foundStaff) {
            role = foundStaff.role;
            outlet = foundStaff.outlet || "Antop Hill";
          } else {
            // Unregistered email
            setUnauthorizedEmail(googleUser.email);
            setIsLoggingIn(false);
            return;
          }
        }

        const userObj = {
          displayName: googleUser.displayName || googleUser.email || "Staff",
          email: googleUser.email || "",
          uid: googleUser.uid
        };

        setUser(userObj);
        setCurrentUserRole(role);
        setActiveOutlet(outlet);
        localStorage.setItem("prezzo_session", JSON.stringify({ user: userObj, role, outlet }));
        setUnauthorizedEmail(null);
      }
    } catch (e: any) {
      console.error("Google Sign-In failed", e);
      setAuthError(e.message || "Google Sign-In failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Token save & clear handlers
  const handleSaveToken = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("prezzo_sheets_token", newToken);
    if (syncState.spreadsheetId) {
      loadSpreadsheetData(syncState.spreadsheetId, newToken);
    }
  };

  const handleRemoveToken = () => {
    setToken(null);
    localStorage.removeItem("prezzo_sheets_token");
    setSyncState(prev => ({
      ...prev,
      isLinked: false,
      error: "Using offline local database storage."
    }));
  };

  // Sync action trigger
  const handleSyncNow = async () => {
    if (token && syncState.spreadsheetId) {
      await loadSpreadsheetData(syncState.spreadsheetId, token);
    }
  };

  // Link any sheet manually
  const handleLinkSheet = async (spreadsheetId: string) => {
    if (!token) throw new Error("Google Sheets Access Token is required to connect to Google Sheets. Please save an Access Token first.");
    await loadSpreadsheetData(spreadsheetId, token);
    localStorage.setItem("prezzo_spreadsheet_id", spreadsheetId);
  };

  // Initialize spreadsheet database headers
  const handleInitializeSchema = async () => {
    if (!token) throw new Error("Google Sheets Access Token is required to initialize sheet.");
    await initializeSpreadsheet(syncState.spreadsheetId, token);
  };

  // Add Booklet sales data (Admin and Staff can sell)
  const handleAddBooklet = async (newBooklet: Booklet) => {
    if (!token) throw new Error("Sign in required.");
    const tabName = sheetTabs.bookletsTab || "Booklets";
    
    // 1. Optimistic update
    setBooklets(prev => [newBooklet, ...prev]);

    // 2. Append row to Google Sheets
    if (syncState.isLinked) {
      await appendBooklet(syncState.spreadsheetId, tabName, newBooklet, token);
      await handleSyncNow(); // Refetch to sync state
    }
  };

  // Redeem physical coupon and log to Google Sheet
  const handleRedeemCoupon = async (
    couponType: CouponType,
    couponIndex: number,
    orderValue: number,
    outletName: string,
    notes?: string
  ) => {
    if (!token || !user) throw new Error("Sign in required to redeem coupons.");
    if (!selectedBookletId) throw new Error("No booklet is selected.");

    const tabName = sheetTabs.redemptionsTab || "Redemptions";
    
    const newRedemption: Redemption = {
      id: `R-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookletId: selectedBookletId,
      couponType,
      couponIndex,
      dateRedeemed: new Date().toISOString(),
      orderValue,
      staffName: user.displayName || user.email || "Staff",
      outlet: outletName,
      notes
    };

    // 1. Optimistic update
    setRedemptions(prev => [newRedemption, ...prev]);

    // 2. Append row to Google Sheet
    if (syncState.isLinked) {
      await appendRedemption(syncState.spreadsheetId, tabName, newRedemption, token);
      await handleSyncNow(); // Re-sync in background
    }
  };

  // Add Outlet (Admin Only)
  const handleAddOutlet = async (newOutlet: Outlet) => {
    if (!token) throw new Error("Authentication required.");
    const tabName = sheetTabs.outletsTab || "Outlets";

    setOutlets(prev => [...prev, newOutlet]);

    if (syncState.isLinked) {
      await appendOutlet(syncState.spreadsheetId, tabName, newOutlet, token);
      await handleSyncNow();
    }
  };

  // Add Staff / Authorize user (Admin Only)
  const handleAddStaff = async (newStaff: Staff) => {
    if (!token) throw new Error("Authentication required.");
    const tabName = sheetTabs.staffTab || "Staff";

    setStaffList(prev => [...prev, newStaff]);

    if (syncState.isLinked) {
      await appendStaff(syncState.spreadsheetId, tabName, newStaff, token);
      await handleSyncNow();
    }
  };

  // Convert raw booklets & redemptions data into fully enriched Booklet structures with the 14 coupons
  const enrichedBooklets: BookletWithCoupons[] = booklets.map(booklet => {
    const coupons: CouponStatus[] = [];
    
    const addCouponGroup = (type: CouponType, count: number) => {
      for (let i = 1; i <= count; i++) {
        const id = `${type.replace(/\s+/g, "_").toUpperCase()}_${i}`;
        const displayName = `${type} #${i}`;
        
        // Find if this index was redeemed (using robust case-insensitive and type-normalized matches)
        const redemption = redemptions.find(
          r => String(r.bookletId).trim().toLowerCase() === String(booklet.id).trim().toLowerCase() &&
               normalizeCouponType(r.couponType) === normalizeCouponType(type) &&
               Number(r.couponIndex) === i
        );
        
        coupons.push({
          coupon: { type, index: i, id, displayName },
          isRedeemed: !!redemption,
          redemption
        });
      }
    };

    addCouponGroup(CouponType.BOGO_LARGE, 4);
    addCouponGroup(CouponType.BOGO_MEDIUM, 4);
    addCouponGroup(CouponType.MEDIUM_TO_LARGE, 4);
    addCouponGroup(CouponType.COMPLIMENTARY_500, 2);

    const redeemedCount = coupons.filter(c => c.isRedeemed).length;
    
    // Find latest redemption date (using case-insensitive matching)
    const bookletReds = redemptions.filter(
      r => String(r.bookletId).trim().toLowerCase() === String(booklet.id).trim().toLowerCase()
    );
    const lastOrderDate = bookletReds.length > 0
      ? [...bookletReds].sort((a, b) => new Date(b.dateRedeemed).getTime() - new Date(a.dateRedeemed).getTime())[0].dateRedeemed
      : null;

    return {
      ...booklet,
      coupons,
      redeemedCount,
      totalCount: coupons.length,
      lastOrderDate
    };
  });

  const selectedBooklet = enrichedBooklets.find(b => b.id === selectedBookletId);
  const isAdmin = currentUserRole === "Admin";

  // Login view guard
  if (!user || unauthorizedEmail) {
    return (
      <Login
        onLogin={handleLogin}
        onGoogleLogin={handleGoogleLogin}
        isLoggingIn={isLoggingIn}
        error={authError}
        unauthorizedEmail={unauthorizedEmail}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-stone-800 flex flex-col font-sans">
      {/* Top Banner Shell */}
      <header className="bg-[#991B1B] text-[#FAF6F0] border-b border-[#7F1D1D] shadow-md z-30 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-2 rounded-xl border border-white/20 shadow flex items-center justify-center text-amber-200">
              <Pizza size={22} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-serif text-white tracking-tight flex items-center gap-1">
                <span>PREZZO</span>
                <span className="text-[10px] font-sans font-bold text-amber-200/90 uppercase tracking-widest pl-1 border-l border-white/15">Pizzeria</span>
              </h1>
              <p className="text-[9px] font-mono text-white/60 tracking-widest uppercase">Coupon Booklet Sync</p>
            </div>
          </div>

          {/* User profile, active outlet, and actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Active Outlet select for staff */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-white/10 border border-white/10 rounded-xl px-2.5 py-1 text-xs">
              <MapPin size={13} className="text-amber-200" />
              <span className="text-[#FAF6F0]/85">Outlet:</span>
              <select
                value={activeOutlet}
                onChange={(e) => setActiveOutlet(e.target.value)}
                className="bg-transparent text-white font-bold border-none p-0 focus:ring-0 cursor-pointer text-xs"
              >
                {outlets.map((o, idx) => (
                  <option key={idx} value={o.name} className="bg-[#991B1B] text-white">{o.name}</option>
                ))}
              </select>
            </div>

            {/* Sync status button */}
            <button
              onClick={handleSyncNow}
              disabled={syncState.isSyncing}
              className={`p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-[#FAF6F0] disabled:opacity-50 cursor-pointer flex items-center justify-center`}
              title="Sync Google Sheet data"
            >
              <RefreshCw size={14} className={syncState.isSyncing ? "animate-spin text-amber-200" : ""} />
            </button>

            {/* User credentials */}
            <div className="flex items-center space-x-2 border-l border-white/10 pl-3 sm:pl-4">
              <div className="hidden md:block text-right">
                <div className="text-xs font-serif font-bold text-white">{user.displayName || "Staff"}</div>
                <div className="text-[10px] text-white/60 font-mono flex items-center justify-end space-x-1">
                  <span>{user.email}</span>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${isAdmin ? "bg-amber-300" : "bg-green-400"}`}></span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-white/70 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                title="Sign out of portal"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Shell */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto px-0 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 gap-6 overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className="md:w-64 flex-shrink-0 flex md:flex-col bg-white md:bg-transparent shadow-sm md:shadow-none border-b md:border-b-0 border-stone-200 px-4 md:px-0 py-2 md:py-0 overflow-x-auto md:overflow-x-visible gap-1 z-20">
          <div className="hidden md:block px-4 py-2">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-serif">Main Menu</p>
          </div>
          <button
            onClick={() => { setActiveTab("dashboard"); setSelectedBookletId(null); }}
            className={`flex items-center space-x-2.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full md:rounded-none md:border-r-2 ${
              activeTab === "dashboard"
                ? "bg-[#991B1B]/5 text-[#991B1B] border-[#991B1B]"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 border-transparent"
            }`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { setActiveTab("registry"); }}
            className={`flex items-center space-x-2.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full md:rounded-none md:border-r-2 ${
              activeTab === "registry"
                ? "bg-[#991B1B]/5 text-[#991B1B] border-[#991B1B]"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 border-transparent"
            }`}
          >
            <BookOpen size={16} />
            <span>Booklet Registry</span>
          </button>

          <button
            onClick={() => { setActiveTab("outlets"); setSelectedBookletId(null); }}
            className={`flex items-center space-x-2.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full md:rounded-none md:border-r-2 ${
              activeTab === "outlets"
                ? "bg-[#991B1B]/5 text-[#991B1B] border-[#991B1B]"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 border-transparent"
            }`}
          >
            <Store size={16} />
            <span>Outlets</span>
          </button>

          <button
            onClick={() => { setActiveTab("staff"); setSelectedBookletId(null); }}
            className={`flex items-center space-x-2.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full md:rounded-none md:border-r-2 ${
              activeTab === "staff"
                ? "bg-[#991B1B]/5 text-[#991B1B] border-[#991B1B]"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 border-transparent"
            }`}
          >
            <Users size={16} />
            <span>Staff Roster</span>
          </button>

          <div className="hidden md:block px-4 py-2 mt-4">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-serif">System</p>
          </div>
          <button
            onClick={() => { setActiveTab("sync"); setSelectedBookletId(null); }}
            className={`flex items-center space-x-2.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full md:rounded-none md:border-r-2 ${
              activeTab === "sync"
                ? "bg-[#991B1B]/5 text-[#991B1B] border-[#991B1B]"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 border-transparent"
            }`}
          >
            <Database size={16} />
            <span>Google Sheets Sync</span>
          </button>
        </aside>

        {/* Content Panel Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-0 pb-12">
          {/* Linked Status Warning Banner if disconnected */}
          {!syncState.isLinked && (
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-xs text-amber-800 shadow-sm">
              <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Offline / Fallback Mode:</span> The application cannot read or sync data from your configured Google Sheet spreadsheet. Any booklet transactions will exist in memory only. Verify your Spreadsheet link or sign-in privileges.
                <button
                  onClick={() => setActiveTab("sync")}
                  className="mt-2 block font-semibold underline text-amber-700 hover:text-amber-800"
                >
                  Configure sheets connection
                </button>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedBookletId ? `detail-${selectedBookletId}` : activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {selectedBookletId && selectedBooklet ? (
                <BookletDetail
                  booklet={selectedBooklet}
                  outlets={outlets}
                  onBack={() => setSelectedBookletId(null)}
                  onRedeemCoupon={handleRedeemCoupon}
                  currentStaffName={user.displayName || user.email || "Staff"}
                  activeOutlet={activeOutlet}
                />
              ) : (
                <>
                  {activeTab === "dashboard" && (
                    <Dashboard
                      booklets={enrichedBooklets}
                      redemptions={redemptions}
                      outlets={outlets}
                    />
                  )}

                  {activeTab === "registry" && (
                    <BookletList
                      booklets={enrichedBooklets}
                      outlets={outlets}
                      onSelectBooklet={setSelectedBookletId}
                      onOpenAddBooklet={() => setShowAddBooklet(true)}
                      isAdmin={isAdmin}
                    />
                  )}

                  {activeTab === "outlets" && (
                    <OutletManager
                      outlets={outlets}
                      onAddOutlet={handleAddOutlet}
                      isAdmin={isAdmin}
                    />
                  )}

                  {activeTab === "staff" && (
                    <StaffManager
                      staffList={staffList}
                      outlets={outlets}
                      onAddStaff={handleAddStaff}
                      isAdmin={isAdmin}
                      currentUserEmail={user.email || undefined}
                    />
                  )}

                  {activeTab === "sync" && (
                    <SheetSettings
                      syncState={syncState}
                      onLinkSheet={handleLinkSheet}
                      onInitializeSchema={handleInitializeSchema}
                      onSync={handleSyncNow}
                      isAdmin={isAdmin}
                      token={token}
                      onSaveToken={handleSaveToken}
                      onRemoveToken={handleRemoveToken}
                      onGoogleLogin={handleGoogleLogin}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Log Sales Modal overlay */}
      {showAddBooklet && (
        <AddBookletForm
          outlets={outlets}
          existingBooklets={booklets}
          onAddBooklet={handleAddBooklet}
          onClose={() => setShowAddBooklet(false)}
          staffName={user.displayName || user.email || "Staff"}
          activeOutlet={activeOutlet}
        />
      )}
    </div>
  );
}
