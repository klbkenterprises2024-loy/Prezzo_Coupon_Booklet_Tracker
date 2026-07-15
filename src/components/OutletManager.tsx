/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Store, Plus, MapPin, Phone, AlertCircle } from "lucide-react";
import { Outlet } from "../types";

interface OutletManagerProps {
  outlets: Outlet[];
  onAddOutlet: (outlet: Outlet) => Promise<void>;
  isAdmin: boolean;
}

export default function OutletManager({ outlets, onAddOutlet, isAdmin }: OutletManagerProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Outlet name is required");
      return;
    }

    if (outlets.some(o => o.name.toLowerCase() === name.trim().toLowerCase())) {
      setError("An outlet with this name already exists");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddOutlet({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim()
      });
      setName("");
      setAddress("");
      setPhone("");
    } catch (err: any) {
      setError(err.message || "Failed to add outlet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto text-stone-800">
      {/* Outlets List */}
      <div className="md:col-span-2 bg-white shadow-md rounded-2xl p-6 border border-stone-200">
        <div className="flex items-center space-x-3 border-b border-stone-100 pb-4 mb-4">
          <Store className="h-6 w-6 text-[#991B1B]" />
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900">Prezzo Franchise Outlets</h2>
            <p className="text-xs text-stone-500">View and manage restaurant franchise outlets</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {outlets.map((outlet, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:border-[#991B1B]/35 transition-all flex flex-col justify-between shadow-sm">
              <div>
                <h3 className="font-bold text-stone-900 flex items-center space-x-1.5 text-base font-serif">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                  <span>{outlet.name}</span>
                </h3>
                {outlet.address && (
                  <p className="text-xs text-stone-600 mt-2 flex items-start space-x-1.5 leading-relaxed">
                    <MapPin size={14} className="mt-0.5 text-stone-400 flex-shrink-0" />
                    <span>{outlet.address}</span>
                  </p>
                )}
                {outlet.phone && (
                  <p className="text-xs text-stone-600 mt-1 flex items-center space-x-1.5">
                    <Phone size={14} className="text-stone-400 flex-shrink-0" />
                    <span>{outlet.phone}</span>
                  </p>
                )}
              </div>
              <span className="inline-block self-start mt-4 px-2 py-0.5 rounded bg-[#991B1B]/5 text-[#991B1B] border border-[#991B1B]/15 text-[10px] font-mono uppercase font-semibold">
                Prezzo Outlet
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Outlet Form */}
      <div className="bg-white shadow-md rounded-2xl p-6 border border-stone-200 h-fit">
        <h3 className="text-lg font-serif font-bold text-stone-900 mb-4 flex items-center space-x-2">
          <Plus size={18} className="text-[#991B1B]" />
          <span>Add New Outlet</span>
        </h3>

        {!isAdmin ? (
          <div className="p-4 rounded-xl bg-[#991B1B]/5 border border-[#991B1B]/15 text-[#991B1B] text-xs flex items-start space-x-2 leading-relaxed font-sans">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>Only administrators can create new franchise outlets. Contact Loy Rego if you need to add an outlet.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Outlet Name *</label>
              <input
                type="text"
                placeholder="e.g. Antop Hill, Sion"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Address</label>
              <textarea
                placeholder="Full address of the franchise outlet"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
                rows={3}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Phone Number</label>
              <input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>

            {error && (
              <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg flex items-center space-x-1.5 flex-shrink-0">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name}
              className="w-full flex items-center justify-center space-x-2 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? "Adding..." : "Create Outlet"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
