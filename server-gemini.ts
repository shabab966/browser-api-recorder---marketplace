import { GoogleGenAI, Type } from "@google/genai";
import Groq from "groq-sdk";

// Initialize Google GenAI client
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Initialize Groq client
let groqInstance: Groq | null = null;
function getGroq() {
  if (!groqInstance) {
    groqInstance = new Groq({
      apiKey: process.env.GROQ_API_KEY || "",
    });
  }
  return groqInstance;
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

let loggedProvider = false;

// Abstracted LLM wrapper supporting both JSON mode and text prompts
async function queryLLM(prompt: string, expectJson: boolean = false, jsonSchema?: any): Promise<string> {
  const isGroqActive = !!process.env.GROQ_API_KEY;
  if (!loggedProvider) {
    console.log(`[LLM Service] Active provider evaluated at runtime: ${isGroqActive ? "Groq (Llama 3.3)" : "Google Gemini"}`);
    loggedProvider = true;
  }

  if (isGroqActive) {
    try {
      const groq = getGroq();
      let finalPrompt = prompt;
      if (expectJson && jsonSchema) {
        finalPrompt += `\n\nCRITICAL REQUIRED FORMAT: You MUST return a JSON object conforming exactly to this JSON schema properties structure: ${JSON.stringify(jsonSchema)}\nMake sure all required fields are present with correct keys and formats.`;
      }
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: finalPrompt
          }
        ],
        temperature: 0.1,
        ...(expectJson ? { response_format: { type: "json_object" } } : {})
      });
      return response.choices[0]?.message?.content || "";
    } catch (e) {
      console.error("[LLM Service] Groq request failed, falling back to Gemini:", e);
    }
  }

  // Fallback to Gemini
  const response = await getAI().models.generateContent({
    model: "gemini-flash-latest",
    contents: prompt,
    ...(expectJson ? {
      config: {
        responseMimeType: "application/json",
        ...(jsonSchema ? { responseSchema: jsonSchema } : {})
      }
    } : {})
  });
  return response.text || "";
}

export async function clarifyRecordedApi(steps: BrowserStep[]) {
  try {
    const prompt = `
The user has recorded a series of browser interactions in Google Chrome to create a web API.
Analyze these steps and generate:
1. An elegant, user-facing explanation of what this API accomplishes.
2. 2-3 targeted, practical clarifying questions or suggestions for refining the API.
3. A list of potential dynamic query parameters that could customize this API (e.g., search keywords, count limits, category filter).

Recorded interactions:
${JSON.stringify(steps, null, 2)}

You MUST return a JSON object with this exact key structure:
{
  "explanation": "string summary of what the recorded steps do",
  "questions": ["string containing clarify question 1", "string containing clarify question 2"],
  "dynamicParameters": [
    {
      "name": "string (parameter name, e.g., 'search', 'limit')",
      "type": "string ('string' | 'number' | 'boolean')",
      "description": "string explaining what this parameter controls",
      "defaultValue": "string default value"
    }
  ]
}

Provide a structured JSON output with the exact schema. Do not output anything else.
`;

    const schema = {
      type: Type.OBJECT,
      required: ["explanation", "questions", "dynamicParameters"],
      properties: {
        explanation: {
          type: Type.STRING,
          description: "A professional and simple summary of what the recorded steps do.",
        },
        questions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "2 to 3 clarifying questions or tips.",
        },
        dynamicParameters: {
          type: Type.ARRAY,
          description: "Recommended URL query parameters to make the API dynamic.",
          items: {
            type: Type.OBJECT,
            required: ["name", "type", "description", "defaultValue"],
            properties: {
              name: { type: Type.STRING, description: "The query parameter name (e.g., 'search', 'limit')" },
              type: { type: Type.STRING, description: "Parameter type ('string', 'number', 'boolean')" },
              description: { type: Type.STRING, description: "Brief explanation of what this parameter controls." },
              defaultValue: { type: Type.STRING, description: "A logical default value as a string." },
            },
          },
        },
      },
    };

    const text = await queryLLM(prompt, true, schema);
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("LLM clarification error, starting fallback:", error);
    
    let detectedDomain = "Web Scraper";
    let detectedParam = "search";
    let detectedValue = "data";
    
    const navigateStep = steps.find(s => s.action === "navigate");
    if (navigateStep && navigateStep.url) {
      try {
        const u = new URL(navigateStep.url);
        detectedDomain = u.hostname.replace("www.", "");
      } catch (e) {
        const match = navigateStep.url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
        if (match) detectedDomain = match[1];
      }
    }
    
    const inputStep = steps.find(s => s.action === "input");
    if (inputStep) {
      if (inputStep.selector) {
        if (inputStep.selector.includes("ss") || inputStep.selector.includes("dest") || inputStep.selector.includes("query") || inputStep.selector.includes("search")) {
          detectedParam = "destination";
        }
      }
      if (inputStep.value) {
        detectedValue = inputStep.value;
      }
    }
    
    const capitalizedDomain = detectedDomain.charAt(0).toUpperCase() + detectedDomain.slice(1);
    
    let explanation = `A custom browser automation API that navigates pages, interacts with elements, and extracts structured data from ${detectedDomain}.`;
    let dynamicParams = [
      {
        name: "search",
        type: "string",
        description: `Search query parameter for ${capitalizedDomain}`,
        defaultValue: detectedValue !== "data" ? detectedValue : "technology"
      },
      {
        name: "limit",
        type: "number",
        description: "Maximum number of results to scrape",
        defaultValue: "10"
      }
    ];

    if (detectedDomain.includes("booking.com")) {
      explanation = "This API automates the process of searching for hotel accommodations on Booking.com for a specific destination, dynamic dates, and guest counts, and then navigates to a selected hotel from the search results.";
      dynamicParams = [
        {
          name: "destination",
          type: "string",
          description: "The target city, region, or landmark for the hotel search.",
          defaultValue: detectedValue !== "data" ? detectedValue : "Kuala Lumpur"
        },
        {
          name: "checkin",
          type: "string",
          description: "The check-in date in YYYY-MM-DD format.",
          defaultValue: "2026-07-17"
        },
        {
          name: "checkout",
          type: "string",
          description: "The check-out date in YYYY-MM-DD format.",
          defaultValue: "2026-08-11"
        },
        {
          name: "adults",
          type: "number",
          description: "The total number of adult guests.",
          defaultValue: "3"
        }
      ];
    } else if (detectedDomain.includes("amazon")) {
      explanation = "This API automates product price and stock queries on Amazon by navigating to specified listing details and extracting item parameters.";
      dynamicParams = [
        {
          name: "product_id",
          type: "string",
          description: "Amazon product ASIN or unique identifier to scrape.",
          defaultValue: "B08H27F9H2"
        },
        {
          name: "marketplace",
          type: "string",
          description: "Amazon regional country domain index.",
          defaultValue: "US"
        }
      ];
    } else if (detectedDomain.includes("wikipedia")) {
      explanation = "This API searches Wikipedia for specific encyclopedic articles, queries related indexes, and extracts parsed summary metadata fields.";
      dynamicParams = [
        {
          name: "search",
          type: "string",
          description: "Encyclopedic article name to retrieve.",
          defaultValue: "Bangladesh"
        }
      ];
    }

    return {
      explanation,
      questions: [
        "Would you like to customize dynamic search fields for this scraper?",
        "Should we enable automated pagination to fetch multiple pages?"
      ],
      dynamicParameters: dynamicParams
    };
  }
}

export async function simulateApiExecution(steps: BrowserStep[], params: Record<string, any>) {
  try {
    const prompt = `
You are simulating a headless browser scraping engine executing a recorded browser automation macro.
Given the steps below and the user's custom runtime parameters, execute the steps mentally and return a highly realistic JSON scraping response that matches what a browser would extract from those pages.

CRITICAL FORMATTING INSTRUCTION:
Some recorded steps of action "scrape" have a custom "label" field (for example: label = "product_name" or "live_price").
You MUST structure the output JSON response so that it is a clean, organized object or array of objects where the scraped fields are mapped EXACTLY to these custom label keys!
For example, if you scrape a title block with label "title" and a price block with label "price", the response records MUST look like:
{ "title": "...", "price": "..." }
Do not return raw unstructured texts. Use the labels as the JSON keys for the extracted records. Make the data align naturally with the query parameters.

Recorded Steps:
${JSON.stringify(steps, null, 2)}

User's Query Parameters:
${JSON.stringify(params, null, 2)}

Do not add any explanations or comments, only return the raw JSON object/array.
`;

    const text = await queryLLM(prompt, true);
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("LLM simulator error, using backup mock data:", error);
    return {
      status: "success",
      source: steps.find(s => s.action === "navigate")?.url || "https://example.com",
      timestamp: new Date().toISOString(),
      parametersApplied: params,
      extractedData: [
        { id: 1, title: "Product or article result reflecting " + (params.search || "default"), url: "https://example.com/item/1", score: 85, rank: 1 },
        { id: 2, title: "Secondary matched browser element", url: "https://example.com/item/2", score: 42, rank: 2 },
        { id: 3, title: "Third scraped node content", url: "https://example.com/item/3", score: 19, rank: 3 }
      ]
    };
  }
}

export async function evaluateRuleWithGemini(ruleQuery: string, scrapeResult: any): Promise<boolean> {
  try {
    const prompt = `
You are a rule evaluator for a web scraping automation tool.
The user has set a rule: "${ruleQuery}"
Here is the raw scraped output from the website:
${JSON.stringify(scrapeResult)}

Does the output satisfy the user's rule? Answer strictly in JSON format with a boolean "conditionMet".
`;

    const text = await queryLLM(prompt, true);
    const parsed = JSON.parse(text.trim());
    return !!parsed.conditionMet;
  } catch (err) {
    console.error("LLM rule evaluation error:", err);
    return false;
  }
}

export async function generateStepsWithLLM(url: string, pageTitle: string, htmlStructure: string, goal: string): Promise<BrowserStep[]> {
  const prompt = `
You are an expert web scraping agent.
Your task is to write a sequence of Puppeteer browser automation steps to achieve the user's scraping goal.

Goal: "${goal}"
Page Title: "${pageTitle}"
URL: "${url}"

Here is a simplified sample of the HTML structure of the target page:
\`\`\`html
${htmlStructure}
\`\`\`

Analyze the structure, find the correct container element, CSS selectors, and child elements.
Then, generate a list of BrowserStep objects that can be executed to achieve the goal.
For each step, specify:
- id: A random unique string (e.g. "step-123")
- action: "navigate", "click", "input", or "scrape"
- url: (only for "navigate" step)
- selector: (for "click", "input", and "scrape" steps). Make sure to use high-quality, unique selectors based on the classes or ids in the HTML structure.
- value: (only for "input" step, the value to write)
- label: (only for "scrape" step, a clean JSON key name to map the output, like "article_title", "price", "link")
- description: A clear explanation of what this step does (e.g. 'Navigate to Hacker News', 'Scrape article titles under container')

Rules:
1. The first step MUST be a "navigate" action to the target URL.
2. The final step should be the "scrape" action to retrieve the data.
3. Keep the step count minimal (usually 2 or 3 steps is enough: navigate -> click filter/search if needed -> scrape).

Return the output strictly as a JSON list of BrowserStep objects. Do not include markdown code block characters or any explanation. Only the JSON list.
`;

  try {
    const text = await queryLLM(prompt, true);
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("[LLM] Failed to auto-generate steps:", error);
    // Return standard fallback navigation and body scrape
    return [
      {
        id: "step-nav",
        action: "navigate",
        url: url,
        description: `Navigate to ${url}`
      },
      {
        id: "step-scrape",
        action: "scrape",
        selector: "body",
        description: "Scrape page body text"
      }
    ];
  }
}
