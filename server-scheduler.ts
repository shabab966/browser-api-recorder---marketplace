import { dbStore } from "./server-state.js";
import { executePuppeteerSteps } from "./server-puppeteer.js";
import { evaluateRuleWithGemini } from "./server-gemini.js";

// Run every 1 minute
const INTERVAL_MS = 60 * 1000;

export function startSchedulerEngine() {
  console.log("[Scheduler] Engine started.");
  
  setInterval(async () => {
    const schedules = dbStore.getSchedules();
    const apis = dbStore.getApis();
    
    for (const schedule of schedules) {
      if (!schedule.isActive) continue;
      
      const api = apis.find(a => a.id === schedule.apiId);
      if (!api) continue; // API deleted?
      
      const now = new Date();
      let shouldRun = false;
      
      if (!schedule.lastRunAt) {
        shouldRun = true;
      } else {
        const lastRun = new Date(schedule.lastRunAt);
        const diffHours = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
        
        if (schedule.frequency === "hourly" && diffHours >= 1) {
          shouldRun = true;
        } else if (schedule.frequency === "daily" && diffHours >= 24) {
          shouldRun = true;
        }
      }
      
      if (shouldRun) {
        console.log(`[Scheduler] Running schedule ${schedule.id} for API ${api.id}`);
        try {
          // Execute the API
          const scrapeResult = await executePuppeteerSteps(api.steps, schedule.parameters);
          
          // Update last run time and result
          dbStore.updateSchedule(schedule.id, { 
            lastRunAt: now.toISOString(),
            lastResult: scrapeResult
          });
          
          // Evaluate condition via Gemini
          const conditionMet = await evaluateRuleWithGemini(schedule.ruleQuery, scrapeResult);
          console.log(`[Scheduler] Rule evaluation for ${schedule.id}: ${conditionMet}`);
          
          if (conditionMet) {
            console.log(`[Scheduler] Triggering webhook for ${schedule.id} to ${schedule.webhookUrl}`);
            
            // Fire webhook
            fetch(schedule.webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scheduleId: schedule.id,
                apiId: api.id,
                apiName: api.name,
                rule: schedule.ruleQuery,
                timestamp: now.toISOString(),
                data: scrapeResult
              })
            }).catch(e => console.error(`[Scheduler] Webhook failed for ${schedule.id}:`, e));
          }
          
        } catch (e) {
          console.error(`[Scheduler] Error running schedule ${schedule.id}:`, e);
          dbStore.updateSchedule(schedule.id, { lastRunAt: now.toISOString() });
        }
      }
    }
  }, INTERVAL_MS);
}
