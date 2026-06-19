import React, { useEffect, useState } from 'react';
import {
  getAdminUsers,
  retryZoomRegistration,
  retryEmailConfirmation,
  editAdminUser,
  toggleUserStatus,
  toggleUserWaitlist,
  manualConfirmPayment,
  rejectNepalPayment,
  getAdminSettings,
  createAdminUser,
  registerAllZoomAttendees,
  bulkRegister
} from '../../lib/api';
import { CertificateGenerator } from '../../components/admin/CertificateGenerator';
import { toast } from 'sonner';
import Papa from 'papaparse';

function isCohortCompleted(cohortStr: string) {
  if (!cohortStr) return false;
  const match = cohortStr.match(/([A-Za-z]+)\s+(\d+)\s*(?:&\s*(\d+))?,\s*(\d{4})/);
  if (match) {
    const monthStr = match[1];
    const day2 = match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10);
    const year = parseInt(match[4], 10);
    
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const month = months[monthStr.toLowerCase()] !== undefined ? months[monthStr.toLowerCase()] : 5;
    
    // Create Date for the end of the cohort day (6:00 PM IST -> 12:30 UTC)
    const cohortEndDate = new Date(Date.UTC(year, month, day2, 12, 30, 0));
    return new Date() > cohortEndDate;
  }
  return false;
}

const DOMAIN_OPTIONS = [
  "Information Technology (IT)",
  "Manufacturing",
  "Automobile / Automotive",
  "Healthcare",
  "Finance & Banking",
  "Education",
  "Retail & E-commerce",
];

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

function IdCardLink({ path }: { path: string | null }) {
  if (!path) return <span style={{ color: '#bbb' }}>—</span>;
  const url = `${API_BASE}/uploads/${path}`;
  const isImage = /\.(jpg|jpeg|png)$/i.test(path);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {isImage && (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt="ID Card"
            style={{
              width: 80, height: 56, objectFit: 'cover',
              borderRadius: 6, border: '1.5px solid rgba(59, 139, 212, 0.2)', cursor: 'pointer',
            }}
          />
        </a>
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: '0.78rem', color: '#3B8BD4', textDecoration: 'underline' }}
      >
        {isImage ? 'View full' : 'View PDF'}
      </a>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', padding: '0.3rem 0', borderBottom: '1px solid #E2E8F0' }}>
      <span style={{ color: '#64748B', minWidth: 130, fontWeight: 600 }}>{label}</span>
      <span style={{ color: '#0F172A' }}>{value || '—'}</span>
    </div>
  );
}

function formatReferral(ref: string | null | undefined): string {
  if (!ref || ref === '-') return '-';
  if (ref.includes(' - ')) {
    return ref.split(' - ')[1];
  }
  return ref;
}

function getMissingFields(user: any) {
  const missing: string[] = [];
  
  if (!user.phone || user.phone === '-' || user.phone.trim() === '') {
    missing.push('Phone Number');
  }
  
  if (!user.userType || user.userType === '-' || user.userType.trim() === '') {
    missing.push('Account Type');
  } else if (user.userType === 'student') {
    if (!user.collegeName || user.collegeName === '-' || user.collegeName.trim() === '') {
      missing.push('College Name');
    }
    if (!user.course || user.course === '-' || user.course.trim() === '') {
      missing.push('Course');
    }
    if (!user.year || user.year === '-' || user.year.trim() === '') {
      missing.push('Year of Study');
    }
    const isInstitutionalEmail = /\.(ac|edu)\.in$/i.test(user.email || '');
    if (!isInstitutionalEmail && !user.idCardPath) {
      missing.push('College ID Card');
    }
  } else if (user.userType === 'working') {
    if (!user.domain || user.domain === '-' || user.domain.trim() === '') {
      missing.push('Domain / Industry');
    }
  }
  
  if (!user.heardFrom || user.heardFrom === '-' || user.heardFrom.trim() === '') {
    missing.push('How did you hear about us?');
  }
  
  return missing;
}

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalRegistrants, setTotalRegistrants] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [filterPaid, setFilterPaid] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterWaitlist, setFilterWaitlist] = useState('all');
  const [filterSources, setFilterSources] = useState<string[]>([]);  // multi-checkbox
  const [filterCohort, setFilterCohort] = useState('all');
  const [filterFeedback, setFilterFeedback] = useState('all');
  const [filterCertSent, setFilterCertSent] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isSendingCert, setIsSendingCert] = useState<string | null>(null);
  const [isBulkSendingCert, setIsBulkSendingCert] = useState(false);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [cohortsList, setCohortsList] = useState<string[]>([]);
  const [salespersonsList, setSalespersonsList] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [certificateUser, setCertificateUser] = useState<any>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    collegeName: '',
    course: '',
    year: '',
    domain: '',
    organization: '',
    heardFrom: '',
    heardFromOther: '',
    referralName: '',
    referralCode: '',
    selectedCohort: '',
    country: ''
  });
  const [editIdCardFile, setEditIdCardFile] = useState<File | null>(null);

  // Manual Payment Confirmation State
  const [paymentConfirmUser, setPaymentConfirmUser] = useState<any>(null);
  const [razorpayPaymentId, setRazorpayPaymentId] = useState('');

  // Payment Rejection State
  const [paymentRejectUser, setPaymentRejectUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Status Confirm State
  const [statusConfirmUser, setStatusConfirmUser] = useState<any>(null);

  // Add Registrant Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    userType: 'student', // 'student' or 'working'
    collegeName: '',
    course: '',
    year: '',
    domain: '',
    organization: '',
    heardFrom: '',
    heardFromOther: '',
    referralName: '',   // GKT Employee referral name
    referralCode: '',
    selectedCohort: '',
    paymentStatus: 'pending',
    customPaymentAmount: '',
    country: 'India'
  });
  const [addIdCardFile, setAddIdCardFile] = useState<File | null>(null);

  // Bulk Registration States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const [isZoomRegistering, setIsZoomRegistering] = useState(false);

  const adminToken = localStorage.getItem('adminToken') || '';

  // Load settings on mount
  useEffect(() => {
    getAdminSettings(adminToken)
      .then(settings => {
        setReferralsList(settings.referralCodes || []);
        const cohorts = settings.cohorts || [];
        const activeCohort = settings.activeCohort || (cohorts.length > 0 ? cohorts[0] : 'June 27 & 28, 2026');
        setCohortsList(cohorts);
        setSalespersonsList(settings.salespersons || []);
        setAddForm(prev => ({ ...prev, selectedCohort: activeCohort }));
        // Default user management list to active cohort
        setFilterCohort(activeCohort);
      })
      .catch(console.error);
  }, [adminToken]);


  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [filterPaid, filterType, filterWaitlist, filterSources, sortOrder, filterCohort, filterFeedback, filterCertSent]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers(adminToken, {
        page,
        limit,
        search: debouncedSearchTerm,
        filterPaid,
        filterType,
        filterWaitlist,
        filterSource: filterSources.length > 0 ? filterSources.join(',') : 'all',
        filterCohort,
        filterFeedback,
        filterCertSent,
        filterCountry,
        sortOrder
      });
      setUsers(data.data || []);
      setTotal(data.total || 0);
      setTotalRegistrants(data.totalRegistrants || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError('Failed to load users. ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearchTerm, filterPaid, filterType, filterWaitlist, filterSources, sortOrder, filterCohort, filterFeedback, filterCertSent, filterCountry, adminToken]);

  const handleExportCSV = async () => {
    try {
      const response = await getAdminUsers(adminToken, {
        search: debouncedSearchTerm,
        filterPaid,
        filterType,
        filterWaitlist,
        filterSource: filterSources.length > 0 ? filterSources.join(',') : 'all',
        filterCohort,
        filterFeedback,
        filterCertSent,
        filterCountry,
        exportCsv: 'true',
        sortOrder
      });
      const exportUsers = response.data || [];
      
      if (exportUsers.length === 0) {
        toast.info('No users found for export.');
        return;
      }
      const headers = [
        'Name', 'Email', 'Phone', 'Type', 'Selected Date',
        'College', 'Course', 'Year',
        'Domain', 'Organization',
        'Waitlisted', 'Active', 'Heard From', 'Referral Code',
        'Payment Status', 'Payment ID', 'Profile Status', 'Feedback Submitted', 'Certificate Sent', 'Registered On'
      ];
      const rows = exportUsers.map((u: any) => [
        `"${u.fullName}"`, `"${u.email}"`, `"${u.phone}"`, `"${u.userType}"`,
        `"${u.selectedCohort || '-'}"`,
        `"${u.collegeName}"`, `"${u.course}"`, `"${u.year}"`,
        `"${u.domain}"`, `"${u.organization}"`,
        u.isWaitlisted ? 'Yes' : 'No', u.isActive ? 'Active' : 'Inactive', `"${u.heardFrom || '-'}"`, `"${u.referralCode || '-'}"`,
        u.isPaid ? 'Paid' : 'Unpaid',
        `"${u.paymentId || '-'}"`,
        u.isProfileComplete ? 'Complete' : 'Partially Filled',
        u.isFeedbackSubmitted ? 'Yes' : 'No',
        u.isCertificateSent ? 'Yes' : 'No',
        `"${new Date(u.createdAt).toLocaleString()}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lead_with_ai_users.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const handleRetry = async (userId: string, type: 'zoom' | 'email') => {
    try {
      if (type === 'zoom') {
        await retryZoomRegistration(adminToken, userId);
      } else {
        await retryEmailConfirmation(adminToken, userId);
      }
      toast.success(`${type.toUpperCase()} retry successful!`);
      setUsers(users.map(u => u.id === userId ? { ...u, [type === 'zoom' ? 'zoomStatus' : 'emailStatus']: 'success' } : u));
    } catch (err: any) {
      toast.error(`Retry failed: ${err.message}`);
    }
  };


  const handleToggleStatusConfirm = async () => {
    if (!statusConfirmUser) return;
    try {
      const res = await toggleUserStatus(adminToken, statusConfirmUser.id);
      setUsers(users.map(u => u.id === statusConfirmUser.id ? { ...u, isActive: res.isActive } : u));
      setStatusConfirmUser(null);
      toast.success(res.message);
    } catch (err: any) {
      toast.error(`Failed to change user status: ${err.message}`);
    }
  };

  const handleToggleWaitlistStatus = async (userId: string) => {
    try {
      const res = await toggleUserWaitlist(adminToken, userId);
      toast.success(res.message);
      setUsers(users.map(u => u.id === userId ? { ...u, isWaitlisted: res.isWaitlisted } : u));
    } catch (err: any) {
      toast.error(`Failed to change waitlist status: ${err.message}`);
    }
  };

  const handleOpenEditModal = (user: any) => {
    const matchingReferral = referralsList.find(
      (r: any) => r.label === user.referralCode || r.code === user.referralCode
    );
    const resolvedCode = matchingReferral ? matchingReferral.code : '';

    const mainOptions = ['Social Media', 'Newspaper', 'GKT Employee'];
    let parsedHeardFrom = user.heardFrom === '-' ? '' : (user.heardFrom || '');
    let parsedHeardFromOther = '';
    
    if (parsedHeardFrom.startsWith('GKT Employee') || parsedHeardFrom === 'Referral' || user.salesperson || (user.referralCode && user.referralCode !== '-')) {
      parsedHeardFrom = 'GKT Employee';
    } else if (parsedHeardFrom && !mainOptions.includes(parsedHeardFrom)) {
      parsedHeardFromOther = parsedHeardFrom;
      parsedHeardFrom = 'Others';
    }

    setEditingUser(user);
    setEditForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      collegeName: user.collegeName === '-' ? '' : user.collegeName,
      course: user.course === '-' ? '' : user.course,
      year: user.year === '-' ? '' : user.year,
      domain: user.domain === '-' ? '' : user.domain,
      organization: user.organization === '-' ? '' : user.organization,
      heardFrom: parsedHeardFrom,
      heardFromOther: parsedHeardFromOther,
      referralName: user.salesperson || (user.referralCode && user.referralCode !== '-' ? user.referralCode : ''),
      referralCode: resolvedCode,
      selectedCohort: user.selectedCohort || '',
      country: user.country || 'India'
    });
    setEditIdCardFile(null);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const fd = new FormData();
      fd.append('fullName', editForm.fullName.trim());
      fd.append('phone', editForm.phone.trim());
      fd.append('country', editForm.country);
      fd.append('selectedCohort', editForm.selectedCohort);

      if (editingUser.userType === 'student') {
        fd.append('collegeName', editForm.collegeName.trim());
        fd.append('course', editForm.course.trim());
        fd.append('year', editForm.year.trim());
        if (editIdCardFile) {
          fd.append('idCard', editIdCardFile);
        }
      } else {
        fd.append('domain', editForm.domain.trim());
        fd.append('organization', editForm.organization.trim());
      }

      fd.append('heardFrom', editForm.heardFrom);
      if (editForm.heardFrom === 'Others') {
        fd.append('heardFromOther', editForm.heardFromOther.trim());
      }
      if (editForm.heardFrom === 'GKT Employee') {
        fd.append('referralName', editForm.referralName);
      }

      await editAdminUser(adminToken, editingUser.id || editingUser._id, fd);
      toast.success('User details updated successfully.');
      setEditingUser(null);
      setEditIdCardFile(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(`Failed to update user: ${err.message}`);
    }
  };

  const handleConfirmManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentConfirmUser || !razorpayPaymentId.trim()) return;
    try {
      const res = await manualConfirmPayment(adminToken, paymentConfirmUser.id || paymentConfirmUser._id, razorpayPaymentId.trim());
      toast.success(res.message);
      setPaymentConfirmUser(null);
      setRazorpayPaymentId('');
      fetchUsers();
    } catch (err: any) {
      toast.error(`Failed to confirm payment: ${err.message}`);
    }
  };

  const handleRejectNepalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentRejectUser || !rejectionReason.trim()) return;
    setIsRejecting(true);
    try {
      await rejectNepalPayment(adminToken, paymentRejectUser.id || paymentRejectUser._id, rejectionReason.trim());
      toast.success('Payment proof rejected successfully.');
      setPaymentRejectUser(null);
      setRejectionReason('');
      fetchUsers();
    } catch (err: any) {
      toast.error(`Failed to reject payment: ${err.message}`);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAddRegistrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fullName.trim() || !addForm.email.trim() || !addForm.selectedCohort) {
      toast.error('Please fill in all required fields (Name, Email, Selected Date).');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('fullName', addForm.fullName.trim());
      fd.append('email', addForm.email.trim().toLowerCase());
      fd.append('selectedCohort', addForm.selectedCohort);
      fd.append('paymentStatus', addForm.paymentStatus);
      if (addForm.userType) fd.append('userType', addForm.userType);
      if (addForm.phone.trim()) fd.append('phone', addForm.phone.trim());
      if (addForm.heardFrom) fd.append('heardFrom', addForm.heardFrom);
      if (addForm.heardFrom === 'Others' && addForm.heardFromOther.trim()) fd.append('heardFromOther', addForm.heardFromOther.trim());
      if (addForm.heardFrom === 'GKT Employee' && addForm.referralName) fd.append('referralName', addForm.referralName);
      if (addForm.referralCode) fd.append('referralCode', addForm.referralCode);
      if (addForm.country) fd.append('country', addForm.country);

      if (addForm.customPaymentAmount.trim() !== '') {
        const amt = parseFloat(addForm.customPaymentAmount);
        if (isNaN(amt) || amt < 0) {
          toast.error('Please enter a valid payment amount.');
          return;
        }
        fd.append('customPaymentAmount', String(amt));
      }

      if (addForm.userType === 'student') {
        if (addForm.collegeName.trim()) fd.append('collegeName', addForm.collegeName.trim());
        if (addForm.course.trim()) fd.append('course', addForm.course.trim());
        if (addForm.year.trim()) fd.append('year', addForm.year.trim());
        if (addIdCardFile) fd.append('idCard', addIdCardFile);
      } else if (addForm.userType === 'working') {
        if (addForm.domain.trim()) fd.append('domain', addForm.domain.trim());
        if (addForm.organization.trim()) fd.append('organization', addForm.organization.trim());
      }

      await createAdminUser(adminToken, fd);
      toast.success('Registrant created successfully!');
      setIsAddModalOpen(false);
      
      setAddForm({
        fullName: '',
        email: '',
        phone: '',
        userType: 'student',
        collegeName: '',
        course: '',
        year: '',
        domain: '',
        organization: '',
        heardFrom: '',
        heardFromOther: '',
        referralName: '',
        referralCode: '',
        selectedCohort: cohortsList[0] || 'June 13 & 14, 2026',
        paymentStatus: 'pending',
        customPaymentAmount: '',
        country: 'India'
      });
      setAddIdCardFile(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create registrant.');
    }
  };

  const downloadCSVTemplate = () => {
    const headers = [
      'fullName',
      'email',
      'phone',
      'userType',
      'collegeName',
      'course',
      'year',
      'domain',
      'organization',
      'heardFrom',
      'referralCode'
    ];
    const sampleRows = [
      ['John Doe', 'johndoe@example.com', '9876543210', 'student', 'ABC College', 'B.Tech', '3rd Year', '', '', 'Social Media', ''],
      ['Jane Smith', 'janesmith@example.com', '9876543211', 'working', '', '', '', 'Software Engineering', 'XYZ Corp', 'Others', '']
    ];
    const csvContent = [
      headers.join(','),
      ...sampleRows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'registrant_bulk_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUploadCSV = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      toast.error('Please select a CSV file.');
      return;
    }
    setBulkUploading(true);
    setBulkResult(null);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedUsers = results.data.map((row: any) => {
          const keys = Object.keys(row);
          const getVal = (possibleKeys: string[]) => {
            const key = keys.find(k => possibleKeys.includes(k.toLowerCase().trim()));
            return key ? (row[key] || '').toString().trim() : '';
          };

          const fullName = getVal(['fullname', 'name', 'full name']);
          const email = getVal(['email', 'email address']);
          const phone = getVal(['phone', 'phone number', 'phoneno', 'mobile', 'mobile number']);
          const userTypeVal = getVal(['usertype', 'type', 'user type']).toLowerCase();
          
          let userType = '';
          if (userTypeVal.includes('student')) {
            userType = 'student';
          } else if (userTypeVal.includes('working') || userTypeVal.includes('professional')) {
            userType = 'working';
          }

          return {
            fullName,
            email,
            phone,
            userType,
            collegeName: getVal(['collegename', 'college', 'college name']) || undefined,
            course: getVal(['course', 'branch', 'stream']) || undefined,
            year: getVal(['year', 'semester', 'year of study']) || undefined,
            domain: getVal(['domain', 'area of interest', 'specialization']) || undefined,
            organization: getVal(['organization', 'company', 'org']) || undefined,
            heardFrom: getVal(['heardfrom', 'heard from', 'source']) || undefined,
            referralCode: getVal(['referralcode', 'referral code', 'salesperson']) || undefined,
          };
        });

        // Simple validation
        const invalid = parsedUsers.filter((u: any) => !u.fullName || !u.email || !u.phone || !u.userType);
        if (invalid.length > 0) {
          toast.error(`Invalid rows found: ${invalid.length} row(s) missing mandatory fields (Name, Email, Phone, or UserType).`);
          setBulkUploading(false);
          return;
        }

        try {
          const res = await bulkRegister(adminToken, parsedUsers);
          setBulkResult(res);
          toast.success(res.message || 'Bulk upload complete!');
          fetchUsers();
        } catch (err: any) {
          toast.error(err.message || 'Bulk upload failed.');
        } finally {
          setBulkUploading(false);
        }
      },
      error: (error) => {
        toast.error('Failed to parse CSV: ' + error.message);
        setBulkUploading(false);
      }
    });
  };

  const handleRegisterAllZoom = async () => {
    if (isZoomRegistering) return;
    const confirm = window.confirm(
      "Are you sure you want to register all paid/confirmed attendees who are not yet registered in Zoom? This will trigger Zoom API registration and send them their access links by email."
    );
    if (!confirm) return;

    setIsZoomRegistering(true);
    const toastId = toast.loading("Registering attendees in Zoom...");
    try {
      const res = await registerAllZoomAttendees(adminToken);
      toast.success(res.message, { id: toastId });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to batch register zoom attendees", { id: toastId });
    } finally {
      setIsZoomRegistering(false);
    }
  };

  const toggleRow = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2 className="admin-page-title">User Management</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            onClick={handleRegisterAllZoom}
            disabled={isZoomRegistering}
            style={{ backgroundColor: '#2563eb', borderColor: '#2563eb', opacity: isZoomRegistering ? 0.7 : 1 }}
          >
            {isZoomRegistering ? "Registering..." : "Register Attendees in Zoom"}
          </button>
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
            Add Registrant
          </button>
          <button className="btn-primary" onClick={() => setIsBulkModalOpen(true)} style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}>
            Bulk Upload CSV
          </button>

          <button className="btn-primary" onClick={handleExportCSV}>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{
          background: '#fff', border: '2px solid rgba(59, 139, 212, 0.15)', borderRadius: 10,
          padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1
        }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0F172A' }}>{totalRegistrants}</span>
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Registrants</span>
        </div>
        <div style={{
          background: '#fff', border: '2px solid rgba(59, 139, 212, 0.15)', borderRadius: 10,
          padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1
        }}>
          <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#0F172A' }}>{total}</span>
          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Filtered Total</span>
        </div>
      </div>

      <div className="admin-controls" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="admin-search-input"
          style={{ minWidth: '150px', padding: '0.5rem 0.8rem', fontSize: '0.9rem', height: '38px', boxSizing: 'border-box' }}
        />
        <select value={filterPaid} onChange={e => setFilterPaid(e.target.value)} className="admin-select" style={{ height: '38px', padding: '0 2rem 0 0.8rem', fontSize: '0.9rem', backgroundPosition: 'right 0.6rem center', boxSizing: 'border-box' }}>
          <option value="all">All Payments</option>
          <option value="paid">Paid Only</option>
          <option value="unpaid">Unpaid Only</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="admin-select" style={{ height: '38px', padding: '0 2rem 0 0.8rem', fontSize: '0.9rem', backgroundPosition: 'right 0.6rem center', boxSizing: 'border-box' }}>
          <option value="all">All Types</option>
          <option value="student">Students</option>
          <option value="working">Professionals</option>
        </select>
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="admin-select" style={{ height: '38px', padding: '0 2rem 0 0.8rem', fontSize: '0.9rem', backgroundPosition: 'right 0.6rem center', boxSizing: 'border-box' }}>
          <option value="all">All Countries</option>
          <option value="India">India</option>
          <option value="Nepal">Nepal</option>
        </select>
        {/* Source Dropdown with Checkboxes */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
            className="admin-select"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minWidth: '140px',
              textAlign: 'left',
              cursor: 'pointer',
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.5rem 0.8rem',
              fontSize: '0.9rem',
              height: '38px',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
              {filterSources.length === 0
                ? "All Sources"
                : filterSources.length === 1
                ? (filterSources[0] === 'social media' ? 'Social Media' : filterSources[0] === 'newspaper' ? 'Newspaper' : filterSources[0] === 'others' ? 'Others' : filterSources[0])
                : `${filterSources.length} Selected`}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#64748b' }}>▼</span>
          </button>
          
          {isSourceDropdownOpen && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999
                }}
                onClick={() => setIsSourceDropdownOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 1000,
                  minWidth: '220px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                  padding: '0.5rem',
                  marginTop: '4px'
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.4rem 0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    borderBottom: '1px solid #f1f5f9',
                    marginBottom: '0.25rem',
                    color: '#0f172a'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filterSources.length === 0}
                    onChange={() => setFilterSources([])}
                    style={{ marginRight: '0.5rem' }}
                  />
                  All Sources
                </label>
                
                {[
                  { label: 'Social Media', value: 'social media' },
                  { label: 'Newspaper', value: 'newspaper' },
                  ...referralsList.map(r => ({ label: r.label, value: r.label })),
                  { label: 'Others', value: 'others' }
                ].map(opt => {
                  const isChecked = filterSources.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.4rem 0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        userSelect: 'none',
                        color: '#0f172a'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setFilterSources(filterSources.filter(s => s !== opt.value));
                          } else {
                            setFilterSources([...filterSources, opt.value]);
                          }
                        }}
                        style={{ marginRight: '0.5rem' }}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <select value={filterCohort} onChange={e => setFilterCohort(e.target.value)} className="admin-select" style={{ height: '38px', padding: '0 2rem 0 0.8rem', fontSize: '0.9rem', backgroundPosition: 'right 0.6rem center', boxSizing: 'border-box' }}>
          <option value="all">All Dates</option>
          {cohortsList.map(c => {
            const completed = isCohortCompleted(c);
            return (
              <option key={c} value={c}>
                {c} {completed ? ' (Completed)' : ''}
              </option>
            );
          })}
        </select>
        <select value={filterFeedback} onChange={e => setFilterFeedback(e.target.value)} className="admin-select" style={{ height: '38px', padding: '0 2rem 0 0.8rem', fontSize: '0.9rem', backgroundPosition: 'right 0.6rem center', boxSizing: 'border-box' }}>
          <option value="all">All Feedback</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>

      </div>

      {loading ? (
        <div className="admin-loading">Loading users...</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'center', width: '50px' }}>S.No.</th>
                <th>Name</th>
                <th>Email</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Phone</th>
                <th style={{ textAlign: 'center' }}>Type</th>
                <th>College / Organization</th>
                <th style={{ textAlign: 'center' }}>Payment</th>
                <th style={{ textAlign: 'center' }}>Heard From</th>
                <th style={{ textAlign: 'center' }}>Feedback</th>
                <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any, index: number) => (
                <React.Fragment key={user.id || user._id || `user-row-${index}`}>
                  <tr style={{ cursor: 'pointer', opacity: user.isActive ? 1 : 0.55 }} onClick={() => toggleRow(user.id || user._id)}>
                    <td className="admin-supporting-info" style={{ textAlign: 'center', fontWeight: 600 }}>
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="admin-row-name">{user.fullName}</td>
                    <td className="admin-supporting-info">{user.email}</td>
                    <td className="admin-supporting-info" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{user.phone}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="admin-badge" style={{
                        background: user.userType === 'student' ? 'rgba(59,139,212,0.08)' : 'rgba(71,85,105,0.08)',
                        color: user.userType === 'student' ? '#3B8BD4' : '#475569',
                        border: `1px solid ${user.userType === 'student' ? 'rgba(59,139,212,0.2)' : 'rgba(71,85,105,0.2)'}`,
                      }}>
                        {user.userType === 'student' ? 'Student' : 'Professional'}
                      </span>
                    </td>
                    <td className="admin-supporting-info">
                      {user.userType === 'student' ? user.collegeName : user.organization}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`admin-badge ${user.isPaid ? 'success' : 'warning'}`}>
                        {user.isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                    <td className="admin-supporting-info" style={{ textAlign: 'center' }}>
                      {(!user.referralCode || user.referralCode === '-')
                        ? (user.heardFrom && user.heardFrom !== '-' ? user.heardFrom : '-')
                        : user.referralCode}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`admin-badge ${user.isFeedbackSubmitted ? 'success' : 'secondary'}`} style={{
                        background: user.isFeedbackSubmitted ? 'rgba(34,197,94,0.08)' : 'rgba(100,116,139,0.08)',
                        color: user.isFeedbackSubmitted ? '#16a34a' : '#64748b',
                        border: `1px solid ${user.isFeedbackSubmitted ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)'}`,
                      }}>
                        {user.isFeedbackSubmitted ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="admin-supporting-info" style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{user.selectedCohort || '-'}</td>
                  </tr>

                  {expandedId === (user.id || user._id) && (
                    <tr>
                      <td colSpan={10} style={{ background: '#F0F4F8', padding: '1.2rem 2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: user.userType === 'student' && user.idCardPath ? '1fr 1fr 180px' : '1fr 1fr', gap: '1.5rem' }}>
                          
                          {/* Profile completion check */}
                          {!user.isProfileComplete && (
                            <div style={{
                              gridColumn: '1 / -1',
                              background: '#fff',
                              border: '1.5px solid rgba(59, 139, 212, 0.2)',
                              borderRadius: '8px',
                              padding: '1rem',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.75rem',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                            }}>
                              <div style={{ color: '#3B8BD4', display: 'flex', alignItems: 'center', height: '20px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                  <line x1="12" y1="9" x2="12" y2="13"/>
                                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                                </svg>
                              </div>
                              <div>
                                <h4 style={{ margin: '0 0 0.25rem 0', color: '#0F172A', fontSize: '0.92rem', fontWeight: 700 }}>Incomplete Profile Details</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', lineHeight: '1.4' }}>
                                  The registrant has not completed their profile yet. Missing fields: <strong style={{ color: '#0F172A' }}>{getMissingFields(user).join(', ') || 'None'}</strong>.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Personal */}
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Personal Details
                            </div>
                            <DetailRow label="Full Name" value={user.fullName} />
                            <DetailRow label="Email" value={user.email} />
                            <DetailRow label="Phone" value={user.phone} />
                            <DetailRow label="User Type" value={user.userType === 'student' ? 'Student' : 'Working Professional'} />
                            <DetailRow label="Registered On" value={new Date(user.createdAt).toLocaleString()} />
                            <DetailRow 
                              label="Heard From" 
                              value={
                                (user.heardFrom === 'Referral' || (user.heardFrom && user.heardFrom.startsWith('GKT Employee')) || user.salesperson)
                                  ? `GKT Employee${user.salesperson ? ` - ${user.salesperson}` : ''}`
                                  : user.heardFrom
                              } 
                            />
                            <DetailRow label="Selected Date" value={user.selectedCohort || '-'} />
                            
                            {/* Controls Panel */}
                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                className="btn-primary"
                                onClick={(e) => { e.stopPropagation(); handleOpenEditModal(user); }}
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                Edit Profile
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setStatusConfirmUser(user); }}
                                style={{
                                  padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 6,
                                  background: user.isActive ? '#fee2e2' : '#dcfce7',
                                  border: `1px solid ${user.isActive ? '#fca5a5' : '#bbf7d0'}`,
                                  color: user.isActive ? '#b91c1c' : '#15803d'
                                }}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleWaitlistStatus(user.id || user._id); }}
                                style={{
                                  padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer', borderRadius: 6,
                                  background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309'
                                }}
                              >
                                {user.isWaitlisted ? 'Remove from Waitlist' : 'Add to Waitlist'}
                              </button>

                            </div>
                          </div>

                          {/* Academic/Professional + Payment */}
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              {user.userType === 'student' ? 'Academic Details' : 'Professional Details'}
                            </div>
                            {user.userType === 'student' ? (
                              <>
                                <DetailRow label="College" value={user.collegeName} />
                                <DetailRow label="Course" value={user.course} />
                                <DetailRow label="Year" value={user.year} />
                              </>
                            ) : (
                              <>
                                <DetailRow label="Domain" value={user.domain} />
                                <DetailRow label="Organization" value={user.organization} />
                              </>
                            )}

                            <div style={{ marginTop: '0.8rem' }}>
                              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Payment
                              </div>
                              <DetailRow label="Status" value={
                                <span className={`admin-badge ${user.isPaid ? 'success' : 'warning'}`}>
                                  {user.isPaid ? 'Paid' : 'Pending'}
                                </span>
                              } />
                              
                              <DetailRow label="Country" value={user.country || 'India'} />
                              {user.certificatePath && (
                                <DetailRow label="Certificate" value={
                                  <a href={`${API_BASE}${user.certificatePath}`} target="_blank" rel="noopener noreferrer" style={{ color: '#8B5CF6', fontWeight: 600, textDecoration: 'underline' }}>
                                    View Certificate (JPG)
                                  </a>
                                } />
                              )}
                              
                              {user.paymentMethod === 'nepal_upi' && (
                                <>
                                  <DetailRow label="Payment Method" value="Nepal UPI" />
                                  <DetailRow label="Submitted UTR" value={user.nepalUpiTxnRef || '—'} />
                                </>
                              )}

                              {user.isPaid && user.paymentId && user.paymentId !== '-' && (
                                <DetailRow label="Payment ID" value={
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{user.paymentId}</span>
                                } />
                              )}

                              {!user.isPaid && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    className="btn-primary"
                                    onClick={(e) => { e.stopPropagation(); setPaymentConfirmUser(user); }}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                                  >
                                    {user.paymentMethod === 'nepal_upi' ? 'Verify & Confirm' : 'Manually Confirm Payment'}
                                  </button>
                                  {user.paymentMethod === 'nepal_upi' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setPaymentRejectUser(user); }}
                                      style={{
                                        padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: 6, cursor: 'pointer',
                                        background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', fontWeight: 600
                                      }}
                                    >
                                      Reject Proof
                                    </button>
                                  )}
                                </div>
                              )}

                              {user.isPaid && (
                                <>
                                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(59, 139, 212, 0.15)', alignItems: 'center' }}>
                                    <span style={{ color: '#64748B', minWidth: 130, fontWeight: 600 }}>Zoom Status</span>
                                    <span className={`admin-badge ${user.zoomStatus === 'success' ? 'success' : user.zoomStatus === 'failed' ? 'danger' : 'warning'}`} style={{ backgroundColor: user.zoomStatus === 'failed' ? '#fee2e2' : undefined, color: user.zoomStatus === 'failed' ? '#dc2626' : undefined }}>
                                      {user.zoomStatus}
                                    </span>
                                    {user.zoomStatus === 'failed' && (
                                      <button onClick={() => handleRetry(user.id || user._id, 'zoom')} style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.5rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626' }}>Retry</button>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.88rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(59, 139, 212, 0.15)', alignItems: 'center' }}>
                                    <span style={{ color: '#64748B', minWidth: 130, fontWeight: 600 }}>Email Status</span>
                                    <span className={`admin-badge ${user.emailStatus === 'success' ? 'success' : user.emailStatus === 'failed' ? 'danger' : 'warning'}`} style={{ backgroundColor: user.emailStatus === 'failed' ? '#fee2e2' : undefined, color: user.emailStatus === 'failed' ? '#dc2626' : undefined }}>
                                      {user.emailStatus}
                                    </span>
                                    {user.emailStatus === 'failed' && (
                                      <button onClick={() => handleRetry(user.id || user._id, 'email')} style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.2rem 0.5rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #dc2626', background: '#fff', color: '#dc2626' }}>Retry</button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {user.isPaid && (
                              <div style={{ marginTop: '1rem' }}>
                                <button
                                  className="btn-primary"
                                  onClick={(e) => { e.stopPropagation(); setCertificateUser(user); }}
                                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                >
                                  Generate Certificate
                                </button>
                              </div>
                            )}
                          </div>

                          {/* ID Card */}
                          {user.userType === 'student' && (
                            <div>
                              <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.6rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                ID Card
                              </div>
                              <IdCardLink path={user.idCardPath} />
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {users.length === 0 && (
                <tr key="no-users-row">
                  <td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: '#8C7B6B' }}>
                    No users found matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid rgba(59, 139, 212, 0.2)', backgroundColor: '#F0F4F8' }}>
              <div style={{ fontSize: '0.88rem', color: '#64748B' }}>
                Showing page <span style={{ fontWeight: 600, color: '#0F172A' }}>{page}</span> of <span style={{ fontWeight: 600, color: '#0F172A' }}>{totalPages}</span> ({total} total)
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(59, 139, 212, 0.2)', backgroundColor: page === 1 ? '#E2E8F0' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', color: '#64748B' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(59, 139, 212, 0.2)', backgroundColor: page === totalPages ? '#E2E8F0' : '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: '#64748B' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', color: '#3B2F2F' }}>Edit User Details</h3>
            <form onSubmit={handleSaveUserEdit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  required
                />
              </div>

              {editingUser.userType === 'student' ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>College Name</label>
                    <input
                      type="text"
                      value={editForm.collegeName}
                      onChange={e => setEditForm({ ...editForm, collegeName: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Course</label>
                    <input
                      type="text"
                      value={editForm.course}
                      onChange={e => setEditForm({ ...editForm, course: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Year</label>
                    <select
                      value={editForm.year}
                      onChange={e => setEditForm({ ...editForm, year: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                    >
                      <option value="">Select Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>College ID Card (PDF)</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={e => setEditIdCardFile(e.target.files?.[0] || null)}
                      style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Domain</label>
                    <select
                      value={editForm.domain}
                      onChange={e => setEditForm({ ...editForm, domain: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                    >
                      <option value="">Select domain</option>
                      {DOMAIN_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Organization</label>
                    <input
                      type="text"
                      value={editForm.organization}
                      onChange={e => setEditForm({ ...editForm, organization: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>How did you hear about this?</label>
                <select
                  value={editForm.heardFrom}
                  onChange={e => setEditForm({ ...editForm, heardFrom: e.target.value, heardFromOther: '', referralName: '' })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                >
                  <option value="">Select an option</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Newspaper">Newspaper</option>
                  <option value="GKT Employee">GKT Employee</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {editForm.heardFrom === 'Others' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Please Specify *</label>
                  <input
                    type="text"
                    value={editForm.heardFromOther}
                    onChange={e => setEditForm({ ...editForm, heardFromOther: e.target.value })}
                    placeholder="e.g. Friend, Professor, etc."
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    required
                  />
                </div>
              )}

              {editForm.heardFrom === 'GKT Employee' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Referral *</label>
                  <select
                    value={editForm.referralName}
                    onChange={e => setEditForm({ ...editForm, referralName: e.target.value })}
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                    required
                  >
                    <option value="">Select referral</option>
                    {referralsList.map((r: any) => (
                      <option key={r.code} value={r.label}>
                        {r.label}
                      </option>
                    ))}
                    {editForm.referralName && !referralsList.some((r: any) => r.label === editForm.referralName) && (
                      <option value={editForm.referralName}>
                        {editForm.referralName}
                      </option>
                    )}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Country</label>
                <select
                  value={editForm.country}
                  onChange={e => setEditForm({ ...editForm, country: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                >
                  <option value="">-- Select Country --</option>
                  <option value="India">India</option>
                  <option value="Nepal">Nepal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Selected Date *</label>
                <select
                  value={editForm.selectedCohort}
                  onChange={e => setEditForm({ ...editForm, selectedCohort: e.target.value })}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                  required
                >
                  <option value="">Select Date</option>
                  {cohortsList.map(c => {
                    const completed = isCohortCompleted(c);
                    return (
                      <option key={c} value={c}>
                        {c} {completed ? ' (Completed)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>




              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', gridColumn: 'span 2', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Status Confirmation Modal ── */}
      {statusConfirmUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#3B2F2F' }}>Confirm {statusConfirmUser.isActive ? 'Deactivation' : 'Activation'}</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginBottom: '1.5rem' }}>
              Are you sure you want to {statusConfirmUser.isActive ? 'deactivate' : 'activate'} <strong>{statusConfirmUser.fullName}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleToggleStatusConfirm}
                className="btn-primary" 
                style={{ padding: '0.5rem 1.5rem', backgroundColor: statusConfirmUser.isActive ? '#dc2626' : '#16a34a', borderColor: statusConfirmUser.isActive ? '#dc2626' : '#16a34a' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Payment Confirmation Modal ── */}
      {paymentConfirmUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#3B2F2F' }}>Confirm Payment Manually</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginBottom: '1.2rem' }}>
              Confirm payment for <strong>{paymentConfirmUser.fullName}</strong>. {paymentConfirmUser.paymentMethod === 'nepal_upi' ? 'Enter the UTR reference code to match and verify payment.' : 'A Razorpay Payment ID is required.'}
            </p>
            <form onSubmit={handleConfirmManualPayment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>
                  {paymentConfirmUser.paymentMethod === 'nepal_upi' ? 'Transaction ID (UTR) to Match' : 'Razorpay Payment ID'}
                </label>
                <input
                  type="text"
                  value={razorpayPaymentId}
                  onChange={e => setRazorpayPaymentId(e.target.value)}
                  placeholder={paymentConfirmUser.paymentMethod === 'nepal_upi' ? 'Enter UTR' : 'pay_xyz123abc'}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setPaymentConfirmUser(null); setRazorpayPaymentId(''); }}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem', backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Nepal Payment Rejection Modal ── */}
      {paymentRejectUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#b91c1c' }}>Reject Nepal Payment Proof</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginBottom: '1.2rem' }}>
              Reject the payment proof for <strong>{paymentRejectUser.fullName}</strong>. An email notification with the reason will be sent to the registrant.
            </p>
            <form onSubmit={handleRejectNepalPayment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Reason for Rejection *</label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. The UTR number does not match any transaction in our bank statement."
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, minHeight: '80px', fontFamily: 'inherit' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => { setPaymentRejectUser(null); setRejectionReason(''); }}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem', backgroundColor: '#dc2626', borderColor: '#dc2626' }} disabled={isRejecting}>
                  {isRejecting ? 'Rejecting...' : 'Reject Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {certificateUser && (
        <CertificateGenerator
          user={certificateUser}
          onClose={() => setCertificateUser(null)}
        />
      )}

      {/* ── Add Registrant Modal ── */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '95%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#3B2F2F' }}>Add New Registrant</h3>
            <p style={{ fontSize: '0.85rem', color: '#8C7B6B', marginBottom: '1.5rem' }}>
              Create an account manually. Enter details, assign preferred date, set custom payment amount, and track salespeople.
            </p>
            <form onSubmit={handleAddRegistrantSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Full Name *</label>
                  <input
                    type="text"
                    value={addForm.fullName}
                    onChange={e => setAddForm({ ...addForm, fullName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Email Address *</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="e.g. rahul@gmail.com"
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Phone Number</label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Account Type *</label>
                  <select
                    value={addForm.userType}
                    onChange={e => setAddForm({ ...addForm, userType: e.target.value })}
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="working">Working Professional / Others</option>
                  </select>
                </div>

                {addForm.userType === 'student' ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>College Name</label>
                      <input
                        type="text"
                        value={addForm.collegeName}
                        onChange={e => setAddForm({ ...addForm, collegeName: e.target.value })}
                        placeholder="e.g. IIT Madras"
                        style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Course</label>
                      <input
                        type="text"
                        value={addForm.course}
                        onChange={e => setAddForm({ ...addForm, course: e.target.value })}
                        placeholder="e.g. B.Tech Computer Science"
                        style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Year of Study</label>
                      <select
                        value={addForm.year}
                        onChange={e => setAddForm({ ...addForm, year: e.target.value })}
                        style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                      >
                        <option value="">Select Year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="5th Year">5th Year</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>College ID Card (PDF)</label>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={e => setAddIdCardFile(e.target.files?.[0] || null)}
                        style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Domain / Industry</label>
                      <select
                        value={addForm.domain}
                        onChange={e => setAddForm({ ...addForm, domain: e.target.value })}
                        style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                      >
                        <option value="">Select domain</option>
                        {DOMAIN_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Organization</label>
                      <input
                        type="text"
                        value={addForm.organization}
                        onChange={e => setAddForm({ ...addForm, organization: e.target.value })}
                        placeholder="e.g. Google Inc"
                        style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Country *</label>
                  <select
                    value={addForm.country}
                    onChange={e => setAddForm({ ...addForm, country: e.target.value })}
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                    required
                  >
                    <option value="India">India</option>
                    <option value="Nepal">Nepal</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Selected Date (Cohort) *</label>
                  <select
                    value={addForm.selectedCohort}
                    onChange={e => setAddForm({ ...addForm, selectedCohort: e.target.value })}
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                    required
                  >
                    <option value="">Select Cohort</option>
                    {cohortsList.map(c => {
                      const completed = isCohortCompleted(c);
                      return (
                        <option key={c} value={c}>
                          {c} {completed ? ' (Completed)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>



                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Heard From</label>
                  <select
                    value={addForm.heardFrom}
                    onChange={e => setAddForm({ ...addForm, heardFrom: e.target.value, heardFromOther: '', referralName: '' })}
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                  >
                    <option value="">Select an option</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Newspaper">Newspaper</option>
                    <option value="GKT Employee">GKT Employee</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                {addForm.heardFrom === 'Others' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Please Specify *</label>
                    <input
                      type="text"
                      value={addForm.heardFromOther}
                      onChange={e => setAddForm({ ...addForm, heardFromOther: e.target.value })}
                      placeholder="e.g. Friend, Professor, etc."
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                      required
                    />
                  </div>
                )}

                {addForm.heardFrom === 'GKT Employee' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Referral *</label>
                    <select
                      value={addForm.referralName}
                      onChange={e => setAddForm({ ...addForm, referralName: e.target.value })}
                      style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                      required
                    >
                      <option value="">Select referral</option>
                      {referralsList.filter((r: any) => r.isActive !== false).map((r: any) => (
                        <option key={r.code} value={r.label}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Payment Status</label>
                  <select
                    value={addForm.paymentStatus}
                    onChange={e => setAddForm({ ...addForm, paymentStatus: e.target.value })}
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fff' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed (Paid)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Custom Payment Amount (₹)</label>
                  <input
                    type="number"
                    value={addForm.customPaymentAmount}
                    onChange={e => setAddForm({ ...addForm, customPaymentAmount: e.target.value })}
                    placeholder="Default Event Price"
                    min="0"
                    style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setAddForm({
                      fullName: '',
                      email: '',
                      phone: '',
                      userType: 'student',
                      collegeName: '',
                      course: '',
                      year: '',
                      domain: '',
                      organization: '',
                      heardFrom: '',
                      heardFromOther: '',
                      referralName: '',
                      referralCode: '',
                      selectedCohort: cohortsList[0] || 'June 13 & 14, 2026',
                      paymentStatus: 'pending',
                      customPaymentAmount: ''
                    });
                    setAddIdCardFile(null);
                  }}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1.5rem', backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
                  Create Registrant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Bulk Upload CSV Modal ── */}
      {isBulkModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2D9CC', padding: '2rem', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#3B2F2F' }}>Bulk Registration (CSV)</h3>
            <p style={{ fontSize: '0.82rem', color: '#8C7B6B', marginBottom: '1.2rem', lineHeight: '1.4' }}>
              Upload a CSV file containing multiple registrants. New registrants will automatically be assigned to the current Active Cohort.
            </p>
            
            <button
              type="button"
              className="btn-primary"
              onClick={downloadCSVTemplate}
              style={{
                backgroundColor: '#475569',
                borderColor: '#475569',
                marginBottom: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                padding: '0.45rem 1rem',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              📥 Download CSV Template
            </button>
            
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.8rem', marginBottom: '1.2rem', fontSize: '0.78rem', color: '#475569' }}>
              <strong style={{ color: '#0f172a' }}>Expected CSV Column Headers:</strong>
              <div style={{ fontFamily: 'monospace', marginTop: '0.4rem', background: '#fff', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: 4, overflowX: 'auto' }}>
                fullName,email,phone,userType,collegeName,course,year,domain,organization,heardFrom,referralCode
              </div>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', marginBlockEnd: 0 }}>
                <li><code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 2 }}>userType</code> must be <code style={{ color: '#0369a1' }}>student</code> or <code style={{ color: '#0369a1' }}>working</code>.</li>
                <li><code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 2 }}>fullName</code>, <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 2 }}>email</code>, <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 2 }}>phone</code> and <code style={{ background: '#e2e8f0', padding: '1px 3px', borderRadius: 2 }}>userType</code> are strictly required.</li>
              </ul>
            </div>

            <form onSubmit={handleBulkUploadCSV}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#8C7B6B' }}>Select CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => setCsvFile(e.target.files ? e.target.files[0] : null)}
                  style={{ padding: '0.5rem', border: '1px solid #E2D9CC', borderRadius: 6, background: '#fcfaf8' }}
                  required
                />
              </div>

              {bulkResult && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: '0.85rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontWeight: 700 }}>Upload Status</h4>
                  <p style={{ margin: '0 0 0.25rem 0' }}>Success: <strong style={{ color: '#16a34a' }}>{bulkResult.successCount}</strong></p>
                  <p style={{ margin: '0 0 0.5rem 0' }}>Failed: <strong style={{ color: '#dc2626' }}>{bulkResult.failCount}</strong></p>
                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: '0.75rem', color: '#b91c1c', background: '#fef2f2', padding: '0.5rem', borderRadius: 4, border: '1px solid #fca5a5' }}>
                      {bulkResult.errors.map((e: any, i: number) => (
                        <div key={i}><strong>{e.email}</strong>: {e.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkModalOpen(false);
                    setCsvFile(null);
                    setBulkResult(null);
                  }}
                  style={{ padding: '0.5rem 1rem', border: '1px solid #C8BDB0', borderRadius: 6, background: '#F4EFEA', cursor: 'pointer', color: '#3B2F2F', fontWeight: 600 }}
                  disabled={bulkUploading}
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ padding: '0.5rem 1.5rem', backgroundColor: '#0284c7', borderColor: '#0284c7' }} 
                  disabled={bulkUploading || !csvFile}
                >
                  {bulkUploading ? 'Uploading...' : 'Parse & Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
