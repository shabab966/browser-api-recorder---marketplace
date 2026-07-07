import fs from "fs";
import path from "path";

export interface User {
  id: string;
  username: string;
  balance: number; // in BDT (Taka)
  freeAttemptsUsed: { [dateStr: string]: number }; // tracks daily attempts
  createdAt: string;
}

export interface BrowserStep {
  id: string;
  action: "navigate" | "click" | "input" | "scrape";
  url?: string;
  selector?: string;
  value?: string;
  description: string;
}

export interface ApiItem {
  id: string;
  ownerId: string;
  ownerName: string;
  name: string;
  description: string;
  isPrivate: boolean;
  pricePerCall: number; // in BDT, 0 means free (but requires trial or balance)
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

export interface BkashTransaction {
  id: string;
  userId: string;
  username: string;
  amount: number;
  trxId: string;
  senderNumber: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface ApiCallLog {
  id: string;
  apiId: string;
  apiName: string;
  callerId: string;
  callerName: string;
  parameters: Record<string, any>;
  status: "success" | "failed";
  response: any;
  cost: number;
  executionTimeMs: number;
  createdAt: string;
}

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

const STORE_FILE = process.env.DATA_STORE_PATH || path.join(process.cwd(), "data-store.json");

interface DataStore {
  users: Record<string, User>;
  apis: Record<string, ApiItem>;
  transactions: BkashTransaction[];
  logs: ApiCallLog[];
  schedules: ApiSchedule[];
}

let store: DataStore = {
  users: {},
  apis: {},
  transactions: [],
  logs: [],
  schedules: [],
};

// Initial setup with a pre-created demo user or sample APIs
function loadStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, "utf-8");
      store = JSON.parse(content);
    } else {
      // Seed initial data
      store = {
        users: {
          "demo-user": {
            id: "demo-user",
            username: "shabab",
            balance: 50,
            freeAttemptsUsed: {},
            createdAt: new Date().toISOString(),
          },
        },
        apis: {
          "hn-scraper": {
            id: "hn-scraper",
            ownerId: "demo-user",
            ownerName: "shabab",
            name: "Hacker News Scraper",
            description: "Automatically extracts top stories, headlines, and score links from Hacker News in real time.",
            isPrivate: false,
            pricePerCall: 2,
            steps: [
              {
                id: "step-1",
                action: "navigate",
                url: "https://news.ycombinator.com",
                description: "Navigate to Hacker News",
              },
              {
                id: "step-2",
                action: "scrape",
                selector: ".titleline",
                description: "Scrape article titles and URLs",
              },
            ],
            clarifications: {
              explanation: "This API extracts the front-page articles from Hacker News, outputting their titles and corresponding URLs as a clean list.",
              questions: [
                "Should this API allow limiting the number of scraped stories via a query parameter?",
                "Would you like to include story scores (points) in the scrape target?"
              ],
              dynamicParameters: [
                {
                  name: "limit",
                  type: "number",
                  description: "Maximum stories to return (default 10)",
                  defaultValue: "10"
                }
              ]
            },
            callsCount: 14,
            revenueEarned: 28,
            createdAt: new Date().toISOString(),
          },
        },
        transactions: [
          {
            id: "tx-1",
            userId: "demo-user",
            username: "shabab",
            amount: 50,
            trxId: "BK91A0Z8X",
            senderNumber: "01711750169",
            status: "approved",
            createdAt: new Date().toISOString(),
          }
        ],
        logs: []
      };
      saveStore();
    }
  } catch (error) {
    console.error("Failed to load datastore, starting fresh:", error);
  }
}

export function saveStore() {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save data-store:", err);
  }
}

// Initialize the store
loadStore();

export const dbStore = {
  getUsers: () => store.users,
  getUser: (id: string) => store.users[id],
  getUserByName: (username: string) => Object.values(store.users).find(u => u.username.toLowerCase() === username.toLowerCase()),
  saveStore: () => saveStore(),
  createUser: (username: string): User => {
    const existing = Object.values(store.users).find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) return existing;
    const newUser: User = {
      id: "usr-" + Math.random().toString(36).substring(2, 9),
      username,
      balance: 10, // starts with 10 BDT welcome bonus!
      freeAttemptsUsed: {},
      createdAt: new Date().toISOString(),
    };
    store.users[newUser.id] = newUser;
    saveStore();
    return newUser;
  },
  updateUser: (user: User) => {
    store.users[user.id] = user;
    saveStore();
  },

  getApis: () => Object.values(store.apis),
  getApi: (id: string) => store.apis[id],
  createApi: (api: Omit<ApiItem, "callsCount" | "revenueEarned" | "createdAt">): ApiItem => {
    const newApi: ApiItem = {
      ...api,
      callsCount: 0,
      revenueEarned: 0,
      createdAt: new Date().toISOString(),
    };
    store.apis[newApi.id] = newApi;
    saveStore();
    return newApi;
  },
  deleteApi: (id: string) => {
    delete store.apis[id];
    saveStore();
  },

  getTransactions: () => store.transactions,
  addTransaction: (tx: Omit<BkashTransaction, "id" | "createdAt">): BkashTransaction => {
    const newTx: BkashTransaction = {
      ...tx,
      id: "trx-" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    
    // Add amount to user's balance only if it's approved
    if (newTx.status === "approved") {
      const user = store.users[tx.userId];
      if (user) {
        user.balance += tx.amount;
        store.users[user.id] = user;
      }
    }
    
    store.transactions.unshift(newTx);
    saveStore();
    return newTx;
  },

  approveTransaction: (txId: string): BkashTransaction | null => {
    const tx = store.transactions.find(t => t.id === txId);
    if (!tx || tx.status !== "pending") return null;
    
    tx.status = "approved";
    const user = store.users[tx.userId];
    if (user) {
      user.balance += tx.amount;
      store.users[user.id] = user;
    }
    saveStore();
    return tx;
  },

  rejectTransaction: (txId: string): BkashTransaction | null => {
    const tx = store.transactions.find(t => t.id === txId);
    if (!tx || tx.status !== "pending") return null;
    
    tx.status = "rejected";
    saveStore();
    return tx;
  },

  getLogs: () => store.logs,
  addLog: (log: Omit<ApiCallLog, "id" | "createdAt">): ApiCallLog => {
    const newLog: ApiCallLog = {
      ...log,
      id: "log-" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    store.logs.unshift(newLog);
    saveStore();
    return newLog;
  },

  getSchedules: () => store.schedules || [],
  createSchedule: (schedule: Omit<ApiSchedule, "id" | "createdAt" | "lastRunAt" | "lastResult" | "isActive">): ApiSchedule => {
    const newSchedule: ApiSchedule = {
      ...schedule,
      id: "sched-" + Math.random().toString(36).substring(2, 9),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    if (!store.schedules) store.schedules = [];
    store.schedules.push(newSchedule);
    saveStore();
    return newSchedule;
  },
  updateSchedule: (id: string, updates: Partial<ApiSchedule>): ApiSchedule | null => {
    if (!store.schedules) return null;
    const idx = store.schedules.findIndex(s => s.id === id);
    if (idx === -1) return null;
    store.schedules[idx] = { ...store.schedules[idx], ...updates };
    saveStore();
    return store.schedules[idx];
  },
  deleteSchedule: (id: string) => {
    if (!store.schedules) return;
    store.schedules = store.schedules.filter(s => s.id !== id);
    saveStore();
  },
};
