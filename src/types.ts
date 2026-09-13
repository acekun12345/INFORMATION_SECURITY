export interface StudentInfo {
  name: string;
  studentId: string;
  course: string;
  yearLevel: string;
  block: string;
  role: string;
  balance: {
    tuition: number;
    miscFees: number;
    totalPaid: number;
    remainingBalance: number;
  };
}

export interface QueueInfo {
  nowServing: string;
  servingDepartment: string;
  yourNumber: string | null;
  peopleAhead: number;
  department: string | null;
}

export interface DocumentRequest {
  id: string;
  documentName: string;
  dateRequested: string;
  status: "Pending" | "Processing" | "Ready for Pickup";
  copies: number;
}