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

  let page: any = null;
  try {
    page = await browser.newPage();
    
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
          if (step.selector.includes("SearchBoxDesktop") || step.selector.includes("date-display-field") || step.selector.includes("searchbox-datepicker") || step.selector.includes("searchbox-dates-container")) {
            const isCalendarOpen = await page.evaluate(() => {
              const picker = document.querySelector("#calendar-searchboxdatepicker, [data-testid='searchbox-datepicker-calendar']");
              if (picker) {
                const rect = picker.getBoundingClientRect();
                const style = window.getComputedStyle(picker);
                return rect.width > 0 && rect.height > 0 && style.opacity !== '0' && style.visibility !== 'hidden' && style.display !== 'none';
              }
              return false;
            });
            if (isCalendarOpen) {
              console.log("[Puppeteer Override] Skipping date toggler click since calendar is already open.");
              continue; // Move to next step instead of break, to avoid skipping the rest of the loop block
            }
          }
          
          // Booking.com: If we are trying to click the search results tab switch, but we are already on search results page
          if (step.selector.includes("sr_page-tab-trigger")) {
            const url = page.url();
            if (url.includes("searchresults") || url.includes("searchresults.html")) {
              console.log("[Puppeteer Override] Skipping tab trigger click since page is already on search results page.");
              break;
            }
          }

          let sel = normalizeSelector(step.selector);
          
          // Booking.com calendar date selection normalization override for older recorded APIs
          if (
            step.selector.includes("calendar-searchboxdatepicker") || 
            (step.selector.includes("table") && step.selector.includes("tbody") && step.selector.includes("td")) ||
            step.selector.includes("data-date") ||
            step.selector.includes("date-date")
          ) {
            dateClickCount++;
            const targetDate = dateClickCount === 1 ? params.checkin : params.checkout;
            if (targetDate) {
              console.log(`[Puppeteer Override] Mapping calendar click to target date: ${targetDate}`);
              
              const isDateVisibleFn = `(tDate) => {
                const [y, m, d] = tDate.split('-');
                const dateObj = new Date(y, m - 1, d);
                const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
                const shortMonth = dateObj.toLocaleString('en-US', { month: 'short' });
                const dayNum = parseInt(d, 10).toString();
                
                const allEls = Array.from(document.querySelectorAll('*'));
                for (const e of allEls) {
                  const aria = e.getAttribute('aria-label');
                  if (aria && aria.includes(dayNum) && (aria.includes(monthName) || aria.includes(shortMonth)) && aria.includes(y)) return true;
                  if (e.getAttribute('data-date') === tDate) return true;
                }
                
                const headers = Array.from(document.querySelectorAll('h2, h3, h4, div')).filter(el => {
                   const txt = el.textContent || "";
                   return txt.length < 50 && (txt.includes(monthName) || txt.includes(shortMonth)) && txt.includes(y);
                });
                
                for (const header of headers) {
                   let parent = header.parentElement;
                   let grid = null;
                   for (let i=0; i<4; i++) {
                      if (!parent) break;
                      grid = parent.querySelector('table, [role="grid"], .bui-calendar__month');
                      if (grid) break;
                      parent = parent.parentElement;
                   }
                   if (grid) {
                      const cells = Array.from(grid.querySelectorAll('td, span, div, [role="gridcell"]'));
                      for (const cell of cells) {
                         if (cell.textContent.trim() === dayNum) return true;
                      }
                   }
                }
                return false;
              }`;

              const clickDateFn = `(tDate) => {
                const [y, m, d] = tDate.split('-');
                const dateObj = new Date(y, m - 1, d);
                const monthName = dateObj.toLocaleString('en-US', { month: 'long' });
                const shortMonth = dateObj.toLocaleString('en-US', { month: 'short' });
                const dayNum = parseInt(d, 10).toString();
                
                const allEls = Array.from(document.querySelectorAll('*'));
                for (const e of allEls) {
                  const aria = e.getAttribute('aria-label');
                  if (aria && aria.includes(dayNum) && (aria.includes(monthName) || aria.includes(shortMonth)) && aria.includes(y)) { e.click(); return true; }
                  if (e.getAttribute('data-date') === tDate) { e.click(); return true; }
                }
                
                const headers = Array.from(document.querySelectorAll('h2, h3, h4, div')).filter(el => {
                   const txt = el.textContent || "";
                   return txt.length < 50 && (txt.includes(monthName) || txt.includes(shortMonth)) && txt.includes(y);
                });
                
                for (const header of headers) {
                   let parent = header.parentElement;
                   let grid = null;
                   for (let i=0; i<4; i++) {
                      if (!parent) break;
                      grid = parent.querySelector('table, [role="grid"], .bui-calendar__month');
                      if (grid) break;
                      parent = parent.parentElement;
                   }
                   if (grid) {
                      const cells = Array.from(grid.querySelectorAll('td, span, div, [role="gridcell"]'));
                      for (const cell of cells) {
                         if (cell.textContent.trim() === dayNum) {
                            cell.click();
                            return true;
                         }
                      }
                   }
                }
                return false;
              }`;

              try {
                // Take debug screenshot
                await page.screenshot({ path: `C:\\Users\\assha\\.gemini\\antigravity\\brain\\453ff0e0-2bcc-4e80-82ae-f12b7084f195\\screenshot_before_calendar_eval_${dateClickCount}.png` });
                
                // Force open calendar if it's closed
                const isCalOpen = await page.evaluate(() => {
                   const picker = document.querySelector("#calendar-searchboxdatepicker, [data-testid='searchbox-datepicker-calendar']");
                   if (picker) {
                     const rect = picker.getBoundingClientRect();
                     const style = window.getComputedStyle(picker);
                     return rect.width > 0 && rect.height > 0 && style.opacity !== '0' && style.visibility !== 'hidden' && style.display !== 'none';
                   }
                   return false;
                });
                if (!isCalOpen) {
                   console.log("[Puppeteer Override] Calendar is closed! Forcefully opening it...");
                   await page.evaluate(() => {
                      const btn = document.querySelector('button[data-testid="searchbox-dates-container"]') as HTMLElement;
                      if (btn) btn.click();
                   });
                   await new Promise(r => setTimeout(r, 1000));
                }

                // Check if element is already present in DOM
                let exists = await page.evaluate(eval(isDateVisibleFn), targetDate);
                if (!exists) {
                  console.log(`[Puppeteer Override] Date element not visible. Resetting calendar to earliest month...`);
                  // First, click previous month until disabled (to reach the earliest possible month)
                  for (let m = 0; m < 12; m++) {
                     const prevExists = await page.evaluate(() => {
                        const prevBtn = document.querySelector('button[aria-label="Previous month"], div[class*="prev-button"], .bui-calendar__control--prev, button[aria-label="Previous Month"]');
                        if (prevBtn && !prevBtn.hasAttribute('disabled') && prevBtn.getAttribute('aria-disabled') !== 'true') {
                           prevBtn.click();
                           return true;
                        }
                        return false;
                     });
                     if (!prevExists) break;
                     await new Promise((r) => setTimeout(r, 600));
                  }
                  
                  // Now check if it's visible after reset
                  exists = await page.evaluate(eval(isDateVisibleFn), targetDate);
                  
                  if (!exists) {
                     console.log(`[Puppeteer Override] Navigating calendar months forward...`);
                     for (let m = 0; m < 24; m++) {
                       const nextBtn = 'button[aria-label="Next month"], div[class*="next-button"], .bui-calendar__control--next, button[aria-label="Next Month"]';
                       const nextExists = await page.evaluate((nb) => {
                         const btn = document.querySelector(nb);
                         if (btn && !btn.hasAttribute('disabled')) { btn.click(); return true; }
                         return false;
                       }, nextBtn);
                       if (!nextExists) break;
                       await new Promise((r) => setTimeout(r, 600));
                       const appeared = await page.evaluate(eval(isDateVisibleFn), targetDate);
                       if (appeared) {
                         console.log(`[Puppeteer Override] Found target date element after calendar navigation.`);
                         break;
                       }
                     }
                  }
                }
                
                // Now perform the robust click
                const clicked = await page.evaluate(eval(clickDateFn), targetDate);
                if (!clicked) {
                   throw new Error("Timeout waiting for date: " + targetDate);
                }
                console.log(`[Puppeteer Override] Successfully clicked robust date!`);
                
                // Skip the standard waitForSelector and click logic
                await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));
                continue; // Move to the next step
              } catch (e) {
                console.error("Calendar navigation error:", e);
                // Fall back to original logic if robust click fails
                sel = `[data-date="${targetDate}"]`;
              }
            }
          }

          try {
            await page.waitForSelector(sel, { timeout: 30000 });
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
              // Hardcoded structural fallbacks for known Booking.com broken recorded selectors
              const isOccupancyToggle = (sel.includes("button.") && sel.includes("> span > span:nth-of-type(2)")) || 
                                        (sel.includes("button.") && sel.includes("> span") && sel.length < 30 && !sel.includes("svg") && !sel.includes("type=\"submit\""));
              const isAdultsPlus = sel.includes("div.") && sel.includes("button:nth-of-type(2) > span > span > svg");
              const isAdultsPlusRepeated = sel.includes("div.") && (sel.includes("button:nth-of-type") || (sel.includes("div:nth-of-type") && sel.includes("button")));
              const isSearchButton = (sel.includes("button.") && sel.length === 17) || (sel.includes("button.") && sel.includes("span:nth-of-type(2)") && !sel.includes("svg") && !isOccupancyToggle && step.action === "click"); // e.g. button.ced67027e5 > span:nth-of-type(2)
              
              if (isOccupancyToggle) {
                 console.log("[Puppeteer] Self-healing: Using structural fallback for occupancy toggle");
                 healed = await page.evaluate(() => {
                    const btn = document.querySelector('button[data-testid="occupancy-config"]');
                    if (btn) { btn.click(); return true; }
                    return false;
                 });
              } else if (isAdultsPlus || isAdultsPlusRepeated) {
                 console.log("[Puppeteer] Self-healing: Using structural fallback for adults + button");
                 healed = await page.evaluate(() => {
                    const popup = document.querySelector('[data-testid="occupancy-popup"]');
                    if (popup) {
                       const plusBtn = popup.querySelectorAll('button')[1]; // usually index 1 is the + for adults
                       if (plusBtn) { plusBtn.click(); return true; }
                    }
                    return false;
                 });
              } else if (isSearchButton) {
                 console.log("[Puppeteer] Self-healing: Using structural fallback for search button");
                 healed = await page.evaluate(() => {
                    const btn = document.querySelector('button[type="submit"]');
                    if (btn) { btn.click(); return true; }
                    return false;
                 });
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
  } catch (error) {
    try {
      if (page) {
        console.error(`[Puppeteer Failure Diagnostics] Current page URL: ${page.url()}`);
        const screenshotPath = `C:\\Users\\assha\\.gemini\\antigravity\\brain\\453ff0e0-2bcc-4e80-82ae-f12b7084f195\\screenshot_error.png`;
        await page.screenshot({ path: screenshotPath });
        console.error(`[Puppeteer Failure Diagnostics] Error screenshot saved to ${screenshotPath}`);
      }
    } catch (diagError) {
      console.error("[Puppeteer Failure Diagnostics] Failed to capture diagnostics:", diagError);
    }
    throw error;
  } finally {
    if (page) {
      await browser.close();
    }
    console.log("[Puppeteer] Browser closed.");
  }
}
