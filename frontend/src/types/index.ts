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
