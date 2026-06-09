/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Globe, 
  Layers, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Send, 
  TrendingUp, 
  Play, 
  Loader2, 
  ArrowUpRight, 
  Zap 
} from "lucide-react";
import { DashboardStats } from "../types";

interface DashboardViewProps {
  stats: DashboardStats;
  chartData: { date: string; indexed: number; submitted: number }[];
  websites: { id: string; name: string; domain: string; total_urls: number; indexed_urls: number; index_rate: number }[];
  onTriggerCron: () => Promise<void>;
  isCronRunning: boolean;
  onNavigate: (view: string) => void;
}

export default function DashboardView({
  stats,
  chartData,
  websites,
  onTriggerCron,
  isCronRunning,
  onNavigate
}: DashboardViewProps) {
  const [quickUrl, setQuickUrl] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickResult, setQuickResult] = useState<{ status: string; text: string } | null>(null);

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl) return;
    
    setQuickSubmitting(true);
    setQuickResult(null);

    try {
      // Simulate real index submissions via client direct logging & syncs
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: quickUrl, action_type: "URL_UPDATED" })
      });
      const data = await res.json();
      if (data.success && data.results[0].status === "Success") {
        setQuickResult({
          status: "success",
          text: `Gửi URL thành công! Google Indexing API đã ghi nhận yêu cầu lập chỉ mục.`
        });
        setQuickUrl("");
      } else {
        setQuickResult({
          status: "error",
          text: `Google phản hồi lỗi: ${data.results[0]?.api_response?.error?.message || 'Từ chối quyền truy cập (Permission Denied)'}`
        });
      }
    } catch (err: any) {
      setQuickResult({ status: "error", text: "Đã xảy ra lỗi giao tiếp với máy chủ Google." });
    } finally {
      setQuickSubmitting(false);
    }
  };

  // SVG Chart values logic: Scale inputs to height 160px
  const maxVal = Math.max(...chartData.map(d => Math.max(d.indexed, d.submitted, 10)), 20);
  const chartHeight = 160;
  const chartWidth = 500;
  const pointsIndexed = chartData.map((d, index) => {
    const x = (index / (chartData.length - 1)) * chartWidth;
    const y = chartHeight - (d.indexed / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  const pointsSubmitted = chartData.map((d, index) => {
    const x = (index / (chartData.length - 1)) * chartWidth;
    const y = chartHeight - (d.submitted / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="space-y-6 text-slate-700">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1 font-sans">
            Google Indexing Manager Pro
          </h1>
          <p className="text-sm text-slate-500">
            Giám sát thời gian thực, phân tích Sitemap tự động, đồng bộ chỉ mục qua Google Search APIs.
          </p>
        </div>
        
        <button
          id="btn-trigger-cron"
          onClick={onTriggerCron}
          disabled={isCronRunning}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-lg transition duration-150 shadow-sm cursor-pointer text-xs uppercase tracking-wider"
        >
          {isCronRunning ? (
            <>
              <Loader2 id="loader-cron" className="w-4 h-4 animate-spin text-white" />
              Đang phân tích & submit API...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Kích hoạt Robot Quét Chỉ Mục
            </>
          )}
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 transition shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tên miền đang chạy</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono">{stats.total_websites}</div>
            <p className="text-[11px] text-slate-450 mt-1">Sitemap hoạt động liên tục</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 transition shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tổng liên kết phát hiện</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono">{stats.total_urls}</div>
            <p className="text-[11px] text-slate-450 mt-1">Được đồng bộ từ tệp sitemap</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 transition shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">Đã index trên Google</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-extrabold text-slate-800 font-mono">{stats.url_indexed}</div>
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                Tỷ lệ {stats.index_rate}%
              </span>
            </div>
            <p className="text-[11px] text-slate-450 mt-1">Còn {stats.url_not_indexed} liên kết chưa Index</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 transition shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-sans">Đã gửi lên API</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono">{stats.url_submitted}</div>
            <p className="text-[11px] text-slate-450 mt-1">Sẵn sàng lập chỉ mục tức thì</p>
          </div>
        </div>
      </div>

      {/* Grid: Charts & Quick submit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph Display Area */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 font-sans">Biểu đồ Giám sát Index</h2>
              <p className="text-xs text-slate-450">Thống kê dữ liệu trong qua 7 chu kỳ robot tự động làm việc</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Đã Index
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                Đã Submit api
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full h-44 my-2 relative">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="indexedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="submittedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#e2e8f0" strokeWidth="1" />

              {/* Fill areas under the path */}
              <path
                d={`M 0,${chartHeight} L ${pointsIndexed} L ${chartWidth},${chartHeight} Z`}
                fill="url(#indexedGrad)"
              />
              <path
                d={`M 0,${chartHeight} L ${pointsSubmitted} L ${chartWidth},${chartHeight} Z`}
                fill="url(#submittedGrad)"
              />

              {/* Primary paths */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                points={pointsIndexed}
              />
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                points={pointsSubmitted}
              />
            </svg>
          </div>

          {/* X Labels */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1 mt-2">
            {chartData.map((d, i) => (
              <span key={i} className="text-center">{d.date}</span>
            ))}
          </div>
        </div>

        {/* Quick Submit Block */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div className="space-y-2">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 font-sans">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Gửi URL Tốc hành
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gửi bất kỳ liên kết đơn lẻ nào trực tiếp lên Google Indexing API để yêu cầu thu thập dữ liệu ngay lập tức.
            </p>
          </div>

          <form onSubmit={handleQuickSubmit} className="space-y-4 my-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">
                Đường dẫn liên kết (URL)
              </label>
              <input
                id="inp-quick-url"
                type="url"
                required
                placeholder="https://yourwebsite.com/new-landing-page"
                value={quickUrl}
                onChange={(e) => setQuickUrl(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2.5 text-xs text-slate-800 focus:outline-none placeholder-slate-450"
              />
            </div>

            <button
              id="btn-quick-submit"
              type="submit"
              disabled={quickSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs py-3 rounded-lg transition-colors cursor-pointer shadow-sm uppercase tracking-wider"
            >
              {quickSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Đang phát lệnh...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Yêu cầu Index ngay
                </>
              )}
            </button>
          </form>

          {/* Result Alert box */}
          {quickResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex gap-2 border leading-relaxed ${
                quickResult.status === "success"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                  : "bg-red-50 border-red-100 text-red-800"
              }`}
            >
              <span className="font-semibold">{quickResult.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Website Listings summary stats */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold text-slate-800 font-sans">Sitemap đang theo dõi</h2>
            <p className="text-xs text-slate-500">Danh sách tên miền đăng ký và tỷ lệ lập chỉ mục tương ứng</p>
          </div>
          <button
            onClick={() => onNavigate("Website")}
            className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
          >
            Quản lý Sitemap
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {websites.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              Chưa có trang web nào được theo dõi. Sử dụng <span className="text-blue-600 font-bold hover:underline cursor-pointer" onClick={() => onNavigate("Website")}>Danh sách Sitemap</span> để liên kết miền đầu tiên của bạn!
            </div>
          ) : (
            websites.map((web) => (
              <div key={web.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm font-sans">{web.name}</span>
                    <span className="text-xs text-slate-400 font-mono">({web.domain})</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="text-slate-450 font-medium">Sitemap URL:</span>
                    <a href={web.domain} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                      {web.domain}/sitemap.xml
                    </a>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="w-full md:w-80 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-405 font-sans">Tỷ lệ bao phủ Google</span>
                    <span className="text-slate-800">{web.index_rate}% ({web.indexed_urls}/{web.total_urls} trang)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${web.index_rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
