import { useEffect, useRef, useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import api from '../../lib/api';

export interface SelectOption {
  id: string;
  label: string;
  sub?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (id: string, option: SelectOption | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  /** Static options — if provided, no API call is made */
  options?: SelectOption[];
  /** API endpoint to fetch options from (e.g. '/departments') */
  endpoint?: string;
  /** Map API response items to SelectOption */
  mapOption?: (item: any) => SelectOption;
  /** Query param name for search (default: 'q') */
  searchParam?: string;
  className?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  required,
  disabled,
  options: staticOptions,
  endpoint,
  mapOption,
  searchParam = 'q',
  className = '',
}: SearchableSelectProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch from API on search change
  useEffect(() => {
    if (staticOptions) {
      const filtered = search.trim()
        ? staticOptions.filter(o =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            (o.sub && o.sub.toLowerCase().includes(search.toLowerCase()))
          )
        : staticOptions;
      setResults(filtered);
      return;
    }

    if (!endpoint || !mapOption) return;
    if (!search.trim() && !open) { setResults([]); return; }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params: any = { limit: 15 };
        if (search.trim()) params[searchParam] = search;
        const { data } = await api.get(endpoint, { params });
        const items = data.data || data || [];
        setResults(items.map(mapOption));
      } catch (err) {
        console.error('Failed to search options:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search, open, staticOptions, endpoint, mapOption, searchParam]);

  // Load initial options when dropdown opens
  useEffect(() => {
    if (open && !staticOptions && endpoint && mapOption && results.length === 0 && !search.trim()) {
      setLoading(true);
      api.get(endpoint, { params: { limit: 15 } })
        .then(({ data }) => {
          const items = data.data || data || [];
          setResults(items.map(mapOption));
        })
        .catch((err) => { console.error('Failed to fetch search results:', err); setResults([]); })
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Resolve label for pre-set value
  useEffect(() => {
    if (!value) { setSelectedLabel(''); return; }
    if (staticOptions) {
      const match = staticOptions.find(o => o.id === value);
      if (match) setSelectedLabel(match.label);
      return;
    }
    // Try to find in current results
    const match = results.find(r => r.id === value);
    if (match) setSelectedLabel(match.label);
  }, [value, staticOptions, results]);

  const select = (opt: SelectOption) => {
    onChange(opt.id, opt);
    setSelectedLabel(opt.label);
    setSearch('');
    setOpen(false);
  };

  const clear = () => {
    onChange('', null);
    setSelectedLabel('');
    setSearch('');
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs text-gray-500 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center border rounded-lg px-3 py-2 text-sm bg-white transition-all cursor-pointer ${
          open ? 'border-teal-500 ring-2 ring-teal-500/10' : 'border-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        {open ? (
          <div className="flex items-center flex-1 gap-1.5">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder={placeholder}
              className="flex-1 outline-none bg-transparent text-sm"
            />
          </div>
        ) : (
          <span className={`flex-1 truncate ${selectedLabel ? 'text-gray-900' : 'text-gray-400'}`}>
            {selectedLabel || placeholder}
          </span>
        )}
        {value && !disabled ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); clear(); }}
            className="text-gray-400 hover:text-red-500 ml-1"
          >
            <X size={13} />
          </button>
        ) : (
          <ChevronDown size={13} className={`text-gray-400 ml-1 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {open && (
        <div role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-xs text-gray-400 text-center">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-gray-400 text-center">
              {search.trim() ? 'No results found' : 'Type to search…'}
            </div>
          ) : (
            results.map(opt => (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={opt.id === value}
                onClick={() => select(opt)}
                className={`w-full text-left px-3 py-2 hover:bg-teal-50 text-sm transition-colors ${
                  opt.id === value ? 'bg-teal-50 text-teal-700' : ''
                }`}
              >
                <span className="font-medium">{opt.label}</span>
                {opt.sub && <span className="text-gray-400 ml-2 text-xs">{opt.sub}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
