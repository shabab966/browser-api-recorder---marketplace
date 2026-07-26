import React, { useState } from "react";
import { Send, Check, Copy, RefreshCw, Terminal, FileJson } from "lucide-react";
import FriendlyResponseViewer from "./FriendlyResponseViewer.js";

interface HeaderItem {
  key: string;
  value: string;
}

export default function ApiClientCard() {
  const [method, setMethod] = useState<"GET" | "POST">("POST");
  const [url, setUrl] = useState("https://browser-api-recorder-marketplace.onrender.com/api/apis/run/hn-scraper");
  const [headers, setHeaders] = useState<HeaderItem[]>([
    { key: "Content-Type", value: "application/json" },
    { key: "x-api-key", value: "sec_live_YOUR_KEY_HERE" }
  ]);
  const [body, setBody] = useState('{\n  "engine": "puppeteer",\n  "parameters": {\n    "limit": 10\n  }\n}');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);
    setResponseTime(null);

    const startTime = performance.now();
    try {
      const headerObj: Record<string, string> = {};
      headers.forEach(h => {
        if (h.key.trim()) headerObj[h.key.trim()] = h.value.trim();
      });

      const options: RequestInit = {
        method,
        headers: headerObj,
      };

      if (method === "POST" && body.trim()) {
        try {
          JSON.parse(body); // Validate JSON
          options.body = body.trim();
        } catch (e) {
          throw new Error("Invalid request JSON payload syntax.");
        }
      }

      const res = await fetch(url, options);
      const data = await res.json();
      const endTime = performance.now();

      setStatus(res.status);
      setResponseTime(Math.round(endTime - startTime));
      setResponse(data);
    } catch (err: any) {
      const endTime = performance.now();
      setStatus(500);
      setResponseTime(Math.round(endTime - startTime));
      setResponse({ error: err.message || "Failed to make HTTP request. Check CORS or URL path." });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Interactive API Testing Playground</h3>
            <p className="text-slate-400 text-3xs font-sans mt-0.5">Send test requests to your recorded endpoints and inspect responses</p>
          </div>
        </div>
        <span className="text-3xs text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-850 font-mono self-start sm:self-center">
          REST API CLIENT v1.0
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Request Config */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex gap-2">
            <select
              value={method}
              onChange={e => setMethod(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold shrink-0"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-api-endpoint.com/run"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Headers</label>
              <button
                onClick={() => setHeaders([...headers, { key: "", value: "" }])}
                className="text-3xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
              >
                + Add Header
              </button>
            </div>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {headers.map((h, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={h.key}
                    placeholder="Key"
                    onChange={e => {
                      const list = [...headers];
                      list[i].key = e.target.value;
                      setHeaders(list);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-2xs text-slate-200 focus:outline-none font-mono"
                  />
                  <input
                    type="text"
                    value={h.value}
                    placeholder="Value"
                    onChange={e => {
                      const list = [...headers];
                      list[i].value = e.target.value;
                      setHeaders(list);
                    }}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-2xs text-slate-200 focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => setHeaders(headers.filter((_, idx) => idx !== i))}
                    className="text-rose-500 hover:text-rose-400 text-3xs font-bold px-1.5"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* JSON Body (Only if POST) */}
          {method === "POST" && (
            <div>
              <label className="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">JSON Request Body</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono resize-none leading-relaxed"
              />
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sending Request...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Request</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Response View */}
        <div className="lg:col-span-5 flex flex-col h-[280px] lg:h-auto min-h-[200px]">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-slate-850 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider font-mono">Response</span>
                {status !== null && (
                  <span className={`px-1.5 py-0.5 rounded text-3xs font-bold font-mono ${
                    status >= 200 && status < 300 ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/60" : "bg-rose-950/50 text-rose-400 border border-rose-900/60"
                  }`}>
                    {status}
                  </span>
                )}
                {responseTime !== null && (
                  <span className="text-3xs text-slate-500 font-mono">
                    {responseTime} ms
                  </span>
                )}
              </div>

            </div>

            <div className="flex-1 overflow-hidden pr-1 flex flex-col">
              {response ? (
                <FriendlyResponseViewer data={response} />
              ) : loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 font-mono">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-3xs">Resolving host...</span>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 font-sans text-center px-4 py-8">
                  <FileJson className="w-6 h-6 text-slate-700" />
                  <div className="text-3xs font-medium text-slate-400">Playground Console Idle</div>
                  <p className="text-3xs text-slate-500 leading-relaxed max-w-[200px]">Configure your parameters on the left and trigger the API call</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
