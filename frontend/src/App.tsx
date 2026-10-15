import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from './auth/AuthProvider';
import { ApiError, workItemsApi, type WorkItem } from './api/workItems';
import { Activity, ArrowUpRight, Bell, CalendarClock, CheckCircle2, ChevronDown, CircleHelp, Command, Gauge, LayoutDashboard, ListTodo, Plus, Search, Settings2, ShieldCheck, Users, Workflow } from 'lucide-react';

type NavItem = { label: string; icon: typeof Gauge };
const nav: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard }, { label: 'Work items', icon: ListTodo },
  { label: 'Customer escalations', icon: Workflow }, { label: 'Demo & enablement', icon: Users },
  { label: 'Compliance deadlines', icon: CalendarClock }, { label: 'Analytics & reports', icon: Activity },
];
const sampleTasks = [
  { id: 'WT-1048', title: 'Review quarterly validation issue', team: 'Product Support', status: 'In progress', priority: 'High', due: 'Today' },
  { id: 'WT-1047', title: 'Prepare customer demo walkthrough', team: 'Product Owner', status: 'Needs review', priority: 'Medium', due: 'Today' },
  { id: 'WT-1046', title: 'Update compliance user guide', team: 'Documentation', status: 'Open', priority: 'Low', due: 'Tomorrow' },
  { id: 'WT-1045', title: 'Confirm engineering hand-off', team: 'Engineering', status: 'In progress', priority: 'High', due: 'Oct 19' },
] as const;
type TaskRow = { id: string | null; key: string; title: string; team: string; product: string; category: string; requester: string; owner: string; status: WorkItem['status']; priority: WorkItem['priority']; due: string };
const statuses: WorkItem['status'][] = ['Open', 'In progress', 'Needs review', 'Blocked', 'Resolved', 'Closed'];
function toTaskRow(item: WorkItem): TaskRow {
  return {
    id: item.id,
    key: item.key,
    title: item.title,
    team: item.team_id ? `Team ${item.team_id.slice(0, 8)}` : 'Unassigned',
    product: item.product ?? '', category: item.category ?? '', requester: item.requester ?? '', owner: item.owner ?? '',
    status: item.status,
    priority: item.priority,
    due: item.due_at ? new Date(item.due_at).toLocaleDateString() : '—',
  };
}
export default function App() {
  const auth = useAuth();
  const [active, setActive] = useState('Overview');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkItem['status'] | 'All'>('All');
  const [showNew, setShowNew] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>(sampleTasks.map(t => ({ ...t, id: null, key: t.id, product: '', category: '', requester: '', owner: '' })));
  const [dataMode, setDataMode] = useState<'sample' | 'live'>('sample');
  const [dataError, setDataError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newRequester, setNewRequester] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!auth.accessToken) {
      setTasks(sampleTasks.map(t => ({ ...t, id: null, key: t.id })));
      setDataMode('sample');
      setDataError(null);
      return () => { cancelled = true; };
    }
    void workItemsApi.list(auth.accessToken, 50, 0).then(items => {
      if (cancelled) return;
      setTasks(items.map(toTaskRow));
      setDataMode('live');
      setDataError(null);
    }).catch(error => {
      if (cancelled) return;
      setDataMode('sample');
      setDataError(error instanceof ApiError ? error.message : 'Could not load live work items. Check the API connection.');
      setTasks(sampleTasks.map(t => ({ ...t, id: null, key: t.id })));
    });
    return () => { cancelled = true; };
  }, [auth.accessToken]);

  async function createWorkItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.accessToken) {
      setCreateError('Sign in and configure the API before saving work items.');
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
        const updated = await workItemsApi.update(auth.accessToken, editingTask.id, { title, product: newProduct.trim() || null, category: newCategory.trim() || null, requester: newRequester.trim() || null, owner: newOwner.trim() || null });
        setTasks(current => current.map(item => item.id === editingTask.id ? toTaskRow(updated) : item));
      } else {
        const created = await workItemsApi.create(auth.accessToken, { title, product: newProduct.trim() || null, category: newCategory.trim() || null, requester: newRequester.trim() || null, owner: newOwner.trim() || null });
        setTasks(current => [toTaskRow(created), ...current]);
      }
      setDataMode('live');
      setNewTitle(''); setNewProduct(''); setNewCategory(''); setNewRequester(''); setNewOwner('');
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
      setTasks(current => current.map(item => item.id === task.id ? toTaskRow(updated) : item));
    } catch (error) {
      setTasks(current => current.map(item => item.id === task.id ? { ...item, status: previousStatus } : item));
      setDataError(error instanceof ApiError ? error.message : 'Could not update status. Please try again.');
    }
  }

  const filtered = tasks.filter(t =>
    (statusFilter === 'All' || t.status === statusFilter) &&
    `${t.key} ${t.title} ${t.team} ${t.product} ${t.category} ${t.requester} ${t.owner} ${t.status} ${t.priority}`.toLowerCase().includes(query.trim().toLowerCase())
  );
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
      <section className="page-content"><div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> WORKSPACE OVERVIEW</div><h1>{active === 'Overview' ? 'Good morning, team.' : active}</h1><p className="subheading">A clear view of the work, hand-offs and outcomes that move your team forward.</p></div><button className="primary-button" onClick={() => { setEditingTask(null); setNewTitle(''); setNewProduct(''); setNewCategory(''); setNewRequester(''); setNewOwner(''); setCreateError(null); setShowNew(true); }}><Plus size={17}/> Create work item</button></div>
        <div className="notice"><div className="notice-icon"><ShieldCheck size={18}/></div><div><b>{auth.configured ? (auth.user ? "Identity provider connected" : "Sign-in configured") : "Foundation preview"}</b><p>{dataError || auth.error || (dataMode === "live" ? "Live work items loaded from the API. Summary cards still contain illustrative sample metrics." : auth.configured ? (auth.user ? "You are signed in, but live API data is not available yet. Check the API audience and workspace/roles claims." : "Sign in to establish a trusted browser session. Live data requires a matching backend identity-provider configuration.") : "This preview uses fictional sample records. Configure the free OIDC provider settings to enable sign-in; live data is not connected yet.")}</p></div><span className="preview-tag">{dataMode === "live" ? "LIVE DATA" : auth.configured ? (auth.user ? "SIGNED IN" : "AUTH READY") : "PREVIEW"}</span></div>
        <div className="metric-grid"><article className="metric-card"><div className="metric-top"><span>Open work items</span><span className="metric-icon violet"><ListTodo size={18}/></span></div><div className="metric-value">{liveSummary ? openCount : '28'}</div><div className="metric-foot"><span className="positive"><ArrowUpRight size={14}/> 8.2%</span><span>vs. last week</span></div><div className="mini-bars">{[35,48,39,58,45,70,62,82,67,91,73,86].map((v,i)=><i key={i} style={{height:`${v}%`}}/>)}</div></article>
          <article className="metric-card"><div className="metric-top"><span>{liveSummary ? 'Needs review' : 'Due today'}</span><span className="metric-icon amber"><CalendarClock size={18}/></span></div><div className="metric-value">{liveSummary ? reviewCount : '06'}</div><div className="metric-foot"><span className="muted-strong">{liveSummary ? `${blockedCount} blocked` : '2 high priority'}</span><span>{liveSummary ? 'live items' : 'across 3 teams'}</span></div><div className="metric-progress"><span style={{width:'64%'}}/></div><small className="metric-caption">64% of today's items completed</small></article>
          <article className="metric-card"><div className="metric-top"><span>{liveSummary ? 'Blocked items' : 'Customer escalations'}</span><span className="metric-icon rose"><Workflow size={18}/></span></div><div className="metric-value">{liveSummary ? blockedCount : '04'}</div><div className="metric-foot"><span className="warning-text">{liveSummary ? reviewCount : '2 awaiting response'}</span><span>{liveSummary ? 'need review' : 'needs attention'}</span></div><div className="avatar-stack"><span>PS</span><span>PO</span><span>EN</span><small>+1 team</small></div></article>
          <article className="metric-card"><div className="metric-top"><span>{liveSummary ? 'Completed' : 'On-time completion'}</span><span className="metric-icon green"><CheckCircle2 size={18}/></span></div><div className="metric-value">{liveSummary ? (tasks.length ? Math.round(completedCount / tasks.length * 100) : 0) : 94}<span className="percent">%</span></div><div className="metric-foot"><span className="positive"><ArrowUpRight size={14}/> 3.4%</span><span>this month</span></div><div className="sparkline"><svg viewBox="0 0 200 42" role="img" aria-label="Illustrative completion trend"><path d="M0 34 C18 28 21 32 36 22 S60 28 76 18 S99 25 116 13 S142 21 158 8 S183 15 200 3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></div></article></div>
        <section className="work-card"><div className="card-heading"><div><h2>Priority work</h2><p>Keep the next actions visible and accountable.</p></div><button className="text-button" onClick={() => setActive('Work items')}>View all work <ArrowUpRight size={15}/></button></div><div className="table-toolbar"><div className="table-tabs"><button className={statusFilter === 'All' ? 'tab-active' : ''} onClick={() => setStatusFilter('All')}>All work <span>{tasks.length}</span></button><button className={statusFilter === 'In progress' ? 'tab-active' : ''} onClick={() => setStatusFilter('In progress')}>In progress</button><button className={statusFilter === 'Needs review' ? 'tab-active' : ''} onClick={() => setStatusFilter('Needs review')}>Needs review</button></div><label className="search-box"><Search size={16}/><input aria-label="Search work" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search work items..."/><kbd><Command size={11}/> K</kbd></label></div>
          <div className="table-wrap"><table><thead><tr><th>WORK ITEM</th><th>RESPONSIBLE TEAM</th><th>STATUS</th><th>PRIORITY</th><th>DUE DATE</th><th/></tr></thead><tbody>{filtered.map(t=><tr key={t.id ?? t.key}><td><div className="task-title"><span className="task-check"><CheckCircle2 size={15}/></span><span><b>{t.title}</b><small>{t.key}</small></span></div></td><td><span className="team-pill"><span className="team-dot"/>{t.team}</span></td><td>{dataMode === 'live' && auth.accessToken && t.id ? <select className={`status-select ${t.status.toLowerCase().replaceAll(' ','-')}`} aria-label={`Status for ${t.key}`} value={t.status} onChange={event => void changeStatus(t, event.target.value as WorkItem['status'])}>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select> : <span className={`status-pill ${t.status.toLowerCase().replaceAll(' ','-')}`}><i/>{t.status}</span>}</td><td><span className={`priority ${t.priority.toLowerCase()}`}><i/>{t.priority}</span></td><td className="due-date">{t.due}</td><td><button className="row-menu" aria-label={`Edit ${t.key}`} disabled={dataMode !== 'live' || !auth.accessToken || !t.id} title={dataMode === 'live' ? 'Edit work item title' : 'Connect live data to edit items'} onClick={() => { setEditingTask(t); setNewTitle(t.title); setNewProduct(t.product); setNewCategory(t.category); setNewRequester(t.requester); setNewOwner(t.owner); setCreateError(null); setShowNew(true); }}>···</button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state">No matching work items. Try a different search.</div>}</div>
          <div className="table-footer"><span>Showing <b>{filtered.length}</b> {dataMode === "live" ? "live work items" : "sample work items"}</span><button onClick={() => { setQuery(''); setStatusFilter('All'); }}>Clear filters</button></div></section>
        <footer className="page-footer"><span>WorkTrack360 <span className="footer-dot">·</span> Plan. Track. Collaborate. Deliver.</span><span><i/> {dataMode === "live" ? "Work items loaded from API" : "Illustrative sample data"}</span></footer>
      </section>
    </main>
    {showNew && <div className="modal-backdrop" role="presentation" onMouseDown={e => {if(e.target === e.currentTarget) { setShowNew(false); setEditingTask(null); }}}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onSubmit={createWorkItem}><button type="button" className="modal-close" aria-label="Close" onClick={() => { setShowNew(false); setEditingTask(null); }}>×</button><div className="modal-icon"><Plus size={20}/></div><h2 id="modal-title">{editingTask ? 'Edit work item' : 'Create a work item'}</h2><p>{auth.accessToken ? (editingTask ? 'Update the title for this work item.' : 'Save a new work item to your authenticated workspace.') : 'Sign in and configure the API before saving work items.'}</p><label>Work item title<input value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="e.g. Validate customer report" maxLength={240} required /></label><div className="form-grid"><label>Product<input value={newProduct} onChange={event => setNewProduct(event.target.value)} placeholder="e.g. Glacier CRD IV" maxLength={120}/></label><label>Activity category<input value={newCategory} onChange={event => setNewCategory(event.target.value)} placeholder="e.g. Customer ticket" maxLength={120}/></label><label>Requester<input value={newRequester} onChange={event => setNewRequester(event.target.value)} placeholder="Who requested this?" maxLength={255}/></label><label>Owner<input value={newOwner} onChange={event => setNewOwner(event.target.value)} placeholder="Who owns the next action?" maxLength={255}/></label></div>{createError && <p role="alert" className="form-error">{createError}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setShowNew(false); setEditingTask(null); }}>Cancel</button><button type="submit" className="primary-button" disabled={creating || !auth.accessToken}>{creating ? "Saving…" : editingTask ? "Save changes" : "Create work item"}</button></div></form></div>}
  </div>;
}
