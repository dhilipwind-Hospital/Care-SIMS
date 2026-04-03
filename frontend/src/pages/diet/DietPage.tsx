import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UtensilsCrossed, Clock, CheckCircle, FileText, Star, X, Pencil, Plus, Trash2 } from 'lucide-react';
import TopBar from '../../components/layout/TopBar';
import Pagination from '../../components/ui/Pagination';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTableRow, SkeletonKpiRow } from '../../components/ui/Skeleton';
import api from '../../lib/api';

export default function DietPage() {
  const [tab, setTab] = useState<'orders'|'meals'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', admissionId: '', dietType: 'REGULAR', caloricTarget: '', proteinTarget: '', specialInstructions: '' });
  const [formError, setFormError] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const [mealsPage, setMealsPage] = useState(1);

  // Plan Meal modal state
  const [showPlanMeal, setShowPlanMeal] = useState(false);
  const [planMealForm, setPlanMealForm] = useState({ orderId: '', mealType: 'BREAKFAST', mealDate: '', items: '', notes: '' });
  const [planMealError, setPlanMealError] = useState('');

  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMealId, setFeedbackMealId] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({ consumedPercent: 100, refusalReason: '' });

  // Edit Order modal state
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [editOrderId, setEditOrderId] = useState('');
  const [editOrderForm, setEditOrderForm] = useState({ dietType: 'REGULAR', caloricTarget: '', proteinTarget: '', specialInstructions: '' });
  const [editOrderError, setEditOrderError] = useState('');

  const fetchData = async () => { setLoading(true); try { const [o, m] = await Promise.all([api.get('/diet/orders'), api.get('/diet/meals/today')]); setOrders(o.data.data || o.data || []); setMeals(m.data.data || m.data || []); } catch (err) { toast.error('Failed to load diet data'); } finally { setLoading(false); } };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.patientId.trim()) { setFormError('Patient ID is required'); return; }
    if (!form.admissionId.trim()) { setFormError('Admission ID is required'); return; }
    setFormError('');
    try { await api.post('/diet/orders', { ...form, caloricTarget: form.caloricTarget ? Number(form.caloricTarget) : undefined, proteinTarget: form.proteinTarget ? Number(form.proteinTarget) : undefined }); toast.success('Diet order created'); setShowForm(false); setForm({ patientId: '', admissionId: '', dietType: 'REGULAR', caloricTarget: '', proteinTarget: '', specialInstructions: '' }); fetchData(); } catch (err) { toast.error('Failed to create diet order'); }
  };
  const serveMeal = async (id: string) => { try { await api.patch(`/diet/meals/${id}/serve`); toast.success('Meal served'); fetchData(); } catch (err) { toast.error('Failed to serve meal'); } };
  const cancelOrder = async (id: string) => { try { await api.patch(`/diet/orders/${id}/cancel`); toast.success('Diet order cancelled'); fetchData(); } catch (err) { toast.error('Failed to cancel order'); } };
  const handleDeleteOrder = async (id: string) => { if (!confirm('Are you sure you want to delete this diet order?')) return; try { await api.delete(`/diet/orders/${id}`); toast.success('Diet order deleted'); fetchData(); } catch (err) { toast.error('Failed to delete diet order'); } };

  // Plan Meal handler
  const handlePlanMeal = async () => {
    if (!planMealForm.orderId) { setPlanMealError('Please select an order'); return; }
    if (!planMealForm.mealDate) { setPlanMealError('Meal date/time is required'); return; }
    if (!planMealForm.items.trim()) { setPlanMealError('Menu items are required'); return; }
    setPlanMealError('');
    try {
      const items = planMealForm.items.split(/[,\n]/).map(i => i.trim()).filter(Boolean);
      await api.post('/diet/meals', {
        orderId: planMealForm.orderId,
        mealType: planMealForm.mealType,
        mealDate: planMealForm.mealDate,
        items,
        notes: planMealForm.notes || undefined,
      });
      toast.success('Meal planned successfully');
      setShowPlanMeal(false);
      setPlanMealForm({ orderId: '', mealType: 'BREAKFAST', mealDate: '', items: '', notes: '' });
      fetchData();
    } catch (err) { toast.error('Failed to plan meal'); }
  };

  // Feedback handler
  const openFeedback = (mealId: string) => {
    setFeedbackMealId(mealId);
    setFeedbackForm({ consumedPercent: 100, refusalReason: '' });
    setShowFeedback(true);
  };
  const handleFeedback = async () => {
    try {
      await api.patch(`/diet/meals/${feedbackMealId}/feedback`, {
        consumedPercent: feedbackForm.consumedPercent,
        refusalReason: feedbackForm.refusalReason || undefined,
      });
      toast.success('Feedback recorded');
      setShowFeedback(false);
      fetchData();
    } catch (err) { toast.error('Failed to record feedback'); }
  };

  // Edit Order handler
  const openEditOrder = (order: any) => {
    setEditOrderId(order.id);
    setEditOrderForm({
      dietType: order.dietType || 'REGULAR',
      caloricTarget: order.caloricTarget?.toString() || '',
      proteinTarget: order.proteinTarget?.toString() || '',
      specialInstructions: order.specialInstructions || '',
    });
    setEditOrderError('');
    setShowEditOrder(true);
  };
  const handleEditOrder = async () => {
    setEditOrderError('');
    try {
      await api.patch(`/diet/orders/${editOrderId}`, {
        dietType: editOrderForm.dietType,
        caloricTarget: editOrderForm.caloricTarget ? Number(editOrderForm.caloricTarget) : undefined,
        proteinTarget: editOrderForm.proteinTarget ? Number(editOrderForm.proteinTarget) : undefined,
        specialInstructions: editOrderForm.specialInstructions || undefined,
      });
      toast.success('Diet order updated');
      setShowEditOrder(false);
      fetchData();
    } catch (err) { toast.error('Failed to update diet order'); }
  };

  const active = orders.filter(o => o.status === 'ACTIVE').length;
  const served = meals.filter(m => m.status === 'SERVED' || m.status === 'CONSUMED').length;
  const pending = meals.filter(m => m.status === 'PLANNED').length;
  const displayedOrders = orders.slice((ordersPage - 1) * 20, ordersPage * 20);
  const displayedMeals = meals.slice((mealsPage - 1) * 20, mealsPage * 20);
  const activeOrders = orders.filter(o => o.status === 'ACTIVE');

  // Consumed percent options for feedback
  const consumedOptions = [
    { label: 'Full (100%)', value: 100 },
    { label: 'Half (50%)', value: 50 },
    { label: 'Quarter (25%)', value: 25 },
    { label: 'None (0%)', value: 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      <TopBar title="Diet & Nutrition" subtitle="Manage patient diet orders and meal service" />
      {loading ? <SkeletonKpiRow count={4} /> : (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="Active Orders" value={active} icon={FileText} color="#3B82F6" />
          <KpiCard label="Today's Meals" value={meals.length} icon={UtensilsCrossed} color="#8B5CF6" />
          <KpiCard label="Served" value={served} icon={CheckCircle} color="#10B981" />
          <KpiCard label="Pending" value={pending} icon={Clock} color="#F59E0B" />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'orders' ? 'text-white' : 'border text-gray-600'}`} style={tab === 'orders' ? { background: 'var(--accent)' } : {}}>Orders</button>
        <button onClick={() => setTab('meals')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'meals' ? 'text-white' : 'border text-gray-600'}`} style={tab === 'meals' ? { background: 'var(--accent)' } : {}}>Today's Meals</button>
        {tab === 'orders' && <button onClick={() => setShowForm(!showForm)} className="ml-auto px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>+ New Order</button>}
        {tab === 'meals' && <button onClick={() => { setShowPlanMeal(true); setPlanMealError(''); }} className="ml-auto px-4 py-2 rounded-lg text-white font-medium flex items-center gap-1" style={{ background: 'var(--accent)' }}><Plus size={16} /> Plan Meal</button>}
      </div>
      {showForm && (
        <div className="hms-card p-5 space-y-4"><h3 className="font-semibold text-gray-900">New Diet Order</h3>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="grid grid-cols-3 gap-4">
            <input className="hms-input" placeholder="Patient ID *" value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} />
            <input className="hms-input" placeholder="Admission ID *" value={form.admissionId} onChange={e => setForm({ ...form, admissionId: e.target.value })} />
            <select className="hms-input" value={form.dietType} onChange={e => setForm({ ...form, dietType: e.target.value })}><option value="REGULAR">Regular</option><option value="DIABETIC">Diabetic</option><option value="RENAL">Renal</option><option value="CARDIAC">Cardiac</option><option value="SOFT">Soft</option><option value="LIQUID">Liquid</option><option value="NPO">NPO</option></select>
            <input className="hms-input" type="number" placeholder="Caloric Target (kcal)" value={form.caloricTarget} onChange={e => setForm({ ...form, caloricTarget: e.target.value })} />
            <input className="hms-input" type="number" placeholder="Protein Target (g)" value={form.proteinTarget} onChange={e => setForm({ ...form, proteinTarget: e.target.value })} />
            <input className="hms-input" placeholder="Special Instructions" value={form.specialInstructions} onChange={e => setForm({ ...form, specialInstructions: e.target.value })} />
          </div><div className="flex gap-2"><button onClick={handleAdd} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Create</button><button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button></div></div>
      )}

      {/* Plan Meal Modal */}
      {showPlanMeal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowPlanMeal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Plan Meal</h3>
              <button onClick={() => setShowPlanMeal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {planMealError && <p className="text-sm text-red-600">{planMealError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order *</label>
                <select className="hms-input w-full" value={planMealForm.orderId} onChange={e => setPlanMealForm({ ...planMealForm, orderId: e.target.value })}>
                  <option value="">Select an active order...</option>
                  {activeOrders.map(o => (
                    <option key={o.id} value={o.id}>{o.patientId} — {o.dietType}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type *</label>
                  <select className="hms-input w-full" value={planMealForm.mealType} onChange={e => setPlanMealForm({ ...planMealForm, mealType: e.target.value })}>
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="DINNER">Dinner</option>
                    <option value="SNACK">Snack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meal Date & Time *</label>
                  <input type="datetime-local" className="hms-input w-full" value={planMealForm.mealDate} onChange={e => setPlanMealForm({ ...planMealForm, mealDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Menu Items * <span className="text-gray-400 font-normal">(comma or newline separated)</span></label>
                <textarea className="hms-input w-full" rows={3} placeholder="e.g. Rice, Dal, Chapati&#10;Mixed vegetables" value={planMealForm.items} onChange={e => setPlanMealForm({ ...planMealForm, items: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className="hms-input w-full" rows={2} placeholder="Special instructions or dietary notes..." value={planMealForm.notes} onChange={e => setPlanMealForm({ ...planMealForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handlePlanMeal} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Plan Meal</button>
              <button onClick={() => setShowPlanMeal(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowFeedback(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Meal Feedback</h3>
              <button onClick={() => setShowFeedback(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Portion Consumed</label>
                <div className="grid grid-cols-4 gap-2">
                  {consumedOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFeedbackForm({ ...feedbackForm, consumedPercent: opt.value })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        feedbackForm.consumedPercent === opt.value
                          ? 'text-white border-transparent'
                          : 'text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                      style={feedbackForm.consumedPercent === opt.value ? { background: 'var(--accent)' } : {}}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {feedbackForm.consumedPercent < 100 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {feedbackForm.consumedPercent === 0 ? 'Reason for Refusal' : 'Comments'}
                  </label>
                  <textarea
                    className="hms-input w-full"
                    rows={3}
                    placeholder={feedbackForm.consumedPercent === 0 ? 'Why was the meal refused?' : 'Any comments about the meal...'}
                    value={feedbackForm.refusalReason}
                    onChange={e => setFeedbackForm({ ...feedbackForm, refusalReason: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleFeedback} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Submit Feedback</button>
              <button onClick={() => setShowFeedback(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowEditOrder(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Diet Order</h3>
              <button onClick={() => setShowEditOrder(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {editOrderError && <p className="text-sm text-red-600">{editOrderError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diet Type</label>
                <select className="hms-input w-full" value={editOrderForm.dietType} onChange={e => setEditOrderForm({ ...editOrderForm, dietType: e.target.value })}>
                  <option value="REGULAR">Regular</option>
                  <option value="DIABETIC">Diabetic</option>
                  <option value="RENAL">Renal</option>
                  <option value="CARDIAC">Cardiac</option>
                  <option value="SOFT">Soft</option>
                  <option value="LIQUID">Liquid</option>
                  <option value="NPO">NPO</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Caloric Target (kcal)</label>
                  <input type="number" className="hms-input w-full" placeholder="e.g. 2000" value={editOrderForm.caloricTarget} onChange={e => setEditOrderForm({ ...editOrderForm, caloricTarget: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Protein Target (g)</label>
                  <input type="number" className="hms-input w-full" placeholder="e.g. 60" value={editOrderForm.proteinTarget} onChange={e => setEditOrderForm({ ...editOrderForm, proteinTarget: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                <textarea className="hms-input w-full" rows={2} placeholder="Dietary notes, restrictions..." value={editOrderForm.specialInstructions} onChange={e => setEditOrderForm({ ...editOrderForm, specialInstructions: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleEditOrder} className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--accent)' }}>Update Order</button>
              <button onClick={() => setShowEditOrder(false)} className="px-4 py-2 rounded-lg border text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Patient</th><th className="text-left p-3 font-medium text-gray-600">Diet Type</th><th className="text-left p-3 font-medium text-gray-600">Calories</th><th className="text-left p-3 font-medium text-gray-600">Protein</th><th className="text-left p-3 font-medium text-gray-600">Instructions</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
        <tbody>{loading ? (
          <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
        ) : orders.length === 0 ? (
          <tr><td colSpan={7}><EmptyState icon={<UtensilsCrossed size={24} className="text-gray-400" />} title="No diet orders" description="Create diet orders for admitted patients" /></td></tr>
        ) : displayedOrders.map(o => (
          <tr key={o.id} className="border-b hover:bg-gray-50">
            <td className="p-3">{o.patientId}</td>
            <td className="p-3"><StatusBadge status={o.dietType} /></td>
            <td className="p-3">{o.caloricTarget || '—'} kcal</td>
            <td className="p-3">{o.proteinTarget || '—'} g</td>
            <td className="p-3 max-w-[120px] truncate">{o.specialInstructions || '—'}</td>
            <td className="p-3"><StatusBadge status={o.status} /></td>
            <td className="p-3 flex gap-1">
              {(o.status === 'ACTIVE' || o.status === 'PENDING') && (
                <button onClick={() => openEditOrder(o)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium inline-flex items-center gap-1"><Pencil size={12} /> Edit</button>
              )}
              {o.status === 'ACTIVE' && (
                <button onClick={() => cancelOrder(o.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium">Cancel</button>
              )}
              {(o.status === 'PENDING' || o.status === 'ACTIVE') && (
                <button onClick={() => handleDeleteOrder(o.id)} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 font-medium inline-flex items-center gap-1" title="Delete order"><Trash2 size={12} /> Delete</button>
              )}
            </td>
          </tr>
        ))}</tbody></table>
        {orders.length > 20 && <div className="p-3 border-t"><Pagination current={ordersPage} total={Math.ceil(orders.length / 20)} onPageChange={setOrdersPage} /></div>}
        </div>
      )}
      {tab === 'meals' && (
        <div className="hms-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b" style={{ background: 'var(--surface)' }}><th className="text-left p-3 font-medium text-gray-600">Meal Type</th><th className="text-left p-3 font-medium text-gray-600">Patient</th><th className="text-left p-3 font-medium text-gray-600">Diet</th><th className="text-left p-3 font-medium text-gray-600">Items</th><th className="text-left p-3 font-medium text-gray-600">Served</th><th className="text-left p-3 font-medium text-gray-600">Status</th><th className="text-left p-3 font-medium text-gray-600">Actions</th></tr></thead>
        <tbody>{loading ? (
          <>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={7} />)}</>
        ) : meals.length === 0 ? (
          <tr><td colSpan={7}><EmptyState icon={<UtensilsCrossed size={24} className="text-gray-400" />} title="No meals scheduled today" description="Meals will appear when diet orders are active" /></td></tr>
        ) : displayedMeals.map(m => (
          <tr key={m.id} className="border-b hover:bg-gray-50">
            <td className="p-3 font-medium">{m.mealType}</td>
            <td className="p-3">{m.order?.patientId}</td>
            <td className="p-3">{m.order?.dietType}</td>
            <td className="p-3 max-w-[150px] truncate">{Array.isArray(m.items) ? m.items.join(', ') : (m.items || '—')}</td>
            <td className="p-3">{m.servedAt ? new Date(m.servedAt).toLocaleTimeString() : '—'}</td>
            <td className="p-3"><StatusBadge status={m.status} /></td>
            <td className="p-3 flex gap-1">
              {m.status === 'PLANNED' && <button onClick={() => serveMeal(m.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium">Serve</button>}
              {m.status === 'SERVED' && <button onClick={() => openFeedback(m.id)} className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 font-medium inline-flex items-center gap-1"><Star size={12} /> Feedback</button>}
            </td>
          </tr>
        ))}</tbody></table>
        {meals.length > 20 && <div className="p-3 border-t"><Pagination current={mealsPage} total={Math.ceil(meals.length / 20)} onPageChange={setMealsPage} /></div>}
        </div>
      )}
    </div>
  );
}
