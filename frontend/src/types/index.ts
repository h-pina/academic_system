export interface Position {
  id: number;
  name: string;
}

export interface User {
  cpf: string;
  name: string;
  email: string;
  roleId: number;
}

export interface LoginResponse {
  accessToken: string;
}

export interface AuthProfile {
  cpf: string;
  name: string;
  roleId: number;
}

export interface AccessInfo {
  hasPassword: boolean;
  name: string;
}

export const REQUISITION_STATUSES = [
  "AWAITING_APPROVAL",
  "AWAITING_CHANGES",
  "APPROVED",
  "CANCELLED",
] as const;

export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const REQUISITION_STATUS_LABELS: Record<RequisitionStatus, string> = {
  AWAITING_APPROVAL: "Awaiting approval",
  AWAITING_CHANGES: "Awaiting changes",
  APPROVED: "Approved",
  CANCELLED: "Cancelled",
};

export const MIN_REQUISITION_ITEMS = 1;
export const MAX_REQUISITION_ITEMS = 10;

export interface RequisitionItem {
  id: number;
  requisitionId: number;
  description: string;
  quantity: number;
}

export interface RequisitionListItem {
  id: number;
  createdAt: string;
  status: RequisitionStatus;
  priorityRequested: boolean;
  itemCount: number;
}

export interface MaterialRequisition {
  id: number;
  requesterCpf: string;
  requesterName: string;
  createdAt: string;
  status: RequisitionStatus;
  priorityRequested: boolean;
  priorityJustification: string | null;
  reviewerNote: string | null;
  items: RequisitionItem[];
}

export interface RequisitionPayload {
  items: { description: string; quantity: number }[];
  priorityRequested: boolean;
  priorityJustification?: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface Feature {
  code: number;
  label: string;
  route: string;
}

export interface FeatureAccess {
  roleId: number;
  features: number[];
}

export interface MenuItem {
  route: string;
  label: string;
}

export type MessageType = "ERROR" | "WARNING" | "SUCCESS";

export interface AppMessage {
  type: MessageType;
  messages: string[];
}
