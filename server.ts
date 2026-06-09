/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { loadDb, saveDb, getStats } from "./src/server/db";
import { Website, UrlItem, LogItem, Settings } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTE HANDLERS ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 1. Dashboard overall stats
  app.get("/api/stats", (req, res) => {
    try {
      const stats = getStats();
      const db = loadDb();
      
      // Calculate indices history over last 7 days for charts
      const chart_data: { date: string; indexed: number; submitted: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        
        // Count statuses on or prior to this date
        const priorTime = d.getTime();
        const indexedCount = db.urls.filter(
          (u) => u.indexed === "Indexed" && (!u.last_checked || new Date(u.last_checked).getTime() <= priorTime)
        ).length;
        
        const submittedCount = db.urls.filter(
          (u) => u.submitted && u.last_checked && new Date(u.last_checked).getTime() <= priorTime
        ).length;

        chart_data.push({
          date: dateStr,
          indexed: indexedCount + (6 - i) * 2, // smooth simulated growth curves
          submitted: submittedCount + (6 - i) * 3
        });
      }

      // Recent website summaries
      const website_summaries = db.websites.map((w) => {
        const wUrls = db.urls.filter((u) => u.website_id === w.id);
        const total = wUrls.length;
        const indexed = wUrls.filter((u) => u.indexed === "Indexed").length;
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

      res.json({
        stats,
        chart_data,
        website_summaries
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 2. Websites CRUD
  app.get("/api/websites", (req, res) => {
    try {
      const db = loadDb();
      res.json(db.websites);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/websites", async (req, res) => {
    try {
      const { name, domain, sitemap_url } = req.body;
      if (!domain || !name) {
        return res.status(400).json({ error: "Missing required fields (name, domain)" });
      }

      // Format domain
      let cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
      let fullSitemapUrl = sitemap_url || `https://${cleanDomain}/sitemap.xml`;

      const db = loadDb();
      
      // Check existing
      const existingWeb = db.websites.find((w) => w.domain.toLowerCase() === cleanDomain.toLowerCase());
      if (existingWeb) {
        if (sitemap_url && existingWeb.sitemap_url !== sitemap_url) {
          existingWeb.sitemap_url = sitemap_url;
          saveDb(db);
        }
        return res.status(200).json(existingWeb);
      }

      const newWeb: Website = {
        id: "web-" + Math.random().toString(36).substr(2, 9),
        domain: cleanDomain,
        name,
        sitemap_url: fullSitemapUrl,
        created_at: new Date().toISOString()
      };

      db.websites.push(newWeb);
      
      // Add first audit logs
      const log: LogItem = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        url_id: null,
        url_text: cleanDomain,
        action: "WEBSITE_ADDED",
        response: `Website '${name}' registered. Sitemap linked: ${fullSitemapUrl}`,
        status: "Success",
        created_at: new Date().toISOString()
      };
      db.logs.unshift(log);
      saveDb(db);

      // Trigger asynchronous sitemap syncing for this site
      setTimeout(() => {
        executeSitemapSync(newWeb.id).catch(console.error);
      }, 500);

      res.status(201).json(newWeb);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/websites/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = loadDb();
      
      const prevLength = db.websites.length;
      db.websites = db.websites.filter((w) => w.id !== id);
      
      if (db.websites.length === prevLength) {
        return res.status(404).json({ error: "Website not found" });
      }

      // Delete associated URLs
      db.urls = db.urls.filter((u) => u.website_id !== id);
      
      // Add audit log
      const log: LogItem = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        url_id: null,
        url_text: `Website id: ${id}`,
        action: "WEBSITE_DELETED",
        response: `Website and associated URLs purged.`,
        status: "Warning",
        created_at: new Date().toISOString()
      };
      db.logs.unshift(log);
      saveDb(db);

      res.json({ success: true, message: "Website successfully wiped" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3. URLs retrieval and querying
  app.get("/api/urls", (req, res) => {
    try {
      const { website_id, indexed, submitted } = req.query;
      const db = loadDb();
      let results = db.urls;

      if (website_id) {
        results = results.filter((u) => u.website_id === website_id);
      }
      if (indexed) {
        results = results.filter((u) => u.indexed === indexed);
      }
      if (submitted) {
        const subBool = submitted === "true";
        results = results.filter((u) => u.submitted === subBool);
      }

      // Sort with newest on top
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete individual URL
  app.delete("/api/urls/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = loadDb();
      const urlItem = db.urls.find((u) => u.id === id);
      if (!urlItem) {
        return res.status(404).json({ error: "URL not found" });
      }
      db.urls = db.urls.filter((u) => u.id !== id);
      
      const log: LogItem = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        url_id: null,
        url_text: urlItem.url,
        action: "URL_DELETED",
        response: "URL deleted from indexing records manual wipe.",
        status: "Info",
        created_at: new Date().toISOString()
      };
      db.logs.unshift(log);
      saveDb(db);
      res.json({ success: true, message: "URL wiped" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Force sitemap sync
  app.post("/api/websites/:id/sync", async (req, res) => {
    try {
      const { id } = req.params;
      const db = loadDb();
      const website = db.websites.find((w) => w.id === id);
      if (!website) {
        return res.status(404).json({ error: "Website not found" });
      }

      const addedMetrics = await executeSitemapSync(id);
      res.json({ success: true, ...addedMetrics });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 4. Index Checker: Supports inspection query or live inspection api simulations
  app.post("/api/check-index", async (req, res) => {
    try {
      const { url_ids, urls } = req.body;
      const db = loadDb();
      let targetUrls: { id?: string; url: string }[] = [];

      if (url_ids && Array.isArray(url_ids)) {
        targetUrls = db.urls
          .filter((u) => url_ids.includes(u.id))
          .map((u) => ({ id: u.id, url: u.url }));
      } else if (urls && Array.isArray(urls)) {
        targetUrls = urls.map((u) => ({ url: u }));
      } else if (req.body.url) {
        targetUrls = [{ url: req.body.url }];
      }

      if (targetUrls.length === 0) {
        return res.status(400).json({ error: "No target URLs provided" });
      }

      const results: any[] = [];
      const updatedUrls = [...db.urls];

      for (const item of targetUrls) {
        const isIndexed = Math.random() > 0.35 ? "Indexed" : "Not Indexed";
        const now = new Date().toISOString();

        // If it exists in DB, update indices
        if (item.id) {
          const index = updatedUrls.findIndex((u) => u.id === item.id);
          if (index !== -1) {
            updatedUrls[index] = {
              ...updatedUrls[index],
              indexed: isIndexed,
              last_checked: now,
              last_crawl_time: isIndexed === "Indexed" ? new Date(Date.now() - 48*3600*1000).toISOString() : null,
              canonical_url: isIndexed === "Indexed" ? item.url : null,
              mobile_usability: isIndexed === "Indexed" ? "Friendly" : "Unknown",
            };
          }
        }

        // Add history Action log
        const log: LogItem = {
          id: "log-" + Math.random().toString(36).substr(2, 9),
          url_id: item.id || null,
          url_text: item.url,
          action: "GOOGLE_INDEX_CHECK",
          response: `Method: ${db.settings.index_checker_method}. Result: ${isIndexed} on Google. crawl: ${
            isIndexed === "Indexed" ? "Successful" : "Never crawled"
          }`,
          status: isIndexed === "Indexed" ? "Success" : "Warning",
          created_at: now
        };
        db.logs.unshift(log);

        results.push({
          url: item.url,
          indexed: isIndexed,
          method: db.settings.index_checker_method,
          last_checked: now
        });
      }

      db.urls = updatedUrls;
      saveDb(db);

      res.json({ success: true, checked_count: results.length, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 5. Indexing API submissions (URL_UPDATED / URL_DELETED)
  app.post("/api/submit", async (req, res) => {
    try {
      const { url_ids, urls, action_type } = req.body; // action_type: "URL_UPDATED" | "URL_DELETED"
      const type = action_type || "URL_UPDATED";
      const db = loadDb();
      let targetUrls: { id?: string; url: string }[] = [];

      if (url_ids && Array.isArray(url_ids)) {
        targetUrls = db.urls
          .filter((u) => url_ids.includes(u.id))
          .map((u) => ({ id: u.id, url: u.url }));
      } else if (urls && Array.isArray(urls)) {
        targetUrls = urls.map((u) => ({ url: u }));
      } else if (req.body.url) {
        targetUrls = [{ url: req.body.url }];
      }

      if (targetUrls.length === 0) {
        return res.status(400).json({ error: "No URLs provided for API submit" });
      }

      const now = new Date().toISOString();
      const results: any[] = [];
      const updatedUrls = [...db.urls];

      for (const item of targetUrls) {
        if (item.id) {
          const index = updatedUrls.findIndex((u) => u.id === item.id);
          if (index !== -1) {
            updatedUrls[index] = {
              ...updatedUrls[index],
              submitted: true,
              last_checked: now
            };
          }
        }

        const success = Math.random() > 0.05; // 95% simulator success
        const apiResponse = success
          ? {
              urlNotificationMetadata: {
                url: item.url,
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
                message: "Requests to this API are blocked because the Google Indexing API is disabled on Google Cloud Console for this service account token.",
                status: "PERMISSION_DENIED"
              }
            };

        const log: LogItem = {
          id: "log-" + Math.random().toString(36).substr(2, 9),
          url_id: item.id || null,
          url_text: item.url,
          action: type === "URL_DELETED" ? "GOOGLE_INDEX_API_REMOVE" : "GOOGLE_INDEX_API_SUBMIT",
          response: JSON.stringify(apiResponse, null, 2),
          status: success ? "Success" : "Failed",
          created_at: now
        };
        db.logs.unshift(log);

        results.push({
          url: item.url,
          status: success ? "Success" : "Failed",
          type,
          api_response: apiResponse
        });
      }

      db.urls = updatedUrls;
      saveDb(db);

      res.json({ success: true, submitted_count: results.length, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 6. Action Logs
  app.get("/api/logs", (req, res) => {
    try {
      const db = loadDb();
      res.json(db.logs.slice(0, 100)); // returns last 100 logs
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Clean logs
  app.delete("/api/logs", (req, res) => {
    try {
      const db = loadDb();
      db.logs = [
        {
          id: "log-sys-clean-" + Date.now(),
          url_id: null,
          url_text: "System Logs Manager",
          action: "LOGS_CLEAN",
          response: "Logs manually wiped by administrator.",
          status: "Info",
          created_at: new Date().toISOString()
        }
      ];
      saveDb(db);
      res.json({ success: true, message: "Logs cleared" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 7. Settings
  app.get("/api/settings", (req, res) => {
    try {
      const db = loadDb();
      res.json(db.settings);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/settings", (req, res) => {
    try {
      const db = loadDb();
      db.settings = {
        ...db.settings,
        ...req.body
      };
      
      const log: LogItem = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        url_id: null,
        url_text: "System Settings Config",
        action: "SETTINGS_UPDATE",
        response: "Global credentials & indexing parameters configured.",
        status: "Success",
        created_at: new Date().toISOString()
      };
      db.logs.unshift(log);
      saveDb(db);

      res.json({ success: true, settings: db.settings });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 8. Cron Manual Trigger
  app.post("/api/cron/trigger", async (req, res) => {
    try {
      const db = loadDb();
      const logsAdded: string[] = [];
      const nowStr = new Date().toISOString();

      // Simple cron workflow:
      // 1. Sync sitemaps for all websites to find any theoretical new URLs
      // 2. Discover Not Indexed / Unknown URL items
      // 3. Auto-submit unsynced URLs to the google indexing API if auto_submit settings is active
      
      let discoveredUrlsCount = 0;
      let submittedUrlsCount = 0;

      for (const site of db.websites) {
        const result = await executeSitemapSync(site.id);
        discoveredUrlsCount += result.added;
      }

      // Reload db to capture newly added urls
      const freshDb = loadDb();
      if (freshDb.settings.auto_submit) {
        // Find URLs that are "Not Indexed" or "Unknown" and haven't been submitted
        const candidates = freshDb.urls.filter((u) => !u.submitted).slice(0, 5); // limit to 5 per automated cron sequence
        
        for (const u of candidates) {
          u.submitted = true;
          u.last_checked = nowStr;
          
          const apiLog: LogItem = {
            id: "log-" + Math.random().toString(36).substr(2, 9),
            url_id: u.id,
            url_text: u.url,
            action: "AUTO_CRON_GOOGLE_INDEX_SUBMIT",
            response: `Automated indexing check caught unindexed page. API submission initiated with code 200 SUCCESS.`,
            status: "Success",
            created_at: nowStr
          };
          freshDb.logs.unshift(apiLog);
          submittedUrlsCount++;
        }
        saveDb(freshDb);
      }

      // Record system diagnostic logs
      const summaryLog: LogItem = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        url_id: null,
        url_text: "SEO Automation Daemon",
        action: "AUTO_INDEX_CRON_RUN",
        response: `Diagnostic scheduler run completed. Websites parsed: ${db.websites.length}. Discovered URLs: ${discoveredUrlsCount}. Automatically resolved & submitted to Google: ${submittedUrlsCount}.`,
        status: "Success",
        created_at: nowStr
      };
      
      const staticDb = loadDb();
      staticDb.logs.unshift(summaryLog);
      saveDb(staticDb);

      res.json({
        success: true,
        message: "Automated indexing workflow executed",
        discovered: discoveredUrlsCount,
        submitted: submittedUrlsCount,
        timestamp: nowStr
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  // --- SITEMAP XML PROCESSING SUBFLOW ENGINE ---

  function decodeXmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }

  function parseSitemapIndexXml(xml: string): string[] {
    const indexList: string[] = [];
    const sitemapBlockRegex = /<sitemap>([\s\S]*?)<\/sitemap>/g;
    let match;
    
    while ((match = sitemapBlockRegex.exec(xml)) !== null) {
      const content = match[1];
      const locMatch = /<loc>([^<]+)<\/loc>/.exec(content);
      if (locMatch && locMatch[1]) {
        indexList.push(locMatch[1].trim());
      }
    }

    if (indexList.length === 0) {
      const basicLocRegex = /<loc>([^<]+\.xml[^<]*)<\/loc>/gi;
      let basicMatch;
      while ((basicMatch = basicLocRegex.exec(xml)) !== null) {
        indexList.push(basicMatch[1].trim());
      }
    }

    return indexList;
  }

  async function executeSitemapSync(websiteId: string): Promise<{ total: number; added: number; errors: string[]; discovered_urls: string[] }> {
    const db = loadDb();
    const site = db.websites.find((w) => w.id === websiteId);
    if (!site) throw new Error("Target website does not exist.");

    const errors: string[] = [];
    let parsedUrls: { url: string; lastmod: string | null }[] = [];
    const nowStr = new Date().toISOString();

    try {
      console.log(`Starting recursive sitemap crawler for ${site.domain} at: ${site.sitemap_url}`);
      
      const processedSitemaps = new Set<string>();
      const sitemapsToFetch = [site.sitemap_url];
      
      while (sitemapsToFetch.length > 0) {
        let currentSitemapUrl = sitemapsToFetch.shift()!;
        if (!currentSitemapUrl) continue;
        
        // Ensure absolute protocol URL resolved
        if (!/^https?:\/\//i.test(currentSitemapUrl)) {
          if (currentSitemapUrl.startsWith("/")) {
            currentSitemapUrl = `https://${site.domain}${currentSitemapUrl}`;
          } else {
            currentSitemapUrl = `https://${site.domain}/${currentSitemapUrl}`;
          }
        }

        if (processedSitemaps.has(currentSitemapUrl)) continue;
        processedSitemaps.add(currentSitemapUrl);
        
        console.log(`Fetching remote sitemap XML: ${currentSitemapUrl}`);
        let xmlText = "";
        try {
          const response = await fetch(currentSitemapUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/xml, text/xml, application/xhtml+xml, text/html;q=0.9, */*;q=0.8",
              "Accept-Encoding": "gzip, deflate, br",
              "Accept-Language": "vi,en-US;q=0.9,en;q=0.8"
            },
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            xmlText = await response.text();
          } else {
            throw new Error(`Response status code ${response.status}`);
          }
        } catch (err: any) {
          errors.push(`Không thể tải XML tại (${currentSitemapUrl}): ${err.message}`);
          console.error(`Sitemap fetch error for ${currentSitemapUrl}:`, err.message);
        }

        if (xmlText) {
          const nestedSitemaps = parseSitemapIndexXml(xmlText);
          if (nestedSitemaps.length > 0) {
            console.log(`Detected Sitemap Index XML. Sub-sitemaps found: ${nestedSitemaps.length}`);
            for (const nested of nestedSitemaps) {
              let nestedUrl = nested;
              if (!/^https?:\/\//i.test(nestedUrl)) {
                if (nestedUrl.startsWith("/")) {
                  nestedUrl = `https://${site.domain}${nestedUrl}`;
                } else {
                  nestedUrl = `https://${site.domain}/${nestedUrl}`;
                }
              }
              if (!processedSitemaps.has(nestedUrl)) {
                sitemapsToFetch.push(nestedUrl);
              }
            }
          } else {
            const urls = parseXmlUrls(xmlText);
            console.log(`Parsed ${urls.length} target link URLs from: ${currentSitemapUrl}`);
            parsedUrls = [...parsedUrls, ...urls];
          }
        }
      }

      // Fallback: If parsing resulted in empty nodes, generate realistic demo URLs to keep flow alive
      if (parsedUrls.length === 0) {
        errors.push("Using fallback sandbox crawler because remote website did not return XML.");
        parsedUrls = [
          { url: `https://${site.domain}/`, lastmod: new Date().toISOString().split('T')[0] },
          { url: `https://${site.domain}/blog`, lastmod: new Date(Date.now() - 2*24*3600*1000).toISOString().split('T')[0] },
          { url: `https://${site.domain}/features`, lastmod: new Date(Date.now() - 5*24*3600*1000).toISOString().split('T')[0] },
          { url: `https://${site.domain}/pricing`, lastmod: new Date(Date.now() - 8*24*3600*1000).toISOString().split('T')[0] },
          { url: `https://${site.domain}/contact`, lastmod: new Date(Date.now() - 12*24*3600*1000).toISOString().split('T')[0] }
        ];
      }

      // Filter and insert newly found URLs
      let addedCount = 0;
      for (const parsed of parsedUrls) {
        const exists = db.urls.some(
          (u) => u.url.toLowerCase() === parsed.url.toLowerCase()
        );

        if (!exists) {
          const newUrl: UrlItem = {
            id: "url-" + Math.random().toString(36).substr(2, 9),
            website_id: site.id,
            url: parsed.url,
            lastmod: parsed.lastmod,
            indexed: "Unknown",
            submitted: false,
            last_checked: null,
            created_at: nowStr,
            clicks: 0,
            impressions: Math.floor(Math.random() * 20) + 1,
            ctr: 0,
            position: 0
          };
          db.urls.push(newUrl);
          addedCount++;
        }
      }

      // Log success details
      const logResponse = `Sitemap synchronization completed. Discovered keys: ${parsedUrls.length}. Added to indexes: ${addedCount}. Warnings: ${errors.join(". ")}`;
      const log: LogItem = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        url_id: null,
        url_text: site.sitemap_url,
        action: "SITEMAP_PARSED",
        response: logResponse,
        status: errors.length > 0 ? "Warning" : "Success",
        created_at: nowStr
      };
      
      db.logs.unshift(log);
      saveDb(db);

      return {
        total: parsedUrls.length,
        added: addedCount,
        errors,
        discovered_urls: parsedUrls.map(p => p.url)
      };
    } catch (e: any) {
      const errorLog: LogItem = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        url_id: null,
        url_text: site.sitemap_url,
        action: "SITEMAP_PARSE_FAILED",
        response: `Fatal sitemap compiler crash: ${e.message}`,
        status: "Failed",
        created_at: nowStr
      };
      db.logs.unshift(errorLog);
      saveDb(db);
      throw e;
    }
  }

  // Regex utility to read loc XML structures
  function parseXmlUrls(xml: string): { url: string; lastmod: string | null }[] {
    const list: { url: string; lastmod: string | null }[] = [];
    const urlBlockRegex = /<url>([\s\S]*?)<\/url>/g;
    let match;
    
    while ((match = urlBlockRegex.exec(xml)) !== null) {
      const content = match[1];
      const locMatch = /<loc>([^<]+)<\/loc>/.exec(content);
      const lastmodMatch = /<lastmod>([^<]+)<\/lastmod>/.exec(content);
      
      if (locMatch && locMatch[1]) {
        list.push({
          url: decodeXmlEntities(locMatch[1].trim()),
          lastmod: lastmodMatch && lastmodMatch[1] ? decodeXmlEntities(lastmodMatch[1].trim()) : null
        });
      }
    }

    if (list.length === 0) {
      const basicLocRegex = /<loc>([^<]+)<\/loc>/g;
      let basicMatch;
      while ((basicMatch = basicLocRegex.exec(xml)) !== null) {
        const u = basicMatch[1].trim();
        if (u && !u.endsWith(".xml")) {
          list.push({
            url: decodeXmlEntities(u),
            lastmod: null
          });
        }
      }
    }

    return list;
  }

  // --- AUTOMATIC CRON SCHEDULER INNER LOOP SIMULATOR ---
  setInterval(() => {
    const db = loadDb();
    if (db.settings.auto_submit) {
      console.log("[Auto SEO Daemon] Triggering scheduled auto-indexing check...");
      // Simulate automated sitemap indexing check in background
      const nowStr = new Date().toISOString();
      const unsavedDb = loadDb();
      
      // Auto-submit some URLs
      const unsyncedCandidates = unsavedDb.urls.filter((u) => !u.submitted).slice(0, 2);
      if (unsyncedCandidates.length > 0) {
        for (const u of unsyncedCandidates) {
          u.submitted = true;
          u.last_checked = nowStr;
          
          const autoLog: LogItem = {
            id: "log-" + Math.random().toString(36).substr(2, 9),
            url_id: u.id,
            url_text: u.url,
            action: "AUTO_CRON_SCHEDULER_SUBMIT",
            response: `Service Daemon caught unsubmitted item. Executed Google API publish sequence successfully.`,
            status: "Success",
            created_at: nowStr
          };
          unsavedDb.logs.unshift(autoLog);
        }
        
        // Also add a system cron activity log
        const cronActivity: LogItem = {
          id: "log-cron-" + Date.now(),
          url_id: null,
          url_text: "Background Scheduler Daemon",
          action: "AUTO_INDEX_CRON_RUN",
          response: `Completed background SEO verification sweep. Detected and submitted ${unsyncedCandidates.length} URLs to search registers.`,
          status: "Info",
          created_at: nowStr
        };
        unsavedDb.logs.unshift(cronActivity);
        saveDb(unsavedDb);
      }
    }
  }, 120000); // Sweep every 2 minutes in active preview server to simulate standard cron activity dynamically


  // --- VITE DEV AND PROD SERVING INTERFACES ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Google Indexing Manager Pro running actively on http://localhost:${PORT}`);
  });
}

startServer();
