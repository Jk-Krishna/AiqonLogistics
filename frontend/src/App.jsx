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

// Deterministic ambient micro-particles for the cinematic dark background
const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  left: Math.round(((i * 3.8 + 8) % 96) * 10) / 10,
  size: i % 4 === 0 ? 2.5 : i % 2 === 0 ? 1.5 : 2,
  duration: 14 + (i % 6) * 2.5,
  delay: (i * 0.8) % 12,
  opacity: 0.2 + ((i % 5) * 0.1),
  driftX: (i % 2 === 0 ? 1 : -1) * (15 + (i % 4) * 8)
}));

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
      const stored = localStorage.getItem('routelens_saved_shipments') || localStorage.getItem('shipment_analysis_saved') || localStorage.getItem('aiqon_saved_shipments');
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
      localStorage.setItem('routelens_saved_shipments', JSON.stringify(savedShipments));
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
    <div className="min-h-screen bg-[#050508] text-[#ffffff] flex flex-col font-sans selection:bg-[#ffffff] selection:text-[#050508] relative overflow-hidden">
      
      {/* Ambient Moving Mist / Fog Textures */}
      <div className="mist-layer-1" />
      <div className="mist-layer-2" />
      <div className="mist-layer-3" />

      {/* Floating Micro-Particles Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="particle-dot"
            style={{
              left: `${p.left}%`,
              bottom: '-15px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              '--duration': `${p.duration}s`,
              '--p-opacity': p.opacity,
              '--drift-x': `${p.driftX}px`,
              animationDelay: `${p.delay}s`
            }}
          />
        ))}
      </div>

      {/* ========================================================= */}
      {/* TOP APPLICATION BAR (DARK GLASSMORPHIC & GLOWING)         */}
      {/* ========================================================= */}
      <header className="border-b border-white/10 bg-[#07070c]/80 backdrop-blur-xl sticky top-0 z-50 px-6 py-3.5 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand Identity with Subtle Glow */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center font-bold text-sm tracking-tight shadow-[0_0_15px_rgba(255,255,255,0.4)]">
              RL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white glow-subtle">
                  RouteLens
                </span>
                <span className="text-white/30 text-xs">/</span>
                <span className="text-xs font-semibold text-neutral-300">Intelligent shipment route analysis</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-pulse"></span>
                <span className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase">
                  Beyond shortest path
                </span>
                <span className="text-white/20 text-[10px]">•</span>
                <span className="text-[10px] text-neutral-400 font-mono tracking-wider uppercase">
                  2,500 MC SIMS
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links (Pill Shaped Segmented Control) */}
          <nav className="flex items-center bg-[#10101b]/80 p-1 rounded-xl border border-white/10 text-xs font-medium backdrop-blur-md">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('new-shipment')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'new-shipment'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              New Shipment
            </button>
            <button
              onClick={() => setActiveTab('optimizer')}
              disabled={!optimizationResult}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'optimizer'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] font-semibold'
                  : optimizationResult
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-neutral-600 cursor-not-allowed opacity-50'
              }`}
            >
              Route Results
              {optimizationResult && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></span>}
            </button>
            <button
              onClick={() => setActiveTab('shipments')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'shipments'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Shipments
              {savedShipments.length > 0 && (
                <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {savedShipments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Settings
            </button>
          </nav>

          {/* Quick Action Glowing Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('new-shipment')}
              className="text-xs bg-white text-black hover:bg-neutral-100 font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.35)] hover:shadow-[0_0_25px_rgba(255,255,255,0.55)] active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> New Plan
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 relative z-10">
        
        {/* ========================================================= */}
        {/* TAB 1: DASHBOARD                                          */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Header & Quick Actions */}
            <div className="floating-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 glow-box">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight glow-text">
                  Operations Overview
                </h1>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
                  Plan, evaluate and recommend optimal multimodal shipment routes based on cost, transit time, and disruption risk.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={loadSampleScenario}
                  className="px-4 py-2 text-xs border border-white/15 hover:border-white/40 bg-[#12121f]/80 hover:bg-[#1a1a2b] text-neutral-200 rounded-xl font-medium transition shadow-sm"
                >
                  Load Sample (Mumbai → Rotterdam)
                </button>
                <button
                  onClick={() => setActiveTab('new-shipment')}
                  className="px-4 py-2 text-xs bg-white text-black hover:bg-neutral-100 rounded-xl font-bold transition flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.35)] active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Plan Shipment
                </button>
              </div>
            </div>

            {/* Key Metrics Summary Cards */}
            {(() => {
              const count = savedShipments.length;
              const hasData = count > 0;

              const avgOnTime = hasData
                ? (
                    (savedShipments.reduce((sum, item) => {
                      const p = item.resultData?.recommended_route?.p_ontime;
                      return sum + (typeof p === 'number' ? p : 0);
                    }, 0) / count) * 100
                  ).toFixed(1) + '%'
                : '—';

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
                  ).toFixed(1) + ' days'
                : '—';

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="floating-card p-5 rounded-2xl relative overflow-hidden group">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      Evaluated Shipments
                    </span>
                    <span className="text-3xl font-extrabold text-white font-mono glow-subtle">
                      {count}
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-1.5">
                      {hasData ? `${count} active corridor${count > 1 ? 's' : ''}` : 'No shipments evaluated yet'}
                    </span>
                  </div>

                  <div className="floating-card p-5 rounded-2xl relative overflow-hidden group">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      Average On-Time Rate
                    </span>
                    <span className="text-3xl font-extrabold text-white font-mono glow-subtle">
                      {avgOnTime}
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-1.5">
                      {hasData ? 'Across evaluated routes' : 'No data available'}
                    </span>
                  </div>

                  <div className="floating-card p-5 rounded-2xl relative overflow-hidden group">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      Average Transit Duration
                    </span>
                    <span className="text-3xl font-extrabold text-white font-mono glow-subtle">
                      {avgDuration}
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-1.5">
                      {hasData ? 'Mean multimodal transit time' : 'No data available'}
                    </span>
                  </div>

                  <div className="floating-card p-5 rounded-2xl relative overflow-hidden group">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                      Optimization Model
                    </span>
                    <span className="text-sm font-bold text-white block mt-1.5 glow-subtle">
                      8-Stage Multi-Objective
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-1">
                      Monte Carlo & Pareto Pruning
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Recent Evaluations Table */}
            <div className="floating-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                <h3 className="font-bold text-sm text-white tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4 text-white/70" /> Recent Route Optimizations
                </h3>
                <button
                  onClick={() => setActiveTab('shipments')}
                  className="text-xs text-neutral-400 hover:text-white transition font-medium"
                >
                  View All Shipments →
                </button>
              </div>

              {savedShipments.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-xs space-y-2">
                  <Package className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
                  <p>No shipments saved yet. Create your first shipment plan or load a sample scenario.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-neutral-400 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">Shipment Ref</th>
                        <th className="py-2.5 px-3">Corridor</th>
                        <th className="py-2.5 px-3">Cargo Priority</th>
                        <th className="py-2.5 px-3">Deadline</th>
                        <th className="py-2.5 px-3">Budget</th>
                        <th className="py-2.5 px-3">Recommended Option</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {savedShipments.slice(0, 5).map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3 font-mono font-medium text-white">{item.id}</td>
                          <td className="py-3 px-3 font-medium text-neutral-200">
                            {item.origin.split(',')[0]} → {item.destination.split(',')[0]}
                          </td>
                          <td className="py-3 px-3 uppercase text-[10px] font-bold text-neutral-300">
                            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/10">
                              {item.cargoType}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-neutral-400">{item.deadlineDays}d</td>
                          <td className="py-3 px-3 font-mono text-neutral-400">${item.maxBudget?.toLocaleString()}</td>
                          <td className="py-3 px-3 font-medium text-white">{item.recommendedRouteName || item.recommendedRouteId}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setActiveShipment(item.shipmentData);
                                setOptimizationResult(item.resultData);
                                setExpandedRouteId(item.resultData.recommended_route_id);
                                setActiveTab('optimizer');
                              }}
                              className="px-2.5 py-1 text-xs border border-white/20 hover:border-white/50 bg-[#161625] rounded-lg text-white font-medium transition"
                            >
                              Open Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Synthetic Modeling Disclaimer */}
            <div className="bg-[#0c0c16]/70 border border-white/10 rounded-2xl p-4 text-xs text-neutral-400 flex items-start gap-3 backdrop-blur-md">
              <Info className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white block mb-0.5">Synthetic Operational Estimates</span>
                Transit durations, freight costs, and disruption risks are computed using stochastic calibrated simulation models for decision support and route comparison.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: NEW SHIPMENT CREATION (CENTERED, NO MANIFEST HUD)  */}
        {/* ========================================================= */}
        {activeTab === 'new-shipment' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="floating-card rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 glow-box">
              <div className="border-b border-white/10 pb-4">
                <h1 className="text-2xl font-extrabold text-white tracking-tight glow-text">
                  Plan a New Shipment
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Enter your origin, destination, and cargo constraints to evaluate multimodal route alternatives.
                </p>
              </div>

              {errorMessage && (
                <div className="bg-[#1c1218] border border-red-500/40 p-3.5 rounded-xl text-xs text-red-200 flex items-center gap-2.5 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreateAndOptimize} className="space-y-6">
                
                {/* SECTION A: ROUTE LOCATIONS */}
                <div className="space-y-3.5 border-b border-white/10 pb-6">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-white/80" /> A. Route Locations
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Origin Input with Autocomplete */}
                    <div className="relative">
                      <label className="text-xs font-semibold text-neutral-300 block mb-1">
                        Origin (City, Port, or Hub) <span className="text-white/40">*</span>
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
                        className="w-full bg-[#121220] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 font-medium transition"
                      />
                      {showOriginMenu && originSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0e0e1a] border border-white/20 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-white/10 backdrop-blur-xl">
                          {originSuggestions.map((loc) => (
                            <button
                              key={loc.name}
                              type="button"
                              onClick={() => {
                                setOrigin(loc.name);
                                setShowOriginMenu(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-white/10 flex items-center justify-between transition-colors"
                            >
                              <span className="font-medium text-white">{loc.name}</span>
                              <span className="text-[10px] text-neutral-400 uppercase font-mono">{loc.type} • {loc.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Destination Input with Autocomplete */}
                    <div className="relative">
                      <label className="text-xs font-semibold text-neutral-300 block mb-1">
                        Destination (City, Port, or Hub) <span className="text-white/40">*</span>
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
                        className="w-full bg-[#121220] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 font-medium transition"
                      />
                      {showDestMenu && destSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0e0e1a] border border-white/20 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-white/10 backdrop-blur-xl">
                          {destSuggestions.map((loc) => (
                            <button
                              key={loc.name}
                              type="button"
                              onClick={() => {
                                setDestination(loc.name);
                                setShowDestMenu(false);
                              }}
                              className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-white/10 flex items-center justify-between transition-colors"
                            >
                              <span className="font-medium text-white">{loc.name}</span>
                              <span className="text-[10px] text-neutral-400 uppercase font-mono">{loc.type} • {loc.code}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pre-fill Shortcuts */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-neutral-400">
                    <span>Popular corridors:</span>
                    {[
                      { o: 'Mumbai, India', d: 'Rotterdam, Netherlands', l: 'Mumbai → Rotterdam' },
                      { o: 'Hyderabad, India', d: 'Singapore', l: 'Hyderabad → Singapore' },
                      { o: 'Delhi, India', d: 'London, UK', l: 'Delhi → London' },
                      { o: 'Shanghai, China', d: 'Los Angeles, USA', l: 'Shanghai → Los Angeles' }
                    ].map((c) => (
                      <button
                        key={c.l}
                        type="button"
                        onClick={() => {
                          setOrigin(c.o);
                          setDestination(c.d);
                        }}
                        className="text-neutral-300 hover:text-white underline transition"
                      >
                        {c.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SECTION B: SHIPMENT INFORMATION */}
                <div className="space-y-4 border-b border-white/10 pb-6">
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-white/80" /> B. Shipment Specifications
                  </h2>

                  {/* Cargo Priority */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-2">
                      Cargo Priority Profile
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'standard', label: 'Standard', desc: 'Balanced cost and transit schedule' },
                        { id: 'urgent', label: 'Urgent', desc: 'Prioritizes maximum speed & low delay' },
                        { id: 'economy', label: 'Economy', desc: 'Minimizes freight tariff costs' },
                        { id: 'perishable', label: 'Perishable', desc: 'Requires cold chain & strict freshness' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setCargoType(item.id);
                            if (item.id === 'perishable') setRequiresReefer(true);
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-all ${
                            cargoType === item.id
                              ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.35)]'
                              : 'bg-[#121220] text-neutral-300 border-white/10 hover:border-white/30'
                          }`}
                        >
                          <span className="font-bold text-xs block">{item.label}</span>
                          <span className={`text-[10px] block mt-1 leading-tight ${cargoType === item.id ? 'text-neutral-800' : 'text-neutral-400'}`}>
                            {item.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Constraints: Deadline & Budget */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-neutral-300 block mb-1">
                        Delivery Deadline (Days) <span className="text-white/40">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={deadlineDays}
                        onChange={(e) => setDeadlineDays(parseFloat(e.target.value) || 1)}
                        className="w-full bg-[#121220] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono font-bold"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">Maximum permissible transit time</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-300 block mb-1">
                        Maximum Budget ($) <span className="text-white/40">*</span>
                      </label>
                      <input
                        type="number"
                        step="100"
                        min="500"
                        value={maxBudget}
                        onChange={(e) => setMaxBudget(parseFloat(e.target.value) || 500)}
                        className="w-full bg-[#121220] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono font-bold"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">Hard authorized expenditure limit</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-neutral-300 block mb-1">
                        Cargo Weight (kg)
                      </label>
                      <input
                        type="number"
                        step="10"
                        min="1"
                        value={weightKg}
                        onChange={(e) => setWeightKg(parseFloat(e.target.value) || 100)}
                        className="w-full bg-[#121220] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">Estimated total weight</span>
                    </div>
                  </div>

                  {/* Cargo Description (Optional) */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                      Cargo Description <span className="text-neutral-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Precision Sensors, Consumer Electronics, Fresh Fruit"
                      className="w-full bg-[#121220] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500"
                    />
                  </div>
                </div>

                {/* SECTION C: TRANSPORTATION MODE PREFERENCES */}
                <div className="space-y-3.5 border-b border-white/10 pb-6">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Truck className="w-4 h-4 text-white/80" /> C. Allowed Transportation Modes
                    </h2>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Select the transport modes eligible for this shipment. Excluded modes will not be evaluated.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { key: 'ocean', label: 'Ocean Freight', icon: <Ship className="w-4 h-4" /> },
                      { key: 'air', label: 'Air Cargo', icon: <Plane className="w-4 h-4" /> },
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
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                            selected
                              ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                              : 'bg-[#121220] text-neutral-400 border-white/10 hover:border-white/30 hover:text-white'
                          }`}
                        >
                          {m.icon}
                          <span className="text-xs font-semibold">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION D: RECOMMENDATION GOAL PREFERENCE */}
                <div className="space-y-3.5 border-b border-white/10 pb-6">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-white/80" /> D. Recommendation Preference
                    </h2>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Choose what matters most for your shipment. This controls how the optimization engine ranks surviving routes.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'balanced', label: 'Balanced', desc: 'Considers cost, speed & reliability together' },
                      { id: 'lowest_cost', label: 'Lowest Cost', desc: 'Prioritizes minimizing shipping expense' },
                      { id: 'fastest_delivery', label: 'Fastest Delivery', desc: 'Prioritizes shortest transit time' },
                      { id: 'lowest_risk', label: 'Lowest Risk', desc: 'Prioritizes reliability & low disruption' },
                      { id: 'custom', label: 'Custom Weights', desc: 'Direct slider control over criteria' }
                    ].map((pref) => (
                      <button
                        key={pref.id}
                        type="button"
                        onClick={() => handlePreferenceChange(pref.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          recommendationPreference === pref.id
                            ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'bg-[#121220] text-neutral-300 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <span className="font-bold text-xs block">{pref.label}</span>
                        <span className={`text-[10px] block mt-1 leading-tight ${recommendationPreference === pref.id ? 'text-neutral-800' : 'text-neutral-400'}`}>
                          {pref.desc}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Custom Weights Sliders */}
                  {recommendationPreference === 'custom' && (
                    <div className="bg-[#121222] p-4 rounded-xl border border-white/15 space-y-3 pt-3">
                      <span className="text-xs font-bold text-white block">Relative Criterion Importance (Normalized to 100%)</span>
                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="flex justify-between text-neutral-300 mb-1">
                            <span>Cost Importance</span>
                            <span className="font-mono font-bold text-white">{Math.round(customWeights.cost * 100)}%</span>
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
                            className="w-full accent-white"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-neutral-300 mb-1">
                            <span>Speed (Transit Time) Importance</span>
                            <span className="font-mono font-bold text-white">{Math.round(customWeights.time * 100)}%</span>
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
                            className="w-full accent-white"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-neutral-300 mb-1">
                            <span>Reliability (Low Disruption Risk) Importance</span>
                            <span className="font-mono font-bold text-white">{Math.round(customWeights.risk * 100)}%</span>
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
                            className="w-full accent-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION E: ADVANCED SETTINGS */}
                <div className="border-b border-white/10 pb-6">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    className="text-xs font-bold text-neutral-300 flex items-center justify-between w-full hover:text-white transition"
                  >
                    <span className="flex items-center gap-2">
                      <SettingsIcon className="w-4 h-4 text-neutral-400" /> Advanced Operational & Cargo Settings
                    </span>
                    <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                  </button>

                  {showAdvancedSettings && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <label
                          onClick={() => setRequiresReefer(!requiresReefer)}
                          className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition select-none ${
                            requiresReefer ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-[#121220] border-white/10 text-neutral-300'
                          }`}
                        >
                          <ThermometerSnowflake className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold block">Temperature-Controlled Transport (Reefer)</span>
                            <span className={`text-[10px] block mt-0.5 ${requiresReefer ? 'text-neutral-800' : 'text-neutral-400'}`}>
                              Required for goods that must remain cold. Eliminates non-reefer routes.
                            </span>
                          </div>
                        </label>

                        <label
                          onClick={() => setHazardous(!hazardous)}
                          className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition select-none ${
                            hazardous ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'bg-[#121220] border-white/10 text-neutral-300'
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold block">Hazardous Materials Designation</span>
                            <span className={`text-[10px] block mt-0.5 ${hazardous ? 'text-neutral-800' : 'text-neutral-400'}`}>
                              Enforces dangerous goods protocols. Prohibits standard air freight.
                            </span>
                          </div>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                        <div>
                          <label className="text-[11px] text-neutral-400 block mb-1">
                            Volume ($m^3$) <span className="text-neutral-500">(Optional)</span>
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={volumeCbm}
                            onChange={(e) => setVolumeCbm(e.target.value)}
                            placeholder="e.g. 12"
                            className="w-full bg-[#121220] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-neutral-400 block mb-1">
                            Fixed Late Arrival Penalty ($)
                          </label>
                          <input
                            type="number"
                            step="100"
                            value={delayPenaltyBase}
                            onChange={(e) => setDelayPenaltyBase(parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#121220] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-neutral-400 block mb-1">
                            Daily Lateness Penalty ($/day)
                          </label>
                          <input
                            type="number"
                            step="50"
                            value={delayPenaltyDaily}
                            onChange={(e) => setDelayPenaltyDaily(parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#121220] border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={loadSampleScenario}
                    className="text-xs text-neutral-400 hover:text-white underline font-medium transition"
                  >
                    Load Mumbai → Rotterdam Demo Scenario
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-white hover:bg-neutral-100 text-black font-bold text-xs px-7 py-3 rounded-xl shadow-[0_0_25px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(255,255,255,0.6)] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" /> Evaluating Candidate Routes...
                      </>
                    ) : (
                      <>
                        Generate & Optimize Routes <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ROUTE OPTIMIZER RESULTS EXPERIENCE                */}
        {/* ========================================================= */}
        {activeTab === 'optimizer' && optimizationResult && (
          <div className="space-y-6">
            
            {/* Top Bar: Current Shipment Header & Recalculate Controls */}
            <div className="floating-card rounded-2xl p-6 space-y-4 glow-box">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-neutral-400 font-semibold">{optimizationResult.shipment_id}</span>
                    <span className="text-white/20">•</span>
                    <span className="text-xs uppercase font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/15">
                      {optimizationResult.cargo_type} Priority
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-white mt-1 tracking-tight glow-text">
                    {optimizationResult.origin} → {optimizationResult.destination}
                  </h1>
                  <p className="text-xs text-neutral-400 mt-1">
                    Deadline: {optimizationResult.deadline_days} days • Budget Limit: ${optimizationResult.max_budget?.toLocaleString()}
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
                    className="px-3.5 py-1.5 text-xs border border-white/20 hover:border-white/50 bg-[#121220] hover:bg-[#1a1a2b] text-neutral-200 rounded-xl font-medium transition"
                  >
                    Edit Requirements
                  </button>
                  <button
                    onClick={() => {
                      if (activeShipment) {
                        recalculateWithPreference(recommendationPreference, activeShipment);
                      }
                    }}
                    className="px-4 py-1.5 text-xs bg-white text-black hover:bg-neutral-100 rounded-xl font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Recalculate
                  </button>
                </div>
              </div>

              {/* Interactive Preference Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-neutral-300 text-xs">Recommendation Priority:</span>
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
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                        recommendationPreference === p.id
                          ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] font-bold'
                          : 'bg-[#121220] text-neutral-400 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RECOMMENDED ROUTE HERO CARD */}
            {optimizationResult.recommended_route ? (
              <div className="floating-card border border-white/30 rounded-2xl p-6 sm:p-8 space-y-6 glow-box shadow-[0_0_40px_rgba(255,255,255,0.08)]">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white text-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                        <Award className="w-3.5 h-3.5" /> RECOMMENDED ROUTE
                      </span>
                      {optimizationResult.is_close_call && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Close Call ({optimizationResult.close_call_margin_pct}% margin)
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white pt-1 tracking-tight glow-text">
                      {optimizationResult.recommended_route.route_id}: {optimizationResult.recommended_route.route_name}
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Carrier: <span className="text-white font-semibold">{optimizationResult.recommended_route.carrier}</span>
                    </p>
                  </div>

                  {/* Primary Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center shrink-0">
                    <div className="bg-[#141424] border border-white/10 px-4 py-3 rounded-xl">
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Estimated Cost</span>
                      <span className="text-base font-bold font-mono text-white glow-subtle">
                        ${optimizationResult.recommended_route.aggregated.total_cost.toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-[#141424] border border-white/10 px-4 py-3 rounded-xl">
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Scheduled Time</span>
                      <span className="text-base font-bold font-mono text-white glow-subtle">
                        {optimizationResult.recommended_route.aggregated.total_base_time}d
                      </span>
                    </div>

                    <div className="bg-[#141424] border border-white/10 px-4 py-3 rounded-xl">
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">On-Time Rate</span>
                      <span className="text-base font-bold font-mono text-white glow-subtle">
                        {optimizationResult.recommended_route.p_ontime}%
                      </span>
                    </div>

                    <div className="bg-[#141424] border border-white/10 px-4 py-3 rounded-xl">
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">P90 Transit</span>
                      <span className="text-base font-bold font-mono text-white glow-subtle">
                        {optimizationResult.recommended_route.p90_time}d
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plain-English Recommendation Summary */}
                <div className="bg-[#141424]/80 p-5 rounded-xl border border-white/10 text-xs text-neutral-200 space-y-2.5">
                  <div className="font-semibold leading-relaxed text-sm text-white">
                    “{optimizationResult.executive_summary}”
                  </div>
                  <div className="text-neutral-400 text-[11px] leading-relaxed border-t border-white/10 pt-2.5">
                    {optimizationResult.tradeoff_rationale}
                  </div>
                </div>

                {/* SCHEMATIC JOURNEY PROGRESSION */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5 text-white/70" /> Journey Leg Breakdown
                  </h3>

                  <div className="space-y-2.5">
                    {optimizationResult.recommended_route.aggregated.legs.map((leg, idx) => (
                      <div
                        key={leg.leg_id}
                        className="bg-[#141424]/70 border border-white/10 hover:border-white/30 rounded-xl p-3.5 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-mono font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-neutral-300">{renderModeIcon(leg.mode)}</span>
                          <div>
                            <span className="font-semibold text-white">{leg.origin}</span>
                            <span className="text-white/40 mx-1.5">→</span>
                            <span className="font-semibold text-white">{leg.destination}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-neutral-400 font-mono text-[11px]">
                          <span className="text-neutral-300 font-semibold">{leg.mode.toUpperCase()}</span>
                          <span>${leg.base_cost.toLocaleString()}</span>
                          <span>{leg.base_transit_days}d {leg.hub_dwell_days > 0 ? `(+${leg.hub_dwell_days}d dwell)` : ''}</span>
                          <span className="text-white font-medium">P(delay): {Math.round(leg.delay_probability * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="floating-card rounded-2xl p-10 text-center text-xs space-y-3">
                <AlertCircle className="w-8 h-8 mx-auto text-neutral-400" />
                <h3 className="font-bold text-sm text-white">No Viable Route Options Found</h3>
                <p className="text-neutral-400 max-w-md mx-auto">
                  All candidate routes breached mandatory constraints (such as deadline or budget limits). Consider extending your delivery deadline or expanding the budget.
                </p>
              </div>
            )}

            {/* ALTERNATIVE ROUTES COMPARISON & LOSS BREAKDOWN */}
            <div className="floating-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h3 className="font-bold text-sm text-white">Alternative Candidate Routes & Evaluations</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Understand why each competing route was ranked lower or eliminated by constraints.
                </p>
              </div>

              <div className="space-y-3">
                {optimizationResult.all_evaluations?.map((item) => {
                  const isWinner = item.route_id === optimizationResult.recommended_route_id;
                  const isExpanded = expandedRouteId === item.route_id;

                  return (
                    <div
                      key={item.route_id}
                      className={`border rounded-xl transition ${
                        isWinner
                          ? 'border-white/30 bg-[#161628]'
                          : item.eliminated
                          ? 'border-white/5 bg-[#0e0e18]/40 opacity-70'
                          : 'border-white/10 bg-[#10101c]/80 hover:border-white/25'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedRouteId(isExpanded ? null : item.route_id)}
                        className="p-4 cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{item.route_id}: {item.route_name}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                isWinner
                                  ? 'bg-white text-black font-bold'
                                  : item.eliminated
                                  ? 'bg-white/10 text-neutral-400'
                                  : 'bg-white/15 text-white'
                              }`}
                            >
                              {isWinner ? 'Winner' : item.elimination_stage ? `Eliminated (${item.elimination_stage})` : `Rank #${item.rank}`}
                            </span>
                          </div>
                          <span className="text-[11px] text-neutral-400 mt-1 block">
                            Carrier: {item.carrier}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div className="text-right">
                            <span className="text-neutral-500 text-[10px] block">Cost</span>
                            <span className="font-semibold text-white">${item.aggregated.total_cost.toLocaleString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-neutral-500 text-[10px] block">Time</span>
                            <span className="font-semibold text-white">{item.aggregated.total_base_time}d</span>
                          </div>
                          <div className="text-right">
                            <span className="text-neutral-500 text-[10px] block">Delay Risk</span>
                            <span className="font-semibold text-white">{Math.round(item.aggregated.delay_probability * 100)}%</span>
                          </div>
                          <div className="text-right">
                            <span className="text-neutral-500 text-[10px] block">On-Time</span>
                            <span className="font-bold text-white">{item.p_ontime}%</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Expandable Details: Loss Reasons & Leg Breakdown */}
                      {isExpanded && (
                        <div className="border-t border-white/10 p-4 bg-[#0a0a14] rounded-b-xl space-y-3 text-xs">
                          <div className="p-3 bg-[#131322] rounded-lg border border-white/10">
                            <span className="font-semibold text-white block mb-1">Status Rationale:</span>
                            {item.eliminated ? (
                              <p className="text-neutral-300">
                                {item.elimination_reason}
                              </p>
                            ) : isWinner ? (
                              <p className="text-neutral-300">
                                Ranked #1 with highest composite utility score ({item.utility_score}/100) and {item.decision_stability}% decision stability under sensitivity analysis.
                              </p>
                            ) : (
                              <p className="text-neutral-300">
                                Survived constraints and Pareto filtering with utility score {item.utility_score}/100, but ranked lower due to higher expected delay penalties or less favorable trade-off balance against your chosen priority.
                              </p>
                            )}
                          </div>

                          {/* Individual Legs */}
                          <div>
                            <span className="font-semibold text-neutral-400 block mb-1.5 text-[11px] uppercase tracking-wider">
                              Leg Structure:
                            </span>
                            <div className="space-y-1.5">
                              {item.aggregated.legs.map((leg, lIdx) => (
                                <div
                                  key={leg.leg_id}
                                  className="p-2.5 rounded-lg border border-white/5 bg-[#121220] flex items-center justify-between text-[11px]"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-neutral-500 font-mono">L{lIdx + 1}</span>
                                    {renderModeIcon(leg.mode, 'w-3 h-3 text-neutral-300')}
                                    <span className="font-medium text-neutral-200">{leg.origin} → {leg.destination}</span>
                                  </div>
                                  <div className="font-mono text-neutral-400">
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
        {/* TAB 4: SAVED SHIPMENTS HISTORY                           */}
        {/* ========================================================= */}
        {activeTab === 'shipments' && (
          <div className="space-y-6">
            <div className="floating-card rounded-2xl p-6 sm:p-8 flex items-center justify-between glow-box">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight glow-text">
                  Shipment Plans History
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Manage previously evaluated shipments, inspect recommendations, or recalculate with updated constraints.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('new-shipment')}
                className="px-4 py-2 text-xs bg-white text-black hover:bg-neutral-100 rounded-xl font-bold transition flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.35)]"
              >
                <Plus className="w-3.5 h-3.5" /> Plan New Shipment
              </button>
            </div>

            {savedShipments.length === 0 ? (
              <div className="floating-card rounded-2xl p-14 text-center text-xs space-y-3">
                <Bookmark className="w-8 h-8 mx-auto text-neutral-600" />
                <h3 className="font-bold text-sm text-white">No Saved Shipments Found</h3>
                <p className="text-neutral-400 max-w-sm mx-auto">
                  When you evaluate new shipment corridors, they will automatically be recorded here for future comparison.
                </p>
                <button
                  onClick={() => setActiveTab('new-shipment')}
                  className="mt-2 px-4 py-2 text-xs bg-white text-black rounded-xl font-bold inline-block shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                >
                  Create Shipment Plan
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedShipments.map((item) => (
                  <div
                    key={item.id}
                    className="floating-card rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-white/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-neutral-400 font-semibold">{item.id}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-white border border-white/10">
                          {item.cargoType}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-white">{item.title}</h3>
                      <div className="text-xs text-neutral-300 mt-2 flex items-center gap-1">
                        <span>{item.origin.split(',')[0]}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{item.destination.split(',')[0]}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono mt-1">
                        Deadline: {item.deadlineDays}d • Budget: ${item.maxBudget?.toLocaleString()}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-neutral-400 truncate max-w-[130px]">
                        Rec: {item.recommendedRouteId}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSavedShipments((prev) => prev.filter((s) => s.id !== item.id));
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded transition"
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
                          className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 rounded-lg text-xs font-bold transition"
                        >
                          View Results
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
        {/* TAB 5: ANALYTICS & BENCHMARK SUITE                       */}
        {/* ========================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="floating-card rounded-2xl p-6 sm:p-8 space-y-5 glow-box">
              <div className="border-b border-white/10 pb-3">
                <h1 className="text-2xl font-extrabold text-white tracking-tight glow-text">
                  Offline Benchmark Evaluation
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Empirical performance analysis comparing the Intelligent Multi-Objective Engine against 3 standard baselines across 30 global corridors.
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
                        className={`p-4 rounded-xl border transition-all ${
                          isOptimal ? 'border-white/40 bg-[#161628] shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-white/10 bg-[#10101c]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">{displayName}</span>
                          {isOptimal && (
                            <span className="text-[9px] bg-white text-black px-2 py-0.5 rounded font-bold font-mono">
                              OPTIMAL
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Realized Cost:</span>
                            <span className="font-mono font-bold text-white">${m['Avg Realized Cost ($)']}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Delay Penalty:</span>
                            <span className="font-mono text-neutral-300">${m['Avg Delay Penalty Incurred ($)']}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">On-Time Rate:</span>
                            <span className="font-mono font-bold text-white">{m['On-Time Delivery Rate (%)']}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">P95 Time:</span>
                            <span className="font-mono text-neutral-300">{m['Avg P95 Transit Time (days)']}d</span>
                          </div>
                          <div className="flex justify-between border-t border-white/10 pt-1 text-[11px]">
                            <span className="text-neutral-400">Violations:</span>
                            <span className="font-mono text-neutral-300">
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
              <div className="mt-6 p-5 rounded-xl bg-[#121220] border border-white/10 text-xs text-neutral-300 space-y-2">
                <span className="font-bold text-white block uppercase tracking-wider text-[11px] glow-subtle">
                  Core Quantitative Takeaways
                </span>
                <p className="leading-relaxed">
                  <strong>The "Cheapest Route" Trap:</strong> Choosing the lowest upfront tariff saves base freight on paper ($2,840 vs $4,432), but severe delays incur an average of <strong>$2,583 in delay penalties</strong>, collapsing on-time reliability to <strong>27.6%</strong> and driving net realized cost to $5,423.
                </p>
                <p className="leading-relaxed">
                  <strong>Optimized Engine Balance:</strong> The multi-attribute engine maintains <strong>95.96% on-time reliability</strong> with zero constraint breaches and minimizes total realized operational expenditure ($4,557).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: SETTINGS & MODEL DISCLAIMER                       */}
        {/* ========================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="floating-card rounded-2xl p-6 sm:p-8 space-y-6 glow-box">
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight glow-text">
                  System Preferences
                </h1>
                <p className="text-xs text-neutral-400 mt-1">Configure default operational settings and optimization parameters.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">Default Currency</label>
                  <select
                    value={settings.defaultCurrency}
                    onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                    className="w-full bg-[#121220] border border-white/15 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">Distance Metric</label>
                  <select
                    value={settings.distanceUnit}
                    onChange={(e) => setSettings({ ...settings, distanceUnit: e.target.value })}
                    className="w-full bg-[#121220] border border-white/15 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="km">Kilometers (km)</option>
                    <option value="miles">Nautical Miles (NM)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    Monte Carlo Iterations per Evaluation
                  </label>
                  <input
                    type="number"
                    value={settings.mcTrials}
                    disabled
                    className="w-full bg-[#0a0a14] border border-white/10 rounded-xl p-2.5 text-xs text-neutral-400 font-mono"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">Set to 2,500 trials in engine core for statistical confidence.</span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-5">
                <h3 className="font-bold text-sm text-white mb-2">Commercial Architecture & Integrations</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  This platform currently uses high-fidelity synthetic disruption models calibrated against global corridors. The service layer is architected to interface seamlessly with commercial freight quotation APIs (Freightos, Flexport), carrier schedule feeds, and real-time vessel AIS telemetry.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Understated Minimalist Dark Footer */}
      <footer className="border-t border-white/10 bg-[#07070c]/90 px-6 py-4 text-center text-xs text-neutral-400 relative z-10 backdrop-blur-md">
        RouteLens • Intelligent shipment route analysis • Beyond shortest path
      </footer>
    </div>
  );
}
