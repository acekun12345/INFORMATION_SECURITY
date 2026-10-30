import { describe, expect, it } from 'vitest';
import { cancelTicket, isActive, joinQueue, readDocuments, readQueues, servingFor, staffTransition, waitingFor } from '../src/queueLogic';
import type { QueueMap, StudentInfo } from '../src/types';

const student = (id: string): StudentInfo => ({ name: `Student ${id}`, studentId: id, course: 'BSIT', yearLevel: '2nd Year', block: 'Block A', role: 'Student' });
function fixture() {
  let state = joinQueue(null, student('001'), 'Cashier', 'a', 1000);
  state = joinQueue(state, student('002'), 'Cashier', 'b', 2000);
  return joinQueue(state, student('003'), 'Registrar', 'c', 3000);
}
describe('ticket allocation', () => {
  it('allocates independent department sequences from existing persisted records', () => {
    const state = fixture();
    expect(state.a.ticketNumber).toBe('C-101');
    expect(state.b.ticketNumber).toBe('C-102');
    expect(state.c.ticketNumber).toBe('R-101');
    const reloaded = JSON.parse(JSON.stringify(state));
    expect(joinQueue(reloaded, student('004'), 'Cashier', 'd', 4000).d.ticketNumber).toBe('C-103');
  });
  it('prevents a second active ticket across departments and normalizes student IDs', () => {
    const state = fixture();
    expect(() => joinQueue(state, student(' 001 '), 'Registrar', 'd', 4000)).toThrow('active ticket');
  });
  it('re-evaluates the sequence on a simulated Firebase conflict retry', () => {
    const state = fixture();
    const first = joinQueue(state, student('004'), 'Cashier', 'd', 4000);
    const retried = joinQueue(first, student('005'), 'Cashier', 'e', 4000);
    expect(new Set(Object.values(retried).filter(q => q.department === 'Cashier').map(q => q.ticketNumber)).size).toBe(4);
  });
  it('rejects malformed legacy records instead of silently resetting the counter', () => {
    expect(() => readQueues({ bad: { ticketNumber: 'C-nope' } })).toThrow('Invalid queue record');
  });
});
describe('staff operations', () => {
  it('atomically closes the previous service and calls the first waiting ticket', () => {
    let state = staffTransition(fixture(), 'Cashier', 'next', [], 'a', 5000);
    expect(state.a.status).toBe('Serving');
    state = staffTransition(state, 'Cashier', 'next', ['a'], 'b', 6000);
    expect(state.a.status).toBe('Completed');
    expect(state.b.status).toBe('Serving');
    expect(servingFor(Object.values(state), 'Cashier')).toHaveLength(1);
    expect(state.c.status).toBe('Waiting');
  });
  it('rejects a simultaneous second staff call with the stale expected queue', () => {
    const state = staffTransition(fixture(), 'Cashier', 'next', [], 'a', 5000);
    expect(() => staffTransition(state, 'Cashier', 'next', [], 'a', 5000)).toThrow('Nagbago');
  });
  it('does not complete the current ticket when call-next has no waiting ticket', () => {
    const state = staffTransition(fixture(), 'Registrar', 'next', [], 'c', 5000);
    expect(() => staffTransition(state, 'Registrar', 'next', ['c'], null, 6000)).toThrow();
    expect(state.c.status).toBe('Serving');
  });
  it('recall preserves service and increments the announcement token', () => {
    const before = staffTransition(fixture(), 'Cashier', 'next', [], 'a', 5000);
    const after = staffTransition(before, 'Cashier', 'recall', ['a'], 'b', 6000);
    expect(after.a.callCount).toBe(2);
    expect(after.a.calledAt).toBe(6000);
    expect(after.a.status).toBe('Serving');
  });
  it('supports skip and completing the last ticket without requiring another ticket', () => {
    let state = staffTransition(fixture(), 'Cashier', 'next', [], 'a', 5000);
    state = staffTransition(state, 'Cashier', 'skip', ['a'], 'b', 6000);
    expect(state.a.status).toBe('Skipped');
    state = staffTransition(state, 'Cashier', 'next', [], 'b', 7000);
    state = staffTransition(state, 'Cashier', 'complete', ['b'], null, 8000);
    expect(state.b.status).toBe('Completed');
    expect(Object.values(state).filter(q => q.department === 'Cashier' && isActive(q))).toHaveLength(0);
  });
  it('repairs multiple old Serving rows in the selected department', () => {
    const old: QueueMap = fixture();
    old.a.status = 'Serving'; old.b.status = 'Serving';
    const state = staffTransition(old, 'Cashier', 'complete', ['a', 'b'], null, 8000);
    expect(servingFor(Object.values(state), 'Cashier')).toHaveLength(0);
    expect(state.c.status).toBe('Waiting');
  });
  it('uses deterministic FIFO ordering when timestamps are tied', () => {
    const state = fixture(); state.a.createdAt = state.b.createdAt;
    expect(waitingFor([state.b, state.a], 'Cashier').map(q => q.id)).toEqual(['a', 'b']);
  });
  it('lets a student rejoin after service completes and keeps the new ticket last despite clock skew', () => {
    let state = staffTransition(fixture(), 'Cashier', 'next', [], 'a', 5000);
    state = staffTransition(state, 'Cashier', 'next', ['a'], 'b', 6000);
    state = joinQueue(state, student('004'), 'Cashier', 'e', 7000);
    const rejoined = joinQueue(state, student('001'), 'Cashier', 'd', 1500);
    expect(rejoined.a.status).toBe('Completed');
    expect(rejoined.d.ticketNumber).toBe('C-104');
    expect(waitingFor(Object.values(rejoined), 'Cashier').map(q => q.id)).toEqual(['e', 'd']);
  });
});
describe('student cancellation', () => {
  it('cancels only an owned waiting ticket and permits joining again', () => {
    const state = fixture();
    expect(() => cancelTicket(state, 'a', '002', 6000)).toThrow();
    const cancelled = cancelTicket(state, 'a', '001', 6000);
    expect(cancelled.a.status).toBe('Cancelled');
    expect(joinQueue(cancelled, student('001'), 'Cashier', 'd', 7000).d.ticketNumber).toBe('C-103');
  });
  it('refuses cancellation after staff has called the ticket', () => {
    const state = staffTransition(fixture(), 'Cashier', 'next', [], 'a', 5000);
    expect(() => cancelTicket(state, 'a', '001', 6000)).toThrow();
  });
});

describe('document data validation', () => {
  it('rejects invalid dates and copy counts before they can crash the UI', () => {
    const doc = { id: 'd', studentId: '001', studentName: 'Test', documentName: 'COE', copies: 1, createdAt: 1000, status: 'Pending' };
    expect(readDocuments({ d: doc })).toHaveLength(1);
    expect(() => readDocuments({ d: { ...doc, createdAt: 'Today' } })).toThrow('Invalid document request');
    expect(() => readDocuments({ d: { ...doc, copies: 0 } })).toThrow('Invalid document request');
  });
});
