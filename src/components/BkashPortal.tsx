import React, { useState } from "react";
import { CreditCard, Smartphone, Check, HelpCircle, ArrowRight, ShieldCheck, History } from "lucide-react";

interface BkashPortalProps {
  userId: string;
  onPaymentSuccess: (updatedUser: any) => void;
  onClose: () => void;
}

export default function BkashPortal({ userId, onPaymentSuccess, onClose }: BkashPortalProps) {
  const [amount, setAmount] = useState("100");
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !senderNumber || !trxId) {
      setErrorMsg("Please fill out all fields.");
      return;
    }

    if (!senderNumber.match(/^01[3-9]\d{8}$/)) {
      setErrorMsg("Invalid bKash number. Must be a valid 11-digit Bangladeshi number starting with 01.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const response = await fetch("/api/bkash/deposit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("authToken")}` 
        },
        body: JSON.stringify({
          userId,
          amount: parseFloat(amount),
          trxId: trxId.trim(),
          senderNumber: senderNumber.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "bKash Verification Failed");
      }

      setSuccessMsg(data.message);
      onPaymentSuccess(data.user);
      
      // Auto close after 3s
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "SMS verification failed. Ensure TrxID is valid.");
    } finally {
      setLoading(false);
    }
  };

  const autoFillMockData = () => {
    // Generates logical mock transaction ID to test easily
    const randomTrx = "BK" + Math.random().toString(36).substring(2, 10).toUpperCase();
    setSenderNumber("01712345678");
    setTrxId(randomTrx);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
        
        {/* bKash Pink Header Banner */}
        <div className="bg-[#e2125d] p-6 text-white relative">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold tracking-tight">bKash Payment Gateway</h2>
              <p className="text-pink-100 text-xs mt-1">Simulated Live SMS Billing Terminal</p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-pink-200 font-bold text-lg bg-transparent border-none cursor-pointer p-1"
            >
              &times;
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <span className="text-2xs uppercase tracking-wider font-mono font-semibold bg-pink-800/40 px-2.5 py-1 rounded">
              bKash Merchant: +880 1711-750169
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {successMsg ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Deposit Verified!</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">
                {successMsg}
              </p>
              <p className="text-xs text-indigo-400 font-mono">Redirecting to console...</p>
            </div>
          ) : (
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              
              {/* Step By Step Guide */}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-400">
                <p className="font-semibold text-slate-200 flex items-center gap-1.5 mb-1 font-mono uppercase tracking-wider">
                  <Smartphone className="w-3.5 h-3.5 text-pink-500" />
                  How to Deposit Funds (BDT)
                </p>
                <ol className="list-decimal list-inside space-y-1 font-sans">
                  <li>Dial <span className="text-white">*247#</span> or open your bKash App.</li>
                  <li>Perform <span className="font-semibold text-white">Send Money</span> to: <span className="font-mono text-pink-400 font-semibold">+880 1711-750169</span></li>
                  <li>Copy the unique <span className="font-semibold text-white">TrxID</span> from your bKash success message.</li>
                  <li>Paste the details below to complete deposit!</li>
                </ol>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs flex gap-1.5">
                  <span className="font-bold">Error:</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Input Fields */}
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">
                    Amount (BDT / Taka)
                  </label>
                  <select
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-pink-500"
                  >
                    <option value="50">50 BDT (Starter Tier)</option>
                    <option value="100">100 BDT (Standard Tier)</option>
                    <option value="250">250 BDT (Pro Volume)</option>
                    <option value="500">500 BDT (Enterprise Scale)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">
                    Sender bKash Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 01712345678"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wide">
                    bKash SMS TrxID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BK91A0Z8X"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#e2125d] hover:bg-pink-700 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Submit bKash Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
