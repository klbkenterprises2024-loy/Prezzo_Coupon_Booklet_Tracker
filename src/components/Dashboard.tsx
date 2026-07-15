/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BookletWithCoupons, Redemption, Outlet, CouponType, normalizeCouponType } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  TrendingUp,
  BookOpen,
  CheckCircle,
  Clock,
  Store,
  DollarSign,
  Ticket
} from "lucide-react";

interface DashboardProps {
  booklets: BookletWithCoupons[];
  redemptions: Redemption[];
  outlets: Outlet[];
}

export default function Dashboard({ booklets, redemptions, outlets }: DashboardProps) {
  // 1. Core aggregates
  const totalBooklets = booklets.length;
  const totalRedeemed = redemptions.length;
  const totalPotentialCoupons = totalBooklets * 14;
  const remainingCoupons = totalPotentialCoupons - totalRedeemed;
  
  // Calculate total revenue generated from booklet sales
  const totalSalesRevenue = booklets.reduce((acc, b) => acc + b.pricePaid, 0);
  // Calculate total bill value supported by coupon redemptions
  const totalBillSupported = redemptions.reduce((acc, r) => acc + r.orderValue, 0);

  // 2. Get latest redemption date
  const latestRedemption = redemptions.length > 0 
    ? [...redemptions].sort((a, b) => new Date(b.dateRedeemed).getTime() - new Date(a.dateRedeemed).getTime())[0]
    : null;

  // 3. Outlet-wise booklet sales & redemptions data
  const outletData = outlets.map(outlet => {
    const salesCount = booklets.filter(b => String(b.outlet).trim().toLowerCase() === String(outlet.name).trim().toLowerCase()).length;
    const redCount = redemptions.filter(r => String(r.outlet).trim().toLowerCase() === String(outlet.name).trim().toLowerCase()).length;
    const totalOrderVal = redemptions
      .filter(r => String(r.outlet).trim().toLowerCase() === String(outlet.name).trim().toLowerCase())
      .reduce((acc, r) => acc + r.orderValue, 0);

    return {
      name: outlet.name,
      "Booklets Sold": salesCount,
      "Coupons Redeemed": redCount,
      "Total Bill Supported": totalOrderVal
    };
  });

  // 4. Coupon Type Popularity Data
  const couponTypes = Object.values(CouponType);
  const couponPopularityData = couponTypes.map(type => {
    const count = redemptions.filter(r => normalizeCouponType(r.couponType) === normalizeCouponType(type)).length;
    return {
      name: type,
      value: count
    };
  }).filter(item => item.value > 0);

  // If no redemptions yet, provide standard placeholder data so chart doesn't crash or look empty
  const pieData = couponPopularityData.length > 0
    ? couponPopularityData
    : couponTypes.map(type => ({ name: type, value: 0 }));

  // Colors for each coupon type in the pie chart
  const COLORS = ["#991B1B", "#C2410C", "#059669", "#78716c"];

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans text-stone-800">
      {/* Metrics Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Metric: Booklets Sold */}
        <div className="bg-white border border-stone-200 p-5 rounded-2xl flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-[#991B1B]/10 rounded-xl text-[#991B1B]">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-serif">Booklets Sold</div>
            <div className="text-3xl font-serif text-stone-900 mt-0.5">{totalBooklets}</div>
            <div className="text-[10px] text-stone-500 mt-1 font-mono">₹{totalSalesRevenue.toLocaleString()} Revenue</div>
          </div>
        </div>

        {/* Metric: Coupons Redeemed */}
        <div className="bg-white border border-stone-200 p-5 rounded-2xl flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-serif">Redeemed Coupons</div>
            <div className="text-3xl font-serif text-stone-900 mt-0.5">{totalRedeemed}</div>
            <div className="text-[10px] text-emerald-700 mt-1 font-mono">
              {totalPotentialCoupons > 0 ? ((totalRedeemed / totalPotentialCoupons) * 100).toFixed(1) : 0}% Burn Rate
            </div>
          </div>
        </div>

        {/* Metric: Total Bill Supported */}
        <div className="bg-white border border-stone-200 p-5 rounded-2xl flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-800">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-serif">Total Bill Supported</div>
            <div className="text-3xl font-serif text-stone-900 mt-0.5">₹{totalBillSupported.toLocaleString()}</div>
            <div className="text-[10px] text-stone-500 mt-1 font-mono">Avg order: ₹{totalRedeemed > 0 ? Math.round(totalBillSupported / totalRedeemed) : 0}</div>
          </div>
        </div>

        {/* Metric: Last Order Redemption Date */}
        <div className="bg-white border border-stone-200 p-5 rounded-2xl flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-3 bg-stone-100 rounded-xl text-stone-700">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-serif">Last Redemption</div>
            <div className="text-base font-bold text-stone-900 mt-1 truncate">
              {latestRedemption ? new Date(latestRedemption.dateRedeemed).toLocaleDateString() : "Never"}
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5 truncate font-mono">
              {latestRedemption ? `${latestRedemption.couponType} at ${latestRedemption.outlet}` : "No data logged"}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart: Outlet Performance */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
            <h3 className="text-base font-serif font-bold text-stone-900 flex items-center space-x-2">
              <Store className="h-5 w-5 text-[#991B1B]" />
              <span>Outlet Sales & Redemptions</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-widest bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full">
              Real-Time
            </span>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outletData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#78716c", fontSize: 11 }} />
                <YAxis tick={{ fill: "#78716c", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e7e5e4", borderRadius: "12px", color: "#1c1917" }} />
                <Legend wrapperStyle={{ fontSize: 11, pt: 10 }} />
                <Bar dataKey="Booklets Sold" fill="#991B1B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Coupons Redeemed" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart: Coupon Popularity */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
            <h3 className="text-base font-serif font-bold text-stone-900 flex items-center space-x-2">
              <Ticket className="h-5 w-5 text-[#991B1B]" />
              <span>Redeemed Coupon Distribution</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-widest bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full">
              Category split
            </span>
          </div>

          <div className="h-64 flex flex-col justify-center">
            {totalRedeemed === 0 ? (
              <div className="text-center py-12 text-stone-500 text-xs font-mono">
                No coupons redeemed yet. Perform a redemption to visualize data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e7e5e4", borderRadius: "8px", color: "#1c1917" }} formatter={(value) => [`${value} stubs`, "Redeemed"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Redemptions Feed */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-serif font-bold text-stone-900 mb-4 flex items-center space-x-2 pb-3 border-b border-stone-100">
          <TrendingUp className="h-5 w-5 text-emerald-700" />
          <span>Recent Coupon Redemptions Logs</span>
        </h3>

        {redemptions.length === 0 ? (
          <p className="text-center py-6 text-stone-500 text-xs font-mono">
            No coupons redeemed yet in this sheet database.
          </p>
        ) : (
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-stone-100">
              {[...redemptions]
                .sort((a, b) => new Date(b.dateRedeemed).getTime() - new Date(a.dateRedeemed).getTime())
                .slice(0, 5)
                .map((r) => (
                  <li key={r.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[#991B1B]/10 text-[#991B1B] font-extrabold text-sm border border-[#991B1B]/20">
                          {r.couponIndex}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">
                          {r.couponType} Stub redeemed
                        </p>
                        <p className="text-xs text-stone-600 flex items-center space-x-2 mt-0.5">
                          <span>Booklet: <strong className="text-[#991B1B] font-mono">{r.bookletId}</strong></span>
                          <span>•</span>
                          <span>Outlet: {r.outlet}</span>
                          <span>•</span>
                          <span>Cashier: {r.staffName}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0 text-right">
                        <span className="text-sm font-black text-stone-950 font-mono">₹{r.orderValue}</span>
                        <span className="text-[10px] text-stone-400 font-mono mt-0.5">
                          {new Date(r.dateRedeemed).toLocaleDateString()} {new Date(r.dateRedeemed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
