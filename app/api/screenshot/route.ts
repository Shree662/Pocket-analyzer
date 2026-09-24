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
      return NextResponse.json({
        asset: 'AUD/CHF OTC',
        isOTC: true,
        detectedTime: '06:51 PM',
        detectedTimezone: 'Asia/Kolkata',
        timeframe: '1M',
        currentPrice: 0.53661,
        signal: 'NO_TRADE',
        setupScore: 50,
        trend: 'Neutral',
        momentum: 'Normal',
        reason: 'GEMINI_API_KEY is not configured in Vercel Settings. Please add your key in Environment Variables.',
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `Analyze this Pocket Option trading chart screenshot with strict accuracy.
Detect the pair name, whether it is OTC, visible clock time, and current price.
Evaluate the 1M candle action and return ONLY strict JSON:
{
  "asset": "EUR/USD OTC",
  "isOTC": true,
  "detectedTime": "06:52 PM",
  "detectedTimezone": "UNKNOWN",
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
      { error: err.message || 'Analysis processing timed out' },
      { status: 500 }
    );
  }
}
