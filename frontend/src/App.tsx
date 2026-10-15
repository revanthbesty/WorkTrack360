import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from './auth/AuthProvider';
import { ApiError, workItemsApi, type TeamOption, type WorkItem, type WorkItemActivity, type RecentWorkItemActivity } from './api/workItems';
import { Activity, ArrowUpRight, Bell, CalendarClock, CheckCircle2, ChevronDown, CircleHelp, Command, Gauge, LayoutDashboard, ListTodo, Plus, Search, Settings2, ShieldCheck, Users, Workflow, Trash2 } from 'lucide-react';

type NavItem = { label: string; icon: typeof Gauge };
const nav: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Work items', icon: ListTodo },
  { label: 'Customer escalations', icon: Workflow }, { label: 'Demo & enablement', icon: Users },
  { label: 'Compliance deadlines', icon: CalendarClock }, { label: 'Analytics & reports', icon: Activity },
];
const demoDateOffset = (days: number) => { const date = new Date(); date.setHours(23, 59, 0, 0); date.setDate(date.getDate() + days); return date.toISOString(); };
const isPastDue = (dueAt: string | null, status: WorkItem['status']) => Boolean(dueAt && new Date(dueAt).getTime() < Date.now() && !['Resolved', 'Closed'].includes(status));
const dueLabel = (dueAt: string | null) => { if (!dueAt) return 'No due date'; const day = new Date(dueAt); const today = new Date(); today.setHours(0,0,0,0); const dueDay = new Date(day); dueDay.setHours(0,0,0,0); const diff = Math.round((dueDay.getTime() - today.getTime()) / 86400000); return diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
const sampleTasks = [
  { id: 'WT-1048', title: 'Review quarterly validation issue', team: 'Product Support', status: 'In progress', priority: 'High', dueAt: demoDateOffset(-2), product: 'Northstar Reporting', category: 'Customer ticket', requester: 'Demo Requester A', owner: 'Demo Support Owner A' }, 
  { id: 'WT-1047', title: 'Prepare customer demo walkthrough', team: 'Product Owner', status: 'Needs review', priority: 'Medium', dueAt: demoDateOffset(0), product: 'Orbit Compliance', category: 'Product owner', requester: 'Demo Requester B', owner: 'Demo Product Owner B' }, 
  { id: 'WT-1046', title: 'Update compliance user guide', team: 'Documentation', status: 'Open', priority: 'Low', dueAt: demoDateOffset(1), product: 'Beacon Filing Suite', category: 'Documentation', requester: 'Demo Requester C', owner: 'Demo Documentation Owner C' }, 
  { id: 'WT-1045', title: 'Confirm engineering hand-off', team: 'Engineering', status: 'In progress', priority: 'High', dueAt: demoDateOffset(3), product: 'Summit Analytics', category: 'Software/Internal Team', requester: 'Demo Requester D', owner: 'Demo Engineering Owner D' }, 
] as const;
type TaskRow = { id: string | null; key: string; title: string; team: string; product: string; category: string; requester: string; owner: string; status: WorkItem['status']; priority: WorkItem['priority']; due: string; dueAt: string | null; overdue: boolean };
const statuses: WorkItem['status'][] = ['Open', 'In progress', 'Needs review', 'Blocked', 'Resolved', 'Closed'];
const priorities: WorkItem['priority'][] = ['Low', 'Medium', 'High', 'Urgent'];
function toTaskRow(item: WorkItem, teamName?: string): TaskRow {
  return {
    id: item.id,
    key: item.key,
    title: item.title,
    team: item.team_id ? (teamName || `Team ${item.team_id.slice(0, 8)}`) : 'Unassigned',
    product: item.product ?? '', category: item.category ?? '', requester: item.requester ?? '', owner: item.owner ?? '',
    status: item.status,
    priority: item.priority,
    dueAt: item.due_at, due: dueLabel(item.due_at), overdue: isPastDue(item.due_at, item.status),
  };
}
export default function App() {
  const auth = useAuth();
  const [active, setActive] = useState('Overview');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkItem['status'] | 'All'>('All');
  const [productFilter, setProductFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showNew, setShowNew] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>(sampleTasks.map(t => ({ ...t, id: null, key: t.id, due: dueLabel(t.dueAt), overdue: isPastDue(t.dueAt, t.status) })));
  const [dataMode, setDataMode] = useState<'sample' | 'live'>('sample');
  const [dataError, setDataError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newRequester, setNewRequester] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newTeamId, setNewTeamId] = useState('');
  const [liveTeams, setLiveTeams] = useState<TeamOption[]>([]);
  const [activityItems, setActivityItems] = useState<WorkItemActivity[]>([]);
  const [recentActivityItems, setRecentActivityItems] = useState<RecentWorkItemActivity[]>([]);
  const [recentActivityError, setRecentActivityError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [newPriority, setNewPriority] = useState<WorkItem['priority']>('Medium');
  const [productOptionsConfig, setProductOptionsConfig] = useState(['Northstar Reporting', 'Orbit Compliance', 'Beacon Filing Suite', 'Summit Analytics']);
  const [categoryOptionsConfig, setCategoryOptionsConfig] = useState(['Customer ticket', 'Product owner', 'Software/Internal Team', 'Documentation', 'Demo & enablement']);
  const [teamOptionsConfig, setTeamOptionsConfig] = useState(['Product Support', 'Product Owner', 'Documentation', 'Engineering']);
  const [settingsDraft, setSettingsDraft] = useState({ products: '', categories: '', teams: '' });
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [slaWarningHours, setSlaWarningHours] = useState('24');
  const [criticalOverdueDays, setCriticalOverdueDays] = useState('2');
  const [reportPeriod, setReportPeriod] = useState('30');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const liveDataEnabled = import.meta.env.VITE_ENABLE_LIVE_DATA === 'true';

  useEffect(() => {
    let cancelled = false;
    if (!liveDataEnabled || !auth.accessToken) {
      setTasks(sampleTasks.map(t => ({ ...t, id: null, key: t.id, due: dueLabel(t.dueAt), overdue: isPastDue(t.dueAt, t.status) })));
      setDataMode('sample');
      setDataError(null);
      return () => { cancelled = true; };
    }
    void Promise.all([workItemsApi.list(auth.accessToken, 50, 0), workItemsApi.listTeams(auth.accessToken)]).then(([items, teams]) => {
      if (cancelled) return;
      setLiveTeams(teams);
      setTasks(items.map(item => toTaskRow(item, teams.find(team => team.id === item.team_id)?.name)));
      setDataMode('live');
      setDataError(null);
    }).catch(error => {
      if (cancelled) return;
      setDataMode('sample');
      setDataError(error instanceof ApiError ? error.message : 'Could not load live work items. Check the API connection.');
      setLiveTeams([]);
      setTasks(sampleTasks.map(t => ({ ...t, id: null, key: t.id, due: dueLabel(t.dueAt), overdue: isPastDue(t.dueAt, t.status) })));
    });
    return () => { cancelled = true; };
  }, [auth.accessToken, liveDataEnabled]);

  useEffect(() => {
    let cancelled = false;
    setActivityItems([]);
    setActivityError(null);
    if (!editingTask?.id || !auth.accessToken || !liveDataEnabled) return () => { cancelled = true; };
    void workItemsApi.activity(auth.accessToken, editingTask.id).then(items => {
      if (!cancelled) setActivityItems(items);
    }).catch(error => {
      if (!cancelled) setActivityError(error instanceof ApiError ? error.message : 'Could not load activity history.');
    });
    return () => { cancelled = true; };
  }, [editingTask?.id, auth.accessToken, liveDataEnabled]);

  useEffect(() => {
    let cancelled = false;
    setRecentActivityItems([]);
    setRecentActivityError(null);
    if (dataMode !== 'live' || !auth.accessToken || !liveDataEnabled) return () => { cancelled = true; };
    void workItemsApi.recentActivity(auth.accessToken, 10).then(items => {
      if (!cancelled) setRecentActivityItems(items);
    }).catch(error => {
      if (!cancelled) setRecentActivityError(error instanceof ApiError ? error.message : 'Could not load recent activity.');
    });
    return () => { cancelled = true; };
  }, [dataMode, auth.accessToken, liveDataEnabled]);

  async function refreshRecentActivity() {
    if (!auth.accessToken || !liveDataEnabled) return;
    try {
      const items = await workItemsApi.recentActivity(auth.accessToken, 10);
      setRecentActivityItems(items);
      setRecentActivityError(null);
    } catch (error) {
      setRecentActivityError(error instanceof ApiError ? error.message : 'Could not load recent activity.');
    }
  }

  async function createWorkItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken || !liveDataEnabled) {
      setCreateError('Demo mode is read-only for data safety. API writes require explicit live-data opt-in and a trusted session.');
      return;
    }
    const title = newTitle.trim();
    if (!title) {
      setCreateError('Enter a title for this work item.');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      if (editingTask?.id) {
        const updated = await workItemsApi.update(auth.accessToken, editingTask.id, { title, product: newProduct.trim() || null, category: newCategory.trim() || null, requester: newRequester.trim() || null, owner: newOwner.trim() || null, priority: newPriority, due_at: newDueDate ? new Date(`${newDueDate}T23:59:00`).toISOString() : null, team_id: newTeamId || null });
        setTasks(current => current.map(item => item.id === editingTask.id ? toTaskRow(updated, liveTeams.find(team => team.id === updated.team_id)?.name) : item));
        await refreshRecentActivity();
      } else {
        const created = await workItemsApi.create(auth.accessToken, { title, product: newProduct.trim() || null, category: newCategory.trim() || null, requester: newRequester.trim() || null, owner: newOwner.trim() || null, priority: newPriority, due_at: newDueDate ? new Date(`${newDueDate}T23:59:00`).toISOString() : null, team_id: newTeamId || null });
        setTasks(current => [toTaskRow(created, liveTeams.find(team => team.id === created.team_id)?.name), ...current]);
        await refreshRecentActivity();
      }
      setDataMode('live');
      setNewTitle(''); setNewProduct(''); setNewCategory(''); setNewRequester(''); setNewOwner(''); setNewDueDate(''); setNewPriority('Medium'); setNewTeamId('');
      setEditingTask(null);
      setShowNew(false);
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : 'Could not save this work item. Check the API connection.');
    } finally {
      setCreating(false);
    }
  }

  async function changeStatus(task: TaskRow, nextStatus: WorkItem['status']) {
    if (!auth.accessToken || !task.id || task.status === nextStatus) return;
    const previousStatus = task.status;
    setTasks(current => current.map(item => item.id === task.id ? { ...item, status: nextStatus } : item));
    setDataError(null);
    try {
      const updated = await workItemsApi.update(auth.accessToken, task.id, { status: nextStatus });
      setTasks(current => current.map(item => item.id === task.id ? toTaskRow(updated, liveTeams.find(team => team.id === updated.team_id)?.name) : item));
      await refreshRecentActivity();
    } catch (error) {
      setTasks(current => current.map(item => item.id === task.id ? { ...item, status: previousStatus } : item));
      setDataError(error instanceof ApiError ? error.message : 'Could not update status. Please try again.');
    }
  }

  function exportWorkItemsCsv() {
    const columns = ['Key', 'Title', 'Product', 'Category', 'Requester', 'Owner', 'Team', 'Status', 'Priority', 'Due date', 'SLA overdue'];
    const rows = filtered.map(item => [item.key, item.title, item.product, item.category, item.requester, item.owner, item.team, item.status, item.priority, item.due, item.overdue ? 'Yes' : 'No']);
    const escapeCell = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [columns, ...rows].map(row => row.map(value => escapeCell(String(value ?? ''))).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `worktrack360-${dataMode === 'live' ? 'workspace' : 'demo'}-work-items.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const filtered = tasks.filter(t =>
    (statusFilter === 'All' || t.status === statusFilter) &&
    (productFilter === 'All' || t.product === productFilter) &&
    (categoryFilter === 'All' || t.category === categoryFilter) &&
    `${t.key} ${t.title} ${t.team} ${t.product} ${t.category} ${t.requester} ${t.owner} ${t.status} ${t.priority}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const productOptions = [...new Set([...productOptionsConfig, ...tasks.map(t => t.product).filter(Boolean)])].sort();
  const categoryOptions = [...new Set([...categoryOptionsConfig, ...tasks.map(t => t.category).filter(Boolean)])].sort();
  const overdueCount = tasks.filter(t => t.overdue).length;
  const criticalOverdueCount = tasks.filter(t => t.overdue && t.dueAt && (Date.now() - new Date(t.dueAt).getTime()) >= Number(criticalOverdueDays) * 86400000).length;
  const dueSoonCount = tasks.filter(t => t.dueAt && !t.overdue && !['Resolved', 'Closed'].includes(t.status) && (new Date(t.dueAt).getTime() - Date.now()) <= Number(slaWarningHours) * 3600000).length;
  const reportWindowMs = Number(reportPeriod) * 86400000;
  const periodTasks = tasks.filter(t => t.dueAt && (Date.now() - new Date(t.dueAt).getTime()) >= 0 && (Date.now() - new Date(t.dueAt).getTime()) <= reportWindowMs);
  const periodOverdue = periodTasks.filter(t => t.overdue).length;
  const periodCompleted = periodTasks.filter(t => ['Resolved', 'Closed'].includes(t.status)).length;
  const openCount = tasks.filter(t => !['Resolved', 'Closed'].includes(t.status)).length;
  const reviewCount = tasks.filter(t => t.status === 'Needs review').length;
  const blockedCount = tasks.filter(t => t.status === 'Blocked').length;
  const completedCount = tasks.filter(t => ['Resolved', 'Closed'].includes(t.status)).length;
  const liveSummary = dataMode === 'live';
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#home" aria-label="WorkTrack360 home"><span className="brand-mark"><Workflow size={23}/></span><span><strong>WorkTrack<span>360</span></strong><small>WORKSPACE OPERATIONS</small></span></a>
      <div className="workspace-switch"><span className="workspace-avatar">W</span><span className="workspace-name"><b>Workspace</b><small>Product Support</small></span><ChevronDown size={16}/></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav aria-label="Primary navigation">{nav.map(item => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${active === item.label ? 'selected' : ''}`} onClick={() => setActive(item.label)}><Icon size={18}/><span>{item.label}</span>{item.label === 'Customer escalations' && <span className="nav-count">4</span>}</button>; })}</nav>
      <div className="nav-caption tools-caption">PREFERENCES</div>
      <button className={`nav-item ${active === 'Workspace settings' ? 'selected' : ''}`} onClick={() => setActive('Workspace settings')}><Settings2 size={18}/><span>Workspace settings</span></button>
      <div className="sidebar-bottom"><div className="security-note"><ShieldCheck size={18}/><div><b>Designed for control</b><small>Access and audit controls are planned for the secure release.</small></div></div><div className="profile"><span className="profile-avatar">R</span><div><b>Workspace admin</b><small>Local preview</small></div><button aria-label="Help"><CircleHelp size={17}/></button></div></div>
    </aside>
    <main className="main-panel"><header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="slash">/</span><b>{active}</b></div><div className="top-actions"><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button><button className="help-link"><CircleHelp size={17}/> Help centre</button>{auth.user ? <button className="secondary-button" onClick={() => void auth.signOut()}>Sign out</button> : <button className="secondary-button" onClick={() => void auth.signIn()} disabled={auth.loading || !auth.configured}>{auth.loading ? "Checking session…" : "Sign in"}</button>}<span className="top-avatar">{auth.user?.profile.name?.toString().slice(0,1) || "R"}</span></div></header>
      <section className="page-content"><div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> WORKSPACE OVERVIEW</div><h1>{active === 'Overview' ? 'Good morning, team.' : active}</h1><p className="subheading">A clear view of the work, hand-offs and outcomes that move your team forward.</p></div><button className="primary-button" onClick={() => { setEditingTask(null); setNewTitle(''); setNewProduct(''); setNewCategory(''); setNewRequester(''); setNewOwner(''); setNewDueDate(''); setNewPriority('Medium'); setNewTeamId(''); setCreateError(null); setShowNew(true); }}><Plus size={17}/> Create work item</button></div>
        <div className="notice"><div className="notice-icon"><ShieldCheck size={18}/></div><div><b>{auth.configured ? (auth.user ? "Identity provider connected" : "Sign-in configured") : "Demo mode — dummy data only"}</b><p>{dataError || auth.error || (dataMode === "live" ? "Live work items loaded from the API. Summary cards still contain illustrative sample metrics." : auth.configured ? (auth.user ? "You are signed in, but live API data is not available yet. Check the API audience and workspace/roles claims." : "Sign in to establish a trusted browser session. Live data requires a matching backend identity-provider configuration.") : "This preview uses fictional sample records. Demo mode uses fictional records only. Live API data is disabled unless VITE_ENABLE_LIVE_DATA=true is explicitly set.")}</p></div><span className="preview-tag">{dataMode === "live" ? "LIVE DATA" : auth.configured ? (auth.user ? "SIGNED IN" : "AUTH READY") : "PREVIEW"}</span></div>
        {active === 'Workspace settings' && <section className="work-card settings-card"><div className="card-heading"><div><h2>Workspace dropdowns</h2><p>Customize the fictional options used in this local demo. Changes are kept in this browser session only.</p></div><span className="preview-tag">DEMO SETTINGS</span></div>{settingsMessage && <p className="settings-message" role="status">{settingsMessage}</p>}<div className="settings-grid">{([{key:'products',title:'Products',items:productOptionsConfig,placeholder:'Add a fictional product',add:(value:string)=>setProductOptionsConfig(items=>[...items,value]),remove:(value:string)=>setProductOptionsConfig(items=>items.filter(item=>item!==value))},{key:'categories',title:'Activity categories',items:categoryOptionsConfig,placeholder:'Add an activity category',add:(value:string)=>setCategoryOptionsConfig(items=>[...items,value]),remove:(value:string)=>setCategoryOptionsConfig(items=>items.filter(item=>item!==value))},{key:'teams',title:'Teams',items:teamOptionsConfig,placeholder:'Add a demo team',add:(value:string)=>setTeamOptionsConfig(items=>[...items,value]),remove:(value:string)=>setTeamOptionsConfig(items=>items.filter(item=>item!==value))}] as const).map(group => <div className="settings-group" key={group.key}><h3>{group.title}</h3><form className="settings-add" onSubmit={event=>{event.preventDefault();const value=settingsDraft[group.key].trim();if(!value){setSettingsMessage('Enter a value before adding it.');return;}if(group.items.some(item=>item.toLowerCase()===value.toLowerCase())){setSettingsMessage('That option already exists.');return;}group.add(value);setSettingsDraft(current=>({...current,[group.key]:''}));setSettingsMessage(`${group.title.slice(0,-1)} added to demo options.`);}}><input aria-label={`New ${group.title}`} value={settingsDraft[group.key]} onChange={event=>setSettingsDraft(current=>({...current,[group.key]:event.target.value}))} placeholder={group.placeholder} maxLength={120}/><button type="submit" className="secondary-button">Add</button></form><ul className="settings-option-list">{group.items.map(item=><li key={item}><span>{item}</span><button type="button" aria-label={`Remove ${item}`} title={`Remove ${item}`} onClick={()=>{group.remove(item);setSettingsMessage(`Removed “${item}” from the available demo options. Existing sample rows are unchanged.`);}}><Trash2 size={14}/></button></li>)}</ul></div>)}</div><section className="settings-policy"><div><h3>SLA policy preview</h3><p>Adjust warning and critical-overdue thresholds for the fictional dashboard. These settings are session-only and do not alter server-side SLAs.</p></div><div className="settings-policy-fields"><label>Due-soon warning<select aria-label="SLA warning window" value={slaWarningHours} onChange={event=>setSlaWarningHours(event.target.value)}><option value="24">Within 24 hours</option><option value="48">Within 48 hours</option><option value="72">Within 72 hours</option></select></label><label>Critical overdue after<select aria-label="Critical overdue threshold" value={criticalOverdueDays} onChange={event=>setCriticalOverdueDays(event.target.value)}><option value="1">1 day</option><option value="2">2 days</option><option value="3">3 days</option></select></label></div><div className="policy-preview-stats"><span><b>{dueSoonCount}</b> Due soon</span><span><b>{overdueCount}</b> Overdue</span><span><b>{criticalOverdueCount}</b> Critical overdue</span></div></section><p className="settings-footnote"><ShieldCheck size={15}/> Demo-only settings. No real customer data or remote settings are read or written.</p></section>}
        {active !== 'Workspace settings' && <>
        {active === 'Analytics & reports' && <section className="work-card report-card"><div className="card-heading"><div><h2>Reporting period</h2><p>{dataMode === 'live' ? 'Summary calculated from authenticated live work items. The selected window is based on due dates.' : 'Summary calculated from fictional sample work items only. The selected window is based on due dates.'}</p></div><label className="report-period">Period<select aria-label="Reporting period" value={reportPeriod} onChange={event=>setReportPeriod(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label></div><div className="report-stat-grid"><article><span>Items in period</span><b>{periodTasks.length}</b></article><article><span>Overdue items</span><b>{periodOverdue}</b></article><article><span>Completed items</span><b>{periodCompleted}</b></article><article><span>Completion rate</span><b>{periodTasks.length ? Math.round(periodCompleted / periodTasks.length * 100) : 0}%</b></article></div><p className="settings-footnote"><ShieldCheck size={15}/> {dataMode === 'live' ? 'Live report from the work items currently loaded; this view does not include historical records outside the loaded page.' : 'Preview report only. This does not represent actual team performance.'}</p></section>}
        <div className="metric-grid"><article className="metric-card"><div className="metric-top"><span>Open work items</span><span className="metric-icon violet"><ListTodo size={18}/></span></div><div className="metric-value">{liveSummary ? openCount : '28'}</div><div className="metric-foot"><span className="positive"><ArrowUpRight size={14}/> 8.2%</span><span>vs. last week</span></div><div className="mini-bars">{[35,48,39,58,45,70,62,82,67,91,73,86].map((v,i)=><i key={i} style={{height:`${v}%`}}/>)}</div></article>
          <article className="metric-card"><div className="metric-top"><span>{liveSummary ? 'Needs review' : 'Overdue (demo)'}</span><span className="metric-icon amber"><CalendarClock size={18}/></span></div><div className="metric-value">{liveSummary ? reviewCount : overdueCount}</div><div className="metric-foot"><span className="muted-strong">{liveSummary ? `${blockedCount} blocked` : '2 high priority'}</span><span>{liveSummary ? 'live items' : 'dummy items'}</span></div><div className="metric-progress"><span style={{width:'64%'}}/></div><small className="metric-caption">64% of today's items completed</small></article>
          <article className="metric-card"><div className="metric-top"><span>{liveSummary ? 'Blocked items' : 'Customer escalations'}</span><span className="metric-icon rose"><Workflow size={18}/></span></div><div className="metric-value">{liveSummary ? blockedCount : '04'}</div><div className="metric-foot"><span className="warning-text">{liveSummary ? reviewCount : '2 awaiting response'}</span><span>{liveSummary ? 'need review' : 'needs attention'}</span></div><div className="avatar-stack"><span>PS</span><span>PO</span><span>EN</span><small>+1 team</small></div></article>
          <article className="metric-card"><div className="metric-top"><span>{liveSummary ? 'Completed' : 'On-time completion'}</span><span className="metric-icon green"><CheckCircle2 size={18}/></span></div><div className="metric-value">{liveSummary ? (tasks.length ? Math.round(completedCount / tasks.length * 100) : 0) : 94}<span className="percent">%</span></div><div className="metric-foot"><span className="positive"><ArrowUpRight size={14}/> 3.4%</span><span>this month</span></div><div className="sparkline"><svg viewBox="0 0 200 42" role="img" aria-label="Illustrative completion trend"><path d="M0 34 C18 28 21 32 36 22 S60 28 76 18 S99 25 116 13 S142 21 158 8 S183 15 200 3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></div></article></div>
        <section className="work-card"><div className="card-heading"><div><h2>Priority work</h2><p>Keep the next actions visible and accountable.</p></div><div className="card-actions"><button className="text-button" onClick={exportWorkItemsCsv}>Export {dataMode === 'live' ? 'CSV' : 'demo CSV'}</button><button className="text-button" onClick={() => setActive('Work items')}>View all work <ArrowUpRight size={15}/></button></div></div><div className="table-toolbar"><div className="table-tabs"><button className={statusFilter === 'All' ? 'tab-active' : ''} onClick={() => setStatusFilter('All')}>All work <span>{tasks.length}</span></button><button className={statusFilter === 'In progress' ? 'tab-active' : ''} onClick={() => setStatusFilter('In progress')}>In progress</button><button className={statusFilter === 'Needs review' ? 'tab-active' : ''} onClick={() => setStatusFilter('Needs review')}>Needs review</button></div><div className="table-filters"><label>Product<select aria-label="Filter by product" value={productFilter} onChange={e => setProductFilter(e.target.value)}><option value="All">All products</option>{productOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label>Category<select aria-label="Filter by category" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="All">All categories</option>{categoryOptions.map(value => <option key={value} value={value}>{value}</option>)}</select></label></div><label className="search-box"><Search size={16}/><input aria-label="Search work" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search work items..."/><kbd><Command size={11}/> K</kbd></label></div>
          <div className="table-wrap"><table><thead><tr><th>WORK ITEM</th><th>RESPONSIBLE TEAM</th><th>STATUS</th><th>PRIORITY</th><th>DUE DATE</th><th/></tr></thead><tbody>{filtered.map(t=><tr key={t.id ?? t.key}><td><div className="task-title"><span className="task-check"><CheckCircle2 size={15}/></span><span><b>{t.title}</b><small>{t.key}</small></span></div></td><td><span className="team-pill"><span className="team-dot"/>{t.team}</span></td><td>{dataMode === 'live' && auth.accessToken && t.id ? <select className={`status-select ${t.status.toLowerCase().replaceAll(' ','-')}`} aria-label={`Status for ${t.key}`} value={t.status} onChange={event => void changeStatus(t, event.target.value as WorkItem['status'])}>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select> : <span className={`status-pill ${t.status.toLowerCase().replaceAll(' ','-')}`}><i/>{t.status}</span>}</td><td><span className={`priority ${t.priority.toLowerCase()}`}><i/>{t.priority}</span></td><td className={`due-date ${t.overdue ? 'overdue-date' : ''}`}><span>{t.due}</span>{t.overdue && <small className="overdue-badge">SLA overdue</small>}</td><td><button className="row-menu" aria-label={`Edit ${t.key}`} disabled={dataMode !== 'live' || !liveDataEnabled || !auth.accessToken || !t.id} title={dataMode === 'live' ? 'Edit work item title' : 'Connect live data to edit items'} onClick={() => { setEditingTask(t); setNewTitle(t.title); setNewProduct(t.product); setNewCategory(t.category); setNewRequester(t.requester); setNewOwner(t.owner); setNewDueDate(t.dueAt ? new Date(t.dueAt).toISOString().slice(0,10) : ''); setNewPriority(t.priority); setNewTeamId(liveTeams.find(team => team.name === t.team)?.id || ''); setCreateError(null); setShowNew(true); }}>···</button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state">No matching work items. Try a different search.</div>}</div>
          <div className="table-footer"><span>Showing <b>{filtered.length}</b> {dataMode === "live" ? "live work items" : "sample work items"}</span><button onClick={() => { setQuery(''); setStatusFilter('All'); setProductFilter('All'); setCategoryFilter('All'); }}>Clear filters</button></div></section>
        <section className="work-card activity-card"><div className="card-heading"><div><h2>Recent activity</h2><p>{dataMode === 'live' ? 'Recent recorded work-item changes in your workspace.' : 'Illustrative events generated from fictional demo records.'}</p></div><span className="preview-tag">{dataMode === 'live' ? 'WORKSPACE ACTIVITY' : 'DEMO ONLY'}</span></div><div className="activity-list">{dataMode === 'live' ? <>{recentActivityError && <p role="alert" className="form-error">{recentActivityError}</p>}{!recentActivityError && recentActivityItems.length === 0 && <p className="settings-footnote">No recorded activity found for the current workspace.</p>}{recentActivityItems.map((item,index)=><div className="activity-item" key={`${item.created_at}-${item.key}-${index}`}><span className="activity-mark violet-mark">{item.action === 'work_item.created' ? <Plus size={15}/> : <Activity size={15}/>}</span><div><b>Workspace member</b> {item.action === 'work_item.created' ? 'created' : 'updated'} <strong>{item.key}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div></div>)}</> : <><div className="activity-item"><span className="activity-mark violet-mark"><CheckCircle2 size={15}/></span><div><b>Demo Support Owner A</b> updated <strong>WT-1048</strong> status to In progress<small>Today · Sample activity</small></div></div><div className="activity-item"><span className="activity-mark amber-mark"><Users size={15}/></span><div><b>Demo Product Owner B</b> received a hand-off for <strong>WT-1047</strong><small>Yesterday · Sample activity</small></div></div><div className="activity-item"><span className="activity-mark green-mark"><Activity size={15}/></span><div><b>Demo Documentation Owner C</b> updated the guide task <strong>WT-1046</strong><small>2 days ago · Sample activity</small></div></div></>}</div></section>
        <footer className="page-footer"><span>WorkTrack360 <span className="footer-dot">·</span> Plan. Track. Collaborate. Deliver.</span><span><i/> {dataMode === "live" ? "Work items loaded from API" : "Illustrative sample data"}</span></footer>
        </>}
      </section>
    </main>
    {showNew && <div className="modal-backdrop" role="presentation" onMouseDown={e => {if(e.target === e.currentTarget) { setShowNew(false); setEditingTask(null); }}}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onSubmit={createWorkItem}><button type="button" className="modal-close" aria-label="Close" onClick={() => { setShowNew(false); setEditingTask(null); }}>×</button><div className="modal-icon"><Plus size={20}/></div><h2 id="modal-title">{editingTask ? 'Edit work item' : 'Create a work item'}</h2><p>{auth.accessToken ? (editingTask ? 'Update the title for this work item.' : 'Save a new work item to your authenticated workspace.') : 'Sign in and configure the API before saving work items.'}</p><label>Work item title<input value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="e.g. Validate customer report" maxLength={240} required /></label><div className="form-grid"><label>Product<select aria-label="Product" value={newProduct} onChange={event => setNewProduct(event.target.value)}><option value="">Select product</option>{productOptions.map(value=><option key={value} value={value}>{value}</option>)}</select></label><label>Activity category<select aria-label="Activity category" value={newCategory} onChange={event => setNewCategory(event.target.value)}><option value="">Select category</option>{categoryOptions.map(value=><option key={value} value={value}>{value}</option>)}</select></label><label>Requester<input value={newRequester} onChange={event => setNewRequester(event.target.value)} placeholder="Who requested this?" maxLength={255}/></label><label>Owner<input value={newOwner} onChange={event => setNewOwner(event.target.value)} placeholder="Who owns the next action?" maxLength={255}/></label><label>Priority<select aria-label="Priority" value={newPriority} onChange={event=>setNewPriority(event.target.value as WorkItem['priority'])}>{priorities.map(value=><option key={value} value={value}>{value}</option>)}</select></label><label>Due date<input aria-label="Due date" type="date" value={newDueDate} onChange={event=>setNewDueDate(event.target.value)}/></label><label>Responsible team<select aria-label="Responsible team" value={newTeamId} onChange={event=>setNewTeamId(event.target.value)}><option value="">Unassigned</option>{liveTeams.map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div>{editingTask?.id && dataMode === 'live' && <section className="item-activity" aria-label="Work item activity"><h3>Activity history</h3>{activityError && <p role="alert" className="form-error">{activityError}</p>}{!activityError && activityItems.length === 0 && <p className="settings-footnote">No recorded activity yet.</p>}{activityItems.map((item,index)=><div className="item-activity-row" key={`${item.created_at}-${index}`}><span>{item.action.replaceAll('_',' ')}</span><small>{item.actor_subject || 'System'} · {new Date(item.created_at).toLocaleString()}</small></div>)}</section>}{createError && <p role="alert" className="form-error">{createError}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setShowNew(false); setEditingTask(null); }}>Cancel</button><button type="submit" className="primary-button" disabled={creating || !auth.accessToken}>{creating ? "Saving…" : editingTask ? "Save changes" : "Create work item"}</button></div></form></div>}
  </div>;
}
