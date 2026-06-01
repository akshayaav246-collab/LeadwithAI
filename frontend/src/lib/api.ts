const serverApiUrl = 'https://project.globalknowledgetech.com:4007/';
const envBase = (import.meta.env.VITE_API_URL || '').trim();
const isProductionHost = window.location.hostname === 'project.globalknowledgetech.com';
const fallbackBase = isProductionHost
  ? serverApiUrl
  : `${window.location.protocol}//${window.location.hostname}:4000`;
const resolvedBase = envBase || fallbackBase;

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
  return request<{ token: string; user: any }>('/api/auth/register', { method: 'POST', body: formData });
}

export function sendOtp(email: string) {
  return request<{ message: string }>('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ email }) });
}

export function verifyOtp(email: string, otp: string) {
  return request<{ token: string; user: any }>('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });
}

export function sendRegisterOtp(email: string, userType?: string) {
  return request<{ message: string }>('/api/auth/send-register-otp', { method: 'POST', body: JSON.stringify({ email, userType }) });
}

export function verifyRegisterOtp(email: string, otp: string) {
  return request<{ message: string }>('/api/auth/verify-register-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });
}

export function getMe(token: string) {
  return request<{ user: any }>('/api/auth/me', {}, token);
}

export function submitFeedback(token: string, feedback: { session: string; rating: string; text: string }[]) {
  return request<{ message: string }>('/api/auth/feedback', { method: 'POST', body: JSON.stringify({ feedback }) }, token);
}

export function completeProfile(token: string, formData: FormData) {
  return request<{ message: string; user: any }>('/api/auth/complete-profile', { method: 'PATCH', body: formData }, token);
}

export function createAdminUser(token: string, payload: { fullName: string; email: string; userType?: string; referralCode?: string; selectedCohort?: string }) {
  return request<{ message: string; user: any }>('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }, token);
}

// ─── Payment API ─────────────────────────────

export function createOrder(token: string) {
  return request<{ orderId: string; amount: number; currency: string; keyId: string; userName: string; userEmail: string; userPhone: string }>(
    '/api/payment/create-order', { method: 'POST' }, token
  );
}

export function verifyPayment(token: string, payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  return request<{ message: string; paymentId: string }>('/api/payment/verify', { method: 'POST', body: JSON.stringify(payload) }, token);
}

export function verifyCertificate(userId: string) {
  return request<{ fullName: string; eventName: string; issueDate: string }>(`/api/auth/certificate/${userId}`);
}

// ─── Data API ────────────────────────────────

export function getColleges(query: string) {
  return request<{ colleges: string[] }>(`/api/data/colleges?q=${encodeURIComponent(query)}`);
}

export function addCollege(college: string) {
  return request<{ success: boolean; college: string }>('/api/data/colleges', { method: 'POST', body: JSON.stringify({ college }) });
}

export function getPublicSettings() {
  return request<{ feedbackEnabled: boolean; isMaintenanceMode: boolean }>('/api/public/settings');
}

// ─── Admin Auth ───────────────────────────────────────────────

export function adminLogin(credentials: any) {
  return request<{ token: string; message: string }>('/api/admin/login', { method: 'POST', body: JSON.stringify(credentials) });
}

// ─── Admin Stats ──────────────────────────────────────────────

export function getAdminStats(token: string) {
  return request<{
    totalUsers: number;
    paidUsers: number;
    unpaidUsers: number;
    totalRevenue: number;
    referralBreakdown: Record<string, { total: number; students: number; professionals: number }>;
    recentRegistrations: any[];
  }>('/api/admin/stats', {}, token);
}

// ─── Admin Users ──────────────────────────────────────────────

export function getAdminUsers(token: string, params?: Record<string, string | number>) {
  const queryStr = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]))
      ).toString()
    : '';
  return request<any>(`/api/admin/users${queryStr}`, {}, token);
}

export function editAdminUser(token: string, userId: string, updates: Record<string, string>) {
  return request<{ message: string; user: any }>(`/api/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(updates) }, token);
}

export function toggleUserStatus(token: string, userId: string) {
  return request<{ message: string; isActive: boolean }>(`/api/admin/users/${userId}/status`, { method: 'PATCH' }, token);
}

export function toggleUserWaitlist(token: string, userId: string) {
  return request<{ message: string; isWaitlisted: boolean }>(`/api/admin/users/${userId}/waitlist`, { method: 'PATCH' }, token);
}

export function manualConfirmPayment(token: string, userId: string, razorpayPaymentId: string) {
  return request<{ message: string; zoomStatus: string }>(`/api/admin/users/${userId}/confirm-payment`, { method: 'POST', body: JSON.stringify({ razorpayPaymentId }) }, token);
}

export function deleteAdminUser(token: string, userId: string) {
  return request<{ message: string }>(`/api/admin/users/${userId}`, { method: 'DELETE' }, token);
}

export function retryZoomRegistration(token: string, userId: string) {
  return request<{ message: string; zoomJoinUrl: string }>(`/api/admin/users/${userId}/retry-zoom`, { method: 'POST' }, token);
}

export function retryEmailConfirmation(token: string, userId: string) {
  return request<{ message: string }>(`/api/admin/users/${userId}/retry-email`, { method: 'POST' }, token);
}

// ─── Admin Feedback ───────────────────────────────────────────

export function getAdminFeedback(token: string, params?: Record<string, string | number>) {
  const queryStr = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]))
      ).toString()
    : '';
  return request<any>(`/api/admin/feedback${queryStr}`, {}, token);
}

// ─── Admin Email ──────────────────────────────────────────────

export function sendAdminEmail(token: string, payload: any) {
  return request<{ message: string }>('/api/admin/send-email', { method: 'POST', body: JSON.stringify(payload) }, token);
}

// ─── Admin Audit Logs ─────────────────────────────────────────

export function getAuditLogs(token: string, params?: Record<string, string | number>) {
  const queryStr = params
    ? '?' + new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)]))
      ).toString()
    : '';
  return request<any>(`/api/admin/audit-logs${queryStr}`, {}, token);
}

// ─── Admin Settings ───────────────────────────────────────────

export function getAdminSettings(token: string) {
  return request<{
    feedbackEnabled: boolean;
    isMaintenanceMode: boolean;
    registrationCap: number;
    referralCodes: { code: string; label: string; isActive: boolean }[];
  }>('/api/admin/settings', {}, token);
}

export function updateFeedbackSetting(token: string, feedbackEnabled: boolean) {
  return request<{ feedbackEnabled: boolean }>('/api/admin/settings/feedback', { method: 'PATCH', body: JSON.stringify({ feedbackEnabled }) }, token);
}

/** @deprecated use updateFeedbackSetting */
export const updateAdminSettings = updateFeedbackSetting;

export function updateMaintenanceMode(token: string, isMaintenanceMode: boolean) {
  return request<{ isMaintenanceMode: boolean }>('/api/admin/settings/maintenance', { method: 'PATCH', body: JSON.stringify({ isMaintenanceMode }) }, token);
}

export function updateRegistrationCap(token: string, registrationCap: number) {
  return request<{ message: string; registrationCap: number }>('/api/admin/settings/cap', { method: 'PATCH', body: JSON.stringify({ registrationCap }) }, token);
}

export function getReferralCodes(token: string) {
  return request<{ code: string; label: string; isActive: boolean }[]>('/api/admin/settings/referrals', {}, token);
}

export function addReferralCode(token: string, code: string, label: string) {
  return request<{ message: string; referralCodes: any[] }>('/api/admin/settings/referrals', { method: 'POST', body: JSON.stringify({ code, label }) }, token);
}

export function toggleReferralCode(token: string, code: string) {
  return request<{ message: string; referralCodes: any[] }>(`/api/admin/settings/referrals/${code}`, { method: 'PATCH' }, token);
}

export function deleteReferralCode(token: string, code: string) {
  return request<{ message: string; referralCodes: any[] }>(`/api/admin/settings/referrals/${code}`, { method: 'DELETE' }, token);
}

export function updateReferralLabel(token: string, code: string, label: string) {
  return request<{ message: string; referralCodes: any[] }>(`/api/admin/settings/referrals/${code}/label`, { method: 'PUT', body: JSON.stringify({ label }) }, token);
}

// ─── Admin Accounts ───────────────────────────────────────────

export function getAdmins(token: string) {
  return request<any[]>('/api/admin', {}, token);
}

export function deleteAdmin(token: string, adminId: string) {
  return request<{ message: string }>(`/api/admin/${adminId}`, { method: 'DELETE' }, token);
}

// ─── ID Parse API ────────────────────────────

export type IdCardResult = {
  is_id_card: boolean;
  is_valid_college: boolean;
  is_current_student: boolean;
  is_student_not_staff: boolean;
  college: string | null;
  course: string | null;
  academicYearRange: string | null;
  year_of_study: string | null;
  confidence: 'high' | 'medium' | 'low';
  verdict: 'APPROVED' | 'REJECTED' | 'REVIEW' | 'TRAFFIC_ERROR';
  rejection_reason: string | null;
  source: 'gemini' | 'tesseract';
};

export function parseIdCard(file: File, email?: string) {
  const formData = new FormData();
  formData.append('idCard', file);
  if (email) formData.append('email', email);
  return request<IdCardResult>('/api/auth/parse-id', { method: 'POST', body: formData });
}
