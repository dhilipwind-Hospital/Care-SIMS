import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Calendar, Hash, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navByRole, type NavItem } from './layout/Sidebar';
import api from '../lib/api';

interface SearchResult {
  patients: Array<{
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
    mobile?: string;
    gender?: string;
    ageYears?: number;
  }>;
  appointments: Array<{
    id: string;
    appointmentDate: string;
    status: string;
    patient: { patientId: string; firstName: string; lastName: string };
  }>;
  queue: Array<{
    id: string;
    tokenNumber: number;
    status: string;
    queueDate: string;
    patient: { patientId: string; firstName: string; lastName: string };
  }>;
}

interface FlatItem {
  type: 'nav' | 'patient' | 'appointment' | 'queue';
  label: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  action: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || 'RECEPTION';
  const enabledModules: string[] = (user as any)?.enabledModules || [];
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened; reset state
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults(null);
      setSelectedIdx(0);
    }
  }, [open]);

  // Debounced API search (300ms, 2+ chars)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/search', { params: { q: query } });
        setResults(data);
      } catch (err) {
        console.error('Command palette search failed:', err);
        setResults(null);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const close = useCallback(() => setOpen(false), []);

  // Filter nav items from the real sidebar data, respecting module gates
  const filteredNavItems: NavItem[] = useMemo(() => {
    const allItems = navByRole[role] || navByRole['RECEPTION'];
    const moduleFiltered = allItems.filter(
      item => !item.module || enabledModules.length === 0 || enabledModules.includes(item.module),
    );
    if (!query) return moduleFiltered;
    const q = query.toLowerCase();
    return moduleFiltered.filter(i => i.label.toLowerCase().includes(q));
  }, [role, enabledModules, query]);

  // Build flat selectable list
  const allItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];

    // Navigation items — use the real icon from sidebar
    filteredNavItems.forEach(item => {
      items.push({
        type: 'nav',
        label: item.label,
        sub: item.path,
        icon: item.icon,
        iconColor: 'text-gray-400',
        action: () => {
          navigate(item.path);
          close();
        },
      });
    });

    // Search results
    if (results) {
      results.patients.forEach(p => {
        items.push({
          type: 'patient',
          label: `${p.firstName} ${p.lastName}`,
          sub: `${p.patientId}${p.gender ? ` · ${p.gender}` : ''}${p.ageYears ? ` · ${p.ageYears}y` : ''}`,
          icon: Users,
          iconColor: 'text-blue-500',
          action: () => {
            navigate('/app/patients');
            close();
          },
        });
      });
      results.appointments.forEach(a => {
        items.push({
          type: 'appointment',
          label: `${a.patient?.firstName} ${a.patient?.lastName}`,
          sub: `${a.status} · ${new Date(a.appointmentDate).toLocaleDateString()}`,
          icon: Calendar,
          iconColor: 'text-green-500',
          action: () => {
            navigate('/app/appointments');
            close();
          },
        });
      });
      results.queue.forEach(q => {
        items.push({
          type: 'queue',
          label: `Token #${q.tokenNumber} — ${q.patient?.firstName} ${q.patient?.lastName}`,
          sub: q.status,
          icon: Hash,
          iconColor: 'text-orange-500',
          action: () => {
            navigate('/app/queue');
            close();
          },
        });
      });
    }

    return items;
  }, [filteredNavItems, results, navigate, close]);

  // Reset selectedIdx when items change
  useEffect(() => {
    setSelectedIdx(0);
  }, [allItems.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`);
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allItems[selectedIdx]) {
      e.preventDefault();
      allItems[selectedIdx].action();
    }
  };

  if (!open) return null;

  // Determine section header positions
  const sectionHeaders: Record<number, string> = {};
  let navSeen = false;
  let patientSeen = false;
  let apptSeen = false;
  let queueSeen = false;
  allItems.forEach((item, idx) => {
    if (item.type === 'nav' && !navSeen) {
      sectionHeaders[idx] = query ? 'Matching Pages' : 'Quick Navigation';
      navSeen = true;
    } else if (item.type === 'patient' && !patientSeen) {
      sectionHeaders[idx] = 'Patients';
      patientSeen = true;
    } else if (item.type === 'appointment' && !apptSeen) {
      sectionHeaders[idx] = 'Appointments';
      apptSeen = true;
    } else if (item.type === 'queue' && !queueSeen) {
      sectionHeaders[idx] = 'Queue';
      queueSeen = true;
    }
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

      {/* Dialog */}
      <div role="dialog" aria-modal="true" aria-labelledby="command-palette-title" className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            id="command-palette-title"
            placeholder="Search pages, patients, appointments..."
            className="flex-1 text-sm text-gray-900 outline-none bg-transparent placeholder-gray-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-400 bg-gray-100 rounded font-mono">
            ESC
          </kbd>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 sm:hidden">
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {allItems.length === 0 && query.length >= 2 && !searching && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No results found</div>
          )}

          {searching && allItems.length === 0 && (
            <div className="px-4 py-4 text-center text-sm text-gray-400">Searching...</div>
          )}

          {allItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={`${item.type}-${idx}`}>
                {sectionHeaders[idx] && (
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      {sectionHeaders[idx]}
                    </span>
                  </div>
                )}
                <button
                  data-idx={idx}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === selectedIdx ? 'bg-teal-50 text-teal-900' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Icon size={16} className={`flex-shrink-0 ${idx === selectedIdx ? 'text-teal-600' : item.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.label}</div>
                    {item.sub && <div className="text-xs text-gray-400 truncate">{item.sub}</div>}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
          <span>
            <kbd className="font-mono bg-gray-100 px-1 rounded">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="font-mono bg-gray-100 px-1 rounded">↵</kbd> select
          </span>
          <span>
            <kbd className="font-mono bg-gray-100 px-1 rounded">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
