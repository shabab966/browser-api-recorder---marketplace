import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google GenAI client as per system guidelines
// Note: process.env.GEMINI_API_KEY is automatically injected by the environment
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

interface BrowserStep {
  id: string;
  action: "navigate" | "click" | "input" | "scrape";
  url?: string;
  selector?: string;
  value?: string;
  description: string;
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

Provide a structured JSON output with the exact schema. Do not output anything else.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
        },
      },
    });

    if (!response.text) {
      throw new Error("No text response from Gemini API");
    }

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini API clarification error:", error);
    // Fallback if API fails or key is unconfigured
    return {
      explanation: "A custom browser automation API that navigates pages, interacts with elements, and extracts structured data.",
      questions: [
        "Would you like to customize dynamic search fields for this scraper?",
        "Should we enable automated pagination to fetch multiple pages?"
      ],
      dynamicParameters: [
        {
          name: "search",
          type: "string",
          description: "Search keyword or category to query",
          defaultValue: "technology"
        },
        {
          name: "limit",
          type: "number",
          description: "Maximum number of results to scrape",
          defaultValue: "10"
        }
      ]
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("No text response from Gemini API");
    }

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini API simulator error:", error);
    // Generic high fidelity mock data
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
