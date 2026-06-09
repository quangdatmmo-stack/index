/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Clock, 
  Mail, 
  Database, 
  Loader2, 
  CheckCircle, 
  ToggleLeft, 
  ToggleRight,
  ShieldCheck,
  AlertOctagon,
  RefreshCw,
  Sliders,
  AlertCircle
} from "lucide-react";
import { Settings } from "../types";

interface SettingsViewProps {
  settings: Settings;
  onSaveSettings: (settings: Partial<Settings>) => Promise<boolean>;
  showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function SettingsView({ settings, onSaveSettings, showToast }: SettingsViewProps) {
  const [autoSubmit, setAutoSubmit] = useState(settings.auto_submit);
  const [cronInterval, setCronInterval] = useState(settings.cron_interval);
  const [emailNotifications, setEmailNotifications] = useState(settings.email_notifications);
  const [notificationEmail, setNotificationEmail] = useState(settings.notification_email);
  const [checkerMethod, setCheckerMethod] = useState(settings.index_checker_method);
  
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveStatus(null);
    const success = await onSaveSettings({
      auto_submit: autoSubmit,
      cron_interval: cronInterval,
      email_notifications: emailNotifications,
      notification_email: notificationEmail,
      index_checker_method: checkerMethod
    });
    setSaveLoading(false);
    if (success) {
      setSaveStatus("success");
      if (showToast) {
        showToast("Đã lưu cài đặt cấu hình nâng cao thành công!", "success");
      }
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus("error");
      if (showToast) {
        showToast("Lưu cài đặt không thành công.", "error");
      }
    }
  };

  const handleResetSimulations = async () => {
    if (confirm("Bạn có chắc chắn muốn khôi phục cơ sở dữ liệu về dữ liệu mô phỏng gốc? Thao tác này sẽ ghi đè các cấu hình trang web/URL và dọn dẹp lịch sử nhật ký cũ.")) {
      try {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ use_demo_data: true })
        });
        if (res.ok) {
          if (showToast) {
            showToast("Đang chuẩn bị xây dựng lại dữ liệu mô phỏng...", "info");
          } else {
            alert("Datasheet initialized to active telemetry. Rebuilding dashboard...");
          }
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch {
        if (showToast) {
          showToast("Khôi phục danh sách cơ sở dữ liệu mẫu thất bại.", "error");
        } else {
          alert("Failed to reset database registries.");
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Cấu hình Chỉ mục Hệ thống</h1>
        <p className="text-sm text-slate-400">
          Cấu hình các tham số sitemap chạy ngầm tự động, thiết lập thông báo cảnh báo qua email và phương thức kiểm tra chỉ mục của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main preferences form card */}
        <div className="lg:col-span-2 bg-slate-900/40 p-5 rounded-2xl border border-slate-850 h-fit">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Auto Submit Switcher */}
            <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-850">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-200">Tự động gửi yêu cầu Indexing API (Auto SEO)</span>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-md">
                  Tự động gửi yêu cầu lập chỉ mục bất kỳ trang nào ở trạng thái "Chưa lập chỉ mục" tới Google Indexing API của bạn ngay khi phát hiện lượt quét mới.
                </p>
              </div>

              <button
                id="btn-toggle-auto-submit"
                type="button"
                onClick={() => setAutoSubmit(!autoSubmit)}
                className="text-slate-400 hover:text-white cursor-pointer transition"
              >
                {autoSubmit ? (
                  <ToggleRight className="w-12 h-8 text-indigo-500" />
                ) : (
                  <ToggleLeft className="w-12 h-8 text-slate-600" />
                )}
              </button>
            </div>

            {/* Cron intervals */}
            <div className="space-y-2">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Clock className="w-4 h-4 text-indigo-400" />
                Chu kỳ quét ngầm tự động (Autopilot Cron)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {(["30m", "1h", "6h", "1d"] as const).map((interval) => (
                  <button
                    key={interval}
                    id={`btn-interval-${interval}`}
                    type="button"
                    onClick={() => setCronInterval(interval)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl border cursor-pointer transition ${
                      cronInterval === interval
                        ? "bg-indigo-600 text-white border-indigo-500 shadow shadow-indigo-900/10"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    Mỗi {interval === "30m" ? "30 Phút" : interval === "1h" ? "1 Giờ" : interval === "6h" ? "6 Giờ" : "24 Giờ"}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 italic">Ứng dụng sẽ tự động tải dữ liệu sitemap được lưu và đồng bộ kiểm tra trạng thái lập chỉ mục theo chu kỳ đã chọn.</p>
            </div>

            {/* Email warning alerts parameter */}
            <div className="space-y-4 pt-4 border-t border-slate-850/60">
              <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-xl border border-slate-850">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-200">Gửi Email Cảnh báo Sự cố</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Nhận thông báo email tự động tức thời khi xảy ra lỗi đồng bộ sitemap hoặc khi Google API trả về phản hồi lỗi.
                  </p>
                </div>

                <button
                  id="btn-toggle-mail"
                  type="button"
                  onClick={() => setEmailNotifications(!emailNotifications)}
                  className="text-slate-400 hover:text-white cursor-pointer transition"
                >
                  {emailNotifications ? (
                    <ToggleRight className="w-12 h-8 text-indigo-500" />
                  ) : (
                    <ToggleLeft className="w-12 h-8 text-slate-600" />
                  )}
                </button>
              </div>

              {emailNotifications && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> Địa chỉ Email Nhận Cảnh báo
                  </label>
                  <input
                    id="inp-settings-email"
                    type="email"
                    required
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    className="w-full bg-slate-950 text-xs border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none placeholder-slate-700"
                  />
                </div>
              )}
            </div>

            {/* Checker API method preferences */}
            <div className="space-y-3 pt-4 border-t border-slate-850/60">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                <Sliders className="w-3.5 h-3.5" /> Phương thức Kiểm tra Chỉ mục SEO
              </label>
              <select
                id="sel-settings-method"
                value={checkerMethod}
                onChange={(e) => setCheckerMethod(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="Simulation Demo Mode">Chế độ Mô phỏng Động (Được gợi ý thử nghiệm)</option>
                <option value="Inspection API">Phương thức Google URL Inspection API Chính Thức</option>
                <option value="Site Search Query">Phương thức Truy vấn Kết quả Tìm kiếm với 'site:url'</option>
              </select>
            </div>

            {/* Form actions and alerts triggers */}
            <div className="flex gap-4 justify-end pt-3">
              <button
                id="btn-settings-save"
                type="submit"
                disabled={saveLoading}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Lưu lại cấu hình
              </button>
            </div>

            {saveStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs flex gap-2 border ${
                  saveStatus === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {saveStatus === "success" ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Đã lưu các thiết lập cấu hình của bạn một cách an toàn. Các tiến trình quét ngầm đã được cấu hình thành công.
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Không thể lưu cấu hình của bạn. Vui lòng xác thực cơ sở dữ liệu.
                  </>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Diagnostic operations list card */}
        <div className="lg:col-span-1 bg-slate-900/40 p-5 rounded-2xl border border-slate-850 h-fit space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="w-4.5 h-4.5 text-indigo-400" />
            Cơ sở Dữ liệu
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed font-semibold">
            Quản lý cơ sở dữ liệu sitemap diễn tập hiện tại và khôi phục dữ liệu bắt đầu ban đầu.
          </p>

          <div className="space-y-3.5">
            {/* Reset button widget */}
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 space-y-3 flex flex-col">
              <div className="flex gap-2 text-slate-300 text-xs font-semibold">
                <AlertOctagon className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0" />
                <div>
                  <span>Reset & Nạp Lại Dữ Liệu Ban Đầu</span>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Xóa sạch toàn bộ thay đổi, nạp lại dữ liệu sitemap và danh sách URL trình diễn ban đầu mẫu.</p>
                </div>
              </div>

              <button
                id="btn-reset-demo"
                onClick={handleResetSimulations}
                className="w-full flex items-center justify-center gap-1 text-[10.5px] font-bold tracking-wide uppercase bg-slate-950 hover:bg-slate-900 text-indigo-405 border border-indigo-900/40 py-2 rounded-xl cursor-pointer transition duration-150"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thiết lập lại dữ liệu sitemap mẫu
              </button>
            </div>

            {/* Security checklist info */}
            <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 space-y-2 text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Tổng quan Bảo mật
              </span>
              <ul className="space-y-1.5 list-disc pl-3 text-[10px] text-slate-500 font-medium leading-relaxed">
                <li>Kết nối mã hóa SSL đang hoạt động</li>
                <li>Lưu trữ thông tin xác thực an toàn</li>
                <li>Phòng chống tấn công lặp tín hiệu CORS</li>
                <li>Bảo vệ chống tấn công giả mạo CSRF</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
