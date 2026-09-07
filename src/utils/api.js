import { API_BASE_URL } from "../config/config";

const base = API_BASE_URL;

export const api = {
  async getRouters() {
    const res = await fetch(`${base}/api/routers`);
    if (!res.ok) throw new Error("Failed to fetch routers");
    return res.json();
  },

  async getRoutersByStatus(status) {
    const res = await fetch(`${base}/api/routers/status/${status}`);
    if (!res.ok) throw new Error("Failed to fetch routers by status");
    return res.json();
  },

  async getDownRouters() {
    const res = await fetch(`${base}/api/routers/status/down`);
    if (!res.ok) throw new Error("Failed to fetch down routers");
    return res.json();
  },

  async getRouterLastEvents(ip) {
    const res = await fetch(`${base}/api/routers/${ip}/last-events`);
    if (!res.ok) throw new Error("Failed to fetch last events");
    return res.json();
  },

  async getRouter(ip) {
    const res = await fetch(`${base}/api/routers/${ip}`);
    if (!res.ok) throw new Error("Failed to fetch router");
    return res.json();
  },

  async getRouterHistory(ip, page = 1, limit = 1000) {
    const res = await fetch(`${base}/api/routers/${ip}/history?page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
  },

  async getAnalytics(ip, period) {
    const res = await fetch(`${base}/api/analytics/summary/${ip}?period=${period}`);
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return res.json();
  },

  async getAllAnalytics(period) {
    const res = await fetch(`${base}/api/analytics/all?period=${period}`);
    if (!res.ok) throw new Error("Failed to fetch all analytics");
    return res.json();
  },

  async downloadExcel(period) {
    const res = await fetch(`${base}/api/analytics/report/excel/${period}`);
    if (!res.ok) throw new Error("Failed to download report");
    return res.blob();
  },

  async ask(question) {
    const res = await fetch(`${base}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error("Failed to get answer");
    return res.json();
  },

  async addRouter(bts_name, ip_address) {
    const res = await fetch(`${base}/api/routers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bts_name, ip_address }),
    });
    if (!res.ok) throw new Error("Failed to add router");
    return res.json();
  },

  async updateRouter(ip, data) {
    const res = await fetch(`${base}/api/routers/${ip}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update router");
    return res.json();
  },

  async deleteRouter(ip) {
    const res = await fetch(`${base}/api/routers/${ip}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete router");
    return res.json();
  },

  // ── BTS Information (battery-info) ──────────────────────────────────────
  async getBatteryInfoMonths() {
    const res = await fetch(`${base}/api/battery-info/months`);
    if (!res.ok) throw new Error("Failed to fetch months");
    return res.json();
  },

  async getBatteryInfoAll(month) {
    const url = month
      ? `${base}/api/battery-info?month=${month}`
      : `${base}/api/battery-info`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch BTS information");
    return res.json();
  },

  async getBatteryInfoByName(bts_name, month) {
    const url = month
      ? `${base}/api/battery-info/${encodeURIComponent(bts_name)}?month=${month}`
      : `${base}/api/battery-info/${encodeURIComponent(bts_name)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch BTS detail");
    return res.json();
  },

  async getBatteryInfoHistory(bts_name) {
    const res = await fetch(`${base}/api/battery-info/${encodeURIComponent(bts_name)}/history`);
    if (!res.ok) throw new Error("Failed to fetch BTS history");
    return res.json();
  },

  async updateBatteryInfo(bts_name, data, month) {
    const url = month
      ? `${base}/api/battery-info/${encodeURIComponent(bts_name)}?month=${month}`
      : `${base}/api/battery-info/${encodeURIComponent(bts_name)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update BTS information");
    return res.json();
  },

  async deleteBatteryInfo(bts_name, month) {
    const url = month
      ? `${base}/api/battery-info/${encodeURIComponent(bts_name)}?month=${month}`
      : `${base}/api/battery-info/${encodeURIComponent(bts_name)}`;
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete BTS information");
    return res.json();
  },

  // ── Battery Data (battery-latest) ───────────────────────────────────────
  async getBatteryLatestAll() {
    const res = await fetch(`${base}/api/battery-latest`);
    if (!res.ok) throw new Error("Failed to fetch battery data");
    return res.json();
  },

  async getBatteryLatestByIp(ip) {
    const res = await fetch(`${base}/api/battery-latest/${ip}`);
    if (!res.ok) throw new Error("Failed to fetch battery detail");
    return res.json();
  },

  async searchBatteryLatestByName(bts_name) {
    const res = await fetch(`${base}/api/battery-latest/search/by-name/${encodeURIComponent(bts_name)}`);
    if (!res.ok) throw new Error("Failed to search battery data");
    return res.json();
  },

  async updateBatteryLatest(ip, data) {
    const res = await fetch(`${base}/api/battery-latest/${ip}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update battery data");
    return res.json();
  },

  async deleteBatteryLatest(ip) {
    const res = await fetch(`${base}/api/battery-latest/${ip}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete battery data");
    return res.json();
  },

  async uploadBatteryLatest(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${base}/api/battery-latest/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload battery data file");
    return res.json();
  },

  async uploadBatteryInfo(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${base}/api/battery-info/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload BTS information file");
    return res.json();
  },
};