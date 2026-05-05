import { useEffect, useState } from 'react';
import { ShoppingCart, Truck, CheckCircle, DollarSign, Plus, Search, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import TopBar from '../../components/layout/TopBar';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import api from '../../lib/api';

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const handlePrintPO = (o: any) => {
    const items: any[] = o.items || [];
    const subtotal = items.reduce((s: number, it: any) => s + ((it.rate || it.unitPrice || 0) * (it.quantity || 0)), 0);
    const gst = o.gstAmount || o.taxAmount || 0;
    const grandTotal = o.totalAmount || (subtotal + gst);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Purchase Order</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111;font-size:13px;}h1,h2{margin:0;}table{width:100%;border-collapse:collapse;}td,th{padding:7px 10px;border:1px solid #ddd;}th{background:#f3f4f6;font-weight:600;text-align:left;}@media print{body{padding:20px;}}</style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
      <div><h1 style="margin:0;font-size:22px;font-weight:900;color:#0F766E;">AYPHEN HMS</h1><h2 style="margin:4px 0 12px;font-size:16px;font-weight:700;">PURCHASE ORDER</h2></div>
      <div style="text-align:right;font-size:11px;color:#555;">Printed: ${new Date().toLocaleString()}</div>
    </div>
    <hr style="border:none;border-top:2px solid #0F766E;margin:12px 0;"/>
    <table style="margin-bottom:16px;">
      <tr><td style="width:25%;background:#f9fafb;font-weight:600;">PO #</td><td>${o.poNumber || (o.id || '').slice(0,8).toUpperCase()}</td><td style="width:25%;background:#f9fafb;font-weight:600;">Date</td><td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Vendor / Supplier</td><td>${o.supplier?.name || o.vendorName || '—'}</td><td style="background:#f9fafb;font-weight:600;">Contact</td><td>${o.supplier?.contact || o.supplierContact || '—'}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Delivery Date</td><td>${o.expectedDate ? new Date(o.expectedDate).toLocaleDateString() : '—'}</td><td style="background:#f9fafb;font-weight:600;">Payment Terms</td><td>${o.paymentTerms || '—'}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Status</td><td colspan="3"><span style="font-weight:700;">${o.status || '—'}</span></td></tr>
    </table>
    <div style="font-weight:700;margin-bottom:8px;color:#0F766E;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">Items</div>
    <table style="margin-bottom:16px;">
      <thead><tr><th style="width:30px;">#</th><th>Item Name</th><th>Generic Name</th><th>Quantity</th><th>Unit</th><th>Rate (₹)</th><th>Amount (₹)</th></tr></thead>
      <tbody>
        ${items.length ? items.map((it: any, i: number) => {
          const rate = it.rate || it.unitPrice || 0;
          const qty = it.quantity || 0;
          return `<tr><td>${i + 1}</td><td>${it.itemName || it.brandName || it.name || '—'}</td><td>${it.genericName || '—'}</td><td>${qty}</td><td>${it.unit || it.unitOfMeasure || '—'}</td><td style="text-align:right;">₹${rate.toLocaleString('en-IN')}</td><td style="text-align:right;">₹${(rate * qty).toLocaleString('en-IN')}</td></tr>`;
        }).join('') : `<tr><td colspan="7" style="text-align:center;color:#888;">No items</td></tr>`}
        <tr><td colspan="5"></td><td style="background:#f9fafb;font-weight:600;">Subtotal</td><td style="text-align:right;">₹${subtotal.toLocaleString('en-IN')}</td></tr>
        ${gst ? `<tr><td colspan="5"></td><td style="background:#f9fafb;font-weight:600;">GST / Tax</td><td style="text-align:right;">₹${Number(gst).toLocaleString('en-IN')}</td></tr>` : ''}
        <tr><td colspan="5"></td><td style="background:#0F766E;color:#fff;font-weight:700;">Grand Total</td><td style="background:#0F766E;color:#fff;font-weight:900;text-align:right;">₹${Number(grandTotal).toLocaleString('en-IN')}</td></tr>
      </tbody>
    </table>
    <div style="margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;border-top:1px solid #ddd;padding-top:20px;">
      <div style="text-align:center;"><div style="border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#555;">Pharmacy Manager</div></div>
      <div style="text-align:center;"><div style="border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#555;">Finance Officer</div></div>
      <div style="text-align:center;"><div style="border-top:1px solid #111;margin-top:40px;padding-top:6px;font-size:11px;color:#555;">Authorized Signatory</div></div>
    </div>
    <script>window.onload=function(){window.print();}</script></body></html>`;
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

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
                        <button onClick={() => handlePrintPO(o)} className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 font-medium flex items-center gap-1"><Printer size={11} />Print</button>
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
