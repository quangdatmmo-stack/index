/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Search, 
  Trash2, 
  Edit3,
  Plus,
  Send, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Loader2, 
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { UrlItem, Website } from "../types";

interface UrlsViewProps {
  urls: UrlItem[];
  websites: Website[];
  onAddUrl: (websiteId: string, url: string, lastmod?: string, indexed?: "Indexed" | "Not Indexed" | "Unknown") => Promise<boolean>;
  onUpdateUrl: (id: string, updates: Partial<UrlItem>) => Promise<boolean>;
  onDeleteUrl: (id: string) => Promise<void>;
  onSubmitUrl: (ids: string[], isUpdated?: boolean) => Promise<boolean>;
  onCheckIndex: (ids: string[]) => Promise<boolean>;
  showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function UrlsView({
  urls,
  websites,
  onAddUrl,
  onUpdateUrl,
  onDeleteUrl,
  onSubmitUrl,
  onCheckIndex,
  showToast
}: UrlsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWebId, setSelectedWebId] = useState("");
  const [selectedIndexedState, setSelectedIndexedState] = useState("");
  const [selectedSubmittedState, setSelectedSubmittedState] = useState("");

  // Table row select states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ type: string; count: number; success: boolean } | null>(null);

  // Add/Edit URL Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingUrl, setEditingUrl] = useState<UrlItem | null>(null);
  
  const [targetWebId, setTargetWebId] = useState("");
  const [urlPath, setUrlPath] = useState("");
  const [lastModDate, setLastModDate] = useState("");
  const [indexedState, setIndexedState] = useState<"Indexed" | "Not Indexed" | "Unknown">("Unknown");
  const [submittedState, setSubmittedState] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Pagination parameters
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter URL list
  const filteredUrls = urls.filter((it) => {
    const matchesSearch = it.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWebsite = selectedWebId ? it.website_id === selectedWebId : true;
    const matchesIndexed = selectedIndexedState ? it.indexed === selectedIndexedState : true;
    const matchesSubmitted = selectedSubmittedState
      ? (selectedSubmittedState === "true" ? it.submitted : !it.submitted)
      : true;

    return matchesSearch && matchesWebsite && matchesIndexed && matchesSubmitted;
  });

  // Pages calculations
  const totalPages = Math.ceil(filteredUrls.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUrls = filteredUrls.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedUrls.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa liên kết URL này ra khỏi cơ sở dữ liệu?")) {
      await onDeleteUrl(id);
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingUrl(null);
    setTargetWebId(websites[0]?.id || "");
    setUrlPath("");
    setLastModDate(new Date().toISOString().split("T")[0]);
    setIndexedState("Unknown");
    setSubmittedState(false);
    setModalError("");
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: UrlItem) => {
    setEditingUrl(item);
    setTargetWebId(item.website_id);
    setUrlPath(item.url);
    setLastModDate(rowFormatDate(item.lastmod));
    setIndexedState(item.indexed);
    setSubmittedState(item.submitted);
    setModalError("");
    setShowModal(true);
  };

  const rowFormatDate = (val: any): string => {
    if (!val) return new Date().toISOString().split("T")[0];
    if (val.includes("T")) return val.split("T")[0];
    return val;
  };

  // Handle Add/Edit Form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");
    if (!urlPath) {
      setModalError("Vui lòng điền đầy đủ liên kết URL.");
      return;
    }
    if (!targetWebId) {
      setModalError("Vui lòng lựa chọn một Tên miền quản lý tương ứng.");
      return;
    }

    setModalSubmitting(true);
    let success = false;
    try {
      if (editingUrl) {
        // Edit flow
        success = await onUpdateUrl(editingUrl.id, {
          website_id: targetWebId,
          url: urlPath.trim(),
          lastmod: lastModDate,
          indexed: indexedState,
          submitted: submittedState
        });
      } else {
        // Add flow
        success = await onAddUrl(targetWebId, urlPath, lastModDate, indexedState);
      }
    } catch (err: any) {
      setModalError(err.message || "Xảy ra ngoại lệ xử lý.");
    } finally {
      setModalSubmitting(false);
    }

    if (success) {
      setShowModal(false);
      setEditingUrl(null);
    } else {
      setModalError("Lỗi đồng bộ trong lúc cập nhật database. Tên miền hoặc URL không đúng định dạng.");
    }
  };

  const handleSingleSubmit = async (id: string, urlStr: string) => {
    setActionLoadingId(`submit-${id}`);
    const success = await onSubmitUrl([id], true);
    if (success) {
      if (showToast) {
        showToast(`Đã gửi yêu cầu Indexing API thành công cho: ${urlStr}`, "success");
      } else {
        alert(`Đã truyền thành công yêu cầu Indexing API cho: ${urlStr}`);
      }
    } else {
      if (showToast) {
        showToast("Gửi yêu cầu lập chỉ mục thất bại.", "error");
      }
    }
    setActionLoadingId(null);
  };

  const handleSingleCheck = async (id: string, urlStr: string) => {
    setActionLoadingId(`check-${id}`);
    const success = await onCheckIndex([id]);
    if (success) {
      if (showToast) {
        showToast("Đồng bộ dữ liệu kiểm tra thông số URL từ Google thành công.", "success");
      } else {
        alert(`Đồng bộ kiểm tra thông số URL từ Google thành công.`);
      }
    } else {
      if (showToast) {
        showToast("Kiểm tra trạng thái URL không thành công.", "error");
      }
    }
    setActionLoadingId(null);
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    setBulkResult(null);
    const success = await onSubmitUrl(selectedIds, true);
    setBulkLoading(false);
    setBulkResult({
      type: "Gửi đồng loạt lên Google Indexing API",
      count: selectedIds.length,
      success
    });
    setSelectedIds([]);
  };

  const handleBulkCheckIndex = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    setBulkResult(null);
    const success = await onCheckIndex(selectedIds);
    setBulkLoading(false);
    setBulkResult({
      type: "Đồng bộ trạng thái lập chỉ mục thu thập từ Search Console",
      count: selectedIds.length,
      success
    });
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 text-slate-700 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-850">Phân tích & Quản lý danh sách URL</h1>
          <p className="text-xs text-slate-500">Giám sát các liên kết đơn lẻ, quản lý thủ công trạng thái Crawl và thực thi API tự động.</p>
        </div>

        <button
          id="btn-add-url-manual"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm URL thủ công
        </button>
      </div>

      {/* Filter and search parameters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              id="inp-url-search"
              type="text"
              placeholder="Từ khóa tìm kiếm đường dẫn..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-indigo-505 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 focus:outline-none placeholder-slate-400"
            />
          </div>

          {/* Website filter */}
          <div>
            <select
              id="sel-url-web"
              value={selectedWebId}
              onChange={(e) => {
                setSelectedWebId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 focus:border-indigo-505 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
            >
              <option value="">-- Tất cả tên miền --</option>
              {websites.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.domain})
                </option>
              ))}
            </select>
          </div>

          {/* Indexing filter */}
          <div>
            <select
              id="sel-url-indexed"
              value={selectedIndexedState}
              onChange={(e) => {
                setSelectedIndexedState(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 focus:border-indigo-505 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
            >
              <option value="">-- Tất cả trạng thái index --</option>
              <option value="Indexed">Indexed (Đã index)</option>
              <option value="Not Indexed">Not Indexed (Chưa index)</option>
              <option value="Unknown">Unknown (Chưa xác định)</option>
            </select>
          </div>

          {/* Submitted filter */}
          <div>
            <select
              id="sel-url-submitted"
              value={selectedSubmittedState}
              onChange={(e) => {
                setSelectedSubmittedState(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 focus:border-indigo-505 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none"
            >
              <option value="">-- Kênh gửi Google API --</option>
              <option value="true">Đã truyền lên API (Transmitted)</option>
              <option value="false">Chưa gọi API (Not Sent)</option>
            </select>
          </div>
        </div>

        {/* Bulk tools action menu */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
            <div className="text-xs font-semibold text-blue-700">
              Đang chọn: <span className="font-bold text-blue-900 font-mono">{selectedIds.length}</span> liên kết hàng đầu trang bảng hiện tại.
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="btn-bulk-check"
                onClick={handleBulkCheckIndex}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 bg-white border border-blue-200 hover:border-blue-350 text-blue-600 font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition shadow-sm"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Kiểm tra hàng loạt trên Search Console
              </button>

              <button
                id="btn-bulk-submit"
                onClick={handleBulkSubmit}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition shadow shadow-blue-900/10"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Gửi hàng loạt lên Google API ⚡
              </button>
            </div>
          </div>
        )}

        {/* Bulk results notices */}
        {bulkResult && (
          <div
            className={`p-4 rounded-xl text-xs flex justify-between items-center border ${
              bulkResult.success
                ? "bg-emerald-50 border border-emerald-100 text-emerald-800"
                : "bg-red-50 border border-red-105 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {bulkResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-650" />
              )}
              <span>
                <strong>Hoàn tất hành động:</strong> {bulkResult.type}. Đồng bộ thành công đối với:{" "}
                <span className="font-bold font-mono text-slate-900">{bulkResult.count} trang liên quan</span>.
              </span>
            </div>
            <button
              onClick={() => setBulkResult(null)}
              className="text-[10px] hover:underline"
            >
              đóng lại
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-205 bg-slate-50 text-[10px] tracking-widest font-bold uppercase text-slate-400">
                <th className="py-4 px-5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      paginatedUrls.length > 0 &&
                      paginatedUrls.every((u) => selectedIds.includes(u.id))
                    }
                    onChange={handleSelectAll}
                    className="rounded text-blue-650 focus:ring-blue-500 bg-white border-slate-200"
                  />
                </th>
                <th className="py-4 px-4">Đường dẫn liên kết (URL)</th>
                <th className="py-4 px-4 text-center">Dự án Tên miền</th>
                <th className="py-4 px-4 text-center">Cập nhật cuối</th>
                <th className="py-4 px-4 text-center">Index trên Google</th>
                <th className="py-4 px-4 text-center">Trạng thái API</th>
                <th className="py-3 px-5 text-right text-slate-500 font-bold uppercase w-[230px]">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedUrls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-5 text-center text-slate-405 font-medium">
                    <Database className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    Không tìm thấy liên kết URL nào khớp với bộ lọc dữ liệu của bạn.
                  </td>
                </tr>
              ) : (
                paginatedUrls.map((row) => {
                  const webInfo = websites.find((w) => w.id === row.website_id);
                  const isLoadSubmit = actionLoadingId === `submit-${row.id}`;
                  const isLoadCheck = actionLoadingId === `check-${row.id}`;

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        selectedIds.includes(row.id) ? "bg-blue-50/20" : ""
                      }`}
                    >
                      <td className="py-4 px-5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={(e) => handleSelectOne(row.id, e.target.checked)}
                          className="rounded text-blue-650 focus:ring-blue-500 bg-white border-slate-200"
                        />
                      </td>

                      <td className="py-4 px-4 max-w-sm truncate font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate" title={row.url}>{row.url}</span>
                          <a href={row.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-605">
                            <ExternalLink className="w-3.5 h-3.5 mt-0.5" />
                          </a>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center text-slate-500 font-bold truncate max-w-[120px]">
                        {webInfo ? webInfo.name : "Ngoại tuyến / Chưa xác nhận"}
                      </td>

                      <td className="py-4 px-4 text-center text-slate-405 font-mono font-medium">
                        {rowFormatDate(row.lastmod) || "N/A"}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                            row.indexed === "Indexed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : row.indexed === "Not Indexed"
                              ? "bg-amber-50 text-amber-750 border border-amber-100"
                              : "bg-slate-50 text-slate-400 border border-slate-200"
                          }`}
                        >
                          {row.indexed === "Indexed" ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          ) : row.indexed === "Not Indexed" ? (
                            <XCircle className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {row.indexed === "Indexed" ? "Đã index" : row.indexed === "Not Indexed" ? "Chưa index" : "Chưa rõ"}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-center">
                        {row.submitted ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-bold">
                            <Send className="w-3 h-3 text-blue-650" />
                            Đã gửi API
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-medium">Chưa gửi</span>
                        )}
                      </td>

                      <td className="py-3 px-5 text-right space-x-1">
                        <button
                          id={`btn-tbl-check-${row.id}`}
                          onClick={() => handleSingleCheck(row.id, row.url)}
                          disabled={!!actionLoadingId}
                          className="p-1 px-1.5 bg-white hover:bg-slate-100 text-slate-650 text-[10px] font-bold tracking-wide uppercase rounded-lg border border-slate-200 inline-flex items-center gap-0.5 cursor-pointer"
                          title="Cập nhật thông số index trực tuyến"
                        >
                          {isLoadCheck ? <Loader2 className="w-3 h-3 animate-spin" /> : "Kiểm tra Google"}
                        </button>

                        <button
                          id={`btn-tbl-submit-${row.id}`}
                          onClick={() => handleSingleSubmit(row.id, row.url)}
                          disabled={!!actionLoadingId}
                          className="p-1 px-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold tracking-wide uppercase rounded-lg inline-flex items-center gap-0.5 cursor-pointer"
                          title="Submit lên Indexing API"
                        >
                          {isLoadSubmit ? <Loader2 className="w-3 h-3 animate-spin" /> : "Gửi API"}
                        </button>

                        {/* Sửa URL */}
                        <button
                          id={`btn-tbl-edit-${row.id}`}
                          onClick={() => handleOpenEdit(row)}
                          disabled={!!actionLoadingId}
                          className="p-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg inline-flex items-center justify-center cursor-pointer"
                          title="Chỉnh sửa thông số liên kết"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Xóa URL */}
                        <button
                          id={`btn-tbl-delete-${row.id}`}
                          onClick={() => handleDeleteClick(row.id)}
                          disabled={!!actionLoadingId}
                          className="p-1 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-lg inline-flex items-center justify-center cursor-pointer"
                          title="Xóa ra khỏi liên kết"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info pagination controls */}
        <div className="py-4 px-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-xs text-slate-450 font-medium">
            Hiển thị <span className="text-slate-800 font-bold font-mono">{filteredUrls.length > 0 ? startIndex + 1 : 0}</span> đến{" "}
            <span className="text-slate-800 font-bold font-mono">{Math.min(startIndex + itemsPerPage, filteredUrls.length)}</span> trong tổng{" "}
            <span className="text-slate-800 font-bold font-mono">{filteredUrls.length}</span> liên kết
          </span>

          <div className="flex items-center gap-2">
            <button
              id="btn-page-prev"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 disabled:opacity-35 cursor-pointer hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-600 font-bold">
              Trang <span className="text-slate-800 font-bold font-mono">{currentPage}</span> /{" "}
              <span className="text-slate-800 font-bold font-mono">{totalPages}</span>
            </span>
            <button
              id="btn-page-next"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 disabled:opacity-35 cursor-pointer hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit URL Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden relative shadow-xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800">
                {editingUrl ? "Cập nhật dữ liệu liên kết URL" : "Thêm mới liên kết URL thủ công"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">Điền chi tiết liên kết đường dẫn để robot ghi nhận hoặc tự chỉnh sửa thông số bò của Google.</p>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 font-bold flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {modalError}
                </div>
              )}

              {/* Web Domain Select */}
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest mb-1.5">
                  Chọn Tên Miền Quản lý
                </label>
                <select
                  required
                  value={targetWebId}
                  onChange={(e) => setTargetWebId(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="">-- Chọn một sitemap miền --</option>
                  {websites.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.domain})
                    </option>
                  ))}
                </select>
              </div>

              {/* URL Target path */}
              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest mb-1.5">
                  Đường dẫn liên kết (URL)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://tên_miền_của_bạn.com/trang-moi"
                  value={urlPath}
                  onChange={(e) => setUrlPath(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              {/* Datepicker and Select inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest mb-1.5 font-mono">
                    Ngày cập nhật sơ đồ (lastmod)
                  </label>
                  <input
                    type="date"
                    required
                    value={lastModDate}
                    onChange={(e) => setLastModDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-widest mb-1.5">
                    Trạng thái Index
                  </label>
                  <select
                    value={indexedState}
                    onChange={(e: any) => setIndexedState(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Unknown">Unknown (Chưa rõ)</option>
                    <option value="Indexed">Indexed (Đã index)</option>
                    <option value="Not Indexed">Not Indexed (Chưa index)</option>
                  </select>
                </div>
              </div>

              {/* API Transmission switch option */}
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-105">
                <input
                  type="checkbox"
                  id="chk-api-status"
                  checked={submittedState}
                  onChange={(e) => setSubmittedState(e.target.checked)}
                  className="rounded text-blue-650 focus:ring-blue-500 bg-white border-slate-200 h-4 w-4"
                />
                <label htmlFor="chk-api-status" className="text-xs text-slate-600 font-semibold cursor-pointer select-none">
                  Đánh dấu đã truyền thành công qua Google Indexing API
                </label>
              </div>

              <div className="flex gap-3 pt-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUrl(null);
                  }}
                  className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Hủy thao tác
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang đồng bộ...
                    </>
                  ) : (
                    editingUrl ? "Cập nhật thay đổi" : "Thêm mới liên kết"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
