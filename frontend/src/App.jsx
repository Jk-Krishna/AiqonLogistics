import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Compass,
  Ship,
  Plane,
  Truck,
  Train,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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
  ChevronDown,
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
  Settings as SettingsIcon,
  HelpCircle,
  ExternalLink,
  RotateCcw,
  Bookmark,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function App() {
  // Navigation: 'dashboard' | 'new-shipment' | 'optimizer' | 'shipments' | 'analytics' | 'settings'
  const [activeTab, setActiveTab] = useState('new-shipment');

  // Shipment Creation Form State
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoType, setCargoType] = useState('standard');
  const [description, setDescription] = useState('');
  const [weightKg, setWeightKg] = useState(1000);
  const [volumeCbm, setVolumeCbm] = useState('');
  const [packagesCount, setPackagesCount] = useState('');
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [maxBudget, setMaxBudget] = useState(6000);
  const [delayPenaltyBase, setDelayPenaltyBase] = useState(2000);
  const [delayPenaltyDaily, setDelayPenaltyDaily] = useState(500);
  const [requiresReefer, setRequiresReefer] = useState(false);
  const [hazardous, setHazardous] = useState(false);
  const [allowedModes, setAllowedModes] = useState(['ocean', 'air', 'rail', 'road', 'multimodal']);
  const [recommendationPreference, setRecommendationPreference] = useState('balanced');
  const [customWeights, setCustomWeights] = useState({ cost: 0.35, time: 0.35, risk: 0.30 });
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Autocomplete Location Search State
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showOriginMenu, setShowOriginMenu] = useState(false);
  const [showDestMenu, setShowDestMenu] = useState(false);

  // Active Evaluated Shipment & Optimizer Results State
  const [activeShipment, setActiveShipment] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [candidateRoutes, setCandidateRoutes] = useState([]);
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Saved Shipments History (Local Persistence)
  const [savedShipments, setSavedShipments] = useState(() => {
    try {
      const stored = localStorage.getItem('shipment_analysis_saved') || localStorage.getItem('aiqon_saved_shipments');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Benchmark Data State
  const [evaluationData, setEvaluationData] = useState(null);

  // Settings State
  const [settings, setSettings] = useState({
    defaultCurrency: 'USD',
    distanceUnit: 'km',
    defaultDailyPenalty: 500,
    mcTrials: 2500,
    syntheticNotice: true
  });

  // Save shipments to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('shipment_analysis_saved', JSON.stringify(savedShipments));
    } catch (e) {
      console.warn('Failed to save shipments to storage', e);
    }
  }, [savedShipments]);

  // Fetch benchmark evaluation data on mount
  useEffect(() => {
    fetchEvaluation();
  }, []);

  const fetchEvaluation = async () => {
    try {
      const res = await fetch('/api/evaluate');
      if (res.ok) {
        const data = await res.json();
        setEvaluationData(data);
      }
    } catch (e) {
      console.warn('Could not load evaluation data', e);
    }
  };

  // Location search helper
  const handleLocationSearch = async (term, setter) => {
    if (!term || term.trim().length === 0) {
      setter([]);
      return;
    }
    try {
      const res = await fetch(`/api/locations?q=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        setter(data);
      }
    } catch {
      setter([]);
    }
  };

  // Toggle transportation mode selection
  const toggleMode = (modeKey) => {
    setAllowedModes((prev) => {
      const exists = prev.includes(modeKey);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one mode
        return prev.filter((m) => m !== modeKey);
      } else {
        return [...prev, modeKey];
      }
    });
  };

  // Mode availability helper
  const isModeSelected = (modeKey) => allowedModes.includes(modeKey);

  // Apply recommendation preference preset weights
  const handlePreferenceChange = (pref) => {
    setRecommendationPreference(pref);
    if (pref === 'lowest_cost') {
      setCustomWeights({ cost: 0.70, time: 0.15, risk: 0.15 });
    } else if (pref === 'fastest_delivery') {
      setCustomWeights({ cost: 0.15, time: 0.70, risk: 0.15 });
    } else if (pref === 'lowest_risk') {
      setCustomWeights({ cost: 0.20, time: 0.20, risk: 0.60 });
    } else if (pref === 'balanced') {
      setCustomWeights({ cost: 0.35, time: 0.35, risk: 0.30 });
    }
    // If active shipment exists, recalculate immediately
    if (activeShipment) {
      recalculateWithPreference(pref, activeShipment);
    }
  };

  // Recalculate optimization with new weights or preferences without re-generating routes
  const recalculateWithPreference = async (pref, shipmentObj, weightsOverride) => {
    if (!shipmentObj) return;
    setLoading(true);
    let targetWeights = weightsOverride || customWeights;
    if (pref === 'lowest_cost') targetWeights = { cost: 0.70, time: 0.15, risk: 0.15 };
    else if (pref === 'fastest_delivery') targetWeights = { cost: 0.15, time: 0.70, risk: 0.15 };
    else if (pref === 'lowest_risk') targetWeights = { cost: 0.20, time: 0.20, risk: 0.60 };
    else if (pref === 'balanced') targetWeights = { cost: 0.35, time: 0.35, risk: 0.30 };

    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment: {
            ...shipmentObj,
            recommendation_preference: pref
          },
          custom_weights: targetWeights
        })
      });
      if (res.ok) {
        const resultData = await res.json();
        setOptimizationResult(resultData);
        if (resultData.recommended_route_id) {
          setExpandedRouteId(resultData.recommended_route_id);
        }
      }
    } catch (e) {
      console.error('Recalculation error', e);
    } finally {
      setLoading(false);
    }
  };

  // Create new shipment & run complete optimization
  const handleCreateAndOptimize = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!origin.trim()) {
      setErrorMessage('Please specify an origin location.');
      return;
    }
    if (!destination.trim()) {
      setErrorMessage('Please specify a destination location.');
      return;
    }
    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      setErrorMessage('Origin and Destination cannot be the same location.');
      return;
    }
    if (deadlineDays <= 0) {
      setErrorMessage('Delivery deadline must be greater than zero.');
      return;
    }
    if (maxBudget <= 0) {
      setErrorMessage('Shipping budget must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Generate candidate multimodal routes for this corridor respecting allowed modes
      const routesRes = await fetch('/api/generate-routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: origin.trim(),
          destination: destination.trim(),
          cargo_type: cargoType,
          deadline_days: parseFloat(deadlineDays),
          max_budget: parseFloat(maxBudget),
          requires_reefer: requiresReefer,
          hazardous: hazardous,
          allowed_modes: allowedModes,
          weight_kg: parseFloat(weightKg) || 1000
        })
      });

      if (!routesRes.ok) {
        throw new Error('Failed to generate candidate routes for this corridor.');
      }

      const routes = await routesRes.json();
      setCandidateRoutes(routes);

      if (!routes || routes.length === 0) {
        setErrorMessage('No feasible transportation routes could be generated with the selected mode restrictions.');
        setLoading(false);
        return;
      }

      // Step 2: Build complete Shipment object
      const shipmentPayload = {
        shipment_id: `SHP-${Date.now().toString().slice(-6)}`,
        title: description.trim() || `${cargoType.toUpperCase()} Freight: ${origin.split(',')[0]} → ${destination.split(',')[0]}`,
        origin: origin.trim(),
        destination: destination.trim(),
        cargo_type: cargoType,
        description: description.trim() || null,
        weight_kg: parseFloat(weightKg) || 1000,
        volume_cbm: volumeCbm ? parseFloat(volumeCbm) : null,
        packages_count: packagesCount ? parseInt(packagesCount, 10) : null,
        deadline_days: parseFloat(deadlineDays),
        max_budget: parseFloat(maxBudget),
        delay_penalty_cost: parseFloat(delayPenaltyBase),
        delay_penalty_per_day: parseFloat(delayPenaltyDaily),
        requires_reefer: requiresReefer,
        hazardous: hazardous,
        allowed_modes: allowedModes,
        recommendation_preference: recommendationPreference,
        routes: routes
      };

      setActiveShipment(shipmentPayload);

      // Step 3: Run optimization
      const optRes = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment: shipmentPayload,
          custom_weights: customWeights
        })
      });

      if (!optRes.ok) {
        throw new Error('Optimization failed on server.');
      }

      const optData = await optRes.json();
      setOptimizationResult(optData);
      if (optData.recommended_route_id) {
        setExpandedRouteId(optData.recommended_route_id);
      }

      // Automatically add to recent saved shipments list
      setSavedShipments((prev) => [
        {
          id: shipmentPayload.shipment_id,
          title: shipmentPayload.title,
          origin: shipmentPayload.origin,
          destination: shipmentPayload.destination,
          cargoType: shipmentPayload.cargo_type,
          deadlineDays: shipmentPayload.deadline_days,
          maxBudget: shipmentPayload.max_budget,
          date: new Date().toISOString(),
          recommendedRouteId: optData.recommended_route_id,
          recommendedRouteName: optData.recommended_route?.route_name,
          shipmentData: shipmentPayload,
          resultData: optData
        },
        ...prev.filter((s) => s.id !== shipmentPayload.shipment_id).slice(0, 24)
      ]);

      // Navigate to results view
      setActiveTab('optimizer');
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'An error occurred during route evaluation.');
    } finally {
      setLoading(false);
    }
  };

  // Load canonical sample scenario (Mumbai -> Rotterdam)
  const loadSampleScenario = async () => {
    setOrigin('Mumbai, India');
    setDestination('Rotterdam, Netherlands');
    setCargoType('urgent');
    setDescription('High-Value Precision Electronics');
    setWeightKg(2400);
    setDeadlineDays(14.0);
    setMaxBudget(6000.0);
    setDelayPenaltyBase(2500);
    setDelayPenaltyDaily(600);
    setRequiresReefer(false);
    setHazardous(false);
    setAllowedModes(['ocean', 'air', 'rail', 'road', 'multimodal']);
    setRecommendationPreference('balanced');
    setCustomWeights({ cost: 0.15, time: 0.55, risk: 0.30 });

    // Execute directly
    setLoading(true);
    try {
      const res = await fetch('/api/shipments/SHP-001');
      if (res.ok) {
        const sampleShipment = await res.json();
        setActiveShipment(sampleShipment);
        setCandidateRoutes(sampleShipment.routes);
        const optRes = await fetch('/api/optimize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shipment: sampleShipment,
            custom_weights: { cost: 0.15, time: 0.55, risk: 0.30 }
          })
        });
        if (optRes.ok) {
          const optData = await optRes.json();
          setOptimizationResult(optData);
          setExpandedRouteId(optData.recommended_route_id);
          setActiveTab('optimizer');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Render mode icon helper
  const renderModeIcon = (mode, size = 'w-3.5 h-3.5') => {
    switch (mode?.toLowerCase()) {
      case 'air':
        return <Plane className={size} />;
      case 'rail':
        return <Train className={size} />;
      case 'road':
        return <Truck className={size} />;
      default:
        return <Ship className={size} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f9] text-[#09090b] flex flex-col font-sans selection:bg-[#09090b] selection:text-white">
      {/* ========================================================= */}
      {/* TOP APPLICATION MASTHEAD (HIGH-END INDUSTRIAL DESIGN)    */}
      {/* ========================================================= */}
      <header className="border-b border-[#e4e4e7] bg-[#ffffff] sticky top-0 z-50 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand Identity / System Telemetry */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-md bg-[#09090b] text-[#ffffff] flex items-center justify-center font-mono font-bold text-xs tracking-wider shadow-sm">
              SA
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight uppercase text-[#09090b]">
                  Shipment Analysis
                </span>
                <span className="text-[#a1a1aa] font-mono text-xs">/</span>
                <span className="font-mono text-[11px] font-semibold tracking-wider text-[#52525b] uppercase">
                  Route Optimizer
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#09090b] animate-pulse"></span>
                <span className="font-mono text-[10px] text-[#71717a] tracking-widest uppercase">
                  ENGINE ONLINE // 2,500 MC SIMS // 8-STAGE PARETO
                </span>
              </div>
            </div>
          </div>

          {/* Nav Segmented Control */}
          <nav className="flex items-center bg-[#f4f4f5] p-1 rounded-lg border border-[#e4e4e7] text-xs font-medium">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-md transition-all font-mono text-[11px] tracking-wide ${
                activeTab === 'dashboard'
                  ? 'bg-[#ffffff] text-[#09090b] shadow-sm font-semibold border border-[#e4e4e7]'
                  : 'text-[#71717a] hover:text-[#09090b]'
              }`}
            >
              DASHBOARD
            </button>
            <button
              onClick={() => setActiveTab('new-shipment')}
              className={`px-3 py-1.5 rounded-md transition-all font-mono text-[11px] tracking-wide ${
                activeTab === 'new-shipment'
                  ? 'bg-[#ffffff] text-[#09090b] shadow-sm font-semibold border border-[#e4e4e7]'
                  : 'text-[#71717a] hover:text-[#09090b]'
              }`}
            >
              NEW SHIPMENT
            </button>
            <button
              onClick={() => setActiveTab('optimizer')}
              disabled={!optimizationResult}
              className={`px-3 py-1.5 rounded-md transition-all font-mono text-[11px] tracking-wide flex items-center gap-1.5 ${
                activeTab === 'optimizer'
                  ? 'bg-[#ffffff] text-[#09090b] shadow-sm font-semibold border border-[#e4e4e7]'
                  : optimizationResult
                  ? 'text-[#71717a] hover:text-[#09090b]'
                  : 'text-[#a1a1aa] cursor-not-allowed opacity-40'
              }`}
            >
              RESULTS
              {optimizationResult && <span className="w-1.5 h-1.5 rounded-full bg-[#09090b]"></span>}
            </button>
            <button
              onClick={() => setActiveTab('shipments')}
              className={`px-3 py-1.5 rounded-md transition-all font-mono text-[11px] tracking-wide flex items-center gap-1.5 ${
                activeTab === 'shipments'
                  ? 'bg-[#ffffff] text-[#09090b] shadow-sm font-semibold border border-[#e4e4e7]'
                  : 'text-[#71717a] hover:text-[#09090b]'
              }`}
            >
              LEDGER
              {savedShipments.length > 0 && (
                <span className="text-[10px] bg-[#e4e4e7] px-1.5 py-0.2 rounded font-mono text-[#09090b] font-bold">
                  {savedShipments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-md transition-all font-mono text-[11px] tracking-wide ${
                activeTab === 'analytics'
                  ? 'bg-[#ffffff] text-[#09090b] shadow-sm font-semibold border border-[#e4e4e7]'
                  : 'text-[#71717a] hover:text-[#09090b]'
              }`}
            >
              BENCHMARK
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-md transition-all font-mono text-[11px] tracking-wide ${
                activeTab === 'settings'
                  ? 'bg-[#ffffff] text-[#09090b] shadow-sm font-semibold border border-[#e4e4e7]'
                  : 'text-[#71717a] hover:text-[#09090b]'
              }`}
            >
              CONFIG
            </button>
          </nav>

          {/* Quick Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('new-shipment')}
              className="text-[11px] font-mono tracking-wider bg-[#09090b] hover:bg-[#27272a] text-[#ffffff] font-semibold px-4 py-2 rounded-md transition-all flex items-center gap-2 shadow-sm active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>INITIALIZE PLAN</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8">
        
        {/* ========================================================= */}
        {/* TAB 1: OPERATIONS CONSOLE (DASHBOARD)                     */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Architectural Header */}
            <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="font-mono text-[10px] tracking-widest uppercase text-[#71717a]">
                  // 01 ARCHITECTURE CONSOLE • DISPATCH OVERVIEW
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#09090b]">
                  Dispatch & Route Operations
                </h1>
                <p className="text-xs text-[#52525b] leading-relaxed">
                  Evaluates global multimodal candidate routes across cost, transit cycle, and stochastic disruption risk using multi-attribute utility theory and 2,500-run Monte Carlo simulations.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={loadSampleScenario}
                  className="px-4 py-2.5 text-xs font-mono border border-[#e4e4e7] hover:border-[#09090b] bg-[#ffffff] hover:bg-[#f4f4f5] text-[#09090b] rounded-lg font-medium transition flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>SAMPLE: MUMBAI → ROTTERDAM</span>
                </button>
                <button
                  onClick={() => setActiveTab('new-shipment')}
                  className="px-5 py-2.5 text-xs font-mono font-bold bg-[#09090b] hover:bg-[#27272a] text-[#ffffff] rounded-lg transition flex items-center gap-2 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>NEW SHIPMENT PLAN</span>
                </button>
              </div>
            </div>

            {/* Key Metrics Summary: Industrial High-Density Layout */}
            {(() => {
              const count = savedShipments.length;
              const hasData = count > 0;

              // Calculate average on-time rate from evaluated shipments
              const avgOnTime = hasData
                ? (
                    (savedShipments.reduce((sum, item) => {
                      const p = item.resultData?.recommended_route?.p_ontime;
                      return sum + (typeof p === 'number' ? p : 0);
                    }, 0) / count) * 100
                  ).toFixed(1) + '%'
                : '—';

              // Calculate average transit duration from evaluated shipments
              const avgDuration = hasData
                ? (
                    savedShipments.reduce((sum, item) => {
                      const d =
                        item.resultData?.recommended_route?.aggregated?.total_time_days ??
                        item.resultData?.recommended_route?.mean_simulated_time ??
                        item.deadlineDays ??
                        0;
                      return sum + d;
                    }, 0) / count
                  ).toFixed(1) + 'd'
                : '—';

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-[#ffffff] border border-[#e4e4e7] p-5 rounded-xl shadow-sm relative overflow-hidden group hover:border-[#09090b] transition-all">
                    <div className="flex items-center justify-between text-[#71717a] text-[10px] font-mono tracking-widest uppercase mb-3">
                      <span>[01 / PORTFOLIO]</span>
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-[#09090b] font-mono tabular-nums tracking-tight">
                      {count}
                    </div>
                    <div className="text-[11px] text-[#71717a] font-mono mt-2">
                      {hasData ? `${count} active corridor${count > 1 ? 's' : ''} modeled` : 'Awaiting shipment runs'}
                    </div>
                  </div>

                  <div className="bg-[#ffffff] border border-[#e4e4e7] p-5 rounded-xl shadow-sm relative overflow-hidden group hover:border-[#09090b] transition-all">
                    <div className="flex items-center justify-between text-[#71717a] text-[10px] font-mono tracking-widest uppercase mb-3">
                      <span>[02 / STOCHASTIC]</span>
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-[#09090b] font-mono tabular-nums tracking-tight">
                      {avgOnTime}
                    </div>
                    <div className="text-[11px] text-[#71717a] font-mono mt-2">
                      {hasData ? 'Mean Monte Carlo reliability' : 'No simulations executed'}
                    </div>
                  </div>

                  <div className="bg-[#ffffff] border border-[#e4e4e7] p-5 rounded-xl shadow-sm relative overflow-hidden group hover:border-[#09090b] transition-all">
                    <div className="flex items-center justify-between text-[#71717a] text-[10px] font-mono tracking-widest uppercase mb-3">
                      <span>[03 / TRANSIT]</span>
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold text-[#09090b] font-mono tabular-nums tracking-tight">
                      {avgDuration}
                    </div>
                    <div className="text-[11px] text-[#71717a] font-mono mt-2">
                      {hasData ? 'Mean multimodal cycle time' : 'No cycle duration logged'}
                    </div>
                  </div>

                  <div className="bg-[#ffffff] border border-[#e4e4e7] p-5 rounded-xl shadow-sm relative overflow-hidden group hover:border-[#09090b] transition-all">
                    <div className="flex items-center justify-between text-[#71717a] text-[10px] font-mono tracking-widest uppercase mb-3">
                      <span>[04 / DECISION]</span>
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-base font-bold text-[#09090b] font-mono mt-1">
                      8-Stage Pipeline
                    </div>
                    <div className="text-[11px] text-[#71717a] font-mono mt-2">
                      Pareto Filter & Monte Carlo
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Recent Evaluations Table: Precision Data Ledger */}
            <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-[#e4e4e7] flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#09090b] uppercase tracking-wide font-mono">
                    Recent Corridor Optimizations
                  </h3>
                  <p className="text-xs text-[#71717a] mt-0.5">
                    Surviving candidates ranked by multi-attribute utility and risk tolerance.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('shipments')}
                  className="text-xs font-mono text-[#09090b] hover:underline flex items-center gap-1 font-semibold"
                >
                  VIEW FULL LEDGER <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {savedShipments.length === 0 ? (
                <div className="text-center py-16 text-[#71717a] text-xs space-y-3">
                  <Package className="w-8 h-8 mx-auto text-[#d4d4d8]" />
                  <div className="font-mono text-[#09090b] font-bold">NO ACTIVE CORRIDORS RECORDED</div>
                  <p className="max-w-sm mx-auto text-[11px] text-[#71717a]">
                    Create a new shipment plan or load the Mumbai → Rotterdam scenario to see live optimization results.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f8f8f9] border-b border-[#e4e4e7] text-[#71717a] font-mono text-[10px] tracking-wider uppercase">
                        <th className="py-3 px-4">REF_ID</th>
                        <th className="py-3 px-4">CORRIDOR</th>
                        <th className="py-3 px-4">CLASS</th>
                        <th className="py-3 px-4">DEADLINE</th>
                        <th className="py-3 px-4">BUDGET</th>
                        <th className="py-3 px-4">RECOMMENDED PATH</th>
                        <th className="py-3 px-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e4e4e7] font-mono text-xs">
                      {savedShipments.slice(0, 5).map((item) => (
                        <tr key={item.id} className="hover:bg-[#f8f8f9] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#09090b]">{item.id}</td>
                          <td className="py-3.5 px-4 font-sans font-medium text-[#09090b]">
                            {item.origin.split(',')[0]} → {item.destination.split(',')[0]}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#f4f4f5] text-[#09090b] border border-[#e4e4e7]">
                              {item.cargoType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 tabular-nums text-[#52525b]">{item.deadlineDays}d</td>
                          <td className="py-3.5 px-4 tabular-nums text-[#52525b]">${item.maxBudget?.toLocaleString()}</td>
                          <td className="py-3.5 px-4 font-sans font-medium text-[#09090b] max-w-[220px] truncate">
                            {item.recommendedRouteName || item.recommendedRouteId}
                          </td>
                          <td className="py-3.5 px-4 text-right font-sans">
                            <button
                              onClick={() => {
                                setActiveShipment(item.shipmentData);
                                setOptimizationResult(item.resultData);
                                setExpandedRouteId(item.resultData.recommended_route_id);
                                setActiveTab('optimizer');
                              }}
                              className="px-3 py-1 text-xs border border-[#e4e4e7] hover:border-[#09090b] bg-[#ffffff] hover:bg-[#f4f4f5] rounded text-[#09090b] font-medium transition"
                            >
                              Inspect →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Technical Specification Banner */}
            <div className="bg-[#f4f4f5] border border-[#e4e4e7] rounded-xl p-5 text-xs text-[#52525b] flex items-start gap-4">
              <Info className="w-4 h-4 text-[#09090b] shrink-0 mt-0.5" />
              <div className="space-y-1 font-mono text-[11px]">
                <span className="font-bold text-[#09090b] uppercase tracking-wider block">
                  SPEC-2500 // STOCHASTIC CALIBRATION SPECIFICATION
                </span>
                <p className="leading-relaxed font-sans text-xs text-[#52525b]">
                  Transit durations, compounding delay probabilities, and financial risk penalties are calculated using lognormal shock distributions calibrated against real-world port congestion indices and weather variance. They provide scientific decision support for operational freight planning.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SHIPMENT DISPATCH CONSOLE (NEW SHIPMENT)          */}
        {/* ========================================================= */}
        {activeTab === 'new-shipment' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left 2 Columns: Planning Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-6 sm:p-8 shadow-sm space-y-8">
                
                {/* Form Header */}
                <div className="border-b border-[#e4e4e7] pb-5">
                  <div className="font-mono text-[10px] tracking-widest uppercase text-[#71717a]">
                    // 02 ROUTE SPECIFICATION ENGINE
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-[#09090b] mt-1">
                    Plan New Shipment
                  </h1>
                  <p className="text-xs text-[#52525b] mt-1">
                    Configure origin, destination, cargo class, allowed transportation modes, and recommendation priorities.
                  </p>
                </div>

                {errorMessage && (
                  <div className="bg-[#f4f4f5] border border-[#09090b] p-4 rounded-lg text-xs text-[#09090b] flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-[#09090b] shrink-0" />
                    <span className="font-mono font-medium">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleCreateAndOptimize} className="space-y-8">
                  
                  {/* SECTION A: ROUTE LOCATIONS */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-mono font-bold text-[#09090b] uppercase tracking-widest flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#09090b]" /> [GEO-01] CORRIDOR LOCATIONS
                      </h2>
                      <span className="text-[10px] font-mono text-[#71717a] uppercase">50+ GLOBAL HUBS</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Origin Input */}
                      <div className="relative">
                        <label className="text-xs font-mono font-semibold text-[#52525b] block mb-1.5 uppercase">
                          Origin Hub <span className="text-[#09090b]">*</span>
                        </label>
                        <input
                          type="text"
                          value={origin}
                          onChange={(e) => {
                            setOrigin(e.target.value);
                            handleLocationSearch(e.target.value, setOriginSuggestions);
                            setShowOriginMenu(true);
                          }}
                          onFocus={() => {
                            if (origin) handleLocationSearch(origin, setOriginSuggestions);
                            setShowOriginMenu(true);
                          }}
                          placeholder="e.g. Mumbai, India or Hyderabad"
                          className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded-lg px-3.5 py-2.5 text-xs text-[#09090b] font-medium"
                        />
                        {showOriginMenu && originSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#ffffff] border border-[#e4e4e7] rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-[#e4e4e7]">
                            {originSuggestions.map((loc) => (
                              <button
                                key={loc.name}
                                type="button"
                                onClick={() => {
                                  setOrigin(loc.name);
                                  setShowOriginMenu(false);
                                }}
                                className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-[#f4f4f5] flex items-center justify-between transition-colors"
                              >
                                <span className="font-semibold text-[#09090b]">{loc.name}</span>
                                <span className="text-[10px] text-[#71717a] uppercase font-mono">
                                  {loc.type} • {loc.code}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Destination Input */}
                      <div className="relative">
                        <label className="text-xs font-mono font-semibold text-[#52525b] block mb-1.5 uppercase">
                          Destination Hub <span className="text-[#09090b]">*</span>
                        </label>
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => {
                            setDestination(e.target.value);
                            handleLocationSearch(e.target.value, setDestSuggestions);
                            setShowDestMenu(true);
                          }}
                          onFocus={() => {
                            if (destination) handleLocationSearch(destination, setDestSuggestions);
                            setShowDestMenu(true);
                          }}
                          placeholder="e.g. Rotterdam, Netherlands or Singapore"
                          className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded-lg px-3.5 py-2.5 text-xs text-[#09090b] font-medium"
                        />
                        {showDestMenu && destSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#ffffff] border border-[#e4e4e7] rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-[#e4e4e7]">
                            {destSuggestions.map((loc) => (
                              <button
                                key={loc.name}
                                type="button"
                                onClick={() => {
                                  setDestination(loc.name);
                                  setShowDestMenu(false);
                                }}
                                className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-[#f4f4f5] flex items-center justify-between transition-colors"
                              >
                                <span className="font-semibold text-[#09090b]">{loc.name}</span>
                                <span className="text-[10px] text-[#71717a] uppercase font-mono">
                                  {loc.type} • {loc.code}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Popular Corridor Presets */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px]">
                      <span className="text-[#71717a] uppercase">Shortcuts:</span>
                      {[
                        { o: 'Mumbai, India', d: 'Rotterdam, Netherlands', label: 'BOM → RTM' },
                        { o: 'Hyderabad, India', d: 'Singapore', label: 'HYD → SIN' },
                        { o: 'Delhi, India', d: 'London, UK', label: 'DEL → LON' },
                        { o: 'Shanghai, China', d: 'Los Angeles, USA', label: 'SHA → LAX' }
                      ].map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => {
                            setOrigin(c.o);
                            setDestination(c.d);
                          }}
                          className="px-2.5 py-1 rounded bg-[#f4f4f5] border border-[#e4e4e7] text-[#09090b] hover:bg-[#09090b] hover:text-[#ffffff] transition-all font-semibold"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <hr className="border-[#e4e4e7]" />

                  {/* SECTION B: CARGO PROFILE & CONSTRAINTS */}
                  <div className="space-y-4">
                    <h2 className="text-xs font-mono font-bold text-[#09090b] uppercase tracking-widest flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#09090b]" /> [CRG-02] CARGO SPECIFICATION & LIMITS
                    </h2>

                    {/* Priority Selector */}
                    <div>
                      <label className="text-xs font-mono font-semibold text-[#52525b] block mb-2 uppercase">
                        Cargo Handling Priority
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {[
                          { id: 'standard', label: 'Standard', desc: 'Balanced tariff & schedule' },
                          { id: 'urgent', label: 'Urgent', desc: 'Maximum speed & minimal delay' },
                          { id: 'economy', label: 'Economy', desc: 'Lowest freight expenditure' },
                          { id: 'perishable', label: 'Perishable', desc: 'Temperature-controlled reefer' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setCargoType(item.id);
                              if (item.id === 'perishable') setRequiresReefer(true);
                            }}
                            className={`p-3.5 rounded-lg border text-left transition-all ${
                              cargoType === item.id
                                ? 'bg-[#09090b] text-[#ffffff] border-[#09090b] shadow-sm'
                                : 'bg-[#ffffff] text-[#09090b] border-[#e4e4e7] hover:border-[#09090b]'
                            }`}
                          >
                            <span className="font-mono font-bold text-xs block">{item.label}</span>
                            <span className={`text-[10px] block mt-1 leading-tight ${cargoType === item.id ? 'text-[#d4d4d8]' : 'text-[#71717a]'}`}>
                              {item.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Numeric Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-mono font-semibold text-[#52525b] block mb-1 uppercase">
                          Deadline (Days) <span className="text-[#09090b]">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          value={deadlineDays}
                          onChange={(e) => setDeadlineDays(parseFloat(e.target.value) || 1)}
                          className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded-lg px-3 py-2 text-xs text-[#09090b] font-mono font-bold tabular-nums"
                        />
                        <span className="text-[10px] font-mono text-[#71717a] mt-1 block">Hard SLA limit</span>
                      </div>

                      <div>
                        <label className="text-xs font-mono font-semibold text-[#52525b] block mb-1 uppercase">
                          Budget Limit ($) <span className="text-[#09090b]">*</span>
                        </label>
                        <input
                          type="number"
                          step="100"
                          min="500"
                          value={maxBudget}
                          onChange={(e) => setMaxBudget(parseFloat(e.target.value) || 500)}
                          className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded-lg px-3 py-2 text-xs text-[#09090b] font-mono font-bold tabular-nums"
                        />
                        <span className="text-[10px] font-mono text-[#71717a] mt-1 block">Maximum allowable tariff</span>
                      </div>

                      <div>
                        <label className="text-xs font-mono font-semibold text-[#52525b] block mb-1 uppercase">
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          step="10"
                          min="1"
                          value={weightKg}
                          onChange={(e) => setWeightKg(parseFloat(e.target.value) || 100)}
                          className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded-lg px-3 py-2 text-xs text-[#09090b] font-mono tabular-nums"
                        />
                        <span className="text-[10px] font-mono text-[#71717a] mt-1 block">Net payload mass</span>
                      </div>
                    </div>

                    {/* Optional Cargo Notes */}
                    <div>
                      <label className="text-xs font-mono font-semibold text-[#52525b] block mb-1 uppercase">
                        Description / SKU Notes <span className="text-[#a1a1aa] normal-case">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Lithium-Ion Modules, Medical Diagnostics, Fresh Produce"
                        className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded-lg px-3.5 py-2 text-xs text-[#09090b]"
                      />
                    </div>
                  </div>

                  <hr className="border-[#e4e4e7]" />

                  {/* SECTION C: TRANSPORT MODES */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-mono font-bold text-[#09090b] uppercase tracking-widest flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#09090b]" /> [MOD-03] PERMITTED FREIGHT MODES
                      </h2>
                      <span className="text-[10px] font-mono text-[#71717a] uppercase">STRICT ENFORCEMENT</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { key: 'ocean', label: 'Ocean Freight', icon: <Ship className="w-4 h-4" /> },
                        { key: 'air', label: 'Air Express', icon: <Plane className="w-4 h-4" /> },
                        { key: 'rail', label: 'Rail Transport', icon: <Train className="w-4 h-4" /> },
                        { key: 'road', label: 'Road Drayage', icon: <Truck className="w-4 h-4" /> },
                        { key: 'multimodal', label: 'Multimodal', icon: <Boxes className="w-4 h-4" /> }
                      ].map((m) => {
                        const selected = isModeSelected(m.key);
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => toggleMode(m.key)}
                            className={`p-3 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                              selected
                                ? 'bg-[#09090b] text-[#ffffff] border-[#09090b] shadow-sm'
                                : 'bg-[#ffffff] text-[#71717a] border-[#e4e4e7] hover:border-[#09090b]'
                            }`}
                          >
                            {m.icon}
                            <span className="text-xs font-mono font-semibold">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <hr className="border-[#e4e4e7]" />

                  {/* SECTION D: RECOMMENDATION GOAL PREFERENCE */}
                  <div className="space-y-4">
                    <h2 className="text-xs font-mono font-bold text-[#09090b] uppercase tracking-widest flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#09090b]" /> [OPT-04] OPTIMIZATION OBJECTIVE
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { id: 'balanced', label: 'Balanced', desc: 'Balances cost, time & risk' },
                        { id: 'lowest_cost', label: 'Lowest Cost', desc: 'Minimizes freight spend' },
                        { id: 'fastest_delivery', label: 'Fastest', desc: 'Shortest transit duration' },
                        { id: 'lowest_risk', label: 'Lowest Risk', desc: 'Minimum disruption shock' },
                        { id: 'custom', label: 'Custom', desc: 'Manual 3-factor weights' }
                      ].map((pref) => (
                        <button
                          key={pref.id}
                          type="button"
                          onClick={() => handlePreferenceChange(pref.id)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            recommendationPreference === pref.id
                              ? 'bg-[#09090b] text-[#ffffff] border-[#09090b] shadow-sm'
                              : 'bg-[#ffffff] text-[#09090b] border-[#e4e4e7] hover:border-[#09090b]'
                          }`}
                        >
                          <span className="font-mono font-bold text-xs block">{pref.label}</span>
                          <span className={`text-[10px] block mt-1 leading-tight ${recommendationPreference === pref.id ? 'text-[#d4d4d8]' : 'text-[#71717a]'}`}>
                            {pref.desc}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Custom 3-Slider Controller */}
                    {recommendationPreference === 'custom' && (
                      <div className="bg-[#f4f4f5] p-5 rounded-lg border border-[#e4e4e7] space-y-4">
                        <span className="font-mono text-xs font-bold text-[#09090b] uppercase tracking-wider block">
                          Relative Multi-Attribute Weights (Normalized to 100%)
                        </span>
                        <div className="space-y-3 text-xs">
                          <div>
                            <div className="flex justify-between font-mono text-[#09090b] mb-1">
                              <span>Cost Weight</span>
                              <span className="font-bold">{Math.round(customWeights.cost * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.05"
                              max="0.80"
                              step="0.05"
                              value={customWeights.cost}
                              onChange={(e) => {
                                const c = parseFloat(e.target.value);
                                const rem = 1.0 - c;
                                setCustomWeights({ cost: c, time: rem * 0.5, risk: rem * 0.5 });
                              }}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between font-mono text-[#09090b] mb-1">
                              <span>Speed Weight</span>
                              <span className="font-bold">{Math.round(customWeights.time * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.05"
                              max="0.80"
                              step="0.05"
                              value={customWeights.time}
                              onChange={(e) => {
                                const t = parseFloat(e.target.value);
                                const rem = 1.0 - t;
                                setCustomWeights({ time: t, cost: rem * 0.5, risk: rem * 0.5 });
                              }}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between font-mono text-[#09090b] mb-1">
                              <span>Reliability Weight</span>
                              <span className="font-bold">{Math.round(customWeights.risk * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.05"
                              max="0.80"
                              step="0.05"
                              value={customWeights.risk}
                              onChange={(e) => {
                                const r = parseFloat(e.target.value);
                                const rem = 1.0 - r;
                                setCustomWeights({ risk: r, time: rem * 0.5, cost: rem * 0.5 });
                              }}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-[#e4e4e7]" />

                  {/* SECTION E: ADVANCED CONTRACTUAL SETTINGS */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="text-xs font-mono font-bold text-[#09090b] flex items-center justify-between w-full hover:underline transition"
                    >
                      <span className="flex items-center gap-2 uppercase tracking-widest">
                        <SettingsIcon className="w-4 h-4 text-[#09090b]" /> [CST-05] CONTRACTUAL PENALTIES & COLD CHAIN
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#71717a] transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                    </button>

                    {showAdvancedSettings && (
                      <div className="mt-4 pt-4 border-t border-[#e4e4e7] space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <label
                            onClick={() => setRequiresReefer(!requiresReefer)}
                            className={`p-3 rounded-lg border cursor-pointer flex items-start gap-2.5 transition select-none ${
                              requiresReefer ? 'bg-[#09090b] text-[#ffffff] border-[#09090b]' : 'bg-[#ffffff] border-[#e4e4e7] text-[#09090b]'
                            }`}
                          >
                            <ThermometerSnowflake className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-mono font-bold block">Reefer Containerization</span>
                              <span className={`text-[10px] block mt-0.5 ${requiresReefer ? 'text-[#d4d4d8]' : 'text-[#71717a]'}`}>
                                Temperature-controlled freight. Prunes all non-reefer assets.
                              </span>
                            </div>
                          </label>

                          <label
                            onClick={() => setHazardous(!hazardous)}
                            className={`p-3 rounded-lg border cursor-pointer flex items-start gap-2.5 transition select-none ${
                              hazardous ? 'bg-[#09090b] text-[#ffffff] border-[#09090b]' : 'bg-[#ffffff] border-[#e4e4e7] text-[#09090b]'
                            }`}
                          >
                            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-mono font-bold block">Hazardous Materials</span>
                              <span className={`text-[10px] block mt-0.5 ${hazardous ? 'text-[#d4d4d8]' : 'text-[#71717a]'}`}>
                                Dangerous goods classification. Enforces maritime/air restrictions.
                              </span>
                            </div>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                          <div>
                            <label className="text-[10px] font-mono text-[#52525b] block mb-1 uppercase">
                              Volume (cbm)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={volumeCbm}
                              onChange={(e) => setVolumeCbm(e.target.value)}
                              placeholder="e.g. 18.5"
                              className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded px-3 py-1.5 text-xs text-[#09090b] font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-[#52525b] block mb-1 uppercase">
                              Base Late Penalty ($)
                            </label>
                            <input
                              type="number"
                              step="100"
                              value={delayPenaltyBase}
                              onChange={(e) => setDelayPenaltyBase(parseFloat(e.target.value) || 0)}
                              className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded px-3 py-1.5 text-xs text-[#09090b] font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-mono text-[#52525b] block mb-1 uppercase">
                              Daily Penalty ($/day)
                            </label>
                            <input
                              type="number"
                              step="50"
                              value={delayPenaltyDaily}
                              onChange={(e) => setDelayPenaltyDaily(parseFloat(e.target.value) || 0)}
                              className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded px-3 py-1.5 text-xs text-[#09090b] font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* EXECUTE ACTION BUTTON */}
                  <div className="pt-4 flex items-center justify-between border-t border-[#e4e4e7]">
                    <button
                      type="button"
                      onClick={loadSampleScenario}
                      className="text-xs font-mono text-[#71717a] hover:text-[#09090b] underline"
                    >
                      Reset to Mumbai → Rotterdam
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#09090b] hover:bg-[#27272a] text-[#ffffff] font-mono font-bold text-xs px-7 py-3.5 rounded-lg shadow-sm transition-all flex items-center gap-2.5 active:scale-98 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>SYNTHESIZING & OPTIMIZING...</span>
                        </>
                      ) : (
                        <>
                          <span>EVALUATE & OPTIMIZE CORRIDOR</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right 1 Column: Dispatch Manifest HUD */}
            <div className="space-y-6">
              
              {/* Manifest Card */}
              <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-6 shadow-sm space-y-5">
                <div className="border-b border-[#e4e4e7] pb-3 flex items-center justify-between">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-[#71717a]">
                    [MANIFEST HUD]
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#09090b]"></span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-[#71717a] block uppercase">Origin Vector</span>
                    <span className="font-bold text-[#09090b] text-sm font-sans">{origin || '—'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#71717a] block uppercase">Destination Vector</span>
                    <span className="font-bold text-[#09090b] text-sm font-sans">{destination || '—'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#e4e4e7]">
                    <div>
                      <span className="text-[10px] text-[#71717a] block uppercase">Cargo Priority</span>
                      <span className="font-bold text-[#09090b] uppercase">{cargoType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#71717a] block uppercase">Delivery Deadline</span>
                      <span className="font-bold text-[#09090b]">{deadlineDays} Days</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#e4e4e7]">
                    <div>
                      <span className="text-[10px] text-[#71717a] block uppercase">Budget Ceiling</span>
                      <span className="font-bold text-[#09090b]">${maxBudget.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#71717a] block uppercase">Allowed Modes</span>
                      <span className="font-bold text-[#09090b]">{allowedModes.length} Modalities</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#f8f8f9] border border-[#e4e4e7] p-4 rounded-lg text-[11px] text-[#52525b] space-y-2">
                  <span className="font-mono font-bold text-[#09090b] uppercase block tracking-wider">
                    Optimization Engine Protocol:
                  </span>
                  <ol className="list-decimal list-inside space-y-1 font-mono text-[10px]">
                    <li>Hard constraint filtering (deadlines & budgets)</li>
                    <li>Pareto non-dominance frontier extraction</li>
                    <li>Multi-attribute cargo utility scoring</li>
                    <li>2,500-run lognormal Monte Carlo risk modeling</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ROUTE RESULTS & ANALYSIS (THE INTELLIGENCE ENGINE) */}
        {/* ========================================================= */}
        {activeTab === 'optimizer' && optimizationResult && (
          <div className="space-y-8">
            
            {/* Top Corridor Status Bar */}
            <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#e4e4e7] pb-5">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-[#71717a]">
                    <span>{optimizationResult.shipment_id}</span>
                    <span>•</span>
                    <span className="uppercase font-bold text-[#09090b] bg-[#f4f4f5] px-2 py-0.5 rounded border border-[#e4e4e7]">
                      {optimizationResult.cargo_type} CLASS
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#09090b] mt-1 tracking-tight">
                    {optimizationResult.origin} → {optimizationResult.destination}
                  </h1>
                  <p className="text-xs font-mono text-[#71717a] mt-1">
                    DEADLINE: {optimizationResult.deadline_days}d • BUDGET CAP: ${optimizationResult.max_budget?.toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setOrigin(optimizationResult.origin);
                      setDestination(optimizationResult.destination);
                      setDeadlineDays(optimizationResult.deadline_days);
                      setMaxBudget(optimizationResult.max_budget);
                      setCargoType(optimizationResult.cargo_type);
                      setActiveTab('new-shipment');
                    }}
                    className="px-4 py-2 text-xs font-mono border border-[#e4e4e7] hover:border-[#09090b] bg-[#ffffff] hover:bg-[#f4f4f5] text-[#09090b] rounded-lg font-medium transition"
                  >
                    EDIT PARAMS
                  </button>
                  <button
                    onClick={() => {
                      if (activeShipment) {
                        recalculateWithPreference(recommendationPreference, activeShipment);
                      }
                    }}
                    className="px-4 py-2 text-xs font-mono font-bold bg-[#09090b] hover:bg-[#27272a] text-[#ffffff] rounded-lg transition flex items-center gap-2 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>RECALCULATE</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Priority Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="font-mono text-xs font-bold text-[#09090b] uppercase tracking-wider">
                  Active Optimization Target:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'balanced', label: 'Balanced' },
                    { id: 'lowest_cost', label: 'Lowest Cost' },
                    { id: 'fastest_delivery', label: 'Fastest Delivery' },
                    { id: 'lowest_risk', label: 'Lowest Risk' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePreferenceChange(p.id)}
                      className={`px-3 py-1.5 rounded-md font-mono text-xs transition-all ${
                        recommendationPreference === p.id
                          ? 'bg-[#09090b] text-[#ffffff] font-bold shadow-sm'
                          : 'bg-[#ffffff] text-[#52525b] border border-[#e4e4e7] hover:border-[#09090b]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RECOMMENDED ROUTE HERO (HIGH IMPACT EDITORIAL) */}
            {optimizationResult.recommended_route ? (
              <div className="bg-[#ffffff] border-2 border-[#09090b] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
                
                {/* Hero Header */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold px-2.5 py-1 rounded bg-[#09090b] text-[#ffffff] flex items-center gap-1.5 text-[11px] tracking-wider">
                        <Award className="w-3.5 h-3.5" /> RECOMMENDED OPTIMAL ROUTE
                      </span>
                      {optimizationResult.is_close_call && (
                        <span className="font-bold px-2.5 py-1 rounded bg-[#f4f4f5] text-[#09090b] border border-[#e4e4e7] flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" /> Close Call ({optimizationResult.close_call_margin_pct}% margin)
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#09090b] tracking-tight pt-1">
                      {optimizationResult.recommended_route.route_name}
                    </h2>
                    <p className="text-xs font-mono text-[#71717a]">
                      OPERATING CARRIER: <span className="text-[#09090b] font-bold">{optimizationResult.recommended_route.carrier}</span> • ROUTE ID: <span className="font-bold">{optimizationResult.recommended_route.route_id}</span>
                    </p>
                  </div>

                  {/* 4 Precision Gauges Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center shrink-0">
                    <div className="bg-[#f8f8f9] border border-[#e4e4e7] px-4 py-3 rounded-lg">
                      <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider block">
                        TOTAL EXPENSE
                      </span>
                      <span className="text-lg font-bold font-mono text-[#09090b] tabular-nums">
                        ${optimizationResult.recommended_route.aggregated.total_cost.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-[#f8f8f9] border border-[#e4e4e7] px-4 py-3 rounded-lg">
                      <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider block">
                        SCHEDULED TIME
                      </span>
                      <span className="text-lg font-bold font-mono text-[#09090b] tabular-nums">
                        {optimizationResult.recommended_route.aggregated.total_base_time}d
                      </span>
                    </div>

                    <div className="bg-[#f8f8f9] border border-[#e4e4e7] px-4 py-3 rounded-lg">
                      <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider block">
                        ON-TIME PROB
                      </span>
                      <span className="text-lg font-bold font-mono text-[#09090b] tabular-nums">
                        {optimizationResult.recommended_route.p_ontime}%
                      </span>
                    </div>

                    <div className="bg-[#f8f8f9] border border-[#e4e4e7] px-4 py-3 rounded-lg">
                      <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider block">
                        P90 TRANSIT
                      </span>
                      <span className="text-lg font-bold font-mono text-[#09090b] tabular-nums">
                        {optimizationResult.recommended_route.p90_time}d
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operator Decision Summary */}
                <div className="bg-[#f8f8f9] p-5 rounded-lg border border-[#e4e4e7] text-xs space-y-2.5">
                  <div className="font-semibold text-[#09090b] leading-relaxed text-sm">
                    “{optimizationResult.executive_summary}”
                  </div>
                  <div className="text-[#52525b] text-[11px] font-mono leading-relaxed border-t border-[#e4e4e7] pt-2">
                    {optimizationResult.tradeoff_rationale}
                  </div>
                </div>

                {/* Multi-Leg Journey Schematic Progression */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between border-b border-[#e4e4e7] pb-2">
                    <h3 className="text-xs font-mono font-bold text-[#09090b] uppercase tracking-wider flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" /> MULTIMODAL JOURNEY SCHEMATIC
                    </h3>
                    <span className="text-[10px] font-mono text-[#71717a] uppercase">
                      {optimizationResult.recommended_route.aggregated.legs.length} SEGMENTS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {optimizationResult.recommended_route.aggregated.legs.map((leg, idx) => (
                      <div
                        key={leg.leg_id}
                        className="bg-[#ffffff] border border-[#e4e4e7] hover:border-[#09090b] rounded-lg p-4 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded bg-[#09090b] text-[#ffffff] flex items-center justify-center text-[10px] font-mono font-bold">
                            0{idx + 1}
                          </span>
                          <span className="p-1.5 rounded bg-[#f4f4f5] text-[#09090b]">
                            {renderModeIcon(leg.mode)}
                          </span>
                          <div>
                            <div className="font-bold text-[#09090b]">
                              {leg.origin} <span className="text-[#a1a1aa] mx-1">→</span> {leg.destination}
                            </div>
                            <div className="text-[10px] font-mono text-[#71717a] mt-0.5">
                              Carrier: {leg.carrier}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-5 text-[#52525b] font-mono text-[11px]">
                          <div>
                            <span className="text-[9px] text-[#a1a1aa] block uppercase">Mode</span>
                            <span className="font-bold text-[#09090b]">{leg.mode.toUpperCase()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#a1a1aa] block uppercase">Tariff</span>
                            <span className="font-bold text-[#09090b]">${leg.base_cost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#a1a1aa] block uppercase">Transit</span>
                            <span className="font-bold text-[#09090b]">{leg.base_transit_days}d {leg.hub_dwell_days > 0 ? `(+${leg.hub_dwell_days}d dwell)` : ''}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#a1a1aa] block uppercase">Delay Risk</span>
                            <span className="font-bold text-[#09090b]">{Math.round(leg.delay_probability * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-12 text-center text-xs space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-[#09090b]" />
                <h3 className="font-bold text-sm text-[#09090b] font-mono">NO FEASIBLE ROUTES FOUND</h3>
                <p className="text-[#71717a] max-w-md mx-auto text-[11px]">
                  All generated candidates breached hard operational constraints (such as deadline or authorized budget). Extend the delivery deadline or expand the budget.
                </p>
              </div>
            )}

            {/* ALTERNATIVE ROUTES COMPARISON & LOSS BREAKDOWN */}
            <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-6 shadow-sm space-y-4">
              <div className="border-b border-[#e4e4e7] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#09090b] uppercase font-mono tracking-wide">
                    Alternative Candidate Routes & Evaluations
                  </h3>
                  <p className="text-xs text-[#71717a] mt-0.5">
                    Understand why each competing route was ranked lower or eliminated by constraints.
                  </p>
                </div>
                <span className="font-mono text-[10px] text-[#71717a] uppercase">
                  {optimizationResult.all_evaluations?.length} TOTAL EVALUATIONS
                </span>
              </div>

              <div className="space-y-3">
                {optimizationResult.all_evaluations?.map((item) => {
                  const isWinner = item.route_id === optimizationResult.recommended_route_id;
                  const isExpanded = expandedRouteId === item.route_id;

                  return (
                    <div
                      key={item.route_id}
                      className={`border rounded-lg transition-all ${
                        isWinner
                          ? 'border-[#09090b] bg-[#f8f8f9]'
                          : item.eliminated
                          ? 'border-[#e4e4e7] bg-[#ffffff] opacity-70'
                          : 'border-[#e4e4e7] bg-[#ffffff] hover:border-[#09090b]'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedRouteId(isExpanded ? null : item.route_id)}
                        className="p-4 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#09090b] font-mono">{item.route_id}: {item.route_name}</span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                                isWinner
                                  ? 'bg-[#09090b] text-[#ffffff]'
                                  : item.eliminated
                                  ? 'bg-[#f4f4f5] text-[#71717a] border border-[#e4e4e7]'
                                  : 'bg-[#f4f4f5] text-[#09090b] border border-[#e4e4e7]'
                              }`}
                            >
                              {isWinner ? 'RANK #1' : item.elimination_stage ? `Eliminated (${item.elimination_stage})` : `Rank #${item.rank}`}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[#71717a] mt-1 block">
                            Carrier: {item.carrier}
                          </span>
                        </div>

                        <div className="flex items-center gap-5 text-xs font-mono">
                          <div className="text-right">
                            <span className="text-[#a1a1aa] text-[9px] uppercase block">Cost</span>
                            <span className="font-bold text-[#09090b] tabular-nums">${item.aggregated.total_cost.toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#a1a1aa] text-[9px] uppercase block">Time</span>
                            <span className="font-bold text-[#09090b] tabular-nums">{item.aggregated.total_base_time}d</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#a1a1aa] text-[9px] uppercase block">Delay Risk</span>
                            <span className="font-bold text-[#09090b] tabular-nums">{Math.round(item.aggregated.delay_probability * 100)}%</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#a1a1aa] text-[9px] uppercase block">On-Time</span>
                            <span className="font-bold text-[#09090b] tabular-nums">{item.p_ontime}%</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-[#71717a] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Expandable Details: Loss Reasons & Leg Breakdown */}
                      {isExpanded && (
                        <div className="border-t border-[#e4e4e7] p-5 bg-[#ffffff] rounded-b-lg space-y-4 text-xs">
                          {/* Reason why it lost / why eliminated */}
                          <div className="p-3.5 bg-[#f8f8f9] rounded-lg border border-[#e4e4e7]">
                            <span className="font-mono font-bold text-[#09090b] text-[10px] uppercase tracking-wider block mb-1">
                              Status Rationale & Evaluation Note:
                            </span>
                            {item.eliminated ? (
                              <p className="text-[#52525b] font-mono text-[11px] leading-relaxed">
                                {item.elimination_reason}
                              </p>
                            ) : isWinner ? (
                              <p className="text-[#52525b] font-mono text-[11px] leading-relaxed">
                                Ranked #1 with highest composite utility score ({item.utility_score}/100) and {item.decision_stability}% decision stability under sensitivity analysis.
                              </p>
                            ) : (
                              <p className="text-[#52525b] font-mono text-[11px] leading-relaxed">
                                Survived constraints and Pareto filtering with utility score {item.utility_score}/100, but ranked lower due to higher expected delay penalties or less favorable trade-off balance against your chosen priority.
                              </p>
                            )}
                          </div>

                          {/* Individual Legs */}
                          <div>
                            <span className="font-mono font-bold text-[#09090b] block mb-2 text-[10px] uppercase tracking-wider">
                              Leg Structure:
                            </span>
                            <div className="space-y-1.5">
                              {item.aggregated.legs.map((leg, lIdx) => (
                                <div
                                  key={leg.leg_id}
                                  className="p-3 rounded-lg border border-[#e4e4e7] bg-[#f8f8f9] flex items-center justify-between text-[11px]"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-[#71717a] font-mono font-bold text-[10px]">L0{lIdx + 1}</span>
                                    {renderModeIcon(leg.mode, 'w-3 h-3 text-[#09090b]')}
                                    <span className="font-semibold text-[#09090b]">{leg.origin} → {leg.destination}</span>
                                  </div>
                                  <div className="font-mono text-[#52525b] text-[10px]">
                                    ${leg.base_cost} • {leg.base_transit_days}d {leg.hub_dwell_days > 0 ? `(+${leg.hub_dwell_days}d dwell)` : ''} • P(delay): {Math.round(leg.delay_probability * 100)}%
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SAVED SHIPMENTS LEDGER                            */}
        {/* ========================================================= */}
        {activeTab === 'shipments' && (
          <div className="space-y-6">
            <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-6 sm:p-8 shadow-sm flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-widest uppercase text-[#71717a]">
                  // 03 DISPATCH ARCHIVE
                </div>
                <h1 className="text-2xl font-extrabold text-[#09090b] tracking-tight mt-1">
                  Shipment Plans Ledger
                </h1>
                <p className="text-xs text-[#52525b] mt-1">
                  Manage previously evaluated corridors, inspect recommendations, or recalculate with updated constraints.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('new-shipment')}
                className="px-4 py-2.5 text-xs font-mono font-bold bg-[#09090b] hover:bg-[#27272a] text-[#ffffff] rounded-lg transition flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>PLAN SHIPMENT</span>
              </button>
            </div>

            {savedShipments.length === 0 ? (
              <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-16 text-center text-xs space-y-3">
                <Bookmark className="w-8 h-8 mx-auto text-[#d4d4d8]" />
                <h3 className="font-bold text-sm text-[#09090b] font-mono">NO RECORDED SHIPMENTS IN LEDGER</h3>
                <p className="text-[#71717a] max-w-sm mx-auto text-[11px]">
                  When you evaluate new shipment corridors, they will automatically be preserved here for comparative analysis.
                </p>
                <button
                  onClick={() => setActiveTab('new-shipment')}
                  className="mt-3 px-4 py-2 text-xs font-mono font-bold bg-[#09090b] text-[#ffffff] rounded-lg inline-block"
                >
                  INITIALIZE FIRST PLAN
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedShipments.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#09090b] transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-[#71717a] font-bold">{item.id}</span>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#f4f4f5] text-[#09090b] border border-[#e4e4e7]">
                          {item.cargoType}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-[#09090b]">{item.title}</h3>
                      <div className="text-xs text-[#52525b] mt-2 flex items-center gap-1 font-medium">
                        <span>{item.origin.split(',')[0]}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#a1a1aa]" />
                        <span>{item.destination.split(',')[0]}</span>
                      </div>
                      <div className="text-[11px] text-[#71717a] font-mono mt-1.5">
                        Deadline: {item.deadlineDays}d • Budget: ${item.maxBudget?.toLocaleString()}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#e4e4e7] flex items-center justify-between text-xs font-mono">
                      <span className="text-[10px] text-[#71717a] truncate max-w-[130px]">
                        Rec: {item.recommendedRouteId}
                      </span>
                      <div className="flex items-center gap-1.5 font-sans">
                        <button
                          onClick={() => {
                            setSavedShipments((prev) => prev.filter((s) => s.id !== item.id));
                          }}
                          className="p-1.5 text-[#a1a1aa] hover:text-[#09090b] rounded transition"
                          title="Delete from history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveShipment(item.shipmentData);
                            setOptimizationResult(item.resultData);
                            setExpandedRouteId(item.resultData.recommended_route_id);
                            setActiveTab('optimizer');
                          }}
                          className="px-3 py-1.5 bg-[#09090b] hover:bg-[#27272a] text-[#ffffff] rounded text-xs font-semibold"
                        >
                          View Results →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: EMPIRICAL BENCHMARK EVALUATION                     */}
        {/* ========================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="border-b border-[#e4e4e7] pb-4">
                <div className="font-mono text-[10px] tracking-widest uppercase text-[#71717a]">
                  // 04 EMPIRICAL BENCHMARK SUITE
                </div>
                <h1 className="text-2xl font-extrabold text-[#09090b] tracking-tight mt-1">
                  Offline Benchmark Evaluation
                </h1>
                <p className="text-xs text-[#52525b] mt-1">
                  Empirical performance analysis comparing the Intelligent Multi-Objective Engine against 3 standard heuristics across 30 global corridors (1,000 Monte Carlo runs per corridor).
                </p>
              </div>

              {evaluationData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  {evaluationData.summary?.map((m) => {
                    const isOptimal = m.Method.includes('Aiqon') || m.Method.includes('Proposed') || m.Method.includes('Optimal');
                    const displayName = m.Method.replace('Aiqon (Proposed)', 'Optimized Engine');
                    return (
                      <div
                        key={m.Method}
                        className={`p-5 rounded-xl border transition-all ${
                          isOptimal ? 'border-2 border-[#09090b] bg-[#f8f8f9] shadow-sm' : 'border border-[#e4e4e7] bg-[#ffffff]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-mono font-bold text-[#09090b]">{displayName}</span>
                          {isOptimal && (
                            <span className="text-[9px] bg-[#09090b] text-[#ffffff] px-2 py-0.5 rounded font-bold font-mono tracking-wider">
                              OPTIMAL
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-[#71717a]">Realized Cost:</span>
                            <span className="font-bold text-[#09090b] tabular-nums">${m['Avg Realized Cost ($)']}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#71717a]">Delay Penalty:</span>
                            <span className="text-[#52525b] tabular-nums">${m['Avg Delay Penalty Incurred ($)']}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#71717a]">On-Time Rate:</span>
                            <span className="font-bold text-[#09090b] tabular-nums">{m['On-Time Delivery Rate (%)']}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#71717a]">P95 Time:</span>
                            <span className="text-[#52525b] tabular-nums">{m['Avg P95 Transit Time (days)']}d</span>
                          </div>
                          <div className="flex justify-between border-t border-[#e4e4e7] pt-2 text-[10px]">
                            <span className="text-[#71717a]">Violations:</span>
                            <span className="text-[#52525b]">
                              {m['Cargo Constraint Violations']} Cargo | {m['Budget Violations']} Budget
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Strategic Benchmark Takeaway Box */}
              <div className="mt-6 p-5 rounded-lg bg-[#f4f4f5] border border-[#e4e4e7] text-xs text-[#52525b] space-y-2.5">
                <span className="font-mono font-bold text-[#09090b] block uppercase tracking-wider text-[11px]">
                  Core Quantitative Takeaways (The "Cheapest Route" Trap)
                </span>
                <p className="leading-relaxed text-xs">
                  <strong>The "Cheapest Route" Trap:</strong> Choosing the lowest upfront tariff saves base freight on paper ($2,840 vs $4,432), but severe delays incur an average of <strong>$2,583 in delay penalties</strong>, collapsing on-time reliability to <strong>27.6%</strong> and driving net realized cost to $5,423.
                </p>
                <p className="leading-relaxed text-xs">
                  <strong>Optimized Engine Balance:</strong> The multi-attribute engine maintains <strong>95.96% on-time reliability</strong> with zero constraint breaches and minimizes total realized operational expenditure ($4,557).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: CONFIGURATION & SYSTEM PREFERENCES                */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-[#ffffff] border border-[#e4e4e7] rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <div className="font-mono text-[10px] tracking-widest uppercase text-[#71717a]">
                  // 05 SYSTEM CONFIGURATION
                </div>
                <h1 className="text-2xl font-extrabold text-[#09090b] tracking-tight mt-1">
                  System Preferences
                </h1>
                <p className="text-xs text-[#52525b] mt-1">
                  Configure default operational settings, currency representations, and optimization parameters.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-xs font-mono font-semibold text-[#52525b] block mb-1 uppercase">Default Currency</label>
                  <select
                    value={settings.defaultCurrency}
                    onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                    className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded-lg p-2.5 text-xs text-[#09090b] font-mono"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono font-semibold text-[#52525b] block mb-1 uppercase">Distance Metric</label>
                  <select
                    value={settings.distanceUnit}
                    onChange={(e) => setSettings({ ...settings, distanceUnit: e.target.value })}
                    className="w-full bg-[#ffffff] border border-[#e4e4e7] rounded-lg p-2.5 text-xs text-[#09090b] font-mono"
                  >
                    <option value="km">Kilometers (km)</option>
                    <option value="miles">Nautical Miles (NM)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono font-semibold text-[#52525b] block mb-1 uppercase">
                    Monte Carlo Iterations per Evaluation
                  </label>
                  <input
                    type="number"
                    value={settings.mcTrials}
                    disabled
                    className="w-full bg-[#f4f4f5] border border-[#e4e4e7] rounded-lg p-2.5 text-xs text-[#71717a] font-mono"
                  />
                  <span className="text-[10px] font-mono text-[#71717a] mt-1 block">Set to 2,500 trials in engine core for statistical confidence.</span>
                </div>
              </div>

              <div className="border-t border-[#e4e4e7] pt-5">
                <h3 className="font-mono font-bold text-xs text-[#09090b] uppercase tracking-wider mb-2">Commercial Architecture & Integrations</h3>
                <p className="text-xs text-[#52525b] leading-relaxed">
                  This platform currently uses high-fidelity synthetic disruption models calibrated against global corridors. The service layer is architected to interface seamlessly with commercial freight quotation APIs (Freightos, Flexport), carrier schedule feeds, and real-time vessel AIS telemetry.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Understated Minimalist Industrial Footer */}
      <footer className="border-t border-[#e4e4e7] bg-[#ffffff] px-6 py-4 text-center text-xs font-mono text-[#71717a]">
        SHIPMENT ANALYSIS • MULTIMODAL ROUTE OPTIMIZATION & DISPATCH PLATFORM.
      </footer>
    </div>
  );
}
