export type RoleName = "admin" | "secretary" | "teacher" | "student";

export interface User {
  id: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  active: boolean;
  roles: RoleName[];
}

export interface LoginResponse {
  accessToken: string;
}

export interface AuthProfile {
  cpf: string;
  name: string;
  registrationNumber: string | null;
  roles: RoleName[];
}

export interface AccessInfo {
  hasPassword: boolean;
  name: string;
}

export interface Feature {
  code: number;
  label: string;
  route: string;
  roles: RoleName[];
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
