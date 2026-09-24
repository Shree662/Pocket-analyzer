import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Koi image upload nahi mili.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        signal: 'NO_TRADE',
        setupScore: 50,
        trend: 'Neutral',
        momentum: 'Normal',
        support: 0,
        resistance: 0,
        entry: 'API Key Missing',
        expiryGuidance: 'Wait for confirmation',
        confirmations: [],
        riskFlags: ['Vercel environment mein GEMINI_API_KEY set nahi hai'],
        reason: 'Server par GEMINI_API_KEY missing hai. Vercel Settings mein jaakar key check karein.',
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Analyze this trading chart screenshot. Provide a strict market analysis in pure JSON format:
{
  "asset": "DETECTED_PAIR_OR_EUR_USD",
  "signal": "CALL" or "PUT" or "NO_TRADE",
  "setupScore": 75,
  "trend": "Bullish" or "Bearish" or "Neutral/Choppy",
  "momentum": "Strong Bullish" or "Moderate Bullish" or "Strong Bearish" or "Moderate Bearish" or "Conflicted",
  "support": 1.0820,
  "resistance": 1.0860,
  "entry": "After current candle close",
  "expiryGuidance": "1–2 minutes",
  "confirmations": ["Support bounce", "Bullish rejection"],
  "riskFlags": ["Overbought RSI"],
  "reason": "Clear market direction visible"
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

    const rawText = res.response.text() || '{}';
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      data = match ? JSON.parse(match[0]) : {};
    }

    return NextResponse.json({
      asset: data.asset || 'CHART_SCREENSHOT',
      signal: data.signal === 'CALL' || data.signal === 'PUT' ? data.signal : 'NO_TRADE',
      setupScore: Number(data.setupScore) || 60,
      trend: data.trend || 'Neutral',
      momentum: data.momentum || 'Normal',
      support: Number(data.support) || 0,
      resistance: Number(data.resistance) || 0,
      entry: data.entry || 'Wait for candle close',
      expiryGuidance: data.expiryGuidance || '1–2 minutes',
      confirmations: Array.isArray(data.confirmations) ? data.confirmations : [],
      riskFlags: Array.isArray(data.riskFlags) ? data.riskFlags : [],
      reason: data.reason || 'Screenshot analyzed successfully.',
      waitFor: data.signal === 'NO_TRADE' ? 'Confirmation breakout' : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Analysis processing failed' },
      { status: 500 }
    );
  }
}
