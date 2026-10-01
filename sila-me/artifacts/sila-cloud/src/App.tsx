import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Link, Router as WouterRouter, useLocation } from 'wouter';
import {
  createUser,
  createCloudUser,
  createMobileUser,
  changePassword,
  getSession,
  listCloudUsers,
  listMobileUsers,
  listProperties,
  listStores,
  listUsers,
  resetAdministrationUserPassword,
  resendAdministrationUserCredentials,
  signIn,
  signOut,
  updateUser,
  updateCloudUser,
  updateMobileUser,
  searchMaterials,
  searchSuppliers,
  listCustomers,
  listOcrAgentConfigurations,
  updateOcrAgentConfiguration,
  type AuthSession,
  type Customer,
  type OcrAgentConfiguration,
  type MaterialSummary,
  type SupplierSummary,
  type User,
  type UserInput,
  type UserUpdate,
  type CloudAdministrationUser,
  type MobileAdministrationUser,
} from '@workspace/api-client-react';
import silaLogo from '@assets/SILA_Transpalog_1789175779917.png';
import {
  Activity, AlertTriangle, ArrowRight, Bell, Boxes, Building2, Check,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp,
  ClipboardCheck, Clock3, CloudCog, Code2, Database, Eye, FileCheck2,
  Filter, GitBranch, Globe2, Grid2X2, History, KeyRound, LayoutDashboard,
  Link2, ListChecks, LockKeyhole, Menu, MoreHorizontal as MoreHorizontalIcon, PackageSearch,
  Pencil, Plus, Power, ReceiptText, RotateCcw, Search, ServerCog,
  Settings2, ShieldCheck, ScanLine, SlidersHorizontal, Store, UserCheck, UserCog,
  UserRound, Users, UserX, Warehouse, Workflow, X, Zap, type LucideIcon,
} from 'lucide-react';

type Row = Record<string, string>;
type Toast = { id: number; message: string; tone?: 'success' | 'info' };
type SaveValue = {
  code?: string;
  name: string;
  email?: string;
  password?: string;
  role?: string;
  customerScope?: string;
  propertyScope?: string;
  storeScope?: string;
  status?: string;
  sharePointSiteUrl?: string;
  sharePointFolderPath?: string;
  sharePointFolderUrl?: string;
};

const supportedUserRoles = [
  'SUPER_ADMIN',
  'CUSTOMER_SUPPORT_COORDINATOR',
  'CUSTOMER_MANAGER',
  'STORE_MANAGER',
  'INVENTORY_CONTROLLER',
  'PROCUREMENT_MANAGER',
  'FINANCE_MANAGER',
] as const;

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  CUSTOMER_SUPPORT_COORDINATOR: 'Customer Support Coordinator',
  CUSTOMER_MANAGER: 'Customer Manager',
  STORE_MANAGER: 'Store Manager',
  INVENTORY_CONTROLLER: 'Inventory Controller',
  PROCUREMENT_MANAGER: 'Procurement Manager',
  FINANCE_MANAGER: 'Finance Manager',
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message.replace(/^HTTP \d+ [^:]+:\s*/, '');
  return fallback;
}

function userToRow(user: User): Row {
  return {
    id: String(user.id),
    code: user.code,
    name: user.name,
    email: user.email,
    auth: user.authProvider,
    role: user.role,
    scope: user.scope,
    customerScope: user.customerScope,
    propertyScope: user.propertyScope,
    storeScope: user.storeScope,
    sharePoint: user.sharePointLink
      ? `${user.sharePointLink.siteUrl}/${user.sharePointLink.folderPath}`
      : 'Not linked',
    sharePointSiteUrl: user.sharePointLink?.siteUrl ?? '',
    sharePointFolderPath: user.sharePointLink?.folderPath ?? '',
    sharePointFolderUrl: user.sharePointLink?.folderUrl ?? '',
    sharePointStatus: user.sharePointLink?.status ?? '',
    lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never',
    status: user.status,
  };
}

const allNavGroups = [
  { label: 'Command center', items: [
    ['Dashboard', '/', LayoutDashboard], ['Customers', '/customers', Building2],
    ['Properties', '/properties', Globe2], ['Stores', '/stores', Store],
    ['Mobile Users', '/mobile-users', Users], ['Cloud Users', '/cloud-users', UserRound], ['Roles & Permissions', '/roles', ShieldCheck],
    ['User Access', '/access', UserCheck],
  ]},
  { label: 'Control plane', items: [
    ['Authentication', '/authentication', KeyRound], ['Approval Workflows', '/workflows', Workflow],
    ['Approval Matrix', '/matrix', Grid2X2], ['Workflow Simulator', '/simulator', Zap],
    ['Delegations', '/delegations', UserCog], ['ERP Connections', '/erp', ServerCog],
    ['Plant Mapping', '/plant-mapping', Link2], ['Storage Mapping', '/storage-mapping', Warehouse],
    ['Materials', '/materials', Boxes], ['Suppliers', '/suppliers', PackageSearch],
    ['Mobile Configuration', '/mobile', Settings2], ['OCR Agent', '/ocr-agent', ScanLine],
  ]},
  { label: 'Observability', items: [
    ['Transactions', '/transactions', ReceiptText], ['Approval Monitoring', '/approval-monitoring', ClipboardCheck],
    ['Integration Monitoring', '/integration-monitoring', Activity], ['ERP Errors', '/erp-errors', AlertTriangle],
    ['Audit Logs', '/audit', History],
  ]},
  { label: 'Configuration', items: [
    ['Notifications', '/notifications', Bell], ['Transaction Types', '/transaction-types', FileCheck2],
    ['System Settings', '/settings', SlidersHorizontal], ['Mobile Readiness', '/readiness', CheckCircle2],
    ['Customer Setup Wizard', '/setup-wizard', CloudCog],
  ]},
] as const;
const allNavItems: Array<readonly [string, string, LucideIcon]> = allNavGroups.flatMap((group) => group.items as readonly (readonly [string, string, LucideIcon])[]);

const customers: Row[] = [
  { code: 'FIVE', name: 'FIVE Hospitality Group', country: 'India', currency: 'INR', timezone: 'Asia/Kolkata', erp: 'SAP S/4HANA', status: 'Active' },
  { code: 'NOVA', name: 'Nova Lodging Co.', country: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore', erp: 'Odoo', status: 'Active' },
  { code: 'ARC', name: 'Arcadia Resorts', country: 'UAE', currency: 'AED', timezone: 'Asia/Dubai', erp: 'Oracle Fusion', status: 'Setup' },
];
const properties: Row[] = [
  { code: 'FIVE_PALM', name: 'FIVE Palm Jumeirah', customer: 'FIVE', country: 'UAE', plant: 'DXB-1001', status: 'Active' },
  { code: 'FIVE_ZABEEL', name: 'FIVE Zabeel Saray', customer: 'FIVE', country: 'UAE', plant: 'DXB-1002', status: 'Active' },
  { code: 'FIVE_JBR', name: 'FIVE JBR', customer: 'FIVE', country: 'UAE', plant: 'DXB-1003', status: 'Ready' },
];
const stores: Row[] = [
  { code: 'MAIN_STORE', name: 'Main Store', property: 'FIVE_PALM', type: 'General', mapped: 'WH-1001', status: 'Active' },
  { code: 'BEVERAGE_STORE', name: 'Beverage Store', property: 'FIVE_PALM', type: 'Beverage', mapped: 'WH-1002', status: 'Active' },
  { code: 'COLD_STORE', name: 'Cold Store', property: 'FIVE_PALM', type: 'Cold chain', mapped: 'WH-1003', status: 'Active' },
];
const users: Row[] = [
  { code: 'SRIRAM001', name: 'Sriram Krishnan', auth: 'SILA Local Login', role: 'STORE_MANAGER', scope: 'FIVE_PALM / MAIN_STORE', lastLogin: '18 Jun 2024, 08:42', status: 'Active' },
  { code: 'INVCTRL001', name: 'Amira Hussain', auth: 'Microsoft Entra ID', role: 'INVENTORY_CONTROLLER', scope: 'FIVE_PALM / All stores', lastLogin: '18 Jun 2024, 07:58', status: 'Active' },
  { code: 'PROCMGR001', name: 'Nikhil Menon', auth: 'Microsoft Entra ID', role: 'PROCUREMENT_MANAGER', scope: 'FIVE / All properties', lastLogin: '17 Jun 2024, 19:11', status: 'Active' },
  { code: 'FINMGR001', name: 'Leena Dsouza', auth: 'SILA Local Login', role: 'FINANCE_MANAGER', scope: 'FIVE / All properties', lastLogin: '14 Jun 2024, 16:25', status: 'Suspended' },
];
const roles: Row[] = [
  { code: 'STORE_MANAGER', name: 'Store manager', members: '8', permissions: '24 of 48', scope: 'Store', status: 'Active' },
  { code: 'INVENTORY_CONTROLLER', name: 'Inventory controller', members: '3', permissions: '31 of 48', scope: 'Property', status: 'Active' },
  { code: 'PROCUREMENT_MANAGER', name: 'Procurement manager', members: '2', permissions: '37 of 48', scope: 'Customer', status: 'Active' },
  { code: 'FINANCE_MANAGER', name: 'Finance manager', members: '2', permissions: '41 of 48', scope: 'Customer', status: 'Active' },
];

const resourceConfig: Record<string, { title: string; eyebrow: string; description: string; columns: string[]; rows: Row[]; filters: string[] }> = {
  customers: { title: 'Customers', eyebrow: 'Command center / Tenants', description: 'Manage customer identity, finance defaults, and platform activation.', columns: ['code', 'name', 'country', 'currency', 'timezone', 'erp', 'status'], rows: customers, filters: ['All customers', 'Active', 'Setup'] },
  properties: { title: 'Properties', eyebrow: 'Command center / Sites', description: 'Customer-scoped hospitality properties and their ERP plant mappings.', columns: ['code', 'name', 'customer', 'country', 'plant', 'status'], rows: properties, filters: ['All properties', 'Active', 'Ready'] },
  stores: { title: 'Stores', eyebrow: 'Command center / Inventory', description: 'Warehouses and operational stores mapped to a property and ERP location.', columns: ['code', 'name', 'property', 'type', 'mapped', 'status'], rows: stores, filters: ['All stores', 'Active', 'Attention'] },
  users: { title: 'Users', eyebrow: 'Command center / People', description: 'Mobile identities, role assignments, scope, and authentication posture.', columns: ['code', 'name', 'auth', 'role', 'scope', 'sharePoint', 'lastLogin', 'status'], rows: users, filters: ['All users', 'Active', 'Suspended'] },
  roles: { title: 'Roles & Permissions', eyebrow: 'Command center / Guardrails', description: 'Permission bundles that keep daily operations fast without widening access.', columns: ['code', 'name', 'members', 'permissions', 'scope', 'status'], rows: roles, filters: ['All roles', 'Active'] },
};

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  const tones = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold tracking-wide ${tones[tone]}`} data-testid={`status-${String(children).toLowerCase().replace(/\s/g, '-')}`}>{children}</span>;
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return <button type="button" aria-label={label} onClick={onClick} data-testid={`button-${label.toLowerCase().replace(/\s/g, '-')}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800">{children}</button>;
}

function ToastStack({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return <div className="fixed bottom-5 right-5 z-[60] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
    {toasts.map((toast) => <div key={toast.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-xl" data-testid={`toast-${toast.id}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toast.tone === 'info' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700'}`}><Check size={15} /></span>
      <span className="flex-1">{toast.message}</span><IconButton label="dismiss notification" onClick={() => dismiss(toast.id)}><X size={15} /></IconButton>
    </div>)}
  </div>;
}

 function Drawer({ title, open, onClose, onSave, initial, kind }: { title: string; open: boolean; onClose: () => void; onSave: (value: SaveValue) => void; initial: Row | null; kind?: string }) {
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER_MANAGER');
  const [customerScope, setCustomerScope] = useState('FIVE');
  const [propertyScope, setPropertyScope] = useState('*');
  const [storeScope, setStoreScope] = useState('*');
  const [status, setStatus] = useState('Active');
  const [sharePointSiteUrl, setSharePointSiteUrl] = useState('');
  const [sharePointFolderPath, setSharePointFolderPath] = useState('');
  const [sharePointFolderUrl, setSharePointFolderUrl] = useState('');

  useEffect(() => {
    setValue(initial?.name ?? '');
    setCode(initial?.code ?? '');
    setEmail(initial?.email ?? '');
    setPassword('');
    setRole(initial?.role ?? 'CUSTOMER_MANAGER');
    setCustomerScope(initial?.customerScope ?? 'FIVE');
    setPropertyScope(initial?.propertyScope ?? '*');
    setStoreScope(initial?.storeScope ?? '*');
    setStatus(initial?.status ?? 'Active');
    setSharePointSiteUrl(initial?.sharePointSiteUrl ?? '');
    setSharePointFolderPath(initial?.sharePointFolderPath ?? '');
    setSharePointFolderUrl(initial?.sharePointFolderUrl ?? '');
  }, [initial, open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" data-testid="drawer-resource">
    <button type="button" className="absolute inset-0 cursor-default bg-slate-950/30" onClick={onClose} aria-label="close drawer backdrop" data-testid="button-close-drawer-backdrop" />
    <div className="relative h-full w-full max-w-[480px] overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
      <div className="mb-8 flex items-start justify-between"><div><p className="kicker text-sky-700">{kind === 'users' ? 'Access record' : 'Configuration record'}</p><h2 className="mt-2 font-serif text-2xl font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{kind === 'users' ? 'Changes are persisted to the SILA Cloud API.' : 'Development workspace · changes are local only.'}</p></div><IconButton label="close drawer" onClick={onClose}><X size={18} /></IconButton></div>
      <div className="space-y-5">
        {kind === 'users' ? <><Field label="User code" value={code} onChange={setCode} placeholder="e.g. USER001" /><Field label="Display name" value={value} onChange={setValue} placeholder="Enter a clear name" /><Field label="Work email" value={email} onChange={setEmail} placeholder="name@company.com" /><Field label={initial ? 'New password (optional)' : 'Temporary password'} value={password} onChange={setPassword} placeholder={initial ? 'Leave blank to keep current password' : 'Enter a temporary password'} /><UserSelect label="User role" value={role} onChange={setRole} options={supportedUserRoles.map((item) => ({ value: item, label: roleLabels[item] }))} /><UserSelect label="Customer scope" value={customerScope} onChange={setCustomerScope} options={['*', 'FIVE', 'NOVA', 'ARC'].map((item) => ({ value: item, label: item === '*' ? 'All customers' : item }))} /><UserSelect label="Property scope" value={propertyScope} onChange={setPropertyScope} options={['*', 'FIVE_PALM', 'FIVE_ZABEEL', 'FIVE_JBR'].map((item) => ({ value: item, label: item === '*' ? 'All properties' : item }))} /><UserSelect label="Store scope" value={storeScope} onChange={setStoreScope} options={['*', 'MAIN_STORE', 'BEVERAGE_STORE', 'COLD_STORE'].map((item) => ({ value: item, label: item === '*' ? 'All stores' : item }))} /><UserSelect label="Status" value={status} onChange={setStatus} options={['Active', 'Suspended'].map((item) => ({ value: item, label: item }))} /><div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="mb-3"><p className="text-sm font-semibold text-slate-800">SharePoint folder access</p><p className="mt-1 text-xs leading-5 text-slate-500">Optional. Store the site and relative folder used by Cloud document workflows. SharePoint access remains managed by the connected server integration.</p></div><div className="space-y-4"><Field label="SharePoint site URL" value={sharePointSiteUrl} onChange={setSharePointSiteUrl} placeholder="https://tenant.sharepoint.com/sites/SILA" type="url" /><Field label="Document library / folder path" value={sharePointFolderPath} onChange={setSharePointFolderPath} placeholder="Invoices/FIVE-JVC" /><Field label="Folder link (optional)" value={sharePointFolderUrl} onChange={setSharePointFolderUrl} placeholder="https://tenant.sharepoint.com/..." type="url" /></div>{initial?.sharePointStatus && <p className="mt-3 text-xs text-amber-700">Current status: {initial.sharePointStatus}. Saving changes marks the link for verification.</p>}</div></> : <><Field label="Display name" value={value} onChange={setValue} placeholder="Enter a clear name" /><Field label="Customer scope" value="FIVE - Five Hospitality Group" onChange={() => undefined} select /><Field label="External code" value="FIVE_PALM" onChange={() => undefined} /></>}
        {kind !== 'users' && <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[.08em] text-slate-500">Notes</label><textarea className="min-h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none ring-sky-500 focus:ring-2" defaultValue="Configured for development validation." data-testid="input-record-notes" /></div>}
      </div>
        <div className="mt-10 flex gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid="button-cancel-drawer">Cancel</button><button type="button" onClick={() => onSave({ code, name: value, email, password: password || undefined, role, customerScope, propertyScope, storeScope, status, sharePointSiteUrl, sharePointFolderPath, sharePointFolderUrl })} className="flex-1 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800" data-testid="button-save-drawer">Save changes</button></div>
    </div>
  </div>;
}

function Field({ label, value, onChange, placeholder, select = false, options, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; select?: boolean; options?: Array<{ value: string; label: string }>; type?: string }) {
  return <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[.08em] text-slate-500">{label}</label>{select ? <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" data-testid={`select-${label.toLowerCase().replace(/\s/g, '-')}`}><option>{value}</option><option>All customer scopes</option></select> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" data-testid={`input-${label.toLowerCase().replace(/\s/g, '-')}`} />}</div>;
}

function UserSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[.08em] text-slate-500">{label}</label><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" data-testid={`select-${label.toLowerCase().replace(/\s/g, '-')}`}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>;
}

function MetricCard({ label, value, detail, icon: Icon, tone = 'sky' }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: 'sky' | 'green' | 'amber' | 'rose' }) {
  const toneMap = { sky: 'bg-sky-50 text-sky-700', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' };
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" data-testid={`card-metric-${label.toLowerCase().replace(/\s/g, '-')}`}><div className="flex items-start justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneMap[tone]}`}><Icon size={18} /></span></div><div className="mt-4 font-serif text-[30px] font-semibold leading-none text-slate-900">{value}</div><div className="mt-3 text-xs text-slate-500">{detail}</div></div>;
}

function Dashboard({ onToast }: { onToast: (message: string, tone?: Toast['tone']) => void }) {
  const [range, setRange] = useState('Today');
  return <div className="page-enter space-y-6">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="kicker text-sky-700">Tuesday · 18 June 2024</p><h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Good morning, platform team.</h1><p className="mt-2 text-sm text-slate-500">Here is the operational posture for your SILA Cloud workspace.</p></div><div className="flex items-center gap-2"><div className="flex rounded-lg border border-slate-200 bg-white p-1">{['Today', '7 days', '30 days'].map((item) => <button type="button" key={item} onClick={() => setRange(item)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${range === item ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`} data-testid={`button-range-${item.replace(/\s/g, '-')}`}>{item}</button>)}</div><button type="button" onClick={() => onToast('Dashboard data refreshed', 'info')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid="button-refresh-dashboard"><RotateCcw size={14} /> Refresh</button></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Readiness score" value="84%" detail="+6.4% from last review" icon={CheckCircle2} tone="green" /><MetricCard label="Pending approvals" value="12" detail="4 are past their SLA" icon={ClipboardCheck} tone="amber" /><MetricCard label="Integration health" value="96.8%" detail="1 connector needs attention" icon={Activity} tone="sky" /><MetricCard label="Active customers" value="2 / 3" detail="FIVE is fully operational" icon={Building2} tone="rose" /></div>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="kicker text-slate-400">Customer readiness</p><h2 className="mt-1 text-lg font-semibold text-slate-900">What needs your attention</h2></div><Link href="/readiness" className="text-xs font-semibold text-sky-700 hover:text-sky-900" data-testid="link-view-readiness">View readiness <ArrowRight className="ml-1 inline" size={13} /></Link></div><div className="mt-6 space-y-5">{[['FIVE', 'FIVE Hospitality Group', '96%', 'green', 'ERP connection and mobile policy are ready'], ['NOVA', 'Nova Lodging Co.', '78%', 'amber', '2 property mappings are incomplete'], ['ARC', 'Arcadia Resorts', '41%', 'rose', 'Customer setup paused at identity provider']].map(([code, name, score, tone, note]) => <div key={code} className="flex items-center gap-4" data-testid={`row-readiness-${code}`}><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-600">{code.slice(0, 2)}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-sm"><span className="truncate font-semibold text-slate-800">{name}</span><span className="font-mono text-xs text-slate-500">{score}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone === 'green' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: score }} /></div><p className="mt-1.5 text-xs text-slate-500">{note}</p></div></div>)}</div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="kicker text-slate-400">Queue health</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Approvals by age</h2></div><Link href="/approval-monitoring" className="text-xs font-semibold text-sky-700" data-testid="link-view-approval-queue">Open queue</Link></div><div className="mt-6 flex h-36 items-end gap-3 border-b border-slate-100 px-2 pb-0">{[['< 1h', 42, 'bg-sky-500'], ['1–4h', 27, 'bg-sky-400'], ['4–24h', 19, 'bg-amber-400'], ['> 24h', 8, 'bg-rose-400']].map(([label, amount, color]) => <div key={String(label)} className="flex flex-1 flex-col items-center gap-2"><span className="font-mono text-[10px] text-slate-500">{amount}</span><div className={`w-full rounded-t-md ${color}`} style={{ height: `${Number(amount) * 2.1}px` }} /><span className="mb-2 text-[10px] text-slate-400">{label}</span></div>)}</div><div className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} className="text-amber-600" /> 4 transactions need action before 12:00</div></div>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]"><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="kicker text-slate-400">Connector pulse</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Integration health</h2></div><Link href="/integration-monitoring" className="text-xs font-semibold text-sky-700" data-testid="link-integration-monitoring">Monitor integrations</Link></div><div className="mt-5 space-y-3">{[['SAP S/4HANA', 'ERP · FIVE', 'Operational', 'green'], ['Microsoft Entra ID', 'Identity · FIVE', 'Operational', 'green'], ['Oracle Fusion', 'ERP · ARC', 'Degraded', 'amber'], ['Odoo', 'ERP · NOVA', 'Operational', 'green']].map(([name, sub, status, tone]) => <div key={name} className="flex items-center justify-between rounded-lg border border-slate-100 p-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600"><ServerCog size={16} /></span><div><p className="text-sm font-semibold text-slate-800">{name}</p><p className="text-xs text-slate-500">{sub}</p></div></div><Badge tone={tone === 'green' ? 'success' : 'warning'}>{status}</Badge></div>)}</div></div><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="kicker text-slate-400">Audit stream</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Recent activity</h2></div><Link href="/audit" className="text-xs font-semibold text-sky-700" data-testid="link-view-audit">View audit</Link></div><div className="mt-5 space-y-4">{[['Leena Dsouza', 'changed FINMGR001 access', '8 min ago'], ['System', 'completed SAP connectivity test', '24 min ago'], ['Nikhil Menon', 'approved PO-240618-019', '1 hr ago'], ['Amira Hussain', 'updated mobile policy', '2 hr ago']].map(([name, action, time], index) => <div className="flex gap-3" key={action}><div className={`mt-1 h-2 w-2 rounded-full ${index === 0 ? 'bg-sky-500' : 'bg-slate-300'}`} /><div className="flex-1"><p className="text-sm text-slate-700"><span className="font-semibold">{name}</span> {action}</p><p className="mt-0.5 text-xs text-slate-400">{time}</p></div></div>)}</div></div></div>
  </div>;
}

function LegacyResourcePage({ kind, onToast }: { kind: string; onToast: (message: string, tone?: Toast['tone']) => void }) {
  const config = resourceConfig[kind];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(config.filters[0]);
  const [sortAsc, setSortAsc] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [rows, setRows] = useState(config.rows);
  const visible = useMemo(() => rows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase()) && (filter.startsWith('All') || row.status === filter)).sort((a, b) => sortAsc ? a[config.columns[0]].localeCompare(b[config.columns[0]]) : b[config.columns[0]].localeCompare(a[config.columns[0]])), [rows, query, filter, sortAsc, config.columns]);
  const openCreate = () => { setEditing(null); setDrawer(true); };
  const openEdit = (row: Row) => { setEditing(row); setDrawer(true); };
   const save = (value: SaveValue) => { if (editing) setRows((current) => current.map((row) => row.code === editing.code ? { ...row, name: value.name, ...(kind === 'users' && value.role ? { role: value.role } : {}) } : row)); else setRows((current) => [{ ...current[0], code: `DEV_${current.length + 1}`, name: value.name, ...(kind === 'users' && value.role ? { role: value.role } : {}), status: 'Setup' }, ...current]); setDrawer(false); onToast(editing ? 'Configuration updated locally' : 'Draft configuration created locally'); };
  const toggle = (code: string) => { setRows((current) => current.map((row) => row.code === code ? { ...row, status: row.status === 'Active' ? 'Suspended' : 'Active' } : row)); onToast('Status changed in development data', 'info'); };
  const title = config.title;
    return <div className="page-enter space-y-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="kicker text-sky-700">{config.eyebrow}</p><h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">{title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">{config.description}</p></div><button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-800" data-testid={`button-create-${kind}`}><Plus size={16} /> Add {kind === 'roles' ? 'role' : kind === 'users' ? 'user' : kind.slice(0, -1)}</button></div><div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" data-testid={`input-search-${kind}`} /></div><div className="flex items-center gap-1 overflow-x-auto">{config.filters.map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold ${filter === item ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`} data-testid={`button-filter-${item.toLowerCase().replace(/\s/g, '-')}`}>{item}</button>)}</div><button type="button" onClick={() => onToast('Advanced filters are ready for API wiring', 'info')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" data-testid={`button-advanced-filter-${kind}`}><Filter size={14} /> Filters</button></div><div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {visible.length} records in current view</div><button type="button" onClick={() => setSortAsc((value) => !value)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-sky-700" data-testid={`button-sort-${kind}`}><SlidersHorizontal size={14} /> Sort by code <ChevronDown size={13} className={sortAsc ? '' : 'rotate-180'} /></button></div><div className="content-scroll overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50/80"><tr>{config.columns.map((column) => <th key={column} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{column === 'code' ? 'Code' : column === 'lastLogin' ? 'Last login' : column}</th>)}<th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((row) => <tr key={row.code} className="group hover:bg-sky-50/30" data-testid={`row-${kind}-${row.code}`}><td className="px-5 py-4 font-mono text-xs font-bold text-slate-800">{row.code}</td>{config.columns.slice(1).map((column) => <td key={column} className="px-5 py-4 text-sm text-slate-600">{column === 'status' ? <Badge tone={row[column] === 'Active' || row[column] === 'Ready' ? 'success' : row[column] === 'Suspended' ? 'danger' : 'warning'}>{row[column]}</Badge> : <span className={column === 'role' || column === 'mapped' || column === 'plant' ? 'font-mono text-xs' : ''}>{row[column]}</span>}</td>)}<td className="px-5 py-3"><div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100"><IconButton label={`edit ${row.code}`} onClick={() => openEdit(row)}><Pencil size={15} /></IconButton><IconButton label={`toggle ${row.code}`} onClick={() => toggle(row.code)}><Power size={15} /></IconButton><IconButton label={`view ${row.code}`} onClick={() => onToast(`${row.code} details opened`, 'info')}><Eye size={15} /></IconButton></div></td></tr>)}</tbody></table>{visible.length === 0 && <div className="p-12 text-center"><Search className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-semibold text-slate-700">No matching records</p><p className="mt-1 text-xs text-slate-500">Try another search or clear the current filter.</p></div>}</div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><span className="text-xs text-slate-500">Showing 1–{visible.length} of {visible.length} records</span><div className="flex gap-1"><IconButton label="previous page" onClick={() => onToast('Already on the first page', 'info')}><ChevronLeft size={15} /></IconButton><span className="flex h-8 min-w-8 items-center justify-center rounded-md bg-sky-50 px-2 font-mono text-xs font-bold text-sky-700">1</span><IconButton label="next page" onClick={() => onToast('No additional pages in development data', 'info')}><ChevronRight size={15} /></IconButton></div></div></div><Drawer title={editing ? `Edit ${editing.code}` : `New ${kind === 'roles' ? 'role' : kind.slice(0, -1)}`} initial={editing} kind={kind} open={drawer} onClose={() => setDrawer(false)} onSave={save} /></div>;
}

function UserResourcePage({ canManageUsers, onToast }: { canManageUsers: boolean; onToast: (message: string, tone?: Toast['tone']) => void }) {
  const config = resourceConfig.users;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(config.filters[0]);
  const [sortAsc, setSortAsc] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const records = await listUsers();
      setRows(records.map(userToRow));
    } catch (error) {
      onToast(errorMessage(error, 'Could not load users'), 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const visible = useMemo(
    () => rows
      .filter((row) => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase()) && (filter.startsWith('All') || row.status === filter))
      .sort((a, b) => sortAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code)),
    [rows, query, filter, sortAsc],
  );
  const openCreate = () => { setEditing(null); setDrawer(true); };
  const openEdit = (row: Row) => { setEditing(row); setDrawer(true); };

  const save = async (value: SaveValue) => {
    try {
      if (editing) {
        const payload: UserUpdate = {
          name: value.name,
          email: value.email,
          role: value.role,
          customerScope: value.customerScope,
          propertyScope: value.propertyScope,
          storeScope: value.storeScope,
          status: value.status,
          sharePointSiteUrl: value.sharePointSiteUrl?.trim() || null,
          sharePointFolderPath: value.sharePointFolderPath?.trim() || null,
          sharePointFolderUrl: value.sharePointFolderUrl?.trim() || null,
          ...(value.password ? { password: value.password } : {}),
        };
        const updated = await updateUser(Number(editing.id), payload);
        setRows((current) => current.map((row) => row.id === editing.id ? userToRow(updated) : row));
        onToast(`${updated.code} updated`);
      } else {
        if (!value.code || !value.email || !value.password || !value.role || !value.customerScope || !value.propertyScope || !value.storeScope) {
          onToast('Complete the code, email, password, role, and scope fields.', 'info');
          return;
        }
        const payload: UserInput = {
          code: value.code,
          email: value.email,
          name: value.name,
          role: value.role,
          customerScope: value.customerScope,
          propertyScope: value.propertyScope,
          storeScope: value.storeScope,
          password: value.password,
          ...(value.sharePointSiteUrl?.trim() || value.sharePointFolderPath?.trim() || value.sharePointFolderUrl?.trim()
            ? {
                sharePointSiteUrl: value.sharePointSiteUrl?.trim() || null,
                sharePointFolderPath: value.sharePointFolderPath?.trim() || null,
                sharePointFolderUrl: value.sharePointFolderUrl?.trim() || null,
              }
            : {}),
        };
        const created = await createUser(payload);
        setRows((current) => [userToRow(created), ...current]);
        onToast(`${created.code} created`);
      }
      setDrawer(false);
    } catch (error) {
      onToast(errorMessage(error, 'Could not save user'), 'info');
    }
  };

  const toggle = async (row: Row) => {
    try {
      const updated = await updateUser(Number(row.id), { status: row.status === 'Active' ? 'Suspended' : 'Active' });
      setRows((current) => current.map((item) => item.id === row.id ? userToRow(updated) : item));
      onToast(`${updated.code} is now ${updated.status}`, 'info');
    } catch (error) {
      onToast(errorMessage(error, 'Could not change user status'), 'info');
    }
  };

  return <div className="page-enter space-y-5">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="kicker text-sky-700">{config.eyebrow}</p><h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">{config.title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">{config.description}</p></div>{canManageUsers ? <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-800" data-testid="button-create-users"><Plus size={16} /> Add user</button> : <Badge tone="info">View only</Badge>}</div>
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" data-testid="input-search-users" /></div><div className="flex items-center gap-1 overflow-x-auto">{config.filters.map((item) => <button type="button" key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold ${filter === item ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`} data-testid={`button-filter-${item.toLowerCase().replace(/\s/g, '-')}`}>{item}</button>)}</div><button type="button" onClick={() => void refresh()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" data-testid="button-refresh-users"><RotateCcw size={14} /> Refresh</button></div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {loading ? 'Loading users…' : `${visible.length} records in current view`}</div><button type="button" onClick={() => setSortAsc((value) => !value)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-sky-700" data-testid="button-sort-users"><SlidersHorizontal size={14} /> Sort by code <ChevronDown size={13} className={sortAsc ? '' : 'rotate-180'} /></button></div><div className="content-scroll overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead className="bg-slate-50/80"><tr>{config.columns.map((column) => <th key={column} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{column === 'code' ? 'Code' : column === 'lastLogin' ? 'Last login' : column}</th>)}<th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.map((row) => <tr key={row.id} className="group hover:bg-sky-50/30" data-testid={`row-users-${row.code}`}><td className="px-5 py-4 font-mono text-xs font-bold text-slate-800">{row.code}</td>{config.columns.slice(1).map((column) => <td key={column} className="px-5 py-4 text-sm text-slate-600">{column === 'status' ? <Badge tone={row[column] === 'Active' ? 'success' : 'danger'}>{row[column]}</Badge> : <span className={column === 'role' ? 'font-mono text-xs' : ''}>{row[column]}</span>}</td>)}<td className="px-5 py-3"><div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100">{canManageUsers && <><IconButton label={`edit ${row.code}`} onClick={() => openEdit(row)}><Pencil size={15} /></IconButton><IconButton label={`toggle ${row.code}`} onClick={() => void toggle(row)}><Power size={15} /></IconButton></>}<IconButton label={`view ${row.code}`} onClick={() => onToast(`${row.code} details opened`, 'info')}><Eye size={15} /></IconButton></div></td></tr>)}</tbody></table>{!loading && visible.length === 0 && <div className="p-12 text-center"><Search className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-semibold text-slate-700">No matching users</p><p className="mt-1 text-xs text-slate-500">Try another search or clear the current filter.</p></div>}</div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-3"><span className="text-xs text-slate-500">Showing {loading ? 0 : 1}–{visible.length} of {visible.length} records</span><span className="font-mono text-xs text-slate-400">API-backed</span></div></div>
    {canManageUsers && <Drawer title={editing ? `Edit ${editing.code}` : 'New user'} initial={editing} kind="users" open={drawer} onClose={() => setDrawer(false)} onSave={(value) => void save(value)} />}
  </div>;
}

type AdministrationDomain = 'mobile' | 'cloud';
type AdministrationUser = MobileAdministrationUser | CloudAdministrationUser;

const administrationRoles: Record<AdministrationDomain, Array<{ value: string; label: string }>> = {
  mobile: [
    { value: 'MOBILE_SUPER_ADMIN', label: 'Mobile super admin' },
    { value: 'STORE_MANAGER', label: 'Store manager' },
    { value: 'INVENTORY_CONTROLLER', label: 'Inventory controller' },
    { value: 'PROCUREMENT_MANAGER', label: 'Procurement manager' },
    { value: 'FINANCE_MANAGER', label: 'Finance manager' },
  ],
  cloud: [
    { value: 'CLOUD_SUPER_ADMIN', label: 'Cloud super admin' },
    { value: 'CUSTOMER_SUPPORT_COORDINATOR', label: 'Customer support coordinator' },
    { value: 'CUSTOMER_MANAGER', label: 'Customer manager' },
    { value: 'SUPER_ADMIN', label: 'Platform super admin' },
  ],
};

function AdministrationUserPage({ domain, onToast }: { domain: AdministrationDomain; onToast: (message: string, tone?: Toast['tone']) => void }) {
  const [rows, setRows] = useState<AdministrationUser[]>([]);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [propertiesList, setPropertiesList] = useState<Array<{ id: number; customerId: number; code: string; name: string }>>([]);
  const [storesList, setStoresList] = useState<Array<{ id: number; propertyId: number; code: string; name: string }>>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editing, setEditing] = useState<AdministrationUser | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      if (domain === 'mobile') {
        const [userRows, customerRows, propertyRows, storeRows] = await Promise.all([listMobileUsers(), listCustomers(), listProperties(), listStores()]);
        setRows(userRows);
        setCustomersList(customerRows);
        setPropertiesList(propertyRows);
        setStoresList(storeRows);
      } else {
        setRows(await listCloudUsers());
      }
    } catch (error) {
      onToast(errorMessage(error, `Could not load ${domain} users`), 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [domain]);

  const visible = useMemo(() => rows
    .filter((row) => `${row.displayName} ${row.email} ${row.roleCodes.join(' ')} ${row.status}`.toLowerCase().includes(query.toLowerCase()))
    .filter((row) => statusFilter === 'ALL' || row.status === statusFilter), [rows, query, statusFilter]);

  const save = async (value: {
    displayName: string; email: string; roleCode: string; password: string;
    customerId: string; propertyId: string; storeId: string; status: string;
  }) => {
    if (!value.displayName.trim() || !value.email.trim() || !value.roleCode) {
      onToast('Name, email, and role are required.', 'info');
      return;
    }
    try {
      if (domain === 'mobile') {
        const body = {
          email: value.email.trim(),
          displayName: value.displayName.trim(),
          roleCodes: [value.roleCode],
          customerId: Number(value.customerId),
          propertyIds: [Number(value.propertyId)],
          storeIds: [Number(value.storeId)],
          ...(value.password ? { temporaryPassword: value.password } : {}),
        };
        if (editing) {
          const saved = await updateMobileUser(editing.id, { ...body, status: value.status as 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' } as never);
          setRows((current) => current.map((row) => row.id === saved.id ? saved : row));
          onToast('Mobile user updated.');
        } else {
          const saved = await createMobileUser(body);
          setRows((current) => [saved, ...current]);
          onToast(`Mobile user created. Notification: ${saved.notification.status}.`);
        }
      } else {
        const body = {
          email: value.email.trim(),
          displayName: value.displayName.trim(),
          roleCodes: [value.roleCode],
          ...(value.password ? { temporaryPassword: value.password } : {}),
        };
        if (editing) {
          const saved = await updateCloudUser(editing.id, { ...body, status: value.status as 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' } as never);
          setRows((current) => current.map((row) => row.id === saved.id ? saved : row));
          onToast('Cloud user updated.');
        } else {
          const saved = await createCloudUser(body);
          setRows((current) => [saved, ...current]);
          onToast(`Cloud user created. Notification: ${saved.notification.status}.`);
        }
      }
      setDrawer(false);
    } catch (error) {
      onToast(errorMessage(error, 'Could not save user'), 'info');
    }
  };

  const changeStatus = async (row: AdministrationUser, status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED') => {
    try {
      const saved = domain === 'mobile'
        ? await updateMobileUser(row.id, { status } as never)
        : await updateCloudUser(row.id, { status } as never);
      setRows((current) => current.map((item) => item.id === saved.id ? saved : item));
      onToast(`${row.displayName} is now ${status.toLowerCase()}.`, 'info');
    } catch (error) {
      onToast(errorMessage(error, 'Could not change user status'), 'info');
    }
  };

  const reset = async (row: AdministrationUser, resend = false) => {
    try {
      const result = resend
        ? await resendAdministrationUserCredentials(domain, row.id)
        : await resetAdministrationUserPassword(domain, row.id);
      onToast(`${resend ? 'New credentials' : 'Password reset'}: ${result.notification.status}.`, 'info');
      await refresh();
    } catch (error) {
      onToast(errorMessage(error, 'Could not reset the password'), 'info');
    }
  };

  const title = domain === 'mobile' ? 'Mobile Users' : 'Cloud Users';
  const description = domain === 'mobile'
    ? 'Manage SILA Store identities, customer hierarchy access, mobile roles, and first-login credentials.'
    : 'Manage SILA Cloud operators. Cloud users never receive customer, property, or store access fields.';

  return <div className="page-enter space-y-5">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="kicker text-sky-700">Command center / Identity administration</p><h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">{title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p></div>
      <button type="button" onClick={() => { setEditing(null); setDrawer(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-800" data-testid={`button-create-${domain}-user`}><Plus size={16} /> Add {domain} user</button>
    </div>
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${domain} users...`} className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" data-testid={`input-search-${domain}-users`} /></div>
      {['ALL', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'].map((status) => <button type="button" key={status} onClick={() => setStatusFilter(status)} className={`rounded-md px-3 py-2 text-xs font-semibold ${statusFilter === status ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{status === 'ALL' ? 'All users' : status}</button>)}
      <button type="button" onClick={() => void refresh()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" data-testid={`button-refresh-${domain}-users`}><RotateCcw size={14} /> Refresh</button>
    </div>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3"><span className="text-xs text-slate-500">{loading ? 'Loading users…' : `${visible.length} users in current view`}</span><Badge tone="info">{domain === 'mobile' ? 'SILA Store domain' : 'SILA Cloud domain'}</Badge></div>
      <div className="content-scroll overflow-x-auto"><table className="w-full min-w-[920px] text-left"><thead className="bg-slate-50/80"><tr>{['User', 'Role', domain === 'mobile' ? 'Organization access' : 'Password posture', 'Last login', 'Status', ''].map((head) => <th key={head} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
        {visible.map((row) => <tr key={row.id} className="group hover:bg-sky-50/30" data-testid={`row-${domain}-user-${row.id}`}><td className="px-5 py-4"><p className="text-sm font-semibold text-slate-800">{row.displayName}</p><p className="mt-1 text-xs text-slate-500">{row.email}</p></td><td className="px-5 py-4"><div className="flex flex-wrap gap-1">{row.roleCodes.map((role) => <span key={role} className="rounded bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-600">{role}</span>)}</div></td><td className="px-5 py-4 text-sm text-slate-600">{domain === 'mobile' ? <><p>{(row as MobileAdministrationUser).customer?.code ?? 'Unassigned'}</p><p className="mt-1 text-xs text-slate-400">{(row as MobileAdministrationUser).propertyIds.length} properties · {(row as MobileAdministrationUser).storeIds.length} stores</p></> : <Badge tone={row.mustChangePassword ? 'warning' : 'success'}>{row.mustChangePassword ? 'Change required' : 'Set'}</Badge>}</td><td className="px-5 py-4 text-xs text-slate-500">{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : 'Never'}</td><td className="px-5 py-4"><Badge tone={row.status === 'ACTIVE' ? 'success' : row.status === 'SUSPENDED' ? 'warning' : 'danger'}>{row.status}</Badge>{row.notificationStatus && <p className="mt-1 text-[10px] text-amber-700">Email: {row.notificationStatus}</p>}</td><td className="px-5 py-3"><div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100"><IconButton label={`edit ${row.displayName}`} onClick={() => { setEditing(row); setDrawer(true); }}><Pencil size={15} /></IconButton><IconButton label={`reset ${row.displayName} password`} onClick={() => void reset(row)}><KeyRound size={15} /></IconButton><IconButton label={`resend ${row.displayName} credentials`} onClick={() => void reset(row, true)}><RotateCcw size={15} /></IconButton>{row.status === 'ACTIVE' ? <IconButton label={`suspend ${row.displayName}`} onClick={() => void changeStatus(row, 'SUSPENDED')}><Power size={15} /></IconButton> : <IconButton label={`activate ${row.displayName}`} onClick={() => void changeStatus(row, 'ACTIVE')}><CheckCircle2 size={15} /></IconButton>}<IconButton label={`deactivate ${row.displayName}`} onClick={() => void changeStatus(row, 'DEACTIVATED')}><UserX size={15} /></IconButton></div></td></tr>)}
      </tbody></table>{!loading && visible.length === 0 && <div className="p-12 text-center"><Search className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-semibold text-slate-700">No matching users</p><p className="mt-1 text-xs text-slate-500">Try another search or clear the current filter.</p></div>}</div>
    </div>
    <AdministrationUserDrawer domain={domain} initial={editing} open={drawer} customers={customersList} properties={propertiesList} stores={storesList} onClose={() => setDrawer(false)} onSave={save} />
  </div>;
}

function AdministrationUserDrawer({ domain, initial, open, customers: customerOptions, properties: propertyOptions, stores: storeOptions, onClose, onSave }: {
  domain: AdministrationDomain; initial: AdministrationUser | null; open: boolean;
  customers: Customer[]; properties: Array<{ id: number; customerId: number; code: string; name: string }>; stores: Array<{ id: number; propertyId: number; code: string; name: string }>;
  onClose: () => void; onSave: (value: { displayName: string; email: string; roleCode: string; password: string; customerId: string; propertyId: string; storeId: string; status: string }) => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState(administrationRoles[domain][0]?.value ?? '');
  const [password, setPassword] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  useEffect(() => {
    const mobile = initial as MobileAdministrationUser | null;
    setDisplayName(initial?.displayName ?? ''); setEmail(initial?.email ?? '');
    setRoleCode(initial?.roleCodes[0] ?? administrationRoles[domain][0]?.value ?? '');
    setPassword(''); setStatus(initial?.status ?? 'ACTIVE');
    setCustomerId(mobile?.customer?.id ? String(mobile.customer.id) : customerOptions[0] ? String(customerOptions[0].id) : '');
    setPropertyId(mobile?.propertyIds[0] ? String(mobile.propertyIds[0]) : propertyOptions[0] ? String(propertyOptions[0].id) : '');
    setStoreId(mobile?.storeIds[0] ? String(mobile.storeIds[0]) : storeOptions[0] ? String(storeOptions[0].id) : '');
  }, [initial, open, domain, customerOptions, propertyOptions, storeOptions]);
  if (!open) return null;
  const filteredProperties = propertyOptions.filter((property) => !customerId || property.customerId === Number(customerId));
  const filteredStores = storeOptions.filter((store) => !propertyId || store.propertyId === Number(propertyId));
  return <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" data-testid={`drawer-${domain}-user`}><button type="button" className="absolute inset-0 cursor-default bg-slate-950/30" onClick={onClose} aria-label="close drawer backdrop" /><div className="relative h-full w-full max-w-[480px] overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl"><div className="mb-8 flex items-start justify-between"><div><p className="kicker text-sky-700">{domain === 'mobile' ? 'SILA Store identity' : 'SILA Cloud identity'}</p><h2 className="mt-2 font-serif text-2xl font-semibold text-slate-900">{initial ? 'Edit user' : 'Create user'}</h2><p className="mt-1 text-sm text-slate-500">Passwords are hashed and never stored in notification records.</p></div><IconButton label="close user drawer" onClick={onClose}><X size={18} /></IconButton></div><div className="space-y-4"><Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Full name" /><Field label="Work email" value={email} onChange={setEmail} placeholder="name@company.com" type="email" /><UserSelect label="Role" value={roleCode} onChange={setRoleCode} options={administrationRoles[domain]} />{domain === 'mobile' && <><UserSelect label="Customer" value={customerId} onChange={(value) => { setCustomerId(value); setPropertyId(''); setStoreId(''); }} options={[{ value: '', label: 'Select customer' }, ...customerOptions.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))]} /><UserSelect label="Property" value={propertyId} onChange={(value) => { setPropertyId(value); setStoreId(''); }} options={[{ value: '', label: 'Select property' }, ...filteredProperties.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))]} /><UserSelect label="Store" value={storeId} onChange={setStoreId} options={[{ value: '', label: 'Select store' }, ...filteredStores.map((item) => ({ value: String(item.id), label: `${item.code} · ${item.name}` }))]} /></>}<Field label={initial ? 'New temporary password (optional)' : 'Temporary password (optional)'} value={password} onChange={setPassword} placeholder="12+ chars: upper, lower, number, symbol" type="password" />{initial && <UserSelect label="Status" value={status} onChange={setStatus} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }, { value: 'DEACTIVATED', label: 'Deactivated' }]} />}<div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-800">If no temporary password is entered, the server generates one and records only the notification delivery status.</div></div><div className="mt-10 flex gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => onSave({ displayName, email, roleCode, password, customerId, propertyId, storeId, status })} className="flex-1 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800" data-testid={`button-save-${domain}-user`}>Save user</button></div></div></div>;
}

function ResourcePage({ kind, onToast, canManageUsers = false }: { kind: string; onToast: (message: string, tone?: Toast['tone']) => void; canManageUsers?: boolean }) {
  return kind === 'users' ? <UserResourcePage canManageUsers={canManageUsers} onToast={onToast} /> : <LegacyResourcePage kind={kind} onToast={onToast} />;
}

function SectionPage({ title, eyebrow, description, onToast, children, action }: { title: string; eyebrow: string; description: string; onToast: (message: string, tone?: Toast['tone']) => void; children: ReactNode; action?: ReactNode }) {
  return <div className="page-enter space-y-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="kicker text-sky-700">{eyebrow}</p><h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">{title}</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">{description}</p></div>{action || <button type="button" onClick={() => onToast('Saved to development workspace')} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800" data-testid={`button-save-${title.toLowerCase().replace(/\s/g, '-')}`}><Check size={16} /> Save configuration</button>}</div>{children}</div>;
}

function ConfigPage({ kind, onToast }: { kind: string; onToast: (message: string, tone?: Toast['tone']) => void }) {
  const configs: Record<string, { title: string; eyebrow: string; description: string; groups: [string, string, string, boolean][] }> = {
    authentication: { title: 'Authentication', eyebrow: 'Control plane / Identity', description: 'Define how operators sign in and how external identities resolve to SILA users.', groups: [['SILA Local Login', 'Password policy, reset rules, and session lifetime', 'Configured', true], ['Identity Providers', 'Microsoft Entra ID · 1 connected provider', 'Healthy', true], ['Domain Mapping', 'fivehotels.com → Microsoft Entra ID', '1 mapping', true], ['Microsoft Tenants', 'FIVE production tenant', 'Configured', true], ['SSO Health Check', 'Last checked 18 Jun 2024 at 08:40', 'Passed', true], ['External Identity Mapping', '12 identities mapped · 1 pending match', 'Review', false]] },
    erp: { title: 'ERP Connections', eyebrow: 'Control plane / Systems', description: 'Safe, capability-level connections to customer ERP systems. Secrets remain hidden.', groups: [['SAP S/4HANA', 'FIVE · Production connection', 'Configured', true], ['Odoo', 'NOVA · Sandbox connection', 'Configured', true], ['Oracle Fusion', 'ARC · Connection draft', 'Not configured', false], ['API capabilities', 'Materials · suppliers · inventory · approvals', '12 enabled', true]] },
    mobile: { title: 'Mobile Configuration', eyebrow: 'Control plane / Experience', description: 'Versioned mobile policies for receiving, inventory, transfers, and batch control.', groups: [['Feature set', 'Receiving · issue · transfer · stock count', 'v3.4 active', true], ['Receiving controls', 'PO required · quantity variance enabled', 'Configured', true], ['Inventory controls', 'Blind count · recount threshold 2.5%', 'Configured', true], ['Transfer controls', 'Two-step dispatch and receipt', 'Configured', true], ['Batch & expiry', 'Expiry capture required for perishables', 'Configured', true]] },
    notifications: { title: 'Notifications', eyebrow: 'Configuration / Signals', description: 'Route operational events to the people who can resolve them.', groups: [['Approval reminders', 'Email + in-app · 4 hour cadence', 'Enabled', true], ['ERP execution failures', 'In-app · Finance managers', 'Enabled', true], ['SSO health degradation', 'Email · Platform admins', 'Enabled', true], ['Daily readiness digest', 'Email · Customer admins · 08:00 local', 'Disabled', false]] },
    'transaction-types': { title: 'Transaction Types', eyebrow: 'Configuration / Controls', description: 'Define which transactions enter approval and which connect to ERP execution.', groups: [['Purchase Order', 'Approval required · ERP execution enabled', 'Active', true], ['Goods Receipt', 'Approval not required · ERP execution enabled', 'Active', true], ['Stock Transfer', 'Approval required above threshold', 'Active', true], ['Inventory Adjustment', 'Approval required · variance based', 'Active', true], ['Supplier Return', 'Approval required · ERP execution enabled', 'Draft', false]] },
     settings: { title: 'System Settings', eyebrow: 'Configuration / Workspace', description: 'Workspace defaults for security, data retention, and operator experience.', groups: [['Workspace identity', 'SILA Cloud · Development workspace', 'Development', true], ['Session security', '30 minute idle timeout · MFA encouraged', 'Configured', true], ['Audit retention', 'Immutable logs retained for 365 days', 'Configured', true], ['Regional defaults', 'INR · Asia/Kolkata · English', 'Configured', true]] },
  };
  const info = configs[kind];
  const [enabled, setEnabled] = useState(info.groups.map((group) => group[3]));
  return <SectionPage title={info.title} eyebrow={info.eyebrow} description={info.description} onToast={onToast}><div className="grid gap-4 lg:grid-cols-2">{info.groups.map((group, index) => <div key={group[0]} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" data-testid={`card-config-${group[0].toLowerCase().replace(/\s/g, '-')}`}><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-slate-900">{group[0]}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{group[1]}</p></div><button type="button" onClick={() => { setEnabled((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value)); onToast(`${group[0]} ${enabled[index] ? 'disabled' : 'enabled'} locally`, 'info'); }} className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 ${enabled[index] ? 'bg-emerald-600' : 'bg-slate-300'}`} aria-label={`toggle ${group[0]}`} data-testid={`button-toggle-${group[0].toLowerCase().replace(/\s/g, '-')}`}><span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled[index] ? 'translate-x-5' : ''}`} /></button></div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3"><Badge tone={enabled[index] ? group[2] === 'Review' ? 'warning' : 'success' : 'neutral'}>{enabled[index] ? group[2] : 'Disabled'}</Badge><button type="button" onClick={() => onToast(`Editing ${group[0]} settings`, 'info')} className="text-xs font-semibold text-sky-700 hover:text-sky-900" data-testid={`button-edit-config-${index}`}>Edit settings <ArrowRight className="ml-1 inline" size={12} /></button></div></div>)}</div></SectionPage>;
}

function OcrAgentPage({ onToast }: { onToast: (message: string, tone?: Toast['tone']) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [configs, setConfigs] = useState<OcrAgentConfiguration[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [model, setModel] = useState('gemini-3-flash-preview');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedConfig = configs.find((config) => config.customerId === Number(customerId));

  useEffect(() => {
    let cancelled = false;
    Promise.all([listCustomers(), listOcrAgentConfigurations()])
      .then(([customerRows, configRows]) => {
        if (cancelled) return;
        setCustomers(customerRows);
        setConfigs(configRows);
        const firstCustomer = customerRows[0];
        if (firstCustomer) setCustomerId(String(firstCustomer.id));
      })
      .catch((error) => {
        if (!cancelled) onToast(errorMessage(error, 'Could not load OCR agent configuration'), 'info');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!customerId) return;
    const config = configs.find((item) => item.customerId === Number(customerId));
    setName(config?.name ?? '');
    setModel(config?.model ?? 'gemini-3-flash-preview');
    setEnabled(config?.status === 'Active');
  }, [configs, customerId]);

  const save = async () => {
    if (!customerId || !name.trim() || !model.trim()) {
      onToast('Customer, agent name, and model are required', 'info');
      return;
    }
    setSaving(true);
    try {
      const saved = await updateOcrAgentConfiguration({
        customerId: Number(customerId),
        name: name.trim(),
        model: model.trim(),
        enabled,
      });
      setConfigs((current) => [...current.filter((item) => item.customerId !== saved.customerId), saved]);
      onToast(`${saved.customerCode} OCR agent configuration saved`, 'success');
    } catch (error) {
      onToast(errorMessage(error, 'Could not save OCR agent configuration'), 'info');
    } finally {
      setSaving(false);
    }
  };

  return <SectionPage
    title="OCR Agent"
    eyebrow="Control plane / Invoice fallback"
    description="Link the cloud-side OCR agent used when mobile extraction is incomplete or purchase-order matching remains unresolved."
    onToast={onToast}
    action={<button type="button" onClick={() => void save()} disabled={saving || loading} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-save-ocr-agent"><Check size={16} /> {saving ? 'Saving…' : 'Save configuration'}</button>}
  >
    <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><ScanLine size={19} /></span>
          <div><h2 className="font-semibold text-slate-900">Configured fallback agent</h2><p className="mt-1 text-sm leading-6 text-slate-500">The API resolves this configuration by customer. Credentials remain server-side and are not accepted from mobile.</p></div>
        </div>
        <div className="mt-6 space-y-4">
          <Field
            label="Customer"
            value={customerId}
            onChange={setCustomerId}
            select
            options={[{ value: '', label: 'Select customer' }, ...customers.map((customer) => ({ value: String(customer.id), label: `${customer.code} · ${customer.name}` }))]}
          />
          <Field label="Agent name" value={name} onChange={setName} placeholder="Invoice OCR fallback agent" />
          <Field label="Model" value={model} onChange={setModel} placeholder="gemini-3-flash-preview" />
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div><p className="text-sm font-semibold text-slate-800">Enable cloud fallback</p><p className="mt-1 text-xs text-slate-500">Used only when mobile extraction or PO matching needs assistance.</p></div>
            <button type="button" onClick={() => setEnabled((value) => !value)} className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 ${enabled ? 'bg-emerald-600' : 'bg-slate-300'}`} aria-label="toggle cloud OCR fallback" data-testid="button-toggle-ocr-agent"><span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : ''}`} /></button>
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-sm">
        <p className="kicker text-cyan-300">Runtime behavior</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold">Mobile first, Cloud fallback</h2>
        <div className="mt-6 space-y-3 text-sm leading-6 text-slate-300">
          <p>1. Mobile captures and extracts the invoice.</p>
          <p>2. Cloud stores the source file in SharePoint and keeps the invoice scoped to the customer, property, and store.</p>
          <p>3. If extraction or PO matching is unresolved, Cloud selects the active configured agent for that customer.</p>
          <p>4. Only the Cloud API can continue to ERP invoice creation after review and confirmation.</p>
        </div>
        <div className="mt-7 flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-slate-400"><ShieldCheck size={15} className="text-emerald-400" /> {selectedConfig?.status === 'Active' ? `${selectedConfig.name} is active for ${selectedConfig.customerCode}` : 'No active fallback is configured for this customer'}</div>
      </div>
    </div>
  </SectionPage>;
}

function Simulator({ onToast }: { onToast: (message: string, tone?: Toast['tone']) => void }) {
  const [amount, setAmount] = useState('87500');
  const [variance, setVariance] = useState('3.2');
  const [result, setResult] = useState(false);
  return <SectionPage title="Workflow Simulator" eyebrow="Control plane / Test bench" description="Run a transaction through the active approval rules before it reaches production." onToast={onToast} action={<span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"><Code2 size={14} /> Development simulator</span>}><div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Zap size={18} /></span><div><h2 className="font-semibold text-slate-900">Test transaction</h2><p className="text-xs text-slate-500">Inputs are not saved.</p></div></div><div className="space-y-4"><Field label="Transaction type" value="Purchase Order" onChange={() => undefined} select /><Field label="Customer" value="FIVE" onChange={() => undefined} select /><Field label="Property" value="FIVE_PALM" onChange={() => undefined} select /><Field label="Amount (INR)" value={amount} onChange={setAmount} /><Field label="Variance (%)" value={variance} onChange={setVariance} /><button type="button" onClick={() => { setResult(true); onToast('Transaction evaluated against 4 active rules', 'info'); }} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-800" data-testid="button-run-simulator"><Zap size={16} /> Resolve workflow</button></div></div><div className="rounded-xl border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-sm">{result ? <div className="page-enter"><div className="flex items-center justify-between"><div><p className="kicker text-cyan-300">Resolution output</p><h2 className="mt-2 font-serif text-2xl font-semibold">Approval required</h2></div><Badge tone="warning">Matched</Badge></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Matched workflow</p><p className="mt-1 font-mono text-sm text-cyan-300">PO_STANDARD_FIVE</p></div><div className="rounded-lg border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Approval levels</p><p className="mt-1 text-sm font-semibold">2 levels · sequential</p></div><div className="rounded-lg border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Approvers</p><p className="mt-1 text-sm font-semibold">PROCUREMENT_MANAGER → FINANCE_MANAGER</p></div><div className="rounded-lg border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Reason</p><p className="mt-1 text-sm font-semibold">Amount exceeds INR 50,000 threshold</p></div></div><div className="mt-7 flex items-start gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-400" size={15} /> The transaction remains pending until every required level approves.</div></div> : <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-300"><GitBranch size={25} /></div><h2 className="mt-5 font-serif text-2xl font-semibold">Ready to resolve</h2><p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">Set the transaction inputs on the left, then run the active rule set.</p></div>}</div></div></SectionPage>;
}

function WorkflowPage({ onToast }: { onToast: (message: string, tone?: Toast['tone']) => void }) {
  const [levels, setLevels] = useState(2);
  return <SectionPage title="Approval Workflows" eyebrow="Control plane / Governance" description="Create deterministic approval rules with conditions, levels, effective dates, and named approvers." onToast={onToast} action={<button type="button" onClick={() => onToast('New workflow draft created locally')} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800" data-testid="button-create-workflow"><Plus size={16} /> New workflow</button>}><div className="grid gap-5 xl:grid-cols-[1fr_1.1fr]"><div className="space-y-3">{[['PO_STANDARD_FIVE', 'Purchase Order · FIVE', 'Active', '2 levels'], ['STOCK_VARIANCE', 'Inventory Adjustment · All', 'Active', '1 level'], ['SUPPLIER_RETURN', 'Supplier Return · FIVE', 'Draft', '3 levels']].map(([code, desc, status, level]) => <button type="button" key={code} onClick={() => onToast(`${code} selected`, 'info')} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-sky-300 hover:bg-sky-50/30" data-testid={`button-workflow-${code}`}><div><p className="font-mono text-xs font-bold text-sky-700">{code}</p><p className="mt-1 text-sm font-semibold text-slate-800">{desc}</p><p className="mt-1 text-xs text-slate-500">{level} · effective 01 Jun 2024</p></div><Badge tone={status === 'Active' ? 'success' : 'warning'}>{status}</Badge></button>)}</div><div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="kicker text-slate-400">Builder preview</p><h2 className="mt-1 text-lg font-semibold text-slate-900">PO_STANDARD_FIVE</h2></div><button type="button" onClick={() => onToast('Workflow draft saved')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" data-testid="button-save-workflow">Save draft</button></div><div className="mt-5 space-y-3"><div className="rounded-lg border border-sky-200 bg-sky-50 p-4"><p className="kicker text-sky-700">When</p><p className="mt-2 text-sm font-semibold text-slate-800">Transaction type is <span className="font-mono text-sky-700">PURCHASE_ORDER</span></p></div><div className="flex justify-center text-slate-300"><ChevronDown size={18} /></div><div className="rounded-lg border border-slate-200 p-4"><p className="kicker text-slate-400">Conditions</p><div className="mt-3 flex flex-wrap gap-2"><Badge tone="info">Amount &gt; INR 50,000</Badge><Badge tone="info">Customer = FIVE</Badge><Badge tone="info">Variance &gt; 2%</Badge></div></div><div className="flex justify-center text-slate-300"><ChevronDown size={18} /></div><div className="rounded-lg border border-slate-200 p-4"><div className="flex items-center justify-between"><p className="kicker text-slate-400">Approval levels</p><div className="flex items-center gap-2"><button type="button" className="h-7 w-7 rounded border border-slate-200 text-slate-500" onClick={() => setLevels(Math.max(1, levels - 1))} data-testid="button-decrease-level"><ChevronLeft size={14} className="mx-auto" /></button><span className="font-mono text-xs">{levels}</span><button type="button" className="h-7 w-7 rounded border border-slate-200 text-slate-500" onClick={() => setLevels(Math.min(4, levels + 1))} data-testid="button-increase-level"><Plus size={14} className="mx-auto" /></button></div></div><div className="mt-3 space-y-2">{Array.from({ length: levels }).map((_, index) => <div key={index} className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2.5 text-sm"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-700 text-[10px] font-bold text-white">{index + 1}</span><span className="font-mono text-xs">{index === 0 ? 'PROCUREMENT_MANAGER' : 'FINANCE_MANAGER'}</span><span className="ml-auto text-xs text-slate-400">Sequential</span></div>)}</div></div></div></div></div></SectionPage>;
}

function MatrixPage({ onToast }: { onToast: (message: string, tone?: Toast['tone']) => void }) {
  const [rows, setRows] = useState([['Purchase Order', 'INR 0', 'INR 50,000', 'PROCUREMENT_MANAGER', 'FIVE'], ['Purchase Order', 'INR 50,001', 'INR 250,000', 'FINANCE_MANAGER', 'FIVE'], ['Inventory Adjustment', 'Variance 0%', 'Variance 2%', 'STORE_MANAGER', 'All customers'], ['Inventory Adjustment', 'Variance 2.1%', 'No upper limit', 'INVENTORY_CONTROLLER', 'FIVE']]);
  return <SectionPage title="Approval Matrix" eyebrow="Control plane / Thresholds" description="Amount and variance thresholds are evaluated in order to resolve a workflow." onToast={onToast} action={<button type="button" onClick={() => setRows((current) => [...current, ['New transaction', 'INR 0', 'INR 0', 'STORE_MANAGER', 'FIVE']])} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800" data-testid="button-add-matrix-row"><Plus size={16} /> Add threshold</button>}><div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Active threshold order</h2><p className="mt-1 text-xs text-slate-500">Rules are checked top to bottom. Drag ordering is available in production.</p></div><Badge tone="success">Version 12 · Active</Badge></div><div className="content-scroll overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-50"><tr>{['Transaction', 'Lower bound', 'Upper bound', 'Approver', 'Scope', ''].map((head) => <th key={head} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{head}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="hover:bg-sky-50/30" data-testid={`row-matrix-${index}`}>{row.map((cell, cellIndex) => <td key={cell} className={`px-5 py-4 text-sm ${cellIndex === 0 ? 'font-semibold text-slate-800' : cellIndex === 3 ? 'font-mono text-xs text-sky-700' : 'text-slate-600'}`}>{cell}</td>)}<td className="px-5 py-4 text-right"><IconButton label={`remove threshold ${index + 1}`} onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}><X size={14} /></IconButton></td></tr>)}</tbody></table></div></div></SectionPage>;
}

function LiveMasterDataPage({ kind, onToast }: { kind: 'materials' | 'suppliers'; onToast: (message: string, tone?: Toast['tone']) => void }) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Array<MaterialSummary | SupplierSummary>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMaterials = kind === 'materials';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = async () => {
      try {
        const result = isMaterials
          ? await searchMaterials({ q: query || undefined, limit: 100 })
          : await searchSuppliers({ q: query || undefined, limit: 100 });
        if (!cancelled) setRows(result.items);
      } catch (loadError) {
        if (!cancelled) {
          setRows([]);
          setError(errorMessage(loadError, 'Could not load master data.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [isMaterials, query]);

  const columns = isMaterials
    ? ['material', 'description', 'customer', 'source', 'uom', 'category', 'plant', 'status']
    : ['supplier', 'name', 'customer', 'source', 'tax registration', 'status'];
  const displayRows = rows.map((row): Record<string, string> => {
    if (isMaterials) {
      const material = row as MaterialSummary;
      return {
        material: material.materialCode,
        description: material.materialDescription,
        customer: material.customerCode,
        source: material.sourceSystem ?? '—',
        uom: material.baseUom,
        category: material.category ?? '—',
        plant: material.plantCode ?? '—',
        status: material.active === false ? 'Inactive' : 'Active',
      };
    }
    const supplier = row as SupplierSummary;
    return {
      supplier: supplier.supplierCode,
      name: supplier.supplierName,
      customer: supplier.customerCode,
      source: supplier.sourceSystem ?? '—',
      'tax registration': supplier.taxRegistrationNumber ?? '—',
      status: supplier.active === false ? 'Inactive' : 'Active',
    };
  });
  const filtered = displayRows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase()));

  return <SectionPage
    title={isMaterials ? 'Materials' : 'Suppliers'}
    eyebrow={isMaterials ? 'Master data / Authorized material view' : 'Master data / Authorized supplier view'}
    description={isMaterials ? 'Live tenant-scoped material master with source-system and plant awareness.' : 'Live tenant-scoped supplier master with tax identity and source mapping.'}
    onToast={onToast}
    action={<button type="button" onClick={() => onToast('Export is available from the current authorized view', 'info')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid={`button-action-${kind}`}><Plus size={16} /> Export view</button>}
  >
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isMaterials ? 'Search code, description, alias, or barcode...' : 'Search code, name, tax ID, or alias...'} className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" data-testid={`input-search-master-data-${kind}`} />
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">{loading ? 'Loading…' : `${filtered.length} records`}</Badge>
          <span className="text-xs text-slate-400">Server-scoped</span>
        </div>
      </div>
      {error ? <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</div> : null}
      <div className="content-scroll overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-slate-50"><tr>{columns.map((column) => <th key={column} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{column}</th>)}<th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={columns.length + 1} className="px-5 py-10 text-center text-sm text-slate-500">Loading live {isMaterials ? 'materials' : 'suppliers'}…</td></tr> : filtered.length === 0 ? <tr><td colSpan={columns.length + 1} className="px-5 py-10 text-center text-sm text-slate-500">No authorized records match this search.</td></tr> : filtered.map((row, index) => <tr key={String(row[columns[0]])} className="hover:bg-sky-50/30" data-testid={`row-master-data-${kind}-${index}`}>{columns.map((column) => <td key={column} className={`px-5 py-4 text-sm ${column === columns[0] ? 'font-mono font-semibold text-slate-800' : 'text-slate-600'}`}>{column === 'status' ? <Badge tone={row[column] === 'Active' ? 'success' : 'neutral'}>{row[column]}</Badge> : row[column]}</td>)}<td className="px-5 py-4 text-right"><IconButton label={`inspect ${kind} ${index + 1}`} onClick={() => onToast(`${row[columns[0]]} is available through the master-data detail API`, 'info')}><Eye size={15} /></IconButton></td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>{loading ? 'Loading records' : `Showing ${filtered.length} authorized records`}</span><span className="font-mono">DEV_DATABASE</span></div>
    </div>
  </SectionPage>;
}

function MonitoringPage({ kind, onToast }: { kind: 'transactions' | 'approval-monitoring' | 'integration-monitoring' | 'erp-errors' | 'audit' | 'readiness' | 'delegations' | 'access' | 'plant-mapping' | 'storage-mapping' | 'materials' | 'suppliers'; onToast: (message: string, tone?: Toast['tone']) => void }) {
  if (kind === 'materials' || kind === 'suppliers') return <LiveMasterDataPage kind={kind} onToast={onToast} />;
  const content: Record<string, { title: string; eyebrow: string; desc: string; columns: string[]; rows: Row[] }> = {
    transactions: { title: 'Transactions', eyebrow: 'Observability / Execution', desc: 'Monitor approval state and ERP execution independently across the platform.', columns: ['id', 'type', 'customer', 'amount', 'approval', 'erp', 'updated'], rows: [{ id: 'PO-240618-019', type: 'Purchase Order', customer: 'FIVE', amount: 'INR 87,500', approval: 'Pending L2', erp: 'Not sent', updated: '8 min ago' }, { id: 'GR-240618-044', type: 'Goods Receipt', customer: 'FIVE', amount: 'INR 12,640', approval: 'Approved', erp: 'Executed', updated: '24 min ago' }, { id: 'ST-240617-008', type: 'Stock Transfer', customer: 'NOVA', amount: 'SGD 4,280', approval: 'Approved', erp: 'Failed', updated: '2 hr ago' }] },
    'approval-monitoring': { title: 'Approval Monitoring', eyebrow: 'Observability / Governance', desc: 'Pending queue and immutable approval history. Approval status never rolls back because of ERP execution.', columns: ['id', 'type', 'currentLevel', 'assignedTo', 'age', 'status'], rows: [{ id: 'PO-240618-019', type: 'Purchase Order', currentLevel: 'Level 2 of 2', assignedTo: 'FINMGR001', age: '4h 12m', status: 'Pending' }, { id: 'ADJ-240618-003', type: 'Inventory Adjustment', currentLevel: 'Level 1 of 1', assignedTo: 'INVCTRL001', age: '48m', status: 'Pending' }, { id: 'PO-240617-112', type: 'Purchase Order', currentLevel: 'Complete', assignedTo: 'PROCMGR001', age: 'Yesterday', status: 'Approved' }] },
    'integration-monitoring': { title: 'Integration Monitoring', eyebrow: 'Observability / Connectors', desc: 'Live signal across ERP, Microsoft authentication, and SSO health checks.', columns: ['system', 'customer', 'lastCheck', 'latency', 'status', 'next'], rows: [{ system: 'SAP S/4HANA', customer: 'FIVE', lastCheck: '08:40:12', latency: '240 ms', status: 'Healthy', next: 'In 14 min' }, { system: 'Odoo', customer: 'NOVA', lastCheck: '08:36:44', latency: '418 ms', status: 'Healthy', next: 'In 10 min' }, { system: 'Oracle Fusion', customer: 'ARC', lastCheck: '08:18:03', latency: '2.8 s', status: 'Degraded', next: 'In 2 min' }, { system: 'Microsoft Entra ID', customer: 'FIVE', lastCheck: '08:39:58', latency: '112 ms', status: 'Healthy', next: 'In 13 min' }] },
    'erp-errors': { title: 'ERP Errors', eyebrow: 'Observability / Recovery', desc: 'Approved business transactions that failed ERP execution. Approval state remains immutable.', columns: ['id', 'system', 'error', 'attempts', 'approval', 'status'], rows: [{ id: 'ST-240617-008', system: 'Odoo', error: 'Storage location WH-22 not found', attempts: '3', approval: 'Approved', status: 'Open' }, { id: 'PO-240616-042', system: 'SAP S/4HANA', error: 'Supplier code not mapped', attempts: '1', approval: 'Approved', status: 'Retry queued' }] },
    audit: { title: 'Audit Logs', eyebrow: 'Observability / Evidence', desc: 'Immutable record of configuration and access changes across the control plane.', columns: ['timestamp', 'actor', 'action', 'resource', 'ip', 'result'], rows: [{ timestamp: '18 Jun 08:42:19', actor: 'Leena Dsouza', action: 'Updated access scope', resource: 'FINMGR001', ip: '10.14.8.22', result: 'Success' }, { timestamp: '18 Jun 08:40:12', actor: 'System', action: 'SSO health check', resource: 'FIVE Entra tenant', ip: '—', result: 'Success' }, { timestamp: '18 Jun 08:31:05', actor: 'Nikhil Menon', action: 'Approved transaction', resource: 'PO-240618-011', ip: '10.14.8.17', result: 'Success' }] },
    readiness: { title: 'Mobile Readiness', eyebrow: 'Configuration / Launch gate', desc: 'Review customer and property readiness before enabling operational mobile access.', columns: ['scope', 'properties', 'users', 'mobilePolicy', 'erp', 'readiness'], rows: [{ scope: 'FIVE', properties: '3 / 3', users: '14 / 14', mobilePolicy: 'v3.4', erp: 'Healthy', readiness: '96%' }, { scope: 'NOVA', properties: '1 / 3', users: '8 / 12', mobilePolicy: 'v3.1', erp: 'Healthy', readiness: '78%' }, { scope: 'ARC', properties: '0 / 1', users: '0 / 5', mobilePolicy: 'Not set', erp: 'Draft', readiness: '41%' }] },
    access: { title: 'User Access', eyebrow: 'Command center / Scope', desc: 'Assign customer, property, and store scope independently from role permissions.', columns: ['user', 'role', 'customer', 'property', 'stores', 'effective'], rows: [{ user: 'SRIRAM001', role: 'STORE_MANAGER', customer: 'FIVE', property: 'FIVE_PALM', stores: 'MAIN_STORE', effective: '01 Jun 2024' }, { user: 'INVCTRL001', role: 'INVENTORY_CONTROLLER', customer: 'FIVE', property: 'FIVE_PALM', stores: 'All stores', effective: '01 Jun 2024' }, { user: 'PROCMGR001', role: 'PROCUREMENT_MANAGER', customer: 'FIVE', property: 'All', stores: 'All', effective: '01 Jun 2024' }] },
    'plant-mapping': { title: 'Plant Mapping', eyebrow: 'Control plane / ERP scope', desc: 'Map SILA properties to ERP plants without exposing connection secrets.', columns: ['property', 'customer', 'erp', 'plant', 'companyCode', 'status'], rows: [{ property: 'FIVE_PALM', customer: 'FIVE', erp: 'SAP S/4HANA', plant: 'DXB-1001', companyCode: 'FIVE-IN', status: 'Mapped' }, { property: 'FIVE_ZABEEL', customer: 'FIVE', erp: 'SAP S/4HANA', plant: 'DXB-1002', companyCode: 'FIVE-IN', status: 'Mapped' }, { property: 'FIVE_JBR', customer: 'FIVE', erp: 'SAP S/4HANA', plant: '—', companyCode: 'FIVE-IN', status: 'Needs mapping' }] },
    'storage-mapping': { title: 'Storage Mapping', eyebrow: 'Control plane / ERP scope', desc: 'Map operational stores to ERP storage locations and validate receiving paths.', columns: ['store', 'property', 'erp', 'storageLocation', 'type', 'status'], rows: [{ store: 'MAIN_STORE', property: 'FIVE_PALM', erp: 'SAP S/4HANA', storageLocation: 'WH-1001', type: 'General', status: 'Mapped' }, { store: 'BEVERAGE_STORE', property: 'FIVE_PALM', erp: 'SAP S/4HANA', storageLocation: 'WH-1002', type: 'Beverage', status: 'Mapped' }, { store: 'COLD_STORE', property: 'FIVE_PALM', erp: 'SAP S/4HANA', storageLocation: '—', type: 'Cold chain', status: 'Needs mapping' }] },
    materials: { title: 'Materials', eyebrow: 'Master data / ERP source', desc: 'Read-only material master view with source-system and sync awareness.', columns: ['material', 'description', 'source', 'uom', 'category', 'sync'], rows: [{ material: 'MAT-100842', description: 'Arabica coffee beans 1kg', source: 'SAP S/4HANA', uom: 'EA', category: 'Beverage', sync: '18 Jun 08:12' }, { material: 'MAT-100991', description: 'Sparkling water 330ml', source: 'SAP S/4HANA', uom: 'CS', category: 'Beverage', sync: '18 Jun 08:12' }, { material: 'MAT-204110', description: 'Fresh salmon fillet', source: 'SAP S/4HANA', uom: 'KG', category: 'Food', sync: '18 Jun 08:12' }] },
    suppliers: { title: 'Suppliers', eyebrow: 'Master data / ERP source', desc: 'Read-only supplier master view with customer-specific source mapping.', columns: ['supplier', 'name', 'customer', 'source', 'currency', 'status'], rows: [{ supplier: 'SUP-0042', name: 'Gulf Food Services', customer: 'FIVE', source: 'SAP S/4HANA', currency: 'INR', status: 'Active' }, { supplier: 'SUP-0081', name: 'Hotel Essentials Trading', customer: 'FIVE', source: 'SAP S/4HANA', currency: 'INR', status: 'Active' }, { supplier: 'SUP-0193', name: 'Emirates Cold Chain', customer: 'NOVA', source: 'Odoo', currency: 'SGD', status: 'Active' }] },
    delegations: { title: 'Delegations', eyebrow: 'Control plane / Continuity', desc: 'Temporary approver substitutions with explicit dates and an immutable audit trail.', columns: ['delegator', 'delegate', 'scope', 'starts', 'ends', 'status'], rows: [{ delegator: 'FINMGR001', delegate: 'PROCMGR001', scope: 'FIVE · All approvals', starts: '20 Jun 2024', ends: '24 Jun 2024', status: 'Scheduled' }, { delegator: 'INVCTRL001', delegate: 'SRIRAM001', scope: 'FIVE_PALM · Inventory', starts: '17 Jun 2024', ends: '18 Jun 2024', status: 'Active' }] },
  };
  const info = content[kind];
  const [query, setQuery] = useState('');
  const filtered = info.rows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase()));
  return <SectionPage title={info.title} eyebrow={info.eyebrow} description={info.desc} onToast={onToast} action={<button type="button" onClick={() => onToast(kind === 'audit' ? 'This view is read-only' : 'Draft opened locally')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-testid={`button-action-${kind}`}><Plus size={16} /> {kind === 'audit' ? 'Export view' : kind === 'delegations' ? 'New delegation' : 'Add mapping'}</button>}><div className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-3 md:flex-row md:items-center md:justify-between"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this view..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" data-testid={`input-search-monitoring-${kind}`} /></div><div className="flex items-center gap-2"><button type="button" onClick={() => onToast('Filters applied to development data', 'info')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600" data-testid={`button-filter-monitoring-${kind}`}><Filter size={14} /> Filter</button><Badge tone="info">{String(filtered.length)} records</Badge></div></div><div className="content-scroll overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50"><tr>{info.columns.map((column) => <th key={column} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">{column}</th>)}<th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((row, index) => <tr key={index} className="hover:bg-sky-50/30" data-testid={`row-monitoring-${kind}-${index}`}>{info.columns.map((column) => <td key={column} className={`px-5 py-4 text-sm ${column === info.columns[0] ? 'font-mono font-semibold text-slate-800' : 'text-slate-600'}`}>{['status', 'approval', 'erp', 'result', 'readiness'].includes(column) ? <Badge tone={String(row[column]).toLowerCase().includes('fail') || row[column] === 'Open' ? 'danger' : String(row[column]).toLowerCase().includes('pending') || String(row[column]).toLowerCase().includes('degraded') || String(row[column]).toLowerCase().includes('needs') ? 'warning' : 'success'}>{row[column]}</Badge> : row[column]}</td>)}<td className="px-5 py-4 text-right"><IconButton label={`inspect ${index + 1}`} onClick={() => onToast(`Inspecting record ${index + 1}`, 'info')}><Eye size={15} /></IconButton></td></tr>)}</tbody></table></div><div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>Showing 1–{filtered.length} of {filtered.length} records</span><span className="font-mono">Page 1 / 1</span></div></div></SectionPage>;
}

function SetupWizard({ onToast }: { onToast: (message: string, tone?: Toast['tone']) => void }) {
  const steps = ['Customer', 'Properties', 'Stores', 'Users', 'Roles', 'Access', 'Authentication', 'ERP Connection', 'Plant Mapping', 'Storage Mapping', 'Mobile Config', 'Readiness', 'Activate'];
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<number[]>([]);
  const complete = () => { setDone((current) => current.includes(step) ? current : [...current, step]); if (step < steps.length - 1) setStep(step + 1); else onToast('Customer FIVE activated in development workspace'); };
  return <div className="page-enter space-y-5"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="kicker text-sky-700">Configuration / Guided setup</p><h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Customer Setup Wizard</h1><p className="mt-2 text-sm text-slate-500">A controlled 13-step path from customer record to activation.</p></div><Badge tone="warning">Development only</Badge></div><div className="grid gap-5 lg:grid-cols-[260px_1fr]"><div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><div className="mb-3 px-3 py-2"><p className="kicker text-slate-400">Setup progress</p><p className="mt-2 font-serif text-2xl font-semibold text-slate-900">{Math.round(((done.length + (step === steps.length - 1 ? 1 : 0)) / steps.length) * 100)}%</p></div><div className="space-y-1">{steps.map((item, index) => <button type="button" key={item} onClick={() => setStep(index)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold ${index === step ? 'bg-sky-50 text-sky-800' : 'text-slate-500 hover:bg-slate-50'}`} data-testid={`button-wizard-step-${index + 1}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${done.includes(index) ? 'border-emerald-500 bg-emerald-500 text-white' : index === step ? 'border-sky-600 text-sky-700' : 'border-slate-200'}`}>{done.includes(index) ? <Check size={13} /> : index + 1}</span>{item}</button>)}</div></div><div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between border-b border-slate-100 pb-5"><div><p className="kicker text-sky-700">Step {step + 1} of {steps.length}</p><h2 className="mt-2 font-serif text-2xl font-semibold text-slate-900">{steps[step]}</h2><p className="mt-2 text-sm text-slate-500">{step === 0 ? 'Create the legal customer record and establish regional defaults.' : `Configure ${steps[step].toLowerCase()} for the FIVE development tenant.`}</p></div><span className="font-mono text-xs text-slate-400">FIVE / DEV</span></div><div className="my-7 grid gap-4 md:grid-cols-2"><Field label="Customer code" value="FIVE" onChange={() => undefined} /><Field label={steps[step] === 'Customer' ? 'Legal name' : 'Configuration owner'} value={steps[step] === 'Customer' ? 'FIVE Hospitality Group' : 'Platform Operations'} onChange={() => undefined} /><Field label="Country" value="India" onChange={() => undefined} select /><Field label="Currency" value="INR" onChange={() => undefined} select /></div><div className="flex items-start gap-3 rounded-lg border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900"><CircleHelp size={17} className="mt-0.5 shrink-0 text-sky-700" /><p>Complete this checkpoint to unlock the next setup step. All changes are local development data.</p></div><div className="mt-8 flex justify-between border-t border-slate-100 pt-5"><button type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-wizard-previous"><ChevronLeft size={16} /> Previous</button><button type="button" onClick={complete} className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800" data-testid="button-wizard-complete">{step === steps.length - 1 ? 'Activate customer' : 'Complete & continue'} <ArrowRight size={16} /></button></div></div></div></div>;
}

function LoginScreen({ onLogin }: { onLogin: (session: AuthSession) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      onLogin(await signIn({ email, password }));
    } catch (loginError) {
      setError(errorMessage(loginError, 'Could not sign in. Check your credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
    <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(420px,.9fr)_1.1fr]">
      <section className="relative hidden overflow-hidden border-r border-white/10 bg-[#102a43] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-40 -top-36 h-[520px] w-[520px] rounded-full border border-cyan-200/10 bg-cyan-300/5" />
        <div className="absolute -bottom-32 -left-32 h-[430px] w-[430px] rounded-full border border-emerald-200/10 bg-emerald-300/5" />
        <div className="relative z-10">
          <div className="flex h-14 w-[168px] items-center justify-center rounded-xl bg-white px-3 shadow-lg shadow-slate-950/20">
            <img src={silaLogo} alt="SILA" className="h-12 w-full object-contain" />
          </div>
          <p className="kicker mt-16 text-cyan-200/70">SILA Cloud / Control plane</p>
          <h1 className="mt-5 max-w-lg font-serif text-5xl font-semibold leading-[1.08] tracking-tight text-white">One secure place to run SILA.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-slate-300">Configure customers, access, approvals, authentication, integrations, and mobile readiness before operations begin.</p>
        </div>
        <div className="relative z-10 flex items-center gap-3 text-xs text-slate-400">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-cyan-200"><ShieldCheck size={15} /></span>
          <span>Enterprise access control for SILA Store</span>
        </div>
      </section>

      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f4f8fb] px-5 py-10 text-slate-900 sm:px-8">
        <div className="w-full max-w-[560px]">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <div className="flex h-14 w-[168px] items-center justify-center rounded-xl bg-white px-3 shadow-sm">
              <img src={silaLogo} alt="SILA" className="h-12 w-full object-contain" />
            </div>
          </div>
          <div className="mb-8">
            <p className="kicker text-sky-700">Welcome back</p>
            <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-slate-950">Sign in to SILA Cloud</h2>
             <p className="mt-3 text-sm leading-6 text-slate-500">Use your SILA Cloud credentials to continue to the administration control plane.</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-xs font-bold uppercase tracking-[.08em] text-slate-500">Work email</label>
                <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100" autoComplete="email" data-testid="input-login-email" />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-[.08em] text-slate-500">Password</label>
                  <button type="button" className="text-xs font-semibold text-sky-700 hover:text-sky-900" onClick={() => undefined} data-testid="button-forgot-password">Forgot password?</button>
                </div>
                <input id="login-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100" autoComplete="current-password" data-testid="input-login-password" />
              </div>
               {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
               <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-700/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60" data-testid="button-login-submit">{submitting ? 'Checking access…' : 'Continue securely'} {!submitting && <ArrowRight size={16} />}</button>
            </div>
          </form>

          <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200" /><span className="kicker text-slate-400">or continue with</span><div className="h-px flex-1 bg-slate-200" /></div>
          <div className="grid grid-cols-2 gap-3">
             <button type="button" onClick={() => setError('Microsoft Entra ID is not configured in this development workspace.')} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-sky-300 hover:text-sky-800" data-testid="button-login-microsoft">Microsoft Entra ID</button>
             <button type="button" onClick={() => setError('Company SSO is not configured in this development workspace.')} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-sky-300 hover:text-sky-800" data-testid="button-login-sso">Company SSO</button>
          </div>
          <div className="mt-8 flex items-center justify-between text-[11px] text-slate-400"><span>Protected by SILA Cloud access policies</span><span className="font-mono">v0.1 DEV</span></div>
        </div>
      </main>
    </div>
  </div>;
}

function ChangePasswordScreen({ session, onComplete }: { session: AuthSession; onComplete: (session: AuthSession) => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setError('The new passwords do not match.'); return; }
    setSaving(true); setError('');
    try {
      await changePassword({ currentPassword, newPassword });
      onComplete({ ...session, user: { ...session.user, mustChangePassword: false } });
    } catch (changeError) {
      setError(errorMessage(changeError, 'Could not change the password.'));
    } finally {
      setSaving(false);
    }
  };
  return <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-5 py-10 text-slate-900"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl"><p className="kicker text-sky-700">First sign-in security step</p><h1 className="mt-3 font-serif text-3xl font-semibold text-slate-950">Set your new password</h1><p className="mt-3 text-sm leading-6 text-slate-500">This temporary credential must be replaced before you can enter SILA Cloud.</p><form onSubmit={submit} className="mt-7 space-y-4"><Field label="Temporary password" value={currentPassword} onChange={setCurrentPassword} type="password" placeholder="Enter the credential you received" /><Field label="New password" value={newPassword} onChange={setNewPassword} type="password" placeholder="12+ chars: upper, lower, number, symbol" /><Field label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="Repeat your new password" />{error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}<button type="submit" disabled={saving} className="w-full rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50">{saving ? 'Saving…' : 'Save new password'}</button></form></div></div>;
}

function AppShell({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [customer, setCustomer] = useState(session.user.customerScope === '*' ? 'FIVE · Development' : `${session.user.customerScope} · Scoped`);
  const notify = (message: string, tone: Toast['tone'] = 'success') => { const id = Date.now(); setToasts((current) => [...current, { id, message, tone }]); window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600); };
  const canAccess = (href: string) => session.allowedRoutes.includes('*') || session.allowedRoutes.includes(href);
  const navGroups = allNavGroups.map((group) => ({ ...group, items: group.items.filter((item) => canAccess(item[1])) })).filter((group) => group.items.length > 0);
  const MoreHorizontal = ({ size = 16, className = '' }: { size?: number; className?: string }) => <button type="button" onClick={onLogout} className={`rounded-md p-1 hover:bg-white/10 hover:text-white ${className}`} aria-label="sign out" data-testid="button-sign-out"><MoreHorizontalIcon size={size} /></button>;
  const firstAllowedRoute = session.allowedRoutes.includes('*') ? '/' : session.allowedRoutes[0] ?? '/';
  useEffect(() => {
    const href = location === '/' ? '/' : `/${location.slice(1).split('/')[0]}`;
    if (!canAccess(href)) setLocation(firstAllowedRoute);
  }, [location, session.allowedRoutes.join('|')]);
  const key = location === '/' ? 'dashboard' : location.slice(1).split('/')[0];
  const navTitle = key === 'dashboard' ? 'Dashboard' : allNavItems.find((item) => item[1].slice(1) === key)?.[0] || 'SILA Cloud';
   const page = key === 'dashboard' ? <Dashboard onToast={notify} /> : key === 'mobile-users' ? <AdministrationUserPage domain="mobile" onToast={notify} /> : key === 'cloud-users' ? <AdministrationUserPage domain="cloud" onToast={notify} /> : resourceConfig[key] ? <ResourcePage kind={key} canManageUsers={session.user.role === 'SUPER_ADMIN'} onToast={notify} /> : key === 'ocr-agent' ? <OcrAgentPage onToast={notify} /> : ['authentication', 'erp', 'mobile', 'notifications', 'transaction-types', 'settings'].includes(key) ? <ConfigPage kind={key} onToast={notify} /> : key === 'simulator' ? <Simulator onToast={notify} /> : key === 'workflows' ? <WorkflowPage onToast={notify} /> : key === 'matrix' ? <MatrixPage onToast={notify} /> : key === 'setup-wizard' ? <SetupWizard onToast={notify} /> : <MonitoringPage kind={(key in { transactions: 1, 'approval-monitoring': 1, 'integration-monitoring': 1, 'erp-errors': 1, audit: 1, readiness: 1, delegations: 1, access: 1, 'plant-mapping': 1, 'storage-mapping': 1, materials: 1, suppliers: 1 } ? key : 'transactions') as 'transactions'} onToast={notify} />;
  return <div className="min-h-[100dvh] bg-background text-foreground"><aside className={`mobile-drawer sidebar-scroll fixed inset-y-0 left-0 z-40 flex w-[274px] flex-col overflow-y-auto bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-200 md:translate-x-0 ${mobileOpen ? 'open' : ''}`}><div className="flex h-[74px] items-center justify-between border-b border-sidebar-border px-5"><button type="button" onClick={() => setLocation('/')} className="flex items-center gap-3 text-left" data-testid="button-logo-home"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary font-serif text-lg font-bold text-sidebar-primary-foreground">S</span><span><span className="block font-serif text-lg font-semibold tracking-tight text-white">SILA Cloud</span><span className="kicker text-[9px] text-slate-400">Administration</span></span></button><IconButton label="close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></IconButton></div><div className="mx-4 my-4 flex items-center justify-between rounded-lg border border-amber-400/20 bg-amber-300/10 px-3 py-2"><div className="flex items-center gap-2"><span className="pulse-dot h-2 w-2 rounded-full bg-amber-300" /><span className="font-mono text-[10px] font-bold tracking-[.08em] text-amber-200">DEVELOPMENT</span></div><span className="text-[10px] text-amber-100/60">TEST DATA</span></div><nav className="flex-1 px-3 pb-5">{navGroups.map((group) => <div key={group.label} className="mb-5"><p className="kicker mb-2 px-3 text-slate-500">{group.label}</p><div className="space-y-0.5">{group.items.map(([label, href, Icon]) => <Link href={href} key={href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium ${location === href ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm' : 'text-slate-300 hover:bg-sidebar-accent hover:text-white'}`} data-testid={`link-nav-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}><Icon size={16} strokeWidth={location === href ? 2.3 : 1.8} /><span className="truncate">{label}</span>{label === 'Approval Monitoring' && <span className="ml-auto rounded bg-amber-300/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-200">12</span>}</Link>)}</div></div>)}</nav><div className="border-t border-sidebar-border p-4"><div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-200 font-mono text-xs font-bold text-sky-900">PO</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">Platform Ops</p><p className="truncate text-[11px] text-slate-400">Super administrator</p></div><MoreHorizontal size={16} className="text-slate-400" /></div></div></aside><div className="md:pl-[274px]"><header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur md:px-8"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="open navigation" data-testid="button-open-navigation"><Menu size={21} /></button><div><p className="kicker text-slate-400">SILA Cloud / {navTitle}</p><p className="mt-1 text-sm font-semibold text-slate-800">{customer}</p></div></div><div className="flex items-center gap-2 md:gap-4"><select value={customer} onChange={(event) => { setCustomer(event.target.value); notify('Customer scope changed locally', 'info'); }} className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none md:block" aria-label="customer scope" data-testid="select-customer-scope"><option>FIVE · Development</option><option>NOVA · Development</option><option>ARC · Development</option></select><button type="button" onClick={() => notify('No unread notifications', 'info')} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="open notifications" data-testid="button-open-notifications"><Bell size={18} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" /></button><div className="hidden h-6 w-px bg-slate-200 md:block" /><button type="button" onClick={() => notify('Help center is available in production', 'info')} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="open help" data-testid="button-open-help"><CircleHelp size={18} /></button></div></header><main className="sila-grid content-scroll min-h-[calc(100dvh-74px)] overflow-y-auto p-4 md:p-8"><div className="mx-auto max-w-[1500px]">{page}</div></main></div><ToastStack toasts={toasts} dismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} /></div>;
}

function App() {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  useEffect(() => {
    getSession().then(setSession).catch(() => setSession(null));
  }, []);
  const logout = async () => {
    await signOut().catch(() => undefined);
    setSession(null);
  };
  return <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><ErrorBoundary resetKey={location.pathname}>{session === undefined ? <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-sm text-slate-300">Checking access…</div> : session ? session.user.mustChangePassword ? <ChangePasswordScreen session={session} onComplete={setSession} /> : <AppShell session={session} onLogout={logout} /> : <LoginScreen onLogin={setSession} />}</ErrorBoundary></WouterRouter>;
}

export default App;
