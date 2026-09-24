'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { Candle, KeyLevels } from '../lib/types';
import { calculateEMA } from '../lib/indicators';

interface Props {
  candles: Candle[];
  levels?: KeyLevels | null;
  indicatorsEnabled: {
    ema9: boolean;
    ema21: boolean;
    ema50: boolean;
    levels: boolean;
  };
}

export default function CandlestickChart({ candles, levels, indicatorsEnabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 340,
      layout: {
        background: { color: '#090D16' },
        textColor: '#8492A6',
      },
      grid: {
        vertLines: { color: '#141D2E' },
        horzLines: { color: '#141D2E' },
      },
      timeScale: {
        borderColor: '#1F293D',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#1F293D',
      },
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    candleSeries.setData(
      candles.map(c => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    const closes = candles.map(c => c.close);

    if (indicatorsEnabled.ema9) {
      const ema9 = calculateEMA(closes, 9);
      const s = chart.addSeries(LineSeries, { color: '#38BDF8', lineWidth: 1 });
      s.setData(candles.map((c, i) => ({ time: c.time as any, value: ema9[i] || c.close })));
    }
    if (indicatorsEnabled.ema21) {
      const ema21 = calculateEMA(closes, 21);
      const s = chart.addSeries(LineSeries, { color: '#FBBF24', lineWidth: 1 });
      s.setData(candles.map((c, i) => ({ time: c.time as any, value: ema21[i] || c.close })));
    }
    if (indicatorsEnabled.ema50) {
      const ema50 = calculateEMA(closes, 50);
      const s = chart.addSeries(LineSeries, { color: '#A855F7', lineWidth: 2 });
      s.setData(candles.map((c, i) => ({ time: c.time as any, value: ema50[i] || c.close })));
    }

    if (indicatorsEnabled.levels && levels) {
      if (levels.support > 0) {
        candleSeries.createPriceLine({ price: levels.support, color: '#10B981', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'SUPP' });
      }
      if (levels.resistance > 0) {
        candleSeries.createPriceLine({ price: levels.resistance, color: '#EF4444', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'RES' });
      }
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, indicatorsEnabled, levels]);

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-800 bg-[#090D16]">
      <div ref={containerRef} className="w-full h-[340px]" />
    </div>
  );
}
