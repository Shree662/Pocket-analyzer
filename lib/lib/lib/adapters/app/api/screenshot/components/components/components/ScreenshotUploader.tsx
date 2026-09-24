'use client';

import React, { useState } from 'react';
import { AnalysisOutput } from '../lib/types';

interface Props {
  onAnalysisComplete: (result: AnalysisOutput) => void;
}

export default function ScreenshotUploader({ onAnalysisComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/api/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        onAnalysisComplete(data);
      } catch (err: any) {
        setError(err.message || 'Error analyzing image.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 text-center">
      <p className="text-xs text-slate-400 mb-3">Upload Pocket Option Chart Screenshot for AI Analysis</p>
      <label className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs cursor-pointer">
        {loading ? 'AI Analyzing Chart...' : 'Upload Chart Screenshot'}
        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
      </label>
      {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
    </div>
  );
}
