/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Edit3,
  RefreshCw, 
  Globe, 
  Calendar, 
  Layers, 
  Loader2, 
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Website } from "../types";

interface WebsitesViewProps {
  websites: Website[];
  onAddWebsite: (name: string, domain: string, sitemap_url: string) => Promise<boolean>;
  onDeleteWebsite: (id: string) => Promise<void>;
  onUpdateWebsite: (id: string, name: string, domain: string, sitemap_url: string) => Promise<boolean>;
  onForceSync: (id: string) => Promise<{ added: number; total: number; errors: string[] }>;
}

export default function WebsitesView({
  websites,
  onAddWebsite,
  onDeleteWebsite,
  onUpdateWebsite,
  onForceSync
}: WebsitesViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWeb, setEditingWeb] = useState<Website | null>(null);
  
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ webId: string; success: boolean; added: number; total: number; errors?: string[] } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleOpenAdd = () => {
    setEditingWeb(null);
    setName("");
    setDomain("");
    setSitemapUrl("");
    setErrorMessage("");
    setShowAddModal(true);
  };

  const handleOpenEdit = (web: Website) => {
    setEditingWeb(web);
    setName(web.name);
    setDomain(web.domain);
    setSitemapUrl(web.sitemap_url);
    setErrorMessage("");
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!name || !domain) {
      setErrorMessage("Vui lòng điền đầy đủ Tên trang web và Tên miền.");
      return;
    }

    setSubmitting(true);
    let success = false;
    if (editingWeb) {
      success = await onUpdateWebsite(editingWeb.id, name, domain, sitemapUrl);
    } else {
      success = await onAddWebsite(name, domain, sitemapUrl);
    }
    setSubmitting(false);

    if (success) {
      setName("");
      setDomain("");
      setSitemapUrl("");
      setEditingWeb(null);
      setShowAddModal(false);
    } else {
      setErrorMessage(editingWeb ? "Cập nhật thất bại. Vui lòng kiểm tra lại thông tin đầu vào." : "Tên miền đã được đăng ký hoặc dữ liệu không hợp lệ.");
    }
  };

  const handleSyncClick = async (id: string) => {
    setSyncingId(id);
    setSyncResult(null);
    try {
      const data = await onForceSync(id);
      setSyncResult({
        webId: id,
        success: true,
        added: data.added,
        total: data.total,
        errors: data.errors
      });
    } catch {
      setSyncResult({
        webId: id,
        success: false,
        added: 0,
        total: 0,
        errors: ["Lỗi kết nối hoặc sự cố dữ liệu sơ đồ XML."]
      });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-700">
      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản lý Sitemap & Tên miền</h1>
          <p className="text-xs text-slate-500">Thêm, sửa, xóa cấu hình nguồn cấp sơ đồ trang web XML.</p>
        </div>
        
        <button
          id="btn-open-add-website"
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm tên miền mới
        </button>
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {websites.length === 0 ? (
          <div className="md:col-span-2 bg-white border border-slate-200 p-12 text-center text-slate-400 rounded-xl shadow-sm">
            <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">Chưa có tên miền nào được liên kết</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Vui lòng nhấp vào nút "Thêm tên miền mới" ở góc trên để cài đặt sitemap đầu tiên của bạn.</p>
          </div>
        ) : (
          websites.map((web) => (
            <div key={web.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 mt-0.5">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{web.name}</h3>
                      <p className="text-xs text-slate-405 font-mono mt-0.5">{web.domain}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Edit button */}
                    <button
                      id={`btn-edit-web-${web.id}`}
                      onClick={() => handleOpenEdit(web)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Sửa thông tin tên miền"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {/* Delete button */}
                    <button
                      id={`btn-delete-web-${web.id}`}
                      onClick={() => onDeleteWebsite(web.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Xóa tên miền"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info block */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-2 font-medium">
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      Sơ đồ Sitemap XML mục tiêu
                    </span>
                    <a
                      href={web.sitemap_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      đường dẫn XML
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex justify-between items-center text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Ngày khởi tạo dữ liệu
                    </span>
                    <span className="text-slate-700 font-semibold">
                      {new Date(web.created_at).toLocaleDateString("vi-VN", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action sync triggers */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  id={`btn-sync-web-${web.id}`}
                  onClick={() => handleSyncClick(web.id)}
                  disabled={syncingId === web.id}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-bold cursor-pointer disabled:opacity-55"
                >
                  {syncingId === web.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Đang đồng bộ...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      Tải URL từ Sitemap XML mới
                    </>
                  )}
                </button>

                {/* Sync status flags */}
                {syncResult && syncResult.webId === web.id && (
                  <div className="text-xs flex flex-col items-end gap-1 w-full sm:w-auto">
                    <div className={`flex items-center gap-1 ${syncResult.success ? "text-emerald-700 font-bold" : "text-red-700 font-bold"}`}>
                      {syncResult.success ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Tìm thấy {syncResult.total} URL ({syncResult.added} mới)
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          Lỗi nạp sơ đồ. (Đang dùng dữ liệu Demo)
                        </>
                      )}
                    </div>
                    {syncResult.errors && syncResult.errors.length > 0 && (
                      <div className="text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-100 max-w-xs text-[10px] mt-1.5 shadow-sm leading-relaxed text-left">
                        <span className="font-bold block text-red-700 mb-0.5">⚠️ Chi tiết sự cố tải sitemap từ xa:</span>
                        {syncResult.errors.map((err, idx) => (
                          <div key={idx} className="break-all">{err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Website Overlay Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden relative shadow-xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800">
                {editingWeb ? "Cập nhật thông tin tên miền" : "Thêm mới tên miền theo dõi"}
              </h2>
              <p className="text-xs text-slate-400 mt-1">Cung cấp tên hiển thị nhãn, địa chỉ tên miền và cấu hình đường dẫn XML tương ứng.</p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 font-bold flex gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Tên nhãn / Tiêu đề gợi nhớ
                </label>
                <input
                  id="inp-web-name"
                  type="text"
                  required
                  placeholder="Ví dụ: Blog Phát Triển Doanh Nghiệp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-355 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Địa chỉ tên miền chính (Domain)
                </label>
                <input
                  id="inp-web-domain"
                  type="text"
                  required
                  placeholder="Ví dụ: doanhnghiepviet.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-355 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Đường dẫn Sitemap XML (Tùy chọn)
                </label>
                <input
                  id="inp-web-sitemap"
                  type="url"
                  placeholder="https://doanhnghiepviet.com/sitemap_index.xml"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-355 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none placeholder-slate-400"
                />
                <span className="text-[10px] text-slate-405 mt-1.5 inline-block text-slate-400 font-medium">Bỏ trống để mặc định liên kết: ten_mien/sitemap.xml</span>
              </div>

              <div className="flex gap-3 pt-3 justify-end">
                <button
                  id="btn-close-web-modal"
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingWeb(null);
                  }}
                  className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Hủy thao tác
                </button>
                <button
                  id="btn-submit-web-form"
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang xử lý lưu trữ...
                    </>
                  ) : (
                    editingWeb ? "Cập nhật thay đổi" : "Xác nhận thêm trang"
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
