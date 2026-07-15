/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Booklet, Outlet } from "../types";
import { PlusCircle, AlertCircle, X } from "lucide-react";

interface AddBookletFormProps {
  outlets: Outlet[];
  existingBooklets: Booklet[];
  onAddBooklet: (booklet: Booklet) => Promise<void>;
  onClose: () => void;
  staffName: string;
  activeOutlet: string;
}

export default function AddBookletForm({
  outlets,
  existingBooklets,
  onAddBooklet,
  onClose,
  staffName,
  activeOutlet
}: AddBookletFormProps) {
  const [bookletId, setBookletId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dateSold, setDateSold] = useState(new Date().toISOString().split("T")[0]);
  const [pricePaid, setPricePaid] = useState<number>(1000); // Standard booklet price default
  const [outlet, setOutlet] = useState(activeOutlet || outlets[0]?.name || "Antop Hill");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggest the next booklet ID
  useEffect(() => {
    if (existingBooklets.length > 0) {
      // Find booklet numbers if they are formatted like B-1001 or 1001
      const numericIds = existingBooklets
        .map(b => {
          const digits = b.id.replace(/\D/g, "");
          return digits ? parseInt(digits) : 0;
        })
        .filter(n => n > 0);
      
      if (numericIds.length > 0) {
        const nextNum = Math.max(...numericIds) + 1;
        // See if there's a prefix in the existing IDs
        const lastId = existingBooklets[0]?.id || "";
        const prefixMatch = lastId.match(/^([a-zA-Z_-]+)/);
        const prefix = prefixMatch ? prefixMatch[1] : "B-";
        setBookletId(`${prefix}${nextNum}`);
      } else {
        setBookletId(`B-${1001 + existingBooklets.length}`);
      }
    } else {
      setBookletId("B-1001");
    }
  }, [existingBooklets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookletId.trim() || !customerName.trim() || !customerPhone.trim()) {
      setError("Please fill in Booklet ID, Customer Name, and Phone");
      return;
    }

    const cleanedId = bookletId.trim().toUpperCase();

    // Check for duplicates
    if (existingBooklets.some(b => b.id.toUpperCase() === cleanedId)) {
      setError(`Booklet ID "${cleanedId}" has already been sold/registered!`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddBooklet({
        id: cleanedId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        dateSold,
        pricePaid: Number(pricePaid) || 0,
        outlet,
        staffName,
        status: "Active",
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to log booklet sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200">
        <div className="bg-stone-50 text-stone-900 p-5 flex items-center justify-between border-b border-stone-200">
          <div className="flex items-center space-x-2.5">
            <PlusCircle className="h-6 w-6 text-[#991B1B]" />
            <h3 className="text-lg font-serif font-bold text-[#991B1B]">Log New Booklet Sale</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900 transition-colors p-1.5 rounded-full hover:bg-stone-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Booklet ID (Unique) *</label>
              <input
                type="text"
                placeholder="e.g. B-1001"
                value={bookletId}
                onChange={(e) => setBookletId(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm font-semibold font-mono bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Booklet Price (₹)</label>
              <input
                type="number"
                min="0"
                placeholder="1000"
                value={pricePaid}
                onChange={(e) => setPricePaid(parseFloat(e.target.value) || 0)}
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm font-mono bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Customer Name *</label>
              <input
                type="text"
                placeholder="John Doe"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Customer Phone *</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm font-mono bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Sale Date</label>
              <input
                type="date"
                value={dateSold}
                onChange={(e) => setDateSold(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Issuing Outlet</label>
              <select
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B] cursor-pointer"
              >
                {outlets.map((o, idx) => (
                  <option key={idx} value={o.name} className="bg-white text-stone-850">{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Sales Agent / Handler</label>
            <input
              type="text"
              value={staffName}
              disabled
              className="w-full px-3.5 py-2 border border-stone-100 bg-stone-100 text-stone-500 rounded-xl text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Notes</label>
            <textarea
              placeholder="e.g. Sold on promotional discount or cash payment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
              className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
            />
          </div>

          {error && (
            <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center space-x-1.5 leading-relaxed">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex space-x-3 pt-3 border-t border-stone-100 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 border border-stone-200 rounded-xl text-sm font-semibold text-stone-600 bg-white hover:bg-stone-50 hover:text-stone-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              {loading ? "Logging Sale..." : "Log Booklet Sale"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
