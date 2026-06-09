/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Terminal, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Info, 
  AlertTriangle,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar
} from "lucide-react";
import { LogItem } from "../types";

interface LogsViewProps {
  logs: LogItem[];
  onClearLogs: () => Promise<void>;
}

export default function LogsView({ logs, onClearLogs }: LogsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const handleClear = async () => {
    if (confirm("Bạn có chắc chắn muốn dọn dẹp toàn bộ dữ liệu nhật ký hệ thống? Thao tác này không thể khôi phục lại.")) {
      await onClearLogs();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId((p) => (p === id ? null : id));
  };

  // Filter logs list
  const filteredLogs = logs.filter((l) =>
    l.url_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.response.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-slate-700 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nhật ký Hệ thống & Google API</h1>
          <p className="text-xs text-slate-505">
            Theo dõi trực tiếp quá trình quét sitemap, lịch autopilot chạy ngầm và phản hồi từ Google Indexing API.
          </p>
        </div>

        <button
          id="btn-clear-logs"
          onClick={handleClear}
          className="flex items-center gap-1.5 bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 font-bold text-xs px-3.5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
          Dọn dẹp nhật ký
        </button>
      </div>

      {/* Search log parameters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            id="inp-logs-search"
            type="text"
            placeholder="Tìm kiếm hành động, URL mục tiêu hoặc phản hồi lỗi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 focus:outline-none placeholder-slate-400"
          />
        </div>
        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase">
          Hiển thị 100 dòng ghi nhận gần nhất
        </span>
      </div>

      {/* Logs stack list */}
      <div className="space-y-3.5">
        {filteredLogs.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center text-slate-400">
            <Terminal className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            Không tìm thấy hồ sơ hệ thống nào khớp dữ liệu lọc.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const logDate = new Date(log.created_at).toLocaleDateString("vi-VN", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            });

            return (
              <div
                key={log.id}
                className={`bg-white rounded-xl border transition-all duration-150 shadow-sm ${
                  isExpanded ? "border-slate-350 bg-slate-50/50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Accordion trigger line */}
                <div
                  id={`btn-log-trigger-${log.id}`}
                  onClick={() => toggleExpand(log.id)}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full max-w-xl">
                    {/* Icon status */}
                    <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                      {log.status === "Success" ? (
                        <div className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      ) : log.status === "Failed" ? (
                        <div className="p-1.5 bg-red-50 text-red-750 border border-red-100 rounded-lg">
                          <XCircle className="w-4 h-4" />
                        </div>
                      ) : log.status === "Warning" ? (
                        <div className="p-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-blue-50 text-blue-700 border border-blue-105 rounded-lg">
                          <Info className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 w-full truncate">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-slate-800">
                          {log.action}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-450 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          {logDate}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-800 truncate font-semibold flex items-center gap-1 w-full" title={log.url_text}>
                        <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{log.url_text}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side summary preview */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-2">
                    <span className="text-[11px] text-slate-400 truncate max-w-[200px] leading-none text-right font-medium">
                      {log.response.substring(0, 45)}...
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Section Panel with parsed JSON formatted boxes */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1.5 border-t border-slate-200 bg-slate-50/55 rounded-b-xl animate-scale-up">
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-450 tracking-wider mb-2 font-mono">
                      <span>Google API Phản hồi kết quả</span>
                      <span>Hội thoại phân phối UTF-8</span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-950 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{log.response}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
