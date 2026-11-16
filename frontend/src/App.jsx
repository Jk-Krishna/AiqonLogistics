import React, { useState, useEffect, useMemo } from 'react';
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
  Award,
  Activity,
  Zap,
  Search,
  Filter,
  Check,
  Plus,
  Trash2,
  Edit3,
  ThermometerSnowflake,
  ShieldCheck,
  Package,
  MapPin,
  Settings,
  HelpCircle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'corridors' | 'benchmark' | 'nlp' | 'architecture'
  
  // Custom user input shipment state
  const [customOrigin, setCustomOrigin] = useState('Mumbai, India');
  const [customDestination, setCustomDestination] = useState('Rotterdam, Netherlands');
  const [customCargoType, setCustomCargoType] = useState('urgent');
  const [customDeadline, setCustomDeadline] = useState(14.0);
  const [customBudget, setCustomBudget] = useState(6000.0);
  const [customPenaltyCost, setCustomPenaltyCost] = useState(2500.0);
  const [customPenaltyPerDay, setCustomPenaltyPerDay] = useState(600.0);
  const [customReefer, setCustomReefer] = useState(false);
  const [customHazardous, setCustomHazardous] = useState(false);
  const [customRoutes, setCustomRoutes] = useState([]);
  const [editingRouteIdx, setEditingRouteIdx] = useState(null);

  // Global Corridors catalog state
  const [shipmentsCatalog, setShipmentsCatalog] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState('SHP-001');

  // Weights state
  const [weights, setWeights] = useState({ cost: 0.15, time: 0.55, risk: 0.30 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);

  // NLP query state
  const [nlpQuery, setNlpQuery] = useState(
    'Urgent shipment of electronics from Mumbai to Rotterdam within 14 days, budget is $6000.'
  );
  const [nlpParsing, setNlpParsing] = useState(false);
  const [nlpResult, setNlpResult] = useState(null);

  // Benchmark table search
  const [benchmarkSearch, setBenchmarkSearch] = useState('');
  const [benchmarkFilter, setBenchmarkFilter] = useState('all');

  useEffect(() => {
    fetchShipments();
    fetchEvaluation();
    // Initialize default custom routes for Mumbai -> Rotterdam
    generateRoutesForCustomInput('Mumbai, India', 'Rotterdam, Netherlands', 'urgent', 14.0, 6000.0, false, false);
  }, []);

  const fetchShipments = async () => {
    try {
      const res = await fetch('/api/shipments');
      if (res.ok) {
        const data = await res.json();
        setShipmentsCatalog(data);
      }
    } catch (e) {
      console.warn('API error', e);
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

  const generateRoutesForCustomInput = async (orig, dest, cargo, deadline, budget, reefer, hazard) => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: orig,
          destination: dest,
          cargo_type: cargo,
          deadline_days: parseFloat(deadline),
          max_budget: parseFloat(budget),
          requires_reefer: reefer,
          hazardous: hazard
        })
      });
      if (res.ok) {
        const routes = await res.json();
        setCustomRoutes(routes);
        // Automatically optimize this shipment
        executeOptimizationWithRoutes(orig, dest, cargo, deadline, budget, reefer, hazard, routes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const executeOptimizationWithRoutes = async (
    orig = customOrigin,
    dest = customDestination,
    cargo = customCargoType,
    deadline = customDeadline,
    budget = customBudget,
    reefer = customReefer,
    hazard = customHazardous,
    routesList = customRoutes,
    activeWeights = weights
  ) => {
    if (!routesList || routesList.length === 0) return;
    setLoading(true);

    const shipmentPayload = {
      shipment_id: 'USER-INPUT',
      title: `${cargo.toUpperCase()} Freight: ${orig} → ${dest}`,
      origin: orig,
      destination: dest,
      cargo_type: cargo,
      weight_kg: 2000.0,
      deadline_days: parseFloat(deadline),
      max_budget: parseFloat(budget),
      delay_penalty_cost: parseFloat(customPenaltyCost),
      delay_penalty_per_day: parseFloat(customPenaltyPerDay),
      requires_reefer: reefer,
      hazardous: hazard,
      routes: routesList
    };

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment: shipmentPayload,
          custom_weights: activeWeights
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

  const loadFromCatalog = async (id) => {
    setLoading(true);
    setSelectedShipmentId(id);
    try {
      const res = await fetch(`/api/shipments/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomOrigin(data.origin);
        setCustomDestination(data.destination);
        setCustomCargoType(data.cargo_type);
        setCustomDeadline(data.deadline_days);
        setCustomBudget(data.max_budget);
        setCustomReefer(data.requires_reefer);
        setCustomHazardous(data.hazardous);
        setCustomRoutes(data.routes);
        const w = getDefaultsForCargo(data.cargo_type);
        setWeights(w);
        executeOptimizationWithRoutes(
          data.origin,
          data.destination,
          data.cargo_type,
          data.deadline_days,
          data.max_budget,
          data.requires_reefer,
          data.hazardous,
          data.routes,
          w
        );
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
        const s = data.shipment;
        setCustomOrigin(s.origin);
        setCustomDestination(s.destination);
        setCustomCargoType(s.cargo_type);
        setCustomDeadline(s.deadline_days);
        setCustomBudget(s.max_budget);
        setCustomReefer(s.requires_reefer);
        setCustomHazardous(s.hazardous);
        setCustomRoutes(s.routes);
        const w = getDefaultsForCargo(s.cargo_type);
        setWeights(w);
        executeOptimizationWithRoutes(
          s.origin,
          s.destination,
          s.cargo_type,
          s.deadline_days,
          s.max_budget,
          s.requires_reefer,
          s.hazardous,
          s.routes,
          w
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNlpParsing(false);
    }
  };

  const renderModeIcon = (mode) => {
    switch (mode?.toLowerCase()) {
      case 'air':
        return <Plane className="w-3.5 h-3.5 text-cyan-400" />;
      case 'rail':
        return <Train className="w-3.5 h-3.5 text-amber-400" />;
      case 'road':
        return <Truck className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Ship className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const filteredBenchmarkShipments = useMemo(() => {
    if (!evaluationData?.shipments) return [];
    return evaluationData.shipments.filter((s) => {
      const matchSearch =
        s.shipment_id.toLowerCase().includes(benchmarkSearch.toLowerCase()) ||
        s.title.toLowerCase().includes(benchmarkSearch.toLowerCase());
      const matchFilter = benchmarkFilter === 'all' || s.cargo_type === benchmarkFilter;
      return matchSearch && matchFilter;
    });
  }, [evaluationData, benchmarkSearch, benchmarkFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Aiqon Logistics
                </span>
                <span className="text-slate-400 font-semibold text-sm">Decision Engine</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Multi-Objective Route Optimization Under Uncertainty</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'input'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Custom Shipment Input
            </button>
            <button
              onClick={() => setActiveTab('corridors')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'corridors'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Global Corridors
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'benchmark'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Evaluation Benchmark
            </button>
            <button
              onClick={() => setActiveTab('nlp')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'nlp'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Plain-English Agent
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'architecture'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Methodology Guide
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {/* TAB 1: CUSTOM USER INPUT OPTIMIZER */}
        {activeTab === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Shipment Parameters Form (5 Cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4">
                <div className="border-b border-slate-800/80 pb-3">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-blue-400" /> Shipment Parameters
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Specify origin, destination, constraints, and cargo rules</p>
                </div>

                {/* Origin & Destination Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" /> Origin Location (Port / City)
                    </label>
                    <input
                      type="text"
                      value={customOrigin}
                      onChange={(e) => setCustomOrigin(e.target.value)}
                      placeholder="e.g. Mumbai, India or Shanghai Port"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Destination Location (Port / City)
                    </label>
                    <input
                      type="text"
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      placeholder="e.g. Rotterdam, Netherlands or Los Angeles"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Cargo Type Selection */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                    Cargo Priority Type
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {['urgent', 'standard', 'economy', 'perishable'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setCustomCargoType(type);
                          if (type === 'perishable') setCustomReefer(true);
                          setWeights(getDefaultsForCargo(type));
                        }}
                        className={`py-2 px-1 rounded-xl text-center font-bold uppercase text-[10px] tracking-wider transition border ${
                          customCargoType === type
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deadline & Budget Constraints */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" /> Deadline SLA (Days)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={customDeadline}
                      onChange={(e) => setCustomDeadline(parseFloat(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Max Budget ($)
                    </label>
                    <input
                      type="number"
                      step="100"
                      min="500"
                      value={customBudget}
                      onChange={(e) => setCustomBudget(parseFloat(e.target.value) || 500)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 font-bold"
                    />
                  </div>
                </div>

                {/* Delay Penalties */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Base Delay Penalty ($)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={customPenaltyCost}
                      onChange={(e) => setCustomPenaltyCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Daily Delay Penalty ($/day)
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={customPenaltyPerDay}
                      onChange={(e) => setCustomPenaltyPerDay(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono"
                    />
                  </div>
                </div>

                {/* Cargo Rule Toggles */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <label
                    onClick={() => setCustomReefer(!customReefer)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                      customReefer
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ThermometerSnowflake className={`w-4 h-4 ${customReefer ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>Cold Chain (Reefer)</span>
                  </label>

                  <label
                    onClick={() => setCustomHazardous(!customHazardous)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                      customHazardous
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <ShieldAlert className={`w-4 h-4 ${customHazardous ? 'text-rose-400' : 'text-slate-500'}`} />
                    <span>Hazardous Cargo</span>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() =>
                      generateRoutesForCustomInput(
                        customOrigin,
                        customDestination,
                        customCargoType,
                        customDeadline,
                        customBudget,
                        customReefer,
                        customHazardous
                      )
                    }
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Generate Candidate Routes for Corridor
                  </button>

                  <button
                    onClick={() => executeOptimizationWithRoutes()}
                    disabled={loading || customRoutes.length === 0}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl border border-slate-700 flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Run Multi-Objective Optimizer
                  </button>
                </div>
              </div>

              {/* Priority Weights Sliders */}
              <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4.5 shadow-xl backdrop-blur-md space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Objective Priority Weights
                  </span>
                  <button
                    onClick={() => setWeights(getDefaultsForCargo(customCargoType))}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Reset Defaults
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span className="text-slate-400">Transit Speed</span>
                      <span className="font-mono font-bold text-cyan-400">{Math.round(weights.time * 100)}%</span>
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
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span className="text-slate-400">Delay Risk & Reliability</span>
                      <span className="font-mono font-bold text-rose-400">{Math.round(weights.risk * 100)}%</span>
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
                      className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span className="text-slate-400">Freight Cost</span>
                      <span className="font-mono font-bold text-emerald-400">{Math.round(weights.cost * 100)}%</span>
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
                      className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Optimizer Output & 8-Step Pipeline (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {result && (
                <>
                  {/* Recommended Winner Banner */}
                  <div
                    className={`rounded-2xl p-6 border shadow-2xl relative overflow-hidden backdrop-blur-xl ${
                      result.is_close_call
                        ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900/90 border-amber-500/40 glow-amber'
                        : 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900/90 border-emerald-500/40 glow-emerald'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                            <Award className="w-4 h-4 text-emerald-400" /> RECOMMENDED ROUTE
                          </span>

                          {result.is_close_call && (
                            <span className="text-xs font-mono font-extrabold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                              <AlertTriangle className="w-4 h-4 text-amber-400" /> CLOSE CALL ({result.close_call_margin_pct}% utility margin)
                            </span>
                          )}
                        </div>

                        <h2 className="text-2xl font-black text-white tracking-tight">
                          {result.recommended_route?.route_id}: {result.recommended_route?.route_name}
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">
                          Carrier: <span className="text-slate-200 font-semibold">{result.recommended_route?.carrier}</span>
                        </p>
                      </div>

                      {/* KPI Badges */}
                      <div className="grid grid-cols-3 gap-2 shrink-0">
                        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center shadow-md">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">On-Time SLA</span>
                          <span className="text-xl font-black text-emerald-400 font-mono">
                            {result.recommended_route?.p_ontime}%
                          </span>
                        </div>
                        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center shadow-md">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">P90 Time</span>
                          <span className="text-xl font-black text-cyan-400 font-mono">
                            {result.recommended_route?.p90_time}d
                          </span>
                        </div>
                        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-center shadow-md">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Base Tariff</span>
                          <span className="text-xl font-black text-white font-mono">
                            ${result.recommended_route?.aggregated.total_cost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Executive Explanation */}
                    <div className="mt-5 bg-slate-950/80 p-4.5 rounded-xl border border-slate-800/90 text-xs space-y-2.5">
                      <div className="text-slate-200 font-medium leading-relaxed flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>“{result.executive_summary}”</span>
                      </div>
                      <div className="text-slate-400 text-[11px] leading-relaxed border-t border-slate-800/80 pt-2.5">
                        {result.tradeoff_rationale}
                      </div>
                    </div>
                  </div>

                  {/* 8-Stage Step-by-Step Optimization Visualizer */}
                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-blue-400" />
                        8-Step Optimization & Filtering Pipeline
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {result.all_evaluations?.filter((e) => !e.eliminated).length} / {result.all_evaluations?.length} Routes Survived
                      </span>
                    </div>

                    <div className="space-y-3.5">
                      {/* Step 1 & 2 */}
                      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/90 text-xs space-y-2">
                        <div className="flex items-center justify-between font-semibold text-slate-300">
                          <span className="flex items-center gap-2 text-blue-400">
                            <span className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-300 flex items-center justify-center text-[10px] font-mono font-bold">
                              1-2
                            </span>
                            Route Options & Compound Delay Aggregation
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            P(delay) = 1 - ∏(1 - pᵢ)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {result.all_evaluations?.map((r) => (
                            <div key={r.route_id} className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                              <span className="font-bold text-slate-200 block text-xs">{r.route_id}</span>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                ${r.aggregated.total_cost} • {r.aggregated.total_base_time}d
                              </div>
                              <div className="text-[10px] text-rose-400 font-mono font-semibold mt-0.5">
                                P(delay): {Math.round(r.aggregated.delay_probability * 100)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Step 3: Hard Constraints */}
                      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/90 text-xs space-y-2">
                        <div className="flex items-center justify-between font-semibold text-slate-300">
                          <span className="flex items-center gap-2 text-amber-400">
                            <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-mono font-bold">
                              3
                            </span>
                            Hard Constraint Filtering (Deadline, Budget & Cargo Rules)
                          </span>
                        </div>
                        <div className="space-y-2 pt-1">
                          {result.all_evaluations
                            ?.filter((e) => e.elimination_stage === 'Hard Constraint')
                            .map((e) => (
                              <div
                                key={e.route_id}
                                className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-lg text-rose-200"
                              >
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div className="text-xs">
                                  <span className="font-bold">{e.route_id} Eliminated: </span>
                                  <span>{e.elimination_reason}</span>
                                </div>
                              </div>
                            ))}
                          {result.all_evaluations?.filter((e) => e.elimination_stage === 'Hard Constraint').length === 0 && (
                            <div className="text-slate-500 italic text-[11px]">All routes satisfied operational constraints.</div>
                          )}
                        </div>
                      </div>

                      {/* Step 4: Pareto Filter */}
                      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/90 text-xs space-y-2">
                        <div className="flex items-center justify-between font-semibold text-slate-300">
                          <span className="flex items-center gap-2 text-indigo-400">
                            <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-mono font-bold">
                              4
                            </span>
                            Pareto Dominance Filter (Multi-Objective Pruning)
                          </span>
                        </div>
                        <div className="space-y-2 pt-1">
                          {result.all_evaluations
                            ?.filter((e) => e.elimination_stage === 'Pareto Filter')
                            .map((e) => (
                              <div
                                key={e.route_id}
                                className="flex items-start gap-2.5 bg-indigo-500/10 border border-indigo-500/30 p-2.5 rounded-lg text-indigo-200"
                              >
                                <TrendingDown className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                <div className="text-xs">
                                  <span className="font-bold">{e.route_id} Eliminated: </span>
                                  <span>{e.elimination_reason}</span>
                                </div>
                              </div>
                            ))}
                          {result.all_evaluations?.filter((e) => e.elimination_stage === 'Pareto Filter').length === 0 && (
                            <div className="text-slate-500 italic text-[11px]">No surviving routes were strictly dominated across all objectives.</div>
                          )}
                        </div>
                      </div>

                      {/* Step 5 & 6: Scoring & Uncertainty */}
                      <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/90 text-xs space-y-3">
                        <div className="flex items-center justify-between font-semibold text-slate-300">
                          <span className="flex items-center gap-2 text-emerald-400">
                            <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-mono font-bold">
                              5-6
                            </span>
                            Weighted Utility, Monte Carlo (2,500 runs) & Weight Jitter (1,000 trials)
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                                <th className="pb-2">Route</th>
                                <th className="pb-2">Rank</th>
                                <th className="pb-2">Base Cost</th>
                                <th className="pb-2 text-amber-300">Exp Cost (+Penalty)</th>
                                <th className="pb-2">Base Time</th>
                                <th className="pb-2 text-cyan-300">P90 Time</th>
                                <th className="pb-2 text-emerald-400">P(On-Time)</th>
                                <th className="pb-2 text-indigo-300">Stability</th>
                                <th className="pb-2 text-white">Utility Score</th>
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
                                        ? 'bg-emerald-500/10 text-emerald-300 font-bold'
                                        : 'text-slate-300 hover:bg-slate-900/40'
                                    }
                                  >
                                    <td className="py-2.5 font-sans font-semibold flex items-center gap-1.5">
                                      {e.route_id === result.recommended_route_id && (
                                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                                      )}
                                      {e.route_id}
                                    </td>
                                    <td className="py-2.5">#{e.rank}</td>
                                    <td className="py-2.5">${e.aggregated.total_cost}</td>
                                    <td className="py-2.5 text-amber-300">${e.expected_cost}</td>
                                    <td className="py-2.5">{e.aggregated.total_base_time}d</td>
                                    <td className="py-2.5 text-cyan-300">{e.p90_time}d</td>
                                    <td className="py-2.5 text-emerald-400 font-bold">{e.p_ontime}%</td>
                                    <td className="py-2.5 text-indigo-300">{e.decision_stability}%</td>
                                    <td className="py-2.5 text-white font-bold">{e.utility_score}/100</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Route Legs Details */}
                  <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 space-y-3 shadow-xl backdrop-blur-md">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Ship className="w-4 h-4 text-blue-400" /> Multimodal Legs Breakdown for Evaluated Routes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {result.all_evaluations?.map((r) => (
                        <div
                          key={r.route_id}
                          className={`p-4 rounded-xl border transition-all ${
                            r.route_id === result.recommended_route_id
                              ? 'bg-slate-950 border-emerald-500/40 shadow-md ring-1 ring-emerald-500/30'
                              : r.eliminated
                              ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                              : 'bg-slate-950 border-slate-800/90'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="font-bold text-slate-200">{r.route_id}: {r.route_name}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                r.route_id === result.recommended_route_id
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : r.eliminated
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {r.route_id === result.recommended_route_id ? 'Recommended' : r.elimination_stage || 'Ranked'}
                            </span>
                          </div>

                          <div className="space-y-2 border-t border-slate-800/80 pt-2.5 font-sans">
                            {r.aggregated.legs.map((leg) => (
                              <div
                                key={leg.leg_id}
                                className="flex items-center justify-between text-[11px] bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800"
                              >
                                <div className="flex items-center gap-2 truncate max-w-[210px]">
                                  {renderModeIcon(leg.mode)}
                                  <span className="text-slate-300 font-medium truncate">{leg.origin.split(' ')[0]} → {leg.destination.split(' ')[0]}</span>
                                </div>
                                <div className="text-right text-slate-400 font-mono text-[10px]">
                                  ${leg.base_cost} • {leg.base_transit_days}d {leg.hub_dwell_days > 0 ? `(+${leg.hub_dwell_days}d dwell)` : ''}
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

        {/* TAB 2: GLOBAL CORRIDORS CATALOG */}
        {activeTab === 'corridors' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
              <div className="border-b border-slate-800/80 pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-400" /> Global Shipping Corridors
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Select any pre-configured global trade lane to inspect or optimize</p>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {shipmentsCatalog.length} Active Corridors
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shipmentsCatalog.map((s) => (
                  <div
                    key={s.shipment_id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-slate-500 font-bold">{s.shipment_id}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {s.cargo_type}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-200">{s.title}</h4>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                        <span>{s.origin.split(',')[0]}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span>{s.destination.split(',')[0]}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="font-mono text-slate-400 text-[11px]">
                        Deadline: {s.deadline_days}d • ${s.max_budget?.toLocaleString()}
                      </div>
                      <button
                        onClick={() => {
                          loadFromCatalog(s.shipment_id);
                          setActiveTab('input');
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                      >
                        Load Corridor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: OFFLINE BENCHMARK EVALUATION DASHBOARD */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2.5">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Offline Benchmark Suite (All 30 Global Shipments)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Comparing Aiqon against 3 standard baselines under 1,000 Monte Carlo realized operations per shipment.
                  </p>
                </div>
                <button
                  onClick={fetchEvaluation}
                  className="px-3.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-2 transition font-medium border border-slate-700 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh Results
                </button>
              </div>

              {/* Benchmark Summary KPI Cards */}
              {evaluationData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  {evaluationData.summary?.map((m) => {
                    const isAiqon = m.Method.includes('Aiqon');
                    return (
                      <div
                        key={m.Method}
                        className={`p-5 rounded-xl border relative overflow-hidden transition-all ${
                          isAiqon
                            ? 'bg-emerald-950/25 border-emerald-500/50 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                            : 'bg-slate-950/80 border-slate-800'
                        }`}
                      >
                        {isAiqon && (
                          <div className="absolute top-2.5 right-2.5 text-[9px] bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold font-mono">
                            PROPOSED
                          </div>
                        )}
                        <span className="text-xs font-bold text-slate-200 block mb-3">{m.Method}</span>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Realized Cost:</span>
                            <span className="font-mono font-bold text-white text-sm">
                              ${m['Avg Realized Cost ($)']}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Delay Penalty:</span>
                            <span className="font-mono font-semibold text-rose-400">
                              ${m['Avg Delay Penalty Incurred ($)']}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">On-Time Rate:</span>
                            <span
                              className={`font-mono font-black text-sm ${
                                m['On-Time Delivery Rate (%)'] > 90 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {m['On-Time Delivery Rate (%)']}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">P95 Transit Time:</span>
                            <span className="font-mono text-cyan-400 font-semibold">{m['Avg P95 Transit Time (days)']}d</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-800/80 pt-2 text-[11px]">
                            <span className="text-slate-500">Constraint Violations:</span>
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

              {/* Strategic Insights Card */}
              <div className="mt-6 bg-slate-950/80 p-5 rounded-xl border border-slate-800 text-xs space-y-2.5">
                <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px] block flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-400" /> Key Quantitative Evaluation Takeaways
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 space-y-1">
                    <strong className="text-rose-300 font-bold block text-xs">The Cheapest Baseline Trap</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Saving upfront freight ($2,840 base) backfires. Frequent delays incur an average of <span className="text-rose-400 font-semibold">$2,583 in late penalties</span>, collapsing on-time rate to <span className="text-rose-400 font-bold">27.6%</span> and raising net cost to $5,423.
                    </p>
                  </div>
                  <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 space-y-1">
                    <strong className="text-amber-300 font-bold block text-xs">The Over-Hedging Penalty</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Lowest-Risk baseline over-hedges against disruptions, selecting expensive routes ($5,138 base tariff) and triggering budget violations in 4 out of 30 shipments.
                    </p>
                  </div>
                  <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 space-y-1">
                    <strong className="text-emerald-300 font-bold block text-xs">The Aiqon Advantage</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Aiqon balances time, cost, and reliability. It delivers <span className="text-emerald-400 font-bold">96.0% on-time rate</span> with 0 rule violations and minimizes total realized expenditure ($4,557).
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed 30-Shipment Table */}
              {evaluationData && (
                <div className="mt-6 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                      Shipment-by-Shipment Results Matrix ({filteredBenchmarkShipments.length} Records)
                    </h4>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={benchmarkSearch}
                          onChange={(e) => setBenchmarkSearch(e.target.value)}
                          placeholder="Search shipment..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <select
                        value={benchmarkFilter}
                        onChange={(e) => setBenchmarkFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      >
                        <option value="all">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="perishable">Perishable</option>
                        <option value="economy">Economy</option>
                        <option value="standard">Standard</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                          <th className="py-2.5 px-3">Shipment</th>
                          <th className="py-2.5 px-3">Priority</th>
                          <th className="py-2.5 px-3">Deadline</th>
                          <th className="py-2.5 px-3 text-emerald-400">Aiqon Cost</th>
                          <th className="py-2.5 px-3 text-emerald-400">Aiqon On-Time</th>
                          <th className="py-2.5 px-3 text-rose-400">Cheapest Cost</th>
                          <th className="py-2.5 px-3 text-rose-400">Cheapest On-Time</th>
                          <th className="py-2.5 px-3 text-blue-400">Fastest Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono text-[11px] bg-slate-950/40">
                        {filteredBenchmarkShipments.slice(0, 15).map((row) => (
                          <tr key={row.shipment_id} className="hover:bg-slate-900/50 transition">
                            <td className="py-2 px-3 font-sans font-semibold text-slate-200">{row.shipment_id}</td>
                            <td className="py-2 px-3 uppercase font-sans text-slate-400 text-[10px]">{row.cargo_type}</td>
                            <td className="py-2 px-3 text-slate-400">{row.deadline_days}d</td>
                            <td className="py-2 px-3 text-emerald-300 font-bold">${row['Aiqon (Proposed)_cost']}</td>
                            <td className="py-2 px-3 text-emerald-300 font-bold">{row['Aiqon (Proposed)_ontime']}%</td>
                            <td className="py-2 px-3 text-rose-300">${row['Baseline: Cheapest_cost']}</td>
                            <td className="py-2 px-3 text-rose-300">{row['Baseline: Cheapest_ontime']}%</td>
                            <td className="py-2 px-3 text-blue-300">${row['Baseline: Fastest_cost']}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">Displaying top 15 rows of 30 benchmark shipments. Raw data persisted in evaluation_summary.csv.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PLAIN-ENGLISH AGENT LAYER */}
        {activeTab === 'nlp' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-base text-white">Logistics Operator Natural Language Assistant</h2>
                  <p className="text-xs text-slate-400">
                    Bonus Layer: Natural language parser parses operator queries into structured constraints and calls the optimizer.
                  </p>
                </div>
              </div>

              <form onSubmit={handleNlpSubmit} className="space-y-3.5 pt-2">
                <textarea
                  value={nlpQuery}
                  onChange={(e) => setNlpQuery(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 leading-relaxed font-medium"
                  placeholder="e.g. Urgent shipment from Mumbai to Rotterdam, must arrive in 14 days with budget of $6000."
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setNlpQuery(
                          'We need an urgent shipment of precision electronics from Mumbai to Rotterdam within 14 days, budget is $6000.'
                        )
                      }
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-medium transition"
                    >
                      Preset: Urgent Electronics
                    </button>
                    <span className="text-slate-700">•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setNlpQuery(
                          'Perishable fruit container from Santos to Antwerp, cold-chain reefer required, 16 day shelf life.'
                        )
                      }
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-medium transition"
                    >
                      Preset: Cold-Chain Reefer
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={nlpParsing}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 transition shadow-lg shadow-purple-600/20 active:scale-95"
                  >
                    {nlpParsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Parse & Optimize
                  </button>
                </div>
              </form>

              {nlpResult && (
                <div className="border-t border-slate-800/80 pt-4 space-y-3 text-xs">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-purple-400 font-bold block text-xs">Parsed Semantic Entities:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-[11px]">
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Origin:</span>
                        <span className="text-white font-sans">{nlpResult.parsed_entities.origin}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Destination:</span>
                        <span className="text-white font-sans">{nlpResult.parsed_entities.destination}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Priority:</span>
                        <span className="text-amber-400 uppercase font-sans font-bold">{nlpResult.parsed_entities.cargo_type}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Deadline:</span>
                        <span className="text-cyan-400 font-bold">{nlpResult.parsed_entities.deadline_days} days</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-950/20 border border-emerald-500/30 p-4.5 rounded-xl text-emerald-300 space-y-2">
                    <span className="font-bold block text-xs text-emerald-400">Agent Recommendation:</span>
                    <p className="text-slate-300 leading-relaxed text-xs">{result?.executive_summary}</p>
                    <button
                      onClick={() => setActiveTab('input')}
                      className="mt-2 text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      Open in Decision Console <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ARCHITECTURE GUIDE */}
        {activeTab === 'architecture' && (
          <div className="max-w-4xl mx-auto space-y-6 text-xs text-slate-300">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  Aiqon Decision System Architecture & Mathematical Foundations
                </h2>
                <p className="text-slate-400 mt-1 leading-relaxed text-xs">
                  A multi-objective optimization engine designed to address the realities of global freight under disruption risk.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-blue-400 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" /> 1. Compounding Leg Delays
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Rather than naively adding delay averages, independent disruption probabilities compound multiplicatively across multi-leg journeys:
                  </p>
                  <div className="bg-slate-900 p-2 rounded-lg font-mono text-[11px] text-slate-200">
                    P(delay) = 1 − ∏ (1 − pᵢ)
                  </div>
                </div>

                <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-amber-400" /> 2. Hard Constraint Filtering
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Drop routes violating hard business requirements: budget limits, cargo rules (e.g. perishable goods require continuous reefer cold chain), or when analytical P90 transit time exceeds SLA deadlines.
                  </p>
                </div>

                <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-indigo-400 text-xs flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-indigo-400" /> 3. Pareto Dominance Filtering
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Route A dominates Route B if A is $\le$ on all objectives (cost, effective time, delay risk, composite risk) and strictly $&lt;$ on at least one. Dominated candidates are pruned prior to scoring.
                  </p>
                </div>

                <div className="bg-slate-950 p-4.5 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" /> 4. Stochastic Monte Carlo Modeling
                  </span>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    2,500 Monte Carlo iterations drawing lognormal delay distributions evaluate true right-skewed delivery risk ($P(\text{on-time})$, $P90$ transit time), while 1,000 weight jitter trials verify decision stability %.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-center text-xs text-slate-500 font-medium">
        Aiqon Logistics Decision Engine • Multi-Objective Optimization Under Uncertainty.
      </footer>
    </div>
  );
}
