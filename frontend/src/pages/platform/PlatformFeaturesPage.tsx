import { useEffect, useState, useMemo } from 'react';
import { Layers, CheckCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import api from '../../lib/api';

// Fallback static list used when API returns nothing
const STATIC_MODULES = [
  { id: 'MOD_PAT_REG', name: 'Patient Registration', cat: 'Patient Management', clinic: true, hospital: true, multi: true },
  { id: 'MOD_QUEUE', name: 'OPD Queue Dashboard', cat: 'Reception & Queue', clinic: true, hospital: true, multi: true },
  { id: 'MOD_CONSULT', name: 'Doctor Consultation (SOAP Notes)', cat: 'Clinical / Doctor', clinic: true, hospital: true, multi: true },
];

function FlagCell({ val }: { val: boolean | null }) {
  if (val === true) return <span className="text-green-600 font-bold text-sm">Y</span>;
  if (val === false) return <span className="text-red-400 text-sm">N</span>;
  return <span className="text-amber-500 text-sm" title="Optional">Opt</span>;
}

export default function PlatformFeaturesPage() {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromApi, setFromApi] = useState(false);

  useEffect(() => {
    const fetchFeatures = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/platform/features');
        const items = Array.isArray(data) ? data : data.data || [];
        if (items.length > 0) {
          // Normalize API response to match our expected shape
          setModules(items.map((m: any) => ({
            id: m.moduleId || m.id,
            name: m.name || m.moduleName || m.moduleId || m.id,
            cat: m.category || m.cat || 'Uncategorized',
            clinic: m.clinic ?? m.defaultClinic ?? null,
            hospital: m.hospital ?? m.defaultHospital ?? null,
            multi: m.multi ?? m.defaultMulti ?? null,
            description: m.description || '',
          })));
          setFromApi(true);
        } else {
          setModules(STATIC_MODULES);
          setFromApi(false);
        }
      } catch (err) {
        console.error('Failed to load features from API:', err);
        toast.error('Failed to load features from API, showing fallback');
        setModules(STATIC_MODULES);
        setFromApi(false);
      } finally { setLoading(false); }
    };
    fetchFeatures();
  }, []);

  const ALL_MODULES = modules;
  const cats = useMemo(() => [...new Set(ALL_MODULES.map(m => m.cat))], [ALL_MODULES]);

  const filtered = useMemo(() => ALL_MODULES.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || m.cat === filterCat;
    return matchSearch && matchCat;
  }), [ALL_MODULES, search, filterCat]);

  const grouped = useMemo(() => cats.filter(c => !filterCat || c === filterCat).map(cat => ({
    cat,
    modules: filtered.filter(m => m.cat === cat),
  })).filter(g => g.modules.length > 0), [cats, filtered, filterCat]);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Feature Module Catalog" subtitle={fromApi ? 'Loaded from API' : 'Showing fallback catalog'} />

      {loading ? (
        <div className="hms-card p-8 text-center">
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-5 bg-gray-100 rounded w-2/3 mx-auto" />)}
          </div>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="hms-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center"><Layers size={18} className="text-teal-600" /></div>
            <div><div className="text-2xl font-black text-gray-900">{ALL_MODULES.length}</div><div className="text-xs text-gray-500">Total Modules</div></div>
          </div>
        </div>
        <div className="hms-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center"><CheckCircle size={18} className="text-green-600" /></div>
            <div><div className="text-2xl font-black text-gray-900">{cats.length}</div><div className="text-xs text-gray-500">Module Categories</div></div>
          </div>
        </div>
        <div className="hms-card p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Legend</div>
          <div className="space-y-1 text-xs text-gray-600">
            <div className="flex items-center gap-2"><span>✅</span> Default enabled for this org type</div>
            <div className="flex items-center gap-2"><span>❌</span> Not applicable / not available</div>
            <div className="flex items-center gap-2"><span>⚙️</span> Optional — can be enabled à la carte</div>
          </div>
        </div>
      </div>

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 gap-3 flex-wrap">
          <h3 className="font-bold text-gray-900">Feature Module Matrix</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search module…"
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">All Categories</option>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">Module ID</th>
                <th className="px-4 py-3">Module Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Clinic</th>
                <th className="px-4 py-3 text-center">Hospital</th>
                <th className="px-4 py-3 text-center">Multi-Specialty</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ cat, modules: mods }) => (
                <>
                  <tr key={`cat-${cat}`}>
                    <td colSpan={6} className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                      <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{cat}</span>
                    </td>
                  </tr>
                  {mods.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 border-t border-gray-100">
                      <td className="px-4 py-2.5 font-mono text-xs text-teal-700 bg-teal-50/30">{m.id}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-800">{m.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{m.cat}</td>
                      <td className="px-4 py-2.5 text-center"><FlagCell val={m.clinic} /></td>
                      <td className="px-4 py-2.5 text-center"><FlagCell val={m.hospital} /></td>
                      <td className="px-4 py-2.5 text-center"><FlagCell val={m.multi} /></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
