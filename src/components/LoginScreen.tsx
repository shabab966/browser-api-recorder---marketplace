import React, { useState } from "react";
import { Shield, KeyRound, ArrowRight, Activity } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const endpoint = isSigningUp ? "/api/auth/signup" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadDemoUser = async (demoName: string) => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: demoName }),
      });
      const data = await response.json();
      if (response.ok) {
        onLoginSuccess(data.user);
      } else {
        // Sign up if demo doesn't exist
        const registerResponse = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: demoName }),
        });
        const registerData = await registerResponse.json();
        if (registerResponse.ok) {
          onLoginSuccess(registerData.user);
        } else {
          throw new Error(registerData.error);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load demo user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans text-center">
            Browser API Recorder
          </h1>
          <p className="text-slate-400 text-sm mt-1 text-center font-sans">
            Turn real-time Google Chrome interactions into dynamic, sellable APIs
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-sm flex items-start gap-2 animate-pulse">
            <Shield className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
              Username or Email
            </label>
            <div className="relative">
              <input
                id="username-input"
                type="text"
                placeholder="Enter your username (e.g., shabab)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                required
              />
              <KeyRound className="absolute right-3 top-3.5 w-4 h-4 text-slate-600" />
            </div>
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isSigningUp ? "Create Developer Account" : "Access Console"}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex justify-between items-center text-xs font-mono">
          <button
            id="toggle-auth-mode"
            onClick={() => setIsSigningUp(!isSigningUp)}
            className="text-indigo-400 hover:text-indigo-300 hover:underline transition-all bg-transparent border-none cursor-pointer"
          >
            {isSigningUp ? "Already have an account? Log in" : "Need an account? Sign up"}
          </button>
        </div>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs font-mono uppercase">
            <span className="bg-slate-900 px-3 text-slate-500">Fast Sandbox Access</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            id="demo-user-btn"
            onClick={() => loadDemoUser("shabab")}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-xl flex items-center justify-between text-sm text-slate-300 hover:text-white font-mono transition-all cursor-pointer"
          >
            <span>Use Demo Account: <b>shabab</b></span>
            <span className="text-indigo-400 text-xs">Login &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
}
