import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeWebsite, getAnalyzeErrorMessage } from '../services/scrapeService';
import { useDashboardStore } from '../store/dashboardStore';

export function LandingPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setFromResponse = useDashboardStore((s) => s.setFromResponse);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a URL.');
      return;
    }

    setLoading(true);
    try {
      const response = await analyzeWebsite(trimmed);
      setFromResponse(response);
      navigate('/dashboard');
    } catch (err) {
      setError(getAnalyzeErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
                <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
                <rect x="9" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.3" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">StyleSync</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Extract any design system
        </h1>
        <p className="text-gray-400 text-center mb-10 text-sm">
          Paste a website URL to extract colors, typography, and spacing as editable design tokens.
        </p>

        <form onSubmit={handleAnalyze} className="space-y-3">
          <div className="flex gap-2">
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://stripe.com"
              className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold transition text-sm whitespace-nowrap"
            >
              {loading ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>

          {error && (
            <p className="text-red-400 text-sm" role="alert">
              {error}
            </p>
          )}
        </form>

        {loading && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-gray-400 text-sm">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Scraping website and extracting tokens… this may take a minute.
            </div>
          </div>
        )}

        <p className="text-gray-600 text-xs text-center mt-8">
          Try: stripe.com · vercel.com · linear.app · tailwindcss.com
        </p>
      </div>
    </div>
  );
}
