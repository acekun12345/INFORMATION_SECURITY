import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ArrowRight, Building2, CheckCircle2, CircleHelp, FileText, LayoutDashboard, LogOut, Moon, RefreshCw, Sun, Ticket, UserRound, Users, Volume2, Wallet, X } from 'lucide-react';
import StaffDashboard from './StaffDashboard';
import { DEPARTMENTS } from './types';
import type { DepartmentType, DocumentRequest, QueueItem, StaffAction, StudentInfo, UserRole } from './types';
import { compareQueue, isActive, normalizeId, servingFor, waitingFor } from './queueLogic';
import { advanceDocument, cancelQueue, configurationError, createDocument, createTicket, DEMO_MODE, DOCUMENTS, NEXT_DOCUMENT_STATUS, updateQueue, watchConnection, watchDocuments, watchQueues } from './queueService';
import './App.css';

type Page = 'home' | 'staff' | 'documents';
type ModalType = 'queue' | 'request' | 'balance' | 'about' | null;
const dateTime = (n: number) => new Date(n).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const messageOf = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.';
const readSetting = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    const oldOverflow = document.body.style.overflow;
    el?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { el?.close(); document.body.style.overflow = oldOverflow; };
  }, []);
  return <dialog ref={dialog} className="cq-dialog" aria-labelledby="cq-dialog-title" onCancel={onClose}>
    <div className="cq-dialog-heading"><h2 id="cq-dialog-title">{title}</h2><button type="button" className="cq-icon-btn" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div>{children}
  </dialog>;
}

export default function App() {
  const [person, setPerson] = useState<StudentInfo | null>(null);
  const [role, setRole] = useState<UserRole>('Student');
  const [form, setForm] = useState({ name: '', studentId: '', password: '', course: 'BS Information Technology', yearLevel: '2nd Year', block: 'Block A' });
  const [loginError, setLoginError] = useState('');
  const attempts = useRef(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [dark, setDark] = useState(() => readSetting('ccdi-theme') === 'dark');
  const [page, setPage] = useState<Page>('home');
  const [modal, setModal] = useState<ModalType>(null);
  const [dept, setDept] = useState<DepartmentType>('Accounting');
  const [documentName, setDocumentName] = useState(DOCUMENTS[0]);
  const [copies, setCopies] = useState(1);
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [online, setOnline] = useState(false);
  const [queueReady, setQueueReady] = useState(false);
  const [docsReady, setDocsReady] = useState(false);
  const [queueError, setQueueError] = useState('');
  const [docsError, setDocsError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const [turn, setTurn] = useState<QueueItem | null>(null);
  const lastCall = useRef('');
  const [sound, setSound] = useState(false);
  const syncError = queueError || docsError;
  const ready = queueReady && docsReady && online && !syncError && !configurationError;
  const disabled = !ready || !!busy;

  useEffect(() => { try { localStorage.setItem('ccdi-theme', dark ? 'dark' : 'light'); } catch { /* Storage is optional for the theme. */ } }, [dark]);
  useEffect(() => {
    if (!lockedUntil) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.error ? 9000 : 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!person || configurationError) return;
    setQueueReady(false); setDocsReady(false); setQueueError(''); setDocsError('');
    const stops: (() => void)[] = [];
    try {
      stops.push(watchQueues(items => { setQueues(items); setQueueReady(true); setQueueError(''); }, e => setQueueError(messageOf(e))));
      stops.push(watchDocuments(items => { setDocuments(items); setDocsReady(true); setDocsError(''); }, e => setDocsError(messageOf(e))));
      stops.push(watchConnection(setOnline));
    } catch (e) {
      const error = messageOf(e);
      setQueueError(error); setDocsError(error);
    }
    return () => stops.forEach(stop => stop());
  }, [person, retry]);

  const myActive = queues.filter(q => normalizeId(q.studentId) === person?.studentId && isActive(q)).sort(compareQueue);
  const ticket = myActive[0];
  const called = myActive.find(q => q.status === 'Serving');
  const callKey = called ? `${called.id}:${called.callCount || 1}:${called.calledAt || 0}` : '';
  useEffect(() => {
    if (!person || person.role !== 'Student' || !ready || !called || !callKey || lastCall.current === callKey) return;
    lastCall.current = callKey;
    setTurn(called);
    setModal(null);
    if (sound && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(`Ticket ${called.ticketNumber}. Please proceed to ${called.department}.`));
    }
  }, [callKey, called, person, ready, sound]);
  useEffect(() => { if (turn && !myActive.some(q => q.id === turn.id && q.status === 'Serving')) setTurn(null); }, [queues, turn, myActive]);

  async function perform(key: string, job: () => Promise<void>, success: string, close = false) {
    if (pending.current) return;
    if (!ready) { setNotice({ text: 'Wait for the connection and data to load before trying again.', error: true }); return; }
    pending.current = true; setBusy(key);
    try { await job(); setNotice({ text: success, error: false }); if (close) setModal(null); }
    catch (e) { setNotice({ text: messageOf(e), error: true }); }
    finally { pending.current = false; setBusy(null); }
  }
  function login(e: FormEvent) {
    e.preventDefault();
    if (Date.now() < lockedUntil) return;
    if (!form.name.trim() || !form.studentId.trim()) { setLoginError('Enter your full name and ID.'); return; }
    if (form.password !== (role === 'Staff' ? 'ccdistaff' : 'ccdistudent')) {
      attempts.current += 1;
      if (attempts.current >= 3) { setLockedUntil(Date.now() + 30000); setClock(Date.now()); attempts.current = 0; }
      setLoginError('Incorrect demo password.'); return;
    }
    const user: StudentInfo = { name: form.name.trim(), studentId: normalizeId(form.studentId), course: role === 'Student' ? form.course : '', yearLevel: role === 'Student' ? form.yearLevel : '', block: role === 'Student' ? form.block : '', role };
    attempts.current = 0; setLoginError(''); setLockedUntil(0);
    setPerson(user); setPage(role === 'Staff' ? 'staff' : 'home');
    setForm(old => ({ ...old, password: '' }));
  }
  function logout() {
    if (pending.current) return;
    setPerson(null); setQueues([]); setDocuments([]); setTurn(null); setModal(null); setNotice(null); setOnline(false); setQueueReady(false); setDocsReady(false); setQueueError(''); setDocsError(''); lastCall.current = '';
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
  function staffAction(department: DepartmentType, action: StaffAction, servingIds: string[], nextId: string | null) {
    if (person?.role !== 'Staff') return;
    void perform(`${department}:${action}`, () => updateQueue(department, action, servingIds, nextId), `${department} queue updated.`);
  }
  const themeButton = <button type="button" className="cq-icon-btn" aria-label={dark ? 'Use light theme' : 'Use dark theme'} onClick={() => setDark(!dark)}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</button>;
  const lockSeconds = Math.max(0, Math.ceil((lockedUntil - clock) / 1000));

  if (!person) return <div className={`cq-app ${dark ? 'cq-dark' : ''}`}><main className="cq-login">
    <section className="cq-login-story"><a className="cq-brand" href="#"><Building2 size={29}/><span>CCDI<strong>CAMPUS QUEUE</strong></span></a><div><span className="cq-eyebrow">SORSOGON CAMPUS</span><h1>Less waiting.<br/>More living<span>.</span></h1><p>Your campus services, one step closer. Get a ticket, follow your turn, and make every minute count.</p><div className="cq-login-pills"><span>01 · Get your ticket</span><span>02 · Follow your turn</span><span>03 · You're up</span></div></div><small>Computer Communication Development Institute</small></section>
    <section className="cq-login-form"><div className="cq-login-top"><span className="cq-chip">{DEMO_MODE ? 'LOCAL DEMO' : 'FIREBASE PROTOTYPE'}</span>{themeButton}</div><div className="cq-login-content"><span className="cq-eyebrow">WELCOME TO YOUR CAMPUS</span><h2>Let's get you in.</h2><p>Select your role to get started.</p><div className="cq-tabs cq-role-tabs">{(['Student', 'Staff'] as const).map(r => <button type="button" key={r} aria-pressed={role === r} className={role === r ? 'is-active' : ''} onClick={() => { setRole(r); setLoginError(''); }}>{r === 'Student' ? <UserRound size={17}/> : <Users size={17}/>} {r}</button>)}</div>
    <form onSubmit={login} className="cq-form">
      <label>Full name<input autoComplete="name" maxLength={100} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name"/></label>
      <label>{role === 'Student' ? 'Student ID' : 'Employee ID'}<input maxLength={60} autoComplete="username" required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder={role === 'Student' ? '2026-CCDI-0192' : 'STAFF-001'}/></label>
      <label>Demo password<input type="password" autoComplete="current-password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>
      {role === 'Student' && <><label>Course<select value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}>{['BS Information Technology', 'BS Computer Science', 'Associate in Computer Tech'].map(c => <option key={c}>{c}</option>)}</select></label><div className="cq-form-row"><label>Year level<select value={form.yearLevel} onChange={e => setForm({ ...form, yearLevel: e.target.value })}>{['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => <option key={y}>{y}</option>)}</select></label><label>Section<select value={form.block} onChange={e => setForm({ ...form, block: e.target.value })}>{['Block A', 'Block B', 'Block C', 'Section 1'].map(b => <option key={b}>{b}</option>)}</select></label></div></>}
      {loginError && <p className="cq-error" role="alert">{loginError}</p>}
      {configurationError && <p className="cq-error" role="alert">{configurationError}</p>}
      <button className="cq-btn cq-primary cq-full" disabled={lockSeconds > 0 || !!configurationError}>{lockSeconds > 0 ? `Try again in ${lockSeconds}s` : `Continue as ${role}`}<ArrowRight size={18}/></button>
    </form><div className="cq-demo-note"><strong>Prototype access</strong><p>Use <code>{role === 'Staff' ? 'ccdistaff' : 'ccdistudent'}</code>. Shared passwords are for testing, not secure authentication. {DEMO_MODE ? 'Demo data stays in this browser; tabs on the same address share it.' : 'This mode writes to your configured Firebase database. Use test data only until real authentication and server authorization are added.'}</p></div></div></section>
  </main></div>;

  const myDocuments = person.role === 'Staff' ? documents : documents.filter(d => normalizeId(d.studentId) === person.studentId);
  const peopleAhead = ticket?.status === 'Waiting' ? waitingFor(queues, ticket.department).findIndex(q => q.id === ticket.id) + servingFor(queues, ticket.department).length : 0;
  const navigation: { id: Page; label: string; icon: ReactNode }[] = person.role === 'Staff'
    ? [{ id: 'staff', label: 'Staff control', icon: <Users size={19}/> }, { id: 'documents', label: 'Document requests', icon: <FileText size={19}/> }]
    : [{ id: 'home', label: 'Overview', icon: <LayoutDashboard size={19}/> }, { id: 'documents', label: 'My requests', icon: <FileText size={19}/> }];
  return <div className={`cq-app ${dark ? 'cq-dark' : ''}`}>
    <aside className="cq-sidebar"><div className="cq-brand"><Building2 size={29}/><span>CCDI<strong>CAMPUS QUEUE</strong></span></div><span className="cq-sidebar-label">YOUR WORKSPACE</span><nav>{navigation.map(n => <button key={n.id} type="button" className={page === n.id ? 'is-active' : ''} aria-current={page === n.id ? 'page' : undefined} onClick={() => setPage(n.id)}>{n.icon}{n.label}{page === n.id && <span className="cq-nav-dot"/>}</button>)}{person.role === 'Student' && <button type="button" onClick={() => setModal('balance')}><Wallet size={19}/>Account balance</button>}<button type="button" onClick={() => setModal('about')}><CircleHelp size={19}/>About the portal</button></nav><div className="cq-sidebar-bottom"><div className="cq-campus-mark">Your future<br/>starts here<span>↗</span></div><small>SORSOGON CAMPUS</small><div className="cq-sidebar-profile"><span className="cq-avatar">{person.name.charAt(0).toUpperCase()}</span><div><strong>{person.name}</strong><small>{person.role} · {person.studentId}</small></div><button type="button" aria-label="Sign out" title="Sign out" disabled={!!busy} onClick={logout}><LogOut size={18}/></button></div></div></aside>
    <div className="cq-workspace"><header className="cq-topbar"><div><span className="cq-breadcrumb">Campus services</span><span>/</span><strong>{page === 'staff' ? 'Staff control' : page === 'documents' ? 'Requests' : 'Overview'}</strong></div><div className="cq-topbar-actions"><span className={`cq-connection ${ready ? 'is-online' : ''}`}><i className="cq-dot"/>{syncError ? 'Sync error' : !online ? 'Connecting…' : !ready ? 'Loading…' : DEMO_MODE ? 'Local demo' : 'Live connection'}</span>{themeButton}<button type="button" className="cq-icon-btn cq-mobile-logout" aria-label="Sign out" disabled={!!busy} onClick={logout}><LogOut size={18}/></button></div></header>
    <main className="cq-main">
      {!DEMO_MODE && <div className="cq-warning">Firebase prototype · Shared-password access is not server authorization. Use test data only.</div>}
      {syncError && <div className="cq-error cq-sync-error" role="alert"><div><strong>Unable to sync data</strong><p>{syncError}</p></div><button type="button" className="cq-btn cq-secondary" onClick={() => setRetry(v => v + 1)}><RefreshCw size={16}/>Retry</button></div>}
      {notice && <div className={notice.error ? 'cq-error cq-notice' : 'cq-success cq-notice'} role={notice.error ? 'alert' : 'status'}>{notice.text}<button type="button" className="cq-icon-btn" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={16}/></button></div>}
      {page === 'staff' && <StaffDashboard currentUserRole={person.role} queues={queues} disabled={disabled} busy={busy} onAction={staffAction}/>}
      {page === 'home' && <>
        <div className="cq-page-heading"><div><span className="cq-eyebrow">YOUR CAMPUS, CONNECTED</span><h1>Hello, {person.name.split(' ')[0]}<span>.</span></h1><p>Take care of campus errands, without the guesswork.</p></div><span className="cq-chip">{person.block} · {person.yearLevel}</span></div>
        <section className="cq-hero"><div><span className="cq-eyebrow">A BETTER WAY TO WAIT</span><h2>Your next stop,<br/>made simple.</h2><p>Choose a department and follow your ticket in real time.</p><button type="button" className="cq-btn cq-lime" disabled={disabled || !!ticket} onClick={() => setModal('queue')}>{ticket ? 'You have an active ticket' : 'Get a queue number'}<ArrowRight size={18}/></button></div><div className="cq-hero-ticket"><Ticket size={28}/><span>YOUR TICKET</span><strong>{ticket?.ticketNumber ?? 'YOU’RE NEXT'}</strong><small>{ticket ? `${ticket.department} · ${ticket.status}` : 'Less time in line. More time for you.'}</small></div></section>
        {ticket && <section className="cq-panel cq-active-ticket"><div><span className="cq-eyebrow">{ticket.status === 'Serving' ? 'PLEASE PROCEED TO THE COUNTER' : 'YOUR PLACE IN LINE'}</span><h2>{ticket.ticketNumber} <span className={`cq-status cq-status-${ticket.status.toLowerCase()}`}>{ticket.status}</span></h2><p>{ticket.department} · {peopleAhead} people ahead</p>{myActive.length > 1 && <p className="cq-warning">Multiple older active tickets found. Staff can help resolve these.</p>}</div><div className="cq-ticket-actions"><button type="button" className="cq-btn cq-secondary" aria-pressed={sound} onClick={() => setSound(!sound)}><Volume2 size={16}/>Voice {sound ? 'on' : 'off'}</button>{ticket.status === 'Waiting' && <button type="button" className="cq-btn cq-secondary" disabled={disabled} onClick={() => void perform('cancel', () => cancelQueue(ticket.id, person.studentId), 'Ticket cancelled.')}>Cancel ticket</button>}</div></section>}
        <div className="cq-section-heading"><h2>Live counters</h2><span>{queueReady ? 'Updates automatically' : 'Loading queue data…'}</span></div><div className="cq-live-counters">{DEPARTMENTS.map(d => <section className="cq-panel" key={d}><span className="cq-eyebrow">{d}</span><strong>{servingFor(queues, d)[0]?.ticketNumber ?? '—'}</strong><p>{waitingFor(queues, d).length} waiting · {servingFor(queues, d).length ? 'Now serving' : 'Counter available'}</p></section>)}</div>
        <div className="cq-section-heading"><h2>Student services</h2><span>Everything in one place</span></div><div className="cq-service-grid">{[{ title: 'Request a document', detail: 'COE, transcript and good moral certificates', icon: <FileText size={22}/>, action: () => setModal('request') }, { title: 'Track your requests', detail: `${myDocuments.length} submitted requests`, icon: <CheckCircle2 size={22}/>, action: () => setPage('documents') }, { title: 'Account balance', detail: 'School account information', icon: <Wallet size={22}/>, action: () => setModal('balance') }].map(s => <button type="button" className="cq-service-card" key={s.title} onClick={s.action}>{s.icon}<strong>{s.title}</strong><span>{s.detail}</span><ArrowRight size={18}/></button>)}</div>
      </>}
      {page === 'documents' && <><div className="cq-page-heading"><div><span className="cq-eyebrow">REGISTRAR / DOCUMENTS</span><h1>{person.role === 'Staff' ? 'Document requests' : 'My requests'}<span>.</span></h1><p>{person.role === 'Staff' ? 'Move each request from pending to released.' : 'Follow the progress of your school documents.'}</p></div>{person.role === 'Student' && <button type="button" className="cq-btn cq-primary" disabled={disabled} onClick={() => setModal('request')}><FileText size={17}/>New request</button>}</div><section className="cq-panel cq-table-panel">{myDocuments.length ? <div className="cq-table-scroll"><table><thead><tr><th>Document</th>{person.role === 'Staff' && <th>Student</th>}<th>Submitted</th><th>Copies</th><th>Status</th>{person.role === 'Staff' && <th>Next step</th>}</tr></thead><tbody>{myDocuments.map(d => <tr key={d.id}><td><strong>{d.documentName}</strong><small>Ref: {d.id}</small></td>{person.role === 'Staff' && <td>{d.studentName}<small>{d.studentId}</small></td>}<td>{dateTime(d.createdAt)}</td><td>{d.copies}</td><td><span className={`cq-status cq-status-${d.status.toLowerCase()}`}>{d.status}</span></td>{person.role === 'Staff' && <td>{NEXT_DOCUMENT_STATUS[d.status] ? <button type="button" className="cq-btn cq-secondary" disabled={disabled} onClick={() => void perform(`doc:${d.id}`, () => advanceDocument(d), 'Request status updated.')}>Mark {NEXT_DOCUMENT_STATUS[d.status]}</button> : 'Completed'}</td>}</tr>)}</tbody></table></div> : <div className="cq-empty cq-empty-large"><FileText size={32}/><h2>{docsReady ? 'No requests yet' : 'Loading requests…'}</h2><p>{person.role === 'Student' ? 'Your submitted documents will appear here.' : 'New student requests will appear here.'}</p></div>}</section></>}
      <footer className="cq-footer"><span>CCDI Sorsogon · Campus Queue</span><span>{DEMO_MODE ? 'Demo workspace · Browser storage' : 'Firebase prototype'}</span></footer>
    </main></div>
    {modal && <Modal title={{ queue: 'Get a queue ticket', request: 'Request a document', balance: 'Account balance', about: 'About Campus Queue' }[modal]} onClose={() => setModal(null)}>
      {modal === 'queue' && <form className="cq-form" onSubmit={e => { e.preventDefault(); if (person.role === 'Student') void perform('join', () => createTicket(person, dept), 'Your ticket is ready. Track it on Overview.', true); }}><p>You may hold one active ticket at a time.</p><label>Department<select value={dept} onChange={e => setDept(e.target.value as DepartmentType)}>{DEPARTMENTS.map(d => <option key={d} value={d}>{d} · {waitingFor(queues, d).length} waiting</option>)}</select></label><button className="cq-btn cq-primary" disabled={disabled || !!ticket}>{busy === 'join' ? 'Creating ticket…' : 'Confirm & get number'}<Ticket size={18}/></button></form>}
      {modal === 'request' && <form className="cq-form" onSubmit={e => { e.preventDefault(); if (person.role === 'Student') void perform('request', () => createDocument(person, documentName, copies), 'Document request submitted.', true); }}><label>Document<select value={documentName} onChange={e => setDocumentName(e.target.value)}>{DOCUMENTS.map(d => <option key={d}>{d}</option>)}</select></label><label>Copies (1–5)<input required type="number" min={1} max={5} step={1} value={Number.isNaN(copies) ? '' : copies} onChange={e => setCopies(e.target.valueAsNumber)}/></label><button className="cq-btn cq-primary" disabled={disabled}>{busy === 'request' ? 'Submitting…' : 'Submit request'}<ArrowRight size={18}/></button></form>}
      {modal === 'balance' && <div className="cq-empty"><Wallet size={32}/><h3>Balance is not connected yet</h3><p>No verified billing source was included in the original files. Please contact Accounting for your actual balance.</p></div>}
      {modal === 'about' && <div className="cq-about"><p>Computer Communication Development Institute · Sorsogon Campus.</p><p>One queue for each department, real-time ticket tracking and a shared document request workflow.</p><p>{DEMO_MODE ? 'This demo saves records in your browser. Use two tabs to try the student and staff workflows.' : 'Firebase prototype using the queues and documentRequests paths.'} Production use requires Firebase Authentication and server-enforced roles.</p></div>}
      {notice?.error && <p className="cq-error" role="alert">{notice.text}</p>}
    </Modal>}
    {turn && <Modal title="It's your turn!" onClose={() => setTurn(null)}><div className="cq-turn"><Volume2 size={36}/><strong>{turn.ticketNumber}</strong><h3>Please proceed to {turn.department}.</h3><p>The counter is ready to assist you.</p><button type="button" className="cq-btn cq-primary cq-full" onClick={() => setTurn(null)}>I'm on my way</button></div></Modal>}
  </div>;
}
