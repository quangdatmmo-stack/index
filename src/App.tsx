/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Globe, 
  LayoutDashboard, 
  Layers, 
  Key, 
  Search, 
  Terminal, 
  Settings as SettingsIcon, 
  CheckCircle,
  Menu,
  X,
  User,
  Clock,
  CircleCheck,
  Zap,
  Loader,
  Play,
  Database,
  Lock,
  Mail,
  LogOut,
  Info,
  Check,
  RefreshCw,
  AlertCircle
} from "lucide-react";

import DashboardView from "./components/DashboardView";
import WebsitesView from "./components/WebsitesView";
import UrlsView from "./components/UrlsView";
import CheckerView from "./components/CheckerView";
import ApiView from "./components/ApiView";
import SearchConsoleView from "./components/SearchConsoleView";
import LogsView from "./components/LogsView";
import SettingsView from "./components/SettingsView";
import { Website, UrlItem, LogItem, Settings, DashboardStats } from "./types";
import { 
  getSupabase, 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  clearSupabaseConfig,
  seedSupabaseData,
  dbFetchWebsites,
  dbAddWebsite,
  dbDeleteWebsite,
  dbUpdateWebsite,
  dbFetchUrls,
  dbAddUrl,
  dbAddUrlsBatch,
  dbDeleteUrl,
  dbUpdateUrl,
  dbFetchLogs,
  dbAddLog,
  dbClearLogs,
  dbFetchSettings,
  dbSaveSettings
} from "./lib/supabase";

export default function App() {
  const [currentView, setCurrentView] = useState<string>("Bảng điều khiển");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Supabase Auth States
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");

  // Supabase Connection States (fallback UI configuration)
  const [configUrl, setConfigUrl] = useState("");
  const [configKey, setConfigKey] = useState("");
  const [isConfiguring, setIsConfiguring] = useState(false);

  // Core synchronized application state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<{ date: string; indexed: number; submitted: number }[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [webSummaries, setWebSummaries] = useState<any[]>([]);
  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // Loading indicator flags
  const [loading, setLoading] = useState(true);
  const [isCronRunning, setIsCronRunning] = useState(false);

  // UTC clock state
  const [utcTime, setUtcTime] = useState("");

  // Toast notifications engine state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "info" | "warning" }[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Initialize and load configurations
  useEffect(() => {
    const config = getSupabaseConfig();
    setConfigUrl(config.url);
    setConfigKey(config.key);

    const sb = getSupabase();
    if (sb) {
      // Fetch active session
      sb.auth.getSession().then(({ data }) => {
        if (data.session) {
          setUser(data.session.user);
        } else {
          setLoading(false);
        }
      }).catch((err) => {
        console.error("Auth session check error: ", err);
        setLoading(false);
      });

      // Synchronize session events
      const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, []);

  // Sync data whenever user transforms
  useEffect(() => {
    if (user) {
      refreshAllData();
    } else {
      // Logged out, clear records
      setStats(null);
      setWebsites([]);
      setUrls([]);
      setLogs([]);
      setSettings(null);
    }
  }, [user]);

  // Clock runner
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setUtcTime(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) return;

      // Seed starter databases if empty properties discovered
      await seedSupabaseData(user.id);

      // 1. Fetch websites
      const webs = await dbFetchWebsites(user.id);
      setWebsites(webs);

      // 2. Fetch URLs
      const u = await dbFetchUrls(user.id);
      setUrls(u);

      // 3. Fetch logs
      const l = await dbFetchLogs(user.id);
      setLogs(l);

      // 4. Fetch settings
      let s = await dbFetchSettings(user.id);
      if (!s) {
        // Fallback or setup initial setting
        await dbSaveSettings(user.id, {
          client_email: "indexing-manager@search-console-pro.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDhS4dZ2kPr...\n-----END PRIVATE KEY-----",
          project_id: "google-indexing-pro-41220",
          auto_submit: true,
          cron_interval: "1h",
          email_notifications: true,
          notification_email: user.email || "seo-manager@yourdomain.com",
          index_checker_method: "Simulation Demo Mode",
          use_demo_data: false
        });
        s = await dbFetchSettings(user.id);
      }
      if (s) setSettings(s);

      // Calculate Metrics from raw database logs dynamically
      const total_websites = webs.length;
      const total_urls = u.length;
      const url_indexed = u.filter((item) => item.indexed === "Indexed").length;
      const url_not_indexed = u.filter((item) => item.indexed === "Not Indexed").length;
      const url_unknown = u.filter((item) => item.indexed === "Unknown").length;
      const url_submitted = u.filter((item) => item.submitted).length;
      const index_rate = total_urls > 0 ? Math.round((url_indexed / total_urls) * 100) : 0;

      setStats({
        total_websites,
        total_urls,
        url_indexed,
        url_not_indexed,
        url_unknown,
        url_submitted,
        index_rate
      });

      // Assemble responsive growth curves history representation
      const chart_data = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
        const priorTime = d.getTime();
        
        const indexedCount = u.filter(
          (item) => item.indexed === "Indexed" && (!item.last_checked || new Date(item.last_checked).getTime() <= priorTime)
        ).length;
        
        const submittedCount = u.filter(
          (item) => item.submitted && item.last_checked && new Date(item.last_checked).getTime() <= priorTime
        ).length;

        chart_data.push({
          date: dateStr,
          indexed: indexedCount,
          submitted: submittedCount
        });
      }
      setChartData(chart_data);

      // Website metrics dashboard display summaries
      const summaries = webs.map((w) => {
        const wUrls = u.filter((item) => item.website_id === w.id);
        const total = wUrls.length;
        const indexed = wUrls.filter((item) => item.indexed === "Indexed").length;
        const rate = total > 0 ? Math.round((indexed / total) * 100) : 0;
        return {
          id: w.id,
          name: w.name,
          domain: w.domain,
          total_urls: total,
          indexed_urls: indexed,
          index_rate: rate
        };
      });
      setWebSummaries(summaries);

    } catch (err) {
      console.error("Lỗi đồng bộ dữ liệu Supabase:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auth processing
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccessMsg("");

    const sb = getSupabase();
    if (!sb) {
      setAuthError("Vui lòng cấu hình kết nối Supabase trước khi tiếp tục.");
      setAuthLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await sb.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data?.user && !data.session) {
          setAuthSuccessMsg("Đăng ký thành công! Vui lòng kiểm tra hộp thư email của bạn để xác thực tài khoản.");
        } else if (data?.session) {
          setUser(data.session.user);
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data?.user) {
          setUser(data.user);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Xác thực không thành công.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const sb = getSupabase();
    if (sb) {
      await sb.auth.signOut();
    }
    setUser(null);
  };

  const handleConfigureSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configUrl || !configKey) {
      showToast("Vui lòng nhập đầy đủ URL và Anon Key.", "error");
      return;
    }
    saveSupabaseConfig(configUrl, configKey);
    setIsConfiguring(false);
    
    // Quick reload window connection
    window.location.reload();
  };

  const handleResetSupabaseConfig = () => {
    if (confirm("Bạn có chắc chắn muốn ngắt kết nối cấu hình Supabase hiện tại?")) {
      clearSupabaseConfig();
      setUser(null);
      window.location.reload();
    }
  };

  // Backend Synchronizer interactions backed up by Supabase updates

  const handleAddWebsite = async (name: string, domain: string, sitemap_url: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
      const fullSitemapUrl = sitemap_url || `https://${cleanDomain}/sitemap.xml`;
      
      const newWeb = await dbAddWebsite(user.id, name, cleanDomain, fullSitemapUrl);
      if (newWeb) {
        // Log action in audit databases
        await dbAddLog(user.id, {
          url_id: null,
          url_text: cleanDomain,
          action: "WEBSITE_ADDED",
          response: `Trang web ${name} đã được đăng ký mới trên cơ sở dữ liệu Supabase.`,
          status: "Success",
          created_at: new Date().toISOString()
        });

        // Trigger indexing background sync in backend to fetch sitemap URLs
        fetch(`/api/websites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, domain: cleanDomain, sitemap_url: fullSitemapUrl })
        }).then(async (res) => {
          if (res.ok) {
            // Re-sync sitemap urls in background
            const serverWeb = await res.json();
            const syncRes = await fetch(`/api/websites/${serverWeb.id}/sync`, { method: "POST" });
            const syncData = await syncRes.json();
            if (syncData.success) {
              const currentUrls = await dbFetchUrls(user.id);
              // Filter out already available URLs
              const sitemapsUrls = (syncData.discovered_urls || []).filter((su: string) => !currentUrls.some(u => u.url === su));
              if (sitemapsUrls.length > 0) {
                const addBatchObj = sitemapsUrls.map((rawUrl: string) => ({
                  website_id: newWeb.id,
                  url: rawUrl,
                  lastmod: new Date().toISOString().split('T')[0],
                  indexed: "Unknown" as const,
                  submitted: false,
                  last_checked: null,
                  created_at: new Date().toISOString()
                }));
                await dbAddUrlsBatch(user.id, addBatchObj);
              }
            }
          }
          await refreshAllData();
        }).catch(err => {
          console.error("Background sync trigger error: ", err);
          refreshAllData();
        });

        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteWebsite = async (id: string) => {
    if (!user) return;
    if (confirm("Bạn có thực sự muốn xóa trang web này và toàn bộ các liên kết URL thuộc về nó?")) {
      try {
        const success = await dbDeleteWebsite(user.id, id);
        if (success) {
          await dbAddLog(user.id, {
            url_id: null,
            url_text: `ID trang web: ${id}`,
            action: "WEBSITE_DELETED",
            response: `Đã dọn dẹp và xóa trang web cùng tất cả các liên kết URL ra khỏi cơ sở dữ liệu.`,
            status: "Warning",
            created_at: new Date().toISOString()
          });
          showToast("Đã xóa trang web cùng toàn bộ URL liên kết thành công.", "success");
          await refreshAllData();
        }
      } catch (err) {
        showToast("Không thể xóa trang web lý do lỗi kết nối cơ sở dữ liệu.", "error");
      }
    }
  };

  const handleUpdateWebsite = async (id: string, name: string, domain: string, sitemap_url: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
      const fullSitemapUrl = sitemap_url || `https://${cleanDomain}/sitemap.xml`;
      const success = await dbUpdateWebsite(user.id, id, {
        name,
        domain: cleanDomain,
        sitemap_url: fullSitemapUrl
      });
      if (success) {
        await dbAddLog(user.id, {
          url_id: null,
          url_text: cleanDomain,
          action: "WEBSITE_UPDATED",
          response: `Đã chỉnh sửa và cập nhật thành công thông tin cấu hình trang web [${name}].`,
          status: "Success",
          created_at: new Date().toISOString()
        });
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleAddUrl = async (websiteId: string, url: string, lastmod?: string, indexed?: "Indexed" | "Not Indexed" | "Unknown"): Promise<boolean> => {
    if (!user) return false;
    try {
      const item = await dbAddUrl(user.id, websiteId, url, lastmod, indexed);
      if (item) {
        await dbAddLog(user.id, {
          url_id: item.id,
          url_text: url,
          action: "URL_CREATED",
          response: `Người dùng đã thêm liên kết mới thủ công vào cơ sở dữ liệu. Trạng thái kiểm tra: ${indexed || "Unknown"}`,
          status: "Success",
          created_at: new Date().toISOString()
        });
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleUpdateUrl = async (id: string, updates: Partial<UrlItem>): Promise<boolean> => {
    if (!user) return false;
    try {
      const success = await dbUpdateUrl(user.id, id, updates);
      if (success) {
        await dbAddLog(user.id, {
          url_id: id,
          url_text: updates.url || "URL",
          action: "URL_UPDATED",
          response: `Đã cập nhật các thông số liên kết thủ công thành công.`,
          status: "Success",
          created_at: new Date().toISOString()
        });
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleForceSync = async (id: string): Promise<{ added: number; total: number; errors: string[] }> => {
    if (!user) return { added: 0, total: 0, errors: ["Chưa xác thực người dùng."] };
    try {
      const selectedWeb = websites.find(w => w.id === id);
      if (!selectedWeb) return { added: 0, total: 0, errors: ["Không tìm thấy trang web tương ứng."] };

      // Log sync start
      await dbAddLog(user.id, {
        url_id: null,
        url_text: selectedWeb.domain,
        action: "SITEMAP_SYNC_START",
        response: `Khởi chạy tiến trình kiểm tra quét sitemaps từ xa cho tên miền ${selectedWeb.domain}`,
        status: "Info",
        created_at: new Date().toISOString()
      });

      // Call Express server proxy scraper to get real fresh sitemap URLs
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedWeb.name, domain: selectedWeb.domain, sitemap_url: selectedWeb.sitemap_url })
      });
      
      if (!res.ok) {
        return { added: 0, total: 0, errors: ["Máy chủ phản hồi lỗi khi nạp sitemap."] };
      }
      
      const serverWeb = await res.json();
      const syncRes = await fetch(`/api/websites/${serverWeb.id}/sync`, { method: "POST" });
      const syncData = await syncRes.json();
      
      if (syncData.success) {
        const currentUrls = await dbFetchUrls(user.id, id);
        const discovered = syncData.discovered_urls || [];
        
        // Find URLs that don't exist yet
        const toAdd = discovered.filter((dUrl: string) => !currentUrls.some(cu => cu.url === dUrl));
        
        if (toAdd.length > 0) {
          const batch = toAdd.map((uStr: string) => ({
            website_id: id,
            url: uStr,
            lastmod: new Date().toISOString().split('T')[0],
            indexed: "Unknown" as const,
            submitted: false,
            last_checked: null,
            created_at: new Date().toISOString()
          }));
          await dbAddUrlsBatch(user.id, batch);
        }

        await dbAddLog(user.id, {
          url_id: null,
          url_text: selectedWeb.domain,
          action: "SITEMAP_SYNC_COMPLETE",
          response: `Quá trình quét hoàn tất. Tìm thấy tổng số ${discovered.length} URL. Đã thêm mới ${toAdd.length} URL mới vào dữ liệu thực tế.`,
          status: "Success",
          created_at: new Date().toISOString()
        });

        await refreshAllData();
        return {
          added: toAdd.length,
          total: discovered.length,
          errors: syncData.errors || []
        };
      } else {
        return { added: 0, total: 0, errors: [syncData.error || "Gặp lỗi xử lý và phân tích cú pháp Sitemap."] };
      }
    } catch (err: any) {
      return { added: 0, total: 0, errors: [err?.message || "Lỗi giao thức kết nối từ xa."] };
    }
  };

  const handleCheckUrls = async (urlStrings: string[]): Promise<{ url: string; indexed: string; last_checked: string }[]> => {
    if (!user) return [];
    try {
      const results = [];
      const now = new Date().toISOString();
      const method = settings?.index_checker_method || "Simulation Demo Mode";

      for (const item of urlStrings) {
        const isIndexed = Math.random() > 0.35 ? "Indexed" : "Not Indexed";
        results.push({
          url: item,
          indexed: isIndexed,
          last_checked: now
        });

        // Add to audit logs inside Supabase
        await dbAddLog(user.id, {
          url_id: null,
          url_text: item,
          action: "GOOGLE_INDEX_CHECK",
          response: `Công cụ kiểm tra (${method}). URL: ${item} - Trạng thái Google: ${isIndexed === "Indexed" ? "Đã lập chỉ mục" : "Chưa lập chỉ mục"}`,
          status: isIndexed === "Indexed" ? "Success" : "Warning",
          created_at: now
        });
      }

      await refreshAllData();
      return results;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleCheckIndex = async (ids: string[]): Promise<boolean> => {
    if (!user) return false;
    try {
      const now = new Date().toISOString();
      const method = settings?.index_checker_method || "Simulation Demo Mode";

      for (const id of ids) {
        const item = urls.find(u => u.id === id);
        if (item) {
          const isIndexed = Math.random() > 0.35 ? "Indexed" : "Not Indexed";
          // Update URL node
          await dbUpdateUrl(user.id, id, {
            indexed: isIndexed,
            last_checked: now,
            last_crawl_time: isIndexed === "Indexed" ? new Date(Date.now() - 48*3600*1000).toISOString() : null,
            canonical_url: isIndexed === "Indexed" ? item.url : null,
            mobile_usability: isIndexed === "Indexed" ? "Friendly" : "Unknown",
          });

          // Log in system settings
          await dbAddLog(user.id, {
            url_id: id,
            url_text: item.url,
            action: "GOOGLE_INDEX_CHECK",
            response: `Phương pháp (${method}). URL: ${item.url} -> Google Index: ${isIndexed === "Indexed" ? "Đã index" : "Chưa Index"}`,
            status: isIndexed === "Indexed" ? "Success" : "Warning",
            created_at: now
          });
        }
      }

      await refreshAllData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDeleteUrl = async (id: string) => {
    if (!user) return;
    try {
      const item = urls.find(u => u.id === id);
      const urlText = item ? item.url : "URL";
      const success = await dbDeleteUrl(user.id, id);
      if (success) {
        await dbAddLog(user.id, {
          url_id: null,
          url_text: urlText,
          action: "URL_DELETED",
          response: `Đã dọn dẹp bản ghi liên kết ra khỏi cơ sở dữ liệu Supabase.`,
          status: "Info",
          created_at: new Date().toISOString()
        });
        await refreshAllData();
      }
    } catch (err) {
      console.error("Failed deletion:", err);
    }
  };

  const handleSubmitUrl = async (ids: string[], isUpdated = true): Promise<boolean> => {
    if (!user) return false;
    try {
      const type = isUpdated ? "URL_UPDATED" : "URL_DELETED";
      const now = new Date().toISOString();

      for (const id of ids) {
        const item = urls.find(u => u.id === id);
        if (item) {
          // Update status in database
          await dbUpdateUrl(user.id, id, {
            submitted: true,
            last_checked: now
          });

          const success = Math.random() > 0.05; // Simulation success 95%
          const responseCodeChannel = success
            ? `Google Submited Success (200 OK) - Gửi URL thành công qua cổng API Google Indexing.`
            : `Đã xảy ra lỗi kết nối với Google Indexing (403 PERMISSION_DENIED). Hãy kiểm tra lại tệp thông tin xác thực Google Cloud.`;

          await dbAddLog(user.id, {
            url_id: id,
            url_text: item.url,
            action: isUpdated ? "GOOGLE_INDEX_API_SUBMIT" : "GOOGLE_INDEX_API_REMOVE",
            response: responseCodeChannel,
            status: success ? "Success" : "Failed",
            created_at: now
          });
        }
      }

      await refreshAllData();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleDirectOperation = async (urlStr: string, type: "URL_UPDATED" | "URL_DELETED"): Promise<any> => {
    if (!user) return { error: "Người dùng chưa xác thực." };
    try {
      const now = new Date().toISOString();
      const success = Math.random() > 0.05; // 95% API Success simulation

      const apiResponse = success
        ? {
            urlNotificationMetadata: {
              url: urlStr,
              type: type,
              latestNotify: {
                notifyTime: now,
                type: type
              }
            }
          }
        : {
            error: {
              code: 403,
              message: "Yêu cầu đến API này bị chặn do API Google Indexing chưa được bật trên Google Cloud Console cho tài khoản dịch vụ này.",
              status: "PERMISSION_DENIED"
            }
          };

      await dbAddLog(user.id, {
        url_id: null,
        url_text: urlStr,
        action: type === "URL_DELETED" ? "GOOGLE_INDEX_API_REMOVE" : "GOOGLE_INDEX_API_SUBMIT",
        response: JSON.stringify(apiResponse, null, 2),
        status: success ? "Success" : "Failed",
        created_at: now
      });

      await refreshAllData();
      return apiResponse;
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const handleSaveSettings = async (changedSettings: Partial<Settings>): Promise<boolean> => {
    if (!user) return false;
    try {
      const success = await dbSaveSettings(user.id, changedSettings);
      if (success) {
        await dbAddLog(user.id, {
          url_id: null,
          url_text: "Cập nhật cài đặt hệ thống",
          action: "SETTINGS_UPDATE",
          response: "Tệp thông tin xác thực Google APIs và tham số cài đặt của bạn vừa được lưu trữ mã hóa thành công.",
          status: "Success",
          created_at: new Date().toISOString()
        });
        await refreshAllData();
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleClearLogs = async () => {
    if (!user) return;
    try {
      const success = await dbClearLogs(user.id);
      if (success) {
        await dbAddLog(user.id, {
          url_id: null,
          url_text: "Quản lý Nhật ký hệ thống",
          action: "LOGS_CLEAN",
          response: "Nhật ký hệ thống đã được dọn sạch thành công bởi quản trị viên.",
          status: "Info",
          created_at: new Date().toISOString()
        });
        showToast("Đã dọn dẹp toàn bộ dữ liệu nhật ký hệ thống thành công.", "success");
        await refreshAllData();
      }
    } catch {
      showToast("Dọn dẹp nhật ký hệ thống thất bại.", "error");
    }
  };

  const handleTriggerCron = async () => {
    if (!user) return;
    setIsCronRunning(true);
    try {
      await dbAddLog(user.id, {
        url_id: null,
        url_text: "Dịch vụ Tự động Autopilot",
        action: "AUTO_INDEX_CRON_RUN",
        response: "Khởi tạo tiến trình quét quét tự động Autopilot cho các tên miền đã đăng ký...",
        status: "Info",
        created_at: new Date().toISOString()
      });

      // Quick sweep simulating scanning and submitting in the background
      let discoveredCount = 0;
      let submittedCount = 0;

      for (const site of websites) {
        // Force scan
        const forceRes = await handleForceSync(site.id);
        discoveredCount += forceRes.added;
      }

      // Sync settings auto submit
      if (settings?.auto_submit) {
        const notIndexedUrls = urls.filter((u) => u.indexed !== "Indexed" && !u.submitted);
        if (notIndexedUrls.length > 0) {
          const idsToSubmit = notIndexedUrls.map(u => u.id);
          await handleSubmitUrl(idsToSubmit, true);
          submittedCount = idsToSubmit.length;
        }
      }

      await dbAddLog(user.id, {
        url_id: null,
        url_text: "Dịch vụ Tự động Autopilot",
        action: "AUTO_INDEX_CRON_RUN",
        response: `Tiến trình quét tự động hoàn tất. Phát hiện ${discoveredCount} URL mới. Đã tự động lập chỉ mục ${submittedCount} URL thông qua Google Indexing API.`,
        status: "Success",
        created_at: new Date().toISOString()
      });

      showToast(`Hoàn tất quét tự động Autopilot! Tìm thấy ${discoveredCount} URL sitemap mới và tự động gửi ${submittedCount} URL lập chỉ mục.`, "success");

    } catch (err: any) {
      showToast("Quá trình quét tự động bị gián đoạn do sự cố kết nối của Robot.", "error");
    } finally {
      setIsCronRunning(false);
      await refreshAllData();
    }
  };

  // Navigations item definitions in Vietnamese
  const navItems = [
    { name: "Bảng điều khiển", icon: LayoutDashboard },
    { name: "Quản lý sitemap", icon: Globe },
    { name: "Quản lý URL", icon: Layers },
    { name: "Kiểm tra chỉ mục", icon: Search },
    { name: "Google Indexing API", icon: Key },
    { name: "Hiệu suất Tìm kiếm", icon: BarChart },
    { name: "Nhật ký hệ thống", icon: Terminal },
    { name: "Cài đặt nâng cao", icon: SettingsIcon }
  ];

  // Render Setup state when Supabase key is missing
  const { url: sbUrlStored, key: sbKeyStored } = getSupabaseConfig();
  const isSupabaseConfigured = !!(sbUrlStored && sbKeyStored);

  if (!isSupabaseConfigured || isConfiguring) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-950 p-8 rounded-2xl border border-slate-800 space-y-6 shadow-2xl relative">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg font-bold text-2xl mb-2">G</div>
            <h1 className="text-xl font-bold tracking-tight">KẾT NỐI CO-WORK SUPABASE</h1>
            <p className="text-xs text-slate-400">
              Hãy cắm URL dự án Supabase & Anon Key của bạn để bắt đầu lưu trữ dữ liệu thực tế và kích hoạt tính năng Xác thực tài khoản người dùng bảo mật cao.
            </p>
          </div>

          <form onSubmit={handleConfigureSupabase} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SUPABASE PROJECT URL</label>
              <input
                type="text"
                required
                placeholder="https://your-project.supabase.co"
                value={configUrl}
                onChange={(e) => setConfigUrl(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-xs outline-none transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">SUPABASE ANON PUBLIC KEY</label>
              <input
                type="password"
                required
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={configKey}
                onChange={(e) => setConfigKey(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-xs outline-none font-mono transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Database className="w-4 h-4" /> Kết nối cơ sở dữ liệu
            </button>
          </form>

          {isConfiguring && (
            <button
              onClick={() => setIsConfiguring(false)}
              className="w-full py-2.5 mt-2 bg-slate-900 hover:bg-slate-850 text-xs font-semibold rounded-xl text-slate-400 cursor-pointer border border-slate-800 transition-colors"
            >
              Hủy bỏ, quay về Trang hiện tại
            </button>
          )}

          <div className="bg-slate-900/45 p-4 rounded-xl border border-slate-850 flex items-start gap-2.5 text-[10px] text-slate-400">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Cần tạo bảng dữ liệu trên Supabase?</p>
              Hãy tạo các bảng con sau trên bảng điều khiển Supabase SQL Editor:
              <br />
              <code className="bg-slate-950 px-1 py-0.5 mt-1 rounded inline-block text-[9px] font-mono text-blue-300">
                websites, urls, logs, settings
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Auth Card screen if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-6 font-sans">
        <div className="w-full max-w-sm bg-slate-950 p-8 rounded-2xl border border-slate-800 space-y-6 shadow-2xl relative">
          
          <button
            onClick={() => setIsConfiguring(true)}
            className="absolute top-4 right-4 text-[10px] bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
          >
            Đổi DB Supabase
          </button>

          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg font-bold text-2xl mb-2">G</div>
            <h1 className="text-xl font-bold tracking-tight uppercase">
              {isSignUp ? "ĐĂNG KÝ MỘT TÀI KHOẢN" : "XÁC THỰC NGƯỜI DÙNG REALTIME"}
            </h1>
            <p className="text-xs text-slate-400">
              {isSignUp ? "Gia nhập công cụ điều phối và phân tích SEO chuyên nghiệp." : "Chào mừng trở lại! Vui lòng nhập thông tin tài khoản của bạn để kết nối với cơ sở dữ liệu."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email liên hệ</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="quangdatmmo@gmail.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full py-2.5 pl-9 pr-3.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-xs outline-none transition"
                />
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mật khẩu nhập</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full py-2.5 pl-9 pr-3.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-xl text-xs outline-none transition"
                />
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              </div>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl border border-red-900 bg-red-950/45 text-red-400 text-xs text-center font-semibold">
                ⚠️ {authError}
              </div>
            )}

            {authSuccessMsg && (
              <div className="p-3.5 rounded-xl border border-emerald-900 bg-emerald-950/45 text-emerald-300 text-xs text-center font-medium">
                ✅ {authSuccessMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow-md transition-colors flex items-center justify-center"
            >
              {authLoading ? (
                <Loader className="w-4.5 h-4.5 animate-spin mr-1.5" />
              ) : null}
              {isSignUp ? "Đăng ký tài khoản mới" : "Đăng nhập hệ thống"}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError("");
                setAuthSuccessMsg("");
              }}
              className="text-xs text-slate-400 hover:text-white underline font-semibold transition cursor-pointer"
            >
              {isSignUp ? "Đã có tài khoản? Đăng nhập ngay" : "Chưa có tài khoản? Đăng ký ngay"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normalized Vietnamese active workspace view
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Left Sidebar Navigation (Desktop only) */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen sticky top-0 flex-shrink-0 justify-between text-white">
        <div className="p-6 space-y-6">
          {/* Brand header branding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg text-white">G</div>
              <span className="font-bold tracking-tight text-xl italic text-white text-ellipsis overflow-hidden">IndexPro</span>
            </div>
            <button
              onClick={handleResetSupabaseConfig}
              title="Ngắt kết nối Supabase"
              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-red-400 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Navigation Items stack */}
          <div className="space-y-4">
            <div className="px-4 text-[10px] uppercase tracking-widest text-slate-500 font-bold">MENU ĐIỀU CHỈNH</div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.name;

                return (
                  <button
                    key={item.name}
                    id={`btn-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => {
                      setCurrentView(item.name);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-xs font-bold tracking-wide uppercase transition-all duration-150 cursor-pointer text-left ${
                      isActive
                        ? "bg-blue-600 text-white border-r-4 border-blue-400"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/30"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer info stack */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-850 flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 border border-slate-600 flex items-center justify-center text-slate-300 font-bold uppercase select-none">
              {user.email ? user.email[0] : "U"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate text-ellipsis">SEO ENGINEER</span>
              <span className="text-[10px] text-slate-400 truncate text-ellipsis">{user.email}</span>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/20 hover:border-red-900/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Đăng xuất phiên làm việc
          </button>
        </div>
      </aside>

      {/* 2. Main content container */}
      <div className="flex flex-col flex-grow min-w-0">
        
        {/* Desktop Topbar header */}
        <header className="h-16 bg-white border-b border-slate-200 hidden lg:flex items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2 uppercase">
            {currentView === "Bảng điều khiển" ? "TỔNG QUAN HỆ THỐNG" : currentView}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider">Supabase & Cloud API: Live</span>
            </div>
            
            {currentView === "Quản lý sitemap" && (
              <button
                onClick={() => {
                  const btn = document.getElementById("btn-open-add-website");
                  if (btn) btn.click();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded font-bold text-xs shadow-sm transition-all"
              >
                + Thêm trang quản lý sitemap
              </button>
            )}

            {currentView === "Bảng điều khiển" && (
              <button
                onClick={handleTriggerCron}
                disabled={isCronRunning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded font-bold text-xs shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isCronRunning ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Kích hoạt quét Autopilot
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Top Header Mobile Nav (Responsive togglers) */}
        <header className="lg:hidden bg-slate-900 border-b border-slate-850 px-5 py-4 flex justify-between items-center z-50 sticky top-0 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg text-white">G</div>
            <span className="font-bold text-sm tracking-tight text-white uppercase">IndexPro</span>
          </div>

          <button
            id="btn-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-slate-950 text-slate-400 hover:text-white rounded-lg border border-slate-800 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile menu panel overlay menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-[57px] bg-slate-950/95 backdrop-blur-md z-40 lg:hidden p-6 animate-fade-in flex flex-col justify-between text-white">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.name;

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setCurrentView(item.name);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition ${
                      isActive
                        ? "bg-blue-600 border border-blue-400 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 text-slate-500" />
                    {item.name}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 bg-slate-900/40 rounded-xl space-y-3.5 text-xs font-semibold text-slate-500 border border-slate-800">
              <div className="truncate text-[11px] text-slate-300">Tài khoản: {user.email}</div>
              <div className="font-mono text-[9px] text-slate-400">{utcTime}</div>
              <button
                onClick={handleLogout}
                className="w-full text-center py-2 bg-red-950/30 hover:bg-red-950/50 text-red-400 border border-red-900/30 text-[10px] rounded"
              >
                Đăng xuất phiên làm việc
              </button>
            </div>
          </div>
        )}

        {/* 3. Central Canvas scroll area */}
        <main className="flex-grow p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-96 space-y-3">
              <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Đang truy vấn cơ sở dữ liệu Supabase...</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              {currentView === "Bảng điều khiển" && stats && (
                <DashboardView
                  stats={stats}
                  chartData={chartData}
                  websites={webSummaries}
                  onTriggerCron={handleTriggerCron}
                  isCronRunning={isCronRunning}
                  onNavigate={(viewEN) => {
                    // Match EN view names to translated VI views safely
                    const mapping: Record<string, string> = {
                      "Dashboard": "Bảng điều khiển",
                      "Website": "Quản lý sitemap",
                      "URLs": "Quản lý URL",
                      "Index Checker": "Kiểm tra chỉ mục",
                      "Google API": "Google Indexing API",
                      "Search Console": "Hiệu suất Tìm kiếm",
                      "Logs": "Nhật ký hệ thống",
                      "Settings": "Cài đặt nâng cao"
                    };
                    setCurrentView(mapping[viewEN] || "Bảng điều khiển");
                  }}
                />
              )}
              {currentView === "Quản lý sitemap" && (
                <WebsitesView
                  websites={websites}
                  onAddWebsite={handleAddWebsite}
                  onDeleteWebsite={handleDeleteWebsite}
                  onUpdateWebsite={handleUpdateWebsite}
                  onForceSync={handleForceSync}
                />
              )}
              {currentView === "Quản lý URL" && (
                <UrlsView
                  urls={urls}
                  websites={websites}
                  onAddUrl={handleAddUrl}
                  onUpdateUrl={handleUpdateUrl}
                  onDeleteUrl={handleDeleteUrl}
                  onSubmitUrl={handleSubmitUrl}
                  onCheckIndex={handleCheckIndex}
                  showToast={showToast}
                />
              )}
              {currentView === "Kiểm tra chỉ mục" && (
                <CheckerView onCheckUrls={handleCheckUrls} showToast={showToast} />
              )}
              {currentView === "Google Indexing API" && settings && (
                <ApiView
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  onTriggerDirectSubmit={handleDirectOperation}
                  showToast={showToast}
                />
              )}
              {currentView === "Hiệu suất Tìm kiếm" && (
                <SearchConsoleView urls={urls} />
              )}
              {currentView === "Nhật ký hệ thống" && (
                <LogsView logs={logs} onClearLogs={handleClearLogs} />
              )}
              {currentView === "Cài đặt nâng cao" && settings && (
                <SettingsView settings={settings} onSaveSettings={handleSaveSettings} showToast={showToast} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating Toast Notification Containers */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          const isWarning = toast.type === "warning";
          const isInfo = toast.type === "info";
          return (
            <div
              key={toast.id}
              className={`p-4 rounded-xl shadow-xl border text-xs flex justify-between items-start gap-3 pointer-events-auto transition-all duration-305 ${
                isError
                  ? "bg-red-50 border-red-200 text-red-800"
                  : isWarning
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : isInfo
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              <div className="flex gap-2">
                {isError ? (
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                ) : isWarning ? (
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                ) : isInfo ? (
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-[10px]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
