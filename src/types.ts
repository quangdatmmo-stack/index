/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Website {
  id: string;
  domain: string;
  name: string;
  sitemap_url: string;
  created_at: string;
}

export interface UrlItem {
  id: string;
  website_id: string;
  url: string;
  lastmod: string | null;
  indexed: "Indexed" | "Not Indexed" | "Unknown";
  submitted: boolean;
  last_checked: string | null;
  created_at: string;
  
  // URL Inspection detailed metadata
  last_crawl_time?: string | null;
  canonical_url?: string | null;
  mobile_usability?: "Friendly" | "Not Friendly" | "Unknown";
  rich_results?: string | null;
  indexed_count_or_status?: string;

  // Search Console metrics
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

export interface LogItem {
  id: string;
  url_id: string | null;
  url_text: string;
  action: string;
  response: string;
  status: "Success" | "Failed" | "Warning" | "Info";
  created_at: string;
}

export interface Settings {
  client_email: string;
  private_key: string;
  project_id: string;
  auto_submit: boolean;
  cron_interval: "30m" | "1h" | "6h" | "1d";
  email_notifications: boolean;
  notification_email: string;
  
  // Custom helper field to control simulations if credentials are empty/mocked
  index_checker_method: "Inspection API" | "Site Search Query" | "Simulation Demo Mode";
  use_demo_data: boolean;
}

export interface DashboardStats {
  total_websites: number;
  total_urls: number;
  url_indexed: number;
  url_not_indexed: number;
  url_unknown: number;
  url_submitted: number;
  index_rate: number;
}
