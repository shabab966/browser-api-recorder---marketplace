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
    headless: "shell",
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
    let dateClickCount = 0;

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
          
          // Booking.com: If calendar is already open, skip toggling it shut
          if (step.selector.includes("SearchBoxDesktop") && (step.selector.includes("div:nth-of-type(2)") || step.selector.includes("div:nth-child(2)"))) {
            const isCalendarOpen = await page.evaluate(() => {
              const picker = document.querySelector("#calendar-searchboxdatepicker, [data-testid='searchbox-datepicker-calendar']");
              if (picker) {
                const rect = picker.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              }
              return false;
            });
            if (isCalendarOpen) {
              console.log("[Puppeteer Override] Skipping date toggler click since calendar is already open.");
              break;
            }
          }

          let sel = normalizeSelector(step.selector);
          
          // Booking.com calendar date selection normalization override for older recorded APIs
          if (step.selector.includes("calendar-searchboxdatepicker")) {
            dateClickCount++;
            const targetDate = dateClickCount === 1 ? params.checkin : params.checkout;
            if (targetDate) {
              console.log(`[Puppeteer Override] Mapping calendar click to target date: ${targetDate}`);
              sel = `[data-date="${targetDate}"], td[data-date="${targetDate}"], span[data-date="${targetDate}"]`;
              
              try {
                // Check if element is already present in DOM
                const exists = await page.evaluate((s) => !!document.querySelector(s), sel);
                if (!exists) {
                  console.log(`[Puppeteer Override] Date element not visible. Navigating calendar months...`);
                  // Click next button up to 4 times
                  for (let m = 0; m < 4; m++) {
                    const nextBtn = 'button[aria-label="Next month"], div[class*="next-button"], .bui-calendar__control--next';
                    const nextExists = await page.evaluate((nb) => {
                      const btn = document.querySelector(nb) as HTMLElement;
                      if (btn) { btn.click(); return true; }
                      return false;
                    }, nextBtn);
                    if (!nextExists) break;
                    await new Promise((r) => setTimeout(r, 600));
                    // Check if date element appeared
                    const appeared = await page.evaluate((s) => !!document.querySelector(s), sel);
                    if (appeared) {
                      console.log(`[Puppeteer Override] Found target date element after calendar navigation.`);
                      break;
                    }
                  }
                }
              } catch (e) {
                console.error("Calendar navigation error:", e);
              }
            }
          }

          try {
            await page.waitForSelector(sel, { timeout: 8000 });
            try {
              await page.click(sel);
            } catch (clickErr) {
              console.warn(`[Puppeteer] Native click failed for ${sel}. Trying JS click fallback...`);
              const jsClicked = await page.evaluate((s) => {
                const el = document.querySelector(s) as HTMLElement;
                if (el) {
                  el.scrollIntoView({ block: "center" });
                  el.click();
                  return true;
                }
                return false;
              }, sel);
              if (!jsClicked) throw clickErr;
            }
          } catch (err) {
            console.warn(`[Puppeteer] Standard selector failed: ${sel}. Attempting self-healing...`);
            let healed = false;
            if (step.description) {
              const textMatch = step.description.match(/containing "([^"]+)"/);
              const tagMatch = step.description.match(/<([a-zA-Z0-9_-]+)>/);
              if (textMatch) {
                const targetText = textMatch[1];
                const targetTag = tagMatch ? tagMatch[1] : "*";
                console.log(`[Puppeteer] Self-healing: Searching for <${targetTag}> containing "${targetText}"`);
                healed = await page.evaluate((tag, text) => {
                  const elements = Array.from(document.querySelectorAll(tag));
                  const match = elements.find(el => (el.textContent || "").trim().includes(text));
                  if (match) {
                    (match as HTMLElement).click();
                    return true;
                  }
                  return false;
                }, targetTag, targetText);
              }
            }
            if (!healed) {
              throw err;
            }
            console.log(`[Puppeteer] Self-healing successful! clicked matching text element.`);
          }
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
