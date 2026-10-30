export const DEPARTMENTS = ['Cashier', 'Accounting', 'Registrar'] as const;
export type DepartmentType = typeof DEPARTMENTS[number];
export type UserRole = 'Student' | 'Staff';
export type QueueStatus = 'Waiting' | 'Serving' | 'Completed' | 'Skipped' | 'Cancelled';
export type DocumentStatus = 'Pending' | 'Processing' | 'Ready' | 'Released';
export interface StudentInfo {
  name: string;
  studentId: string;
  course: string;
  yearLevel: string;
  block: string;
  role: UserRole;
}
export interface QueueItem {
  id: string;
  ticketNumber: string;
  studentName: string;
  studentId: string;
  department: DepartmentType;
  status: QueueStatus;
  createdAt: number;
  course?: string;
  block?: string;
  updatedAt?: number;
  calledAt?: number;
  callCount?: number;
}
export interface DocumentRequest {
  id: string;
  studentId: string;
  studentName: string;
  documentName: string;
  copies: number;
  createdAt: number;
  status: DocumentStatus;
}
export type QueueMap = Record<string, QueueItem>;
export type StaffAction = 'next' | 'complete' | 'skip' | 'recall';
