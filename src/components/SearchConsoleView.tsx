/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  TrendingUp, 
  MousePointerClick, 
  Eye, 
  BarChart, 
  Search, 
  ArrowUpRight,
  Sparkles,
  Award
} from "lucide-react";
import { UrlItem } from "../types";

interface SearchConsoleViewProps {
  urls: UrlItem[];
}

export default function SearchConsoleView({ urls }: SearchConsoleViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Aggregate metrics from active urls with metrics
  const activeUrlsWithMetrics = urls.filter((u) => u.clicks !== undefined || u.impressions !== undefined);
  
  const totalClicks = activeUrlsWithMetrics.reduce((sum, u) => sum + (u.clicks || 0), 0);
  const totalImpressions = activeUrlsWithMetrics.reduce((sum, u) => sum + (u.impressions || 0), 0);
  const avgCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
  
  const urlsWithRank = activeUrlsWithMetrics.filter((u) => (u.position || 0) > 0);
  const avgPosition = urlsWithRank.length > 0 
    ? parseFloat((urlsWithRank.reduce((sum, u) => sum + (u.position || 0), 0) / urlsWithRank.length).toFixed(1))
    : 0;

  // Filter URLs list
  const filteredUrls = activeUrlsWithMetrics.filter((u) =>
    u.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-700">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Tích hợp Google Search Console</h1>
        <p className="text-xs text-slate-505">
          Phân tích các chỉ số hiệu suất tìm kiếm tự nhiên, lượt nhấp chuột và vị trí xếp hạng tìm kiếm được ánh xạ trên từng trang.
        </p>
      </div>

      {/* Aggregate metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Tổng lượt nhấp chuột</span>
            <div className="text-2xl font-bold font-mono text-slate-900">
              {totalClicks.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">Hiệu suất chỉ mục 30 ngày qua</span>
          </div>
          <div className="p-3.5 bg-blue-50 rounded-xl text-blue-600 font-bold">
            <MousePointerClick className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Tổng lượt hiển thị</span>
            <div className="text-2xl font-bold font-mono text-indigo-900">
              {totalImpressions.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400">Lượt tiếp cận tự nhiên</span>
          </div>
          <div className="p-3.5 bg-indigo-50 rounded-xl text-indigo-600 font-bold">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Tỷ lệ CTR trung bình</span>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {avgCtr}%
            </div>
            <span className="text-[10px] text-emerald-500 font-medium">Tỷ lệ lượt nhấp trên lượt hiển thị</span>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Vị trí xếp hạng trung bình</span>
            <div className="text-2xl font-bold font-mono text-amber-600">
              {avgPosition || "N/A"}
            </div>
            <span className="text-[10px] text-slate-400">Xếp hạng từ khóa trên Google</span>
          </div>
          <div className="p-3.5 bg-amber-50 rounded-xl text-amber-500 font-bold">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* URL Performance list table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <BarChart className="w-4.5 h-4.5 text-blue-600" />
              Báo cáo hiệu suất SEO của URL
            </h2>
            <p className="text-xs text-slate-400">Các chỉ số tìm kiếm được lập bản đồ chi tiết</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="inp-gsc-search"
              type="text"
              placeholder="Tìm kiếm trang phân tích..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] tracking-widest font-bold uppercase text-slate-500">
                <th className="py-3.5 px-5">Đường dẫn URL đích</th>
                <th className="py-3.5 px-4 text-center">Số lượt nhấp</th>
                <th className="py-3.5 px-4 text-center">Số lượt hiển thị</th>
                <th className="py-3.5 px-4 text-center">Tỷ lệ CTR</th>
                <th className="py-3.5 px-4 text-center">Vị trí trung bình</th>
                <th className="py-3.5 px-5 text-right">Trạng thái chỉ mục</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUrls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy dữ liệu phân tích GSC cho các URL trong cơ sở dữ liệu.
                  </td>
                </tr>
              ) : (
                filteredUrls.map((row) => {
                  const displayIndexed = row.indexed === "Indexed" ? "Đã lập chỉ mục" : (row.indexed === "Not Indexed" ? "Chưa lập chỉ mục" : row.indexed);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5 font-mono max-w-sm sm:max-w-md truncate font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="truncate" title={row.url}>{row.url}</span>
                          <a href={row.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-700">
                        {row.clicks?.toLocaleString() || 0}
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-700">
                        {row.impressions?.toLocaleString() || 0}
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-extrabold text-emerald-600">
                        {row.ctr || 0}%
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold text-amber-600">
                        {row.position || "-"}
                      </td>

                      <td className="py-4 px-5 text-right font-semibold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] tracking-wide uppercase ${
                            row.indexed === "Indexed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-red-50 text-red-700 border border-red-100"
                          }`}
                        >
                          {displayIndexed}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
