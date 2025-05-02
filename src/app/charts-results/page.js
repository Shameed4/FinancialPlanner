'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import pageVariants from '../components/PageAnimation'
import { usePathname } from 'next/navigation'
import { LineChart } from '@mui/x-charts/LineChart'
import { BarChart } from '@mui/x-charts/BarChart'

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

    // history: take the *first* simulation’s per-year entries
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

// Chart 4.1: Probability of success over time
function buildSuccessProbability(simulations = {}) {
    const years = Array.from(
        new Set(
            Object.values(simulations)
                .flatMap(sim => Object.keys(sim).map(Number))
                .filter(n => !isNaN(n))
        )
    ).sort((a, b) => a - b)

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
    // gather all years
    const years = Array.from(
        new Set(
            Object.values(simulations)
                .flatMap(sim => Object.keys(sim).map(Number))
                .filter(n => !isNaN(n))
        )
    ).sort((a, b) => a - b)

    // collect & sort values for each year
    const valuesByYear = years.map(year =>
        Object.values(simulations)
            .map(sim => {
                const entry = sim[year] || {}
                switch (key) {
                    case 'total_assets': return entry.totInvestments ?? 0
                    case 'annual_income': return entry.totIncome ?? 0
                    case 'annual_expenses': return entry.totExpenses ?? 0
                    case 'taxes_paid': return entry.taxes ?? 0
                    default: return 0
                }
            })
            .sort((a, b) => a - b)
    )

    const quantile = (arr, p) => {
        if (!arr.length) return 0
        const idx = Math.floor((arr.length - 1) * p)
        return arr[Math.min(idx, arr.length - 1)]
    }

    // build percentile arrays
    return {
        years,
        p10: valuesByYear.map(arr => quantile(arr, 0.1)),
        p20: valuesByYear.map(arr => quantile(arr, 0.2)),
        p30: valuesByYear.map(arr => quantile(arr, 0.3)),
        p40: valuesByYear.map(arr => quantile(arr, 0.4)),
        p50: valuesByYear.map(arr => quantile(arr, 0.5)),
        p60: valuesByYear.map(arr => quantile(arr, 0.6)),
        p70: valuesByYear.map(arr => quantile(arr, 0.7)),
        p80: valuesByYear.map(arr => quantile(arr, 0.8)),
        p90: valuesByYear.map(arr => quantile(arr, 0.9)),
    }
}

// Chart 4.3: Stacked bar data builder
function buildStackedData(simulations = {}, years, { category, measure, threshold }) {
    const breakdownKey =
        category === 'investments' ? 'breakdownInvestments' :
            category === 'income' ? 'breakdownIncome' :
                'breakdownExpenses'

    // collect all sub-categories
    const labels = new Set()
    Object.values(simulations).forEach(sim =>
        Object.values(sim).forEach(entry =>
            Object.keys(entry[breakdownKey] || {}).forEach(l => labels.add(l))
        )
    )

    // compute per-year values
    const raw = {}
    labels.forEach(lbl => {
        raw[lbl] = years.map(year => {
            const vals = Object.values(simulations).map(
                sim => sim[year]?.[breakdownKey]?.[lbl] ?? 0
            )
            if (!vals.length) return 0
            if (measure === 'average') return vals.reduce((a, b) => a + b, 0) / vals.length
            vals.sort((a, b) => a - b)
            return vals[Math.floor((vals.length - 1) / 2)]
        })
    })

    // threshold -> “Other”
    let other = Array(years.length).fill(0)
    const finalSeries = []
    Object.entries(raw).forEach(([lbl, arr]) => {
        if (Math.max(...arr) < threshold) {
            other = other.map((v, i) => v + arr[i])
        } else {
            finalSeries.push({ label: lbl, data: arr })
        }
    })
    if (other.some(v => v > 0)) finalSeries.push({ label: 'Other', data: other })

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

const DetailedView = ({ result, onBack }) => {
    const sims = result.simulations
    const prob = buildSuccessProbability(sims)

    // 4.2: quantity selector + range selector
    const [qty, setQty] = useState('total_assets')
    const ranges = buildQuantileRanges(sims, qty)
    const rangeOptions = {
        '10-90': [10, 90],
        '20-80': [20, 80],
        '30-70': [30, 70],
        '40-60': [40, 60],
    }
    const [selRange, setSelRange] = useState('10-90')
    const [lowPct, highPct] = rangeOptions[selRange]
    const lowerKey = `p${lowPct}`
    const upperKey = `p${highPct}`

    const years = ranges.years
    const [stackOpts, setStackOpts] = useState({
        category: 'investments',
        measure: 'median',
        threshold: 0
    })
    const stacked = buildStackedData(sims, years, stackOpts)

    const qtyLabel = {
        total_assets: 'Total Investments',
        annual_income: 'Annual Income',
        annual_expenses: 'Annual Expenses',
        taxes_paid: 'Taxes Paid'
    }[qty] || qty

    const formatDollar = v =>
        v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M`
            : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}k`
                : `$${v.toFixed(0)}`

    return (
        <div className="space-y-6 text-black">
            <button onClick={onBack} className="text-blue-600">&larr; Back</button>
            <h2 className="text-2xl font-bold">{result.title}</h2>

            {/* 4.1 */}
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

            {/* 4.2 */}
            <div className="p-4 bg-white rounded shadow">
                <h3 className="font-semibold mb-2">{qtyLabel} Ranges</h3>
                <div className="flex gap-4 mb-2">
                    <select
                        value={qty}
                        onChange={e => setQty(e.target.value)}
                        className="border px-2 py-1"
                    >
                        <option value="total_assets">Total Investments</option>
                        <option value="annual_income">Annual Income</option>
                        <option value="annual_expenses">Annual Expenses</option>
                        <option value="taxes_paid">Taxes Paid</option>
                    </select>
                    <select
                        value={selRange}
                        onChange={e => setSelRange(e.target.value)}
                        className="border px-2 py-1"
                    >
                        {Object.keys(rangeOptions).map(opt => (
                            <option key={opt} value={opt}>{opt} percentile</option>
                        ))}
                    </select>
                </div>
                <LineChart
                    xAxis={[{ data: years, label: 'Year' }]}
                    yAxis={[{ label: qtyLabel, tickFormatter: formatDollar }]}
                    series={[
                        { data: ranges[upperKey], area: true, showMark: false, label: `${highPct}th` },
                        { data: ranges[lowerKey], area: true, showMark: false, label: `${lowPct}th` },
                        { data: ranges.p50, label: 'Median', color: '#2196f3', showMark: false },
                    ]}
                    height={300}
                />
            </div>

            {/* 4.3 */}
            <div className="p-4 bg-white rounded shadow">
                <h3 className="font-semibold mb-2">Breakdown By Year</h3>
                <div className="flex gap-2 mb-2">
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
                    <input
                        type="number"
                        value={stackOpts.threshold}
                        onChange={e => setStackOpts({ ...stackOpts, threshold: Number(e.target.value) })}
                        className="border px-2 py-1 w-20"
                        placeholder="Min"
                    />
                </div>
                <BarChart
                    xAxis={[{ label: 'Value', tickFormatter: formatDollar }]}
                    yAxis={[{ type: 'band', data: stacked.labels }]}
                    series={stacked.series.map(s => ({ ...s, stack: 'total' }))}
                    height={300}
                />
            </div>
        </div>
    )
}

// Main Page
export default function ChartsAndResultsPage() {
    const [chartData, setChartData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedResult, setSelected] = useState(null)
    const pathname = usePathname()

    useEffect(() => {
        async function load() {
            try {
                const res = await fetch('/api/algorithm')
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const { chartData } = await res.json()
                setChartData(chartData)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [pathname])

    if (loading) return <p>Loading…</p>
    if (!chartData) return <p>No data available.</p>

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="p-8 space-y-8"
        >
            <h1 className="text-3xl font-bold text-black">Charts and Results</h1>

            {selectedResult ? (
                <DetailedView
                    result={selectedResult}
                    onBack={() => setSelected(null)}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(chartData).map(([name, sims]) => (
                        <ResultCard
                            key={name}
                            name={name}
                            data={sims}
                            onClick={() => setSelected(makeResultObject(name, sims))}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    )
}
