import { DEPARTMENTS } from './types';
import type { DepartmentType, DocumentRequest, QueueItem, QueueMap, StaffAction, StudentInfo } from './types';

export const isActive = (q: QueueItem) => q.status === 'Waiting' || q.status === 'Serving';
export const compareQueue = (a: QueueItem, b: QueueItem) => a.createdAt - b.createdAt || a.id.localeCompare(b.id);
export const waitingFor = (items: QueueItem[], dept: DepartmentType) => items.filter(q => q.department === dept && q.status === 'Waiting').sort(compareQueue);
export const servingFor = (items: QueueItem[], dept: DepartmentType) => items.filter(q => q.department === dept && q.status === 'Serving').sort(compareQueue);
export const normalizeId = (value: string) => value.trim().toUpperCase();

export function readDocuments(raw: unknown): DocumentRequest[] {
  if (raw == null) return [];
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid document request data.');
  return Object.entries(raw).map(([id, value]) => {
    if (!value || typeof value !== 'object') throw new Error(`Invalid document request: ${id}`);
    const doc = value as DocumentRequest;
    if (typeof doc.studentId !== 'string' || typeof doc.studentName !== 'string' ||
        typeof doc.documentName !== 'string' || !Number.isFinite(doc.createdAt) ||
        !Number.isInteger(doc.copies) || doc.copies < 1 || doc.copies > 5 ||
        !['Pending', 'Processing', 'Ready', 'Released'].includes(doc.status)) {
      throw new Error(`Invalid document request: ${id}. Ask staff to review this record.`);
    }
    return { ...doc, id };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

// Reject malformed records before rendering or allocating another ticket.
export function readQueues(raw: unknown): QueueItem[] {
  if (raw == null) return [];
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid queue data. Ask your administrator to check /queues.');
  return Object.entries(raw).map(([id, value]) => {
    if (!value || typeof value !== 'object') throw new Error(`Invalid queue record: ${id}`);
    const q = value as QueueItem;
    if (typeof q.ticketNumber !== 'string' || !/^[CAR]-\d+$/.test(q.ticketNumber) ||
        typeof q.studentId !== 'string' || typeof q.studentName !== 'string' ||
        !DEPARTMENTS.includes(q.department) ||
        !['Waiting', 'Serving', 'Completed', 'Skipped', 'Cancelled'].includes(q.status)) {
      throw new Error(`Invalid queue record: ${id}. Back up and review legacy data first.`);
    }
    return { ...q, id, createdAt: Number.isFinite(q.createdAt) ? q.createdAt : 0 };
  });
}

// Pure reducer: safe to run again when Firebase retries a transaction.
export function joinQueue(raw: QueueMap | null, person: StudentInfo, dept: DepartmentType, id: string, now: number): QueueMap {
  const items = readQueues(raw);
  const active = items.find(q => normalizeId(q.studentId) === normalizeId(person.studentId) && isActive(q));
  if (active) throw new Error(`May active ticket ka na: ${active.ticketNumber} (${active.department}).`);
  if (!person.name.trim() || !person.studentId.trim() || person.role !== 'Student' || !DEPARTMENTS.includes(dept)) throw new Error('A valid student profile and department are required.');
  const prefix = { Cashier: 'C', Accounting: 'A', Registrar: 'R' }[dept];
  const last = items.filter(q => q.department === dept).reduce((max, q) => Math.max(max, Number(q.ticketNumber.split('-')[1])), 100);
  if (!Number.isSafeInteger(last + 1)) throw new Error('Ticket counter is invalid. Contact staff.');
  return { ...raw, [id]: { id, ticketNumber: `${prefix}-${last + 1}`, studentName: person.name.trim(), studentId: normalizeId(person.studentId), department: dept, status: 'Waiting', createdAt: now, course: person.course, block: person.block } };
}

export function staffTransition(raw: QueueMap | null, dept: DepartmentType, action: StaffAction, expectedServing: string[], expectedNext: string | null, now: number): QueueMap {
  const items = readQueues(raw);
  const serving = servingFor(items, dept);
  const ids = serving.map(q => q.id).sort();
  if (JSON.stringify(ids) !== JSON.stringify([...expectedServing].sort())) throw new Error('Nagbago na ang serving ticket. Review the updated queue and try again.');
  const next = waitingFor(items, dept)[0];
  if (action === 'next' && (!next || next.id !== expectedNext)) throw new Error('Nagbago na ang pila o wala nang waiting ticket.');
  if (action !== 'next' && !serving.length) throw new Error('Walang active serving ticket.');
  if (action === 'recall' && serving.length !== 1) throw new Error('Multiple legacy serving tickets found. Complete them before calling again.');
  const result: QueueMap = { ...raw };
  for (const q of serving) {
    result[q.id] = action === 'recall'
      ? { ...q, calledAt: now, callCount: (q.callCount || 1) + 1, updatedAt: now }
      : { ...q, status: action === 'skip' ? 'Skipped' : 'Completed', updatedAt: now };
  }
  if (action === 'next' && next) result[next.id] = { ...next, status: 'Serving', calledAt: now, callCount: 1, updatedAt: now };
  return result;
}

export function cancelTicket(raw: QueueMap | null, id: string, studentId: string, now: number): QueueMap {
  const ticket = readQueues(raw).find(q => q.id === id);
  if (!ticket || normalizeId(ticket.studentId) !== normalizeId(studentId) || ticket.status !== 'Waiting') throw new Error('Only your own waiting ticket can be cancelled.');
  return { ...raw, [id]: { ...ticket, status: 'Cancelled', updatedAt: now } };
}
