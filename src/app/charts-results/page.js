'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import pageVariants from '../components/PageAnimation'
import { usePathname } from 'next/navigation'
import { LineChart } from '@mui/x-charts/LineChart'
import { BarChart } from '@mui/x-charts/BarChart'
import { Router } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Build a full `result` object from raw chartData
function makeResultObject(scenarioName, simulations = {}) {
  const date = new Date().toLocaleDateString()

  // summary: final total_assets per run
  const finals = Object.values(simulations)
    .map(sim => {
      const years = Object.keys(sim)
        .map(y => Number(y))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b)
      const last = years[years.length - 1]
      return sim[last]?.totInvestments ?? 0
    })
    .sort((a, b) => a - b)

  const n = finals.length
  const sum = finals.reduce((a, b) => a + b, 0)
  const pct = idx => finals[Math.min(n - 1, Math.max(0, idx))] ?? 0

  const summary = {
    number_of_runs: n,
    mean_final_value: sum / (n || 1),
    median_final_value: pct(Math.floor((n - 1) / 2)),
    percentile_10: pct(Math.floor(n * 0.1)),
    percentile_90: pct(Math.floor(n * 0.9)),
  }

  // history: take the *first* simulation's per-year entries
  const firstSim = Object.values(simulations)[0] || {}
  const history = Object.entries(firstSim)
    .map(([yr, entry]) => ({ year: Number(yr), ...entry }))
    .filter(e => !isNaN(e.year))
    .sort((a, b) => a.year - b.year)

  return {
    id: scenarioName,
    title: scenarioName,
    date,
    summary,
    history,
    simulations
  }
}

// Helper function to get all years present in any simulation
function getAllYears(simulations = {}) {
  return Array.from(
    new Set(
      Object.values(simulations)
        .flatMap(sim => Object.keys(sim).map(Number))
        .filter(n => !isNaN(n))
    )
  ).sort((a, b) => a - b)
}

// Helper function to calculate quantile
function calculateQuantile(arr, p) {
  if (!arr || !arr.length) return 0
  const idx = Math.floor((arr.length - 1) * p)
  return arr[Math.min(idx, arr.length - 1)]
}

// Helper function to format dollar amounts
function formatDollar(v) {
  if (v === undefined || v === null) return '$0'
  return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M`
    : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}k`
      : `$${v.toFixed(0)}`
}

// Chart 4.1: Probability of success over time
function buildSuccessProbability(simulations = {}) {
  if (!simulations || Object.keys(simulations).length === 0) {
    return []
  }

  const years = getAllYears(simulations)
  const totalRuns = Object.keys(simulations).length || 1

  return years.map(year => ({
    year,
    probability:
      Object.values(simulations).filter(sim => sim[year]?.success).length
      / totalRuns
      * 100
  }))
}

// Chart 4.2: Percentile ranges for a selected quantity
function buildQuantileRanges(simulations = {}, key) {
  if (!simulations || Object.keys(simulations).length === 0) {
    return { years: [], p10: [], p20: [], p30: [], p40: [], p50: [], p60: [], p70: [], p80: [], p90: [] }
  }

  // gather all years
  const years = getAllYears(simulations)

  // collect & sort values for each year
  const valuesByYear = years.map(year =>
    Object.values(simulations)
      .map(sim => {
        const entry = sim[year] || {}
        switch (key) {
          case 'total_investments': return entry.totInvestments ?? 0
          case 'total_income': return entry.totIncome ?? 0
          case 'total_expenses_and_taxes': return (entry.totExpenses ?? 0) + (entry.taxes ?? 0)
          case 'early_withdrawal_tax': return entry.earlyWithdrawalTax ?? 0
          case 'disc_expense_percent': return entry.totDiscExpensePercent ?? 0
          default: return 0
        }
      })
      .sort((a, b) => a - b)
  )

  // build percentile arrays
  return {
    years,
    p10: valuesByYear.map(arr => calculateQuantile(arr, 0.1)),
    p20: valuesByYear.map(arr => calculateQuantile(arr, 0.2)),
    p30: valuesByYear.map(arr => calculateQuantile(arr, 0.3)),
    p40: valuesByYear.map(arr => calculateQuantile(arr, 0.4)),
    p50: valuesByYear.map(arr => calculateQuantile(arr, 0.5)), // Median
    p60: valuesByYear.map(arr => calculateQuantile(arr, 0.6)),
    p70: valuesByYear.map(arr => calculateQuantile(arr, 0.7)),
    p80: valuesByYear.map(arr => calculateQuantile(arr, 0.8)),
    p90: valuesByYear.map(arr => calculateQuantile(arr, 0.9)),
  }
}

// Chart 4.3: Stacked bar data builder
function buildStackedData(simulations = {}, years, { category, measure, threshold }) {
  if (!simulations || Object.keys(simulations).length === 0 || !years || !years.length) {
    return { labels: [], series: [] }
  }

  // Find relevant keys based on the category
  const keyPatterns = {
    'investments': key => key.endsWith(" Type Total"),
    'income': key => key.endsWith(" Event Income"),
    'expenses': key => key.endsWith(" Event Expense")
  }

  // Collect all relevant keys for the category
  const allKeys = new Set()
  Object.values(simulations).forEach(sim => {
    Object.values(sim).forEach(yearData => {
      Object.keys(yearData).forEach(key => {
        if (category === 'expenses' && key === 'taxes') {
          allKeys.add('Taxes')
        } else if (keyPatterns[category] && keyPatterns[category](key)) {
          allKeys.add(key)
        }
      })
    })
  })

  // Get tax status for investment accounts (if category is investments)
  const taxStatus = {}
  if (category === 'investments') {
    Object.values(simulations).forEach(sim => {
      Object.values(sim).forEach(yearData => {
        Object.keys(yearData).forEach(key => {
          if (key.endsWith(" Tax Status") && yearData[key]) {
            const investmentName = key.replace(" Tax Status", " Type Total")
            taxStatus[investmentName] = yearData[key]
          }
        })
      })
    })
  }

  // Compute per-year values for each segment
  const segments = {}
  allKeys.forEach(key => {
    segments[key] = years.map(year => {
      // Get the value for this key across all simulations
      const values = Object.values(simulations).map(sim => {
        if (key === 'Taxes') {
          return sim[year]?.taxes ?? 0
        } else {
          return sim[year]?.[key] ?? 0
        }
      })

      if (!values.length) return 0

      // Calculate based on selected measure
      if (measure === 'average') {
        return values.reduce((sum, val) => sum + val, 0) / values.length
      } else { // median
        values.sort((a, b) => a - b)
        return values[Math.floor(values.length / 2)] || 0
      }
    })
  })

  // Apply threshold aggregation
  let other = Array(years.length).fill(0)
  const finalSeries = []

  // Sort keys by tax status to ensure adjacent segments for same tax status
  let sortedKeys = Array.from(allKeys)
  if (category === 'investments') {
    sortedKeys.sort((a, b) => {
      const statusA = taxStatus[a] || 'unknown'
      const statusB = taxStatus[b] || 'unknown'
      return statusA.localeCompare(statusB)
    })
  }

  sortedKeys.forEach(key => {
    const values = segments[key]
    const maxValue = Math.max(...values)
    if (maxValue < threshold) {
      // Add to "Other" category
      other = other.map((val, idx) => val + values[idx])
    } else {
      let label = key
      // Add tax status indicator for investments
      if (category === 'investments' && taxStatus[key]) {
        label = `${key} (${taxStatus[key]})`
      }

      finalSeries.push({
        label,
        data: values,
        // Store original values for tooltips
        originalValues: values.map(v => v)
      })
    }
  })

  // Add "Other" category if it has any values
  if (other.some(v => v > 0)) {
    finalSeries.push({
      label: 'Other',
      data: other,
      originalValues: other
    })
  }

  return {
    labels: years.map(String),
    series: finalSeries
  }
}

// UI Components
const ResultCard = ({ name, data, onClick }) => {
  const simNames = Object.keys(data)
  const first = data[simNames[0]] || {}
  const years = Object.keys(first).map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b)
  return (
    <div
      className="bg-white rounded-xl text-black shadow-md p-6 hover:shadow-lg cursor-pointer"
      onClick={onClick}
    >
      <h3 className="text-xl font-semibold mb-2">{name}</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Simulation Runs:</span>
          <span className="font-medium">{simNames.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Start Year:</span>
          <span className="font-medium">{years[0] ?? 'N/A'}</span>
        </div>
      </div>
      <div className="mt-4 text-blue-600 font-medium flex items-center">
        View Details&nbsp;
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

const DetailedView = ({ result, onBack, financialGoal }) => {
  const sims = result.simulations
  const prob = buildSuccessProbability(sims)
  const years = getAllYears(sims)

  // 4.2: Quantile Ranges Chart
  const [selectedQuantity, setSelectedQuantity] = useState('total_investments')
  const ranges = buildQuantileRanges(sims, selectedQuantity)

  // 4.3: Stacked Composition Chart
  const [stackOpts, setStackOpts] = useState({
    category: 'investments',
    measure: 'median',
    threshold: 5000
  })
  const stackedData = buildStackedData(sims, ranges.years, stackOpts)

  // Helper function to format values based on the selected quantity
  const formatValue = (v) => {
    if (selectedQuantity === 'disc_expense_percent') {
      return `${v.toFixed(1)}%`
    }
    return formatDollar(v)
  }

  return (
    <div className="space-y-6 text-black">
      <button onClick={onBack} className="text-blue-600 hover:cursor-pointer">&larr; Back</button>
      <h2 className="text-2xl font-bold">{result.title}</h2>

      {/* Chart 4.1: Probability of Success */}
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-semibold mb-2">Probability of Success</h3>
        <LineChart
          xAxis={[{ data: prob.map(d => d.year), label: 'Year' }]}
          yAxis={[{ label: 'Probability (%)', min: 0, max: 100 }]}
          series={[{
            data: prob.map(d => d.probability),
            label: 'Success %',
            color: '#4CAF50'
          }]}
          height={300}
        />
      </div>

      {/* Chart 4.2: Quantile Ranges */}
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-semibold mb-2">Quantile Ranges</h3>
        <div className="flex gap-4 mb-2">
          <select
            value={selectedQuantity}
            onChange={e => setSelectedQuantity(e.target.value)}
            className="border px-2 py-1"
          >
            <option value="total_investments">Total Investments</option>
            <option value="total_income">Total Income</option>
            <option value="total_expenses_and_taxes">Total Expenses & Taxes</option>
            <option value="early_withdrawal_tax">Early Withdrawal Tax</option>
            <option value="disc_expense_percent">Discretionary Expense %</option>
          </select>
        </div>
        <LineChart
          xAxis={[{ data: ranges.years, label: 'Year' }]}
          yAxis={[{
            label: selectedQuantity.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            tickFormatter: formatValue
          }]}
          series={[
            // Outer extremes
            { data: ranges.p10, area: true, showMark: false, label: '10th', color: 'rgba(33,150,243,0.1)', areaOpacity: 0.1 },
            { data: ranges.p20, area: true, showMark: false, label: '20th', color: 'rgba(33,150,243,0.2)', areaOpacity: 0.2 },
            { data: ranges.p30, area: true, showMark: false, label: '30th', color: 'rgba(33,150,243,0.3)', areaOpacity: 0.3 },
            { data: ranges.p40, area: true, showMark: false, label: '40th', color: 'rgba(33,150,243,0.4)', areaOpacity: 0.4 },
            // Median
            { data: ranges.p50, label: 'Median', color: '#2196f3', lineWidth: 2, showMark: false },
            // Upper half
            { data: ranges.p60, area: true, showMark: false, label: '60th', color: 'rgba(33,150,243,0.4)', areaOpacity: 0.4 },
            { data: ranges.p70, area: true, showMark: false, label: '70th', color: 'rgba(33,150,243,0.3)', areaOpacity: 0.3 },
            { data: ranges.p80, area: true, showMark: false, label: '80th', color: 'rgba(33,150,243,0.2)', areaOpacity: 0.2 },
            { data: ranges.p90, area: true, showMark: false, label: '90th', color: 'rgba(33,150,243,0.1)', areaOpacity: 0.1 },
            // Financial goal line (if applicable)
            ...(selectedQuantity === 'total_investments' && financialGoal ? [
              {
                data: Array(ranges.years.length).fill(financialGoal),
                label: 'Financial Goal',
                color: '#ff9800',
                lineWidth: 2,
                showMark: false,
                lineDash: [5, 5]
              }
            ] : [])
          ]}
          height={350}
        />
      </div>

      {/* Chart 4.3: Stacked Composition */}
      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-semibold mb-2">Composition Analysis</h3>
        <div className="flex gap-2 mb-2 flex-wrap">
          <select
            value={stackOpts.category}
            onChange={e => setStackOpts({ ...stackOpts, category: e.target.value })}
            className="border px-2 py-1"
          >
            <option value="investments">Investments</option>
            <option value="income">Income</option>
            <option value="expenses">Expenses</option>
          </select>
          <select
            value={stackOpts.measure}
            onChange={e => setStackOpts({ ...stackOpts, measure: e.target.value })}
            className="border px-2 py-1"
          >
            <option value="median">Median</option>
            <option value="average">Average</option>
          </select>
          <div className="flex items-center">
            <label className="text-sm mr-2">Min Threshold:</label>
            <input
              type="number"
              value={stackOpts.threshold}
              onChange={e => setStackOpts({ ...stackOpts, threshold: Number(e.target.value) })}
              className="border px-2 py-1 w-24"
              placeholder="Threshold"
            />
          </div>
        </div>
        <BarChart
          layout="vertical"
          xAxis={[{ scaleType: 'band', data: stackedData.labels, label: 'Year' }]}
          yAxis={[{ scaleType: 'linear', label: 'Value ($)', tickFormatter: formatDollar }]}
          series={stackedData.series.map(s => ({
            ...s,
            stack: 'total',
            label: s.label
          }))}
          height={350}
          slotProps={{
            legend: {
              position: 'bottom'
            },
            tooltip: {
              // change trigger to 'axis' so it groups all stacks for a given year
              trigger: 'axis',
              axispointer: { type: 'shadow' },
              // formatter now receives an array of all series at that category
              formatter: (params) => {
                // params is an array of { seriesName, data, axisValue } for each stack
                const year = params[0]?.axisValue
                const items = params.map(p => ({
                  label: p.seriesName,
                  value: formatDollar(p.data)
                }))
                return {
                  title: `Year ${year}`,
                  items
                }
              }
            }
          }}
        />
        {stackOpts.category === 'investments' && (
          <p className="text-xs text-gray-500 mt-2">
            Investment accounts show tax status in parentheses where available.
          </p>
        )}
      </div>
    </div>
  )
}

// Main Page
export default function ChartsAndResultsPage() {
  const [chartData, setChartData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedResult, setSelected] = useState(null)
  const [retryCount, setRetryCount] = useState(0) // Track retry attempts
  const [error, setError] = useState(null)
  const pathname = usePathname()
  const router = useRouter();

  // Load data function that can be called directly
  const loadChartData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/algorithm', {
        // Add cache: 'no-store' to prevent caching
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      console.log("Chart data response:", data.timestamp);

      if (data.chartData) {
        // Instead of hardcoding "Scenario ID 1", find the most recent scenario
        const scenarioKeys = Object.keys(data.chartData).filter(key =>
          key.startsWith('Scenario ID')
        );

        if (scenarioKeys.length > 0) {
          // Get the most recently added scenario
          const targetScenario = scenarioKeys[scenarioKeys.length - 1];
          console.log("Using scenario:", targetScenario);

          // Store just the simulation data
          const simulationData = data.chartData[targetScenario];
          setChartData(simulationData);

          // Create the result object for the simulation
          setSelected(makeResultObject(targetScenario, simulationData));
          return true;
        } else {
          console.error("No scenario data found");
          setError("No scenario data found");
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error("Error loading chart data:", error);
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      // First attempt
      const success = await loadChartData();

      // If not successful and still mounted, start retry mechanism
      if (!success && isMounted && retryCount < 3) {
        const timer = setTimeout(() => {
          if (isMounted) {
            setRetryCount(prev => prev + 1);
          }
        }, 800);

        return () => clearTimeout(timer);
      }
    }

    initialLoad();

    return () => {
      isMounted = false;
    };
  }, [pathname, retryCount]);

  // Function to manually retry loading the data
  const handleRetry = () => {
    setRetryCount(0);
    loadChartData();
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="p-8 space-y-8"
    >
      <h1 className="text-3xl font-bold text-black">Charts and Results</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2 text-gray-700">Loading simulation results... {retryCount > 0 ? `(Attempt ${retryCount + 1})` : ''}</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-red-600">Error: {error}</p>
            <button
              onClick={handleRetry}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : selectedResult ? (
        <DetailedView
          result={selectedResult}
          onBack={() => {
            router.back();
          }}
          financialGoal={undefined}
        />
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <p className="text-gray-700">No simulation data available. Please run a simulation first.</p>
            <div className="mt-4 space-x-4">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Retry Loading
              </button>
              <button
                onClick={() => router.push('/simulation')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
