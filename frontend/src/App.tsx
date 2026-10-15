import { useEffect, useState } from 'react';
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
type TaskRow = { id: string; title: string; team: string; status: string; priority: string; due: string };
function toTaskRow(item: WorkItem): TaskRow {
  return {
    id: item.key,
    title: item.title,
    team: item.team_id ? `Team ${item.team_id.slice(0, 8)}` : 'Unassigned',
    status: item.status,
    priority: item.priority,
    due: item.due_at ? new Date(item.due_at).toLocaleDateString() : '—',
  };
}
export default function App() {
  const [active, setActive] = useState('Overview');
  const [query, setQuery] = useState('');
  const [showNew, setShowNew] = useState(false);
  const filtered = tasks.filter(t => `${t.id} ${t.title} ${t.team} ${t.status}`.toLowerCase().includes(query.toLowerCase()));
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
      <section className="page-content"><div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> WORKSPACE OVERVIEW</div><h1>{active === 'Overview' ? 'Good morning, team.' : active}</h1><p className="subheading">A clear view of the work, hand-offs and outcomes that move your team forward.</p></div><button className="primary-button" onClick={() => { setCreateError(null); setShowNew(true); }}><Plus size={17}/> Create work item</button></div>
        <div className="notice"><div className="notice-icon"><ShieldCheck size={18}/></div><div><b>{auth.configured ? (auth.user ? "Identity provider connected" : "Sign-in configured") : "Foundation preview"}</b><p>{dataError || auth.error || (dataMode === "live" ? "Live work items loaded from the API. Summary cards still contain illustrative sample metrics." : auth.configured ? (auth.user ? "You are signed in, but live API data is not available yet. Check the API audience and workspace/roles claims." : "Sign in to establish a trusted browser session. Live data requires a matching backend identity-provider configuration.") : "This preview uses fictional sample records. Configure the free OIDC provider settings to enable sign-in; live data is not connected yet.")}</p></div><span className="preview-tag">{dataMode === "live" ? "LIVE DATA" : auth.configured ? (auth.user ? "SIGNED IN" : "AUTH READY") : "PREVIEW"}</span></div>
        <div className="metric-grid"><article className="metric-card"><div className="metric-top"><span>Open work items</span><span className="metric-icon violet"><ListTodo size={18}/></span></div><div className="metric-value">28</div><div className="metric-foot"><span className="positive"><ArrowUpRight size={14}/> 8.2%</span><span>vs. last week</span></div><div className="mini-bars">{[35,48,39,58,45,70,62,82,67,91,73,86].map((v,i)=><i key={i} style={{height:`${v}%`}}/>)}</div></article>
          <article className="metric-card"><div className="metric-top"><span>Due today</span><span className="metric-icon amber"><CalendarClock size={18}/></span></div><div className="metric-value">06</div><div className="metric-foot"><span className="muted-strong">2 high priority</span><span>across 3 teams</span></div><div className="metric-progress"><span style={{width:'64%'}}/></div><small className="metric-caption">64% of today's items completed</small></article>
          <article className="metric-card"><div className="metric-top"><span>Customer escalations</span><span className="metric-icon rose"><Workflow size={18}/></span></div><div className="metric-value">04</div><div className="metric-foot"><span className="warning-text">2 awaiting response</span><span>needs attention</span></div><div className="avatar-stack"><span>PS</span><span>PO</span><span>EN</span><small>+1 team</small></div></article>
          <article className="metric-card"><div className="metric-top"><span>On-time completion</span><span className="metric-icon green"><CheckCircle2 size={18}/></span></div><div className="metric-value">94<span className="percent">%</span></div><div className="metric-foot"><span className="positive"><ArrowUpRight size={14}/> 3.4%</span><span>this month</span></div><div className="sparkline"><svg viewBox="0 0 200 42" role="img" aria-label="Illustrative completion trend"><path d="M0 34 C18 28 21 32 36 22 S60 28 76 18 S99 25 116 13 S142 21 158 8 S183 15 200 3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></div></article></div>
        <section className="work-card"><div className="card-heading"><div><h2>Priority work</h2><p>Keep the next actions visible and accountable.</p></div><button className="text-button" onClick={() => setActive('Work items')}>View all work <ArrowUpRight size={15}/></button></div><div className="table-toolbar"><div className="table-tabs"><button className="tab-active">All work <span>28</span></button><button onClick={() => setQuery('In progress')}>In progress</button><button onClick={() => setQuery('Needs review')}>Needs review</button></div><label className="search-box"><Search size={16}/><input aria-label="Search work" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search work items..."/><kbd><Command size={11}/> K</kbd></label></div>
          <div className="table-wrap"><table><thead><tr><th>WORK ITEM</th><th>RESPONSIBLE TEAM</th><th>STATUS</th><th>PRIORITY</th><th>DUE DATE</th><th/></tr></thead><tbody>{filtered.map(t=><tr key={t.id}><td><div className="task-title"><span className="task-check"><CheckCircle2 size={15}/></span><span><b>{t.title}</b><small>{t.id}</small></span></div></td><td><span className="team-pill"><span className="team-dot"/>{t.team}</span></td><td><span className={`status-pill ${t.status.toLowerCase().replaceAll(' ','-')}`}><i/>{t.status}</span></td><td><span className={`priority ${t.priority.toLowerCase()}`}><i/>{t.priority}</span></td><td className="due-date">{t.due}</td><td><button className="row-menu" aria-label={`Open ${t.id} actions`}>···</button></td></tr>)}</tbody></table>{filtered.length === 0 && <div className="empty-state">No matching work items. Try a different search.</div>}</div>
          <div className="table-footer"><span>Showing <b>{filtered.length}</b> {dataMode === "live" ? "live work items" : "sample work items"}</span><button onClick={() => setQuery('')}>Clear filters</button></div></section>
        <footer className="page-footer"><span>WorkTrack360 <span className="footer-dot">·</span> Plan. Track. Collaborate. Deliver.</span><span><i/> {dataMode === "live" ? "Work items loaded from API" : "Illustrative sample data"}</span></footer>
      </section>
    </main>
    {showNew && <div className="modal-backdrop" role="presentation" onMouseDown={e => {if(e.target === e.currentTarget) setShowNew(false);}}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onSubmit={createWorkItem}><button type="button" className="modal-close" aria-label="Close" onClick={() => setShowNew(false)}>×</button><div className="modal-icon"><Plus size={20}/></div><h2 id="modal-title">Create a work item</h2><p>{auth.accessToken ? "Save a new work item to your authenticated workspace." : "Sign in and configure the API before creating persistent work items."}</p><label>Work item title<input value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="e.g. Validate customer report" maxLength={240} required /></label>{createError && <p role="alert" className="form-error">{createError}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowNew(false)}>Cancel</button><button type="submit" className="primary-button" disabled={creating || !auth.accessToken}>{creating ? "Saving…" : "Create work item"}</button></div></form></div>}
  </div>;
}
