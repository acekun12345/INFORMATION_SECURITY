import { onValue, push, ref, runTransaction, set } from 'firebase/database';
import { configurationError, db, DEMO_MODE } from './firebase';
import { cancelTicket, joinQueue, readDocuments, readQueues, staffTransition } from './queueLogic';
import type { DepartmentType, DocumentRequest, DocumentStatus, QueueMap, StaffAction, StudentInfo } from './types';

export { DEMO_MODE, configurationError };
const DEMO_KEY = 'ccdi-queue-demo-v2';
const DEMO_EVENT = 'ccdi-demo-update';
interface DemoData { queues: QueueMap; documents: Record<string, DocumentRequest> }
function readDemo(): DemoData {
  const raw = localStorage.getItem(DEMO_KEY);
  return raw ? JSON.parse(raw) as DemoData : { queues: {}, documents: {} };
}
function saveDemo(data: DemoData) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(DEMO_EVENT));
}
async function demoMutation(change: (data: DemoData) => DemoData) {
  // Web Locks serialize writes across browser tabs on localhost/HTTPS.
  if (!navigator.locks) throw new Error('Use localhost or HTTPS in a browser with Web Locks support for demo writes.');
  await navigator.locks.request(DEMO_KEY, () => saveDemo(change(readDemo())));
}
function liveDb() {
  if (!db) throw new Error(configurationError || 'Firebase is not configured.');
  return db;
}
function watchDemo(notify: (data: DemoData) => void, onError: (error: Error) => void) {
  const update = () => { try { notify(readDemo()); } catch (e) { onError(e instanceof Error ? e : new Error('Could not read demo data.')); } };
  const storage = (event: StorageEvent) => { if (event.key === DEMO_KEY || event.key === null) update(); };
  update();
  window.addEventListener(DEMO_EVENT, update);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(DEMO_EVENT, update); window.removeEventListener('storage', storage); };
}
export function watchQueues(notify: (data: ReturnType<typeof readQueues>) => void, onError: (error: Error) => void) {
  if (DEMO_MODE) return watchDemo(data => notify(readQueues(data.queues)), onError);
  return onValue(ref(liveDb(), 'queues'), snapshot => {
    try { notify(readQueues(snapshot.val())); } catch (e) { onError(e instanceof Error ? e : new Error('Invalid queue data.')); }
  }, onError);
}
export function watchConnection(notify: (online: boolean) => void) {
  if (DEMO_MODE) { notify(true); return () => {}; }
  return onValue(ref(liveDb(), '.info/connected'), snap => notify(snap.val() === true), () => notify(false));
}
async function changeQueues(change: (raw: QueueMap | null) => QueueMap) {
  if (DEMO_MODE) return demoMutation(data => ({ ...data, queues: change(data.queues) }));
  // Warm the cache via watchQueues before enabling controls. A transaction may
  // still start with null; its server retry will revalidate the complete state.
  const result = await runTransaction(ref(liveDb(), 'queues'), change, { applyLocally: false });
  if (!result.committed) throw new Error('Queue update was not committed. Please try again.');
}
export async function createTicket(person: StudentInfo, department: DepartmentType) {
  const id = DEMO_MODE ? crypto.randomUUID() : push(ref(liveDb(), 'queues')).key!;
  const now = Date.now();
  await changeQueues(raw => joinQueue(raw, person, department, id, now));
}
export async function updateQueue(dept: DepartmentType, action: StaffAction, servingIds: string[], nextId: string | null) {
  const now = Date.now();
  await changeQueues(raw => staffTransition(raw, dept, action, servingIds, nextId, now));
}
export async function cancelQueue(id: string, studentId: string) {
  const now = Date.now();
  await changeQueues(raw => cancelTicket(raw, id, studentId, now));
}
export const DOCUMENTS = ['Certificate of Enrollment (COE)', 'Official Transcript of Records (TOR)', 'Good Moral Certificate'];
export function watchDocuments(notify: (items: DocumentRequest[]) => void, onError: (error: Error) => void) {
  if (DEMO_MODE) return watchDemo(data => notify(readDocuments(data.documents)), onError);
  return onValue(ref(liveDb(), 'documentRequests'), snapshot => {
    try { notify(readDocuments(snapshot.val())); } catch (e) { onError(e instanceof Error ? e : new Error('Invalid document request data.')); }
  }, onError);
}
export async function createDocument(person: StudentInfo, documentName: string, copies: number) {
  if (person.role !== 'Student' || !DOCUMENTS.includes(documentName) || !Number.isInteger(copies) || copies < 1 || copies > 5) throw new Error('Select a valid document and 1–5 copies.');
  const id = DEMO_MODE ? crypto.randomUUID() : push(ref(liveDb(), 'documentRequests')).key!;
  const doc: DocumentRequest = { id, studentId: person.studentId, studentName: person.name, documentName, copies, createdAt: Date.now(), status: 'Pending' };
  if (DEMO_MODE) return demoMutation(data => ({ ...data, documents: { ...data.documents, [id]: doc } }));
  await set(ref(liveDb(), `documentRequests/${id}`), doc);
}
export const NEXT_DOCUMENT_STATUS: Partial<Record<DocumentStatus, DocumentStatus>> = { Pending: 'Processing', Processing: 'Ready', Ready: 'Released' };
export async function advanceDocument(doc: DocumentRequest) {
  const next = NEXT_DOCUMENT_STATUS[doc.status];
  if (!next) throw new Error('This request has already been released.');
  const advance = (current: DocumentRequest | null) => {
    if (!current || current.status !== doc.status) throw new Error('Request status changed. Review the latest status.');
    return { ...current, status: next };
  };
  if (DEMO_MODE) return demoMutation(data => ({ ...data, documents: { ...data.documents, [doc.id]: advance(data.documents[doc.id]) } }));
  const result = await runTransaction(ref(liveDb(), `documentRequests/${doc.id}`), advance, { applyLocally: false });
  if (!result.committed) throw new Error('Document update was not committed.');
}
