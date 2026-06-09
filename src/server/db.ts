/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { Website, UrlItem, LogItem, Settings, DashboardStats } from "../types";

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

interface DatabaseSchema {
  websites: Website[];
  urls: UrlItem[];
  logs: LogItem[];
  settings: Settings;
}

const DEFAULT_SETTINGS: Settings = {
  client_email: "indexing-manager@search-console-pro.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDhS4dZ2kPr...\n-----END PRIVATE KEY-----",
  project_id: "google-indexing-pro-41220",
  auto_submit: true,
  cron_interval: "1h",
  email_notifications: true,
  notification_email: "quangdatmmo@gmail.com",
  index_checker_method: "Simulation Demo Mode",
  use_demo_data: true,
};

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

export function loadDb(): DatabaseSchema {
  ensureDbDir();
  if (!fs.existsSync(DB_FILE)) {
    const freshDb = createDemoDb();
    saveDb(freshDb);
    return freshDb;
  }
  try {
    const content = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(content) as DatabaseSchema;
  } catch (error) {
    console.error("Failed to read DB file, recreating default system:", error);
    const freshDb = createDemoDb();
    saveDb(freshDb);
    return freshDb;
  }
}

export function saveDb(db: DatabaseSchema) {
  ensureDbDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function createDemoDb(): DatabaseSchema {
  const websites: Website[] = [
    {
      id: "web-1",
      domain: "saasgrowthblog.com",
      name: "SaaS Growth Blog",
      sitemap_url: "https://saasgrowthblog.com/sitemap.xml",
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      id: "web-2",
      domain: "techdevnotes.io",
      name: "Tech Dev Notes",
      sitemap_url: "https://techdevnotes.io/sitemap-index.xml",
      created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    }
  ];

  const urls: UrlItem[] = [
    // Website 1 Urls
    {
      id: "url-1-1",
      website_id: "web-1",
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
      id: "url-1-2",
      website_id: "web-1",
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
      id: "url-1-3",
      website_id: "web-1",
      url: "https://saasgrowthblog.com/indexing-api-vs-sitemaps-comparison",
      lastmod: "2026-06-05",
      indexed: "Not Indexed",
      submitted: true,
      last_checked: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
      last_crawl_time: null,
      canonical_url: null,
      mobile_usability: "Unknown",
      rich_results: null,
      clicks: 0,
      impressions: 12,
      ctr: 0,
      position: 89.1
    },
    {
      id: "url-1-4",
      website_id: "web-1",
      url: "https://saasgrowthblog.com/case-study-from-0-to-100k-monthly-traffic",
      lastmod: "2026-06-07",
      indexed: "Unknown",
      submitted: false,
      last_checked: null,
      created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    },
    {
      id: "url-1-5",
      website_id: "web-1",
      url: "https://saasgrowthblog.com/b2b-customer-acquisition-strategies-checklist",
      lastmod: "2026-06-08",
      indexed: "Not Indexed",
      submitted: false,
      last_checked: new Date().toISOString(),
      created_at: new Date().toISOString(),
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    },

    // Website 2 Urls
    {
      id: "url-2-1",
      website_id: "web-2",
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
      id: "url-2-2",
      website_id: "web-2",
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
    },
    {
      id: "url-2-3",
      website_id: "web-2",
      url: "https://techdevnotes.io/mastering-drizzle-orm-with-postgresql-guide",
      lastmod: "2026-06-02",
      indexed: "Not Indexed",
      submitted: false,
      last_checked: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
      last_crawl_time: null,
      canonical_url: null,
      mobile_usability: "Unknown",
      rich_results: null,
      clicks: 0,
      impressions: 4,
      ctr: 0,
      position: 112.4
    },
    {
      id: "url-2-4",
      website_id: "web-2",
      url: "https://techdevnotes.io/building-efficient-grpc-apis-in-typescript-with-details",
      lastmod: "2026-06-08",
      indexed: "Unknown",
      submitted: false,
      last_checked: null,
      created_at: new Date().toISOString(),
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0
    }
  ];

  const logs: LogItem[] = [
    {
      id: "log-1",
      url_id: "url-1-1",
      url_text: "https://saasgrowthblog.com/",
      action: "GOOGLE_INDEX_CHECK",
      response: "Checked via Inspection API: URL is Indexed on Google.",
      status: "Success",
      created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
    {
      id: "log-2",
      url_id: "url-1-2",
      url_text: "https://saasgrowthblog.com/organic-seo-playbook-2026",
      action: "GOOGLE_INDEX_CHECK",
      response: "Checked via Search Console sync. Crawford on Jun 3. Indexed.",
      status: "Success",
      created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: "log-3",
      url_id: "url-1-3",
      url_text: "https://saasgrowthblog.com/indexing-api-vs-sitemaps-comparison",
      action: "GOOGLE_INDEX_API_SUBMIT",
      response: "Submitted URL to Indexing API successfully. Type: URL_UPDATED.",
      status: "Success",
      created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    },
    {
      id: "log-4",
      url_id: "url-1-3",
      url_text: "https://saasgrowthblog.com/indexing-api-vs-sitemaps-comparison",
      action: "GOOGLE_INDEX_CHECK",
      response: "Checked via Search Console Inspector. Detected: Not Indexed (Crawled - currently not indexed).",
      status: "Warning",
      created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    },
    {
      id: "log-5",
      url_id: null,
      url_text: "System Cron Service",
      action: "AUTO_INDEX_CRON_RUN",
      response: "Sitemap sync job executed. 2 websites processed. 1 new URL discovered on saasgrowthblog.com.",
      status: "Info",
      created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    }
  ];

  return {
    websites,
    urls,
    logs,
    settings: DEFAULT_SETTINGS,
  };
}

export function getStats(): DashboardStats {
  const db = loadDb();
  const total_websites = db.websites.length;
  const total_urls = db.urls.length;
  const url_indexed = db.urls.filter((u) => u.indexed === "Indexed").length;
  const url_not_indexed = db.urls.filter((u) => u.indexed === "Not Indexed").length;
  const url_unknown = db.urls.filter((u) => u.indexed === "Unknown").length;
  const url_submitted = db.urls.filter((u) => u.submitted).length;
  
  const index_rate = total_urls > 0 ? Math.round((url_indexed / total_urls) * 100) : 0;

  return {
    total_websites,
    total_urls,
    url_indexed,
    url_not_indexed,
    url_unknown,
    url_submitted,
    index_rate,
  };
}
