import React, { useState, useEffect } from "react";
import { Table, LayoutGrid, Code, Copy, Check } from "lucide-react";

interface FriendlyResponseViewerProps {
  data: any;
}

export default function FriendlyResponseViewer({ data }: FriendlyResponseViewerProps) {
  const [viewMode, setViewMode] = useState<"raw" | "table" | "cards">("raw");
  const [copied, setCopied] = useState(false);

  // Auto-detect best default mode
  useEffect(() => {
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
      setViewMode("table");
    } else {
      setViewMode("raw");
    }
  }, [data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isArrayOfObjects = Array.isArray(data) && data.length > 0 && typeof data[0] === "object" && data[0] !== null;

  const renderRaw = () => (
    <pre className="p-4 pb-8 text-2xs text-slate-300 font-mono whitespace-pre-wrap break-words overflow-y-auto max-h-[400px] leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );

  const renderTable = () => {
    if (!isArrayOfObjects) return renderRaw();

    // Extract unique headers across all objects in array (safely handling sparse objects)
    const headersSet = new Set<string>();
    data.forEach(item => {
      if (item && typeof item === "object") {
        Object.keys(item).forEach(k => headersSet.add(k));
      }
    });
    const headers = Array.from(headersSet);

    if (headers.length === 0) return renderRaw();

    return (
      <div className="overflow-x-auto w-full max-h-[400px] overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-800 text-slate-300 text-2xs font-sans">
          <thead className="bg-slate-900 sticky top-0 border-b border-slate-800">
            <tr>
              {headers.map(h => (
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-3 text-left text-3xs font-bold font-mono text-slate-400 uppercase tracking-wider"
                >
                  {h.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850 bg-slate-950/40">
            {data.map((row: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                {headers.map(h => {
                  const val = row[h];
                  let displayVal = "";
                  if (val === undefined || val === null) {
                    displayVal = "-";
                  } else if (typeof val === "object") {
                    displayVal = JSON.stringify(val);
                  } else {
                    displayVal = String(val);
                  }

                  return (
                    <td key={h} className="px-4 py-3 whitespace-nowrap text-slate-300 font-medium">
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCards = () => {
    if (!isArrayOfObjects) return renderRaw();

    return (
      <div className="p-4 overflow-y-auto max-h-[400px] grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((item: any, idx: number) => (
          <div
            key={idx}
            className="bg-slate-900/50 border border-slate-850 rounded-xl p-4 flex flex-col justify-between hover:border-slate-800 transition-all shadow-md"
          >
            <div className="space-y-2.5">
              {Object.entries(item).map(([k, v]) => {
                let displayVal = "";
                if (v === undefined || v === null) {
                  displayVal = "-";
                } else if (typeof v === "object") {
                  displayVal = JSON.stringify(v);
                } else {
                  displayVal = String(v);
                }

                // If key is a name/title, style it as header
                const isTitleKey = k.toLowerCase().includes("name") || k.toLowerCase().includes("title") || k.toLowerCase().includes("header");

                return (
                  <div key={k} className="flex flex-col">
                    <span className="text-4xs uppercase tracking-wider text-slate-500 font-mono font-bold">
                      {k.replace(/_/g, " ")}
                    </span>
                    <span className={`${isTitleKey ? "text-2xs font-bold text-white mt-0.5" : "text-3xs text-slate-300 mt-0.5"}`}>
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-850/60 flex justify-between items-center text-4xs font-mono text-slate-500">
              <span>Item #{idx + 1}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950/10">
      {/* Toggles bar */}
      <div className="flex items-center justify-between border-b border-slate-850 px-4 py-2 bg-slate-900/30">
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("raw")}
            className={`px-3 py-1 rounded-lg text-3xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === "raw" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Raw JSON</span>
          </button>
          
          {isArrayOfObjects && (
            <>
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-1 rounded-lg text-3xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === "table" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Data Table</span>
              </button>

              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-1 rounded-lg text-3xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                  viewMode === "cards" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards Grid</span>
              </button>
            </>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg cursor-pointer text-3xs transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied!" : "Copy Raw"}</span>
        </button>
      </div>

      {/* Render Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "table" ? renderTable() : viewMode === "cards" ? renderCards() : renderRaw()}
      </div>
    </div>
  );
}
