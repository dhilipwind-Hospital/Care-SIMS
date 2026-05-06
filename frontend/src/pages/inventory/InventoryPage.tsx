import { useEffect, useState } from 'react';
import { Package, AlertTriangle, BarChart3, Layers, ArrowDownUp, ArrowDown, ArrowUp, FlaskConical, CalendarClock, Building2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import Pagination from '../../components/ui/Pagination';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';

type Tab = 'items' | 'transactions' | 'low-stock' | 'batches' | 'expiry' | 'departments';

function expiryColor(expiryDate: string | null) {
  if (!expiryDate) return 'text-gray-400';
  const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'text-red-700 font-bold';
  if (days <= 30) return 'text-red-600 font-semibold';
  if (days <= 60) return 'text-amber-600 font-semibold';
  return 'text-green-700';
}

function expiryBadge(expiryDate: string | null) {
  if (!expiryDate) return null;
  const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">EXPIRED</span>;
  if (days <= 30) return <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">Exp in {days}d</span>;
  if (days <= 60) return <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Exp in {days}d</span>;
  return <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Exp in {days}d</span>;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('items');
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [expiryDays, setExpiryDays] = useState(30);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [lowLoading, setLowLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [deptLoading, setDeptLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showStock, setShowStock] = useState<{ type: 'in' | 'out'; itemId: string } | null>(null);
  const [form, setForm] = useState({ itemCode: '', name: '', category: '', unitOfMeasure: 'PCS', reorderLevel: '10', maxStockLevel: '100', unitCost: '', supplier: '' });
  const [stockForm, setStockForm] = useState({ quantity: '', remarks: '', batchNumber: '', expiryDate: '', manufacturerName: '', supplierName: '', invoiceNumber: '', departmentName: '' });
  const [formError, setFormError] = useState('');

  const fetchData = async () => { setLoading(true); try { const { data } = await api.get('/inventory/items'); setItems(data.data || data || []); } catch { toast.error('Failed to load inventory items'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const fetchTransactions = async () => { setTxLoading(true); try { const { data } = await api.get('/inventory/transactions'); setTransactions(data.data || data || []); } catch { toast.error('Failed to load transactions'); } finally { setTxLoading(false); } };
  const fetchLowStock = async () => { setLowLoading(true); try { const { data } = await api.get('/inventory/low-stock'); setLowStockItems(data.data || data || []); } catch { toast.error('Failed to load low-stock items'); } finally { setLowLoading(false); } };
  const fetchBatches = async () => { setBatchLoading(true); try { const { data } = await api.get('/inventory/batches'); setBatches(data.data || data || []); } catch { toast.error('Failed to load batches'); } finally { setBatchLoading(false); } };
  const fetchExpiry = async (days = expiryDays) => { setExpiryLoading(true); try { const { data } = await api.get(`/inventory/expiry-alert?days=${days}`); setExpiryAlerts(data.data || data || []); } catch { toast.error('Failed to load expiry alerts'); } finally { setExpiryLoading(false); } };
  const fetchDepartments = async () => { setDeptLoading(true); try { const { data } = await api.get('/inventory/departments'); setDepartments(data.data || data || []); } catch { toast.error('Failed to load department data'); } finally { setDeptLoading(false); } };

  useEffect(() => {
    if (activeTab === 'transactions' && transactions.length === 0) fetchTransactions();
    if (activeTab === 'low-stock' && lowStockItems.length === 0) fetchLowStock();
    if (activeTab === 'batches' && batches.length === 0) fetchBatches();
    if (activeTab === 'expiry' && expiryAlerts.length === 0) fetchExpiry();
    if (activeTab === 'departments' && departments.length === 0) fetchDepartments();
  }, [activeTab]);

  const handleAdd = async () => {
    if (!form.itemCode.trim() || !form.name.trim()) { setFormError('Item code and name are required'); return; }
    if (!form.category.trim()) { setFormError('Category is required'); return; }
    setFormError('');
    try {
      await api.post('/inventory/items', { ...form, reorderLevel: Number(form.reorderLevel), maxStockLevel: Number(form.maxStockLevel), unitCost: form.unitCost ? Number(form.unitCost) : undefined });
      toast.success('Item added successfully'); setShowForm(false);
      setForm({ itemCode: '', name: '', category: '', unitOfMeasure: 'PCS', reorderLevel: '10', maxStockLevel: '100', unitCost: '', supplier: '' });
      fetchData();
    } catch { toast.error('Failed to add item'); }
  };

  const handleStock = async () => {
    if (!showStock) return;
    if (!stockForm.quantity || Number(stockForm.quantity) <= 0) { setFormError('Enter a valid quantity'); return; }
    setFormError('');
    try {
      const payload: any = { itemId: showStock.itemId, quantity: Number(stockForm.quantity), remarks: stockForm.remarks };
      if (showStock.type === 'in') {
        if (stockForm.batchNumber) payload.batchNumber = stockForm.batchNumber;
        if (stockForm.expiryDate) payload.expiryDate = stockForm.expiryDate;
        if (stockForm.manufacturerName) payload.manufacturerName = stockForm.manufacturerName;
        if (stockForm.supplierName) payload.supplierName = stockForm.supplierName;
        if (stockForm.invoiceNumber) payload.invoiceNumber = stockForm.invoiceNumber;
      } else {
        if (stockForm.departmentName) payload.departmentName = stockForm.departmentName;
      }
      await api.post(`/inventory/stock-${showStock.type}`, payload);
      toast.success(`Stock ${showStock.type === 'in' ? 'added' : 'removed'} successfully`);
      setShowStock(null);
      setStockForm({ quantity: '', remarks: '', batchNumber: '', expiryDate: '', manufacturerName: '', supplierName: '', invoiceNumber: '', departmentName: '' });
      fetchData();
      if (activeTab === 'transactions') fetchTransactions();
      if (activeTab === 'low-stock') fetchLowStock();
      if (activeTab === 'batches') fetchBatches();
    } catch { toast.error('Failed to update stock'); }
  };

  const lowStock = items.filter(i => i.currentStock <= i.reorderLevel);
  const categories = [...new Set(items.map(i => i.category))];

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'items', label: 'Items', icon: Package },
    { key: 'transactions', label: 'Transactions', icon: ArrowDownUp },
    { key: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
    { key: 'batches', label: 'Batches', icon: FlaskConical },
    { key: 'expiry', label: 'Expiry Alerts', icon: CalendarClock },
    { key: 'departments', label: 'Departments', icon: Building2 },
  ];

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Inventory" subtitle="Manage inventory items, batches, and stock levels" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Items" value={items.length} icon={Package} color="#3B82F6" />
          <KpiCard label="Low Stock" value={lowStock.length} icon={AlertTriangle} color="#EF4444" />
          <KpiCard label="Categories" value={categories.length} icon={Layers} color="#8B5CF6" />
          <KpiCard label="Total Value" value={`₹${items.reduce((s: number, i: any) => s + (Number(i.unitCost || 0) * i.currentStock), 0).toLocaleString()}`} icon={BarChart3} color="#10B981" />
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} />{t.label}
            {t.key === 'low-stock' && lowStock.length > 0 && <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">{lowStock.length}</span>}
            {t.key === 'expiry' && expiryAlerts.length > 0 && <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full leading-none">{expiryAlerts.length}</span>}
          </button>
        ))}
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <>
          <div className="flex justify-end"><button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ Add Item</button></div>
          {showForm && (
            <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">Add Item</h3>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input className="hms-input" placeholder="Item Code *" value={form.itemCode} onChange={e => setForm({ ...form, itemCode: e.target.value })} />
                <input className="hms-input" placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <input className="hms-input" placeholder="Category *" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                <input className="hms-input" placeholder="Unit (PCS, BOX, etc.)" value={form.unitOfMeasure} onChange={e => setForm({ ...form, unitOfMeasure: e.target.value })} />
                <input className="hms-input" type="number" placeholder="Reorder Level" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} />
                <input className="hms-input" type="number" placeholder="Unit Cost" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} />
                <input className="hms-input" placeholder="Supplier" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Save</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
              </div>
            </div>
          )}
          {showStock && (
            <div className="hms-card p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Stock {showStock.type === 'in' ? 'In' : 'Out'}</h3>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="grid grid-cols-2 gap-4">
                <input className="hms-input" type="number" placeholder="Quantity *" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} />
                <input className="hms-input" placeholder="Remarks" value={stockForm.remarks} onChange={e => setStockForm({ ...stockForm, remarks: e.target.value })} />
                {showStock.type === 'in' && <>
                  <input className="hms-input" placeholder="Batch / Lot Number" value={stockForm.batchNumber} onChange={e => setStockForm({ ...stockForm, batchNumber: e.target.value })} />
                  <input className="hms-input" type="date" placeholder="Expiry Date" value={stockForm.expiryDate} onChange={e => setStockForm({ ...stockForm, expiryDate: e.target.value })} />
                  <input className="hms-input" placeholder="Manufacturer" value={stockForm.manufacturerName} onChange={e => setStockForm({ ...stockForm, manufacturerName: e.target.value })} />
                  <input className="hms-input" placeholder="Supplier Name" value={stockForm.supplierName} onChange={e => setStockForm({ ...stockForm, supplierName: e.target.value })} />
                  <input className="hms-input" placeholder="Invoice Number" value={stockForm.invoiceNumber} onChange={e => setStockForm({ ...stockForm, invoiceNumber: e.target.value })} />
                </>}
                {showStock.type === 'out' && (
                  <input className="hms-input" placeholder="Department / Ward" value={stockForm.departmentName} onChange={e => setStockForm({ ...stockForm, departmentName: e.target.value })} />
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={handleStock} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Submit</button>
                <button onClick={() => setShowStock(null)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
              </div>
            </div>
          )}
          <div className="hms-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
                <th className="text-left p-3 font-medium text-gray-600">Code</th>
                <th className="text-left p-3 font-medium text-gray-600">Name</th>
                <th className="text-left p-3 font-medium text-gray-600">Category</th>
                <th className="text-left p-3 font-medium text-gray-600">Stock</th>
                <th className="text-left p-3 font-medium text-gray-600">Reorder</th>
                <th className="text-left p-3 font-medium text-gray-600">Unit</th>
                <th className="text-left p-3 font-medium text-gray-600">Actions</th>
              </tr></thead>
              <tbody>
                {loading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon={<Package size={24} className="text-gray-400" />} title="No inventory items" description="Add items to start tracking stock levels" /></td></tr>
                ) : items.slice((page - 1) * 20, page * 20).map(i => (
                  <tr key={i.id} className={`border-b hover:bg-gray-50 ${i.currentStock <= i.reorderLevel ? 'bg-red-50/40' : ''}`}>
                    <td className="p-3 font-medium text-teal-700">{i.itemCode}</td>
                    <td className="p-3">{i.name}</td>
                    <td className="p-3">{i.category}</td>
                    <td className="p-3"><span className={i.currentStock <= i.reorderLevel ? 'text-red-600 font-bold' : ''}>{i.currentStock}</span></td>
                    <td className="p-3">{i.reorderLevel}</td>
                    <td className="p-3">{i.unitOfMeasure}</td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => { setShowStock({ type: 'in', itemId: i.id }); setStockForm({ quantity: '', remarks: '', batchNumber: '', expiryDate: '', manufacturerName: '', supplierName: '', invoiceNumber: '', departmentName: '' }); setFormError(''); }} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">+In</button>
                        <button onClick={() => { setShowStock({ type: 'out', itemId: i.id }); setStockForm({ quantity: '', remarks: '', batchNumber: '', expiryDate: '', manufacturerName: '', supplierName: '', invoiceNumber: '', departmentName: '' }); setFormError(''); }} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium">-Out</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={Math.ceil(items.length / 20)} onPageChange={setPage} totalItems={items.length} pageSize={20} />
          </div>
        </>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="hms-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-700"><ArrowDownUp size={18} className="text-teal-600" /><span className="font-semibold">Stock Transactions</span></div>
            <button onClick={fetchTransactions} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium flex items-center gap-1"><RefreshCw size={12} />Refresh</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
              <th className="text-left p-3 font-medium text-gray-600">Date</th>
              <th className="text-left p-3 font-medium text-gray-600">Item</th>
              <th className="text-left p-3 font-medium text-gray-600">Type</th>
              <th className="text-left p-3 font-medium text-gray-600">Qty</th>
              <th className="text-left p-3 font-medium text-gray-600">Department</th>
              <th className="text-left p-3 font-medium text-gray-600">Remarks</th>
            </tr></thead>
            <tbody>
              {txLoading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon={<ArrowDownUp size={24} className="text-gray-400" />} title="No transactions" description="Stock in/out transactions will appear here" /></td></tr>
              ) : transactions.slice((page - 1) * 20, page * 20).map(tx => (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className="p-3 font-medium">{tx.item?.name || tx.itemId}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${tx.transactionType.includes('IN') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {tx.transactionType.includes('IN') ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                      {tx.transactionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{tx.quantity}</td>
                  <td className="p-3 text-xs text-gray-500">{tx.departmentName || '—'}</td>
                  <td className="p-3 text-xs text-gray-500 max-w-[180px] truncate">{tx.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(transactions.length / 20)} onPageChange={setPage} totalItems={transactions.length} pageSize={20} />
        </div>
      )}

      {/* Low Stock Tab */}
      {activeTab === 'low-stock' && (
        <div className="hms-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-700">
              <AlertTriangle size={18} className="text-red-500" /><span className="font-semibold">Low Stock Alerts</span>
              {!lowLoading && lowStockItems.length > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{lowStockItems.length} items</span>}
            </div>
            <button onClick={fetchLowStock} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium flex items-center gap-1"><RefreshCw size={12} />Refresh</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
              <th className="text-left p-3 font-medium text-gray-600">Code</th>
              <th className="text-left p-3 font-medium text-gray-600">Name</th>
              <th className="text-left p-3 font-medium text-gray-600">Category</th>
              <th className="text-left p-3 font-medium text-gray-600">Current</th>
              <th className="text-left p-3 font-medium text-gray-600">Reorder</th>
              <th className="text-left p-3 font-medium text-gray-600">Shortage</th>
              <th className="text-left p-3 font-medium text-gray-600">Unit</th>
            </tr></thead>
            <tbody>
              {lowLoading ? (
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
                  <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Need {Math.max(0, i.reorderLevel - i.currentStock)}</span></td>
                  <td className="p-3">{i.unitOfMeasure}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(lowStockItems.length / 20)} onPageChange={setPage} totalItems={lowStockItems.length} pageSize={20} />
        </div>
      )}

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <div className="hms-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-700"><FlaskConical size={18} className="text-teal-600" /><span className="font-semibold">Batch / Lot Register</span></div>
            <button onClick={fetchBatches} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium flex items-center gap-1"><RefreshCw size={12} />Refresh</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
              <th className="text-left p-3 font-medium text-gray-600">Item</th>
              <th className="text-left p-3 font-medium text-gray-600">Batch #</th>
              <th className="text-left p-3 font-medium text-gray-600">Manufacturer</th>
              <th className="text-left p-3 font-medium text-gray-600">Received</th>
              <th className="text-left p-3 font-medium text-gray-600">Expiry</th>
              <th className="text-left p-3 font-medium text-gray-600">Qty Recv</th>
              <th className="text-left p-3 font-medium text-gray-600">Qty Rem</th>
              <th className="text-left p-3 font-medium text-gray-600">Supplier</th>
              <th className="text-left p-3 font-medium text-gray-600">Invoice</th>
            </tr></thead>
            <tbody>
              {batchLoading ? (
                <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={9} />)}</>
              ) : batches.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon={<FlaskConical size={24} className="text-gray-400" />} title="No batch records" description="Batches are created when you use Batch # during Stock In" /></td></tr>
              ) : batches.slice((page - 1) * 20, page * 20).map(b => (
                <tr key={b.id} className={`border-b hover:bg-gray-50 ${!b.isActive ? 'opacity-50' : ''}`}>
                  <td className="p-3">
                    <div className="font-medium text-sm">{b.item?.name}</div>
                    <div className="text-xs text-gray-400">{b.item?.itemCode}</div>
                  </td>
                  <td className="p-3 font-mono font-medium text-teal-700 text-xs">{b.batchNumber}</td>
                  <td className="p-3 text-xs text-gray-600">{b.manufacturerName || '—'}</td>
                  <td className="p-3 text-xs text-gray-500">{b.receivedAt ? new Date(b.receivedAt).toLocaleDateString() : '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs ${expiryColor(b.expiryDate)}`}>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}</span>
                      {b.expiryDate && expiryBadge(b.expiryDate)}
                    </div>
                  </td>
                  <td className="p-3 text-xs">{b.quantityReceived} {b.item?.unitOfMeasure}</td>
                  <td className="p-3">
                    <span className={`text-xs font-semibold ${b.quantityRemaining === 0 ? 'text-gray-400' : b.quantityRemaining < b.quantityReceived * 0.2 ? 'text-red-600' : 'text-gray-800'}`}>
                      {b.quantityRemaining} {b.item?.unitOfMeasure}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">{b.supplierName || '—'}</td>
                  <td className="p-3 text-xs text-gray-500">{b.invoiceNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(batches.length / 20)} onPageChange={setPage} totalItems={batches.length} pageSize={20} />
        </div>
      )}

      {/* Expiry Alerts Tab */}
      {activeTab === 'expiry' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">Show expiring within:</span>
            {[30, 60, 90, 180].map(d => (
              <button key={d} onClick={() => { setExpiryDays(d); fetchExpiry(d); }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${expiryDays === d ? 'bg-amber-500 text-white border-amber-500' : 'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                {d} days
              </button>
            ))}
          </div>
          <div className="hms-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-700">
                <CalendarClock size={18} className="text-amber-500" />
                <span className="font-semibold">Expiry Alerts</span>
                {!expiryLoading && expiryAlerts.length > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{expiryAlerts.length} batches</span>}
              </div>
              <button onClick={() => fetchExpiry()} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium flex items-center gap-1"><RefreshCw size={12} />Refresh</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b" style={{ background: 'var(--surface)' }}>
                <th className="text-left p-3 font-medium text-gray-600">Item</th>
                <th className="text-left p-3 font-medium text-gray-600">Batch #</th>
                <th className="text-left p-3 font-medium text-gray-600">Expiry Date</th>
                <th className="text-left p-3 font-medium text-gray-600">Days Left</th>
                <th className="text-left p-3 font-medium text-gray-600">Qty Remaining</th>
                <th className="text-left p-3 font-medium text-gray-600">Storage</th>
              </tr></thead>
              <tbody>
                {expiryLoading ? (
                  <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</>
                ) : expiryAlerts.length === 0 ? (
                  <tr><td colSpan={6}><EmptyState icon={<CalendarClock size={24} className="text-gray-400" />} title="No expiry alerts" description={`No batches expiring within ${expiryDays} days`} /></td></tr>
                ) : expiryAlerts.slice((page - 1) * 20, page * 20).map(b => {
                  const days = b.expiryDate ? Math.floor((new Date(b.expiryDate).getTime() - Date.now()) / 86400000) : null;
                  return (
                    <tr key={b.id} className={`border-b hover:bg-gray-50 ${days !== null && days < 0 ? 'bg-red-50/60' : days !== null && days <= 30 ? 'bg-amber-50/40' : ''}`}>
                      <td className="p-3">
                        <div className="font-medium">{b.item?.name}</div>
                        <div className="text-xs text-gray-400">{b.item?.itemCode}</div>
                      </td>
                      <td className="p-3 font-mono text-xs text-teal-700">{b.batchNumber}</td>
                      <td className={`p-3 text-sm font-medium ${expiryColor(b.expiryDate)}`}>
                        {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3">{expiryBadge(b.expiryDate)}</td>
                      <td className="p-3 text-sm font-semibold">{b.quantityRemaining} {b.item?.unitOfMeasure}</td>
                      <td className="p-3 text-xs text-gray-500">{b.item?.storageLocation || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={page} totalPages={Math.ceil(expiryAlerts.length / 20)} onPageChange={setPage} totalItems={expiryAlerts.length} pageSize={20} />
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="hms-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-700"><Building2 size={18} className="text-teal-600" /><span className="font-semibold">Department Consumption</span></div>
            <button onClick={fetchDepartments} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 font-medium flex items-center gap-1"><RefreshCw size={12} />Refresh</button>
          </div>
          {deptLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : departments.length === 0 ? (
            <EmptyState icon={<Building2 size={24} className="text-gray-400" />} title="No department data" description="Stock-out records with department names will appear here" />
          ) : (
            <div className="divide-y divide-gray-50">
              {departments.map((dept: any) => (
                <div key={dept.department} className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><Building2 size={15} className="text-teal-600" /></div>
                      <div>
                        <div className="font-semibold text-gray-800">{dept.department}</div>
                        <div className="text-xs text-gray-400">{dept.transactions.length} transaction(s) · {dept.totalQty} units total</div>
                      </div>
                    </div>
                    <span className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-medium">{dept.totalQty} units out</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-400">
                        <th className="text-left pb-1">Date</th>
                        <th className="text-left pb-1">Item</th>
                        <th className="text-left pb-1">Qty</th>
                        <th className="text-left pb-1">Remarks</th>
                      </tr></thead>
                      <tbody>
                        {dept.transactions.slice(0, 5).map((tx: any) => (
                          <tr key={tx.id} className="border-t border-gray-50">
                            <td className="py-1.5 text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="py-1.5 font-medium">{tx.item?.name}</td>
                            <td className="py-1.5 text-red-600 font-semibold">{tx.quantity}</td>
                            <td className="py-1.5 text-gray-400 max-w-[200px] truncate">{tx.remarks || '—'}</td>
                          </tr>
                        ))}
                        {dept.transactions.length > 5 && <tr><td colSpan={4} className="py-1.5 text-gray-400 italic">...and {dept.transactions.length - 5} more</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
