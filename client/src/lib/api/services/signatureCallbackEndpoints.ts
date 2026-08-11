import { apiFetch } from "../core/fetch";

export interface CallbackEndpoint {
  callbackEndpointId: number;
  clientId: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CallbackEndpointCreate {
  clientId: string;
  url: string;
  events: string[];
}

export interface CallbackEndpointUpdate {
  url: string;
  events: string[];
  isActive: boolean;
}

const BASE = "/api/v1/signature/admin/callback-endpoints";

export const CallbackEndpointsAPI = {
  list: () => apiFetch<CallbackEndpoint[]>(BASE),
  create: (body: CallbackEndpointCreate) =>
    apiFetch<CallbackEndpoint>(BASE, { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: CallbackEndpointUpdate) =>
    apiFetch<CallbackEndpoint>(`${BASE}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deactivate: (id: number) => apiFetch(`${BASE}/${id}`, { method: "DELETE" }),
};
