import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        signal: 'NO_TRADE',
        setupScore: 0,
        trend: 'Neutral',
        momentum: 'Normal',
        support: 0,
        resistance: 0,
        entry: 'API Key Missing',
        expiryGuidance: 'Wait',
        confirmations: [],
        riskFlags: ['Vercel environment me GEMINI_API_KEY missing hai'],
        reason: 'Server environment missing Gemini API key.',
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Inspect this Pocket Option chart screenshot with strict data truthfulness.
Analyze visible labels, asset name, OTC label, current tick price, visible time/timezone, and candlestick action.

Return ONLY JSON:
{
  "asset": "EUR/USD",
  "isOTC": true,
  "detectedTime": "02:06 PM",
  "detectedTimezone": "UNKNOWN",
  "timeframe": "1M",
  "currentPrice": 1.08427,
  "signal": "CALL" | "PUT" | "NO_TRADE",
  "setupScore": 82,
  "trend": "Bullish" | "Bearish" | "Neutral/Choppy",
  "momentum": "Strong Bullish" | "Strong Bearish" | "Neutral",
  "support": 1.08390,
  "resistance": 1.08510,
  "entry": "After current candle close",
  "expiryGuidance": "1–2 minutes",
  "confirmations": ["Support bounce", "Bullish rejection wick"],
  "riskFlags": ["Approaching resistance band"],
  "reason": "Clear breakout with momentum alignment",
  "waitFor": "Wait for candle to close green"
}`;

    const res = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);

    const raw = res.response.text() || '{}';
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : {};
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}
