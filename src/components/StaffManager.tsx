/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Users, UserPlus, Shield, UserCheck, AlertCircle, Trash } from "lucide-react";
import { Staff, Outlet } from "../types";

interface StaffManagerProps {
  staffList: Staff[];
  outlets: Outlet[];
  onAddStaff: (staffMember: Staff) => Promise<void>;
  isAdmin: boolean;
  currentUserEmail?: string;
}

export default function StaffManager({
  staffList,
  outlets,
  onAddStaff,
  isAdmin,
  currentUserEmail
}: StaffManagerProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"Admin" | "Staff">("Staff");
  const [outlet, setOutlet] = useState(outlets[0]?.name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out empty rows or invalid entries
  const activeStaff = staffList.filter(s => s.email && s.email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      setError("Email and name are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (activeStaff.some(s => s.email.toLowerCase() === email.trim().toLowerCase())) {
      setError("Staff member with this email already exists");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onAddStaff({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role,
        outlet: outlet || undefined
      });
      setEmail("");
      setName("");
      setRole("Staff");
      setOutlet(outlets[0]?.name || "");
    } catch (err: any) {
      setError(err.message || "Failed to add staff member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto text-stone-850">
      {/* Staff Roster List */}
      <div className="md:col-span-2 bg-white shadow-md rounded-2xl p-6 border border-stone-200">
        <div className="flex items-center space-x-3 border-b border-stone-100 pb-4 mb-4">
          <Users className="h-6 w-6 text-[#991B1B]" />
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900">Authorized Restaurant Staff</h2>
            <p className="text-xs text-stone-500">Manage internal employees who can access the Coupon Tracker portal</p>
          </div>
        </div>

        {/* Informational Box */}
        <div className="bg-stone-50 border border-stone-200/60 rounded-xl p-3 mb-4 text-xs text-stone-600 leading-relaxed">
          <strong className="text-[#991B1B]">Access Control:</strong> System access is protected by the customized PIN. Here, administrators can maintain the internal staff roster, and associate members with their primary operating restaurant outlets.
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-left">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-4 py-3 text-xs font-bold text-stone-600 uppercase font-mono">Staff Member</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-600 uppercase font-mono">Email Address</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-600 uppercase font-mono">System Role</th>
                <th className="px-4 py-3 text-xs font-bold text-stone-600 uppercase font-mono">Primary Outlet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {/* Default Super Admin */}
              <tr className="bg-red-50/20">
                <td className="px-4 py-3 font-semibold text-stone-900">Loy Rego</td>
                <td className="px-4 py-3 text-stone-500 font-mono text-xs">loyrego@gmail.com</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                    <Shield size={12} />
                    <span>Super Admin</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-500 font-mono text-xs">Antop Hill (Global)</td>
              </tr>

              {/* Dynamic roster */}
              {activeStaff
                .filter(s => s.email.toLowerCase() !== "loyrego@gmail.com")
                .map((staff, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/40">
                    <td className="px-4 py-3 font-semibold text-stone-900">{staff.name}</td>
                    <td className="px-4 py-3 text-stone-500 font-mono text-xs">{staff.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        staff.role === "Admin"
                          ? "bg-red-50 border border-red-200 text-red-700"
                          : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                      }`}>
                        {staff.role === "Admin" ? <Shield size={12} /> : <UserCheck size={12} />}
                        <span>{staff.role}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{staff.outlet || "All Outlets"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Form */}
      <div className="bg-white shadow-md rounded-2xl p-6 border border-stone-200 h-fit">
        <h3 className="text-lg font-serif font-bold text-stone-900 mb-4 flex items-center space-x-2">
          <UserPlus size={18} className="text-[#991B1B]" />
          <span>Authorize Employee</span>
        </h3>

        {!isAdmin ? (
          <div className="p-4 rounded-xl bg-[#991B1B]/5 border border-[#991B1B]/15 text-[#991B1B] text-xs flex items-start space-x-2 leading-relaxed font-sans">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>Only system administrators are authorized to invite or manage restaurant employees. Contact Loy Rego for staff changes.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Email Address</label>
              <input
                type="email"
                placeholder="e.g. employee@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-900 text-sm font-mono bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Assigned Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B] cursor-pointer"
              >
                <option value="Staff" className="bg-white">Staff (Can only perform redemptions)</option>
                <option value="Admin" className="bg-white">Admin (Full permissions: sales, outlets, staff)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 font-mono">Primary Outlet</label>
              <select
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B] cursor-pointer"
              >
                <option value="" className="bg-white">All Outlets / Global</option>
                {outlets.map((o, idx) => (
                  <option key={idx} value={o.name} className="bg-white text-stone-800">{o.name}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg flex items-center space-x-1.5 leading-relaxed">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name || !email}
              className="w-full flex items-center justify-center space-x-2 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? "Adding..." : "Grant Access"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
