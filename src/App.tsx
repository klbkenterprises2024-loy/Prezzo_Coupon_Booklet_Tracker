/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Booklet,
  Redemption,
  Outlet,
  Staff,
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
import SystemSettings from "./components/SystemSettings";

import {
  Pizza,
  LayoutDashboard,
  BookOpen,
  Store,
  Users,
  Settings,
  LogOut,
  User as UserIcon,
  MapPin,
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { 
  getBooklets, 
  saveBooklets, 
  getRedemptions, 
  saveRedemptions, 
  getOutlets, 
  saveOutlets, 
  getStaff, 
  saveStaff, 
  getPasscodes,
  initializeDatabase
} from "./lib/db";

export default function App() {
  // Initialize the database if not already done
  useEffect(() => {
    initializeDatabase();
  }, []);

  // Auth state
  const [user, setUser] = useState<{ displayName: string; email: string; uid: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<"Admin" | "Staff">("Staff");

  // Local storage state managers
  const [booklets, setBooklets] = useState<Booklet[]>(() => getBooklets());
  const [redemptions, setRedemptions] = useState<Redemption[]>(() => getRedemptions());
  const [outlets, setOutlets] = useState<Outlet[]>(() => getOutlets());
  const [staffList, setStaffList] = useState<Staff[]>(() => getStaff());

  // Navigation state
  const [activeTab, setActiveTab] = useState<"dashboard" | "registry" | "outlets" | "staff" | "settings">("dashboard");
  const [selectedBookletId, setSelectedBookletId] = useState<string | null>(null);
  const [showAddBooklet, setShowAddBooklet] = useState(false);
  const [activeOutlet, setActiveOutlet] = useState<string>("");

  // Load active session from localStorage on mount
  useEffect(() => {
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
  }, []);

  // Set default active outlet when outlets list is loaded
  useEffect(() => {
    if (outlets.length > 0 && !activeOutlet) {
      setActiveOutlet(outlets[0].name);
    }
  }, [outlets, activeOutlet]);

  // Handle local state synchronizations
  const reloadData = () => {
    setBooklets(getBooklets());
    setRedemptions(getRedemptions());
    setOutlets(getOutlets());
    setStaffList(getStaff());
    
    // Validate session roles in case passcodes changed
    const savedSession = localStorage.getItem("prezzo_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        const { adminPin, staffPin } = getPasscodes();
        const pinUsed = parsed.pinUsed || "";
        
        if (pinUsed) {
          if (pinUsed === adminPin) {
            setCurrentUserRole("Admin");
          } else if (pinUsed === staffPin) {
            setCurrentUserRole("Staff");
          } else {
            // Log out if PIN is no longer valid
            handleLogout();
          }
        }
      } catch (err) {
        console.error("Session re-validation failed:", err);
      }
    }
  };

  // Login PIN validation
  const handleLogin = async (passcode: string) => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const cleaned = passcode.trim();
      if (!cleaned) {
        throw new Error("Please enter a passcode.");
      }

      const { adminPin, staffPin } = getPasscodes();

      if (cleaned === adminPin) {
        const userObj = {
          displayName: "Loy Rego (Admin)",
          email: "loyrego@gmail.com",
          uid: "admin"
        };
        setUser(userObj);
        setCurrentUserRole("Admin");
        localStorage.setItem("prezzo_session", JSON.stringify({ 
          user: userObj, 
          role: "Admin", 
          outlet: outlets[0]?.name || "Antop Hill",
          pinUsed: adminPin
        }));
      } else if (cleaned === staffPin) {
        const userObj = {
          displayName: "Staff Member",
          email: "staff@prezzo.com",
          uid: "staff"
        };
        setUser(userObj);
        setCurrentUserRole("Staff");
        localStorage.setItem("prezzo_session", JSON.stringify({ 
          user: userObj, 
          role: "Staff", 
          outlet: outlets[0]?.name || "Antop Hill",
          pinUsed: staffPin
        }));
      } else {
        throw new Error("Invalid staff passcode. Please contact Loy Rego.");
      }
    } catch (e: any) {
      setAuthError(e.message || "Authentication failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setUser(null);
    setCurrentUserRole("Staff");
    setSelectedBookletId(null);
    localStorage.removeItem("prezzo_session");
  };

  // Create physical booklet
  const handleAddBooklet = async (newBooklet: Booklet) => {
    const updated = [newBooklet, ...booklets];
    saveBooklets(updated);
    setBooklets(updated);
  };

  // Redeem coupon
  const handleRedeemCoupon = async (
    couponType: CouponType,
    couponIndex: number,
    orderValue: number,
    outletName: string,
    notes?: string,
    dateRedeemed?: string
  ) => {
    if (!user) throw new Error("Verification required to redeem coupons.");
    if (!selectedBookletId) throw new Error("No booklet is selected.");

    const newRedemption: Redemption = {
      id: `R-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookletId: selectedBookletId,
      couponType,
      couponIndex,
      dateRedeemed: dateRedeemed ? new Date(dateRedeemed).toISOString() : new Date().toISOString(),
      orderValue,
      staffName: user.displayName || "Staff",
      outlet: outletName,
      notes
    };

    const updated = [newRedemption, ...redemptions];
    saveRedemptions(updated);
    setRedemptions(updated);
  };

  // Add Outlet (Admin Only)
  const handleAddOutlet = async (newOutlet: Outlet) => {
    const updated = [...outlets, newOutlet];
    saveOutlets(updated);
    setOutlets(updated);
  };

  // Add Staff (Admin Only)
  const handleAddStaff = async (newStaff: Staff) => {
    const updated = [...staffList, newStaff];
    saveStaff(updated);
    setStaffList(updated);
  };

  // Convert raw booklets & redemptions data into fully enriched Booklet structures with the 14 coupons
  const enrichedBooklets: BookletWithCoupons[] = booklets.map(booklet => {
    const coupons: CouponStatus[] = [];
    
    const addCouponGroup = (type: CouponType, count: number) => {
      for (let i = 1; i <= count; i++) {
        const id = `${type.replace(/\s+/g, "_").toUpperCase()}_${i}`;
        const displayName = `${type} #${i}`;
        
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
  if (!user) {
    return (
      <Login
        onLogin={handleLogin}
        isLoggingIn={isLoggingIn}
        error={authError}
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
              <p className="text-[9px] font-mono text-white/60 tracking-widest uppercase">Coupon Booklet Tracker</p>
            </div>
          </div>

          {/* User profile, active outlet, and actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Active Outlet select for staff */}
            {outlets.length > 0 && (
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
            )}

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
            onClick={() => { setActiveTab("settings"); setSelectedBookletId(null); }}
            className={`flex items-center space-x-2.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap md:w-full md:rounded-none md:border-r-2 ${
              activeTab === "settings"
                ? "bg-[#991B1B]/5 text-[#991B1B] border-[#991B1B]"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 border-transparent"
            }`}
          >
            <Settings size={16} />
            <span>System Settings</span>
          </button>
        </aside>

        {/* Content Panel Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-0 pb-12">
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
                  currentStaffName={user.displayName}
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

                  {activeTab === "settings" && (
                    <SystemSettings
                      booklets={booklets}
                      redemptions={redemptions}
                      onDataChange={reloadData}
                      isAdmin={isAdmin}
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
          staffName={user.displayName}
          activeOutlet={activeOutlet}
        />
      )}
    </div>
  );
}
