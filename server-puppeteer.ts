import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// @ts-ignore
puppeteer.use(StealthPlugin());

function normalizeSelector(selector: string | undefined): string {
  if (!selector) return "";

  // 1. Booking.com specific search inputs dynamic ID bypass
  if (selector.toLowerCase().includes("input")) {
    if (selector.includes("R2klar") || selector.includes("R1lar") || selector.includes("R3lar") || selector.includes("R4lar")) {
      return 'input[name="ss"], input[type="search"], input[id*="R2klar"]';
    }
  }

  // 2. Escape/Convert IDs containing colons (like #:R2klarct:) to wildcard attribute selector
  // example: "input#:R2klarct:" -> "input[id*='R2klarct']"
  if (selector.includes(":")) {
    const idColonRegex = /#[a-zA-Z0-9_-]*(?::[a-zA-Z0-9_-]+)+:?/g;
    selector = selector.replace(idColonRegex, (match) => {
      const cleanId = match.replace("#", "").replace(/:/g, "");
      return `[id*="${cleanId}"]`;
    });
  }

  return selector;
}

export interface BrowserStep {
  id: string;
  action: "navigate" | "click" | "input" | "scrape";
  url?: string;
  selector?: string;
  value?: string;
  label?: string;
  description: string;
}

export async function executePuppeteerSteps(
  steps: BrowserStep[],
  params: Record<string, any>,
  dynamicParameters: any[]
): Promise<any> {
  console.log(`[Puppeteer] Starting execution of ${steps.length} steps. Params:`, params);

  // Substitute parameters in step values, urls, selectors
  const resolvedSteps = steps.map((step) => {
    const resolved = { ...step };

    const replaceText = (text: string | undefined): string | undefined => {
      if (!text) return text;
      let res = text;
      // 1. Template style: {{param}}
      for (const [k, v] of Object.entries(params)) {
        res = res.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"), String(v));
      }
      // 2. Default value substitution
      if (dynamicParameters) {
        for (const dp of dynamicParameters) {
          const userVal = params[dp.name];
          if (userVal !== undefined) {
            const defaultVal = String(dp.defaultValue);
            if (defaultVal.trim() !== "" && res.includes(defaultVal)) {
              res = res.replaceAll(defaultVal, String(userVal));
            }
          }
        }
      }
      return res;
    };

    if (resolved.url) resolved.url = replaceText(resolved.url);
    if (resolved.selector) resolved.selector = replaceText(resolved.selector);
    if (resolved.value) resolved.value = replaceText(resolved.value);

    return resolved;
  });

  console.log("[Puppeteer] Resolved steps for execution:", resolvedSteps);

  // Launch browser with stealth settings
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set a realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );

    const scrapedResults: Record<string, string[]> = {};

    for (const step of resolvedSteps) {
      console.log(`[Puppeteer] Executing action "${step.action}": ${step.description}`);
      
      switch (step.action) {
        case "navigate": {
          if (!step.url) throw new Error("Navigate step missing URL");
          await page.goto(step.url, { waitUntil: "networkidle2", timeout: 30000 });
          break;
        }
        case "click": {
          if (!step.selector) throw new Error("Click step missing selector");
          const sel = normalizeSelector(step.selector);
          await page.waitForSelector(sel, { timeout: 10000 });
          await page.click(sel);
          // Wait after click for page to settle
          await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
          break;
        }
        case "input": {
          if (!step.selector) throw new Error("Input step missing selector");
          const sel = normalizeSelector(step.selector);
          await page.waitForSelector(sel, { timeout: 10000 });
          // Focus and clear input value
          await page.focus(sel);
          await page.evaluate((s) => {
            const el = document.querySelector(s) as HTMLInputElement;
            if (el) el.value = "";
          }, sel);
          await page.type(sel, step.value || "");
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));
          break;
        }
        case "scrape": {
          if (!step.selector) throw new Error("Scrape step missing selector");
          const sel = normalizeSelector(step.selector);
          await page.waitForSelector(sel, { timeout: 10000 });
          const texts = await page.evaluate((s) => {
            const elements = document.querySelectorAll(s);
            return Array.from(elements).map((el) => (el.textContent || "").trim()).filter((t) => t !== "");
          }, sel);
          
          const label = step.label || `scraped_${step.id}`;
          scrapedResults[label] = texts;
          break;
        }
        default:
          throw new Error(`Unsupported action type: ${step.action}`);
      }
    }

    // Combine parallel scraped collections by index
    const labels = Object.keys(scrapedResults);
    if (labels.length === 0) {
      return { message: "No data scraped" };
    }

    const maxLength = Math.max(...labels.map((l) => scrapedResults[l].length));
    const mergedData: Record<string, string>[] = [];

    for (let i = 0; i < maxLength; i++) {
      const item: Record<string, string> = {};
      for (const label of labels) {
        item[label] = scrapedResults[label][i] || "";
      }
      mergedData.push(item);
    }

    return mergedData;
  } finally {
    await browser.close();
    console.log("[Puppeteer] Browser closed.");
  }
}
