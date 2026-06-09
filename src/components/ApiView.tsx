/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Lock, 
  Upload, 
  CheckCircle, 
  Send, 
  Trash2, 
  Key, 
  FileCode,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Settings } from "../types";

interface ApiViewProps {
  settings: Settings;
  onSaveSettings: (settings: Partial<Settings>) => Promise<boolean>;
  onTriggerDirectSubmit: (url: string, actionType: "URL_UPDATED" | "URL_DELETED") => Promise<any>;
  showToast?: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export default function ApiView({
  settings,
  onSaveSettings,
  onTriggerDirectSubmit,
  showToast
}: ApiViewProps) {
  const [clientEmail, setClientEmail] = useState(settings.client_email);
  const [privateKey, setPrivateKey] = useState(settings.private_key);
  const [projectId, setProjectId] = useState(settings.project_id);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Manual operations
  const [operationUrl, setOperationUrl] = useState("");
  const [operationType, setOperationType] = useState<"URL_UPDATED" | "URL_DELETED">("URL_UPDATED");
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationLog, setOperationLog] = useState<any | null>(null);

  // Drag-and-drop JSON load parameters
  const [isDragOver, setIsDragOver] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveStatus(null);
    const success = await onSaveSettings({
      client_email: clientEmail,
      private_key: privateKey,
      project_id: projectId
    });
    setSaveLoading(false);
    if (success) {
      setSaveStatus("success");
      if (showToast) showToast("Đã lưu cấu hình Google Indexing API thành công!", "success");
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus("error");
      if (showToast) showToast("Lưu cấu hình lỗi. Kiểm tra lại thông số nhập vào.", "error");
    }
  };

  const handleJsonUpload = (text: string) => {
    try {
      const payload = JSON.parse(text);
      if (payload.client_email && payload.private_key && payload.project_id) {
        setClientEmail(payload.client_email);
        setPrivateKey(payload.private_key);
        setProjectId(payload.project_id);
        if (showToast) {
          showToast("Đã nhập tài khoản dịch vụ (Service Account) thành công! Hãy lưu lại để hoàn chỉnh thiết lập.", "success");
        } else {
          alert("Credentials parsed successfully! Remember to submit Save configuration parameters.");
        }
      } else {
        if (showToast) {
          showToast("File cấu hình Service Account JSON thiếu thông số (client_email, private_key hoặc project_id).", "error");
        } else {
          alert("Invalid Service Account JSON format. Missing key fields (client_email, private_key, project_id).");
        }
      }
    } catch (e) {
      if (showToast) {
        showToast("Định dạng file tải lên không hợp lệ.", "error");
      } else {
        alert("Invalid JSON data format.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleJsonUpload(text);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragOver(true);
    } else if (e.type === "dragleave") {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
         handleJsonUpload(text);
      };
      reader.readAsText(file);
    } else {
      if (showToast) {
        showToast("Vui lòng chỉ tải lên tài liệu định dạng tệp .json hợp lệ.", "warning");
      } else {
        alert("Please upload a .json file.");
      }
    }
  };

  const handleDirectOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operationUrl) return;
    setOperationLoading(true);
    setOperationLog(null);
    try {
      const res = await onTriggerDirectSubmit(operationUrl, operationType);
      setOperationLog(res);
    } catch {
      setOperationLog({ error: "API connection rejected." });
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-700 font-sans">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Điều phối Google Indexing API</h1>
        <p className="text-xs text-slate-500">
          Tải cấu hình tài khoản dịch vụ (Service Account) của bạn và thực hiện các hành động gửi yêu cầu lập chỉ mục tức thì lên máy chủ Google.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Credentials Setup card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-5 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-blue-600" />
              Thông tin xác thực Service Account
            </h2>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Đã kết nối
            </span>
          </div>

          {/* JSON Upload Drag box */}
          <div
            id="drag-json-dropzone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-5 text-center transition flex flex-col items-center justify-center space-y-2 ${
              isDragOver
                ? "border-blue-500 bg-blue-50 text-blue-600"
                : "border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-400"
            }`}
          >
            <Upload className="w-7 h-7 text-blue-600" />
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Kéo & thả hoặc nhấp để tải lên tệp tin <span className="text-blue-600">service-account.json</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Hệ thống tự động phân tách Client Email, Project ID và Khóa bí mật</p>
            </div>
            
            <input
              id="inp-json-uploader"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => document.getElementById("inp-json-uploader")?.click()}
              className="text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 underline cursor-pointer"
            >
              Chọn tệp tin từ thiết bị
            </button>
          </div>

          {/* Direct credentials entry form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                Địa chỉ Email tài khoản dịch vụ (Client Email)
              </label>
              <input
                id="inp-api-email"
                type="email"
                required
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full bg-white text-xs border border-slate-200 hover:border-slate-350 focus:border-blue-500 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1 font-mono">
                ID Dự án Google Cloud (Project ID)
              </label>
              <input
                id="inp-api-project"
                type="text"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-white text-xs border border-slate-200 hover:border-slate-350 focus:border-blue-500 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                  Khóa bí mật (Private Key)
                </label>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Lock className="w-3 h-3" /> Bản mã hóa bảo mật
                </span>
              </div>
              <textarea
                id="txa-api-key"
                rows={4}
                required
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="w-full bg-white font-mono text-[10px] leading-relaxed border border-slate-200 hover:border-slate-350 focus:border-blue-500 rounded-lg p-3 text-slate-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                id="btn-save-credentials"
                type="submit"
                disabled={saveLoading}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Lưu cấu hình xác thực API
              </button>
            </div>

            {saveStatus && (
              <div
                className={`p-3.5 rounded-lg text-xs flex gap-2 border ${
                  saveStatus === "success"
                    ? "bg-emerald-50 border border-emerald-100 text-emerald-800"
                    : "bg-red-50 border border-red-100 text-red-800"
                }`}
              >
                {saveStatus === "success" ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Lưu thông tin xác thực thành công! Hệ thống định kì sẽ tự động đồng bộ.
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Lưu cấu hình lỗi. Vui lòng kiểm tra lại.
                  </>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Manual Instant URL Dispatcher card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Send className="w-4.5 h-4.5 text-blue-600" />
              Gửi yêu cầu thủ công tức thì
            </h2>
            <p className="text-xs text-slate-400">
              Gửi trực tiếp một liên kết URL đơn lẻ để thêm/cập nhật hoặc yêu cầu rút lập chỉ mục ra khỏi Google ngay lập tức.
            </p>

            <form onSubmit={handleDirectOperation} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                  Đường dẫn URL mục tiêu tuyệt đối
                </label>
                <input
                  id="inp-direct-url"
                  type="url"
                  required
                  placeholder="https://example.com/important-new-blog-release"
                  value={operationUrl}
                  onChange={(e) => setOperationUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-500 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                  Danh mục chỉ thị thực hiện
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-opt-type-updated"
                    type="button"
                    onClick={() => setOperationType("URL_UPDATED")}
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold cursor-pointer transition rounded-lg border ${
                      operationType === "URL_UPDATED"
                        ? "bg-blue-600 text-white border-blue-500 font-bold"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Đăng ký / Cập nhật URL
                  </button>

                  <button
                    id="btn-opt-type-deleted"
                    type="button"
                    onClick={() => setOperationType("URL_DELETED")}
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold cursor-pointer transition rounded-lg border ${
                      operationType === "URL_DELETED"
                        ? "bg-red-600 text-white border-red-500 font-bold"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hủy chỉ mục / Xóa URL
                  </button>
                </div>
              </div>

              <button
                id="btn-direct-dispatch"
                type="submit"
                disabled={operationLoading}
                className="w-full flex items-center justify-center gap-1.5 bg-white border border-blue-300 hover:border-blue-500 font-bold text-xs py-2.5 rounded-lg text-blue-600 cursor-pointer transition shadow-sm"
              >
                {operationLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang truyền tải yêu cầu...
                  </>
                ) : (
                  "Khởi chạy kết nối API Google"
                )}
              </button>
            </form>
          </div>

          {/* Terminal output API feedback */}
          <div className="mt-5 space-y-2">
            <div className="flex justify-between items-center text-[10px] tracking-wider uppercase font-bold text-slate-550">
              <span className="flex items-center gap-1 font-mono">
                <FileCode className="w-3.5 h-3.5 text-blue-500" /> Nhật ký phản hồi từ máy chủ Google
              </span>
              <span className="font-mono text-slate-400">Định dạng kết quả JSON</span>
            </div>
            
            <div className="bg-slate-900 p-4 rounded-lg border border-slate-950 text-[10.5px] font-mono leading-relaxed h-44 overflow-y-auto text-emerald-400 shadow-inner">
              {operationLog ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(operationLog, null, 2)}</pre>
              ) : (
                <span className="text-slate-500 italic">Khởi chạy Kết nối API Google ở trên để nhận kết quả phản hồi thực tế từ hệ thống...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
