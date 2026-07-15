/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookletWithCoupons, Outlet } from "../types";
import { Search, Filter, BookOpen, AlertCircle, ShoppingBag, ArrowUpDown } from "lucide-react";

interface BookletListProps {
  booklets: BookletWithCoupons[];
  outlets: Outlet[];
  onSelectBooklet: (id: string) => void;
  onOpenAddBooklet: () => void;
  isAdmin: boolean;
}

export default function BookletList({
  booklets,
  outlets,
  onSelectBooklet,
  onOpenAddBooklet,
  isAdmin
}: BookletListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState<"id" | "date" | "redeemed">("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filtering and searching logic
  const filteredBooklets = booklets.filter(booklet => {
    const matchesSearch = 
      booklet.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booklet.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booklet.customerPhone.includes(searchTerm);
    
    const matchesOutlet = !selectedOutlet || booklet.outlet === selectedOutlet;
    const matchesStatus = !selectedStatus || booklet.status === selectedStatus;

    return matchesSearch && matchesOutlet && matchesStatus;
  });

  // Sorting logic
  const sortedBooklets = [...filteredBooklets].sort((a, b) => {
    let valA: any = a.id;
    let valB: any = b.id;

    if (sortBy === "date") {
      valA = a.dateSold;
      valB = b.dateSold;
    } else if (sortBy === "redeemed") {
      valA = a.redeemedCount;
      valB = b.redeemedCount;
    }

    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: "id" | "date" | "redeemed") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-900">Coupon Booklet Registry</h2>
          <p className="text-xs text-stone-600 mt-1">Search, view, and select physical booklets to redeem customer coupons</p>
        </div>
        <button
          onClick={onOpenAddBooklet}
          className="flex items-center justify-center space-x-2 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer self-start sm:self-auto"
        >
          <ShoppingBag size={16} />
          <span>Log Booklet Sale</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white shadow-md border border-stone-200 rounded-2xl p-4 grid gap-3 sm:grid-cols-4 items-center">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search Booklet ID, Customer Name, Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B] bg-stone-50"
          />
        </div>

        {/* Outlet Filter */}
        <div>
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#991B1B] bg-stone-50 cursor-pointer"
          >
            <option value="" className="bg-white text-stone-800">All Outlets</option>
            {outlets.map((o, idx) => (
              <option key={idx} value={o.name} className="bg-white text-stone-800">{o.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-700 text-sm focus:outline-none focus:ring-1 focus:ring-[#991B1B] bg-stone-50 cursor-pointer"
          >
            <option value="" className="bg-white text-stone-800">All Statuses</option>
            <option value="Active" className="bg-white text-stone-800">Active</option>
            <option value="Expired" className="bg-white text-stone-800">Expired</option>
            <option value="Inactive" className="bg-white text-stone-800">Inactive</option>
          </select>
        </div>
      </div>

      {/* Booklets List Grid */}
      {sortedBooklets.length === 0 ? (
        <div className="bg-white shadow-md border border-stone-200 rounded-2xl p-12 text-center">
          <AlertCircle className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <h4 className="font-bold text-stone-800 text-base">No booklets found</h4>
          <p className="text-xs text-stone-500 mt-1">Try resetting your search query or filters.</p>
        </div>
      ) : (
        <div className="bg-white shadow-md border border-stone-200 rounded-2xl overflow-hidden">
          {/* List Headers for Sorting (Desktop) */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3.5 bg-stone-50 border-b border-stone-100 text-left text-xs font-bold text-stone-500 uppercase font-mono tracking-wider">
            <button onClick={() => toggleSort("id")} className="col-span-2 flex items-center space-x-1 hover:text-stone-900 cursor-pointer transition-colors">
              <span>Booklet ID</span>
              <ArrowUpDown size={12} />
            </button>
            <div className="col-span-3">Customer Details</div>
            <button onClick={() => toggleSort("date")} className="col-span-2 flex items-center space-x-1 hover:text-stone-900 cursor-pointer transition-colors">
              <span>Sold Date</span>
              <ArrowUpDown size={12} />
            </button>
            <div className="col-span-2">Outlet</div>
            <button onClick={() => toggleSort("redeemed")} className="col-span-2 flex items-center space-x-1 hover:text-stone-900 cursor-pointer transition-colors">
              <span>Redemption Status</span>
              <ArrowUpDown size={12} />
            </button>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          <div className="divide-y divide-stone-100">
            {sortedBooklets.map((booklet) => (
              <div
                key={booklet.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 px-6 py-4 items-center hover:bg-stone-50/50 transition-colors text-stone-800"
              >
                {/* Booklet ID */}
                <div className="col-span-1 md:col-span-2 flex items-center justify-between md:block">
                  <span className="md:hidden text-xs font-bold font-mono text-stone-500 uppercase">Booklet ID</span>
                  <span className="font-bold font-mono text-stone-900 text-sm bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                    {booklet.id}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="col-span-1 md:col-span-3 flex items-center justify-between md:block mt-1 md:mt-0">
                  <span className="md:hidden text-xs font-bold font-mono text-stone-500 uppercase">Customer</span>
                  <div className="text-right md:text-left">
                    <div className="font-semibold text-stone-900 text-sm">{booklet.customerName}</div>
                    <div className="text-xs text-stone-500 font-mono mt-0.5">{booklet.customerPhone}</div>
                  </div>
                </div>

                {/* Date Sold */}
                <div className="col-span-1 md:col-span-2 flex items-center justify-between md:block mt-1 md:mt-0">
                  <span className="md:hidden text-xs font-bold font-mono text-stone-500 uppercase">Date Sold</span>
                  <div className="text-xs text-stone-600 font-mono text-right md:text-left">{booklet.dateSold}</div>
                </div>

                {/* Outlet */}
                <div className="col-span-1 md:col-span-2 flex items-center justify-between md:block mt-1 md:mt-0">
                  <span className="md:hidden text-xs font-bold font-mono text-stone-500 uppercase">Outlet</span>
                  <div className="text-right md:text-left text-sm font-medium text-stone-700">{booklet.outlet}</div>
                </div>

                {/* Redemption Counts */}
                <div className="col-span-1 md:col-span-2 flex items-center justify-between md:block mt-1 md:mt-0">
                  <span className="md:hidden text-xs font-bold font-mono text-stone-500 uppercase">Redeemed</span>
                  <div className="text-right md:text-left">
                    <div className="flex items-center justify-end md:justify-start space-x-2">
                      <span className="text-xs font-bold font-mono bg-[#991B1B]/5 text-[#991B1B] border border-[#991B1B]/15 px-2 py-0.5 rounded">
                        {booklet.redeemedCount} / {booklet.totalCount}
                      </span>
                      <span className="text-xs font-semibold text-stone-500">redeemed</span>
                    </div>
                    {/* Tiny Progress Bar */}
                    <div className="w-24 md:w-full bg-stone-100 h-1.5 rounded-full mt-1.5 overflow-hidden ml-auto md:ml-0 border border-stone-200/50">
                      <div
                        className="bg-[#991B1B] h-full rounded-full transition-all duration-500"
                        style={{ width: `${(booklet.redeemedCount / booklet.totalCount) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 md:col-span-1 flex justify-end mt-3 md:mt-0">
                  <button
                    onClick={() => onSelectBooklet(booklet.id)}
                    className="flex items-center space-x-1.5 bg-[#991B1B]/10 border border-[#991B1B]/20 text-[#991B1B] hover:bg-[#991B1B]/20 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all w-full md:w-auto justify-center shadow-sm cursor-pointer"
                  >
                    <BookOpen size={13} />
                    <span>Open Booklet</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
