import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

const NUM_YEARS_BACK = 6;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const stock = searchParams.get('stock');

  if (!stock) {
    return NextResponse.json({ error: 'Missing stock parameter' }, { status: 400 });
  }

  const end = new Date();
  end.setFullYear(end.getFullYear() - (end.getMonth() < 3 ? 1 : 0)); // Clip to last full year if before April
  end.setMonth(0, 1);  // January 1
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setFullYear(end.getFullYear() - 6); // 6 full years back


  try {
    const result = await yahooFinance.chart(stock, {
      period1: start,
      period2: end,
      interval: '3mo', // valid: '1d', '1wk', '1mo'
    });

    if (!result.quotes || result.quotes.length != NUM_YEARS_BACK * 4 + 1) {
      return NextResponse.json({ error: `Failed to fetch past ${NUM_YEARS_BACK} years of data, got ${result.quotes.length} instead` });
    }

    // Extract one quote per year (the first quarter's open price)
    const yearlyOpens = result.quotes.filter((_, idx) => idx % 4 === 0).map(q => q.open) as number[];

    // Calculate yearly percent increases
    const yearlyReturns = [];
    for (let i = 1; i < yearlyOpens.length; i++) {
      const pctChange = (yearlyOpens[i] - yearlyOpens[i - 1]) / yearlyOpens[i - 1];
      yearlyReturns.push(pctChange);
    }

    // Mean of returns
    const normalReturnMean =
      yearlyReturns.reduce((sum, r) => sum + r, 0) / yearlyReturns.length;

    // Standard deviation
    const variance =
      yearlyReturns.reduce((sum, r) => sum + (r - normalReturnMean) ** 2, 0) / yearlyReturns.length;

    const normalReturnStd = Math.sqrt(variance);

    return NextResponse.json({
      returnType: 'random_normal',
      returnAmtOrPct: 'percent',
      normalReturnMean: (normalReturnMean * 100).toFixed(3),
      normalReturnStd: (normalReturnStd * 100).toFixed(3)
    });
  } catch (error) {
    return NextResponse.json({ error: `Failed to fetch recent stock data` }, { status: 500 });
  }
}
