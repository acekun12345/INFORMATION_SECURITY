import { useState } from 'react';
import { Check, ChevronRight, Megaphone, Search, SkipForward, Users, Volume2 } from 'lucide-react';
import { DEPARTMENTS } from './types';
import type { DepartmentType, QueueItem, StaffAction, UserRole } from './types';
import { servingFor, waitingFor } from './queueLogic';

interface StaffDashboardProps {
  currentUserRole: UserRole;
  queues: QueueItem[];
  disabled: boolean;
  busy: string | null;
  onAction: (dept: DepartmentType, action: StaffAction, servingIds: string[], nextId: string | null) => void;
}

export default function StaffDashboard({ currentUserRole, queues, disabled, busy, onAction }: StaffDashboardProps) {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<DepartmentType | 'All'>('All');
  // All Hooks run before role-based returns. App owns the single subscription.
  if (currentUserRole !== 'Staff') return <section className="cq-panel"><h2>Staff access only</h2><p>Sign in using an authorized staff account.</p></section>;
  const waiting = queues.filter(q => q.status === 'Waiting').length;
  const serving = queues.filter(q => q.status === 'Serving').length;
  const completed = queues.filter(q => q.status === 'Completed').length;
  const term = search.trim().toLowerCase();
  return <>
    <div className="cq-page-heading"><div><span className="cq-eyebrow">OPERATIONS / LIVE QUEUES</span><h1>Staff control<span>.</span></h1><p>Three departments. One clear view of the queue.</p></div><span className="cq-chip"><Users size={15}/> {waiting + serving} active tickets</span></div>
    <div className="cq-stats">
      {[['Waiting in line', waiting], ['Being assisted', serving], ['Completed · all time', completed]].map(([label, value]) => <div className="cq-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </div>
    <section className="cq-toolbar" aria-label="Queue filters">
      <div className="cq-tabs" aria-label="Department">{(['All', ...DEPARTMENTS] as const).map(dept => <button type="button" key={dept} aria-pressed={department === dept} className={department === dept ? 'is-active' : ''} onClick={() => setDepartment(dept)}>{dept}</button>)}</div>
      <label className="cq-search"><Search size={17}/><input aria-label="Search waiting tickets" placeholder="Ticket, name or student ID" value={search} onChange={e => setSearch(e.target.value)}/></label>
    </section>
    <div className={`cq-departments ${department !== 'All' ? 'cq-single-dept' : ''}`}>
      {DEPARTMENTS.filter(dept => department === 'All' || dept === department).map((dept, index) => {
        const line = waitingFor(queues, dept);
        const active = servingFor(queues, dept);
        const current = active[0];
        const visible = line.filter(q => `${q.ticketNumber} ${q.studentName} ${q.studentId}`.toLowerCase().includes(term));
        const act = (action: StaffAction) => onAction(dept, action, active.map(q => q.id), line[0]?.id ?? null);
        return <section className="cq-dept-card" key={dept} aria-label={`${dept} controls`}>
          <div className="cq-dept-heading"><div><span className="cq-eyebrow">COUNTER {DEPARTMENTS.indexOf(dept) + 1 < 10 ? '0' : ''}{DEPARTMENTS.indexOf(dept) + 1}</span><h2>{dept}</h2></div><span className={`cq-counter cq-counter-${index}`}><Users size={20}/></span></div>
          <div className={`cq-serving ${current ? 'is-serving' : ''}`}><span className="cq-eyebrow"><i className="cq-dot"/> {current ? 'NOW SERVING' : 'COUNTER AVAILABLE'}</span><strong>{current?.ticketNumber ?? '—'}</strong><span>{current?.studentName ?? 'Ready for the next student'}</span>{current && <small>{current.studentId} · {current.block || 'Student'}</small>}</div>
          {active.length > 1 && <p className="cq-warning">{active.length} legacy serving tickets found. Complete & next will close all of them.</p>}
          <button type="button" className="cq-btn cq-primary cq-full" disabled={disabled || !line.length} onClick={() => act('next')}><Megaphone size={17}/>{busy === `${dept}:next` ? 'Updating…' : current ? 'Complete & call next' : 'Call next ticket'}<ChevronRight size={17}/></button>
          <div className="cq-counter-actions">
            <button type="button" className="cq-btn cq-secondary" disabled={disabled || active.length !== 1} onClick={() => act('recall')}><Volume2 size={15}/>Recall</button>
            <button type="button" className="cq-btn cq-secondary" disabled={disabled || !current} onClick={() => act('complete')}><Check size={15}/>Done</button>
            <button type="button" className="cq-btn cq-secondary" disabled={disabled || !current} onClick={() => act('skip')}><SkipForward size={15}/>Skip</button>
          </div>
          <div className="cq-list-heading"><h3>Up next</h3><span>{line.length} waiting</span></div>
          <ol className="cq-waiting-list">
            {visible.map(q => <li key={q.id}><span className="cq-position">{line.indexOf(q) + 1}</span><div><strong>{q.studentName}</strong><small>{q.studentId}</small></div><span className="cq-ticket-tag">{q.ticketNumber}</span></li>)}
          </ol>
          {!visible.length && <div className="cq-empty"><Check size={22}/><p>{term ? 'No matching waiting tickets.' : 'All caught up.'}</p><small>{term ? 'Try another name or ticket number.' : 'New tickets will appear here.'}</small></div>}
          <div className="cq-dept-footer">{line[0] ? `Next ticket: ${line[0].ticketNumber}` : 'No tickets waiting'}<span>FIFO order</span></div>
        </section>;
      })}
    </div>
    <p className="cq-footnote">Search filters the waiting list only. Call next always uses the first ticket in the actual queue. Done completes service; Skip marks a no-show.</p>
  </>;
}
