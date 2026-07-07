import React, { useState, useEffect } from "react";
import { 
  Activity, Play, StopCircle, RefreshCw, Layers, ShieldCheck, 
  Wallet, Puzzle, Plus, HelpCircle, Check, Database, Sparkles, 
  ArrowRight, Landmark, ExternalLink, Code2, Copy, History, 
  ShoppingBag, Terminal, Lock, Globe, Trash2, Clock, Key, LogOut
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area 
} from "recharts";
import LoginScreen from "./components/LoginScreen.js";

const apiFetch = async (url: string, options: any = {}) => {
  const token = localStorage.getItem("authToken");
  const headers = { ...options.headers };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers });
};
import MockBrowser from "./components/MockBrowser.js";
import BkashPortal from "./components/BkashPortal.js";
import ChromeExtensionCard from "./components/ChromeExtensionCard.js";

export interface ApiSchedule {
  id: string;
  apiId: string;
  userId: string;
  parameters: Record<string, any>;
  frequency: "hourly" | "daily";
  ruleQuery: string;
  webhookUrl: string;
  lastRunAt?: string;
  lastResult?: any;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKey {
  key: string;
  name: string;
  createdAt: string;
}

// Common Interface mirroring backend
interface User {
  id: string;
  username: string;
  balance: number;
  freeAttemptsUsed: { [dateStr: string]: number };
  apiKeys?: ApiKey[];
}

interface BrowserStep {
  id: string;
  action: "navigate" | "click" | "input" | "scrape";
  url?: string;
  selector?: string;
  value?: string;
  description: string;
}

interface ApiItem {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  description: string;
  isPrivate: boolean;
  pricePerCall: number;
  steps: BrowserStep[];
  clarifications: {
    explanation: string;
    questions: string[];
    dynamicParameters: { name: string; type: string; description: string; defaultValue: string }[];
  };
  callsCount: number;
  revenueEarned: number;
  createdAt: string;
}

interface BkashTransaction {
  id: string;
  userId: string;
  username: string;
  amount: number;
  trxId: string;
  senderNumber: string;
  status: string;
  createdAt: string;
}

interface ApiCallLog {
  id: string;
  apiId: string;
  apiName: string;
  callerId: string;
  callerName: string;
  parameters: Record<string, any>;
  status: string;
  response: any;
  cost: number;
  executionTimeMs: number;
  createdAt: string;
}

type MainView = "workspace" | "dashboard" | "marketplace" | "admin" | "scheduler" | "analytics" | "keys" | "docs";

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("api_marketplace_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [activeView, setActiveView] = useState<MainView>("workspace");
  const [adminTransactions, setAdminTransactions] = useState<BkashTransaction[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  
  // Docs State
  const [activeDocsApi, setActiveDocsApi] = useState<ApiItem | null>(null);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"curl" | "python" | "node" | "go">("curl");

  // Sync user session to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("api_marketplace_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("api_marketplace_user");
    }
  }, [user]);
  const [showBkash, setShowBkash] = useState(false);

  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSteps, setRecordedSteps] = useState<BrowserStep[]>([]);
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarificationResult, setClarificationResult] = useState<any | null>(null);

  // Saved API details in Modal before submitting
  const [apiName, setApiName] = useState("");
  const [apiDesc, setApiDesc] = useState("");
  const [apiPrice, setApiPrice] = useState("2");
  const [apiIsPrivate, setApiIsPrivate] = useState(false);

  // Dashboard & Marketplace Data
  const [myApis, setMyApis] = useState<ApiItem[]>([]);
  const [marketplaceApis, setMarketplaceApis] = useState<ApiItem[]>([]);
  const [selectedApi, setSelectedApi] = useState<ApiItem | null>(null);

  const [schedules, setSchedules] = useState<ApiSchedule[]>([]);
  const [scheduleApiId, setScheduleApiId] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState<"hourly" | "daily">("daily");
  const [scheduleRule, setScheduleRule] = useState("");
  const [scheduleWebhook, setScheduleWebhook] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  
  // Dynamic Playground Inputs for the selected API
  const [playgroundParams, setPlaygroundParams] = useState<Record<string, string>>({});
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [apiRunError, setApiRunError] = useState<string | null>(null);

  const [integrationTab, setIntegrationTab] = useState<"url" | "curl" | "puppeteer">("url");
  const [executionEngine, setExecutionEngine] = useState<"gemini" | "puppeteer">("gemini");

  const generatePuppeteerStealthCode = (api: ApiItem) => {
    let code = `/**
 * Autogenerated Puppeteer Stealth Web Scraper script
 * Generated by Browser API Recorder Platform
 * 
 * Requirements:
 * npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth
 */
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Enable stealth bypass plugins
puppeteer.use(StealthPlugin());

async function runScraper() {
  // Launch Chromium with anti-bot argument headers
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1280,800'
    ]
  });

  const page = await browser.newPage();
  
  // Set real browser user-agent and viewports to bypass block headers
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  const results = {};

  try {
`;

    api.steps.forEach((step, idx) => {
      code += `    // Step ${idx + 1}: ${step.action} - ${step.description || ""}\\n`;
      if (step.action === "navigate") {
        code += `    console.log("Navigating to target domain...");\\n`;
        code += `    await page.goto("${step.url}", { waitUntil: "networkidle2" });\\n`;
        code += `    await new Promise(r => setTimeout(r, 1500)); // random delay to mimic human timing\\n\\n`;
      } else if (step.action === "click") {
        code += `    console.log("Simulating stealth click on selector: ${step.selector}...");\\n`;
        code += `    await page.waitForSelector("${step.selector}", { timeout: 5000 });\\n`;
        code += `    await page.click("${step.selector}");\\n`;
        code += `    await new Promise(r => setTimeout(r, 1000));\\n\\n`;
      } else if (step.action === "input") {
        code += `    console.log("Simulating stealth keystrokes into selector: ${step.selector}...");\\n`;
        code += `    await page.focus("${step.selector}");\\n`;
        code += `    await page.type("${step.selector}", "${step.value || ""}", { delay: 100 });\\n`;
        code += `    await new Promise(r => setTimeout(r, 800));\\n\\n`;
      } else if (step.action === "scrape") {
        code += `    console.log("Extracting DOM-parsed data from selector: ${step.selector}...");\\n`;
        code += `    await page.waitForSelector("${step.selector}", { timeout: 5000 });\\n`;
        code += `    const scrapedData = await page.evaluate((sel) => {\\n`;
        code += `      const nodes = document.querySelectorAll(sel);\\n`;
        code += `      return Array.from(nodes).map(n => n.textContent ? n.textContent.trim() : "");\\n`;
        code += `    }, "${step.selector}");\\n`;
        code += `    results["scraped_data"] = scrapedData;\\n\\n`;
      }
    });

    code += `    console.log("Successfully completed scraper scenario!");\\n`;
    code += `    console.log("Scraped Results:", JSON.stringify(results, null, 2));\\n`;
    code += `  } catch (error) {\\n`;
    code += `    console.error("Scraper execution crashed:", error.message);\\n`;
    code += `  } finally {\\n`;
    code += `    await browser.close();\\n`;
    code += `  }\\n`;
    code += `}\\n\\n`;
    code += `runScraper();`;

    return code;
  };

  // History & Logs
  const [callLogs, setCallLogs] = useState<ApiCallLog[]>([]);
  const [transactions, setTransactions] = useState<BkashTransaction[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Load state for logged in user
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Listen for synchronized steps from Chrome/Edge extension
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === "SYNC_EXTENSION_STEPS") {
        const steps = event.data.steps;
        if (Array.isArray(steps) && steps.length > 0) {
          setRecordedSteps(steps);
          setActiveView("workspace"); // Switch to workspace view
          
          // Smooth scroll to the recorder workspace section
          setTimeout(() => {
            const el = document.getElementById("chrome-extension-guide");
            if (el) {
              el.scrollIntoView({ behavior: "smooth" });
            }
          }, 300);
          
          // Trigger the clarify API automatically
          setClarifyLoading(true);
          try {
            const response = await apiFetch("/api/recorder/clarify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ steps }),
            });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || "Failed to contact Gemini clarifying agent.");
            }
            setClarificationResult(data);
            
            // Auto-populate form fields
            setApiName(data.dynamicParameters?.[0] ? `Chrome Scraper: ${data.dynamicParameters[0].defaultValue}` : "Browser Scraping Endpoint");
            setApiDesc(data.explanation || "");
            
            alert(`Successfully imported and analyzed ${steps.length} steps from Edge Extension!`);
          } catch (err: any) {
            alert(`Imported steps, but LLM Clarification failed: ${err.message}`);
          } finally {
            setClarifyLoading(false);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [user]);

  // Sync activeView state to browser history path
  useEffect(() => {
    const currentPath = window.location.pathname.substring(1);
    if (currentPath !== activeView) {
      window.history.pushState(null, "", "/" + activeView);
    }
  }, [activeView]);

  // Handle browser back/forward buttons & initialize path on load
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.substring(1);
      if (path === "dashboard" || path === "marketplace" || path === "workspace" || path === "admin") {
        setActiveView(path as MainView);
      }
    };
    window.addEventListener("popstate", handlePopState);
    
    // Initialize view from URL path on load
    const initialPath = window.location.pathname.substring(1);
    if (initialPath === "dashboard" || initialPath === "marketplace" || initialPath === "workspace" || initialPath === "admin") {
      setActiveView(initialPath as MainView);
    } else {
      window.history.replaceState(null, "", "/workspace");
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // Fetch user profile to keep balance updated
      const profileRes = await apiFetch(`/api/auth/me/${user.id}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData.user);
      } else if (profileRes.status === 404) {
        setUser(null);
        return;
      }

      // Fetch personal APIs
      const myRes = await apiFetch(`/api/apis/my/${user.id}`);
      if (myRes.ok) {
        const myData = await myRes.json();
        setMyApis(myData.apis);
      }

      // Fetch Marketplace APIs
      const marketRes = await apiFetch("/api/apis/marketplace");
      if (marketRes.ok) {
        const marketData = await marketRes.json();
        setMarketplaceApis(marketData.apis);
      }

      // Fetch Schedules
      const schedRes = await apiFetch(`/api/schedules/${user.id}`);
      if (schedRes.ok) {
        const schedData = await schedRes.json();
        setSchedules(schedData.schedules || []);
      }

      // Fetch Logs
      const logsRes = await apiFetch(`/api/logs/${user.id}`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setCallLogs(logsData.logs);
      }

      // Fetch Transactions
      const txRes = await apiFetch(`/api/transactions/${user.id}`);
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  };

  const fetchAdminTransactions = async () => {
    setAdminLoading(true);
    try {
      const res = await apiFetch("/api/admin/transactions");
      if (res.ok) {
        const data = await res.json();
        setAdminTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Failed to load admin transactions:", err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleApproveTransaction = async (txId: string) => {
    try {
      const res = await apiFetch(`/api/admin/transactions/approve/${txId}`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      fetchAdminTransactions();
      if (user) fetchDashboardData();
    } catch (err: any) {
      alert("Approve failed: " + err.message);
    }
  };

  const handleRejectTransaction = async (txId: string) => {
    try {
      const res = await apiFetch(`/api/admin/transactions/reject/${txId}`, {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
      fetchAdminTransactions();
      if (user) fetchDashboardData();
    } catch (err: any) {
      alert("Reject failed: " + err.message);
    }
  };

  const [adminApis, setAdminApis] = useState<ApiItem[]>([]);
  const [adminApisLoading, setAdminApisLoading] = useState(false);

  const fetchAdminApis = async () => {
    setAdminApisLoading(true);
    try {
      const res = await apiFetch("/api/apis");
      if (res.ok) {
        const data = await res.json();
        setAdminApis(data);
      }
    } catch (err) {
      console.error("Failed to load admin APIs list:", err);
    } finally {
      setAdminApisLoading(false);
    }
  };

  const handleAdminDeleteApi = async (apiId: string) => {
    if (!confirm("Are you sure you want to permanently remove this API from the marketplace?")) return;
    try {
      const res = await apiFetch("/api/admin/apis/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("API successfully removed!");
        fetchAdminApis();
        fetchDashboardData();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  useEffect(() => {
    if (activeView === "admin") {
      fetchAdminTransactions();
      fetchAdminApis();
    }
  }, [activeView]);

  const handleLogin = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setActiveView("workspace");
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  const startNewRecording = () => {
    setRecordedSteps([]);
    setIsRecording(true);
    setClarificationResult(null);
  };

  const loadDemoSteps = () => {
    const demoSteps: BrowserStep[] = [
      {
        id: "step-demo-1",
        action: "navigate",
        url: "https://news.ycombinator.com",
        description: "Navigate browser viewport to Hacker News"
      },
      {
        id: "step-demo-2",
        action: "scrape",
        selector: ".story-row .titleline",
        description: "Scrape front-page story titles and links"
      }
    ];
    setRecordedSteps(demoSteps);
    alert("Loaded Hacker News demo scraper sequence! Click 'Stop & Clarify (LLM)' above to test Gemini AI structuring.");
  };

  const handleRecordStep = (step: BrowserStep) => {
    setRecordedSteps(prev => [...prev, step]);
  };

  const stopAndClarify = async () => {
    setIsRecording(false);
    if (recordedSteps.length === 0) {
      alert("No browser steps recorded! Please navigate or click inside the emulator tab first.");
      return;
    }

    setClarifyLoading(true);
    try {
      const response = await apiFetch("/api/recorder/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: recordedSteps }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to contact Gemini clarifying agent.");
      }
      setClarificationResult(data);
      
      // Auto-populate form
      setApiName(data.dynamicParameters?.[0] ? `Chrome Scraper: ${data.dynamicParameters[0].defaultValue}` : "Browser Scraping Endpoint");
      setApiDesc(data.explanation || "");
    } catch (err: any) {
      alert("LLM Clarification Failed: " + err.message);
    } finally {
      setClarifyLoading(false);
    }
  };

  const handleSaveApi = async () => {
    if (!user || !clarificationResult) return;

    try {
      const response = await apiFetch("/api/apis/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: user.id,
          name: apiName,
          description: apiDesc,
          isPrivate: apiIsPrivate,
          pricePerCall: parseFloat(apiPrice),
          steps: recordedSteps,
          clarifications: clarificationResult,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save API");
      }

      // Reset recorder
      setClarificationResult(null);
      setRecordedSteps([]);
      
      // Sync list & Redirect to Dashboard
      await fetchDashboardData();
      setActiveView("dashboard");
      
      // Select the newly created API in Dashboard automatically
      if (data.api) {
        setSelectedApi(data.api);
        // Initialize play inputs
        const initialParams: Record<string, string> = {};
        data.api.clarifications.dynamicParameters.forEach((p: any) => {
          initialParams[p.name] = p.defaultValue;
        });
        setPlaygroundParams(initialParams);
      }
    } catch (err: any) {
      alert("Failed to save API: " + err.message);
    }
  };

  const handleCreateSchedule = async () => {
    if (!user || !scheduleApiId || !scheduleRule || !scheduleWebhook) {
      alert("Please fill all required fields.");
      return;
    }
    setScheduleLoading(true);
    try {
      const res = await apiFetch("/api/schedules/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          apiId: scheduleApiId,
          parameters: playgroundParams,
          frequency: scheduleFrequency,
          ruleQuery: scheduleRule,
          webhookUrl: scheduleWebhook
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setScheduleApiId("");
      setScheduleRule("");
      setScheduleWebhook("");
      await fetchDashboardData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await apiFetch(`/api/schedules/delete/${id}`, { method: "POST" });
      await fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  const runLiveApi = async (api: ApiItem) => {
    if (!user) return;
    setExecutionLoading(true);
    setApiRunError(null);
    setExecutionResult(null);

    try {
      const response = await apiFetch(`/api/apis/run/${api.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerId: user.id,
          parameters: playgroundParams,
          engine: executionEngine
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "API execution failed.");
      }

      setExecutionResult(data);
      // Refresh balance and daily limits
      fetchDashboardData();
    } catch (err: any) {
      setApiRunError(err.message || "An unexpected error occurred during head-less Chrome emulation.");
    } finally {
      setExecutionLoading(false);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLogin} />;
  }

  const dateStrToday = new Date().toISOString().split("T")[0];
  const dailyFreeAttemptsUsed = user.freeAttemptsUsed[dateStrToday] || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Global Header */}
      <header className="bg-slate-900 border-b border-slate-800/80 sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-tight">Recorded Browser APIs</h1>
            <p className="text-slate-400 text-xs font-sans">bKash SMS billing integration & Marketplace console</p>
          </div>
        </div>

        {/* Global Navigation Toggles */}
        <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded-xl">
          <button
            id="nav-workspace-btn"
            onClick={() => { setActiveView("workspace"); setExecutionResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeView === "workspace" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>API Maker Workspace</span>
          </button>
          
          <button
            id="nav-dashboard-btn"
            onClick={() => { setActiveView("dashboard"); fetchDashboardData(); setExecutionResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeView === "dashboard" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Console Dashboard</span>
          </button>

          <button
            id="nav-marketplace-btn"
            onClick={() => { setActiveView("marketplace"); fetchDashboardData(); setExecutionResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeView === "marketplace" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Marketplace</span>
          </button>

          <button
            id="nav-scheduler-btn"
            onClick={() => { setActiveView("scheduler"); setExecutionResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeView === "scheduler" ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduler</span>
          </button>

          <button
            id="nav-analytics-btn"
            onClick={() => { setActiveView("analytics"); fetchDashboardData(); setExecutionResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeView === "analytics" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>

          <button
            id="nav-keys-btn"
            onClick={() => { setActiveView("keys"); setExecutionResult(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeView === "keys" ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>API Keys</span>
          </button>

          {user?.isAdmin && (
            <button
              id="nav-admin-btn"
              onClick={() => { setActiveView("admin"); setExecutionResult(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeView === "admin" ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20" : "text-slate-400 hover:text-slate-200"}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Admin Portal</span>
            </button>
          )}
        </div>

        {/* User Stats & bKash Deposit */}
        <div className="flex items-center gap-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <div className="px-3 py-1 text-right">
            <p className="text-slate-400 text-2xs font-mono">DEVELOPER SESSION</p>
            <p className="text-slate-200 text-sm font-semibold">@{user.username}</p>
          </div>

          <div className="h-6 w-px bg-slate-800"></div>

          <div className="px-3 py-1">
            <p className="text-slate-400 text-2xs font-mono">WALLET BALANCE</p>
            <p className="text-white text-sm font-extrabold flex items-center gap-1">
              <span>{user.balance.toFixed(1)}</span>
              <span className="text-pink-500 text-2xs uppercase">BDT</span>
            </p>
          </div>

          <button
            id="deposit-modal-trigger"
            onClick={() => setShowBkash(true)}
            className="p-2.5 bg-[#e2125d] hover:bg-pink-700 text-white rounded-lg cursor-pointer transition-all flex items-center gap-1.5 font-bold text-xs shrink-0"
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">bKash Add Money</span>
          </button>

          <button
            id="logout-btn"
            onClick={handleLogout}
            className="p-2.5 bg-slate-800 hover:bg-red-900/50 text-slate-300 hover:text-red-400 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 font-bold text-xs shrink-0 border border-transparent hover:border-red-900/50"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Contents */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        
        {/* VIEW 1: API RECORDER WORKSPACE */}
        {activeView === "workspace" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Recorder Workspace Area */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                    API Recorder & Sandbox Studio
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    Toggle recording, trigger browser scenarios, let Google Gemini structure dynamic API end-points.
                  </p>
                </div>

                <div className="flex gap-2">
                  {!isRecording && recordedSteps.length === 0 && (
                    <button
                      id="load-demo-btn"
                      onClick={loadDemoSteps}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                      <span>Load Demo Sequence</span>
                    </button>
                  )}
                  {!isRecording ? (
                    <button
                      id="record-start-btn"
                      onClick={startNewRecording}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-[1.03] active:scale-[0.98]"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-white block animate-pulse shrink-0 border border-red-700"></span>
                      <span>Start Recording</span>
                    </button>
                  ) : (
                    <button
                      id="record-stop-btn"
                      onClick={stopAndClarify}
                      disabled={clarifyLoading}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 shadow-lg"
                    >
                      {clarifyLoading ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <StopCircle className="w-4 h-4 text-white" />
                      )}
                      <span>Stop & Clarify (LLM)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Simulated Embedded Browser Component */}
              <MockBrowser 
                isRecording={isRecording} 
                onRecordStep={handleRecordStep}
                recordedSteps={recordedSteps} 
              />
              <div className="mt-6">
                <ChromeExtensionCard />
              </div>
            </div>

            {/* Live Interactive Side Stream */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Steps Logged panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>Logged Interactions ({recordedSteps.length})</span>
                    {!isRecording && recordedSteps.length > 0 && (
                      <button 
                        onClick={() => setRecordedSteps([])} 
                        className="text-3xs text-rose-500 hover:text-rose-400 font-bold border border-rose-950 px-2 py-0.5 rounded bg-rose-950/20 cursor-pointer ml-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {isRecording && <span className="text-rose-500 text-2xs animate-pulse">RECORDING ACTIVE</span>}
                </h3>

                {recordedSteps.length === 0 ? (
                  <div className="py-12 text-center text-slate-600 border border-dashed border-slate-800 rounded-xl">
                    <Puzzle className="w-8 h-8 mx-auto mb-2 opacity-35" />
                    <p className="text-xs font-mono">No actions captured yet.</p>
                    <p className="text-2xs font-sans text-slate-500 mt-1">Press "Start Recording" above and click items inside the Chrome emulator!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {recordedSteps.map((step, index) => (
                      <div key={step.id} className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl flex gap-2.5 text-xs font-mono relative group">
                        <span className="text-indigo-400 font-bold">{index + 1}.</span>
                        <div className="flex-1 space-y-1">
                          <span className="font-semibold uppercase tracking-wider text-2xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            {step.action}
                          </span>
                          {step.label && (
                            <span className="ml-2 font-bold text-3xs px-1.5 py-0.5 rounded bg-emerald-950/45 border border-emerald-900/50 text-emerald-400 font-mono">
                              Label: {step.label}
                            </span>
                          )}
                          <p className="text-slate-300 mt-1 font-sans pr-6">{step.description}</p>
                          {step.selector && (
                            <p className="text-2xs text-indigo-400 bg-indigo-950/20 px-1.5 py-1 rounded inline-block mt-1">
                              Selector: {step.selector}
                            </p>
                          )}
                        </div>
                        {!isRecording && (
                          <button
                            onClick={() => setRecordedSteps(prev => prev.filter(s => s.id !== step.id))}
                            className="absolute right-2 top-2.5 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all bg-transparent border-none cursor-pointer p-0.5"
                            title="Delete step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Free Trial Limit tracker */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <p className="text-xs font-bold text-slate-300">Free Developer Trial Remaining</p>
                <div className="flex justify-between text-2xs font-mono text-slate-400">
                  <span>Attempts Today:</span>
                  <span className="font-bold text-white">{dailyFreeAttemptsUsed} / 5</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500" 
                    style={{ width: `${Math.min(100, (dailyFreeAttemptsUsed / 5) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-2xs text-slate-500 leading-relaxed font-sans">
                  Once you consume your 5 daily free sandbox runs, any API calls cost 2 BDT per run. Top up with bKash to purchase more API attempts!
                </p>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: CONSOLE DASHBOARD */}
        {activeView === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Sidebar with Registered Endpoints */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-extrabold text-white font-sans">My Scraper Endpoints</h3>
                  <button
                    onClick={() => setActiveView("workspace")}
                    className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-2xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New API</span>
                  </button>
                </div>

                {myApis.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl text-xs font-mono">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-35 text-slate-600" />
                    <span>No APIs registered yet.</span>
                    <button
                      onClick={() => setActiveView("workspace")}
                      className="mt-3 block mx-auto px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-2xs cursor-pointer font-sans font-semibold"
                    >
                      Record your first API
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto">
                    {myApis.map(api => (
                      <button
                        key={api.id}
                        onClick={() => { setSelectedApi(api); setExecutionResult(null); setApiRunError(null); }}
                        className={`w-full p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                          selectedApi?.id === api.id ? "bg-indigo-600/10 border-indigo-500 text-slate-200" : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        <Terminal className="w-4 h-4 text-indigo-400 mt-1 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs truncate text-slate-100">{api.name}</p>
                          <p className="text-2xs text-slate-500 font-sans line-clamp-2 mt-0.5">{api.description}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-3xs font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800/60 text-indigo-300">
                              {api.pricePerCall} BDT / run
                            </span>
                            <span className="text-3xs font-mono flex items-center gap-0.5 text-slate-400">
                              {api.isPrivate ? <Lock className="w-2.5 h-2.5 text-slate-500" /> : <Globe className="w-2.5 h-2.5 text-emerald-500" />}
                              <span>{api.isPrivate ? "Private" : "Marketplace"}</span>
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDocsApi(api);
                                setActiveView("docs");
                              }}
                              className="ml-auto text-3xs font-bold text-sky-400 hover:text-sky-300 bg-sky-950/30 hover:bg-sky-900/50 px-2 py-0.5 rounded border border-sky-900/30 transition-colors flex items-center gap-1"
                            >
                              <Code2 className="w-3 h-3" /> API Docs
                            </button>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Transactions History Widget */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-3">bKash Deposit History</h3>
                {transactions.length === 0 ? (
                  <p className="text-2xs font-mono text-slate-600 py-4">No deposits made yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {transactions.map(tx => (
                      <div key={tx.id} className="p-2 bg-slate-950 border border-slate-800/60 rounded-lg flex justify-between items-center text-2xs font-mono">
                        <div>
                          <p className="text-slate-300">Amount: +{tx.amount} BDT</p>
                          <p className="text-slate-500 text-3xs">TrxID: {tx.trxId}</p>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 font-sans text-3xs font-semibold">
                          APPROVED
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic playground and run details */}
            <div className="lg:col-span-8 space-y-4">
              
              {selectedApi ? (
                <div className="space-y-4">
                  
                  {/* API details & Endpoint metadata */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-white">{selectedApi.name}</h2>
                          <span className={`text-3xs font-mono px-2 py-0.5 rounded border ${selectedApi.isPrivate ? "bg-slate-950 text-slate-400 border-slate-800" : "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"}`}>
                            {selectedApi.isPrivate ? "Private Endpoint" : "Public Marketplace API"}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed font-sans">{selectedApi.description}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xs text-slate-500 font-mono">RUN METRICS</p>
                        <p className="text-white text-sm font-extrabold">{selectedApi.callsCount} <span className="text-2xs text-slate-400 font-mono">calls</span></p>
                        <p className="text-emerald-400 text-xs mt-0.5 font-bold font-mono">+{selectedApi.revenueEarned.toFixed(1)} BDT earned</p>
                      </div>
                    </div>

                    {/* Endpoints URI card */}
                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                      {/* Tabs Header */}
                      <div className="flex border-b border-slate-800 pb-1.5 gap-3">
                        <button
                          onClick={() => setIntegrationTab("url")}
                          className={`pb-1 text-2xs font-bold font-mono tracking-wider uppercase cursor-pointer border-b-2 transition-all ${integrationTab === "url" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-350"}`}
                        >
                          Trigger URL
                        </button>
                        <button
                          onClick={() => setIntegrationTab("curl")}
                          className={`pb-1 text-2xs font-bold font-mono tracking-wider uppercase cursor-pointer border-b-2 transition-all ${integrationTab === "curl" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-350"}`}
                        >
                          cURL
                        </button>
                        <button
                          onClick={() => setIntegrationTab("puppeteer")}
                          className={`pb-1 text-2xs font-bold font-mono tracking-wider uppercase cursor-pointer border-b-2 transition-all ${integrationTab === "puppeteer" ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-350"}`}
                        >
                          Puppeteer (Stealth)
                        </button>
                      </div>

                      {/* Tab Contents */}
                      {integrationTab === "url" && (
                        <div className="font-mono text-xs space-y-1">
                          <span className="text-3xs font-semibold uppercase tracking-wide text-slate-500">HTTP POST Trigger Link</span>
                          <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800/80">
                            <div className="flex gap-2 text-slate-300 select-all truncate text-2xs">
                              <span className="text-emerald-400 font-bold">POST</span>
                              <span>{window.location.origin}/api/apis/run/{selectedApi.id}</span>
                            </div>
                            <button
                              onClick={() => handleCopyText(`${window.location.origin}/api/apis/run/${selectedApi.id}`, "triggerUrl")}
                              className="text-slate-500 hover:text-white cursor-pointer bg-transparent border-none"
                            >
                              {copiedText === "triggerUrl" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {integrationTab === "curl" && (
                        <div className="font-mono text-xs space-y-1">
                          <span className="text-3xs font-semibold uppercase tracking-wide text-slate-500">Terminal Request command</span>
                          <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800/80">
                            <code className="text-indigo-400 select-all truncate text-3xs">
                              curl -X POST "{window.location.origin}/api/apis/run/{selectedApi.id}" -H "Content-Type: application/json" -d '{JSON.stringify({ callerId: user.id, parameters: playgroundParams, engine: executionEngine })}'
                            </code>
                            <button
                              onClick={() => handleCopyText(`curl -X POST "${window.location.origin}/api/apis/run/{selectedApi.id}" -H "Content-Type: application/json" -d '${JSON.stringify({ callerId: user.id, parameters: playgroundParams, engine: executionEngine })}'`, "curlCmd")}
                              className="text-slate-500 hover:text-white cursor-pointer bg-transparent border-none"
                            >
                              {copiedText === "curlCmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      {integrationTab === "puppeteer" && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-3xs font-semibold uppercase tracking-wide text-slate-500 font-mono">Bypasses Captchas / Cloudflare Stealth Scraper</span>
                            <span className="text-3xs font-sans text-rose-400 italic">Self-Hosted code</span>
                          </div>
                          <div className="relative bg-slate-900 border border-slate-800/80 rounded-lg overflow-hidden">
                            <pre className="p-3 text-3xs font-mono text-indigo-300 overflow-auto max-h-[160px] whitespace-pre leading-relaxed scrollbar-thin">
                              {generatePuppeteerStealthCode(selectedApi)}
                            </pre>
                            <button
                              onClick={() => handleCopyText(generatePuppeteerStealthCode(selectedApi), "puppeteerStealth")}
                              className="absolute right-3 top-3 bg-slate-950/80 hover:bg-slate-950 p-1.5 rounded border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                              title="Copy code"
                            >
                              {copiedText === "puppeteerStealth" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Playground & Executer Frame */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Live API Test Playground (Run inside Website)</h3>

                    {/* Detected Parameters by Gemini */}
                    {selectedApi.clarifications?.dynamicParameters && selectedApi.clarifications.dynamicParameters.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedApi.clarifications.dynamicParameters.map(param => (
                          <div key={param.name} className="space-y-1 text-xs">
                            <label className="block text-slate-300 font-semibold font-mono">{param.name} <span className="text-indigo-400 text-3xs font-normal">({param.type})</span></label>
                            <input
                              type="text"
                              value={playgroundParams[param.name] ?? ""}
                              onChange={(e) => setPlaygroundParams(prev => ({ ...prev, [param.name]: e.target.value }))}
                              placeholder={param.description || `Enter value for ${param.name}`}
                              className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-mono"
                            />
                            <p className="text-3xs text-slate-500 italic font-sans">{param.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs font-sans text-slate-500">This scraper scenario does not expose any custom dynamic parameters. It runs strictly static actions.</p>
                    )}

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 self-start">
                        <button
                          type="button"
                          onClick={() => setExecutionEngine("gemini")}
                          className={`px-3 py-1.5 rounded-lg text-2xs font-mono font-bold transition-all cursor-pointer ${
                            executionEngine === "gemini"
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-none"
                              : "text-slate-400 hover:text-slate-200 bg-transparent border-none"
                          }`}
                        >
                          Gemini Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setExecutionEngine("puppeteer")}
                          className={`px-3 py-1.5 rounded-lg text-2xs font-mono font-bold transition-all cursor-pointer ${
                            executionEngine === "puppeteer"
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 border-none"
                              : "text-slate-400 hover:text-slate-200 bg-transparent border-none"
                          }`}
                        >
                          Puppeteer Live
                        </button>
                      </div>

                      <button
                        id="run-api-playground-btn"
                        onClick={() => runLiveApi(selectedApi)}
                        disabled={executionLoading}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {executionLoading ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <Play className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>Run API Inside Website</span>
                      </button>

                      <span className="text-3xs text-slate-500 flex items-center gap-1 font-mono">
                        <Lock className="w-3 h-3 text-slate-500" />
                        Calls are charged {selectedApi.pricePerCall} BDT / attempt (or uses daily free limit)
                      </span>
                    </div>

                    {/* Execution Output Panel */}
                    {(executionResult || apiRunError) && (
                      <div className="bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden mt-4">
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-300 flex items-center gap-1.5 font-bold">
                            <Terminal className="w-4 h-4 text-emerald-400" />
                            Scraper Emulator Response
                          </span>
                          {executionResult && (
                            <span className="text-2xs text-emerald-400 font-mono">
                              Resolved in {executionResult.executionTimeMs}ms
                            </span>
                          )}
                        </div>

                        {apiRunError ? (
                          <pre className="p-4 text-xs text-red-400 font-mono whitespace-pre-wrap leading-relaxed">
                            Error: {apiRunError}
                          </pre>
                        ) : (
                          <pre className="p-4 text-2xs text-slate-300 font-mono whitespace-pre-wrap overflow-auto max-h-[300px] leading-relaxed">
                            {JSON.stringify(executionResult?.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="py-24 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
                  <Terminal className="w-12 h-12 mx-auto mb-3 text-slate-700 animate-pulse" />
                  <p className="text-sm font-semibold text-white font-sans">No API selected from panel</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Select one of your registered browser scrapers on the left sidebar, or create a new recording scenario to test.
                  </p>
                </div>
              )}


              {/* Interaction Logs history */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  API Execution Log Streams
                </h3>
                {callLogs.length === 0 ? (
                  <p className="text-xs font-mono text-slate-600 py-6">No calls logged yet in this sandbox container session.</p>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {callLogs.map(log => (
                      <div key={log.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center text-xs font-mono">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{log.apiName}</span>
                            <span className={`text-3xs px-1.5 py-0.2 rounded font-sans font-bold ${log.status === "success" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/40" : "bg-red-950/40 text-red-400 border border-red-900/40"}`}>
                              {log.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-slate-500 text-3xs mt-1">Caller: {log.callerName} | Cost: {log.cost} BDT</p>
                        </div>
                        <span className="text-2xs text-slate-400 font-semibold">{log.executionTimeMs}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* VIEW 3: MARKETPLACE */}
        {activeView === "marketplace" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-indigo-400" />
                  API Scraper Marketplace
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Discover, test run, or sell pre-configured web scraper endpoints. Calling external APIs splits revenues with their owners instantly via bKash.
                </p>
              </div>
            </div>

            {marketplaceApis.length === 0 ? (
              <div className="py-24 text-center text-slate-600 border border-slate-800 rounded-2xl bg-slate-900">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">The marketplace registry is empty</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Be the first to record a Chrome browser macro and publish it as public to sell it here!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {marketplaceApis.map(api => (
                  <div key={api.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[280px] justify-between relative overflow-hidden group">
                    {/* Hover Glow */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-3xs uppercase tracking-wider font-mono text-indigo-400 font-semibold bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-900/40">
                          {api.pricePerCall} BDT / call
                        </span>
                        <span className="text-3xs text-slate-500 font-mono">By @{api.ownerName}</span>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-base group-hover:text-indigo-400 transition-all truncate">{api.name}</h4>
                        <p className="text-slate-400 text-xs mt-1 line-clamp-4 font-sans leading-relaxed">{api.description}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-3xs text-slate-500 font-mono">
                        {api.callsCount} calls logged
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveDocsApi(api);
                            setActiveView("docs");
                            setExecutionResult(null);
                          }}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Docs</span>
                        </button>
                        <button
                          id={`test-marketplace-${api.id}`}
                          onClick={() => {
                            setSelectedApi(api);
                            setActiveView("dashboard");
                            setExecutionResult(null);
                            setApiRunError(null);
                            // Initialize inputs
                            const initialParams: Record<string, string> = {};
                            api.clarifications.dynamicParameters.forEach((p: any) => {
                              initialParams[p.name] = p.defaultValue;
                            });
                            setPlaygroundParams(initialParams);
                          }}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-lg shadow-indigo-600/10"
                        >
                          <span>Run / Test</span>
                          <ArrowRight className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: ADMIN PORTAL */}
        {/* SCHEDULER VIEW */}
        {activeView === "scheduler" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-500" />
                Scheduled Runs & Webhooks
              </h1>
              <p className="text-slate-400 mt-2">Set up automated scraping rules and receive webhook alerts when conditions are met.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-2">Active Schedules</h2>
                {schedules.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
                    No active schedules found. Create one to get started!
                  </div>
                ) : (
                  schedules.map(sched => (
                    <div key={sched.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4">
                        <button onClick={() => handleDeleteSchedule(sched.id)} className="text-rose-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          {sched.frequency}
                        </span>
                        <span className="text-slate-300 font-medium">API ID: {sched.apiId}</span>
                      </div>
                      <div className="mb-4">
                        <p className="text-slate-400 text-sm"><span className="text-amber-400">Rule:</span> "{sched.ruleQuery}"</p>
                        <p className="text-slate-400 text-sm truncate"><span className="text-emerald-400">Webhook:</span> {sched.webhookUrl}</p>
                      </div>
                      <div className="text-xs text-slate-500">
                        Last Run: {sched.lastRunAt ? new Date(sched.lastRunAt).toLocaleString() : "Never"}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
                <h2 className="text-xl font-bold text-slate-100 mb-4 border-b border-slate-800 pb-2">Create New Schedule</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target API</label>
                    <select 
                      value={scheduleApiId}
                      onChange={e => {
                        setScheduleApiId(e.target.value);
                        // find api to populate playground params if we want to, skipping for simplicity here
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="">Select an API</option>
                      <optgroup label="My APIs">
                        {myApis.map(api => <option key={api.id} value={api.id}>{api.name}</option>)}
                      </optgroup>
                      <optgroup label="Marketplace APIs">
                        {marketplaceApis.map(api => <option key={api.id} value={api.id}>{api.name}</option>)}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Frequency</label>
                    <select 
                      value={scheduleFrequency}
                      onChange={e => setScheduleFrequency(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Alert Rule (LLM Evaluated)</label>
                    <textarea 
                      value={scheduleRule}
                      onChange={e => setScheduleRule(e.target.value)}
                      placeholder="e.g. 'Is the flight price below 5000 BDT?'"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500 transition-colors h-20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Webhook URL</label>
                    <input 
                      type="url"
                      value={scheduleWebhook}
                      onChange={e => setScheduleWebhook(e.target.value)}
                      placeholder="https://your-server.com/webhook"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <button 
                    onClick={handleCreateSchedule}
                    disabled={scheduleLoading}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {scheduleLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    <span>Save Schedule</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS VIEW */}
        {activeView === "analytics" && (() => {
          const myApiLogs = callLogs.filter(log => myApis.some(api => api.id === log.apiId));

          const latencyData = myApiLogs.map(log => ({
            time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            latency: log.executionTimeMs || 0,
            apiName: log.apiName
          })).slice(-20); // last 20

          const successCount = myApiLogs.filter(log => log.status === "success").length;
          const errorCount = myApiLogs.length - successCount;
          const pieData = [
            { name: "Success", value: successCount },
            { name: "Error", value: errorCount }
          ];
          const pieColors = ["#10b981", "#f43f5e"];

          const earningsMap: Record<string, number> = {};
          myApiLogs.forEach(log => {
            if (log.callerId !== user?.id && log.status === "success") {
              const dateStr = new Date(log.createdAt).toLocaleDateString();
              earningsMap[dateStr] = (earningsMap[dateStr] || 0) + log.cost;
            }
          });
          const earningsData = Object.keys(earningsMap).map(date => ({
            date,
            revenue: earningsMap[date]
          }));

          return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                  <Activity className="w-8 h-8 text-emerald-500" />
                  Analytics & Health
                </h1>
                <p className="text-slate-400 mt-2">Deep insights into your APIs' execution speeds, reliability, and revenue generated.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Latency Chart */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-400" /> API Latency (ms)
                  </h2>
                  <div className="h-64 w-full">
                    {latencyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={latencyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                          <YAxis stroke="#94a3b8" fontSize={12} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            itemStyle={{ color: '#818cf8' }}
                          />
                          <Line type="monotone" dataKey="latency" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">No data available</div>
                    )}
                  </div>
                </div>

                {/* Success/Error Rate */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" /> Success vs Error Rate
                  </h2>
                  <div className="h-64 w-full">
                    {myApiLogs.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            itemStyle={{ color: '#f8fafc' }}
                          />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">No data available</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Earnings Chart */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-400" /> Revenue (BDT)
                </h2>
                <div className="h-72 w-full">
                  {earningsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={earningsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} />
                        <RechartsTooltip 
                          cursor={{ fill: '#1e293b' }}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                          itemStyle={{ color: '#fbbf24' }}
                        />
                        <Bar dataKey="revenue" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500">No earnings data available yet. Share your APIs to start earning!</div>
                  )}
                </div>
              </div>

              {/* API Breakdown Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-slate-200 mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sky-400" /> Individual API Performance Breakdown
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">API Name</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Total Executions</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Success</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Errors</th>
                        <th className="py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Health (Success Rate)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {(() => {
                        const apiBreakdownMap: Record<string, { name: string; total: number; success: number }> = {};
                        myApis.forEach(api => {
                          apiBreakdownMap[api.id] = { name: api.name, total: 0, success: 0 };
                        });
                        myApiLogs.forEach(log => {
                          if (apiBreakdownMap[log.apiId]) {
                            apiBreakdownMap[log.apiId].total += 1;
                            if (log.status === "success") {
                              apiBreakdownMap[log.apiId].success += 1;
                            }
                          }
                        });
                        const breakdownData = Object.values(apiBreakdownMap).sort((a, b) => b.total - a.total);
                        
                        if (breakdownData.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                                You haven't created any APIs yet.
                              </td>
                            </tr>
                          );
                        }

                        return breakdownData.map(data => {
                          const successRate = data.total > 0 ? Math.round((data.success / data.total) * 100) : 0;
                          return (
                            <tr key={data.name} className="hover:bg-slate-800/20 transition-colors">
                              <td className="py-4 px-4 text-sm font-semibold text-slate-200">{data.name}</td>
                              <td className="py-4 px-4 text-sm text-slate-400 text-center">{data.total}</td>
                              <td className="py-4 px-4 text-sm text-emerald-400 text-center font-medium">{data.success}</td>
                              <td className="py-4 px-4 text-sm text-rose-400 text-center font-medium">{data.total - data.success}</td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${successRate >= 90 ? 'bg-emerald-500' : successRate >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                      style={{ width: `${successRate}%` }}
                                    ></div>
                                  </div>
                                  <span className={`text-sm font-bold ${successRate >= 90 ? 'text-emerald-400' : successRate >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                                    {successRate}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          );
        })()}

        {/* API KEYS VIEW */}
        {activeView === "keys" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                <Key className="w-8 h-8 text-purple-500" />
                Developer API Keys
              </h1>
              <p className="text-slate-400 mt-2">Generate secure API keys to integrate your recorded APIs directly into your own applications without exposing your user ID.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" /> Generate New Key
              </h2>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const nameInput = form.elements.namedItem("keyName") as HTMLInputElement;
                  if (!nameInput.value) return;
                  
                  try {
                    const res = await apiFetch("/api/keys/generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: user?.id, name: nameInput.value })
                    });
                    if (res.ok) {
                      nameInput.value = "";
                      // Refresh user
                      const profileRes = await apiFetch(`/api/auth/me/${user?.id}`);
                      const profileData = await profileRes.json();
                      if (profileData.user) setUser(profileData.user);
                    }
                  } catch (err) {
                    console.error("Failed to generate key", err);
                  }
                }}
                className="flex items-end gap-4"
              >
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Key Name</label>
                  <input 
                    name="keyName"
                    type="text" 
                    placeholder="e.g. Production Server, Zapier Integration..." 
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 placeholder:text-slate-600"
                    required
                  />
                </div>
                <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-bold transition-colors whitespace-nowrap">
                  Generate Secret Key
                </button>
              </form>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-bold text-slate-200 mb-4">Your Active Keys</h2>
              {(!user?.apiKeys || user.apiKeys.length === 0) ? (
                <div className="text-slate-500 text-center py-8 bg-slate-950 rounded-lg border border-dashed border-slate-700">
                  You have not generated any API keys yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {user.apiKeys.map(k => (
                    <div key={k.key} className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-200 flex items-center gap-2">
                          {k.name}
                          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">Active</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Created: {new Date(k.createdAt).toLocaleDateString()}</div>
                        <code className="text-purple-400 text-sm mt-2 block bg-slate-900 px-3 py-1.5 rounded border border-slate-800 select-all font-mono">
                          {k.key}
                        </code>
                      </div>
                      <button 
                        onClick={async () => {
                          if (!confirm("Are you sure you want to revoke this key? Any integrations using it will immediately break.")) return;
                          try {
                            const res = await apiFetch("/api/keys", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ userId: user?.id, key: k.key })
                            });
                            if (res.ok) {
                              const profileRes = await apiFetch(`/api/auth/me/${user?.id}`);
                              const profileData = await profileRes.json();
                              if (profileData.user) setUser(profileData.user);
                            }
                          } catch (err) {
                            console.error("Failed to revoke key", err);
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded transition-colors text-sm font-semibold flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-6">
              <h2 className="text-lg font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <Terminal className="w-5 h-5" /> Developer Quickstart
              </h2>
              <p className="text-indigo-200/70 text-sm mb-4">
                Use your generated API key in the <code className="bg-slate-900 px-1 rounded text-slate-300">x-api-key</code> header to authenticate requests securely. 
                Rate limits are set to <strong>60 requests per minute</strong> per key.
              </p>
              <div className="bg-slate-950 p-4 rounded-lg font-mono text-sm text-slate-300 overflow-x-auto border border-slate-800">
                <pre>
                  <span className="text-pink-400">curl</span> -X POST http://localhost:3000/api/apis/run/[API_ID] \<br/>
                  {"  "}-H <span className="text-yellow-300">"Content-Type: application/json"</span> \<br/>
                  {"  "}-H <span className="text-yellow-300">"x-api-key: sec_live_YOUR_KEY_HERE"</span> \<br/>
                  {"  "}-d <span className="text-green-400">'{"{"}"parameters": {"{"}{"}"}{"}"}'</span>
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* DOCS VIEW */}
        {activeView === "docs" && activeDocsApi && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto space-y-6">
            <button 
              onClick={() => {
                setActiveDocsApi(null);
                setActiveView("marketplace"); // default back to marketplace, or user can click other tabs
              }}
              className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold transition-colors mb-4"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to APIs
            </button>
            
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded border border-indigo-500/20 uppercase tracking-wider">
                  REST API
                </span>
                <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3" /> API Key Auth
                </span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-4">{activeDocsApi.name}</h1>
              <p className="text-slate-400 text-base leading-relaxed max-w-3xl font-sans">{activeDocsApi.description}</p>
              
              <div className="mt-8 pt-6 border-t border-slate-800 flex items-center gap-4">
                <span className="font-bold text-slate-300">Base URL</span>
                <code className="text-sm bg-slate-950 border border-slate-800 px-4 py-2 rounded-lg text-slate-300 font-mono shadow-inner select-all">
                  <span className="text-pink-500 font-bold mr-2">POST</span>
                  http://localhost:3000/api/apis/run/{activeDocsApi.id}
                </code>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Parameters & Request Body (Left Col) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-400" /> Request Parameters
                  </h2>
                  <p className="text-sm text-slate-400 mb-6">Pass these parameters inside the <code className="text-indigo-300 bg-slate-800 px-1 rounded">parameters</code> JSON object in the request body.</p>
                  
                  {activeDocsApi.clarifications.dynamicParameters.length === 0 ? (
                    <div className="text-slate-500 bg-slate-950 p-4 rounded-lg border border-slate-800 text-center text-sm font-sans">
                      This API does not require any parameters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-800">
                            <th className="py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Field</th>
                            <th className="py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                            <th className="py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Default</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {activeDocsApi.clarifications.dynamicParameters.map(param => (
                            <tr key={param.name}>
                              <td className="py-4 px-2">
                                <span className="font-mono text-sm font-bold text-indigo-300">{param.name}</span>
                              </td>
                              <td className="py-4 px-2">
                                <span className="text-xs font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{param.type || 'string'}</span>
                              </td>
                              <td className="py-4 px-2 text-sm text-slate-300 font-sans">{param.description}</td>
                              <td className="py-4 px-2 text-sm text-slate-500 font-mono break-all">{param.defaultValue || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-400" /> Response Format
                  </h2>
                  <p className="text-sm text-slate-400 mb-4">A successful execution will return a JSON object with <code className="text-indigo-300 bg-slate-800 px-1 rounded">success: true</code> and the scraped <code className="text-emerald-300 bg-slate-800 px-1 rounded">data</code>.</p>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto shadow-inner">
                    <pre className="text-sm font-mono text-slate-300">
{`{
  "success": true,
  "data": {
    "result": [ ... ]
  },
  "executionTimeMs": 1450,
  "cost": ${activeDocsApi.pricePerCall}
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Code Snippets (Right Col) */}
              <div className="lg:col-span-5">
                <div className="bg-[#0d1117] border border-slate-800 rounded-2xl overflow-hidden sticky top-6 shadow-2xl">
                  <div className="bg-[#161b22] border-b border-slate-800 px-4 py-3 flex gap-4 overflow-x-auto no-scrollbar">
                    {["curl", "python", "node", "go"].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveSnippetTab(lang as any)}
                        className={`text-xs font-bold font-mono tracking-wider transition-colors whitespace-nowrap ${activeSnippetTab === lang ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  
                  <div className="p-4 overflow-x-auto text-sm font-mono leading-loose shadow-inner">
                    {activeSnippetTab === "curl" && (
                      <pre className="text-slate-300">
<span className="text-pink-400">curl</span> -X POST http://localhost:3000/api/apis/run/{activeDocsApi.id} \
  -H <span className="text-yellow-300">"Content-Type: application/json"</span> \
  -H <span className="text-yellow-300">"x-api-key: sec_live_YOUR_KEY_HERE"</span> \
  -d <span className="text-green-400">'{JSON.stringify({
    parameters: activeDocsApi.clarifications.dynamicParameters.reduce((acc: any, p: any) => {
      acc[p.name] = p.defaultValue;
      return acc;
    }, {})
  }, null, 2)}'</span>
                      </pre>
                    )}
                    
                    {activeSnippetTab === "python" && (
                      <pre className="text-slate-300">
<span className="text-pink-400">import</span> requests
<span className="text-pink-400">import</span> json

url = <span className="text-yellow-300">"http://localhost:3000/api/apis/run/{activeDocsApi.id}"</span>
headers = {'{'}
  <span className="text-yellow-300">"Content-Type"</span>: <span className="text-yellow-300">"application/json"</span>,
  <span className="text-yellow-300">"x-api-key"</span>: <span className="text-yellow-300">"sec_live_YOUR_KEY_HERE"</span>
{'}'}
payload = {'{'}
  <span className="text-yellow-300">"parameters"</span>: {JSON.stringify(activeDocsApi.clarifications.dynamicParameters.reduce((acc: any, p: any) => {
    acc[p.name] = p.defaultValue;
    return acc;
  }, {}), null, 4).replace(/"/g, '"').replace(/\n/g, '\n  ')}
{'}'}

response = requests.post(url, headers=headers, json=payload)
<span className="text-sky-400">print</span>(response.json())
                      </pre>
                    )}

                    {activeSnippetTab === "node" && (
                      <pre className="text-slate-300">
<span className="text-pink-400">const</span> fetch = <span className="text-sky-400">require</span>(<span className="text-yellow-300">'node-fetch'</span>);

<span className="text-pink-400">const</span> url = <span className="text-yellow-300">'http://localhost:3000/api/apis/run/{activeDocsApi.id}'</span>;
<span className="text-pink-400">const</span> options = {'{'}
  method: <span className="text-yellow-300">'POST'</span>,
  headers: {'{'}
    <span className="text-yellow-300">'Content-Type'</span>: <span className="text-yellow-300">'application/json'</span>,
    <span className="text-yellow-300">'x-api-key'</span>: <span className="text-yellow-300">'sec_live_YOUR_KEY_HERE'</span>
  {'}'},
  body: <span className="text-emerald-400">JSON</span>.stringify({'{'}
    parameters: {JSON.stringify(activeDocsApi.clarifications.dynamicParameters.reduce((acc: any, p: any) => {
      acc[p.name] = p.defaultValue;
      return acc;
    }, {}), null, 4).replace(/\n/g, '\n    ')}
  {'}'})
{'}'};

fetch(url, options)
  .then(res {`=>`} res.json())
  .then(json {`=>`} console.log(json))
  .catch(err {`=>`} console.error(<span className="text-yellow-300">'error:'</span>, err));
                      </pre>
                    )}

                    {activeSnippetTab === "go" && (
                      <pre className="text-slate-300">
<span className="text-pink-400">package</span> main

<span className="text-pink-400">import</span> (
	<span className="text-yellow-300">"bytes"</span>
	<span className="text-yellow-300">"fmt"</span>
	<span className="text-yellow-300">"net/http"</span>
	<span className="text-yellow-300">"io/ioutil"</span>
)

<span className="text-pink-400">func</span> <span className="text-sky-400">main</span>() {'{'}
	url := <span className="text-yellow-300">"http://localhost:3000/api/apis/run/{activeDocsApi.id}"</span>
	payload := []<span className="text-emerald-400">byte</span>(<span className="text-yellow-300">`{"{"}"parameters": {JSON.stringify(activeDocsApi.clarifications.dynamicParameters.reduce((acc: any, p: any) => {
    acc[p.name] = p.defaultValue;
    return acc;
  }, {}))} {"}"}`</span>)

	req, _ := http.NewRequest(<span className="text-yellow-300">"POST"</span>, url, bytes.NewBuffer(payload))
	req.Header.Add(<span className="text-yellow-300">"Content-Type"</span>, <span className="text-yellow-300">"application/json"</span>)
	req.Header.Add(<span className="text-yellow-300">"x-api-key"</span>, <span className="text-yellow-300">"sec_live_YOUR_KEY_HERE"</span>)

	res, _ := http.DefaultClient.Do(req)
	<span className="text-pink-400">defer</span> res.Body.Close()

	body, _ := ioutil.ReadAll(res.Body)
	fmt.Println(<span className="text-sky-400">string</span>(body))
{'}'}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === "admin" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-500" />
                  Admin Payment Verification Panel
                </h2>
                <p className="text-slate-400 text-sm mt-1 font-sans">
                  Manually review, approve, or reject incoming user bKash deposits. Approving a request instantly credits the user's wallet.
                </p>
              </div>
              <button
                onClick={fetchAdminTransactions}
                disabled={adminLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? "animate-spin" : ""}`} />
                <span>Refresh Log</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-4 font-bold uppercase tracking-wider">Date</th>
                      <th className="p-4 font-bold uppercase tracking-wider">User</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Amount (BDT)</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Transaction ID</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Sender Number</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Status</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {adminTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-500 font-sans">
                          No transactions found in database store.
                        </td>
                      </tr>
                    ) : (
                      adminTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-950/40 transition-colors">
                          <td className="p-4 text-slate-400 text-2xs">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="p-4 font-bold text-white font-sans">
                            @{tx.username}
                          </td>
                          <td className="p-4 font-extrabold text-white text-sm">
                            {tx.amount} BDT
                          </td>
                          <td className="p-4 text-indigo-400 font-bold select-all">
                            {tx.trxId}
                          </td>
                          <td className="p-4 text-slate-300">
                            {tx.senderNumber}
                          </td>
                          <td className="p-4">
                            {tx.status === "approved" && (
                              <span className="px-2 py-0.5 rounded text-3xs font-bold border border-emerald-900/50 bg-emerald-950/40 text-emerald-400">
                                Approved
                              </span>
                            )}
                            {tx.status === "rejected" && (
                              <span className="px-2 py-0.5 rounded text-3xs font-bold border border-rose-900/50 bg-rose-950/40 text-rose-400">
                                Rejected
                              </span>
                            )}
                            {tx.status === "pending" && (
                              <span className="px-2 py-0.5 rounded text-3xs font-bold border border-amber-900/50 bg-amber-950/40 text-amber-400 animate-pulse">
                                Pending Verification
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {tx.status === "pending" ? (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleRejectTransaction(tx.id)}
                                  className="px-2.5 py-1 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/40 text-rose-400 text-3xs font-bold rounded cursor-pointer transition-all"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleApproveTransaction(tx.id)}
                                  className="px-2.5 py-1 bg-emerald-950/40 border border-emerald-900/50 hover:bg-emerald-900/40 text-emerald-400 text-3xs font-bold rounded cursor-pointer transition-all"
                                >
                                  Approve
                                </button>
                              </div>
                            ) : (
                              <span className="text-3xs text-slate-600 italic">No Actions</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* API MODERATION PANEL */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-rose-500" />
                  Marketplace API Moderation Panel
                </h2>
                <p className="text-slate-400 text-sm mt-1 font-sans">
                  Review and permanently remove registered scraper APIs from the marketplace registry directory.
                </p>
              </div>
              <button
                onClick={fetchAdminApis}
                disabled={adminApisLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${adminApisLoading ? "animate-spin" : ""}`} />
                <span>Refresh Directory</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="p-4 font-bold uppercase tracking-wider">Scraper Name</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Creator</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Pricing</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Visibility</th>
                      <th className="p-4 font-bold uppercase tracking-wider">Total Calls</th>
                      <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {adminApis.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500 font-sans">
                          No scraper APIs registered in database directory.
                        </td>
                      </tr>
                    ) : (
                      adminApis.map((api) => (
                        <tr key={api.id} className="hover:bg-slate-950/40 transition-colors">
                          <td className="p-4 font-sans font-bold text-white max-w-[200px] truncate">
                            {api.name}
                            <span className="block text-3xs font-mono text-slate-500 truncate mt-0.5">{api.id}</span>
                          </td>
                          <td className="p-4 font-bold text-slate-300 font-sans">
                            @{api.ownerName}
                          </td>
                          <td className="p-4 text-emerald-400 font-bold text-sm">
                            {api.pricePerCall} BDT / Call
                          </td>
                          <td className="p-4">
                            {api.isPrivate ? (
                              <span className="px-2 py-0.5 rounded text-3xs font-bold border border-slate-850 bg-slate-950 text-slate-500">
                                Private (Creator Only)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-3xs font-bold border border-indigo-900/50 bg-indigo-950/40 text-indigo-400">
                                Public Marketplace
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-300 font-bold">
                            {api.callsCount} calls
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleAdminDeleteApi(api.id)}
                              className="px-2.5 py-1 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/40 text-rose-400 text-3xs font-bold rounded cursor-pointer transition-all hover:border-rose-700/60"
                            >
                              Remove Scraper
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* AI CLARIFICATION OVERLAY / DIALOG (LLM to clarify from user. OK Button) */}
      {clarificationResult && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="bg-slate-950 p-6 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white font-sans">AI Bot Clarifying Interaction</h3>
              </div>
              <span className="text-3xs uppercase tracking-wider font-mono bg-indigo-950 px-2 py-0.5 rounded border border-indigo-900/60 text-indigo-400 font-semibold">
                Gemini Resolved
              </span>
            </div>

            {/* Scrollable Clarification Panel */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              <div className="space-y-2 bg-indigo-950/15 border border-indigo-900/30 p-4 rounded-xl">
                <p className="font-bold text-indigo-400 font-mono uppercase tracking-wide">Analysis of captured steps</p>
                <p className="text-slate-300 font-sans leading-relaxed text-xs">
                  {clarificationResult.explanation}
                </p>
              </div>

              {clarificationResult.questions && clarificationResult.questions.length > 0 && (
                <div className="space-y-3">
                  <p className="font-bold text-slate-300 uppercase tracking-wide font-mono flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-pink-400" />
                    Clarification Questions & Recommendations
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-400 font-sans pl-1">
                    {clarificationResult.questions.map((question: string, qIdx: number) => (
                      <li key={qIdx} className="leading-relaxed">{question}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* API settings form */}
              <div className="border-t border-slate-800 pt-5 space-y-4">
                <p className="font-bold text-white uppercase tracking-wider font-mono">Define Endpoint Credentials</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-slate-400 font-mono">Public Endpoint Name</label>
                    <input
                      id="api-name-form"
                      type="text"
                      value={apiName}
                      onChange={(e) => setApiName(e.target.value)}
                      placeholder="e.g. Amazon Electronics Price"
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-400 font-mono">Cost Per Call (BDT)</label>
                    <input
                      id="api-price-form"
                      type="number"
                      value={apiPrice}
                      onChange={(e) => setApiPrice(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-400 font-mono">Endpoint Description</label>
                  <textarea
                    id="api-desc-form"
                    value={apiDesc}
                    onChange={(e) => setApiDesc(e.target.value)}
                    placeholder="Describe what data fields this API returns to external consumers..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>

                {/* Privacy trigger */}
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-850">
                  <div className="font-sans">
                    <p className="font-bold text-slate-300">Set API to Private</p>
                    <p className="text-3xs text-slate-500 mt-0.5">If private, it will not show in the shared marketplace.</p>
                  </div>
                  <input
                    id="api-private-toggle"
                    type="checkbox"
                    checked={apiIsPrivate}
                    onChange={(e) => setApiIsPrivate(e.target.checked)}
                    className="w-5 h-5 accent-indigo-500"
                  />
                </div>
              </div>

            </div>

            {/* OK Submit button */}
            <div className="bg-slate-950 p-4 border-t border-slate-850 flex gap-3 justify-end">
              <button
                id="cancel-save-api"
                onClick={() => setClarificationResult(null)}
                className="px-4 py-2 border border-slate-800 hover:bg-slate-900 rounded-lg text-xs font-semibold cursor-pointer transition-all text-slate-400 hover:text-white"
              >
                Go Back
              </button>
              <button
                id="api-save-ok-btn"
                onClick={handleSaveApi}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shadow-lg"
              >
                <span>OK, Save API</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* bKash Add Money Portal Modal */}
      {showBkash && (
        <BkashPortal 
          userId={user.id} 
          onPaymentSuccess={(updatedUser) => setUser(updatedUser)} 
          onClose={() => { setShowBkash(false); fetchDashboardData(); }} 
        />
      )}

      {/* Toast notifications */}
      {copiedText && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-indigo-500 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-mono z-50 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Copied reference block successfully!</span>
        </div>
      )}

    </div>
  );
}
