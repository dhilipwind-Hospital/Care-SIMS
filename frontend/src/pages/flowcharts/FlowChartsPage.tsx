import { useState, useRef } from 'react';
import TopBar from '../../components/layout/TopBar';
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Primitive building blocks ────────────────────────────────────────────────

type NodeKind = 'start' | 'end' | 'process' | 'decision' | 'io';

interface FNode {
  id: string;
  label: string;
  kind: NodeKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  color?: string;
}

interface FEdge {
  from: string;
  to: string;
  label?: string;
  bend?: 'left' | 'right';
}

interface FlowDef {
  title: string;
  subtitle: string;
  nodes: FNode[];
  edges: FEdge[];
  viewBox?: string;
}

const COLORS = {
  teal:   { fill: '#0F766E', stroke: '#0D6B62', text: '#fff' },
  blue:   { fill: '#1D4ED8', stroke: '#1A44C2', text: '#fff' },
  green:  { fill: '#15803D', stroke: '#126B33', text: '#fff' },
  amber:  { fill: '#B45309', stroke: '#9A4608', text: '#fff' },
  red:    { fill: '#DC2626', stroke: '#C01F1F', text: '#fff' },
  purple: { fill: '#6D28D9', stroke: '#5B20C1', text: '#fff' },
  gray:   { fill: '#374151', stroke: '#2D3748', text: '#fff' },
  light:  { fill: '#F8FAFC', stroke: '#CBD5E1', text: '#1E293B' },
  yellow: { fill: '#CA8A04', stroke: '#A16207', text: '#fff' },
};

const NW = 160;
const NH = 44;
const DW = 140;
const DH = 50;

function nodeColor(n: FNode) {
  if (n.color && n.color in COLORS) return COLORS[n.color as keyof typeof COLORS];
  if (n.kind === 'start' || n.kind === 'end') return COLORS.teal;
  if (n.kind === 'decision') return COLORS.amber;
  return COLORS.light;
}

function NodeShape({ n }: { n: FNode }) {
  const w = n.w ?? (n.kind === 'decision' ? DW : NW);
  const h = n.h ?? (n.kind === 'decision' ? DH : NH);
  const c = nodeColor(n);
  const cx = n.x;
  const cy = n.y;

  if (n.kind === 'start' || n.kind === 'end') {
    return (
      <g>
        <rect x={cx - w/2} y={cy - h/2} width={w} height={h} rx={h/2}
          fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fontSize={12} fontWeight="600" fill={c.text}>{n.label}</text>
      </g>
    );
  }
  if (n.kind === 'decision') {
    const hw = w / 2; const hh = h / 2;
    const pts = `${cx},${cy-hh} ${cx+hw},${cy} ${cx},${cy+hh} ${cx-hw},${cy}`;
    return (
      <g>
        <polygon points={pts} fill={c.fill} stroke={c.stroke} strokeWidth={1.5} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
          fontSize={11} fontWeight="600" fill={c.text}>{n.label}</text>
      </g>
    );
  }
  return (
    <g>
      <rect x={cx - w/2} y={cy - h/2} width={w} height={h} rx={6}
        fill={c.fill} stroke={c.stroke} strokeWidth={1.5}
        filter={c.fill === '#F8FAFC' ? undefined : 'url(#shadow)'} />
      {n.label.split('\n').map((line, i, arr) => (
        <text key={i} x={cx} y={cy + (i - (arr.length-1)/2) * 14}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={11} fontWeight={c.fill === '#F8FAFC' ? '500' : '600'}
          fill={c.text}>{line}</text>
      ))}
    </g>
  );
}

function getAnchor(n: FNode, side: 'top'|'bottom'|'left'|'right') {
  const w = n.w ?? (n.kind === 'decision' ? DW : NW);
  const h = n.h ?? (n.kind === 'decision' ? DH : NH);
  if (side === 'top')    return [n.x, n.y - h/2];
  if (side === 'bottom') return [n.x, n.y + h/2];
  if (side === 'left')   return [n.x - w/2, n.y];
  return [n.x + w/2, n.y];
}

function Edge({ edge, nodes }: { edge: FEdge; nodes: FNode[] }) {
  const from = nodes.find(n => n.id === edge.from);
  const to   = nodes.find(n => n.id === edge.to);
  if (!from || !to) return null;

  // pick sensible anchors
  let fSide: 'top'|'bottom'|'left'|'right' = 'bottom';
  let tSide: 'top'|'bottom'|'left'|'right' = 'top';

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) > Math.abs(dy) * 1.5) {
    fSide = dx > 0 ? 'right' : 'left';
    tSide = dx > 0 ? 'left'  : 'right';
  } else if (dy < 0) {
    fSide = 'top'; tSide = 'bottom';
  }

  if (edge.bend === 'left')  { fSide = 'left';  tSide = 'top'; }
  if (edge.bend === 'right') { fSide = 'right'; tSide = 'top'; }

  const [x1, y1] = getAnchor(from, fSide);
  const [x2, y2] = getAnchor(to,   tSide);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  let d = '';

  if (fSide === 'bottom' && tSide === 'top') {
    d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  } else if (fSide === 'right' && tSide === 'left') {
    d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  } else if (fSide === 'left' && tSide === 'right') {
    d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  } else {
    d = `M ${x1} ${y1} C ${x1} ${midY+20}, ${x2} ${midY-20}, ${x2} ${y2}`;
  }

  const labelX = midX + (edge.bend === 'left' ? -18 : edge.bend === 'right' ? 18 : 0);
  const labelY = midY;

  return (
    <g>
      <path d={d} fill="none" stroke="#94A3B8" strokeWidth={1.8} markerEnd="url(#arrow)" />
      {edge.label && (
        <text x={labelX} y={labelY} textAnchor="middle" fontSize={10}
          fontWeight="600" fill="#64748B"
          style={{ paintOrder: 'stroke' } as React.CSSProperties}
          stroke="white" strokeWidth={3}>
          {edge.label}
        </text>
      )}
    </g>
  );
}

// ─── Flow Definitions ─────────────────────────────────────────────────────────

const opdFlow: FlowDef = {
  title: 'OPD Patient Journey',
  subtitle: 'Registration → Consultation → Pharmacy → Billing',
  viewBox: '0 0 860 620',
  nodes: [
    { id: 'arrive',   label: 'Patient Arrives',              kind: 'start',    x: 430, y: 40,  color: 'teal' },
    { id: 'reg',      label: 'Receptionist\nRegisters Patient',kind:'process', x: 430, y: 120, color: 'blue', w: 170 },
    { id: 'appt',     label: 'Book Appointment\nDoctor + Slot', kind:'process', x: 430, y: 200, color: 'blue', w: 170 },
    { id: 'token',    label: 'Token Issued → Queue',          kind: 'io',      x: 430, y: 280, color: 'light', w: 170 },
    { id: 'consult',  label: 'Doctor Consultation\nSOAP · Diagnosis · ICD', kind:'process', x: 430, y: 360, color: 'purple', w: 190 },
    { id: 'inv',      label: 'Investigations\nNeeded?',       kind: 'decision',x: 430, y: 450, w: 150 },
    { id: 'lab',      label: 'Lab / Radiology Order',         kind: 'process', x: 220, y: 450, color: 'green', w: 160 },
    { id: 'result',   label: 'Results → Doctor',              kind: 'process', x: 220, y: 530, color: 'green', w: 160 },
    { id: 'rx',       label: 'Prescription Issued',           kind: 'process', x: 430, y: 530, color: 'teal',  w: 160 },
    { id: 'pharma',   label: 'Pharmacy Dispenses',            kind: 'process', x: 640, y: 530, color: 'teal',  w: 160 },
    { id: 'bill',     label: 'Invoice: Consult +\nTests + Drugs', kind:'process', x: 640, y: 450, color: 'amber', w: 170 },
    { id: 'exit',     label: 'Patient Exits / Admitted',      kind: 'end',     x: 640, y: 370, color: 'gray' },
  ],
  edges: [
    { from: 'arrive',  to: 'reg' },
    { from: 'reg',     to: 'appt' },
    { from: 'appt',    to: 'token' },
    { from: 'token',   to: 'consult' },
    { from: 'consult', to: 'inv' },
    { from: 'inv',     to: 'lab',    label: 'Yes', bend: 'left' },
    { from: 'lab',     to: 'result' },
    { from: 'result',  to: 'rx',     bend: 'right' },
    { from: 'inv',     to: 'rx',     label: 'No' },
    { from: 'rx',      to: 'pharma' },
    { from: 'pharma',  to: 'bill' },
    { from: 'bill',    to: 'exit' },
  ],
};

const ipdFlow: FlowDef = {
  title: 'IPD Admission & Inpatient Flow',
  subtitle: 'Admission → Daily Care → Discharge',
  viewBox: '0 0 860 640',
  nodes: [
    { id: 'order',    label: 'Admission Order',               kind: 'start',   x: 430, y: 40,  color: 'teal' },
    { id: 'bed',      label: 'Bed Allocated\nVisual Bed Map', kind: 'process', x: 430, y: 120, color: 'blue', w: 170 },
    { id: 'triage',   label: 'Triage + Vitals\nInitial Assessment', kind:'process', x: 430, y: 200, color: 'red', w: 175 },
    { id: 'vitals',   label: 'Vitals Every Shift',            kind: 'process', x: 180, y: 310, color: 'light', w: 155 },
    { id: 'round',    label: 'Doctor Ward Round\nSOAP + Treatment', kind:'process', x: 360, y: 310, color: 'purple', w: 165 },
    { id: 'mar',      label: 'MAR — Medication\nAdministration', kind:'process', x: 560, y: 310, color: 'green', w: 160 },
    { id: 'special',  label: 'Specialty Care?\n(ICU · OT · Dialysis)', kind:'decision', x: 430, y: 420, w: 185 },
    { id: 'icu',      label: 'ICU / OT / NICU',               kind: 'process', x: 670, y: 420, color: 'red', w: 140 },
    { id: 'ready',    label: 'Ready to\nDischarge?',          kind: 'decision',x: 430, y: 510, w: 140 },
    { id: 'dc',       label: 'Discharge Summary\n+ Consent',  kind: 'process', x: 430, y: 590, color: 'teal', w: 170 },
    // loop label node removed — handled by edge labels
  ],
  edges: [
    { from: 'order',   to: 'bed' },
    { from: 'bed',     to: 'triage' },
    { from: 'triage',  to: 'vitals',  label: 'Daily\ncycle' },
    { from: 'triage',  to: 'round' },
    { from: 'triage',  to: 'mar' },
    { from: 'vitals',  to: 'special' },
    { from: 'round',   to: 'special' },
    { from: 'mar',     to: 'special' },
    { from: 'special', to: 'icu',    label: 'Yes' },
    { from: 'icu',     to: 'ready',  bend: 'right' },
    { from: 'special', to: 'ready',  label: 'No' },
    { from: 'ready',   to: 'triage', label: 'No',  bend: 'left' },
    { from: 'ready',   to: 'dc',     label: 'Yes' },
  ],
};

const emergencyFlow: FlowDef = {
  title: 'Emergency Department Flow',
  subtitle: 'Triage → Disposition (Admit / Discharge / Transfer / MLC)',
  viewBox: '0 0 860 600',
  nodes: [
    { id: 'arrive',  label: 'Patient Arrives\nWalk-in / Ambulance', kind: 'start',    x: 430, y: 45,  color: 'red', w: 185 },
    { id: 'reg',     label: 'Quick Registration',                    kind: 'process',  x: 430, y: 125, color: 'blue', w: 160 },
    { id: 'triage',  label: 'Triage Colour Assigned',               kind: 'decision', x: 430, y: 210, w: 175 },
    { id: 'red',     label: '🔴 RED\nImmediate',                    kind: 'process',  x: 130, y: 300, color: 'red',    w: 120, h: 50 },
    { id: 'yellow',  label: '🟡 YELLOW\nUrgent',                    kind: 'process',  x: 290, y: 300, color: 'yellow', w: 120, h: 50 },
    { id: 'green',   label: '🟢 GREEN\nMinor',                      kind: 'process',  x: 450, y: 300, color: 'green',  w: 120, h: 50 },
    { id: 'black',   label: '⚫ BLACK\nExpectant',                  kind: 'process',  x: 620, y: 300, color: 'gray',   w: 120, h: 50 },
    { id: 'assess',  label: 'Doctor Assessment\nVitals · Investigations', kind: 'process', x: 360, y: 400, color: 'purple', w: 185 },
    { id: 'mlc',     label: 'MLC?',                                 kind: 'decision', x: 360, y: 480, w: 100 },
    { id: 'mlcreg',  label: 'MLC Register\nAuto MLC Number',        kind: 'process',  x: 560, y: 480, color: 'red', w: 155 },
    { id: 'disp',    label: 'Disposition',                          kind: 'decision', x: 360, y: 560, w: 120 },
    { id: 'admit',   label: 'ADMIT → IPD',                          kind: 'end',      x: 160, y: 560, color: 'blue', w: 110 },
    { id: 'disc',    label: 'DISCHARGE\n+ Billing',                 kind: 'end',      x: 360, y: 630, color: 'green', w: 120 },
    { id: 'trans',   label: 'TRANSFER\nReferral',                   kind: 'end',      x: 560, y: 560, color: 'gray', w: 110 },
  ],
  edges: [
    { from: 'arrive',  to: 'reg' },
    { from: 'reg',     to: 'triage' },
    { from: 'triage',  to: 'red',    label: 'Red',    bend: 'left' },
    { from: 'triage',  to: 'yellow', label: 'Yellow', bend: 'left' },
    { from: 'triage',  to: 'green',  label: 'Green' },
    { from: 'triage',  to: 'black',  label: 'Black',  bend: 'right' },
    { from: 'red',     to: 'assess' },
    { from: 'yellow',  to: 'assess' },
    { from: 'green',   to: 'assess' },
    { from: 'assess',  to: 'mlc' },
    { from: 'mlc',     to: 'mlcreg', label: 'Yes' },
    { from: 'mlc',     to: 'disp',   label: 'No' },
    { from: 'mlcreg',  to: 'disp',   bend: 'right' },
    { from: 'disp',    to: 'admit',  label: 'Admit',  bend: 'left' },
    { from: 'disp',    to: 'disc',   label: 'Discharge' },
    { from: 'disp',    to: 'trans',  label: 'Transfer', bend: 'right' },
  ],
};

const otFlow: FlowDef = {
  title: 'Operation Theatre Flow',
  subtitle: 'Booking → Pre-Op → CSSD → Surgery → Recovery → Billing',
  viewBox: '0 0 860 640',
  nodes: [
    { id: 'book',    label: 'Doctor Books OT Slot\nProcedure · Theatre · Date', kind: 'start',    x: 430, y: 45,  color: 'teal', w: 200 },
    { id: 'preop',   label: 'Pre-Op Assessment\nAnaesthetist · ASA Grade',      kind: 'process',  x: 430, y: 130, color: 'blue', w: 190 },
    { id: 'consent', label: 'Consent Forms Signed\nSurgery · Anaesthesia',      kind: 'process',  x: 430, y: 210, color: 'blue', w: 190 },
    { id: 'cssd',    label: 'CSSD Instrument Request\nSterilisation Batch',     kind: 'process',  x: 430, y: 290, color: 'green', w: 190 },
    { id: 'bici',    label: 'BI/CI\nPass?',                                      kind: 'decision', x: 430, y: 375, w: 110 },
    { id: 'redo',    label: 'Re-sterilise',                                      kind: 'process',  x: 620, y: 375, color: 'red', w: 120 },
    { id: 'checklist',label: 'Pre-Op Checklist\nNPO · Allergy · IV Access',     kind: 'process',  x: 430, y: 455, color: 'amber', w: 190 },
    { id: 'surgery', label: 'Surgery\nIncision Time Logged',                    kind: 'process',  x: 430, y: 535, color: 'red', w: 190 },
    { id: 'anaes',   label: 'Anaesthesia Record\nVitals Every 5 Min',           kind: 'process',  x: 200, y: 535, color: 'purple', w: 175 },
    { id: 'recovery',label: 'Recovery Room\nPost-Op Vitals',                    kind: 'process',  x: 430, y: 610, color: 'teal', w: 175 },
    { id: 'billing', label: 'OT Billing\nTheatre + Anaesthesia',                kind: 'end',      x: 650, y: 610, color: 'amber', w: 175 },
  ],
  edges: [
    { from: 'book',      to: 'preop' },
    { from: 'preop',     to: 'consent' },
    { from: 'consent',   to: 'cssd' },
    { from: 'cssd',      to: 'bici' },
    { from: 'bici',      to: 'redo',      label: 'Fail' },
    { from: 'redo',      to: 'cssd',      bend: 'right' },
    { from: 'bici',      to: 'checklist', label: 'Pass' },
    { from: 'checklist', to: 'surgery' },
    { from: 'surgery',   to: 'anaes',     bend: 'left' },
    { from: 'surgery',   to: 'recovery' },
    { from: 'recovery',  to: 'billing' },
  ],
};

const pharmacyFlow: FlowDef = {
  title: 'Pharmacy Flow',
  subtitle: 'Prescription → Stock Check → Dispense → Billing',
  viewBox: '0 0 860 560',
  nodes: [
    { id: 'rx',      label: 'Prescription from Doctor',          kind: 'start',   x: 430, y: 45,  color: 'teal', w: 185 },
    { id: 'stock',   label: 'Stock Available?',                  kind: 'decision',x: 430, y: 130, w: 145 },
    { id: 'po',      label: 'Raise Purchase Order\nto Vendor',   kind: 'process', x: 650, y: 130, color: 'amber', w: 165 },
    { id: 'receive', label: 'Receive Stock\nInventory Updated',  kind: 'process', x: 650, y: 210, color: 'green', w: 165 },
    { id: 'barcode', label: 'Barcode Scan\nDrug + Patient Verify',kind:'process', x: 430, y: 210, color: 'blue', w: 175 },
    { id: 'dispense',label: 'Dispense\nBatch · Expiry Checked',  kind: 'process', x: 430, y: 295, color: 'teal', w: 175 },
    { id: 'deduct',  label: 'Stock Auto-Decremented',            kind: 'process', x: 430, y: 375, color: 'light', w: 175 },
    { id: 'full',    label: 'Full Dispense?',                    kind: 'decision',x: 430, y: 455, w: 135 },
    { id: 'return',  label: 'Return → Re-stock',                 kind: 'process', x: 220, y: 455, color: 'red', w: 140 },
    { id: 'billadd', label: 'Pharmacy Fee\nAdded to Invoice',    kind: 'end',     x: 430, y: 530, color: 'amber', w: 175 },
  ],
  edges: [
    { from: 'rx',      to: 'stock' },
    { from: 'stock',   to: 'po',      label: 'No',  bend: 'right' },
    { from: 'po',      to: 'receive' },
    { from: 'receive', to: 'barcode', bend: 'left' },
    { from: 'stock',   to: 'barcode', label: 'Yes' },
    { from: 'barcode', to: 'dispense' },
    { from: 'dispense',to: 'deduct' },
    { from: 'deduct',  to: 'full' },
    { from: 'full',    to: 'return',  label: 'Partial', bend: 'left' },
    { from: 'return',  to: 'billadd', bend: 'right' },
    { from: 'full',    to: 'billadd', label: 'Full' },
  ],
};

const billingFlow: FlowDef = {
  title: 'Billing & Insurance Flow',
  subtitle: 'Services Auto-Accumulated → Invoice → Payment / TPA Claim',
  viewBox: '0 0 860 560',
  nodes: [
    { id: 'services', label: 'Services Rendered\nConsult · Tests · Drugs · Bed · OT', kind: 'start',   x: 430, y: 45,  color: 'teal', w: 220 },
    { id: 'invoice',  label: 'Invoice Auto-Created\nItemised Line Items',             kind: 'process', x: 430, y: 130, color: 'blue', w: 195 },
    { id: 'review',   label: 'Billing Staff Reviews\nAdd / Edit Items',               kind: 'process', x: 430, y: 210, color: 'light', w: 185 },
    { id: 'finalise', label: 'Invoice Finalised',                                     kind: 'process', x: 430, y: 290, color: 'blue', w: 160 },
    { id: 'mode',     label: 'Payment Mode?',                                         kind: 'decision',x: 430, y: 375, w: 140 },
    { id: 'direct',   label: 'Cash / Card / UPI\nPayment Recorded',                  kind: 'process', x: 220, y: 375, color: 'green', w: 160 },
    { id: 'tpa',      label: 'Insurance / TPA\nPre-Auth Sent',                       kind: 'process', x: 650, y: 375, color: 'purple', w: 155 },
    { id: 'auth',     label: 'Pre-Auth\nApproved?',                                   kind: 'decision',x: 650, y: 460, w: 125 },
    { id: 'cashless', label: 'Cashless Claim\nTPA Settles',                          kind: 'process', x: 800, y: 540, color: 'green', w: 130 },
    { id: 'reimburse',label: 'Patient Pays &\nFiles Reimbursement',                  kind: 'process', x: 560, y: 540, color: 'amber', w: 160 },
    { id: 'receipt',  label: 'Receipt Generated\nInvoice Closed',                    kind: 'end',     x: 310, y: 490, color: 'teal', w: 165 },
  ],
  edges: [
    { from: 'services', to: 'invoice' },
    { from: 'invoice',  to: 'review' },
    { from: 'review',   to: 'finalise' },
    { from: 'finalise', to: 'mode' },
    { from: 'mode',     to: 'direct',    label: 'Direct',    bend: 'left' },
    { from: 'mode',     to: 'tpa',       label: 'Insurance', bend: 'right' },
    { from: 'direct',   to: 'receipt',   bend: 'right' },
    { from: 'tpa',      to: 'auth' },
    { from: 'auth',     to: 'cashless',  label: 'Yes', bend: 'right' },
    { from: 'auth',     to: 'reimburse', label: 'No' },
    { from: 'cashless', to: 'receipt',   bend: 'left' },
    { from: 'reimburse',to: 'receipt',   bend: 'left' },
  ],
};

const staffFlow: FlowDef = {
  title: 'Staff & Payroll Flow',
  subtitle: 'Onboarding → Attendance → Duty Roster → Payroll',
  viewBox: '0 0 860 580',
  nodes: [
    { id: 'create',   label: 'Admin Creates\nStaff Account',      kind: 'start',   x: 430, y: 45,  color: 'teal', w: 160 },
    { id: 'role',     label: 'Role & Module\nPermissions Assigned',kind: 'process', x: 430, y: 125, color: 'blue', w: 175 },
    { id: 'roster',   label: 'Added to Duty Roster\nShift Assigned',kind:'process', x: 430, y: 205, color: 'purple', w: 180 },
    { id: 'login',    label: 'Staff Logs In\n+ Clocks In',         kind: 'process', x: 430, y: 285, color: 'light', w: 160 },
    { id: 'work',     label: 'Shift Work',                         kind: 'process', x: 430, y: 360, color: 'green', w: 140 },
    { id: 'handover', label: 'Shift Handover Notes\nWritten',      kind: 'process', x: 200, y: 360, color: 'light', w: 165 },
    { id: 'leave',    label: 'Leave\nRequest?',                    kind: 'decision',x: 660, y: 360, w: 120 },
    { id: 'lapprove', label: 'Manager\nApproves/Rejects',          kind: 'process', x: 660, y: 445, color: 'amber', w: 150 },
    { id: 'clockout', label: 'Clock Out\nAttendance Saved',        kind: 'process', x: 430, y: 445, color: 'light', w: 165 },
    { id: 'payroll',  label: 'Month End — Payroll\nBasic+DA+HRA+OT', kind:'process',x: 430, y: 520, color: 'teal', w: 185 },
    { id: 'netpay',   label: 'Deductions PF+ESI+TDS\n→ Net Pay → Approve → Pay', kind:'end', x: 430, y: 595, color: 'green', w: 230 },
  ],
  edges: [
    { from: 'create',   to: 'role' },
    { from: 'role',     to: 'roster' },
    { from: 'roster',   to: 'login' },
    { from: 'login',    to: 'work' },
    { from: 'work',     to: 'handover', bend: 'left' },
    { from: 'work',     to: 'leave',    bend: 'right' },
    { from: 'leave',    to: 'lapprove', label: 'Yes' },
    { from: 'lapprove', to: 'clockout', bend: 'left' },
    { from: 'work',     to: 'clockout' },
    { from: 'clockout', to: 'payroll' },
    { from: 'payroll',  to: 'netpay' },
  ],
};

const platformFlow: FlowDef = {
  title: 'Platform (SaaS) Onboarding Flow',
  subtitle: 'Ayphen Platform Admin → Hospital Setup → Go Live',
  viewBox: '0 0 860 600',
  nodes: [
    { id: 'platform', label: 'Platform Admin Login',               kind: 'start',   x: 430, y: 45,  color: 'teal' },
    { id: 'createorg',label: 'Create Organisation\n(Hospital)',    kind: 'process', x: 430, y: 125, color: 'blue', w: 175 },
    { id: 'modules',  label: 'Toggle Feature Modules\nON / OFF',   kind: 'process', x: 430, y: 205, color: 'purple', w: 185 },
    { id: 'sub',      label: 'Assign Subscription Plan',           kind: 'process', x: 430, y: 285, color: 'amber', w: 185 },
    { id: 'docver',   label: 'Doctor Registry\nVerify & Link Doctors', kind:'process', x: 430, y: 365, color: 'green', w: 195 },
    { id: 'orgadmin', label: 'Org Admin\nAccount Created',         kind: 'process', x: 430, y: 445, color: 'blue', w: 170 },
    { id: 'setup',    label: 'Org Admin Configures\nDepts · Locations · Roles', kind:'process', x: 430, y: 520, color: 'teal', w: 200 },
    { id: 'live',     label: 'Hospital LIVE',                      kind: 'end',     x: 430, y: 590, color: 'green' },
    { id: 'audit',    label: 'Platform Audit\nAll Actions Logged', kind: 'process', x: 680, y: 365, color: 'gray', w: 165 },
  ],
  edges: [
    { from: 'platform',  to: 'createorg' },
    { from: 'createorg', to: 'modules' },
    { from: 'modules',   to: 'sub' },
    { from: 'sub',       to: 'docver' },
    { from: 'docver',    to: 'orgadmin' },
    { from: 'docver',    to: 'audit',    bend: 'right' },
    { from: 'orgadmin',  to: 'setup' },
    { from: 'setup',     to: 'live' },
  ],
};

// ─── Master flow (text-based, wider) ─────────────────────────────────────────

const masterFlow: FlowDef = {
  title: 'End-to-End Master Flow',
  subtitle: 'All roles and departments in one view',
  viewBox: '0 0 1100 480',
  nodes: [
    { id: 'pa',      label: 'Platform Admin\nCreate Org + Modules', kind:'process', x: 100, y: 80,  color: 'teal', w: 155, h: 50 },
    { id: 'admin',   label: 'Org Admin\nUsers · Roles · Depts',    kind:'process', x: 100, y: 200, color: 'blue', w: 155, h: 50 },
    { id: 'recep',   label: 'Reception\nRegister · Appt · Bill',   kind:'process', x: 300, y: 200, color: 'purple', w: 155, h: 50 },
    { id: 'queue',   label: 'Queue\nToken Management',              kind:'process', x: 300, y: 310, color: 'light', w: 145, h: 50 },
    { id: 'doctor',  label: 'Doctor\nConsult · Rx · Orders',        kind:'process', x: 500, y: 200, color: 'blue', w: 155, h: 50 },
    { id: 'lab',     label: 'Lab\nSample → Result',                 kind:'process', x: 500, y: 100, color: 'green', w: 140, h: 50 },
    { id: 'rad',     label: 'Radiology\nOrder → Report',            kind:'process', x: 700, y: 100, color: 'green', w: 140, h: 50 },
    { id: 'pharma',  label: 'Pharmacy\nDispense → Stock',           kind:'process', x: 700, y: 200, color: 'amber', w: 145, h: 50 },
    { id: 'nurse',   label: 'Nursing\nTriage · Vitals · MAR',       kind:'process', x: 500, y: 330, color: 'red', w: 155, h: 50 },
    { id: 'icu',     label: 'ICU / OT / NICU',                      kind:'process', x: 700, y: 330, color: 'red', w: 140, h: 50 },
    { id: 'billing', label: 'Billing\nInvoice · Insurance',         kind:'process', x: 900, y: 200, color: 'amber', w: 155, h: 50 },
    { id: 'portal',  label: 'Patient Portal\nRecords · Appt · Bills',kind:'end',   x: 900, y: 330, color: 'teal', w: 165, h: 50 },
    { id: 'reports', label: 'Reports · Audit\nPayroll · Roster',    kind:'process', x: 100, y: 380, color: 'gray', w: 155, h: 50 },
  ],
  edges: [
    { from: 'pa',     to: 'admin' },
    { from: 'admin',  to: 'recep' },
    { from: 'recep',  to: 'queue' },
    { from: 'queue',  to: 'doctor' },
    { from: 'doctor', to: 'lab' },
    { from: 'doctor', to: 'rad' },
    { from: 'doctor', to: 'pharma' },
    { from: 'doctor', to: 'nurse' },
    { from: 'nurse',  to: 'icu' },
    { from: 'pharma', to: 'billing' },
    { from: 'lab',    to: 'billing' },
    { from: 'icu',    to: 'billing' },
    { from: 'billing',to: 'portal' },
    { from: 'admin',  to: 'reports', bend: 'left' },
  ],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'master',    label: 'Master',         def: masterFlow },
  { key: 'opd',       label: 'OPD',            def: opdFlow },
  { key: 'ipd',       label: 'IPD',            def: ipdFlow },
  { key: 'emergency', label: 'Emergency',      def: emergencyFlow },
  { key: 'ot',        label: 'OT / CSSD',      def: otFlow },
  { key: 'pharmacy',  label: 'Pharmacy',       def: pharmacyFlow },
  { key: 'billing',   label: 'Billing',        def: billingFlow },
  { key: 'staff',     label: 'Payroll',        def: staffFlow },
  { key: 'platform',  label: 'Platform',       def: platformFlow },
];

const LEGEND = [
  { shape: 'pill',    color: '#0F766E', label: 'Start / End' },
  { shape: 'rect',    color: '#1D4ED8', label: 'Process' },
  { shape: 'diamond', color: '#B45309', label: 'Decision' },
  { shape: 'rect',    color: '#F8FAFC', border: '#CBD5E1', label: 'Data' },
];

function ZoomableChart({ def }: { def: FlowDef }) {
  const [zoom, setZoom] = useState(1);
  const MIN = 0.4; const MAX = 2.5; const STEP = 0.2;
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomIn  = () => setZoom(z => Math.min(MAX, +(z + STEP).toFixed(1)));
  const zoomOut = () => setZoom(z => Math.max(MIN, +(z - STEP).toFixed(1)));
  const reset   = () => setZoom(1);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* card header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight truncate">{def.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-tight line-clamp-2">{def.subtitle}</p>
        </div>
        {/* zoom controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={zoomOut} disabled={zoom <= MIN}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ZoomOut size={14} className="text-gray-600" />
          </button>
          <span className="text-xs font-semibold text-gray-600 w-10 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={zoomIn} disabled={zoom >= MAX}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ZoomIn size={14} className="text-gray-600" />
          </button>
          <button onClick={reset}
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors ml-0.5">
            <RotateCcw size={13} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* scrollable / zoomable SVG area */}
      <div
        ref={containerRef}
        className="overflow-auto bg-gray-50"
        style={{ maxHeight: 'calc(100svh - 280px)', minHeight: 260, WebkitOverflowScrolling: 'touch' }}
      >
        <div
          style={{
            transformOrigin: 'top left',
            transform: `scale(${zoom})`,
            transition: 'transform 0.15s ease',
            display: 'inline-block',
            padding: 12,
          }}
        >
          <svg
            viewBox={def.viewBox ?? '0 0 900 600'}
            style={{ display: 'block' }}
            width={parseInt((def.viewBox ?? '0 0 900 600').split(' ')[2])}
            height={parseInt((def.viewBox ?? '0 0 900 600').split(' ')[3])}
          >
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#94A3B8" />
              </marker>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#00000018" />
              </filter>
            </defs>
            {def.edges.map((e, i) => <Edge key={i} edge={e} nodes={def.nodes} />)}
            {def.nodes.map(n => <NodeShape key={n.id} n={n} />)}
          </svg>
        </div>
      </div>

      {/* pinch hint — only on touch devices */}
      <p className="text-center text-[10px] text-gray-400 py-1.5 border-t border-gray-100 sm:hidden">
        Pinch to zoom · Scroll to pan
      </p>
    </div>
  );
}

export default function FlowChartsPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const def = TABS[activeIdx].def;

  const goTo = (idx: number) => {
    setActiveIdx(idx);
    // scroll the selected tab into view on mobile
    setTimeout(() => {
      const bar = tabBarRef.current;
      if (!bar) return;
      const btn = bar.children[idx] as HTMLElement;
      btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 0);
  };

  return (
    <div className="p-3 sm:p-6 space-y-3 sm:space-y-5">
      <TopBar title="Flow Charts" subtitle="End-to-end process flows" />

      {/* Legend — wraps on mobile */}
      <div className="flex flex-wrap gap-3 text-xs">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            {l.shape === 'diamond'
              ? <svg width="14" height="11"><polygon points="7,1 13,5.5 7,10 1,5.5" fill={l.color} /></svg>
              : l.shape === 'pill'
                ? <svg width="24" height="11"><rect x="1" y="1" width="22" height="9" rx="4.5" fill={l.color} /></svg>
                : <svg width="14" height="11"><rect x="1" y="1" width="12" height="9" rx="2" fill={l.color} stroke={l.border ?? l.color} strokeWidth="1" /></svg>
            }
            <span className="text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Tab bar — horizontal scroll on mobile */}
      <div className="flex items-center gap-1">
        {/* prev arrow — mobile only */}
        <button
          onClick={() => goTo(Math.max(0, activeIdx - 1))}
          disabled={activeIdx === 0}
          className="sm:hidden p-1 rounded-lg bg-gray-100 disabled:opacity-30 flex-shrink-0"
        >
          <ChevronLeft size={16} className="text-gray-600" />
        </button>

        <div
          ref={tabBarRef}
          className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto flex-1"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => goTo(i)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                activeIdx === i
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* next arrow — mobile only */}
        <button
          onClick={() => goTo(Math.min(TABS.length - 1, activeIdx + 1))}
          disabled={activeIdx === TABS.length - 1}
          className="sm:hidden p-1 rounded-lg bg-gray-100 disabled:opacity-30 flex-shrink-0"
        >
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>

      {/* flow counter */}
      <p className="text-xs text-gray-400 -mt-1">
        {activeIdx + 1} of {TABS.length} — {def.title}
      </p>

      {/* Chart with zoom */}
      <ZoomableChart key={activeIdx} def={def} />

      {/* swipe hint mobile */}
      <div className="flex justify-center gap-1.5 sm:hidden pb-1">
        {TABS.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIdx ? 'w-5 bg-teal-600' : 'w-1.5 bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
