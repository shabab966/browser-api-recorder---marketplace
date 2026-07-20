import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { dbStore, rateLimits } from "./server-state.js";
import { simulateApiExecution, clarifyRecordedApi } from "./server-gemini.js";
import { executeBrowserActions } from "./server-puppeteer.js";
import { engine, startSchedulerEngine } from "./server-scheduler.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_secret_key_123";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

// Authentication Middleware
export 
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  authenticateJWT(req, res, () => {
    // Check if user is admin
    const user = dbStore.getUser((req as any).user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  });
};

const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err, user: any) => {
      if (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: "Authorization header missing" });
  }
};

async function startServer() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminUsername && adminPassword) {
    const existingAdmin = dbStore.getUserByName(adminUsername);
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(adminPassword, salt);
      dbStore.createUser(adminUsername, hash, true);
      console.log('✅ Auto-provisioned Admin Account:', adminUsername);
    } else if (!existingAdmin.isAdmin) {
      existingAdmin.isAdmin = true;
      dbStore.saveStore();
      console.log('✅ Elevated existing account to Admin:', adminUsername);
    }
  }

  const PORT = 3000;

  // Rate Limiting Map
  const rateLimits = new Map<string, { count: number, resetAt: number }>();

  // Body parser
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API ROUTES FIRST

  // Auth: signup
  app.post("/api/auth/signup", (req, res) => {
    const { username, password } = req.body;
    if (!username || username.trim() === "" || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    const cleanUsername = username.trim();
    
    const adminUsername = process.env.ADMIN_USERNAME?.toLowerCase();
    if (adminUsername && cleanUsername.toLowerCase() === adminUsername) {
      return res.status(403).json({ error: "Cannot register with reserved administrator username" });
    }

    const existing = dbStore.getUserByName(cleanUsername);
    if (existing) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = dbStore.createUser(cleanUsername, passwordHash);

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ user, token });
  });

  // Auth: login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || username.trim() === "" || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const user = dbStore.getUserByName(username.trim());
    if (!user) {
      return res.status(404).json({ error: "User not found. Please Sign up!" });
    }

    if (!user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ user, token });
  });

  // Auth: me
  app.get("/api/auth/me/:userId", authenticateJWT, (req, res) => {
    const { userId } = req.params;
    const user = dbStore.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user });
  });

  // Keys: Generate new API key
  app.post("/api/keys/generate", authenticateJWT, (req, res) => {
    const { userId, name } = req.body;
    if (!userId || !name) {
      return res.status(400).json({ error: "User ID and Name are required" });
    }
    const newKey = dbStore.generateApiKey(userId, name);
    if (!newKey) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ key: newKey });
  });

  // Keys: Revoke API key
  app.delete("/api/keys", authenticateJWT, (req, res) => {
    const { userId, key } = req.body;
    if (!userId || !key) {
      return res.status(400).json({ error: "User ID and Key are required" });
    }
    const success = dbStore.revokeApiKey(userId, key);
    if (!success) {
      return res.status(400).json({ error: "Invalid key or user" });
    }
    return res.json({ success: true });
  });

  // BKash: Deposit
  app.post("/api/bkash/deposit", authenticateJWT, (req, res) => {
    const { userId, amount, trxId, senderNumber } = req.body;
    if (!userId || !amount || !trxId || !senderNumber) {
      return res.status(400).json({ error: "All bKash payment details are required (Amount, TrxID, Sender number)" });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const tx = dbStore.addTransaction({
      userId,
      username: dbStore.getUser(userId)?.username || "Unknown",
      amount: parsedAmount,
      trxId: trxId.trim().toUpperCase(),
      senderNumber: senderNumber.trim(),
      status: "pending",
    });

    return res.json({ 
      message: `Successfully submitted deposit request of ${parsedAmount} BDT! Please wait for admin verification.`, 
      transaction: tx, 
      user: dbStore.getUser(userId) 
    });
  });

  // Admin: Get all transactions
  app.get("/api/admin/transactions", requireAdmin, (req, res) => {
    return res.json({ transactions: dbStore.getTransactions() });
  });

  // Admin: Approve transaction
  app.post("/api/admin/transactions/approve/:txId", requireAdmin, (req, res) => {
    const { txId } = req.params;
    const tx = dbStore.approveTransaction(txId);
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found or already verified." });
    }
    return res.json({ message: "Transaction approved successfully!", transaction: tx });
  });

  // Admin: Reject transaction
  app.post("/api/admin/transactions/reject/:txId", requireAdmin, (req, res) => {
    const { txId } = req.params;
    const tx = dbStore.rejectTransaction(txId);
    if (!tx) {
      return res.status(404).json({ error: "Transaction not found or already verified." });
    }
  });

  // Admin: Delete/Remove API from marketplace
  app.post("/api/admin/apis/delete", requireAdmin, (req, res) => {
    const { apiId } = req.body;
    if (!apiId) {
      return res.status(400).json({ error: "Missing apiId in delete request." });
    }
    const apiExists = dbStore.getApi(apiId);
    if (!apiExists) {
      return res.status(404).json({ error: "API not found in database." });
    }
    dbStore.deleteApi(apiId);
    return res.json({ message: "API successfully removed from the marketplace!" });
  });

  // Recorder: LLM Clarify
  app.post("/api/recorder/clarify", async (req, res) => {
    const { steps } = req.body;
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "No recorded steps to clarify." });
    }

    try {
      const clarification = await clarifyRecordedApi(steps);
      return res.json(clarification);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to clarify with LLM" });
    }
  });

  // API: Save/Create API
  app.post("/api/apis/create", authenticateJWT, (req, res) => {
    const { ownerId, name, description, isPrivate, pricePerCall, steps, clarifications } = req.body;
    if (!ownerId || !name || !steps || !clarifications) {
      return res.status(400).json({ error: "Missing required fields to save the API." });
    }

    const user = dbStore.getUser(ownerId);
    if (!user) {
      return res.status(404).json({ error: "Owner user not found" });
    }

    const apiId = "api-" + Math.random().toString(36).substring(2, 9);
    const newApi = dbStore.createApi({
      id: apiId,
      ownerId,
      ownerName: user.username,
      name: name.trim(),
      description: description?.trim() || "Automated browser scenario",
      isPrivate: !!isPrivate,
      pricePerCall: Math.max(0, parseFloat(pricePerCall) || 0),
      steps,
      clarifications,
    });

    return res.json({ message: "API successfully saved and registered!", api: newApi });
  });

  // Admin: Get all registered APIs
  app.get("/api/apis", (req, res) => {
    const apis = dbStore.getApis();
    return res.json(apis);
  });

  // API: Get personal APIs
  app.get("/api/apis/my/:userId", authenticateJWT, (req, res) => {
    const { userId } = req.params;
    const apis = dbStore.getApis().filter(api => api.ownerId === userId);
    return res.json({ apis });
  });

  // API: Get Marketplace APIs
  app.get("/api/apis/marketplace", (req, res) => {
    const apis = dbStore.getApis().filter(api => !api.isPrivate);
    return res.json({ apis });
  });

  // Schedules: Get user schedules
  app.get("/api/schedules/:userId", authenticateJWT, (req, res) => {
    const { userId } = req.params;
    const schedules = dbStore.getSchedules().filter(s => s.userId === userId);
    return res.json({ schedules });
  });

  // Schedules: Create schedule
  app.post("/api/schedules/create", authenticateJWT, (req, res) => {
    const { apiId, userId, parameters, frequency, ruleQuery, webhookUrl } = req.body;
    if (!apiId || !userId || !frequency || !ruleQuery || !webhookUrl) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    const schedule = dbStore.createSchedule({
      apiId, userId, parameters: parameters || {}, frequency, ruleQuery, webhookUrl
    });
    return res.json({ schedule });
  });

  // Schedules: Delete schedule
  app.post("/api/schedules/delete/:scheduleId", authenticateJWT, (req, res) => {
    const { scheduleId } = req.params;
    dbStore.deleteSchedule(scheduleId);
    return res.json({ success: true });
  });

  // API: Run recorded browser scenario
  app.post("/api/apis/run/:apiId", async (req, res) => {
    const { apiId } = req.params;
    const { parameters } = req.body;
    let callerId = req.body.callerId;
    
    // API Key Authentication & Rate Limiting
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const keyOwner = dbStore.getUserByApiKey(apiKey);
      if (!keyOwner) {
        return res.status(401).json({ error: "Invalid API Key" });
      }
      callerId = keyOwner.id;

      const now = Date.now();
      const limitData = rateLimits.get(apiKey) || { count: 0, resetAt: now + 60000 };
      
      if (now > limitData.resetAt) {
        limitData.count = 1;
        limitData.resetAt = now + 60000;
      } else {
        limitData.count++;
      }
      rateLimits.set(apiKey, limitData);

      if (limitData.count > 60) {
        return res.status(429).json({ error: "Too Many Requests. Rate limit of 60 requests per minute exceeded." });
      }
    }

    if (!callerId) {
      return res.status(400).json({ error: "Caller User ID or x-api-key header is required" });
    }

    const caller = dbStore.getUser(callerId);
    if (!caller) {
      return res.status(404).json({ error: "Caller user not found" });
    }

    const apiItem = dbStore.getApi(apiId);
    if (!apiItem) {
      return res.status(404).json({ error: "API not found" });
    }

    // Security check: cannot call someone else's private API
    if (apiItem.isPrivate && apiItem.ownerId !== callerId) {
      return res.status(403).json({ error: "This API is private and can only be called by its owner." });
    }

    // Billing Engine Check:
    // 1. Is it the owner calling? Owner calls their own API for free!
    // 2. If not the owner: Check if free trial is available (5 free attempts per day)
    // 3. Otherwise: Charge the apiItem.pricePerCall from caller's bKash balance!
    const isOwner = apiItem.ownerId === callerId;
    let cost = 0;
    let bKashCharged = false;
    let dateStr = new Date().toISOString().split("T")[0];

    if (!isOwner) {
      const freeUsed = caller.freeAttemptsUsed[dateStr] || 0;
      if (freeUsed < 5) {
        // Use a free trial attempt!
        caller.freeAttemptsUsed[dateStr] = freeUsed + 1;
        dbStore.updateUser(caller);
      } else {
        // Need to pay!
        cost = apiItem.pricePerCall;
        if (caller.balance < cost) {
          return res.status(402).json({
            error: `Insufficient balance! You have used your 5 free trial attempts for today. This API costs ${cost} BDT per call. Please add money using bKash send money to continue.`,
            freeAttemptsUsedToday: freeUsed,
            currentBalance: caller.balance
          });
        }
        // Deduct balance from caller
        caller.balance -= cost;
        dbStore.updateUser(caller);
        bKashCharged = true;

        // Pay API owner (minus 10% platform fee)
        const owner = dbStore.getUser(apiItem.ownerId);
        if (owner) {
          const earnings = cost * 0.9;
          owner.balance += earnings;
          dbStore.updateUser(owner);
          
          apiItem.revenueEarned += earnings;
        }
      }
    }

    // Run the scenario using our selected scraper engine
    const engine = req.body.engine || req.query.engine || "gemini";
    const startTime = Date.now();
    try {
      let result;
      if (engine === "puppeteer") {
        result = await executePuppeteerSteps(
          apiItem.steps,
          parameters || {},
          apiItem.clarifications?.dynamicParameters || []
        );
      } else {
        result = await simulateApiExecution(apiItem.steps, parameters || {});
      }
      const executionTimeMs = Date.now() - startTime;

      // Update API stats
      apiItem.callsCount += 1;
      dbStore.saveStore();

      // Log the execution
      const log = dbStore.addLog({
        apiId,
        apiName: apiItem.name,
        callerId,
        callerName: caller.username,
        parameters: parameters || {},
        status: "success",
        response: result,
        cost,
        executionTimeMs,
      });

      return res.json({
        success: true,
        apiId,
        apiName: apiItem.name,
        executionTimeMs,
        costCharged: cost,
        freeAttemptsRemaining: Math.max(0, 5 - (caller.freeAttemptsUsed[dateStr] || 0)),
        data: result,
        logId: log.id,
      });
    } catch (executionError: any) {
      const executionTimeMs = Date.now() - startTime;
      
      const log = dbStore.addLog({
        apiId,
        apiName: apiItem.name,
        callerId,
        callerName: caller.username,
        parameters: parameters || {},
        status: "failed",
        response: { error: executionError.message || "Failed during simulation" },
        cost: 0, // refund if failed
        executionTimeMs,
      });

      // Refund if bKash was charged but execution failed completely
      if (bKashCharged) {
        caller.balance += cost;
        dbStore.updateUser(caller);
        
        // Subtract from owner too if they got credited
        const owner = dbStore.getUser(apiItem.ownerId);
        if (owner) {
          owner.balance -= cost * 0.9;
          dbStore.updateUser(owner);
          apiItem.revenueEarned -= cost * 0.9;
        }
      }

      return res.status(500).json({
        success: false,
        error: "Execution failed during virtual browser emulation: " + executionError.message,
        logId: log.id
      });
    }
  });

  // Get metrics and history logs
  app.get("/api/logs/:userId", authenticateJWT, (req, res) => {
    const { userId } = req.params;
    // Get logs where the user is either the caller or the owner of the API
    const myApiIds = dbStore.getApis().filter(api => api.ownerId === userId).map(api => api.id);
    const logs = dbStore.getLogs().filter(log => log.callerId === userId || myApiIds.includes(log.apiId));
    return res.json({ logs });
  });

  // Get user's transaction history
  app.get("/api/transactions/:userId", authenticateJWT, (req, res) => {
    const { userId } = req.params;
    const txs = dbStore.getTransactions().filter(tx => tx.userId === userId);
    return res.json({ transactions: txs });
  });

  // Chrome Extension / share tool config generator
  app.get("/api/chrome-extension/config", (req, res) => {
    // Returns dynamic code snippet for Chrome Extension
    const extensionCode = {
      manifest: {
        manifest_version: 3,
        name: "Browser API Recorder Plugin",
        version: "1.0",
        description: "Directly record, edit, and turn actions on any page into APIs instantly.",
        permissions: ["activeTab", "storage", "scripting"],
        background: {
          service_worker: "background.js"
        },
        action: {
          default_popup: "popup.html",
          default_icon: "icon.png"
        }
      },
      backgroundJs: `// Chrome Extension Background Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "RECORD_STEP") {
    chrome.storage.local.get({ steps: [] }, (data) => {
      const updatedSteps = [...data.steps, message.step];
      chrome.storage.local.set({ steps: updatedSteps }, () => {
        console.log("Recorded Action:", message.step);
      });
    });
  }
});`,
      popupHtml: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 15px; font-family: sans-serif; background: #0f172a; color: #f8fafc; }
    button { width: 100%; padding: 10px; margin: 5px 0; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
    .btn-record { background: #ef4444; color: white; }
    .btn-stop { background: #3b82f6; color: white; }
  </style>
</head>
<body>
  <h3>API Recorder</h3>
  <button class="btn-record">🔴 Start Recording Chrome</button>
  <button class="btn-stop">💾 Sync to Marketplace</button>
</body>
</html>`
    };
    return res.json(extensionCode);
  });

  // Serve static UI assets and integrate Vite middleware
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

  startSchedulerEngine();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Server booted on http://localhost:${PORT}`);
  });
}

startServer();
