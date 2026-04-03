import { useEffect, useState } from 'react';
import { Package, AlertTriangle, BarChart3, Layers, ArrowDownUp, ArrowDown, ArrowUp } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

type Tab = 'items' | 'transactions' | 'low-stock';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [lowLoading, setLowLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStock, setShowStock] = useState<{ type: 'in'|'out'; itemId: string } | null>(null);
  const [form, setForm] = useState({ itemCode: '', name: '', category: '', unitOfMeasure: 'PCS', reorderLevel: '10', maxStockLevel: '100', unitCost: '', supplier: '' });
  const [stockForm, setStockForm] = useState({ quantity: '', remarks: '' });
  const [formError, setFormError] = useState('');

  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/inventory/items'); setItems(data.data || data || []); } catch (err) { toast.error('Failed to load inventory items'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const { data } = await api.get('/inventory/transactions');
      setTransactions(data.data || data || []);
    } catch (err) { console.error('Failed to load transactions:', err); toast.error('Failed to load transactions'); } finally { setTxLoading(false); }
  };

  const fetchLowStock = async () => {
    setLowLoading(true);
    try {
      const { data } = await api.get('/inventory/low-stock');
      setLowStockItems(data.data || data || []);
    } catch (err) { console.error('Failed to load low-stock items:', err); toast.error('Failed to load low-stock items'); } finally { setLowLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'transactions' && transactions.length === 0) fetchTransactions();
    if (activeTab === 'low-stock' && lowStockItems.length === 0) fetchLowStock();
  }, [activeTab]);

  const handleAdd = async () => {
    if (!form.itemCode.trim() || !form.name.trim()) { setFormError('Item code and name are required'); return; }
    if (!form.category.trim()) { setFormError('Category is required'); return; }
    setFormError('');
    try { await api.post('/inventory/items', { ...form, reorderLevel: Number(form.reorderLevel), maxStockLevel: Number(form.maxStockLevel), unitCost: form.unitCost ? Number(form.unitCost) : undefined }); toast.success('Item added successfully'); setShowForm(false); setForm({ itemCode: '', name: '', category: '', unitOfMeasure: 'PCS', reorderLevel: '10', maxStockLevel: '100', unitCost: '', supplier: '' }); fetchData(); } catch (err) { toast.error('Failed to add item'); }
  };
  const handleStock = async () => {
    if (!showStock) return;
    if (!stockForm.quantity || Number(stockForm.quantity) <= 0) { setFormError('Enter a valid quantity'); return; }
    setFormError('');
    try { await api.post(`/inventory/stock-${showStock.type}`, { itemId: showStock.itemId, quantity: Number(stockForm.quantity), remarks: stockForm.remarks }); toast.success(`Stock ${showStock.type === 'in' ? 'added' : 'removed'} successfully`); setShowStock(null); setStockForm({ quantity: '', remarks: '' }); fetchData(); if (activeTab === 'transactions') fetchTransactions(); if (activeTab === 'low-stock') fetchLowStock(); } catch (err) { toast.error(`Failed to update stock`); }
  };

  const lowStock = items.filter(i => i.currentStock <= i.reorderLevel);
  const categories = [...new Set(items.map(i => i.category))];

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'items', label: 'Items', icon: Package },
    { key: 'transactions', label: 'Transactions', icon: ArrowDownUp },
    { key: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
  ];

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Inventory" subtitle="Manage inventory items and stock levels" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Total Items" value={items.length} icon={Package} color="#3B82F6" />
          <KpiCard label="Low Stock" value={lowStock.length} icon={AlertTriangle} color="#EF4444" />
          <KpiCard label="Categories" value={categories.length} icon={Layers} color="#8B5CF6" />
          <KpiCard label="Total Value" value={`₹${items.reduce((s: number, i: any) => s + (Number(i.unitCost || 0) * i.currentStock), 0).toLocaleString()}`} icon={BarChart3} color="#10B981" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'items' && (
        <>
          <div className="flex justify-end"><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ Add Item</button></div>
          {showForm && (
            <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Add Item</h3>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="grid grid-cols-3 gap-4">
                <input className="hms-input" placeholder="Item Code *" value={form.itemCode} onChange={e => setForm({ ...form, itemCode: e.target.value })} />
                <input className="hms-input" placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <input className="hms-input" placeholder="Category *" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                <input className="hms-input" placeholder="Unit (PCS, BOX, etc.)" value={form.unitOfMeasure} onChange={e => setForm({ ...form, unitOfMeasure: e.target.value })} />
                <input className="hms-input" type="number" placeholder="Reorder Level" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} />
                <input className="hms-input" type="number" placeholder="Unit Cost" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} />
                <input className="hms-input" placeholder="Supplier" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
              </div><div className="flex gap-2"><button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Save</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
          )}
          {showStock && (
            <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Stock {showStock.type === 'in' ? 'In' : 'Out'}</h3>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="grid grid-cols-2 gap-4">
                <input className="hms-input" type="number" placeholder="Quantity *" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} />
                <input className="hms-input" placeholder="Remarks" value={stockForm.remarks} onChange={e => setStockForm({ ...stockForm, remarks: e.target.value })} />
              </div><div className="flex gap-2"><button onClick={handleStock} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Submit</button><button onClick={() => setShowStock(null)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
          )}
          <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Code</th><th className="text-left p-3 font-medium text-gray-600">Name</th><th className="text-left p-3 font-medium text-gray-600">Category</th><th className="text-left p-3 font-medium text-gray-600">Stock</th><th className="text-left p-3 font-medium text-gray-600">Reorder</th><th className="text-left p-3 font-medium text-gray-600">Unit</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
          <tbody>{loading ? (
            <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
          ) : items.length === 0 ? (
            <tr><td colSpan={7}><EmptyState icon={<Package size={24} className="text-gray-400" />} title="No inventory items" description="Add items to start tracking stock levels" /></td></tr>
          ) : items.slice((page - 1) * 20, page * 20).map(i => (
            <tr key={i.id} className={`border-b hover:bg-gray-50 ${i.currentStock <= i.reorderLevel ? 'bg-red-50/40' : ''}`}>
              <td className="p-3 font-medium text-teal-700">{i.itemCode}</td>
              <td className="p-3">{i.name}</td><td className="p-3">{i.category}</td>
              <td className="p-3"><span className={i.currentStock <= i.reorderLevel ? 'text-red-600 font-bold' : ''}>{i.currentStock}</span></td>
              <td className="p-3">{i.reorderLevel}</td><td className="p-3">{i.unitOfMeasure}</td>
              <td className="p-3">
                <div className="flex gap-1.5">
                  <button onClick={() => setShowStock({ type: 'in', itemId: i.id })} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">+In</button>
                  <button onClick={() => setShowStock({ type: 'out', itemId: i.id })} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium">-Out</button>
                </div>
              </td>
            </tr>
          ))}</tbody></table>
          <Pagination page={page} totalPages={Math.ceil(items.length / 20)} onPageChange={setPage} totalItems={items.length} pageSize={20} />
          </div>
        </>
      )}

      {activeTab === 'transactions' && (
        <div className="hms-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-700">
              <ArrowDownUp size={18} className="text-teal-600" />
              <span className="font-semibold">Stock Transactions</span>
            </div>
            <button onClick={fetchTransactions} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium">Refresh</button>
          </div>
          <table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
            <th className="text-left p-3 font-medium text-gray-600">Date</th>
            <th className="text-left p-3 font-medium text-gray-600">Item</th>
            <th className="text-left p-3 font-medium text-gray-600">Type</th>
            <th className="text-left p-3 font-medium text-gray-600">Quantity</th>
            <th className="text-left p-3 font-medium text-gray-600">Reference</th>
            <th className="text-left p-3 font-medium text-gray-600">Remarks</th>
          </tr></thead>
          <tbody>{txLoading ? (
            <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
          ) : transactions.length === 0 ? (
            <tr><td colSpan={6}><EmptyState icon={<ArrowDownUp size={24} className="text-gray-400" />} title="No transactions" description="Stock in/out transactions will appear here" /></td></tr>
          ) : transactions.slice((page - 1) * 20, page * 20).map(tx => (
            <tr key={tx.id} className="border-b hover:bg-gray-50">
              <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
              <td className="p-3 font-medium">{tx.item?.name || tx.itemId}</td>
              <td className="p-3">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${tx.transactionType === 'STOCK_IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {tx.transactionType === 'STOCK_IN' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  {tx.transactionType === 'STOCK_IN' ? 'IN' : 'OUT'}
                </span>
              </td>
              <td className="p-3 font-medium">{tx.quantity}</td>
              <td className="p-3 text-xs text-gray-500">{tx.referenceType ? `${tx.referenceType}${tx.referenceId ? ` #${tx.referenceId.slice(0, 8)}` : ''}` : '—'}</td>
              <td className="p-3 text-xs text-gray-500 max-w-[200px] truncate">{tx.remarks || '—'}</td>
            </tr>
          ))}</tbody></table>
          <Pagination page={page} totalPages={Math.ceil(transactions.length / 20)} onPageChange={setPage} totalItems={transactions.length} pageSize={20} />
        </div>
      )}

      {activeTab === 'low-stock' && (
        <div className="hms-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-700">
              <AlertTriangle size={18} className="text-red-500" />
              <span className="font-semibold">Low Stock Alerts</span>
              {!lowLoading && lowStockItems.length > 0 && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{lowStockItems.length} items</span>
              )}
            </div>
            <button onClick={fetchLowStock} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium">Refresh</button>
          </div>
          <table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
            <th className="text-left p-3 font-medium text-gray-600">Code</th>
            <th className="text-left p-3 font-medium text-gray-600">Name</th>
            <th className="text-left p-3 font-medium text-gray-600">Category</th>
            <th className="text-left p-3 font-medium text-gray-600">Current Stock</th>
            <th className="text-left p-3 font-medium text-gray-600">Reorder Level</th>
            <th className="text-left p-3 font-medium text-gray-600">Shortage</th>
            <th className="text-left p-3 font-medium text-gray-600">Unit</th>
          </tr></thead>
          <tbody>{lowLoading ? (
            <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
          ) : lowStockItems.length === 0 ? (
            <tr><td colSpan={7}><EmptyState icon={<AlertTriangle size={24} className="text-gray-400" />} title="No low-stock items" description="All items are above their reorder levels" /></td></tr>
          ) : lowStockItems.slice((page - 1) * 20, page * 20).map(i => (
            <tr key={i.id} className="border-b hover:bg-gray-50 bg-red-50/40">
              <td className="p-3 font-medium text-teal-700">{i.itemCode}</td>
              <td className="p-3 font-medium">{i.name}</td>
              <td className="p-3">{i.category}</td>
              <td className="p-3"><span className="text-red-600 font-bold">{i.currentStock}</span></td>
              <td className="p-3">{i.reorderLevel}</td>
              <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Need {Math.max(0, i.reorderLevel - i.currentStock)} more</span></td>
              <td className="p-3">{i.unitOfMeasure}</td>
            </tr>
          ))}</tbody></table>
          <Pagination page={page} totalPages={Math.ceil(lowStockItems.length / 20)} onPageChange={setPage} totalItems={lowStockItems.length} pageSize={20} />
        </div>
      )}
    </div>
  );
}
