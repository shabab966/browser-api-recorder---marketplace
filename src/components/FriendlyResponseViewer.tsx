import React, { useState, useEffect } from "react";
import { Table, LayoutGrid, Code, Copy, Check, ExternalLink } from "lucide-react";

interface FriendlyResponseViewerProps {
  data: any;
}

export default function FriendlyResponseViewer({ data }: FriendlyResponseViewerProps) {
  const [viewMode, setViewMode] = useState<"raw" | "table" | "cards">("raw");
  const [copied, setCopied] = useState(false);
  const [listData, setListData] = useState<any[] | null>(null);

  // Helper to extract a nested list of objects
  const extractList = (val: any): any[] | null => {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
      return val;
    }
    if (val && typeof val === "object") {
      // Look for a key containing an array of objects
      for (const k of Object.keys(val)) {
        const item = val[k];
        if (Array.isArray(item) && item.length > 0 && typeof item[0] === "object" && item[0] !== null) {
          return item;
        }
      }
      // If it contains any array at all
      for (const k of Object.keys(val)) {
        if (Array.isArray(val[k]) && val[k].length > 0) {
          return val[k];
        }
      }
    }
    return null;
  };

  useEffect(() => {
    const list = extractList(data);
    setListData(list);
    if (list) {
      setViewMode("cards"); // Default to Cards view if a list of items is found!
    } else {
      setViewMode("raw");
    }
  }, [data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderRaw = () => (
    <pre className="p-4 pb-8 text-2xs text-slate-300 font-mono whitespace-pre-wrap break-words overflow-y-auto max-h-[400px] leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );

  const renderTable = () => {
    if (!listData) return renderRaw();

    const headersSet = new Set<string>();
    listData.forEach(item => {
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
            {listData.map((row: any, idx: number) => (
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

                  // If it's an image link in the table, show thumbnail
                  const isImg = typeof val === "string" && (val.startsWith("http") && (val.match(/\.(jpeg|jpg|gif|png|webp)/i) || h.toLowerCase().includes("image") || h.toLowerCase().includes("img")));

                  return (
                    <td key={h} className="px-4 py-3 whitespace-nowrap text-slate-300 font-medium">
                      {isImg ? (
                        <img src={val} alt="thumb" className="w-8 h-8 object-cover rounded bg-slate-950 border border-slate-850" />
                      ) : (
                        displayVal
                      )}
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
    if (!listData) return renderRaw();

    return (
      <div className="p-4 overflow-y-auto max-h-[400px] grid grid-cols-1 sm:grid-cols-2 gap-4">
        {listData.map((item: any, idx: number) => {
          let title = `Item #${idx + 1}`;
          let imageVal = "";
          let linkVal = "";
          let priceVal = "";
          const otherParams: [string, any][] = [];

          // Parse key values to map visual sections
          Object.entries(item).forEach(([k, v]) => {
            const lowerKey = k.toLowerCase();
            const stringVal = String(v);

            // 1. Find Title
            if (lowerKey.includes("name") || lowerKey.includes("title") || lowerKey.includes("heading")) {
              title = stringVal;
            }
            // 2. Find Image URL
            else if (lowerKey.includes("image") || lowerKey.includes("img") || (stringVal.startsWith("http") && stringVal.match(/\.(jpeg|jpg|gif|png|webp)/i))) {
              imageVal = stringVal;
            }
            // 3. Find Link URL
            else if (lowerKey.includes("link") || lowerKey.includes("url") || lowerKey.includes("href") || (stringVal.startsWith("http") && !imageVal)) {
              linkVal = stringVal;
            }
            // 4. Find Price
            else if (lowerKey.includes("price") || lowerKey.includes("cost") || lowerKey.includes("rate") || lowerKey.includes("amount") || stringVal.includes("৳") || stringVal.includes("$")) {
              priceVal = stringVal;
            }
            // 5. General parameters
            else {
              otherParams.push([k, v]);
            }
          });

          return (
            <div
              key={idx}
              className="bg-slate-900 border border-slate-850 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200"
            >
              <div className="flex gap-4">
                {/* Image Thumbnail */}
                {imageVal && (
                  <img
                    src={imageVal}
                    alt={title}
                    onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                    className="w-16 h-16 object-cover rounded-lg bg-slate-950 border border-slate-850 shrink-0"
                  />
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-2xs font-bold text-white leading-snug truncate" title={title}>
                      {title}
                    </h4>
                    {priceVal && (
                      <span className="shrink-0 px-2 py-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 rounded text-3xs font-mono font-bold">
                        {priceVal}
                      </span>
                    )}
                  </div>

                  {/* Rest of Key-Values */}
                  {otherParams.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-850/50">
                      {otherParams.slice(0, 4).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center text-3xs gap-4">
                          <span className="text-slate-500 font-mono text-4xs uppercase tracking-wider">{k.replace(/_/g, " ")}</span>
                          <span className="text-slate-300 font-medium truncate max-w-[120px]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {linkVal && (
                <a
                  href={linkVal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3.5 w-full py-1.5 bg-slate-950 hover:bg-indigo-950/40 text-slate-300 hover:text-indigo-400 border border-slate-850 hover:border-indigo-900/40 rounded-lg text-center font-bold text-3xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>View Source Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        })}
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
          
          {listData && (
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
