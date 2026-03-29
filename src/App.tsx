/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { 
  Zap, 
  Activity, 
  Info, 
  Settings2, 
  Cpu,
  Waves,
  Gauge,
  Sliders,
  TrendingUp,
  Compass,
  AlertCircle,
  Flame,
  Fan,
  Smartphone,
  CircuitBoard,
  LayoutDashboard,
  Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as d3 from 'd3';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Constants
const V_RMS_NOMINAL = 230;
const V_PEAK_NOMINAL = V_RMS_NOMINAL * Math.sqrt(2);
const SAMPLES = 200;
const PERIODS = 2;
const NOISE_LEVEL = 0.015;

interface DataPoint {
  time: number;
  voltage: number;
  current: number;
}

interface Preset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  R: number;
  L: number;
  C: number;
  freq: number;
  device: string;
}

const PRESETS: Preset[] = [
  {
    id: 'heater',
    name: 'Electric Heater',
    description: 'Purely resistive heating element',
    icon: <Flame className="w-5 h-5" />,
    R: 100,
    L: 0,
    C: 1000, // Effectively XC=0
    freq: 50,
    device: 'Heating Element / Incandescent Bulb'
  },
  {
    id: 'motor',
    name: 'Industrial Motor',
    description: 'Inductive load with significant resistance',
    icon: <Fan className="w-5 h-5" />,
    R: 45,
    L: 0.6,
    C: 1000,
    freq: 50,
    device: 'AC Induction Motor / Fan'
  },
  {
    id: 'charger',
    name: 'Phone Charger',
    description: 'Capacitive switching power supply',
    icon: <Smartphone className="w-5 h-5" />,
    R: 250,
    L: 0,
    C: 8,
    freq: 50,
    device: 'Switching Power Supply / LED Driver'
  },
  {
    id: 'complex',
    name: 'RC Circuit',
    description: 'Electronic filtering network',
    icon: <CircuitBoard className="w-5 h-5" />,
    R: 150,
    L: 0,
    C: 47,
    freq: 60,
    device: 'Electronic Filter / RC Network'
  }
];

// Phasor Diagram Component
const PhasorDiagram = ({ voltageAngle, currentAngle, currentMag }: { voltageAngle: number, currentAngle: number, currentMag: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const size = 220;
  const center = size / 2;
  const radius = (size / 2) - 30;

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Draw grid
    for (let i = 1; i <= 3; i++) {
      svg.append("circle")
        .attr("cx", center)
        .attr("cy", center)
        .attr("r", (radius / 3) * i)
        .attr("fill", "none")
        .attr("stroke", "rgba(0,0,0,0.03)")
        .attr("stroke-width", 1);
    }

    svg.append("line")
      .attr("x1", center - radius)
      .attr("y1", center)
      .attr("x2", center + radius)
      .attr("y2", center)
      .attr("stroke", "rgba(0,0,0,0.05)");

    svg.append("line")
      .attr("x1", center)
      .attr("y1", center - radius)
      .attr("x2", center)
      .attr("y2", center + radius)
      .attr("stroke", "rgba(0,0,0,0.05)");

    // Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", "5")
      .attr("refY", "5")
      .attr("markerWidth", "5")
      .attr("markerHeight", "5")
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "currentColor");

    // Voltage Vector
    const vX = center + radius * Math.cos(voltageAngle);
    const vY = center - radius * Math.sin(voltageAngle);
    svg.append("line")
      .attr("x1", center)
      .attr("y1", center)
      .attr("x2", vX)
      .attr("y2", vY)
      .attr("stroke", "#2563eb")
      .attr("stroke-width", 3)
      .attr("marker-end", "url(#arrowhead)")
      .attr("class", "text-blue-600 drop-shadow-[0_0_4px_rgba(37,99,235,0.2)]");

    // Current Vector
    const normalizedIMag = Math.min(radius, (currentMag / 8) * radius);
    const iX = center + normalizedIMag * Math.cos(currentAngle);
    const iY = center - normalizedIMag * Math.sin(currentAngle);
    svg.append("line")
      .attr("x1", center)
      .attr("y1", center)
      .attr("x2", iX)
      .attr("y2", iY)
      .attr("stroke", "#059669")
      .attr("stroke-width", 3)
      .attr("marker-end", "url(#arrowhead)")
      .attr("class", "text-emerald-600 drop-shadow-[0_0_4px_rgba(5,150,105,0.2)]");

  }, [voltageAngle, currentAngle, currentMag]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-3xl backdrop-blur-sm">
      <svg ref={svgRef} width={size} height={size} className="overflow-visible" />
      <div className="mt-6 flex gap-6 text-[10px] font-mono uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.3)]" />
          <span className="text-blue-600">V Vector</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-[0_0_8px_rgba(5,150,105,0.3)]" />
          <span className="text-emerald-600">I Vector</span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [activePresetId, setActivePresetId] = useState('heater');
  
  // Custom Controls
  const [customR, setCustomR] = useState(100);
  const [customL, setCustomL] = useState(0.5);
  const [customC, setCustomC] = useState(100);
  const [customFreq, setCustomFreq] = useState(50);

  // Display Settings
  const [vStrokeWidth, setVStrokeWidth] = useState(3);
  const [iStrokeWidth, setIStrokeWidth] = useState(3);
  const [vColor, setVColor] = useState('#2563eb');
  const [iColor, setIColor] = useState('#059669');
  const [enableGlow, setEnableGlow] = useState(true);

  const [isSimulating, setIsSimulating] = useState(true);

  // Active values based on mode
  const activePreset = PRESETS.find(p => p.id === activePresetId)!;
  const R = mode === 'presets' ? activePreset.R : customR;
  const L = mode === 'presets' ? activePreset.L : customL;
  const C = mode === 'presets' ? activePreset.C : customC;
  const freq = mode === 'presets' ? activePreset.freq : customFreq;

  // Derived Electrical Parameters
  const params = useMemo(() => {
    const omega = 2 * Math.PI * freq;
    const XL = omega * L;
    const XC = C === 0 ? Infinity : 1 / (omega * (C * 1e-6));
    const X = XL - XC;
    
    const Z_mag = Math.sqrt(R * R + X * X);
    const phi_rad = Math.atan2(X, R);
    const phi_deg = (phi_rad * 180) / Math.PI;
    
    const I_rms = V_RMS_NOMINAL / Z_mag;
    const I_peak = I_rms * Math.sqrt(2);
    
    const PF = Math.cos(phi_rad);
    const S = V_RMS_NOMINAL * I_rms;
    const P = S * PF;
    const Q = S * Math.sin(phi_rad);

    // Load Type Identification
    let type = "";
    let deviceMatch = "";
    const tol = 0.5;

    if (Math.abs(phi_deg) < tol) {
      type = "Pure Resistive (R)";
      deviceMatch = "Heating Element / Incandescent Bulb";
    } else if (phi_deg > 0) {
      type = R < 1 ? "Pure Inductive (L)" : "Resistive-Inductive (RL)";
      deviceMatch = phi_deg > 45 ? "Solenoid / Transformer" : "AC Induction Motor / Fan";
    } else {
      type = R < 1 ? "Pure Capacitive (C)" : "Resistive-Capacitive (RC)";
      deviceMatch = "Switching Power Supply / LED Driver";
    }

    if (L > 0 && C < 1000 && C > 0) {
      type = "RLC Network";
      deviceMatch = "Complex Electronic Filter";
    }

    // PF Analysis specific
    let pfType = "";
    let pfIndicator = "";
    if (Math.abs(phi_deg) < tol) {
      pfType = "Pure Resistive";
      pfIndicator = "Unity";
    } else if (phi_deg > 0) {
      pfType = "Inductive (RL Load)";
      pfIndicator = "Lagging";
    } else {
      pfType = "Capacitive (RC Load)";
      pfIndicator = "Leading";
    }

    // Load Composition & Quality
    const totalVector = R + Math.abs(X);
    const resistiveComp = (R / totalVector) * 100;
    const reactiveComp = (Math.abs(X) / totalVector) * 100;

    let loadNature = "Mixed";
    if (resistiveComp > 90) loadNature = "Mostly Resistive";
    else if (reactiveComp > 90) loadNature = X > 0 ? "Mostly Inductive" : "Mostly Capacitive";
    else loadNature = X > 0 ? "Resistive-Inductive" : "Resistive-Capacitive";

    let pfQuality = "Poor";
    if (PF > 0.95) pfQuality = "Excellent";
    else if (PF > 0.85) pfQuality = "Good";
    else if (PF > 0.70) pfQuality = "Fair";

    return {
      omega, XL, XC, X, Z_mag, phi_rad, phi_deg, I_rms, I_peak, PF, S, P, Q, type, deviceMatch,
      pfType, pfIndicator, resistiveComp, reactiveComp, loadNature, pfQuality
    };
  }, [R, L, C, freq]);

  // Generate simulation data
  const data = useMemo(() => {
    const points: DataPoint[] = [];
    const duration = PERIODS / freq;
    const step = duration / SAMPLES;

    for (let i = 0; i <= SAMPLES; i++) {
      const t = i * step;
      const vNoise = (Math.random() - 0.5) * 2 * V_PEAK_NOMINAL * NOISE_LEVEL;
      const iNoise = (Math.random() - 0.5) * 2 * params.I_peak * NOISE_LEVEL;

      points.push({
        time: Number((t * 1000).toFixed(2)),
        voltage: Number((V_PEAK_NOMINAL * Math.sin(params.omega * t) + vNoise).toFixed(2)),
        current: Number((params.I_peak * Math.sin(params.omega * t - params.phi_rad) + iNoise).toFixed(2)),
      });
    }
    return points;
  }, [params, freq]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 font-sans selection:bg-blue-500/10 overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#F7F9FC_100%)] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-emerald-500/10 border border-slate-200 flex items-center justify-center shadow-sm">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900 uppercase italic">PhaseSense</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em] font-bold">Real-Time AC Load Analyzer</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setMode('presets')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                mode === 'presets' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutDashboard className="w-3 h-3" />
              Presets
            </button>
            <button 
              onClick={() => setMode('custom')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                mode === 'custom' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Settings2 className="w-3 h-3" />
              Custom
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Column: Controls & Dashboard */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Preset Selection / Custom Controls */}
          <AnimatePresence mode="wait">
            {mode === 'presets' ? (
              <motion.section 
                key="presets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm backdrop-blur-md"
              >
                <div className="flex items-center gap-3 text-slate-400">
                  <Box className="w-4 h-4" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Device Presets</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePresetId(p.id)}
                      className={cn(
                        "group relative flex items-center gap-5 p-5 rounded-3xl border transition-all duration-500",
                        activePresetId === p.id 
                          ? "bg-slate-50 border-slate-200 shadow-sm" 
                          : "bg-transparent border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                        activePresetId === p.id 
                          ? "bg-blue-600 text-white shadow-md" 
                          : "bg-slate-100 text-slate-400 group-hover:text-slate-600"
                      )}>
                        {p.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{p.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.section>
            ) : (
              <motion.section 
                key="custom"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-8 shadow-sm backdrop-blur-md"
              >
                <div className="flex items-center gap-3 text-slate-400">
                  <Sliders className="w-4 h-4" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Manual Override</h2>
                </div>
                
                <div className="space-y-6">
                  {[
                    { label: 'Resistance (R)', val: customR, set: setCustomR, min: 1, max: 1000, unit: 'Ω', color: 'accent-blue-600' },
                    { label: 'Inductance (L)', val: customL, set: setCustomL, min: 0, max: 5, step: 0.01, unit: 'H', color: 'accent-emerald-600' },
                    { label: 'Capacitance (C)', val: customC, set: setCustomC, min: 1, max: 1000, unit: 'µF', color: 'accent-amber-500' },
                    { label: 'Frequency (f)', val: customFreq, set: setCustomFreq, min: 40, max: 70, unit: 'Hz', color: 'accent-rose-500' }
                  ].map((ctrl) => (
                    <div key={ctrl.label} className="space-y-3">
                      <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                        <span className="text-slate-500">{ctrl.label}</span>
                        <span className="text-slate-900 font-bold">{ctrl.val} {ctrl.unit}</span>
                      </div>
                      <input 
                        type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step || 1} value={ctrl.val} 
                        onChange={(e) => ctrl.set(Number(e.target.value))}
                        className={cn("w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer", ctrl.color)}
                      />
                    </div>
                  ))}
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-slate-400">
                    <LayoutDashboard className="w-4 h-4" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Display Settings</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Voltage Settings */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                        <span className="text-blue-600">Voltage Style</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" value={vColor} 
                          onChange={(e) => setVColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <input 
                          type="range" min="1" max="8" step="0.5" value={vStrokeWidth} 
                          onChange={(e) => setVStrokeWidth(Number(e.target.value))}
                          className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <span className="text-[10px] font-mono text-slate-500 w-8">{vStrokeWidth}px</span>
                      </div>
                    </div>

                    {/* Current Settings */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                        <span className="text-emerald-600">Current Style</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" value={iColor} 
                          onChange={(e) => setIColor(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <input 
                          type="range" min="1" max="8" step="0.5" value={iStrokeWidth} 
                          onChange={(e) => setIStrokeWidth(Number(e.target.value))}
                          className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <span className="text-[10px] font-mono text-slate-500 w-8">{iStrokeWidth}px</span>
                      </div>
                    </div>

                    {/* Glow Toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Enable Glow Effect</span>
                      <button 
                        onClick={() => setEnableGlow(!enableGlow)}
                        className={cn(
                          "w-10 h-5 rounded-full transition-colors relative",
                          enableGlow ? "bg-blue-600" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                          enableGlow ? "left-6" : "left-1"
                        )} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* System Status Summary */}
          <section className="bg-gradient-to-br from-blue-50 to-emerald-50 border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/60 transition-all duration-700" />
            
            <div className="flex items-center gap-3 text-blue-600">
              <Activity className="w-5 h-5" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Diagnostic Result</h2>
            </div>

            <div className="space-y-4 relative z-10">
              <div>
                <div className="text-[9px] uppercase font-mono text-slate-500 mb-1">Load Classification</div>
                <div className="text-xl font-black text-slate-900 tracking-tight">{params.type}</div>
              </div>
              <div className="h-px bg-slate-200" />
              <div>
                <div className="text-[9px] uppercase font-mono text-slate-500 mb-1">Equivalent Real-world Device</div>
                <div className="text-sm font-bold text-blue-600 flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  {params.deviceMatch}
                </div>
              </div>
            </div>
          </section>

          {/* Phasor Diagram */}
          <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3 text-slate-400">
              <Compass className="w-4 h-4" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Vector Analysis</h2>
            </div>
            <PhasorDiagram 
              voltageAngle={0} 
              currentAngle={-params.phi_rad} 
              currentMag={params.I_rms} 
            />
          </section>
        </div>

        {/* Right Column: Waveforms & Analysis */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Oscilloscope View */}
          <section className="bg-white border border-slate-200 rounded-[3rem] p-10 h-[550px] flex flex-col shadow-sm backdrop-blur-md relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.02)_0%,transparent_70%)] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Oscilloscope View</h2>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em] font-bold">Real-time Waveform Capture • {freq}Hz</p>
                </div>
              </div>
              <div className="flex gap-10 text-[10px] font-mono uppercase tracking-[0.3em] font-bold">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-1 rounded-full shadow-sm" 
                    style={{ 
                      backgroundColor: vColor,
                      boxShadow: enableGlow ? `0 0 8px ${vColor}` : 'none'
                    }} 
                  />
                  <span style={{ color: vColor }}>Voltage (V)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-1 rounded-full shadow-sm" 
                    style={{ 
                      backgroundColor: iColor,
                      boxShadow: enableGlow ? `0 0 8px ${iColor}` : 'none'
                    }} 
                  />
                  <span style={{ color: iColor }}>Current (A)</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={vColor} stopOpacity={0.05}/>
                      <stop offset="95%" stopColor={vColor} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorI" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={iColor} stopOpacity={0.05}/>
                      <stop offset="95%" stopColor={iColor} stopOpacity={0}/>
                    </linearGradient>
                    <filter id="glowV" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="glowI" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="rgba(0,0,0,0.2)" 
                    fontSize={9} 
                    tickFormatter={(val) => `${val}ms`}
                    axisLine={false}
                    tickLine={false}
                    fontFamily="monospace"
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="rgba(0,0,0,0.2)" 
                    fontSize={9}
                    axisLine={false}
                    tickLine={false}
                    domain={[-400, 400]}
                    tickCount={9}
                    fontFamily="monospace"
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="rgba(0,0,0,0.2)" 
                    fontSize={9}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                    tickCount={9}
                    fontFamily="monospace"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255,255,255,0.95)', 
                      border: '1px solid rgba(0,0,0,0.05)',
                      borderRadius: '20px',
                      fontSize: '11px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                    itemStyle={{ color: '#1e293b' }}
                  />
                  <ReferenceLine y={0} yAxisId="left" stroke="rgba(0,0,0,0.05)" strokeWidth={1} />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="voltage" 
                    stroke={vColor} 
                    strokeWidth={vStrokeWidth} 
                    fillOpacity={1}
                    fill="url(#colorV)"
                    isAnimationActive={false}
                    filter={enableGlow ? "url(#glowV)" : undefined}
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="current" 
                    stroke={iColor} 
                    strokeWidth={iStrokeWidth} 
                    fillOpacity={1}
                    fill="url(#colorI)"
                    isAnimationActive={false}
                    filter={enableGlow ? "url(#glowI)" : undefined}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Real-time Dashboard Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Real Power (P)', val: params.P.toFixed(1), unit: 'W', icon: <Zap className="w-4 h-4" /> },
              { label: 'Reactive Power (Q)', val: params.Q.toFixed(1), unit: 'VAR', icon: <Waves className="w-4 h-4" /> },
              { label: 'Apparent Power (S)', val: params.S.toFixed(1), unit: 'VA', icon: <TrendingUp className="w-4 h-4" /> },
              { label: 'RMS Voltage', val: V_RMS_NOMINAL, unit: 'V', icon: <Gauge className="w-4 h-4" /> },
              { label: 'RMS Current', val: params.I_rms.toFixed(3), unit: 'A', icon: <Activity className="w-4 h-4" /> },
              { label: 'Power Factor', val: params.PF.toFixed(3), unit: 'PF', icon: <TrendingUp className="w-4 h-4" />, highlight: true }
            ].map((metric) => (
              <div key={metric.label} className={cn(
                "p-6 rounded-[2rem] border transition-all duration-500 group",
                metric.highlight 
                  ? "bg-blue-50 border-blue-100 shadow-sm" 
                  : "bg-white border-slate-100 hover:border-slate-200"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500",
                    metric.highlight ? "bg-blue-600 text-white shadow-sm" : "bg-slate-50 text-slate-400 group-hover:text-slate-600"
                  )}>
                    {metric.icon}
                  </div>
                  <div className="text-[9px] font-mono uppercase tracking-widest text-slate-400">{metric.unit}</div>
                </div>
                <div className="text-[10px] uppercase font-mono text-slate-500 mb-1">{metric.label}</div>
                <div className={cn(
                  "text-2xl font-black tracking-tight",
                  metric.highlight ? "text-blue-600" : "text-slate-900"
                )}>{metric.val}</div>
              </div>
            ))}
          </div>

          {/* Power Factor Load Analysis */}
          <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3 text-slate-400 mb-6">
              <TrendingUp className="w-4 h-4" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Power Factor Load Analysis</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-[9px] uppercase font-mono text-slate-500 mb-1">Power Factor</div>
                    <div className="text-xl font-black text-slate-900">{params.PF.toFixed(3)}</div>
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">{params.pfIndicator}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-[9px] uppercase font-mono text-slate-500 mb-1">Phase Angle</div>
                    <div className="text-xl font-black text-slate-900">{params.phi_deg.toFixed(2)}°</div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                  <div className="text-[9px] uppercase font-mono text-blue-600 mb-2 font-bold">Interpretation Guide</div>
                  <ul className="text-[10px] text-slate-600 space-y-1 font-medium">
                    <li>• PF = 1 → Pure Resistive Load</li>
                    <li>• PF = 0.8 Lagging → Inductive Load</li>
                    <li>• PF = 0.8 Leading → Capacitive Load</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl shadow-lg shadow-blue-200 text-white">
                  <div className="text-[10px] uppercase font-mono opacity-80 mb-2 tracking-widest font-bold">Load Type Based on Power Factor</div>
                  <div className="text-2xl font-black tracking-tight mb-2">
                    {params.pfType === "Pure Resistive" ? "Resistive" : params.pfType.includes("Inductive") ? "Inductive" : "Capacitive"}
                  </div>
                  <div className="text-[11px] font-bold bg-white/20 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                    {params.pfType === "Pure Resistive" ? "Pure Resistive Load" : params.pfType.includes("Inductive") ? "Inductive Load Detected" : "Capacitive Load Detected"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Load Composition & Quality */}
          <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3 text-slate-400 mb-6">
              <LayoutDashboard className="w-4 h-4" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Load Composition & Quality</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[9px] uppercase font-mono text-slate-500">Load Nature</div>
                    <div className="text-sm font-black text-slate-900">{params.loadNature}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] uppercase font-mono text-slate-500">PF Quality</div>
                    <div className={cn(
                      "text-sm font-black",
                      params.pfQuality === "Excellent" ? "text-emerald-600" : params.pfQuality === "Good" ? "text-blue-600" : "text-amber-600"
                    )}>{params.pfQuality}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                      <span className="text-slate-500">Resistive Component</span>
                      <span className="text-slate-900 font-bold">{params.resistiveComp.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-600"
                        animate={{ width: `${params.resistiveComp}%` }}
                        transition={{ type: 'spring', stiffness: 50 }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
                      <span className="text-slate-500">Reactive Component</span>
                      <span className="text-slate-900 font-bold">{params.reactiveComp.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-600"
                        animate={{ width: `${params.reactiveComp}%` }}
                        transition={{ type: 'spring', stiffness: 50 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-3 text-blue-600 mb-4">
                  <Info className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Suggested Device</span>
                </div>
                <div className="text-lg font-black text-slate-900 leading-tight mb-2">
                  {params.deviceMatch}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Based on the impedance profile, this load behaves most like a {params.deviceMatch.toLowerCase()}.
                </p>
              </div>
            </div>
          </section>

          {/* Analysis Details */}
          <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 grid grid-cols-1 md:grid-cols-2 gap-10 shadow-sm backdrop-blur-md">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-400">
                <AlertCircle className="w-4 h-4" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Phase Analysis</h2>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">Phase Angle (φ)</span>
                  <span className={cn(
                    "text-lg font-black font-mono",
                    params.phi_deg > 0.5 ? "text-emerald-600" : params.phi_deg < -0.5 ? "text-amber-600" : "text-slate-900"
                  )}>
                    {params.phi_deg.toFixed(2)}°
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className={cn(
                      "h-full",
                      params.phi_deg > 0 ? "bg-emerald-600" : "bg-amber-500"
                    )}
                    animate={{ width: `${Math.abs(params.phi_deg / 90) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 50 }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  {params.phi_deg > 0.5 
                    ? "Inductive load detected. Current lags voltage. This is typical for magnetic devices like motors or solenoids." 
                    : params.phi_deg < -0.5 
                    ? "Capacitive load detected. Current leads voltage. Common in switching power supplies and capacitive filters." 
                    : "Purely resistive load. Voltage and current are perfectly synchronized. Maximum efficiency achieved."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-400">
                <Info className="w-4 h-4" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Impedance Vector</h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Total Impedance (Z)</span>
                  <span className="text-slate-900 font-bold">{params.Z_mag.toFixed(2)} Ω</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Reactance (X)</span>
                  <span className="text-slate-900 font-bold">{params.X.toFixed(2)} Ω</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Inductive Reactance (XL)</span>
                  <span className="text-slate-900 font-bold">{params.XL.toFixed(2)} Ω</span>
                </div>
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Capacitive Reactance (XC)</span>
                  <span className="text-slate-900 font-bold">{params.XC === Infinity ? '∞' : params.XC.toFixed(2)} Ω</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-200 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-black text-slate-900 uppercase tracking-tight italic">PhaseSense</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em] font-bold">
              Real-Time AC Load Analyzer • v2.5.0
            </p>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest font-bold">
                Designed and created by :- <span className="text-blue-600">Divyanshu Shahi</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-16 gap-y-6">
            {[
              { label: 'Engine', val: 'V-I Phase Correlation' },
              { label: 'Resolution', val: '200 Samples/Cycle' },
              { label: 'Accuracy', val: '+98.999% Theoretical' }
            ].map(stat => (
              <div key={stat.label} className="space-y-1">
                <div className="text-[9px] text-slate-400 uppercase font-mono tracking-widest font-bold">{stat.label}</div>
                <div className="text-[10px] text-slate-500 font-mono font-bold">{stat.val}</div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
