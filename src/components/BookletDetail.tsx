/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookletWithCoupons, CouponStatus, CouponType, Outlet, Redemption } from "../types";
import { ArrowLeft, Ticket, CheckCircle2, User, Clock, Store, CreditCard, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BookletDetailProps {
  booklet: BookletWithCoupons;
  outlets: Outlet[];
  onBack: () => void;
  onRedeemCoupon: (couponType: CouponType, couponIndex: number, orderValue: number, outlet: string, notes?: string) => Promise<void>;
  currentStaffName: string;
  activeOutlet: string;
}

export default function BookletDetail({
  booklet,
  outlets,
  onBack,
  onRedeemCoupon,
  currentStaffName,
  activeOutlet
}: BookletDetailProps) {
  const [selectedCouponStatus, setSelectedCouponStatus] = useState<CouponStatus | null>(null);
  const [orderValue, setOrderValue] = useState<number>(0);
  const [outlet, setOutlet] = useState(activeOutlet || outlets[0]?.name || "Antop Hill");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeemClick = (status: CouponStatus) => {
    setSelectedCouponStatus(status);
    setOrderValue(0);
    setNotes("");
    setError(null);
  };

  const handleConfirmRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCouponStatus) return;

    if (orderValue <= 0) {
      setError("Please enter a valid bill order value (₹)");
      return;
    }

    // MANDATORY USER CONFIRMATION
    const isConfirmed = window.confirm(
      `CONFIRM COUPON REDEMPTION:\n\n` +
      `Booklet ID: ${booklet.id}\n` +
      `Coupon: ${selectedCouponStatus.coupon.displayName}\n` +
      `Bill Value: ₹${orderValue}\n` +
      `Outlet: ${outlet}\n` +
      `Staff: ${currentStaffName}\n\n` +
      `Are you sure you want to log this redemption? This action will write to your device's database in real-time and cannot be undone.`
    );

    if (!isConfirmed) return;

    setLoading(true);
    setError(null);
    try {
      await onRedeemCoupon(
        selectedCouponStatus.coupon.type,
        selectedCouponStatus.coupon.index,
        orderValue,
        outlet,
        notes.trim() || undefined
      );
      setSelectedCouponStatus(null);
    } catch (err: any) {
      setError(err.message || "Failed to redeem coupon");
    } finally {
      setLoading(false);
    }
  };

  // Group coupons by type
  const bogoLarge = booklet.coupons.filter(c => c.coupon.type === CouponType.BOGO_LARGE);
  const bogoMedium = booklet.coupons.filter(c => c.coupon.type === CouponType.BOGO_MEDIUM);
  const medToLarge = booklet.coupons.filter(c => c.coupon.type === CouponType.MEDIUM_TO_LARGE);
  const complimentary = booklet.coupons.filter(c => c.coupon.type === CouponType.COMPLIMENTARY_500);

  const renderCouponCard = (status: CouponStatus) => {
    const { coupon, isRedeemed, redemption } = status;
    
    // Different badge styles depending on type
    const colorSchemes = {
      [CouponType.BOGO_LARGE]: { bg: "bg-[#991B1B]", text: "text-[#991B1B]", border: "border-[#991B1B]/15" },
      [CouponType.BOGO_MEDIUM]: { bg: "bg-amber-700", text: "text-amber-700", border: "border-amber-700/15" },
      [CouponType.MEDIUM_TO_LARGE]: { bg: "bg-emerald-700", text: "text-emerald-700", border: "border-emerald-700/15" },
      [CouponType.COMPLIMENTARY_500]: { bg: "bg-stone-700", text: "text-stone-700", border: "border-stone-300" }
    };
    
    const scheme = colorSchemes[coupon.type];

    return (
      <div
        key={coupon.id}
        className={`relative bg-white border rounded-2xl p-4 overflow-hidden flex flex-col justify-between h-48 transition-all ${
          isRedeemed 
            ? "border-stone-200 opacity-60 bg-stone-50/50" 
            : `${scheme.border} hover:border-[#991B1B]/50 shadow-md`
        }`}
      >
        {/* Ticket dashed separator */}
        <div className="absolute right-12 top-0 bottom-0 border-r-2 border-dashed border-stone-200 pointer-events-none"></div>
        {/* Ticket punches */}
        <div className="absolute right-[43px] -top-3 w-6 h-6 bg-[#FAF6F0] rounded-full border border-stone-200"></div>
        <div className="absolute right-[43px] -bottom-3 w-6 h-6 bg-[#FAF6F0] rounded-full border border-stone-200"></div>

        {/* Content Side */}
        <div className="pr-12">
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${isRedeemed ? "bg-stone-400" : scheme.bg}`}></span>
            <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest font-mono">{coupon.type}</span>
          </div>
          <h4 className="text-stone-900 font-serif font-bold text-sm mt-1 leading-tight">{coupon.displayName}</h4>
          
          <p className="text-stone-600 text-[11px] mt-1.5 leading-relaxed font-sans">
            {coupon.type === CouponType.BOGO_LARGE && "Buy 1 Large pizza, get 1 Large pizza free"}
            {coupon.type === CouponType.BOGO_MEDIUM && "Buy 1 Medium pizza, get 1 Medium pizza free"}
            {coupon.type === CouponType.MEDIUM_TO_LARGE && "Upgrade any Medium pizza to a Large pizza"}
            {coupon.type === CouponType.COMPLIMENTARY_500 && "Complimentary order value up to ₹500/-"}
          </p>
        </div>

        {/* Status / Button Area */}
        <div className="pr-12">
          {isRedeemed && redemption ? (
            <div className="text-[10px] text-stone-600 space-y-0.5 mt-2 font-mono">
              <div className="flex items-center text-red-700 font-bold">
                <CheckCircle2 size={12} className="mr-1 flex-shrink-0" />
                <span>REDEEMED</span>
              </div>
              <div className="truncate text-stone-500">By: {redemption.staffName}</div>
              <div className="truncate text-stone-500">On: {new Date(redemption.dateRedeemed).toLocaleDateString()}</div>
              <div className="text-stone-900 font-bold">Amt: ₹{redemption.orderValue}</div>
            </div>
          ) : (
            <button
              onClick={() => handleRedeemClick(status)}
              className="mt-3 py-1.5 px-4 rounded-xl text-xs font-bold bg-[#991B1B] text-white shadow-md hover:bg-[#7F1D1D] transition-all cursor-pointer w-full"
            >
              Redeem
            </button>
          )}
        </div>

        {/* Side barcode/stub decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-12 flex flex-col justify-center items-center select-none rotate-180">
          <span className="text-[8px] text-stone-400 font-mono tracking-widest uppercase writing-mode-vertical">
            {booklet.id}
          </span>
        </div>

        {/* Large diagonal Redeemed Stamp */}
        {isRedeemed && (
          <div className="absolute inset-0 bg-red-500/[0.02] flex items-center justify-center pointer-events-none select-none">
            <div className="border-2 border-dashed border-red-600/30 text-red-600/30 font-serif font-black text-[10px] px-2 py-0.5 rounded-lg uppercase tracking-wider -rotate-12">
              REDEEMED
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-stone-800">
      {/* Header and Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-stone-600 hover:text-stone-900 font-semibold text-sm cursor-pointer transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Registry</span>
        </button>
        <div className="flex items-center space-x-2 bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-stone-600 shadow-sm">
          <Store size={14} className="text-[#991B1B]" />
          <span>Active Outlet: {outlet}</span>
        </div>
      </div>

      {/* Booklet Meta Info Row */}
      <div className="bg-white shadow-md rounded-2xl p-6 border border-stone-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-serif font-bold text-stone-900 bg-stone-50 border border-stone-200 px-4 py-1.5 rounded-2xl shadow-inner font-mono">
                {booklet.id}
              </span>
              <div>
                <h2 className="text-2xl font-serif font-bold text-stone-900 leading-tight">{booklet.customerName}</h2>
                <p className="text-sm font-mono text-stone-500 mt-0.5">{booklet.customerPhone}</p>
              </div>
            </div>
            {booklet.notes && (
              <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100 italic">
                Notes: {booklet.notes}
              </p>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 border-t border-stone-100 pt-4 md:border-t-0 md:pt-0">
            <div className="text-center md:text-right px-2">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">Issued At</div>
              <div className="text-sm font-bold text-stone-800 font-mono mt-1">{booklet.outlet}</div>
              <div className="text-[10px] text-stone-500 mt-0.5 font-mono">{booklet.dateSold}</div>
            </div>
            <div className="text-center md:text-right border-x border-stone-100 px-2">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">Total Coupons</div>
              <div className="text-2xl font-serif font-bold text-stone-900 mt-0.5 font-mono">{booklet.totalCount}</div>
            </div>
            <div className="text-center md:text-right px-2">
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest font-mono">Redeemed</div>
              <div className="text-2xl font-serif font-bold text-[#991B1B] mt-0.5 font-mono">{booklet.redeemedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Tabs or Categories of Coupons */}
      <div className="space-y-6">
        {/* Section BOGO Large */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 font-mono mb-3 border-b border-stone-200 pb-2 flex items-center justify-between">
            <span>BOGO Large Coupons (Buy 1 Get 1 Large)</span>
            <span className="text-stone-500 text-[10px] font-mono">
              {bogoLarge.filter(c => c.isRedeemed).length} of 4 Redeemed
            </span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {bogoLarge.map(renderCouponCard)}
          </div>
        </div>

        {/* Section BOGO Medium */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 font-mono mb-3 border-b border-stone-200 pb-2 flex items-center justify-between">
            <span>BOGO Medium Coupons (Buy 1 Get 1 Medium)</span>
            <span className="text-stone-500 text-[10px] font-mono">
              {bogoMedium.filter(c => c.isRedeemed).length} of 4 Redeemed
            </span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {bogoMedium.map(renderCouponCard)}
          </div>
        </div>

        {/* Section Medium to Large */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 font-mono mb-3 border-b border-stone-200 pb-2 flex items-center justify-between">
            <span>Medium to Large Upgrade Coupons</span>
            <span className="text-stone-500 text-[10px] font-mono">
              {medToLarge.filter(c => c.isRedeemed).length} of 4 Redeemed
            </span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {medToLarge.map(renderCouponCard)}
          </div>
        </div>

        {/* Section Complimentary 500 */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-500 font-mono mb-3 border-b border-stone-200 pb-2 flex items-center justify-between">
            <span>Complimentary up to ₹500/- Coupons</span>
            <span className="text-stone-500 text-[10px] font-mono">
              {complimentary.filter(c => c.isRedeemed).length} of 2 Redeemed
            </span>
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-2 max-w-2xl">
            {complimentary.map(renderCouponCard)}
          </div>
        </div>
      </div>

      {/* Redemption Form Overlay Modal */}
      <AnimatePresence>
        {selectedCouponStatus && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200"
            >
              <div className="bg-stone-50 text-stone-900 p-5 flex items-center justify-between border-b border-stone-200">
                <div className="flex items-center space-x-2.5">
                  <Ticket className="h-6 w-6 text-[#991B1B]" />
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#991B1B]">Redeem Coupon Stub</h3>
                    <p className="text-[10px] text-stone-500 font-mono uppercase tracking-wider">{booklet.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCouponStatus(null)}
                  className="text-stone-400 hover:text-stone-900 transition-colors p-1.5 rounded-full hover:bg-stone-100 cursor-pointer animate-none"
                >
                  <ArrowLeft size={18} className="rotate-90" />
                </button>
              </div>

              <form onSubmit={handleConfirmRedeem} className="p-6 space-y-4 text-stone-850">
                {/* Visual stub */}
                <div className="bg-stone-50 border border-dashed border-stone-200 p-3.5 rounded-xl flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#991B1B]/10 text-[#991B1B] border border-[#991B1B]/20 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {selectedCouponStatus.coupon.index}
                  </div>
                  <div>
                    <div className="text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider">{selectedCouponStatus.coupon.type}</div>
                    <div className="font-bold text-stone-900 text-sm leading-tight">{selectedCouponStatus.coupon.displayName}</div>
                  </div>
                </div>

                {/* Bill details */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">
                      Total Order Bill Value (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">₹</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 450"
                        value={orderValue || ""}
                        onChange={(e) => setOrderValue(parseFloat(e.target.value) || 0)}
                        required
                        disabled={loading}
                        className="w-full pl-8 pr-4 py-2.5 border border-stone-200 rounded-xl text-stone-900 text-sm font-mono font-bold bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Redemption Outlet</label>
                    <select
                      value={outlet}
                      onChange={(e) => setOutlet(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-stone-800 text-sm bg-stone-50 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
                    >
                      {outlets.map((o, idx) => (
                        <option key={idx} value={o.name} className="bg-white text-stone-800">{o.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200/60">
                    <div className="flex items-center space-x-1">
                      <User size={12} className="text-stone-400 flex-shrink-0" />
                      <span className="text-stone-600">Staff: <strong className="text-stone-900">{currentStaffName}</strong></span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={12} className="text-stone-400 flex-shrink-0" />
                      <span className="text-stone-600">Date: <strong className="text-stone-900">{new Date().toLocaleDateString()}</strong></span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Notes / Order items</label>
                    <textarea
                      placeholder="e.g. Ordered Margherita & Pepperoni Large pizzas"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={loading}
                      rows={2}
                      className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center space-x-1.5 leading-relaxed">
                    <ShieldAlert size={14} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex space-x-3 pt-3 border-t border-stone-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedCouponStatus(null)}
                    disabled={loading}
                    className="px-5 py-2.5 border border-stone-200 rounded-xl text-sm font-semibold text-stone-600 bg-white hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || orderValue <= 0}
                    className="px-5 py-2.5 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Recording..." : "Redeem Coupon stub"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
