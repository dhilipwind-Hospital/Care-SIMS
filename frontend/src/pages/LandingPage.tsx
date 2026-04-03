import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ayphenLogo from '../assets/ayphen-logo.svg';
import {
  Users, FlaskConical, Pill, Bed,
  Scissors, BarChart3, Shield, Bell, ChevronRight,
  CheckCircle, Star, ArrowRight, Menu, X,
  Activity, CreditCard, ClipboardList, Stethoscope,
  Globe, Lock, Zap, TrendingUp, Play, Monitor,
  Calendar, FileText, Heart, Thermometer,
  Send, Building2, Phone, Mail, MapPin, Clock,
  Loader2, ChevronDown, HelpCircle, ShieldCheck,
} from 'lucide-react';

/* ── Scroll Reveal Wrapper ── */
function ScrollReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── FAQ Accordion Item ── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-teal-200 transition-colors">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left gap-4">
        <span className="text-sm font-semibold text-gray-900">{q}</span>
        <ChevronDown size={18} className={`text-gray-400 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-4' : 'max-h-0'}`}>
        <p className="px-6 text-sm text-gray-500 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ── Animated Counter Hook ── */
function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(!startOnView);
  const ref = useRef<HTMLDivElement>(null);

  const start = useCallback(() => setStarted(true), []);

  useEffect(() => {
    if (!startOnView || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { start(); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [start, startOnView]);

  useEffect(() => {
    if (!started) return;
    let startTime: number;
    let animationFrame: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.floor(eased * end));
      if (progress < 1) animationFrame = requestAnimationFrame(step);
    };
    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [started, end, duration]);

  return { count, ref };
}

function AnimatedStat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const { count, ref } = useCountUp(value, 2000);
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-bold text-gray-900">{count}{suffix}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}

/* ── Mock Screen Components for Product Showcase ── */
function MockDashboard() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 h-full text-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#0F766E' }}>
          <BarChart3 size={12} className="text-white" />
        </div>
        <span className="font-bold text-gray-800 text-sm">Admin Dashboard</span>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Patients Today', val: '142', color: '#0F766E', icon: Users },
          { label: 'Appointments', val: '89', color: '#3B82F6', icon: Calendar },
          { label: 'Revenue', val: '₹2.4L', color: '#10B981', icon: TrendingUp },
          { label: 'Bed Occupancy', val: '76%', color: '#F59E0B', icon: Bed },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-lg p-2.5 border border-gray-100">
              <div className="flex items-center gap-1 mb-1">
                <Icon size={10} style={{ color: k.color }} />
                <span className="text-[10px] text-gray-400">{k.label}</span>
              </div>
              <div className="font-bold text-gray-900 text-sm">{k.val}</div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="text-[10px] font-semibold text-gray-500 mb-2">OPD vs IPD (This Week)</div>
          <div className="flex items-end gap-1 h-16">
            {[40, 65, 50, 80, 70, 55, 45].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col gap-0.5">
                <div className="rounded-sm" style={{ height: `${h}%`, background: '#0F766E' }} />
                <div className="rounded-sm" style={{ height: `${h * 0.4}%`, background: '#14B8A6' }} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <div className="text-[10px] font-semibold text-gray-500 mb-2">Department Load</div>
          {['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics'].map((d, i) => (
            <div key={d} className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] text-gray-500 w-20 truncate">{d}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className="h-full rounded-full" style={{ width: `${[78, 65, 52, 40][i]}%`, background: '#0F766E' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockQueue() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 h-full text-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-blue-500">
            <ClipboardList size={12} className="text-white" />
          </div>
          <span className="font-bold text-gray-800 text-sm">OPD Queue</span>
        </div>
        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Waiting', val: '12', bg: 'bg-amber-50', text: 'text-amber-700' },
          { label: 'In Consult', val: '4', bg: 'bg-blue-50', text: 'text-blue-700' },
          { label: 'Completed', val: '38', bg: 'bg-green-50', text: 'text-green-700' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-lg p-2 text-center`}>
            <div className={`font-bold text-lg ${s.text}`}>{s.val}</div>
            <div className="text-[10px] text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        {[
          { token: 'T-042', name: 'Rajesh Kumar', dept: 'Cardiology', status: 'IN_CONSULT', color: 'bg-blue-100 text-blue-700' },
          { token: 'T-043', name: 'Priya Sharma', dept: 'General', status: 'WAITING', color: 'bg-amber-100 text-amber-700' },
          { token: 'T-044', name: 'Arun Patel', dept: 'Ortho', status: 'WAITING', color: 'bg-amber-100 text-amber-700' },
          { token: 'T-045', name: 'Lakshmi Devi', dept: 'Pediatrics', status: 'WAITING', color: 'bg-amber-100 text-amber-700' },
          { token: 'T-041', name: 'Suresh Babu', dept: 'ENT', status: 'DONE', color: 'bg-green-100 text-green-700' },
        ].map(t => (
          <div key={t.token} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-gray-700">{t.token}</span>
              <span className="text-gray-600">{t.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">{t.dept}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.color}`}>{t.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockConsultation() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 h-full text-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-purple-500">
          <Stethoscope size={12} className="text-white" />
        </div>
        <span className="font-bold text-gray-800 text-sm">Consultation</span>
      </div>
      <div className="bg-white rounded-lg p-3 border border-gray-100 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-bold text-gray-800">Rajesh Kumar, 45M</div>
            <div className="text-[10px] text-gray-400">PID: PAT-2026-00142 · Token: T-042</div>
          </div>
          <div className="flex items-center gap-1">
            <Heart size={10} className="text-red-400" />
            <Thermometer size={10} className="text-orange-400" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[9px]">Hypertension</span>
          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px]">Diabetes</span>
        </div>
      </div>
      <div className="space-y-2">
        {['Subjective', 'Objective', 'Assessment', 'Plan'].map((s, i) => (
          <div key={s} className="bg-white rounded-lg p-2.5 border border-gray-100">
            <div className="font-bold text-[10px] text-purple-600 mb-1">{s}</div>
            <div className="text-[10px] text-gray-500 leading-relaxed">
              {[
                'Patient reports chest pain on exertion for 2 days, radiating to left arm...',
                'BP: 150/95 mmHg | Pulse: 88 bpm | SpO2: 97% | Temp: 98.4°F',
                'Unstable angina — r/o acute coronary syndrome. ECG: ST depression V4-V6.',
                'Adv: Troponin I stat, Echo, Tab Aspirin 150mg, Ref: Cardiology',
              ][i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockLab() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 h-full text-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-500">
          <FlaskConical size={12} className="text-white" />
        </div>
        <span className="font-bold text-gray-800 text-sm">Lab Results</span>
      </div>
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-4 gap-0 text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-2 border-b border-gray-100">
          <span>Test</span><span>Result</span><span>Ref Range</span><span>Flag</span>
        </div>
        {[
          { test: 'Hemoglobin', result: '14.2 g/dL', range: '13.5-17.5', flag: '' },
          { test: 'WBC Count', result: '11,800 /μL', range: '4,000-11,000', flag: 'H' },
          { test: 'Platelet', result: '2.1 L/μL', range: '1.5-4.0', flag: '' },
          { test: 'Blood Sugar (F)', result: '186 mg/dL', range: '70-110', flag: 'H' },
          { test: 'HbA1c', result: '8.2%', range: '< 5.7', flag: 'H' },
          { test: 'Creatinine', result: '1.1 mg/dL', range: '0.7-1.3', flag: '' },
          { test: 'Troponin I', result: '0.08 ng/mL', range: '< 0.04', flag: 'CRIT' },
        ].map(r => (
          <div key={r.test} className={`grid grid-cols-4 gap-0 text-[10px] px-3 py-1.5 border-b border-gray-50 ${r.flag === 'CRIT' ? 'bg-red-50' : ''}`}>
            <span className="text-gray-700 font-medium">{r.test}</span>
            <span className={`font-mono ${r.flag ? 'text-red-600 font-bold' : 'text-gray-700'}`}>{r.result}</span>
            <span className="text-gray-400">{r.range}</span>
            <span>{r.flag === 'CRIT' ? (
              <span className="px-1 py-0.5 bg-red-500 text-white rounded text-[8px] font-bold animate-pulse">CRITICAL</span>
            ) : r.flag ? (
              <span className="px-1 py-0.5 bg-amber-100 text-amber-700 rounded text-[8px] font-bold">HIGH</span>
            ) : (
              <span className="text-green-500 text-[8px]">Normal</span>
            )}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <FileText size={10} className="text-gray-400" />
        <span className="text-[10px] text-gray-400">Report generated · Dr. Anita Rao · 26 Mar 2026</span>
      </div>
    </div>
  );
}

function MockBilling() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 h-full text-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-teal-500">
          <CreditCard size={12} className="text-white" />
        </div>
        <span className="font-bold text-gray-800 text-sm">Invoice #INV-2026-0891</span>
      </div>
      <div className="bg-white rounded-lg p-3 border border-gray-100 mb-3">
        <div className="flex justify-between mb-2">
          <div>
            <div className="font-bold text-gray-800">Rajesh Kumar</div>
            <div className="text-[10px] text-gray-400">PAT-2026-00142 · Cardiology OPD</div>
          </div>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold h-fit">PENDING</span>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden mb-3">
        <div className="grid grid-cols-3 text-[10px] font-bold text-gray-500 bg-gray-50 px-3 py-2 border-b border-gray-100">
          <span>Item</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
        </div>
        {[
          { item: 'Consultation Fee', qty: '1', amount: '₹800' },
          { item: 'ECG', qty: '1', amount: '₹500' },
          { item: 'Troponin I Test', qty: '1', amount: '₹1,200' },
          { item: 'CBC Panel', qty: '1', amount: '₹600' },
          { item: 'Tab Aspirin 150mg', qty: '10', amount: '₹45' },
        ].map(r => (
          <div key={r.item} className="grid grid-cols-3 text-[10px] px-3 py-1.5 border-b border-gray-50">
            <span className="text-gray-700">{r.item}</span>
            <span className="text-right text-gray-500">{r.qty}</span>
            <span className="text-right font-medium text-gray-700">{r.amount}</span>
          </div>
        ))}
        <div className="grid grid-cols-3 text-[10px] px-3 py-2 bg-teal-50">
          <span className="col-span-2 font-bold text-gray-700 text-right">Total</span>
          <span className="text-right font-bold text-teal-700">₹3,145</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white" style={{ background: '#0F766E' }}>Collect Payment</button>
        <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 border border-gray-200 bg-white">Print</button>
      </div>
    </div>
  );
}

function ProductShowcase() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const screenComponents: Record<string, React.ReactNode> = {
    dashboard: <MockDashboard />,
    queue: <MockQueue />,
    consultation: <MockConsultation />,
    lab: <MockLab />,
    billing: <MockBilling />,
  };

  return (
    <section ref={sectionRef} className="py-24 bg-white" id="demo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-600">Product Preview</span>
          <h2 className="mt-3 text-4xl font-bold text-gray-900">See it in action</h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            A glimpse into the modules that power hospitals across India every day.
          </p>
        </div>

        {/* Screen Selector Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {demoScreens.map(screen => {
            const Icon = screen.icon;
            return (
              <button
                key={screen.id}
                onClick={() => setActiveScreen(screen.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  activeScreen === screen.id
                    ? 'text-white shadow-lg scale-105'
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
                style={activeScreen === screen.id ? { background: `linear-gradient(135deg, ${screen.color}, ${screen.color}cc)` } : {}}
              >
                <Icon size={16} />
                {screen.title}
              </button>
            );
          })}
        </div>

        {/* Mock Browser Window */}
        <div
          className={`max-w-5xl mx-auto transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-white">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-1.5 text-xs text-gray-400 border border-gray-200 w-80">
                  <Lock size={10} />
                  <span>app.ayphen.com/{activeScreen}</span>
                </div>
              </div>
              <div className="w-12" />
            </div>

            {/* App Layout Mock */}
            <div className="flex" style={{ minHeight: 420 }}>
              {/* Mini Sidebar */}
              <div className="w-14 bg-gray-900 flex-shrink-0 hidden sm:flex flex-col items-center py-4 gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                  <Play size={12} className="text-white" />
                </div>
                <div className="w-full h-px bg-gray-700 my-1" />
                {demoScreens.map(s => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveScreen(s.id)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                        activeScreen === s.id ? 'bg-gray-700' : 'hover:bg-gray-800'
                      }`}
                      title={s.title}
                    >
                      <Icon size={14} className={activeScreen === s.id ? 'text-teal-400' : 'text-gray-500'} />
                    </button>
                  );
                })}
              </div>

              {/* Main Content */}
              <div className="flex-1 p-4 bg-gray-50">
                {screenComponents[activeScreen]}
              </div>
            </div>
          </div>

          {/* Screen Description */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              {demoScreens.find(s => s.id === activeScreen)?.desc}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: Users,
    title: 'Patient Management',
    desc: 'Complete patient registry with medical history, allergies, and cross-location record access.',
    color: '#0F766E',
    bg: '#F0FDFA',
  },
  {
    icon: ClipboardList,
    title: 'OPD Queue System',
    desc: 'Real-time token management with auto-calling, priority queues, and live status updates.',
    color: '#3B82F6',
    bg: '#EFF6FF',
  },
  {
    icon: Stethoscope,
    title: 'Doctor Consultation',
    desc: 'SOAP-format e-consultation with ICD-10 coding, auto-save, and clinical decision support.',
    color: '#8B5CF6',
    bg: '#F5F3FF',
  },
  {
    icon: Pill,
    title: 'Pharmacy & Prescriptions',
    desc: 'E-prescriptions with drug interaction checks, formulary search, and dispensing workflow.',
    color: '#F59E0B',
    bg: '#FFFBEB',
  },
  {
    icon: FlaskConical,
    title: 'Laboratory Module',
    desc: 'Sample tracking, result entry, critical value alerts, and QC management with L-J charts.',
    color: '#EF4444',
    bg: '#FEF2F2',
  },
  {
    icon: Bed,
    title: 'Ward & Admissions',
    desc: 'Bed management, IPD admissions, transfers, and discharge with billing clearance.',
    color: '#10B981',
    bg: '#F0FDF4',
  },
  {
    icon: Activity,
    title: 'Triage & Vitals',
    desc: 'Emergency triage with color-coded levels, vitals recording, and critical alerts.',
    color: '#F97316',
    bg: '#FFF7ED',
  },
  {
    icon: Scissors,
    title: 'Operation Theatre',
    desc: 'OT scheduling, live monitoring, equipment sterilization tracking, and staff assignment.',
    color: '#EC4899',
    bg: '#FDF2F8',
  },
  {
    icon: CreditCard,
    title: 'Billing & Finance',
    desc: 'Itemized invoicing, insurance claims, UPI/card payments, and daily revenue reports.',
    color: '#14B8A6',
    bg: '#F0FDFA',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    desc: 'OPD/IPD metrics, financial summaries, lab TAT, pharmacy utilization, and export.',
    color: '#6366F1',
    bg: '#EEF2FF',
  },
  {
    icon: Shield,
    title: 'Audit & Compliance',
    desc: 'Immutable audit logs, patient access trails, anomaly detection, and integrity checks.',
    color: '#64748B',
    bg: '#F8FAFC',
  },
  {
    icon: Bell,
    title: 'Real-time Notifications',
    desc: 'WebSocket-powered alerts for critical labs, medication dues, OT status, and queue events.',
    color: '#0F766E',
    bg: '#F0FDFA',
  },
];

const animatedStats = [
  { value: 50, suffix: '+', label: 'Hospital Modules' },
  { value: 300, suffix: '+', label: 'API Endpoints' },
  { value: 99, suffix: '.9%', label: 'Uptime SLA' },
  { value: 12, suffix: '+', label: 'Roles Supported' },
];

const demoScreens = [
  {
    id: 'dashboard',
    title: 'Admin Dashboard',
    desc: 'Real-time KPIs, revenue trends, and department-wise analytics at a glance.',
    icon: Monitor,
    color: '#0F766E',
  },
  {
    id: 'queue',
    title: 'OPD Queue System',
    desc: 'Live token management with auto-calling, priority queues, and wait time tracking.',
    icon: ClipboardList,
    color: '#3B82F6',
  },
  {
    id: 'consultation',
    title: 'Doctor Consultation',
    desc: 'SOAP-format notes, ICD-10 coding, prescriptions, and lab orders in one view.',
    icon: Stethoscope,
    color: '#8B5CF6',
  },
  {
    id: 'lab',
    title: 'Lab Reports',
    desc: 'Sample tracking, result entry with reference ranges, and critical value alerts.',
    icon: FlaskConical,
    color: '#EF4444',
  },
  {
    id: 'billing',
    title: 'Billing & Invoices',
    desc: 'Itemized billing, insurance claims, payment tracking, and printable invoices.',
    icon: CreditCard,
    color: '#14B8A6',
  },
];

const faqs = [
  { q: 'How long does it take to set up Ayphen HMS?', a: 'Most hospitals go live within 1–2 days. You create your organization, configure departments and locations, invite staff, and start managing patients immediately. Our onboarding team provides free setup assistance for Professional and Enterprise plans.' },
  { q: 'Can I migrate data from my existing HMS?', a: 'Yes. We support data migration from all major HMS platforms including spreadsheets, legacy software, and other cloud systems. Our team handles the migration for Enterprise customers at no extra cost.' },
  { q: 'Is Ayphen HMS compliant with Indian healthcare regulations?', a: 'Absolutely. Ayphen HMS is designed for Indian hospitals with ABDM/ABHA readiness, GST-compliant billing, Indian phone number formats, and data residency within India. We follow HIPAA-equivalent security practices with end-to-end encryption and immutable audit logs.' },
  { q: 'Does it work for small clinics or only large hospitals?', a: 'Ayphen HMS scales from a single-doctor clinic to a 50+ location hospital network. The modular design lets you enable only the features you need — start with OPD Queue and Billing, add Lab, Pharmacy, and IPD as you grow.' },
  { q: 'What kind of support do you offer?', a: 'Starter plans include email support (24-hour response). Professional plans get priority support with 4-hour response times. Enterprise customers get a dedicated account manager, 24/7 phone support, and guaranteed SLAs.' },
  { q: 'Can doctors work across multiple hospitals?', a: 'Yes. Ayphen HMS has a unique Doctor Registry and Affiliation system. Doctors register once on the platform and can be affiliated with multiple organizations, each with separate schedules, queues, and consultation records.' },
  { q: 'Is there a mobile app?', a: 'The web application is fully responsive and works on phones and tablets. A dedicated mobile app for doctors and patients is on our roadmap for Q3 2026, with push notifications and offline consultation notes.' },
  { q: 'Can I try it before purchasing?', a: 'Yes! Every plan comes with a free 30-day trial with full access to all features. No credit card required. You can also book a personalized demo with our team to see how Ayphen HMS fits your hospital\'s workflow.' },
];

/* ── Contact Form Modal ── */
function ContactFormModal({ open, onClose, prefill = '' }: { open: boolean; onClose: () => void; prefill?: string }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', hospital: '', beds: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setErrors({});
      if (prefill) setForm(f => ({ ...f, message: prefill }));
    }
  }, [open, prefill]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Invalid Indian phone number';
    if (!form.hospital.trim()) e.hospital = 'Hospital name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    // Simulate API call (replace with real endpoint when backend is ready)
    await new Promise(r => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Book a Demo / Contact Sales</h3>
            <p className="text-xs text-gray-500 mt-0.5">We'll get back to you within 24 hours</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {submitted ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h4 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h4>
            <p className="text-gray-500 mb-6">Our team will reach out to you at <strong>{form.email}</strong> within 24 hours to schedule your personalized demo.</p>
            <button onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              Done
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {/* Name & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  placeholder="Dr. Rajesh Kumar" />
                {errors.name && <p className="text-[10px] text-red-500 mt-0.5">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Work Email *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className={`w-full pl-8 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                    placeholder="rajesh@hospital.com" type="email" />
                </div>
                {errors.email && <p className="text-[10px] text-red-500 mt-0.5">{errors.email}</p>}
              </div>
            </div>

            {/* Phone & Hospital */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone *</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className={`w-full pl-8 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${errors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                    placeholder="9876543210" />
                </div>
                {errors.phone && <p className="text-[10px] text-red-500 mt-0.5">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Hospital Name *</label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.hospital} onChange={e => setForm({ ...form, hospital: e.target.value })}
                    className={`w-full pl-8 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${errors.hospital ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                    placeholder="City Hospital" />
                </div>
                {errors.hospital && <p className="text-[10px] text-red-500 mt-0.5">{errors.hospital}</p>}
              </div>
            </div>

            {/* Bed Count */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Number of Beds (optional)</label>
              <select value={form.beds} onChange={e => setForm({ ...form, beds: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-gray-700">
                <option value="">Select range</option>
                <option value="1-10">1–10 (Clinic)</option>
                <option value="11-50">11–50 (Small Hospital)</option>
                <option value="51-200">51–200 (Mid-size)</option>
                <option value="201-500">201–500 (Large)</option>
                <option value="500+">500+ (Multi-location)</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Message (optional)</label>
              <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                rows={3} placeholder="Tell us about your requirements, number of locations, modules needed..." />
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Submitting...</>
              ) : (
                <><Send size={16} /> Request a Demo</>
              )}
            </button>

            <p className="text-[10px] text-gray-400 text-center">
              By submitting, you agree to our Privacy Policy. We will never share your data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const plans = [
  {
    name: 'Starter',
    price: '₹4,999',
    period: '/month',
    desc: 'Perfect for small clinics and single-location practices.',
    features: ['Up to 5 doctors', 'OPD Queue + Appointments', 'Patient Registry', 'Basic Billing', 'Email Support'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '₹14,999',
    period: '/month',
    desc: 'Ideal for multi-specialty hospitals and nursing homes.',
    features: ['Unlimited doctors', 'Full OPD + IPD + OT', 'Laboratory + Pharmacy', 'Insurance & Billing', 'Audit Logs', 'Priority Support'],
    cta: 'Get Started',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Hospital chains with multiple locations and advanced needs.',
    features: ['Multi-location network', 'Doctor Registry + App', 'Custom integrations', 'Dedicated infra', 'SLA guarantee', '24/7 Support'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const testimonials = [
  {
    name: 'Dr. Ramesh Krishnan',
    role: 'Medical Director, Apollo Speciality Hospital',
    text: 'Ayphen HMS transformed our OPD flow completely. The real-time queue and e-consultation cut our patient wait times by 40%.',
    stars: 5,
  },
  {
    name: 'Priya Venkataraman',
    role: 'COO, Meenakshi Multi-Care Hospital',
    text: 'The billing and pharmacy integration alone saved us 3 hours of paperwork daily. The audit trail gives us peace of mind.',
    stars: 5,
  },
  {
    name: 'Dr. Suresh Balaji',
    role: 'Chief of Staff, Kauvery Hospital Network',
    text: "Best multi-tenant HMS in the market. We deployed across 6 locations in a week. The platform dashboard gives us complete visibility.",
    stars: 5,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactPrefill, setContactPrefill] = useState('');

  const openContact = (prefill = '') => {
    setContactPrefill(prefill);
    setContactOpen(true);
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <ContactFormModal open={contactOpen} onClose={() => setContactOpen(false)} prefill={contactPrefill} />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img src={ayphenLogo} alt="Ayphen" className="w-8 h-8" />
              <span className="text-xl font-bold text-gray-900">Ayphen <span className="text-teal-600">HMS</span></span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {['Features', 'Demo', 'Modules', 'Pricing', 'Contact'].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`}
                  className="text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">{item}</a>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => navigate('/patient/login')}
                className="px-3 py-2 text-xs font-semibold text-teal-700 border border-teal-200 rounded-xl hover:bg-teal-50 transition-all">
                Patient Portal
              </button>
              <button onClick={() => navigate('/doctors/register')}
                className="px-3 py-2 text-xs font-semibold text-blue-700 border border-blue-200 rounded-xl hover:bg-blue-50 transition-all">
                Doctor Register
              </button>
              <button onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-md hover:shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                Staff Login
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            {['Features', 'Demo', 'Modules', 'Pricing', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 py-2">{item}</a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <button onClick={() => navigate('/patient/login')}
                className="w-full py-2.5 text-sm font-semibold text-teal-700 border-2 border-teal-600 rounded-xl">Patient Portal</button>
              <button onClick={() => navigate('/doctors/register')}
                className="w-full py-2.5 text-sm font-semibold text-blue-700 border-2 border-blue-300 rounded-xl">Doctor Register</button>
              <button onClick={() => navigate('/login')}
                className="w-full py-2.5 text-sm font-semibold text-white rounded-xl"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>Staff Login</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-24 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #14B8A6, transparent)' }} />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #0F766E, transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #14B8A6, transparent)' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              <Zap size={12} className="text-teal-600" />
              India's Most Comprehensive Hospital Management Platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-center text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight tracking-tight max-w-4xl mx-auto">
            Healthcare Management,{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              Reimagined
            </span>
          </h1>

          <p className="mt-6 text-center text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Ayphen HMS is a complete, cloud-native hospital management platform covering every department —
            from OPD queue to OT, Lab to Pharmacy, Billing to Analytics — all in one system.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <button onClick={() => navigate('/login')}
              className="group flex items-center gap-2 px-8 py-4 text-base font-bold text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              Get Started Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-center text-sm text-gray-400">No credit card required · Free 30-day trial · Setup in minutes</p>
          </div>

          {/* Animated Stats Row */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {animatedStats.map(s => (
              <AnimatedStat key={s.label} value={s.value} label={s.label} suffix={s.suffix} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="border-y border-gray-100 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">Trusted by hospitals across India</p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
            {[
              { icon: ShieldCheck, label: 'HIPAA Compliant' },
              { icon: Lock, label: 'End-to-End Encrypted' },
              { icon: Globe, label: 'ABDM / ABHA Ready' },
              { icon: Shield, label: 'SOC 2 Practices' },
              { icon: Activity, label: '99.9% Uptime SLA' },
            ].map(b => {
              const Icon = b.icon;
              return (
                <div key={b.label} className="flex items-center gap-2 text-gray-400 hover:text-teal-600 transition-colors cursor-default">
                  <Icon size={16} />
                  <span className="text-xs font-bold">{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Product Showcase / Live Demo ── */}
      <ProductShowcase />

      {/* ── Features (Why Ayphen) ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-600">Why Ayphen</span>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">Built for the way hospitals work</h2>
              <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
                Every feature designed around real clinical workflows, not generic software templates.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Globe, title: 'Multi-Tenant SaaS', desc: 'Deploy for one clinic or a 50-hospital network. Fully isolated data per organization with shared infrastructure.', color: '#0F766E' },
              { icon: Zap, title: 'Real-Time Everything', desc: 'WebSocket-powered live queue, critical lab alerts, OT status, medication reminders — zero page refresh needed.', color: '#3B82F6' },
              { icon: Lock, title: 'HIPAA-Grade Security', desc: 'Immutable audit logs, role-based access, MFA, anomaly detection, and encrypted PHI at rest and in transit.', color: '#EF4444' },
              { icon: TrendingUp, title: 'Clinical Intelligence', desc: 'Drug interaction checks, allergy conflict alerts, ICD-10 coding, and critical value flags built into every workflow.', color: '#8B5CF6' },
              { icon: Globe, title: 'Doctor Portal & App', desc: 'Doctors can self-register, manage affiliations across hospitals, set availability, and consult from anywhere.', color: '#F59E0B' },
              { icon: BarChart3, title: 'Powerful Analytics', desc: 'From daily OPD counts to network-level financial summaries — drill-down reports for every role.', color: '#10B981' },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <ScrollReveal key={f.title} delay={i * 100}>
                  <div className="group p-6 rounded-2xl border border-gray-100 hover:border-teal-200 hover:shadow-lg transition-all bg-white h-full">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: `${f.color}15` }}>
                      <Icon size={22} style={{ color: f.color }} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Modules Grid ── */}
      <section id="modules" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-600">All Modules</span>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">Everything your hospital needs</h2>
              <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
                12 fully integrated clinical and operational modules — enable only what you need.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {features.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title}
                  className="group p-5 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all cursor-default"
                  style={{ background: 'white' }}
                  onMouseEnter={e => (e.currentTarget.style.background = f.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${f.color}18` }}>
                    <Icon size={20} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-600">How It Works</span>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">Get your hospital live in 3 steps</h2>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Register your hospital', desc: 'Sign up, create your organization, configure locations, departments, and enable modules in minutes.' },
              { step: '02', title: 'Invite your team', desc: 'Add doctors, nurses, pharmacists, lab staff, and receptionists with role-based access controls.' },
              { step: '03', title: 'Go live instantly', desc: 'Start managing queues, consultations, lab orders, billing — your entire hospital from day one.' },
            ].map((s, i) => (
              <ScrollReveal key={s.step} delay={i * 200}>
                <div className="relative">
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-teal-200 to-transparent z-0" style={{ width: 'calc(100% - 3rem)' }} />
                  )}
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white mx-auto mb-5 shadow-lg"
                      style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                      {s.step}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                    <p className="text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-600">Pricing</span>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">Simple, transparent pricing</h2>
              <p className="mt-4 text-lg text-gray-500">No hidden fees. Cancel anytime. Start free.</p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map(plan => (
              <div key={plan.name}
                className={`relative rounded-2xl p-8 flex flex-col transition-all ${plan.highlight ? 'shadow-2xl scale-105 border-2 border-teal-500' : 'border border-gray-200 bg-white hover:shadow-lg'}`}
                style={plan.highlight ? { background: 'linear-gradient(135deg, #0F766E, #0D5E57)' } : {}}>
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full">Most Popular</span>
                  </div>
                )}
                <div>
                  <h3 className={`text-lg font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? 'text-teal-200' : 'text-gray-500'}`}>{plan.period}</span>
                  </div>
                  <p className={`mt-3 text-sm ${plan.highlight ? 'text-teal-100' : 'text-gray-500'}`}>{plan.desc}</p>
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle size={16} className={`mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-teal-300' : 'text-teal-600'}`} />
                      <span className={`text-sm ${plan.highlight ? 'text-teal-50' : 'text-gray-600'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => plan.cta === 'Contact Sales' ? openContact('Interested in Enterprise plan — multi-location deployment.') : navigate('/login')}
                  className={`mt-8 w-full py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 ${plan.highlight ? 'bg-white text-teal-700 hover:bg-teal-50 shadow-lg' : 'text-white shadow-md hover:shadow-lg'}`}
                  style={!plan.highlight ? { background: 'linear-gradient(135deg,#0F766E,#14B8A6)' } : {}}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-600">Testimonials</span>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">Loved by healthcare leaders</h2>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 150}>
                <div className="bg-gray-50 rounded-2xl p-7 border border-gray-100 hover:shadow-md transition-all h-full">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-5">"{t.text}"</p>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.role}</div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-600">FAQ</span>
              <h2 className="mt-3 text-4xl font-bold text-gray-900">Frequently asked questions</h2>
              <p className="mt-4 text-lg text-gray-500">Everything you need to know about Ayphen HMS.</p>
            </div>
          </ScrollReveal>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <ScrollReveal key={faq.q} delay={i * 60}>
                <FaqItem q={faq.q} a={faq.a} />
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal delay={500}>
            <div className="mt-10 text-center p-6 rounded-2xl bg-white border border-gray-100">
              <HelpCircle size={24} className="text-teal-600 mx-auto mb-3" />
              <p className="text-sm text-gray-700 font-semibold">Still have questions?</p>
              <p className="text-xs text-gray-500 mt-1 mb-4">Our team is happy to help with anything.</p>
              <button onClick={() => openContact('I have a question about Ayphen HMS.')}
                className="px-5 py-2 text-sm font-bold text-white rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
                Contact Us
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24" style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0a4f49 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-6">
            Ready to modernize<br />your hospital?
          </h2>
          <p className="text-teal-200 text-lg mb-10 max-w-xl mx-auto">
            Join hundreds of hospitals already running on Ayphen HMS.
            Start your free 30-day trial — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login')}
              className="group flex items-center gap-2 px-8 py-4 text-base font-bold text-teal-700 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5">
              Get Started Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => openContact()}
              className="flex items-center gap-2 px-8 py-4 text-base font-bold text-white border-2 border-white/30 rounded-2xl hover:border-white/60 hover:bg-white/10 transition-all">
              Book a Demo
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Contact Section ── */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-600">Get In Touch</span>
            <h2 className="mt-3 text-4xl font-bold text-gray-900">We'd love to hear from you</h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Whether you need a demo, pricing details, or technical consultation — our team is here to help.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
            {[
              { icon: Mail, title: 'Email Us', detail: 'sales@ayphen.com', sub: 'Response within 24 hours', color: '#0F766E' },
              { icon: Phone, title: 'Call Us', detail: '+91 44 4567 8900', sub: 'Mon–Sat, 9 AM – 7 PM IST', color: '#3B82F6' },
              { icon: MapPin, title: 'Visit Us', detail: 'Chennai, Tamil Nadu', sub: 'India', color: '#8B5CF6' },
            ].map(c => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="text-center p-6 rounded-2xl border border-gray-100 hover:shadow-lg hover:border-teal-200 transition-all bg-white">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: `${c.color}15` }}>
                    <Icon size={22} style={{ color: c.color }} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{c.title}</h3>
                  <p className="text-sm font-semibold text-gray-700">{c.detail}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                    <Clock size={10} /> {c.sub}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button onClick={() => openContact()}
              className="group inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
              <Send size={18} />
              Book a Free Demo
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="about" className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src={ayphenLogo} alt="Ayphen" className="w-8 h-8" />
                <span className="text-white font-bold text-lg">Ayphen HMS</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">India's most comprehensive cloud-native Hospital Management Platform.</p>
              {/* Compliance Badges */}
              <div className="flex flex-wrap gap-2">
                {['HIPAA', 'ABDM', 'ISO 27001'].map(badge => (
                  <span key={badge} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                    <ShieldCheck size={10} /> {badge}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'Modules', href: '#modules' },
                  { label: 'Live Demo', href: '#demo' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'FAQ', href: '#faq' },
                ].map(i => (
                  <li key={i.label}><a href={i.href} className="hover:text-teal-400 transition-colors">{i.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#about" className="hover:text-teal-400 transition-colors">About</a></li>
                <li><a href="#contact" className="hover:text-teal-400 transition-colors">Contact</a></li>
                <li><button onClick={() => openContact('Partnership inquiry')} className="hover:text-teal-400 transition-colors">Partners</button></li>
                <li><button onClick={() => openContact('Career inquiry')} className="hover:text-teal-400 transition-colors">Careers</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#faq" className="hover:text-teal-400 transition-colors">FAQ</a></li>
                <li><button onClick={() => openContact('I need technical support')} className="hover:text-teal-400 transition-colors">Get Help</button></li>
                <li><a href="#contact" className="hover:text-teal-400 transition-colors">Contact Us</a></li>
              </ul>
              <h4 className="text-white font-semibold mb-3 mt-6 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-500 cursor-default">Privacy Policy</span></li>
                <li><span className="text-gray-500 cursor-default">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">© 2026 Ayphen Technologies Pvt Ltd. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>All systems operational</span>
              </div>
              <span className="text-gray-700">·</span>
              <span className="text-xs text-gray-600">Made in India</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
