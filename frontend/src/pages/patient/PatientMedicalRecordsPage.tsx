import { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Calendar, Stethoscope, Pill, FlaskConical } from 'lucide-react';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

export default function PatientMedicalRecordsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const user = getUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apptRes, rxRes, labRes] = await Promise.allSettled([
        api.get('/auth/patient/me/appointments', { params: { status: 'COMPLETED', limit: 20 } }),
        api.get('/auth/patient/me/prescriptions', { params: { limit: 10 } }),
        api.get('/auth/patient/me/lab-reports', { params: { limit: 10 } }),
      ]);
      setAppointments(apptRes.status === 'fulfilled' ? apptRes.value.data.data || [] : []);
      setPrescriptions(rxRes.status === 'fulfilled' ? rxRes.value.data.data || [] : []);
      setLabOrders(labRes.status === 'fulfilled' ? (Array.isArray(labRes.value.data) ? labRes.value.data : []) : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Medical Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your complete health history at {user?.tenantName}</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw size={16} className="text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Completed Visits', value: appointments.length, icon: Stethoscope, color: '#0F766E', bg: '#F0FDFA' },
              { label: 'Prescriptions',    value: prescriptions.length, icon: Pill,        color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Lab Orders',       value: labOrders.length,     icon: FlaskConical, color: '#EF4444', bg: '#FEF2F2' },
            ].map(c => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                  <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center mb-2" style={{ background: c.bg }}>
                    <Icon size={18} style={{ color: c.color }} />
                  </div>
                  <div className="text-xl font-black text-gray-900">{c.value}</div>
                  <div className="text-xs text-gray-500">{c.label}</div>
                </div>
              );
            })}
          </div>

          {/* Completed Consultations */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Stethoscope size={15} className="text-teal-600" /> Completed Consultations
            </h2>
            {appointments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <p className="text-gray-400 text-sm">No completed visits yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {appointments.map(appt => (
                  <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Stethoscope size={17} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{appt.type || 'Consultation'}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Calendar size={10} /> {fmt(appt.appointmentDate)}
                        {appt.chiefComplaint && <span className="ml-2 text-gray-400">· {appt.chiefComplaint}</span>}
                      </div>
                    </div>
                    <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-semibold">Completed</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Prescriptions */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Pill size={15} className="text-amber-500" /> Recent Prescriptions
            </h2>
            {prescriptions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <p className="text-gray-400 text-sm">No prescriptions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {prescriptions.slice(0, 5).map(rx => {
                  const isOpen = expanded === `rx-${rx.id}`;
                  return (
                    <div key={rx.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                      <button className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4"
                        onClick={() => setExpanded(isOpen ? null : `rx-${rx.id}`)}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                            <Pill size={17} className="text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{rx.rxNumber}</div>
                            <div className="text-xs text-gray-500">{fmt(rx.issuedAt)} · {rx.items?.length || 0} medication(s)</div>
                          </div>
                        </div>
                        {isOpen ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
                      </button>
                      {isOpen && rx.items?.length > 0 && (
                        <div className="border-t border-gray-50 px-4 pb-3">
                          <div className="flex flex-wrap gap-2 pt-2">
                            {rx.items.map((item: any, idx: number) => (
                              <span key={idx} className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
                                {item.drugName} {item.strength} · {item.dosage} · {item.durationDays}d
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Lab Orders */}
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FlaskConical size={15} className="text-rose-500" /> Lab Orders
            </h2>
            {labOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <p className="text-gray-400 text-sm">No lab orders yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {labOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                      <FlaskConical size={17} className="text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {fmt(order.orderedAt)} · {order.items?.length || 0} test(s)
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${order.status === 'RESULTED' || order.status === 'VALIDATED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {order.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
