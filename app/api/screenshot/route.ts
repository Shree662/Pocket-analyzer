import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data missing' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY missing in Vercel' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Updated to active Google model
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.6-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Analyze this Pocket Option trading chart screenshot with strict accuracy.
Detect the pair name, whether it is OTC, visible clock time, and current price.
Evaluate the 1M candle action and return ONLY strict JSON:
{
  "asset": "EUR/USD OTC",
  "isOTC": true,
  "detectedTime": "07:13 PM",
  "detectedTimezone": "Asia/Kolkata",
  "timeframe": "1M",
  "currentPrice": 1.18200,
  "signal": "CALL" or "PUT" or "NO_TRADE",
  "setupScore": 82,
  "trend": "Bullish" or "Bearish" or "Neutral/Choppy",
  "momentum": "Strong Bullish" or "Strong Bearish" or "Neutral",
  "reason": "Clear momentum expansion with dynamic support rejection"
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
    return NextResponse.json(
      { error: err.message || 'Analysis processing failed' },
      { status: 500 }
    );
  }
}
