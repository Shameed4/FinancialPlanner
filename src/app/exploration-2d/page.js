'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// A simplified ScenarioCard based on your original
function ScenarioCard({ scenario, selected, onSelect }) {
    return (
        <div
            onClick={() => onSelect(scenario)}
            className={`p-4 border rounded-lg cursor-pointer transition-shadow ${selected ? 'shadow-lg ring-2 ring-blue-500' : 'shadow-sm'
                }`}
        >
            <h3 className="font-semibold">{scenario.name}</h3>
            <small className="text-gray-500">ID: {scenario.id}</small>
        </div>
    )
}

export default function Exploration2Page() {
    const router = useRouter()
    const { data: session } = useSession()

    const [scenarios, setScenarios] = useState([])
    const [selected, setSelected] = useState(null)

    // 1D vs 2D
    const [is2D, setIs2D] = useState(false)

    // parameter definitions (copy your first list)
    const params = [
        { id: 'eventSeriesTiming', name: 'Event Start Year', min: 2023, max: 2050, step: 1 },
        { id: 'eventSeriesAmount', name: 'Event Amount', min: 0, max: 500000, step: 5000 },
        { id: 'allocations', name: 'Allocation %', min: 0, max: 100, step: 5 }
    ]

    // Ranges for param1 and param2
    const [p1, setP1] = useState(params[0].id)
    const [range1, setRange1] = useState({ min: params[0].min, max: params[0].max, step: params[0].step })

    const [p2, setP2] = useState(params[1].id)
    const [range2, setRange2] = useState({ min: params[1].min, max: params[1].max, step: params[1].step })

    const [count, setCount] = useState(100)
    const [feedback, setFeedback] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!session) return
        fetch(`/api/scenarios?ownerId=${session.user.email}`)
            .then(r => r.json())
            .then(d => setScenarios(d.result || []))
            .catch(console.error)
    }, [session])

    // when p1 changes
    useEffect(() => {
        const def = params.find(x => x.id === p1)
        setRange1({ min: def.min, max: def.max, step: def.step })
    }, [p1])

    useEffect(() => {
        const def = params.find(x => x.id === p2)
        setRange2({ min: def.min, max: def.max, step: def.step })
    }, [p2])

    // utility: build array of values
    function makeVals({ min, max, step }, limit = 15) {
        const out = []
        const actual = Math.max(step, Math.ceil((max - min) / limit))
        for (let v = min; v <= max; v += actual) {
            out.push(Math.round(v))
            if (out.length >= limit) break
        }
        if (out[out.length - 1] !== max) out.push(max)
        return [...new Set(out)]
    }

    const explore = async () => {
        if (!selected) { setFeedback('Select a scenario'); return }
        setLoading(true)
        setFeedback('')

        const vals1 = makeVals(range1)
        const combos = []

        if (!is2D) {
            vals1.forEach(v => combos.push({ [p1]: v }))
        } else {
            const vals2 = makeVals(range2)
            vals1.forEach(v1 => vals2.forEach(v2 => combos.push({ [p1]: v1, [p2]: v2 })))
        }

        // build modified scenarios
        const mods = combos.map((cmb, i) => {
            const copy = JSON.parse(JSON.stringify(selected))
            Object.entries(cmb).forEach(([k, v]) => {
                const ev = copy.eventSeries?.[0]
                switch (k) {
                    case 'eventSeriesTiming': ev.startYear = v; ev.startYearType = 'fixed'; break
                    case 'eventSeriesAmount': ev.initialAmount = v; ev.amount = v; break
                    case 'allocations':
                        const inv = copy.eventSeries.find(e => e.type === 'invest')
                        const keys = Object.keys(inv.initialAllocations)
                        inv.initialAllocations[keys[0]] = v
                        inv.initialAllocations[keys[1]] = 100 - v
                        break
                }
            })
            copy.name = `${selected.name} (${Object.entries(cmb).map(([k, v]) => `${k}=${v}`).join(', ')})`
            return copy
        })

        try {
            const res = await fetch('/api/explore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenarios: mods, simulationCount: count })
            })
            const body = await res.json()
            setFeedback(`Success: ${body.message}`)
        } catch (e) {
            setFeedback(`Error: ${e.message}`)
        }
        setLoading(false)
    }

    return (
        <div className="p-6 space-y-6">
            <button onClick={() => router.push('/simulation')} className="text-blue-600 hover:underline">← Back to Simulation</button>
            <h1 className="text-2xl font-bold">2D Parameter Exploration</h1>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scenarios.map(sc => (
                    <ScenarioCard
                        key={sc.id}
                        scenario={sc}
                        selected={sc.id === selected?.id}
                        onSelect={setSelected}
                    />
                ))}
            </section>

            {selected && (
                <div className="space-y-4 max-w-lg">
                    <label className="flex items-center space-x-2">
                        <input type="checkbox" checked={is2D} onChange={e => setIs2D(e.target.checked)} />
                        <span>Enable 2D Exploration</span>
                    </label>

                    <div className="space-y-2">
                        <label>Parameter 1</label>
                        <select value={p1} onChange={e => setP1(e.target.value)} className="w-full p-2 border rounded">
                            {params.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className="flex space-x-2">
                            <input type="number" value={range1.min} onChange={e => setRange1({ ...range1, min: +e.target.value })} className="w-1/3 p-2 border rounded" />
                            <input type="number" value={range1.max} onChange={e => setRange1({ ...range1, max: +e.target.value })} className="w-1/3 p-2 border rounded" />
                            <input type="number" value={range1.step} onChange={e => setRange1({ ...range1, step: +e.target.value })} className="w-1/3 p-2 border rounded" />
                        </div>
                    </div>

                    {is2D && (
                        <div className="space-y-2">
                            <label>Parameter 2</label>
                            <select value={p2} onChange={e => setP2(e.target.value)} className="w-full p-2 border rounded">
                                {params.filter(p => p.id !== p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <div className="flex space-x-2">
                                <input type="number" value={range2.min} onChange={e => setRange2({ ...range2, min: +e.target.value })} className="w-1/3 p-2 border rounded" />
                                <input type="number" value={range2.max} onChange={e => setRange2({ ...range2, max: +e.target.value })} className="w-1/3 p-2 border rounded" />
                                <input type="number" value={range2.step} onChange={e => setRange2({ ...range2, step: +e.target.value })} className="w-1/3 p-2 border rounded" />
                            </div>
                        </div>
                    )}

                    <div>
                        <label>Simulation Count</label>
                        <input type="number" value={count} min={1} onChange={e => setCount(+e.target.value)} className="w-32 p-2 border rounded" />
                    </div>

                    <button
                        onClick={explore}
                        disabled={loading}
                        className={`px-6 py-2 rounded ${loading ? 'bg-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {loading ? 'Running...' : 'Run Exploration'}
                    </button>

                    {feedback && <p className="mt-2 text-sm text-gray-700">{feedback}</p>}
                </div>
            )}
        </div>
    )
}
