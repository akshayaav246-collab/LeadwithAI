const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    adminName: { type: String },
    adminEmail: { type: String },
    action: { type: String, required: true },
    target: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true } // Automatically manages createdAt and updatedAt
);

module.exports = mongoose.model('AuditLog', auditLogSchema, 'audit_logs');
