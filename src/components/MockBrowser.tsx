import React, { useState, useEffect } from "react";
import { Chrome, Search, ArrowLeft, ArrowRight, RotateCw, CheckCircle2, AlertCircle, Sparkles, Move, MousePointerClick, FileCode2 } from "lucide-react";

interface MockBrowserProps {
  isRecording: boolean;
  onRecordStep: (step: any) => void;
  recordedSteps: any[];
}

type SiteTab = "hn" | "amazon" | "wikipedia";

export default function MockBrowser({ isRecording, onRecordStep, recordedSteps }: MockBrowserProps) {
  const [currentTab, setCurrentTab] = useState<SiteTab>("hn");
  const [url, setUrl] = useState("https://news.ycombinator.com");
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchedText, setSearchedText] = useState("AI Studio");
  const [wikiResult, setWikiResult] = useState({
    title: "AI Studio (Google)",
    description: "Google AI Studio is a fast, web-based prototyping environment for developers to experiment with Gemini models. It provides a quick way to test prompts, system instructions, and export structured code snippets to full-stack applications.",
    lastUpdated: "June 2026",
    links: ["Gemini 3.5 Flash", "Antigravity Agent", "Model Playground"]
  });

  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInputText, setUrlInputText] = useState("https://news.ycombinator.com");

  useEffect(() => {
    setUrlInputText(url);
  }, [url]);

  // Track page change to match URL
  useEffect(() => {
    if (currentTab === "hn") {
      setUrl("https://news.ycombinator.com");
    } else if (currentTab === "amazon") {
      setUrl("https://www.amazon.com/dp/B08H27F9H2");
    } else {
      setUrl("https://en.wikipedia.org/wiki/Special:Search");
    }
    
    if (isRecording) {
      onRecordStep({
        id: "step-" + Math.random().toString(36).substring(2, 9),
        action: "navigate",
        url: currentTab === "hn" ? "https://news.ycombinator.com" : currentTab === "amazon" ? "https://amazon.com/dp/B08H27F9H2" : "https://en.wikipedia.org/wiki/Special:Search",
        description: `Navigate browser viewport to ${currentTab === "hn" ? "Hacker News" : currentTab === "amazon" ? "Amazon Product page" : "Wikipedia search"}`
      });
    }
  }, [currentTab]);

  const handleElementAction = (action: "click" | "scrape", selector: string, description: string) => {
    if (!isRecording) return;
    
    let label: string | null = null;
    let finalDesc = description;
    
    if (action === "scrape") {
      label = prompt("Enter a JSON key name to label this scraped data (e.g. product_name, price, score):");
      if (!label) {
        alert("Scrape action canceled (label is required to structure JSON output).");
        return;
      }
      label = label.trim().replace(/[^a-zA-Z0-9_]/g, "");
      if (!label) {
        alert("Invalid label. Use only letters, numbers, and underscores.");
        return;
      }
      finalDesc = `Scrape elements matching selector ${selector} and label output as "${label}"`;
    }

    onRecordStep({
      id: "step-" + Math.random().toString(36).substring(2, 9),
      action,
      selector,
      description: finalDesc,
      ...(label ? { label } : {})
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
  };

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const query = inputText.trim();
    setSearchedText(query);
    
    if (currentTab === "wikipedia") {
      setWikiResult({
        title: `Searching Wikipedia for "${query}"...`,
        description: "Querying Wikipedia REST API servers in real-time...",
        lastUpdated: "Loading...",
        links: []
      });

      try {
        const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, "_"))}`);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          
          let relatedLinks = ["Related Topic X", "Related Topic Y", "Related Topic Z"];
          try {
            const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=4&namespace=0&format=json&origin=*`);
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              if (searchData[1] && searchData[1].length > 1) {
                relatedLinks = searchData[1].filter((t: string) => t.toLowerCase() !== query.toLowerCase()).slice(0, 3);
              }
            }
          } catch (err) {
            console.error("Related search failed:", err);
          }

          setWikiResult({
            title: summaryData.title,
            description: summaryData.extract || "No article summary details available.",
            lastUpdated: summaryData.timestamp ? new Date(summaryData.timestamp).toLocaleDateString() : "Recently updated",
            links: relatedLinks.length > 0 ? relatedLinks : ["No related nodes found."]
          });
        } else {
          const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=4&namespace=0&format=json&origin=*`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData[1] && searchData[1].length > 0) {
              const mainTitle = searchData[1][0];
              const desc = searchData[2][0] || `Search results matching ${query} on Wikipedia.`;
              const links = searchData[1].slice(1, 4);
              setWikiResult({
                title: mainTitle,
                description: desc,
                lastUpdated: "Search results",
                links: links.length > 0 ? links : ["Related Node A", "Dynamic Data B"]
              });
            } else {
              setWikiResult({
                title: `No article found for "${query}"`,
                description: "Wikipedia could not find an exact match for this topic. Please try searching for something else like 'Bangladesh', 'Computer science', or 'Google'.",
                lastUpdated: "N/A",
                links: ["Return to Main Page"]
              });
            }
          }
        }
      } catch (err) {
        console.error("Wikipedia fetch failed, falling back:", err);
        setWikiResult({
          title: `${query} (Scraped Topic)`,
          description: `Virtual Scraping Results for "${query}". Wikipedia search returned simulated results under selector '.mw-parser-output' due to connection timeout.`,
          lastUpdated: "Recently updated",
          links: ["Related Node A", "Dynamic Data B", "Index Reference C"]
        });
      }
    }

    if (isRecording) {
      onRecordStep({
        id: "step-" + Math.random().toString(36).substring(2, 9),
        action: "input",
        selector: "#search-input",
        value: query,
        description: `Input text "${query}" into search field`
      });
      onRecordStep({
        id: "step-" + Math.random().toString(36).substring(2, 9),
        action: "click",
        selector: "#search-submit",
        description: `Click search button to refresh viewport results`
      });
    }
    setInputText("");
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = urlInputText.trim().toLowerCase();
    
    if (cleanUrl.includes("wikipedia") || cleanUrl.includes("wiki")) {
      setCurrentTab("wikipedia");
    } else if (cleanUrl.includes("amazon") || cleanUrl.includes("amzn")) {
      setCurrentTab("amazon");
    } else if (cleanUrl.includes("ycombinator") || cleanUrl.includes("news") || cleanUrl.includes("hn")) {
      setCurrentTab("hn");
    } else {
      alert("This Sandbox Emulator only supports news.ycombinator.com, amazon.com, and wikipedia.org.\n\nTo record scraper scenarios on any real live website, please download and use our Chrome/Edge Extension shown below!");
      setUrlInputText(url);
    }
    setIsEditingUrl(false);
  };

  return (
    <div id="browser-sandbox-container" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[640px]">
      {/* Chrome Style Top Bar */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 py-3 flex items-center gap-3">
        {/* Navigation Dots */}
        <div className="flex gap-1.5 shrink-0">
          <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
        </div>

        {/* Tab triggers */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 shrink-0 ml-4">
          <button
            id="tab-hn"
            onClick={() => setCurrentTab("hn")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${currentTab === "hn" ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"}`}
          >
            Hacker News
          </button>
          <button
            id="tab-amazon"
            onClick={() => setCurrentTab("amazon")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${currentTab === "amazon" ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"}`}
          >
            Amazon Product
          </button>
          <button
            id="tab-wiki"
            onClick={() => setCurrentTab("wikipedia")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${currentTab === "wikipedia" ? "bg-slate-800 text-indigo-400" : "text-slate-400 hover:text-slate-200"}`}
          >
            Wikipedia
          </button>
        </div>

        {/* Browser control arrows */}
        <div className="flex items-center gap-2 text-slate-500 shrink-0 ml-2">
          <ArrowLeft className="w-4 h-4 cursor-not-allowed" />
          <ArrowRight className="w-4 h-4 cursor-not-allowed" />
          <RotateCw className="w-4 h-4 hover:text-slate-300 cursor-pointer" />
        </div>

        {/* URL Bar */}
        <div className="flex-1 max-w-xl">
          {isEditingUrl ? (
            <form onSubmit={handleUrlSubmit} className="w-full flex">
              <input
                type="text"
                value={urlInputText}
                onChange={(e) => setUrlInputText(e.target.value)}
                onBlur={() => {
                  setTimeout(() => {
                    setIsEditingUrl(false);
                    setUrlInputText(url);
                  }, 200);
                }}
                autoFocus
                className="w-full bg-slate-900 border border-indigo-500 rounded-lg px-3 py-1 text-slate-200 text-xs font-mono focus:outline-none"
              />
            </form>
          ) : (
            <div 
              onClick={() => setIsEditingUrl(true)}
              className="w-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 text-slate-400 text-xs font-mono select-none overflow-hidden cursor-text transition-all"
              title="Click to type custom URL"
            >
              <Chrome className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-emerald-500">https://</span>
              <span className="text-slate-200 truncate">{url.replace("https://", "")}</span>
            </div>
          )}
        </div>

        <div className="text-xs text-indigo-400 font-mono flex items-center gap-1 shrink-0 font-semibold bg-indigo-950/40 px-2 py-1 rounded border border-indigo-900/60">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Chrome Emulator</span>
        </div>
      </div>

      {/* Recording Help Banner */}
      {isRecording && (
        <div className="bg-rose-950/30 border-b border-rose-900/40 py-2 px-4 flex justify-between items-center text-xs font-mono text-rose-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span>Recording Active. Click on elements below to target them for **clicks** or **data scraping**!</span>
          </div>
          <span className="text-slate-500 text-2xs">{recordedSteps.length} Steps Logged</span>
        </div>
      )}

      {/* Embedded Viewport Simulation */}
      <div className="flex-1 bg-slate-950 p-6 overflow-y-auto relative text-slate-300 font-sans">
        
        {/* HACKER NEWS SIMULATION */}
        {currentTab === "hn" && (
          <div className="max-w-3xl mx-auto bg-amber-50/5 text-amber-100 rounded border border-amber-900/20 p-4 font-sans text-sm shadow-md">
            {/* HN Banner */}
            <div className="bg-amber-600/10 border border-amber-500/20 p-2.5 flex justify-between items-center rounded mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs rounded">Y</span>
                <span className="font-bold text-slate-100">Hacker News Scraper View</span>
              </div>
              <span className="text-xs text-amber-500 font-mono select-none">news.ycombinator.com</span>
            </div>

            {/* HN Stories */}
            <div className="space-y-4">
              {[
                { id: 1, title: "Gemini 3.5 Flash: Redefining developer speed and context bounds", domain: "google.com", score: 324, user: "ai_enthusiast", time: "2 hours ago" },
                { id: 2, title: "An elegant bKash billing client implementation in React 19", domain: "github.com/shabab", score: 148, user: "shabab", time: "4 hours ago" },
                { id: 3, title: "Why chrome extensions make API generation frictionless", domain: "browsertech.org", score: 92, user: "cyber_dev", time: "5 hours ago" },
                { id: 4, title: "Show HN: Headless virtual scraper engines using Google GenAI", domain: "aistudio.dev", score: 285, user: "deepmind_coder", time: "8 hours ago" },
              ].map((story, idx) => (
                <div
                  key={story.id}
                  onMouseEnter={() => setHoveredElement(`story-${story.id}`)}
                  onMouseLeave={() => setHoveredElement(null)}
                  className={`p-2 rounded border border-transparent transition-all relative ${
                    hoveredElement === `story-${story.id}` ? "bg-amber-500/10 border-amber-500/30" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 font-mono text-xs mt-0.5">{idx + 1}.</span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-100 text-sm hover:underline cursor-pointer">{story.title}</span>
                        <span className="text-slate-500 text-xs font-mono">({story.domain})</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex gap-2">
                        <span>{story.score} points by {story.user}</span>
                        <span>|</span>
                        <span>{story.time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scrape Target Selectors Overlay */}
                  {isRecording && hoveredElement === `story-${story.id}` && (
                    <div className="absolute right-2 top-2 flex gap-1 animate-fade-in z-10">
                      <button
                        onClick={() => handleElementAction(
                          "click", 
                          `.story-row:nth-child(${idx + 1}) .titleline a`, 
                          `Click Hacker News link: "${story.title}"`
                        )}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-2xs font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <MousePointerClick className="w-2.5 h-2.5" />
                        <span>Record Click</span>
                      </button>
                      <button
                        onClick={() => handleElementAction(
                          "scrape", 
                          `.story-row .titleline`, 
                          `Scrape front-page story titles and links`
                        )}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <FileCode2 className="w-2.5 h-2.5" />
                        <span>Scrape Element</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AMAZON E-COMMERCE SIMULATION */}
        {currentTab === "amazon" && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded p-5 font-sans">
            <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
              <span className="font-bold text-lg text-orange-400">amazon<span className="text-white">.com</span></span>
              <span className="text-xs text-slate-500 font-mono">ASIN: B08H27F9H2</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Image representation */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[220px]">
                <div className="w-32 h-32 rounded-xl bg-gradient-to-tr from-orange-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <Chrome className="w-12 h-12 text-slate-900" />
                </div>
                <span className="text-slate-400 text-xs font-semibold mt-4">Wireless ANC Headset Gen-4</span>
              </div>

              {/* Product details */}
              <div className="space-y-4 relative">
                <div
                  onMouseEnter={() => setHoveredElement("product-title")}
                  onMouseLeave={() => setHoveredElement(null)}
                  className={`p-2 rounded border border-transparent transition-all relative ${
                    hoveredElement === "product-title" ? "bg-orange-500/10 border-orange-500/30" : ""
                  }`}
                >
                  <h2 className="text-lg font-bold text-white leading-tight">Sony Premium Noise Cancelling Headphones - WH-1000XM4</h2>
                  <p className="text-xs text-slate-400 mt-1">Brand: Sony | Electronics Suite</p>

                  {isRecording && hoveredElement === "product-title" && (
                    <div className="absolute right-2 top-2 flex gap-1 z-10">
                      <button
                        onClick={() => handleElementAction("scrape", "#productTitle", "Scrape Amazon Product Title")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                      >
                        <FileCode2 className="w-2.5 h-2.5" />
                        <span>Scrape Title</span>
                      </button>
                    </div>
                  )}
                </div>

                <div
                  onMouseEnter={() => setHoveredElement("product-price")}
                  onMouseLeave={() => setHoveredElement(null)}
                  className={`p-2 rounded border border-transparent transition-all relative ${
                    hoveredElement === "product-price" ? "bg-orange-500/10 border-orange-500/30" : ""
                  }`}
                >
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-slate-400 font-semibold">$</span>
                    <span className="text-2xl font-bold text-orange-400" id="amazon-price">348.00</span>
                    <span className="text-xs text-slate-400 line-through ml-2">$399.99</span>
                  </div>
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">In Stock - Fast Free Delivery</p>

                  {isRecording && hoveredElement === "product-price" && (
                    <div className="absolute right-2 top-2 flex gap-1 z-10">
                      <button
                        onClick={() => handleElementAction("scrape", "#priceBlock", "Scrape Live Product Price ($348.00)")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                      >
                        <FileCode2 className="w-2.5 h-2.5" />
                        <span>Scrape Price</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-2 border border-slate-800 rounded bg-slate-950/40 text-xs">
                  <span className="font-semibold text-slate-300">Ratings:</span> 4.8 / 5 stars (24,810 reviews)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WIKIPEDIA / SEARCH SIMULATION */}
        {currentTab === "wikipedia" && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded p-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4 justify-between">
              <span className="text-xs text-slate-400">en.wikipedia.org/wiki/Special:Search</span>
              <span className="font-mono text-2xs text-slate-500 bg-slate-950 px-2 py-0.5 rounded">Scraping Demo View</span>
            </div>

            {/* Simulated Search Input form */}
            <form onSubmit={handleInputSubmit} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Search Wikipedia topic..."
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-slate-950 border border-slate-800 px-3 py-2 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </form>

            <div
              onMouseEnter={() => setHoveredElement("wiki-block")}
              onMouseLeave={() => setHoveredElement(null)}
              className={`p-4 bg-slate-950 border rounded-lg relative transition-all ${
                hoveredElement === "wiki-block" ? "bg-indigo-500/5 border-indigo-500/20" : "border-slate-800"
              }`}
            >
              <h3 className="font-bold text-slate-100 text-base mb-1" id="wiki-title">{wikiResult.title}</h3>
              <p className="text-xs text-slate-500 mb-3">From Wikipedia, the free browser repository</p>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">{wikiResult.description}</p>
              
              <div className="border-t border-slate-800/80 pt-3">
                <p className="text-2xs text-slate-500 uppercase font-mono tracking-wider mb-2">Parsed Index Links</p>
                <div className="flex gap-2 flex-wrap">
                  {wikiResult.links.map(link => (
                    <span key={link} className="text-indigo-400 text-2xs bg-indigo-950/40 border border-indigo-900/30 px-2 py-1 rounded">
                      {link}
                    </span>
                  ))}
                </div>
              </div>

              {isRecording && hoveredElement === "wiki-block" && (
                <div className="absolute right-2 top-2 flex gap-1 z-10">
                  <button
                    onClick={() => handleElementAction("scrape", ".mw-parser-output", `Scrape Wikipedia article text about "${searchedText}"`)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-semibold px-2 py-1 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <FileCode2 className="w-2.5 h-2.5" />
                    <span>Scrape Content</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
