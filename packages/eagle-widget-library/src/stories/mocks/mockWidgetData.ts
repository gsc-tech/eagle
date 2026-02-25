export const mockTableData = [
    {
        symbol: "NIFTY",
        price: 22150,
        change: 120,
        volume: 1245000,
    },
    {
        symbol: "BANKNIFTY",
        price: 46800,
        change: -210,
        volume: 845000,
    },
    {
        symbol: "FINNIFTY",
        price: 21400,
        change: 45,
        volume: 312000,
    },
];

// Generate mock line chart data - 30 days of data
const generateDateRange = (days: number, startValue: number, volatility: number = 50) => {
    const data = [];
    const now = new Date();
    let currentValue = startValue;

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Add some randomness to make it look realistic
        const change = (Math.random() - 0.5) * volatility;
        currentValue += change;

        data.push({
            date: date.toISOString(),
            value: Math.round(currentValue * 100) / 100,
        });
    }

    return data;
};

export const mockLineChartData = generateDateRange(30, 22000, 100);

export const mockVolatileChartData = generateDateRange(30, 45000, 500);

export const mockSteadyGrowthData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (30 - i));
    return {
        date: date.toISOString(),
        value: 20000 + (i * 50) + (Math.random() - 0.5) * 30,
    };
});

// Generate mock candlestick data
const generateCandlestickData = (days: number, startPrice: number, trend: 'bullish' | 'bearish' | 'volatile' = 'volatile') => {
    const data = [];
    const now = new Date();
    let currentPrice = startPrice;

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Generate OHLC data
        let open = currentPrice;
        let volatility = startPrice * 0.02; // 2% volatility

        // Apply trend
        if (trend === 'bullish') {
            currentPrice += (Math.random() * volatility * 0.5) + (volatility * 0.1);
        } else if (trend === 'bearish') {
            currentPrice -= (Math.random() * volatility * 0.5) + (volatility * 0.1);
        } else {
            currentPrice += (Math.random() - 0.5) * volatility;
        }

        const high = Math.max(open, currentPrice) + (Math.random() * volatility * 0.3);
        const low = Math.min(open, currentPrice) - (Math.random() * volatility * 0.3);
        const close = currentPrice;

        data.push({
            date: date.toISOString(),
            open: Math.round(open * 100) / 100,
            high: Math.round(high * 100) / 100,
            low: Math.round(low * 100) / 100,
            close: Math.round(close * 100) / 100,
        });
    }

    return data;
};

export const mockCandlestickData = generateCandlestickData(30, 22000, 'volatile');

export const mockBullishCandlestickData = generateCandlestickData(30, 21000, 'bullish');

export const mockBearishCandlestickData = generateCandlestickData(30, 23000, 'bearish');

export const mockShortTermCandlestickData = generateCandlestickData(7, 22000, 'volatile');

export const mockLongTermCandlestickData = generateCandlestickData(90, 20000, 'bullish');

// Mock data for AreaChart (reuse line chart data structure)
export const mockAreaChartData = mockLineChartData;
export const mockVolatileAreaData = mockVolatileChartData;
export const mockSteadyAreaData = mockSteadyGrowthData;

// Mock data for BarChart (volume data with OHLC for color determination)
const generateBarChartData = (days: number, baseVolume: number, trend: 'bullish' | 'bearish' | 'volatile' = 'volatile') => {
    const data = [];
    const now = new Date();
    let currentPrice = 22000;

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        const open = currentPrice;
        const volatility = 440; // 2% of 22000

        if (trend === 'bullish') {
            currentPrice += (Math.random() * volatility * 0.5) + (volatility * 0.1);
        } else if (trend === 'bearish') {
            currentPrice -= (Math.random() * volatility * 0.5) + (volatility * 0.1);
        } else {
            currentPrice += (Math.random() - 0.5) * volatility;
        }

        const close = currentPrice;
        const volume = baseVolume + (Math.random() - 0.5) * baseVolume * 0.5;

        data.push({
            time: date.toISOString(),
            date: date.toISOString(),
            volume: Math.round(volume),
            open: Math.round(open * 100) / 100,
            close: Math.round(close * 100) / 100,
        });
    }

    return data;
};

export const mockBarChartData = generateBarChartData(30, 1000000, 'volatile');
export const mockHighVolumeBarData = generateBarChartData(30, 5000000, 'bullish');
export const mockLowVolumeBarData = generateBarChartData(30, 500000, 'bearish');

// Mock data for EconomicCalendar
export const mockEconomicCalendarData = [
    {
        id: "1",
        datetime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        country: "US",
        currency: "USD",
        event: "Non-Farm Payrolls",
        importance: "high" as const,
        actual: null,
        forecast: 185000,
        previous: 175000,
    },
    {
        id: "2",
        datetime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
        country: "EU",
        currency: "EUR",
        event: "ECB Interest Rate Decision",
        importance: "high" as const,
        actual: null,
        forecast: 4.5,
        previous: 4.25,
    },
    {
        id: "3",
        datetime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        country: "GB",
        currency: "GBP",
        event: "GDP Growth Rate",
        importance: "medium" as const,
        actual: 0.3,
        forecast: 0.2,
        previous: 0.1,
    },
    {
        id: "4",
        datetime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        country: "JP",
        currency: "JPY",
        event: "Retail Sales",
        importance: "low" as const,
        actual: 1.2,
        forecast: 1.0,
        previous: 0.8,
    },
    {
        id: "5",
        datetime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
        country: "IN",
        currency: "INR",
        event: "CPI Inflation Rate",
        importance: "high" as const,
        actual: null,
        forecast: 5.8,
        previous: 5.5,
    },
    {
        id: "6",
        datetime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        country: "CN",
        currency: "CNY",
        event: "Manufacturing PMI",
        importance: "medium" as const,
        actual: 50.2,
        forecast: 50.0,
        previous: 49.8,
    },
];

export const mockLargeEconomicCalendarData = Array.from({ length: 20 }, (_, i) => ({
    id: `event-${i}`,
    datetime: new Date(Date.now() + (i + 1) * 2 * 60 * 60 * 1000).toISOString(),
    country: ["US", "EU", "GB", "JP", "IN", "CN", "AU", "CA"][i % 8],
    currency: ["USD", "EUR", "GBP", "JPY", "INR", "CNY", "AUD", "CAD"][i % 8],
    event: [
        "Interest Rate Decision",
        "GDP Growth Rate",
        "Unemployment Rate",
        "CPI Inflation",
        "Retail Sales",
        "Manufacturing PMI",
        "Trade Balance",
        "Consumer Confidence"
    ][i % 8],
    importance: (["low", "medium", "high"][i % 3] as "low" | "medium" | "high"),
    actual: i % 3 === 0 ? null : Math.round(Math.random() * 100 * 10) / 10,
    forecast: Math.round(Math.random() * 100 * 10) / 10,
    previous: Math.round(Math.random() * 100 * 10) / 10,
}));

// Mock data for HeatMap (activity/contribution data)
const generateHeatMapData = (days: number) => {
    const data = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // Generate random activity value (0-10)
        const value = Math.floor(Math.random() * 11);

        data.push({
            date: date.toISOString(),
            value: value,
        });
    }

    return data;
};

export const mockHeatMapData = generateHeatMapData(365);
export const mockHeatMapDataShort = generateHeatMapData(90);

// Mock data for HorizontalBarChart (stock performance)
export const mockHorizontalBarData = [
    { name: "RELIANCE", value: 2.5 },
    { name: "TCS", value: -1.2 },
    { name: "INFY", value: 3.8 },
    { name: "HDFC", value: -0.5 },
    { name: "ICICI", value: 1.9 },
    { name: "WIPRO", value: -2.1 },
    { name: "BHARTI", value: 4.2 },
    { name: "ITC", value: 0.8 },
    { name: "SBIN", value: -1.5 },
    { name: "AXIS", value: 2.3 },
];

export const mockLargeHorizontalBarData = Array.from({ length: 25 }, (_, i) => ({
    name: `STOCK_${i + 1}`,
    value: (Math.random() - 0.5) * 10,
}));

export const mockPositiveHorizontalBarData = [
    { name: "TECH", value: 5.2 },
    { name: "FINANCE", value: 3.8 },
    { name: "PHARMA", value: 4.5 },
    { name: "AUTO", value: 2.1 },
    { name: "ENERGY", value: 6.3 },
];

// Mock data for MarketDepth (L1 data)
export const mockMarketDepthData = {
    bestBid: 22145.50,
    bestBidSize: 150,
    bestAsk: 22147.25,
    bestAskSize: 200,
    timestamp: Date.now(),
};

export const mockMarketDepthDataWide = {
    bestBid: 46750.00,
    bestBidSize: 75,
    bestAsk: 46800.00,
    bestAskSize: 100,
    timestamp: Date.now(),
};

export const mockMarketDepthDataTight = {
    bestBid: 21999.75,
    bestBidSize: 250,
    bestAsk: 22000.00,
    bestAskSize: 300,
    timestamp: Date.now(),
};

// Mock data for Metric Widget (KPIs)
export const mockMetricData = [
    { label: "Total Volume", value: "1.2M", delta: 5.2 },
    { label: "Market Cap", value: "₹2.5T", delta: -1.8 },
    { label: "P/E Ratio", value: "24.5", delta: 0.3 },
    { label: "Dividend Yield", value: "1.8%", delta: 0.1 },
    { label: "52W High", value: "₹23,500", delta: null },
    { label: "52W Low", value: "₹18,200", delta: null },
];

export const mockSingleMetric = [
    { label: "NIFTY 50", value: "22,150.75", delta: 2.5 },
];

export const mockMultipleMetrics = [
    { label: "Open", value: "22,100", delta: null },
    { label: "High", value: "22,250", delta: null },
    { label: "Low", value: "22,050", delta: null },
    { label: "Close", value: "22,150", delta: null },
    { label: "Volume", value: "2.5M", delta: 15.3 },
    { label: "Turnover", value: "₹5,500Cr", delta: 12.8 },
    { label: "Advances", value: "35", delta: null },
    { label: "Declines", value: "15", delta: null },
    { label: "Unchanged", value: "0", delta: null },
];

// Mock data for NewsWidget
export const mockNewsData = [
    {
        id: "1",
        headline: "Markets Rally on Strong Economic Data",
        summary: "Stock markets surged today following better-than-expected GDP growth figures and positive employment data.",
        category: "Stocks",
        timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
        url: "https://example.com/news/1",
    },
    {
        id: "2",
        headline: "Bitcoin Breaks $50,000 Resistance Level",
        summary: "Cryptocurrency markets show renewed strength as Bitcoin pushes past key resistance, driven by institutional demand.",
        category: "Crypto",
        timestamp: Date.now() - 45 * 60 * 1000, // 45 minutes ago
        url: "https://example.com/news/2",
    },
    {
        id: "3",
        headline: "Fed Signals Potential Rate Cut in Q2",
        summary: "Federal Reserve officials hint at possible monetary policy easing amid cooling inflation pressures.",
        category: "Macro",
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        url: "https://example.com/news/3",
    },
    {
        id: "4",
        headline: "Gold Prices Reach 6-Month High",
        summary: "Safe-haven demand pushes gold to new highs as geopolitical tensions escalate in key regions.",
        category: "Commodities",
        timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
        url: "https://example.com/news/4",
    },
];

export const mockLargeNewsData = Array.from({ length: 15 }, (_, i) => ({
    id: `news-${i}`,
    headline: [
        "Tech Stocks Lead Market Gains",
        "Oil Prices Surge on Supply Concerns",
        "Currency Markets Show Volatility",
        "Earnings Season Kicks Off Strong",
        "Central Bank Policy Update"
    ][i % 5],
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.",
    category: ["Stocks", "Commodities", "Macro", "Crypto"][i % 4],
    timestamp: Date.now() - (i + 1) * 30 * 60 * 1000,
    url: `https://example.com/news/${i}`,
}));

// Mock data for PieChartWidget
export const mockPieChartData = [
    { category: "Technology", value: 35 },
    { category: "Finance", value: 25 },
    { category: "Healthcare", value: 20 },
    { category: "Energy", value: 12 },
    { category: "Consumer", value: 8 },
];

export const mockLargePieChartData = [
    { category: "Large Cap", value: 40 },
    { category: "Mid Cap", value: 30 },
    { category: "Small Cap", value: 15 },
    { category: "International", value: 10 },
    { category: "Bonds", value: 5 },
];

// Mock data for SunburstChartWidget (hierarchical)
export const mockSunburstData = {
    name: "Portfolio",
    value: 100,
    children: [
        {
            name: "Equities",
            value: 60,
            children: [
                { name: "US Stocks", value: 35 },
                { name: "International", value: 15 },
                { name: "Emerging Markets", value: 10 },
            ],
        },
        {
            name: "Fixed Income",
            value: 30,
            children: [
                { name: "Government Bonds", value: 18 },
                { name: "Corporate Bonds", value: 12 },
            ],
        },
        {
            name: "Alternatives",
            value: 10,
            children: [
                { name: "Real Estate", value: 6 },
                { name: "Commodities", value: 4 },
            ],
        },
    ],
};

export const mockSimpleSunburstData = {
    name: "Assets",
    value: 100,
    children: [
        { name: "Stocks", value: 70 },
        { name: "Bonds", value: 20 },
        { name: "Cash", value: 10 },
    ],
};

// Mock data for TextWidget
export const mockTextContent = "<h1>Market Analysis</h1><p>The current market conditions show <strong>strong momentum</strong> in the technology sector...</p>";

export const mockSimpleTextContent = "<p>Start editing your content here...</p>";

export const mockRichTextContent = `
<h1>Q4 2024 Market Outlook</h1>
<h2>Key Highlights</h2>
<ul>
  <li>GDP growth expected at 2.5%</li>
  <li>Inflation trending downward</li>
  <li>Tech sector leading gains</li>
</ul>
<p><strong>Conclusion:</strong> Markets remain <em>cautiously optimistic</em> heading into year-end.</p>
`;

// Mock data for TvCandlestickChartWidget (reuse candlestick data)
export const mockTvCandlestickData = mockCandlestickData;
export const mockTvBullishCandlestickData = mockBullishCandlestickData;
export const mockTvBearishCandlestickData = mockBearishCandlestickData;

// Mock data for TvLineChartWidget (reuse line chart data)
export const mockTvLineChartData = mockLineChartData;
export const mockTvVolatileLineData = mockVolatileChartData;
export const mockTvSteadyLineData = mockSteadyGrowthData;

// Mock data for ScatterPlotWidget
const generateScatterData = (count: number, xRange: [number, number], yRange: [number, number], correlation: number = 0) => {
    const data = [];
    for (let i = 0; i < count; i++) {
        const x = xRange[0] + Math.random() * (xRange[1] - xRange[0]);
        // Add correlation effect
        const baseY = yRange[0] + (x - xRange[0]) / (xRange[1] - xRange[0]) * (yRange[1] - yRange[0]);
        const randomY = yRange[0] + Math.random() * (yRange[1] - yRange[0]);
        const y = baseY * correlation + randomY * (1 - correlation);

        data.push({
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100,
        });
    }
    return data;
};

export const mockScatterPlotData = generateScatterData(50, [0, 100], [0, 100], 0.3);

export const mockScatterPlotWithSize = Array.from({ length: 40 }, () => ({
    x: Math.round(Math.random() * 100 * 100) / 100,
    y: Math.round(Math.random() * 100 * 100) / 100,
    size: Math.round(Math.random() * 50 + 10),
}));

export const mockScatterPlotCategories = [
    ...Array.from({ length: 20 }, () => ({
        x: Math.round((Math.random() * 40 + 10) * 100) / 100,
        y: Math.round((Math.random() * 40 + 30) * 100) / 100,
        category: "Tech",
    })),
    ...Array.from({ length: 20 }, () => ({
        x: Math.round((Math.random() * 40 + 40) * 100) / 100,
        y: Math.round((Math.random() * 40 + 10) * 100) / 100,
        category: "Finance",
    })),
    ...Array.from({ length: 20 }, () => ({
        x: Math.round((Math.random() * 40 + 20) * 100) / 100,
        y: Math.round((Math.random() * 40 + 50) * 100) / 100,
        category: "Healthcare",
    })),
];

export const mockScatterPlotCategoriesWithSize = [
    ...Array.from({ length: 15 }, () => ({
        x: Math.round((Math.random() * 40 + 10) * 100) / 100,
        y: Math.round((Math.random() * 40 + 30) * 100) / 100,
        size: Math.round(Math.random() * 40 + 10),
        category: "Large Cap",
    })),
    ...Array.from({ length: 15 }, () => ({
        x: Math.round((Math.random() * 40 + 40) * 100) / 100,
        y: Math.round((Math.random() * 40 + 10) * 100) / 100,
        size: Math.round(Math.random() * 30 + 10),
        category: "Mid Cap",
    })),
    ...Array.from({ length: 15 }, () => ({
        x: Math.round((Math.random() * 40 + 20) * 100) / 100,
        y: Math.round((Math.random() * 40 + 50) * 100) / 100,
        size: Math.round(Math.random() * 20 + 10),
        category: "Small Cap",
    })),
];

export const mockScatterPlotCorrelation = generateScatterData(60, [0, 100], [0, 100], 0.8);

export const mockScatterPlotNoCorrelation = generateScatterData(60, [0, 100], [0, 100], 0);
