import axios, { AxiosError, AxiosResponse } from "axios";
import { IErpSettings, IErpSettingsResponse } from "../interface/IErpSettings";
import { INotificationResponse } from "../interface/INotification";
import { toaster } from "@/components/ui/chakra-toaster";
import { IApiResponse } from "../interface/IApiResponse";
import { IMenu } from "../sidebar-data";
import { getSession } from "next-auth/react";
import { IWorkflowTemplate, IWorkflowStepRequest, IApprovalHistory } from "../interface/IWorkflow";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,

  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  },
});

axiosInstance.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session && (session as any).accessToken) {
    config.headers.Authorization = `Bearer ${(session as any).accessToken}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase();
    return response;
  },
  (error: AxiosError) => {
    const method = error?.config?.method?.toLowerCase();
    if (method === "post" || method === "put" || method === "delete") {
      if (error.response) {
        toaster.dismiss();
        toaster.error({
          title: "Error",
          description:
            error instanceof Error
              ? "Sorry a server error"
              : "An error occurred",
        });
      } else {
        console.error("Error setting up request:", error.message);
        toaster.dismiss();
        toaster.error({
          title: "Error",
          description:
            error instanceof Error ? error.message : "An error occurred",
        });
        //toast.error(`Error setting up request: ${error.message}`);
      }
    }

    return Promise.reject(error);
  }
);

const responseBody = (response: AxiosResponse) => response.data;

const requests = {
  get: async <T = any>(url: string): Promise<T> => {
    try {
      const { data } = await axiosInstance.get<T>(url);
      return data;
    } catch (error) {
      console.error("GET request failed:", error);
      throw error;
    }
  },

  post: async <TResponse = any, TBody = any>(url: string, body?: TBody): Promise<TResponse> => {
    try {
      const response = await axiosInstance.post<TResponse>(url, body);
      return response.data;
    } catch (error) {
      console.error("POST request failed:", error);
      throw error;
    }
  },

  put: async <TResponse = any, TBody = any>(url: string, body: TBody): Promise<TResponse> => {
    try {
      const response = await axiosInstance.put<TResponse>(url, body);
      return response.data;
    } catch (error) {
      console.error("PUT request failed:", error);
      throw error;
    }
  },

  patch: async <TResponse = any>(url: string): Promise<TResponse> => {
    try {
      const response = await axiosInstance.patch<TResponse>(url);
      return response.data;
    } catch (error) {
      console.error("PATCH request failed:", error);
      throw error;
    }
  },

  delete: async <TResponse = any>(url: string): Promise<TResponse> => {
    try {
      const response = await axiosInstance.delete<TResponse>(url);
      return response.data;
    } catch (error) {
      console.error("DELETE request failed:", error);
      throw error;
    }
  },
};

const users = {
  list: (params?: { page?: number; pageSize?: number; search?: string; isOnboarded?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.isOnboarded !== undefined) query.append("isOnboarded", params.isOnboarded.toString());
    return requests.get<IApiResponse<IUser>>(`/users?${query.toString()}`);
  },
  get_by_id: (id: string) => requests.get<IApiResponse<IUser>>(`/users/${id}`),
  create: (data: IUser) => requests.post<IUser>("/users", data),
  update: (id: string, data: any) => requests.put<any>(`/users?id=${id}`, data),
  onboard: (id: string) => requests.patch<any>(`/users/${id}/onboard`),
  toggleActive: (id: string, isActive: boolean) =>
    requests.put<any>(`/users/${id}/toggle-active`, { isActive }),
  getUnauthorizedLogs: () => requests.get<any>(`/users/unauthorized-logs`),
};

// const countries = {
//   list: () => requests.get<ICountriesResponse>("/countries"),
// };

// const states = {
//   getStateByCountryCode: (code: string) =>
//     requests.get<IStateResponse>(`/states/get_state_by_country_code/${code}`),
// };

const erpSettings = {
  list: () => requests.get<IApiResponse<IErpSettings>>(`/erp_settings`),
  syncFeePlanToErp: () => requests.get<any>(`/erp/ar_items/sync_fee_plan`),
  defaultSettings: (code: string) =>
    requests.get<IApiResponse<any[]>>(
      `/erp_setting_defaults?filter=erpSettingCode=${code}`
    ),
  updateDefaultSettings: (defaultsettings: any) =>
    requests.put<IErpSettings>(
      `/erp_setting_defaults/update_defaults`,
      defaultsettings
    ),
  create: (data: IErpSettings) =>
    requests.post<IErpSettings>("/erp_settings", data),
  update: (id: number, data: IErpSettings) =>
    requests.put<IErpSettings>(`/erp_settings?id=${id}`, data),
  activateErp: (code: string) =>
    requests.patch<IErpSettings>(`/erp_settings/activate/${code}`),
};

const menus = {
  list: () => requests.get<IApiResponse<IMenu[]>>(`/menus`),
  create: (data: IMenu) =>
    requests.post<IMenu>("/menus", data),
  my_menus: () =>
    requests.get<IApiResponse<IMenu[]>>(`/menus/my-menus`),
};

const roles = {
  list: () => requests.get<any>(`/roles`),
  /** Lightweight: only id + name, accessible to all authenticated users. Used for dropdowns. */
  listNames: () => requests.get<{ isSuccess: boolean; content: { id: string; name: string }[] }>(`/roles/names`),
};

const notification = {
  list: (params?: { page?: number; pageSize?: number; isRead?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    if (params?.isRead !== undefined)
      query.append("isRead", params.isRead.toString());

    return requests.get<INotificationResponse>(
      `/notifications?${query.toString()}`
    );
  },
  markAsRead: (id: number) =>
    requests.put(`/notifications/${id}/mark-as-read`, {}),
  markAllAsRead: () => requests.put("/notifications/mark-all-as-read", {}),
  import: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return requests.post("/notifications/import", formData);
  },
};

const dashboard = {
  getSummary: () => requests.get<any>(`/dashboardsummaries`),
  getActivities: (params?: { page?: number; pageSize?: number; orderBy?: string; orderDirection?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    if (params?.orderBy) query.append("orderBy", params.orderBy);
    if (params?.orderDirection !== undefined) query.append("orderDirection", params.orderDirection);
    return requests.get<any>(`/activities?${query.toString()}`);
  },
  getLowStockItems: (params?: { page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    return requests.get<any>(`/items/low-stock?${query.toString()}`);
  }
};

const requisitions = {
  list: (params?: { status?: string; departmentId?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("filter", `status=${params.status}`);
    if (params?.departmentId) query.append("filter", `departmentId=${params.departmentId}`);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    return requests.get<any>(`/requisitions?${query.toString()}`);
  },
  approve: (id: string) => requests.put<any>(`/requisitions/${id}/approve`, {}),
  reject: (id: string, reason: string) => requests.put<any>(`/requisitions/${id}/reject`, { reason }),
  create: (data: { title: string; amount: number; description: string; departmentId: string }) =>
    requests.post<any>("/requisitions", data),
  getApprovalHistory: (id: string) =>
    requests.get<IApiResponse<IApprovalHistory>>(`/requisitions/${id}/approval-history`),
  createWithFile: async (formData: FormData): Promise<any> => {
    try {
      const response = await axiosInstance.post<any>("/requisitions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      console.error("POST request failed:", error);
      throw error;
    }
  },
};

const departments = {
  list: () => requests.get<any>(`/departments`),
  create: (data: { name: string; code: string; headName?: string; description?: string; budget?: number }) =>
    requests.post<any>(`/departments`, data),
  update: (id: string, data: { name: string; code: string; headName?: string; description?: string; budget?: number }) =>
    requests.put<any>(`/departments/${id}`, data),
};

const categories = {
  list: () => requests.get<any>(`/categories`),
  create: (data: { name: string; description?: string }) => {
    const code = data.name.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 10);
    return requests.post<any>(`/categories`, { ...data, code });
  },
};

const vendors = {
  list: () => requests.get<any>(`/vendors`),
  create: (data: { name: string; email?: string; phoneNumber?: string }) =>
    requests.post<any>(`/vendors`, data),
};

const locations = {
  list: () => requests.get<any>(`/locations`),
  create: (data: { name: string; description?: string }) => requests.post<any>(`/locations`, data),
};

const items = {
  list: (search?: string, page?: number, pageSize?: number) => {
    const query = new URLSearchParams();
    if (search) query.append("search", search);
    if (page) query.append("page", page.toString());
    if (pageSize) query.append("pageSize", pageSize.toString());
    return requests.get<any>(`/items?${query.toString()}`);
  },
  getById: (id?: string) => {
    return requests.get<any>(`/items/${id}`);
  },
  create: (data: {
    name: string;
    code: string;
    sku: string;
    unitType: string;
    description?: string;
    locationId?: string;
    itemLocation?: string;
  }) => requests.post<any>("/items", data),
  update: (id: string, data: any) => requests.put<any>(`/items?id=${id}`, data),
};

const itemRequests = {
  list: (params?: { status?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append("filter", `status=${params.status}`);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    return requests.get<any>(`/itemrequests?${query.toString()}`);
  },
  approve: (id: string) => requests.put<any>(`/itemrequests/${id}/approve`, {}),
  reject: (id: string, reason: string) => requests.put<any>(`/itemrequests/${id}/reject`, { reason }),
  create: (data: { itemName: string; itemId?: string; quantity: number; purpose: string; departmentId: string }) =>
    requests.post<any>("/itemrequests", data),
  getApprovalHistory: (id: string) =>
    requests.get<IApiResponse<IApprovalHistory>>(`/itemrequests/${id}/approval-history`),
};

const SEVERITY_MAP: Record<number, string> = { 0: "low", 1: "medium", 2: "high", 3: "critical" };
const STATUS_MAP: Record<number, string> = { 0: "open", 1: "in_progress", 2: "resolved" };

const mapIncident = (item: any) => {
  if (!item) return item;

  let severity = "medium";
  if (typeof item.priority === "number") severity = SEVERITY_MAP[item.priority] || "medium";
  else if (typeof item.priority === "string") {
    const s = item.priority.toLowerCase();
    if (s === "low" || s === "0") severity = "low";
    else if (s === "medium" || s === "1") severity = "medium";
    else if (s === "high" || s === "2") severity = "high";
    else if (s === "critical" || s === "3") severity = "critical";
  }

  let status = "open";
  if (typeof item.status === "number") status = STATUS_MAP[item.status] || "open";
  else if (typeof item.status === "string") {
    const s = item.status.toLowerCase();
    if (s === "open" || s === "0") status = "open";
    else if (s === "inprogress" || s === "in_progress" || s === "1") status = "in_progress";
    else if (s === "resolved" || s === "2") status = "resolved";
  }

  return {
    ...item,
    deviceName: item.deviceType || item.deviceName,
    deviceCode: item.deviceId || item.deviceCode,
    severity: severity,
    status: status,
    description: item.issueDescription || item.description,
    createdAt: item.date || item.createdOn || item.createdAt,
    reportedByName: item.reportedByName || item.createdBy,
    resolution: item.resolution,
    resolvedAt: item.lastModifiedOn || item.lastModifiedAt, // Use updated timestamp
  };
};

const incidents = {
  list: async (params?: { status?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) {
      const statusInt = { open: 0, in_progress: 1, resolved: 2 }[params.status] ?? 0;
      query.append("filter", `status=${statusInt}`);
    }
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    const res = await requests.get<any>(`/incidents?${query.toString()}`);
    if (res?.isSuccess && res.content) {
      if (Array.isArray(res.content)) {
        res.content = res.content.map(mapIncident);
      } else if (res.content.items && Array.isArray(res.content.items)) {
        res.content.items = res.content.items.map(mapIncident);
      } else if (res.content.data && Array.isArray(res.content.data)) {
        res.content.data = res.content.data.map(mapIncident);
      }
    }
    return res;
  },
  create: async (data: {
    deviceName: string;
    deviceCode: string;
    severity: string;
    description: string;
    reportedBy?: string;
    departmentId?: string;
    date?: string;
  }) => {
    const priority = { low: 0, medium: 1, high: 2, critical: 3 }[data.severity] ?? 1;

    const res = await requests.post<any>("/incidents", {
      deviceType: data.deviceName,
      deviceId: data.deviceCode,
      priority: priority,
      issueDescription: data.description,
      departmentId: data.departmentId,
      date: data.date
    });

    if (res?.isSuccess && res.content) {
      res.content = mapIncident(res.content);
    } else if (res && res.id) {
      Object.assign(res, mapIncident(res));
    }
    return res;
  },
  markInProgress: (id: string) => requests.put<any>(`/incidents/${id}/in-progress`, {}),
  markResolved: (id: string, resolution: string) => requests.put<any>(`/incidents/${id}/resolve`, { resolution }),
};


const monthlyReports = {
  list: (params?: { month?: string; year?: string; departmentId?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    if (params?.month) query.append("filter", `month=${params.month}`);
    if (params?.year) query.append("filter", `year=${params.year}`);
    if (params?.departmentId) query.append("filter", `departmentId=${params.departmentId}`);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("pageSize", params.pageSize.toString());
    return requests.get<any>(`/monthlyreports?${query.toString()}`);
  },
  create: (data: {
    goalTitle: string;
    targetValue: number;
    achievedValue: number;
    month: string;
    year: string;
    notes?: string;
    departmentId?: string;
  }) => requests.post<any>("/monthlyreports", data),
  getStats: (year?: string) => requests.get<any>(`/monthlyreports/stats${year ? `?year=${year}` : ""}`),
};

const workflowTemplates = {
  list: () => requests.get<IApiResponse<IWorkflowTemplate[]>>(`/workflows`),
  getByType: (type: number) => requests.get<IApiResponse<IWorkflowTemplate>>(`/workflows/${type}`),
  create: (data: Omit<IWorkflowTemplate, 'id'>) => requests.post<IApiResponse<IWorkflowTemplate>>(`/workflows`, data),
  upsertSteps: (id: string, steps: IWorkflowStepRequest[]) =>
    requests.put<IApiResponse<IWorkflowTemplate>>(`/workflows/${id}/steps`, steps),
};

const apiHandler = {
  users,
  roles,
  menus,
  erpSettings,
  notification,
  dashboard,
  requisitions,
  itemRequests,
  incidents,
  monthlyReports,
  items,
  departments,
  categories,
  vendors,
  locations,
  workflowTemplates,
  get: requests.get,
  put: requests.put,
};

export default apiHandler;
