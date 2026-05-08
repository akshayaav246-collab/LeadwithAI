const serverApiUrl = 'https://project.globalknowledgetech.com:4007/';
const envBase = (import.meta.env.VITE_API_URL || '').trim();
const isProductionHost = window.location.hostname === 'project.globalknowledgetech.com';
const fallbackBase = isProductionHost
  ? serverApiUrl
  : `${window.location.protocol}//${window.location.hostname}:4000`;
const resolvedBase = envBase || fallbackBase;

// Remove trailing slash if present to avoid double slashes when paths start with /
const BASE_URL = resolvedBase.replace(/\/$/, '');

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

// ─── Auth API ────────────────────────────────

export function registerUser(formData: FormData) {
  return request<{ token: string; user: any }>('/api/auth/register', {
    method: 'POST',
    body: formData,
  });
}

export function sendOtp(email: string) {
  return request<{ message: string }>('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyOtp(email: string, otp: string) {
  return request<{ token: string; user: any }>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export function sendRegisterOtp(email: string) {
  return request<{ message: string }>('/api/auth/send-register-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyRegisterOtp(email: string, otp: string) {
  return request<{ message: string }>('/api/auth/verify-register-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export function getMe(token: string) {
  return request<{ user: any }>('/api/auth/me', {}, token);
}

// ─── Payment API ─────────────────────────────

export function createOrder(token: string) {
  return request<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
  }>('/api/payment/create-order', { method: 'POST' }, token);
}

export function verifyPayment(
  token: string,
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }
) {
  return request<{ message: string; paymentId: string }>(
    '/api/payment/verify',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
}

// ─── Data API ────────────────────────────────

export function getColleges(query: string) {
  return request<{ colleges: string[] }>(`/api/data/colleges?q=${encodeURIComponent(query)}`);
}

export function addCollege(college: string) {
  return request<{ success: boolean; college: string }>(
    '/api/data/colleges',
    { method: 'POST', body: JSON.stringify({ college }) }
  );
}

// ─── Admin API ───────────────────────────────

export function adminLogin(credentials: any) {
  return request<{ token: string; message: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function getAdminStats(token: string) {
  return request<any>('/api/admin/stats', {}, token);
}

export function getAdminUsers(token: string) {
  return request<any[]>('/api/admin/users', {}, token);
}

export function sendAdminEmail(token: string, payload: any) {
  return request<{ message: string }>('/api/admin/send-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);
}

// ─── ID Parse API ────────────────────────────

export function parseIdCard(file: File) {
  const formData = new FormData();
  formData.append('idCard', file);
  return request<{ college: string; course: string; year: string; source: string }>('/api/auth/parse-id', {
    method: 'POST',
    body: formData,
  });
}
