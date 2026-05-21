const AuditLog = require('../models/AuditLog');
const Admin = require('../models/Admin');

/**
 * Middleware to automatically log all mutating admin actions.
 * Extracts details from the request and logs it after a successful response.
 */
module.exports = async (req, res, next) => {
  // Only log mutating methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Hook into the finish event of the response
  res.on('finish', async () => {
    // Only log if the request was successful (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        let adminName = 'System';
        let adminEmail = 'system@auto';

        // Get admin details if adminId is present
        if (req.adminId) {
          const admin = await Admin.findById(req.adminId);
          if (admin) {
            adminName = admin.fullName;
            adminEmail = admin.email;
          }
        }

        // Determine action and target from the URL and Method
        let action = 'UNKNOWN_ACTION';
        let target = req.originalUrl;
        let details = req.body;

        const path = req.path;

        if (req.method === 'DELETE' && path.startsWith('/users/')) {
          action = 'DELETE_USER';
          target = path.split('/')[2];
        } else if (req.method === 'POST' && path === '/send-email') {
          action = 'SEND_BULK_EMAIL';
          target = req.body.recipientType;
          details = { subject: req.body.subject, customEmailsCount: req.body.customEmails?.length };
        } else if (req.method === 'POST' && path.endsWith('/retry-zoom')) {
          action = 'RETRY_ZOOM';
          target = path.split('/')[2];
        } else if (req.method === 'POST' && path.endsWith('/retry-email')) {
          action = 'RETRY_EMAIL';
          target = path.split('/')[2];
        } else if (req.method === 'POST' && path.endsWith('/confirm-payment')) {
          action = 'CONFIRM_PAYMENT';
          target = path.split('/')[2];
        } else if (req.method === 'PATCH' && path.endsWith('/status')) {
          action = 'TOGGLE_USER_STATUS';
          target = path.split('/')[2];
        } else if (req.method === 'PATCH' && path.endsWith('/waitlist')) {
          action = 'TOGGLE_USER_WAITLIST';
          target = path.split('/')[2];
        } else if (req.method === 'PUT' && path.includes('/users/')) {
          action = 'UPDATE_USER';
          target = path.split('/')[2];
        } else if (req.method === 'POST' && path === '/settings/referrals') {
          action = 'ADD_REFERRAL';
          target = req.body.code;
        } else if (req.method === 'PUT' && path.includes('/settings/referrals/') && path.endsWith('/label')) {
          action = 'UPDATE_REFERRAL_LABEL';
          target = path.split('/')[3] || req.body.label;
        } else if (req.method === 'PATCH' && path.includes('/settings/referrals/')) {
          action = 'TOGGLE_REFERRAL';
          target = path.split('/').pop();
        } else if (req.method === 'DELETE' && path.includes('/settings/referrals/')) {
          action = 'DELETE_REFERRAL';
          target = path.split('/').pop();
        } else if (req.method === 'PATCH' && path === '/settings/registration-cap') {
          action = 'UPDATE_REGISTRATION_CAP';
          target = 'System Settings';
        } else if (req.method === 'PATCH' && path === '/settings/maintenance') {
          action = 'TOGGLE_MAINTENANCE';
          target = 'System Settings';
        } else if (req.method === 'PATCH' && path === '/settings/feedback') {
          action = 'TOGGLE_FEEDBACK';
          target = 'System Settings';
        } else if (req.method === 'POST' && path === '/users') {
          action = 'CREATE_REGISTRANT';
          target = req.body.email;
          details = { fullName: req.body.fullName, userType: req.body.userType };
        } else if (req.method === 'POST' && path === '/') {
          action = 'CREATE_ADMIN';
          target = req.body.email;
          details = { fullName: req.body.fullName };
        } else if (req.method === 'POST' && path === '/login') {
          action = 'LOGIN';
          target = req.body.email;
          details = {};
        }

        // Allow route handlers to provide explicit overrides
        if (res.locals.auditTarget) target = res.locals.auditTarget;
        if (res.locals.auditDetails) details = res.locals.auditDetails;

        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Create log entry
        await AuditLog.create({
          adminId: req.adminId || null,
          adminName,
          adminEmail,
          action,
          target,
          details,
          ipAddress,
          userAgent
        });
      } catch (err) {
        console.error('Failed to create audit log:', err);
      }
    }
  });

  next();
};
