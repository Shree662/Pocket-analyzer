import { Candle, DataSourceType } from '../types';

export class MockMarketAdapter {
  getDataSourceType(): DataSourceType {
    return 'DEMO_DATA';
  }

  async getCandles(asset: string, timeframe: string, count: number = 75): Promise<Candle[]> {
    const candles: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);
    const interval = timeframe === '5M' ? 300 : timeframe === '15M' ? 900 : 60;
    let price = asset === 'USD/JPY' ? 152.20 : 1.0850;

    for (let i = count; i >= 0; i--) {
      const time = now - i * interval;
      const change = (Math.random() - 0.49) * 0.0003;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * 0.00015;
      const low = Math.min(open, close) - Math.random() * 0.00015;
      candles.push({ time, open, high, low, close, volume: Math.floor(Math.random() * 500 + 50) });
      price = close;
    }
    return candles;
  }
}
