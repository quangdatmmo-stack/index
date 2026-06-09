import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Website, UrlItem, LogItem, Settings, DashboardStats } from "../types";

// Key configurations
export const getSupabaseConfig = () => {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://kxufxxoyknighwfybxlm.supabase.co";
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4dWZ4eG95a25pZ2h3ZnlieGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5Mjk0MzYsImV4cCI6MjA5NjUwNTQzNn0.Qep1TY3W-gyj0tFRp-f54hcqPylbguNC1YOvFWUEskI";

  const localUrl = localStorage.getItem("GP_SUPABASE_URL") || "";
  const localKey = localStorage.getItem("GP_SUPABASE_ANON_KEY") || "";

  const finalUrl = envUrl || localUrl || "";
  const finalKey = envKey || localKey || "";

  return {
    url: finalUrl,
    key: finalKey,
    isFromEnv: !!(envUrl && envKey),
  };
};

export const saveSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem("GP_SUPABASE_URL", url.trim());
  localStorage.setItem("GP_SUPABASE_ANON_KEY", key.trim());
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem("GP_SUPABASE_URL");
  localStorage.removeItem("GP_SUPABASE_ANON_KEY");
};

let cachedClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    cachedClient = null;
    return null;
  }
  if (cachedClient && (cachedClient as any).supabaseUrl === url) {
    return cachedClient;
  }
  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error("Supabase creation error:", err);
    return null;
  }
};

// Seeding standard starter data
export const seedSupabaseData = async (userId: string) => {
  const sb = getSupabase();
  if (!sb) return;

  try {
    // Check if websites exist
    const { data: webData } = await sb.from("websites").select("id").limit(1);
    if (webData && webData.length > 0) return; // Already initialized

    const websites: (Omit<Website, "id"> & { id?: string; user_id: string })[] = [
      {
        user_id: userId,
        domain: "saasgrowthblog.com",
        name: "SaaS Growth Blog",
        sitemap_url: "https://saasgrowthblog.com/sitemap.xml",
        created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      },
      {
        user_id: userId,
        domain: "techdevnotes.io",
        name: "Tech Dev Notes",
        sitemap_url: "https://techdevnotes.io/sitemap-index.xml",
        created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      }
    ];

    const { data: insertedWebs } = await sb.from("websites").insert(websites).select();
    if (!insertedWebs || insertedWebs.length === 0) return;

    const web1 = insertedWebs.find(w => w.domain === "saasgrowthblog.com");
    const web2 = insertedWebs.find(w => w.domain === "techdevnotes.io");

    if (web1) {
      const urls1 = [
        {
          user_id: userId,
          website_id: web1.id,
          url: "https://saasgrowthblog.com/",
          lastmod: new Date().toISOString().split('T')[0],
          indexed: "Indexed",
          submitted: true,
          last_checked: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
          created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
          last_crawl_time: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
          canonical_url: "https://saasgrowthblog.com/",
          mobile_usability: "Friendly",
          rich_results: "Detected (Breadcrumbs, FAQ Schema)",
          clicks: 1450,
          impressions: 25800,
          ctr: 5.62,
          position: 4.2
        },
        {
          user_id: userId,
          website_id: web1.id,
          url: "https://saasgrowthblog.com/organic-seo-playbook-2026",
          lastmod: "2026-06-01",
          indexed: "Indexed",
          submitted: true,
          last_checked: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
          created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
          last_crawl_time: "2026-06-03T05:12:10Z",
          canonical_url: "https://saasgrowthblog.com/organic-seo-playbook-2026",
          mobile_usability: "Friendly",
          rich_results: "Detected (Article)",
          clicks: 420,
          impressions: 8900,
          ctr: 4.72,
          position: 8.4
        },
        {
          user_id: userId,
          website_id: web1.id,
          url: "https://saasgrowthblog.com/indexing-api-vs-sitemaps-comparison",
          lastmod: "2026-06-05",
          indexed: "Not Indexed",
          submitted: true,
          last_checked: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
          created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
          clicks: 0,
          impressions: 12,
          ctr: 0,
          position: 89.1
        }
      ];
      await sb.from("urls").insert(urls1);
    }

    if (web2) {
      const urls2 = [
        {
          user_id: userId,
          website_id: web2.id,
          url: "https://techdevnotes.io/",
          lastmod: "2026-05-20",
          indexed: "Indexed",
          submitted: true,
          last_checked: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
          created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
          last_crawl_time: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          canonical_url: "https://techdevnotes.io/",
          mobile_usability: "Friendly",
          rich_results: "Detected (Organization)",
          clicks: 860,
          impressions: 15400,
          ctr: 5.58,
          position: 3.1
        },
        {
          user_id: userId,
          website_id: web2.id,
          url: "https://techdevnotes.io/nextjs-16-fullstack-boilerplates-review",
          lastmod: "2026-05-25",
          indexed: "Indexed",
          submitted: true,
          last_checked: new Date(Date.now() - 11 * 3600 * 1000).toISOString(),
          created_at: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
          last_crawl_time: "2026-05-27T08:14:55Z",
          canonical_url: "https://techdevnotes.io/nextjs-16-fullstack-boilerplates-review",
          mobile_usability: "Friendly",
          rich_results: "Detected (Article)",
          clicks: 180,
          impressions: 4320,
          ctr: 4.17,
          position: 12.3
        }
      ];
      await sb.from("urls").insert(urls2);
    }

    // Default settings
    const settings = {
      user_id: userId,
      client_email: "indexing-manager@search-console-pro.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDhS4dZ2kPr...\n-----END PRIVATE KEY-----",
      project_id: "google-indexing-pro-41220",
      auto_submit: true,
      cron_interval: "1h",
      email_notifications: true,
      notification_email: "quangdatmmo@gmail.com",
      index_checker_method: "Simulation Demo Mode",
      use_demo_data: false,
    };
    await sb.from("settings").insert([settings]);

    // Initial log
    const initialLog: Omit<LogItem, "id"> & { user_id: string } = {
      user_id: userId,
      url_id: null,
      url_text: "Hệ thống Supabase",
      action: "SUPABASE_INIT",
      response: "Cơ sở dữ liệu Supabase được kết nối và đồng bộ hóa thành công.",
      status: "Success",
      created_at: new Date().toISOString()
    };
    await sb.from("logs").insert([initialLog]);

  } catch (err) {
    console.error("Seeding data failed:", err);
  }
};

// Database CRUD Actions targeting Supabase directly for persistent user storage

export const dbFetchWebsites = async (userId: string): Promise<Website[]> => {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("websites").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) {
    console.error("fetch websites error:", error);
    return [];
  }
  return data || [];
};

export const dbAddWebsite = async (userId: string, name: string, domain: string, sitemapUrl: string): Promise<Website | null> => {
  const sb = getSupabase();
  if (!sb) return null;
  const newWeb = {
    user_id: userId,
    name,
    domain,
    sitemap_url: sitemapUrl,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from("websites").insert([newWeb]).select();
  if (error || !data) {
    console.error("add website error:", error);
    return null;
  }
  return data[0] as Website;
};

export const dbDeleteWebsite = async (userId: string, id: string): Promise<boolean> => {
  const sb = getSupabase();
  if (!sb) return false;
  // First delete associated URLs
  await sb.from("urls").delete().eq("user_id", userId).eq("website_id", id);
  // Then delete website
  const { error } = await sb.from("websites").delete().eq("user_id", userId).eq("id", id);
  return !error;
};

export const dbUpdateWebsite = async (userId: string, id: string, updates: Partial<Website>): Promise<boolean> => {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("websites").update(updates).eq("user_id", userId).eq("id", id);
  return !error;
};

export const dbFetchUrls = async (userId: string, websiteId?: string): Promise<UrlItem[]> => {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from("urls").select("*").eq("user_id", userId);
  if (websiteId) {
    query = query.eq("website_id", websiteId);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    console.error("fetch urls error:", error);
    return [];
  }
  return data || [];
};

export const dbAddUrl = async (userId: string, websiteId: string, url: string, lastmod?: string, indexed: "Indexed" | "Not Indexed" | "Unknown" = "Unknown"): Promise<UrlItem | null> => {
  const sb = getSupabase();
  if (!sb) return null;
  const newUrl = {
    user_id: userId,
    website_id: websiteId,
    url: url.trim(),
    lastmod: lastmod || new Date().toISOString().split('T')[0],
    indexed,
    submitted: false,
    last_checked: null,
    created_at: new Date().toISOString()
  };
  const { data, error } = await sb.from("urls").insert([newUrl]).select();
  if (error || !data) {
    console.error("add url error:", error);
    return null;
  }
  return data[0] as UrlItem;
};

export const dbAddUrlsBatch = async (userId: string, urls: Omit<UrlItem, "id">[]): Promise<boolean> => {
  const sb = getSupabase();
  if (!sb) return false;
  const withUser = urls.map(u => ({ ...u, user_id: userId }));
  const { error } = await sb.from("urls").insert(withUser);
  return !error;
};

export const dbDeleteUrl = async (userId: string, id: string): Promise<boolean> => {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("urls").delete().eq("user_id", userId).eq("id", id);
  return !error;
};

export const dbUpdateUrl = async (userId: string, id: string, updates: Partial<UrlItem>): Promise<boolean> => {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("urls").update(updates).eq("user_id", userId).eq("id", id);
  return !error;
};

export const dbFetchLogs = async (userId: string): Promise<LogItem[]> => {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) {
    console.error("fetch logs error:", error);
    return [];
  }
  return data || [];
};

export const dbAddLog = async (userId: string, log: Omit<LogItem, "id">): Promise<boolean> => {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("logs").insert([{ ...log, user_id: userId }]);
  return !error;
};

export const dbClearLogs = async (userId: string): Promise<boolean> => {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("logs").delete().eq("user_id", userId);
  return !error;
};

export const dbFetchSettings = async (userId: string): Promise<Settings | null> => {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("fetch settings error:", error);
    return null;
  }
  return data as Settings;
};

export const dbSaveSettings = async (userId: string, settings: Partial<Settings>): Promise<boolean> => {
  const sb = getSupabase();
  if (!sb) return false;
  const { data: existing } = await sb.from("settings").select("user_id").eq("user_id", userId).maybeSingle();
  if (existing) {
    const { error } = await sb.from("settings").update(settings).eq("user_id", userId);
    return !error;
  } else {
    const { error } = await sb.from("settings").insert([{ ...settings, user_id: userId }]);
    return !error;
  }
};
