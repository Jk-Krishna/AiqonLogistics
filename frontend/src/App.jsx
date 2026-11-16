import React, { useState, useEffect } from 'react';
import {
  Compass,
  Ship,
  Plane,
  Truck,
  Train,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingDown,
  Clock,
  DollarSign,
  ShieldAlert,
  Sliders,
  Sparkles,
  BarChart3,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
  ChevronRight,
  Boxes,
  HelpCircle,
  Award
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('optimizer'); // 'optimizer' | 'benchmark' | 'nlp' | 'architecture'
  const [shipmentsCatalog, setShipmentsCatalog] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('SHP-001');
  const [currentShipment, setCurrentShipment] = useState(null);
  const [weights, setWeights] = useState({ cost: 0.15, time: 0.55, risk: 0.30 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);

  // NLP query state
  const [nlpQuery, setNlpQuery] = useState(
    'We need an urgent shipment of precision electronics from Mumbai to Rotterdam within 14 days, with a budget of $6000.'
  );
  const [nlpParsing, setNlpParsing] = useState(false);
  const [nlpResult, setNlpResult] = useState(null);

  // Fetch shipments on load
  useEffect(() => {
    fetchShipments();
    fetchEvaluation();
  }, []);

  const fetchShipments = async () => {
    try {
      const res = await fetch('/api/shipments');
      if (res.ok) {
        const data = await res.json();
        setShipmentsCatalog(data);
        if (data.length > 0) {
          loadShipment(data[0].shipment_id);
        }
      }
    } catch (e) {
      console.warn('API not available, fallback to local fetch', e);
    }
  };

  const fetchEvaluation = async () => {
    try {
      const res = await fetch('/api/evaluate');
      if (res.ok) {
        const data = await res.json();
        setEvaluationData(data);
      }
    } catch (e) {
      console.warn('Failed to load evaluation', e);
    }
  };

  const loadShipment = async (id) => {
    setLoading(true);
    setSelectedShipmentId(id);
    try {
      const res = await fetch(`/api/shipments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentShipment(data);
        // Set weights according to cargo type
        setDefaultsForCargo(data.cargo_type);
        // Automatically optimize
        runOptimization(data, getDefaultsForCargo(data.cargo_type));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultsForCargo = (cargo) => {
    switch (cargo?.toLowerCase()) {
      case 'urgent':
        return { cost: 0.15, time: 0.55, risk: 0.30 };
      case 'economy':
        return { cost: 0.65, time: 0.20, risk: 0.15 };
      case 'perishable':
        return { cost: 0.15, time: 0.50, risk: 0.35 };
      default:
        return { cost: 0.40, time: 0.35, risk: 0.25 };
    }
  };

  const setDefaultsForCargo = (cargo) => {
    setWeights(getDefaultsForCargo(cargo));
  };

  const runOptimization = async (shipmentObj = currentShipment, customW = weights) => {
    if (!shipmentObj) return;
    setLoading(true);
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment: shipmentObj,
          custom_weights: customW
        })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNlpSubmit = async (e) => {
    e.preventDefault();
    if (!nlpQuery.trim()) return;
    setNlpParsing(true);
    try {
      const res = await fetch('/api/parse-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlpQuery })
      });
      if (res.ok) {
        const data = await res.json();
        setNlpResult(data);
        setCurrentShipment(data.shipment);
        setSelectedShipmentId(data.shipment.shipment_id);
        const w = getDefaultsForCargo(data.shipment.cargo_type);
        setWeights(w);
        runOptimization(data.shipment, w);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNlpParsing(false);
    }
  };

  // Helper for mode icons
  const renderModeIcon = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'air':
        return <Plane className="w-4 h-4 text-cyan-400" />;
      case 'rail':
        return <Train className="w-4 h-4 text-amber-400" />;
      case 'road':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Ship className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-white bg-clip-text text-transparent">
                Aiqon Logistics
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                ROUTING ENGINE v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Multi-Objective Decision System under Uncertainty</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-medium">
          <button
            onClick={() => setActiveTab('optimizer')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'optimizer'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Decision Engine
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'benchmark'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            30-Shipment Benchmark
          </button>
          <button
            onClick={() => setActiveTab('nlp')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'nlp'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Plain-English Agent
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'architecture'
                ? 'bg-blue-600 text-white shadow font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            System Architecture
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: OPTIMIZER CONSOLE */}
        {activeTab === 'optimizer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Control Panel: Shipment Inputs & Constraints (4 Cols) */}
            <div className="lg:col-span-4 space-y-5">
              {/* Preset Selector */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 flex items-center justify-between">
                  <span>Preset Benchmark Shipment</span>
                  <span className="text-[10px] text-blue-400 font-mono">30 Global Routes</span>
                </label>
                <select
                  value={selectedShipmentId}
                  onChange={(e) => loadShipment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {shipmentsCatalog.map((s) => (
                    <option key={s.shipment_id} value={s.shipment_id}>
                      [{s.cargo_type.toUpperCase()}] {s.title}
                    </option>
                  ))}
                </select>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => loadShipment('SHP-001')}
                    className="text-[11px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-md transition"
                  >
                    ⭐ Assignment Benchmark (Mumbai → Rotterdam)
                  </button>
                </div>
              </div>

              {/* Shipment Specification Card */}
              {currentShipment && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-mono text-slate-500 uppercase">{currentShipment.shipment_id}</span>
                      <h3 className="font-bold text-sm text-slate-200">{currentShipment.title}</h3>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase ${
                        currentShipment.cargo_type === 'urgent'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : currentShipment.cargo_type === 'perishable'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : currentShipment.cargo_type === 'economy'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {currentShipment.cargo_type}
                    </span>
                  </div>

                  {/* Route Corridor */}
                  <div className="flex items-center justify-between text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className="text-slate-300 font-medium">{currentShipment.origin}</div>
                    <ArrowRight className="w-4 h-4 text-slate-500" />
                    <div className="text-slate-300 font-medium">{currentShipment.destination}</div>
                  </div>

                  {/* Operational Constraints */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-slate-500 block mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" /> Deadline Limit
                      </span>
                      <span className="text-base font-bold text-slate-200">{currentShipment.deadline_days} days</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-slate-500 block mb-1 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Max Budget
                      </span>
                      <span className="text-base font-bold text-slate-200">
                        ${currentShipment.max_budget?.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-slate-500 block mb-1">Delay Penalty (Base)</span>
                      <span className="font-semibold text-slate-300">${currentShipment.delay_penalty_cost}</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-slate-500 block mb-1">Cold Chain (Reefer)</span>
                      <span
                        className={`font-semibold ${
                          currentShipment.requires_reefer ? 'text-cyan-400' : 'text-slate-400'
                        }`}
                      >
                        {currentShipment.requires_reefer ? 'Mandatory' : 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Attribute Weights Slider */}
                  <div className="border-t border-slate-800 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Objective Priority Weights
                      </span>
                      <button
                        onClick={() => setDefaultsForCargo(currentShipment.cargo_type)}
                        className="text-[10px] text-blue-400 hover:underline"
                      >
                        Reset to {currentShipment.cargo_type}
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5">
                          <span>Transit Speed (Time)</span>
                          <span className="font-mono text-cyan-400 font-semibold">{Math.round(weights.time * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.80"
                          step="0.05"
                          value={weights.time}
                          onChange={(e) => {
                            const t = parseFloat(e.target.value);
                            const rem = 1.0 - t;
                            setWeights({ time: t, cost: rem * 0.4, risk: rem * 0.6 });
                          }}
                          className="w-full accent-cyan-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5">
                          <span>Delay & Congestion Risk</span>
                          <span className="font-mono text-rose-400 font-semibold">{Math.round(weights.risk * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.80"
                          step="0.05"
                          value={weights.risk}
                          onChange={(e) => {
                            const r = parseFloat(e.target.value);
                            const rem = 1.0 - r;
                            setWeights({ risk: r, time: rem * 0.6, cost: rem * 0.4 });
                          }}
                          className="w-full accent-rose-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-0.5">
                          <span>Base Freight Cost</span>
                          <span className="font-mono text-emerald-400 font-semibold">{Math.round(weights.cost * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.80"
                          step="0.05"
                          value={weights.cost}
                          onChange={(e) => {
                            const c = parseFloat(e.target.value);
                            const rem = 1.0 - c;
                            setWeights({ cost: c, time: rem * 0.5, risk: rem * 0.5 });
                          }}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => runOptimization()}
                    disabled={loading}
                    className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 text-sm transition"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Run Optimization Pipeline
                  </button>
                </div>
              )}
            </div>

            {/* Right Display Area: Pipeline Stages & Decision Explanation (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {result && (
                <>
                  {/* Step 7 & 8: Executive Recommendation Banner */}
                  <div
                    className={`rounded-2xl p-5 border shadow-xl relative overflow-hidden ${
                      result.is_close_call
                        ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
                        : 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" /> RECOMMENDED ROUTE
                          </span>
                          {result.is_close_call && (
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> CLOSE CALL ({result.close_call_margin_pct}% margin)
                            </span>
                          )}
                        </div>

                        <h2 className="text-xl font-extrabold text-white">
                          {result.recommended_route?.route_id}: {result.recommended_route?.route_name}
                        </h2>
                        <p className="text-xs text-slate-400">Carrier: {result.recommended_route?.carrier}</p>
                      </div>

                      {/* Top Metric Cards */}
                      <div className="flex gap-2">
                        <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                          <span className="text-[10px] text-slate-500 block uppercase">On-Time Prob</span>
                          <span className="text-lg font-black text-emerald-400">
                            {result.recommended_route?.p_ontime}%
                          </span>
                        </div>
                        <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                          <span className="text-[10px] text-slate-500 block uppercase">P90 Time</span>
                          <span className="text-lg font-black text-cyan-400">
                            {result.recommended_route?.p90_time}d
                          </span>
                        </div>
                        <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl text-center">
                          <span className="text-[10px] text-slate-500 block uppercase">Base Cost</span>
                          <span className="text-lg font-black text-slate-200">
                            ${result.recommended_route?.aggregated.total_cost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Plain English Executive Rationale */}
                    <div className="mt-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs space-y-2">
                      <div className="text-slate-200 font-medium leading-relaxed">
                        “{result.executive_summary}”
                      </div>
                      <div className="text-slate-400 text-[11px] leading-relaxed border-t border-slate-800/60 pt-2">
                        {result.tradeoff_rationale}
                      </div>
                    </div>
                  </div>

                  {/* 8-Stage Step-by-Step Decision Pipeline */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-blue-400" />
                      Step-by-Step Optimization & Filtering Pipeline
                    </h3>

                    {/* Step Timeline Breakdown */}
                    <div className="space-y-3">
                      {/* Step 1 & 2: Load & Aggregation */}
                      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-300 mb-1.5">
                          <span className="flex items-center gap-1.5 text-blue-400">
                            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-mono">
                              1-2
                            </span>
                            Load Route Options & Aggregate Leg Dynamics
                          </span>
                          <span className="text-slate-500">{result.all_evaluations?.length} Routes Evaluated</span>
                        </div>
                        <p className="text-slate-400 mb-2">
                          Evaluated multimodal legs across ocean, air, and rail. Computed route costs, transit times,
                          hub dwell periods, and compound delay probabilities: $P(delay) = 1 - \prod (1 - p_i)$.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {result.all_evaluations?.map((r) => (
                            <div key={r.route_id} className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                              <span className="font-bold text-slate-200 block">{r.route_id}</span>
                              <span className="text-[11px] text-slate-400">
                                ${r.aggregated.total_cost} | {r.aggregated.total_base_time}d
                              </span>
                              <div className="text-[10px] text-rose-400">
                                P(delay): {Math.round(r.aggregated.delay_probability * 100)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Step 3: Hard Constraint Filter */}
                      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-300 mb-1.5">
                          <span className="flex items-center gap-1.5 text-amber-400">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-mono">
                              3
                            </span>
                            Hard Constraint Filtering (Deadline, Budget & Cargo Rules)
                          </span>
                          <span className="text-slate-500">
                            {result.all_evaluations?.filter((e) => e.elimination_stage === 'Hard Constraint').length} Eliminated
                          </span>
                        </div>
                        <div className="space-y-1.5 mt-2">
                          {result.all_evaluations
                            ?.filter((e) => e.elimination_stage === 'Hard Constraint')
                            .map((e) => (
                              <div
                                key={e.route_id}
                                className="flex items-start gap-2 bg-rose-500/5 border border-rose-500/20 p-2 rounded-lg text-rose-300"
                              >
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold">{e.route_id} Eliminated: </span>
                                  <span>{e.elimination_reason}</span>
                                </div>
                              </div>
                            ))}
                          {result.all_evaluations?.filter((e) => e.elimination_stage === 'Hard Constraint').length === 0 && (
                            <div className="text-slate-500 italic">All routes satisfied hard operational constraints.</div>
                          )}
                        </div>
                      </div>

                      {/* Step 4: Pareto Dominance Filter */}
                      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-300 mb-1.5">
                          <span className="flex items-center gap-1.5 text-indigo-400">
                            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-mono">
                              4
                            </span>
                            Pareto Dominance Filter (Multi-Objective Pruning)
                          </span>
                          <span className="text-slate-500">
                            {result.all_evaluations?.filter((e) => e.elimination_stage === 'Pareto Filter').length} Dominated
                          </span>
                        </div>
                        <div className="space-y-1.5 mt-2">
                          {result.all_evaluations
                            ?.filter((e) => e.elimination_stage === 'Pareto Filter')
                            .map((e) => (
                              <div
                                key={e.route_id}
                                className="flex items-start gap-2 bg-indigo-500/5 border border-indigo-500/20 p-2 rounded-lg text-indigo-300"
                              >
                                <TrendingDown className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold">{e.route_id} Eliminated: </span>
                                  <span>{e.elimination_reason}</span>
                                </div>
                              </div>
                            ))}
                          {result.all_evaluations?.filter((e) => e.elimination_stage === 'Pareto Filter').length === 0 && (
                            <div className="text-slate-500 italic">No routes dominated on all objectives simultaneously.</div>
                          )}
                        </div>
                      </div>

                      {/* Step 5 & 6: Weighted Scoring & Uncertainty Check */}
                      <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-300 mb-1.5">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono">
                              5-6
                            </span>
                            Weighted Scoring, Monte Carlo & Decision Stability
                          </span>
                          <span className="text-slate-500">
                            Weights: Speed ({Math.round(weights.time * 100)}%), Risk ({Math.round(weights.risk * 100)}%), Cost ({Math.round(weights.cost * 100)}%)
                          </span>
                        </div>

                        {/* Surviving routes table */}
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                                <th className="pb-1.5 font-semibold">Route</th>
                                <th className="pb-1.5 font-semibold">Rank</th>
                                <th className="pb-1.5 font-semibold">Base Cost</th>
                                <th className="pb-1.5 font-semibold">Exp Cost (+Penalty)</th>
                                <th className="pb-1.5 font-semibold">Base Time</th>
                                <th className="pb-1.5 font-semibold">P90 Time</th>
                                <th className="pb-1.5 font-semibold">P(On-Time)</th>
                                <th className="pb-1.5 font-semibold">Stability</th>
                                <th className="pb-1.5 font-semibold">Utility Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                              {result.all_evaluations
                                ?.filter((e) => !e.eliminated)
                                .map((e) => (
                                  <tr
                                    key={e.route_id}
                                    className={
                                      e.route_id === result.recommended_route_id
                                        ? 'bg-emerald-500/10 text-emerald-300 font-semibold'
                                        : 'text-slate-300 hover:bg-slate-900/50'
                                    }
                                  >
                                    <td className="py-2 font-sans font-medium flex items-center gap-1.5">
                                      {e.route_id === result.recommended_route_id && (
                                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                                      )}
                                      {e.route_id} ({e.route_name.split(' ')[0]})
                                    </td>
                                    <td className="py-2">#{e.rank}</td>
                                    <td className="py-2">${e.aggregated.total_cost}</td>
                                    <td className="py-2 text-amber-300">${e.expected_cost}</td>
                                    <td className="py-2">{e.aggregated.total_base_time}d</td>
                                    <td className="py-2 text-cyan-300">{e.p90_time}d</td>
                                    <td className="py-2 font-bold text-emerald-400">{e.p_ontime}%</td>
                                    <td className="py-2 text-indigo-300">{e.decision_stability}%</td>
                                    <td className="py-2 font-bold text-white">{e.utility_score}/100</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route Leg Inspector */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                      <Ship className="w-4 h-4 text-blue-400" /> Multimodal Legs Breakdown for Available Routes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {result.all_evaluations?.map((r) => (
                        <div
                          key={r.route_id}
                          className={`p-3.5 rounded-xl border ${
                            r.route_id === result.recommended_route_id
                              ? 'bg-slate-950 border-emerald-500/40'
                              : r.eliminated
                              ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-200">{r.route_id}: {r.route_name}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                r.route_id === result.recommended_route_id
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : r.eliminated
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {r.route_id === result.recommended_route_id ? 'Recommended' : r.elimination_stage || 'Ranked'}
                            </span>
                          </div>

                          <div className="space-y-1.5 border-t border-slate-800 pt-2 font-sans">
                            {r.aggregated.legs.map((leg, idx) => (
                              <div
                                key={leg.leg_id}
                                className="flex items-center justify-between text-[11px] bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-800/80"
                              >
                                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                                  {renderModeIcon(leg.mode)}
                                  <span className="text-slate-300 font-medium truncate">{leg.origin.split(' ')[0]} → {leg.destination.split(' ')[0]}</span>
                                </div>
                                <div className="text-right text-slate-400 font-mono">
                                  ${leg.base_cost} | {leg.base_transit_days}d {leg.hub_dwell_days > 0 ? `(+${leg.hub_dwell_days}d dwell)` : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: OFFLINE BENCHMARK DASHBOARD */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Offline Benchmark Evaluation (All 30 Shipments)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Empirical validation of Aiqon Decision System vs 3 standard logistics baselines across 1,000 Monte Carlo runs per shipment.
                  </p>
                </div>
                <button
                  onClick={fetchEvaluation}
                  className="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-2 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Benchmark
                </button>
              </div>

              {/* Aggregate Metric Cards */}
              {evaluationData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {evaluationData.summary?.map((m) => {
                    const isAiqon = m.Method.includes('Aiqon');
                    return (
                      <div
                        key={m.Method}
                        className={`p-4 rounded-xl border relative overflow-hidden ${
                          isAiqon
                            ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        {isAiqon && (
                          <div className="absolute top-2 right-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold font-mono">
                            PROPOSED
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-300 block mb-2">{m.Method}</span>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Realized Cost:</span>
                            <span className="font-mono font-bold text-slate-200">
                              ${m['Avg Realized Cost ($)']}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Delay Penalty:</span>
                            <span className="font-mono text-rose-400">
                              ${m['Avg Delay Penalty Incurred ($)']}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">On-Time Rate:</span>
                            <span
                              className={`font-mono font-extrabold ${
                                m['On-Time Delivery Rate (%)'] > 90 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {m['On-Time Delivery Rate (%)']}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">P95 Time:</span>
                            <span className="font-mono text-cyan-400">{m['Avg P95 Transit Time (days)']}d</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                            <span className="text-slate-500">Rule Breaches:</span>
                            <span className="font-mono text-slate-400 font-semibold">
                              {m['Cargo Constraint Violations']} Cargo | {m['Budget Violations']} Budget
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Key Empirical Insights Box */}
              <div className="mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <span className="font-bold text-blue-400 uppercase tracking-wider block">
                  Key Evaluation Takeaways
                </span>
                <ul className="list-disc list-inside text-slate-300 space-y-1 leading-relaxed">
                  <li>
                    <strong className="text-white">Why the Cheapest Baseline Fails:</strong> Choosing the cheapest route
                    saves base freight upfront ($2,840 vs $4,432), but incurs an average of{' '}
                    <span className="text-rose-400 font-bold">$2,583 in delay penalties</span>, producing a disastrous{' '}
                    <span className="text-rose-400 font-bold">27.6% on-time reliability</span> and raising total realized cost to $5,423.
                  </li>
                  <li>
                    <strong className="text-white">Why the Lowest-Risk Baseline is Inefficient:</strong> Over-hedging against risk
                    picks costly routes ($5,138 base cost) and violates operator budget constraints in 4 out of 30 shipments.
                  </li>
                  <li>
                    <strong className="text-white">The Aiqon Advantage:</strong> The multi-stage optimizer achieves{' '}
                    <span className="text-emerald-400 font-bold">96.0% on-time delivery</span> with zero constraint breaches
                    and minimizes net realized operational expenditure ($4,557).
                  </li>
                </ul>
              </div>

              {/* Shipment-by-Shipment Results Table */}
              {evaluationData && (
                <div className="mt-6 overflow-x-auto">
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
                    Detailed Shipment Benchmark Matrix (30 Shipments)
                  </h4>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2">Shipment</th>
                        <th className="py-2">Cargo Type</th>
                        <th className="py-2">Deadline</th>
                        <th className="py-2 text-emerald-400">Aiqon Realized Cost</th>
                        <th className="py-2 text-emerald-400">Aiqon On-Time</th>
                        <th className="py-2 text-rose-400">Cheapest Realized Cost</th>
                        <th className="py-2 text-rose-400">Cheapest On-Time</th>
                        <th className="py-2 text-blue-400">Fastest Realized Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                      {evaluationData.shipments?.slice(0, 15).map((row) => (
                        <tr key={row.shipment_id} className="hover:bg-slate-900/50">
                          <td className="py-1.5 font-sans font-medium text-slate-200">{row.shipment_id}</td>
                          <td className="py-1.5 uppercase font-sans text-slate-400">{row.cargo_type}</td>
                          <td className="py-1.5 text-slate-400">{row.deadline_days}d</td>
                          <td className="py-1.5 text-emerald-300 font-bold">${row['Aiqon (Proposed)_cost']}</td>
                          <td className="py-1.5 text-emerald-300 font-bold">{row['Aiqon (Proposed)_ontime']}%</td>
                          <td className="py-1.5 text-rose-300">${row['Baseline: Cheapest_cost']}</td>
                          <td className="py-1.5 text-rose-300">{row['Baseline: Cheapest_ontime']}%</td>
                          <td className="py-1.5 text-blue-300">${row['Baseline: Fastest_cost']}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-slate-500 mt-2 italic">Showing top 15 of 30 benchmark records. Full dataset stored in evaluation_summary.csv.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PLAIN-ENGLISH AGENT LAYER */}
        {activeTab === 'nlp' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-white">Logistics Operator Plain-English Assistant</h2>
                  <p className="text-xs text-slate-400">
                    Bonus Layer: Natural language parser parses operator queries into structured constraints and calls the optimizer.
                  </p>
                </div>
              </div>

              <form onSubmit={handleNlpSubmit} className="space-y-3 mt-4">
                <textarea
                  value={nlpQuery}
                  onChange={(e) => setNlpQuery(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Urgent shipment from Mumbai to Rotterdam, must arrive in 14 days with budget of $6000."
                />

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNlpQuery(
                          'We need an urgent shipment of precision electronics from Mumbai to Rotterdam within 14 days, with a budget of $6000.'
                        )
                      }
                      className="text-[11px] text-purple-400 hover:underline"
                    >
                      Preset: Mumbai → Rotterdam (Urgent)
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setNlpQuery(
                          'Perishable fruit container from Santos to Antwerp, cold-chain reefer required, 16 day shelf life.'
                        )
                      }
                      className="text-[11px] text-purple-400 hover:underline"
                    >
                      Preset: Perishable Reefer
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={nlpParsing}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition"
                  >
                    {nlpParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Parse & Optimize
                  </button>
                </div>
              </form>

              {nlpResult && (
                <div className="mt-5 border-t border-slate-800 pt-4 space-y-3 text-xs">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                    <span className="text-purple-400 font-bold block mb-1">Parsed Parameters from Query:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                      <div>Origin: <span className="text-white">{nlpResult.parsed_entities.origin}</span></div>
                      <div>Destination: <span className="text-white">{nlpResult.parsed_entities.destination}</span></div>
                      <div>Priority: <span className="text-amber-400">{nlpResult.parsed_entities.cargo_type}</span></div>
                      <div>Deadline: <span className="text-cyan-400">{nlpResult.parsed_entities.deadline_days} days</span></div>
                    </div>
                  </div>

                  <div className="bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-xl text-emerald-300">
                    <span className="font-bold block mb-1">Agent Recommendation Result:</span>
                    <p className="text-slate-300 leading-relaxed">{result?.executive_summary}</p>
                    <button
                      onClick={() => setActiveTab('optimizer')}
                      className="mt-2 text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      View in full Decision Console <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE GUIDE */}
        {activeTab === 'architecture' && (
          <div className="max-w-4xl mx-auto space-y-6 text-xs text-slate-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                Aiqon Logistics Decision Engine Architecture
              </h2>
              <p className="leading-relaxed">
                Logistics routing is fundamentally a multi-objective decision problem under uncertainty. A route that is cheaper
                often introduces higher delay risk and port congestion, while express air freight carries higher financial cost.
                The Aiqon Decision System balances these objectives using an 8-stage decision pipeline:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-blue-400">1. Multimodal Leg Dynamics</span>
                  <p className="text-slate-400">
                    Combines individual transit legs (rail, sea, road, air), adding hub dwell buffers and compounding independent delay probabilities:
                    <span className="font-mono block text-slate-300 mt-1">P(delay) = 1 - ∏ (1 - pᵢ)</span>
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-amber-400">2. Hard Constraint Filtering</span>
                  <p className="text-slate-400">
                    Drops non-viable paths that violate strict deadlines ($P90 &gt; \text{deadline}$), exceed maximum authorized budgets, or violate cold-chain / hazardous material rules.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-indigo-400">3. Pareto Dominance Pruning</span>
                  <p className="text-slate-400">
                    Eliminates candidate routes that are strictly dominated across all objectives (cost, transit time, delay probability, risk score) by another candidate.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400">4. Multi-Attribute Scoring & Uncertainty</span>
                  <p className="text-slate-400">
                    Applies cargo-specific utility weights and runs 2,500 Monte Carlo stochastic runs (lognormal delay shocks) to determine on-time probability and 1,000 weight jitter perturbations to verify decision stability.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500">
        Aiqon Logistics AI Internship Take-Home Assignment • Developed with React, FastAPI, Monte Carlo Simulation & Pareto Optimization.
      </footer>
    </div>
  );
}
