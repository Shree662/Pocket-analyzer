import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: 'No image' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        signal: 'NO_TRADE',
        setupScore: 0,
        dataSource: 'SCREENSHOT_DATA',
        reason: 'GEMINI_API_KEY is missing on server settings.',
        confirmations: [],
        riskFlags: ['API key missing'],
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analyze this Pocket Option chart screenshot for 1M binary setup. 
Return ONLY JSON:
{
  "asset": "EUR/USD",
  "timeframe": "1 MINUTE",
  "signal": "CALL" | "PUT" | "NO_TRADE",
  "setupScore": 75,
  "trend": "Bullish" | "Bearish" | "Neutral/Choppy",
  "momentum": "Strong Bullish" | "Moderate Bullish" | "Strong Bearish" | "Moderate Bearish" | "Conflicted",
  "volatility": "Normal",
  "support": 1.0800,
  "resistance": 1.0850,
  "entry": "After close",
  "expiryGuidance": "1–2 minutes",
  "confirmations": ["pattern rejection"],
  "riskFlags": ["none"],
  "reason": "Clear breakout and rejection."
}`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType || 'image/png', data: imageBase64 } },
          ],
        },
      ],
    });

    const cleaned = (res.text || '{}').replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleaned);
    data.dataSource = 'SCREENSHOT_DATA';
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
