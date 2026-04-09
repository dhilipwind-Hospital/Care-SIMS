import { useEffect, useState } from 'react';
import { ShoppingCart, Truck, CheckCircle, DollarSign, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import api from '../../lib/api';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/pharmacy/drugs', { params: { q: search || undefined, limit: 50 } });
      setOrders(data.data || []);
    } catch (err) { toast.error('Failed to load purchase orders'); } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [search]);

  const open = orders.filter(o => ['DRAFT','SENT','ACKNOWLEDGED'].includes(o.status)).length;
  const pending = orders.filter(o => o.status === 'PARTIALLY_RECEIVED').length;
  const received = orders.filter(o => o.status === 'FULLY_RECEIVED').length;
  const thisMonthSpend = orders
    .filter(o => o.status === 'FULLY_RECEIVED' && new Date(o.createdAt).getMonth() === new Date().getMonth())
    .reduce((s, o) => s + (o.totalAmount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Purchase Orders" subtitle="Manage supplier orders and stock replenishment"
        actions={
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-md" style={{ background: 'linear-gradient(135deg,#0F766E,#14B8A6)' }}>
            <Plus size={15} /> New Purchase Order
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Open Orders" value={open} icon={ShoppingCart} color="#3B82F6" />
        <KpiCard label="Pending Receipt" value={pending} icon={Truck} color="#F59E0B" />
        <KpiCard label="Received Today" value={received} icon={CheckCircle} color="#10B981" />
        <KpiCard label="This Month Spend" value={`₹${thisMonthSpend.toLocaleString('en-IN')}`} icon={DollarSign} color="#0F766E" />
      </div>

      <div className="hms-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Purchase Orders</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PO or supplier..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>
        {loading ? <div className="p-10 text-center text-gray-400 text-sm">Loading...</div> : (
          <table className="w-full text-left">
            <thead><tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">PO #</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Order Date</th><th className="px-4 py-3">Expected Date</th>
              <th className="px-4 py-3">Total Value</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length === 0 ? <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">No purchase orders found</td></tr> :
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-teal-700">{o.poNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium">{o.supplier?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.items?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium">₹{(o.totalAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100">View</button>
                        {o.status === 'ACKNOWLEDGED' && (
                          <button onClick={async () => { await api.post('/pharmacy/batches', { orderId: o.id }); fetch(); }} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100">Receive</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
