const mongoose = require("mongoose");

// Remarks Sub-schema
const remarkSchema = new mongoose.Schema({
  text: { type: String, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  addedAt: { type: Date, default: Date.now }
});

// ✅ Document Sub-schema - updated enum
const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      // General Documents
      "aadhaarFile",
      "aadhaarBackFile",
      "panFile",
      "panBackFile",
      "passportFile",
      "voterIdFile",
      "drivingLicenseFile",
      "passportPhotoFile",

      // Address Proofs
      "utilityBillFile",
      "aadhaarAddressFile",
      "passportAddressFile",
      "rationCardFile",
      "rentAgreementFile",
      "drivingLicenseAddressFile",

      // Loan Specific Documents
      "loanApplicationFile",
      "propertyOwnershipFile",
      "saleAgreementFile",
      "titleDeedFile",
      "salarySlipFile",
      "form16File",
      "itrFile",
      "businessProofFile",
      "bankStatementFile",

      // MPEB Specific Documents
      "electricityBill",
      "sanctionLetter",
      "sitePhoto",
      "idProof",

      // Installation Specific Documents
      "completionCertificate",
      "sitePhoto_Completed",
      "installationReport",
      "sitePhoto_PreInstallation",
      "sitePhoto_Phase1",
      "sitePhoto_Phase2",
      "sitePhoto_Phase3",
      "general_Installation_Photo",

      // Accounting Specific Documents
      "invoiceDocument",
      "receiptDocument",

      // ✅ Added new enum values (as per error logs)
      "Aadhar_Front",
      "PAN_Front",
      "Passport",
      "DrivingLicense"
    ]
  },
  url: { type: String, required: true },
  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending"
  },
  reason: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploadedAt: { type: Date, default: Date.now },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date }
});

// Technician Sub-schema
const technicianSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  contactNo: { type: String, required: true },
  specialty: { type: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  addedAt: { type: Date, default: Date.now }
});

// Payment Sub-schema
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  method: {
    type: String,
    enum: ["cash", "bank_transfer", "upi", "cheque"],
    default: "bank_transfer"
  },
  status: { type: String, enum: ["advance", "partial", "full"], required: true },
  transactionId: { type: String },
  receiptUrl: { type: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  remark: { type: String },
});

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    status: {
      type: String,
      enum: [
        "new",
        "assigned_to_fieldexecutive",
        "assigned_to_loanadmin",
        "assigned_to_mpebadmin",
        "assigned_to_installationadmin", // <-- यह पहले से होगा
        "assigned_to_accounting",

        // Field Executive Statuses
        "fe_in_progress_interested",
        "fe_rescheduled_followup",
        "fe_converted",
        "fe_rejected_not_interested",
        "fe_site_visit_scheduled",
        "fe_site_visit_completed",
        "fe_quotation_sent",
        "fe_quotation_approved",
        "fe_payment_followup_pending",
        "fe_installation_verified",
        "loan_required",

        // Loan Admin Statuses
        "loan_application_started",
        "loan_docs_collected",
        "loan_docs_uploaded",
        "loan_docs_review_pending",
        "loan_docs_verified",
        "loan_docs_rejected",
        "loan_eligible_pending_approval",
        "loan_approved",
        "loan_rejected",
        "loan_emi_calculation_pending",
        "loan_emi_scheduled",
        "loan_final_approval_pending",


        // MPEB Admin Statuses
        "mpeb_application_scheduled",
        "mpeb_docs_collected",
        "mpeb_application_submitted",
        "mpeb_approved",
        "mpeb_rejected",
        "mpeb_inspection_scheduled",
        "mpeb_inspection_completed",


        // Installation Admin Statuses - <--- **ये सभी स्टेटस जोड़ें या सुनिश्चित करें कि वे मौजूद हैं**
        "installation_scheduled",
        "installation_phase_1_structure_erection_started",
        "installation_phase_1_structure_erection_completed",
        "installation_phase_2_panel_mounting_started",
        "installation_phase_2_panel_mounting_completed",
        "installation_phase_3_wiring_inverter_installation_started",
        "installation_phase_3_completed ",
        "installation_completed_final",
        "installation_completion_handover_completed",
        "installation_halted",

        // Accounting Admin Statuses - MODIFIED
        "accounting_payment_due",
        "accounting_payment_advance",
        "accounting_payment_partial",
        "accounting_payment_full",
        "accounting_commission_pending",
        "accounting_commission_paid",
        "accounting_invoice_generated",

        // Generic states
        "completed",
        "processing"
      ],
      default: "new",
    },

    nextFollowUpDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    remarks: [remarkSchema],

    enquiryDetails: {
      promoter: String,
      mobileNo: String,
      structureType: String,
      customerName: String,
      plantType: String,
      kwRequired: Number,
      account1: String,
      mpeb1: String,
      portal1: String,
      bank: String,
      totalProjectCost: Number,
      dcrInvoice: String,
      receivedAmount: Number,
      pendingAmount: Number,
      tat: String,
    },

    currentStatusDetail: {
      telecaller: { type: String, default: 'new' },
      fieldexecutive: String,
      loan_admin: String,
      mpeb_admin: String,
      installation_admin: String,
      accounting_admin: String,
    },

    statusHistory: [
      {
        status: { type: String, required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        updatedAt: { type: Date, default: Date.now },
        remark: String,
        role: {
          type: String,
          required: true,
          enum: [
            "superadmin",
            "admin",
            "telecaller",
            "fieldexecutive",
            "installation_admin",
            "mpeb_admin",
            "loan_admin",
            "accounting_admin"
          ]
        }
      }
    ],

    loanApplicationDetails: {
      requiredDocuments: { type: [String], default: ["Aadhar", "PAN", "Bank Passbook", "Photo"] },
      documents: [documentSchema],
      loanAmount: Number,
      interestRate: Number,
      tenureMonths: Number,
      monthlyEmi: Number,
      emiSchedule: [
        {
          dueDate: Date,
          amount: Number,
          status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" }
        }
      ],
      loanDisbursalDate: Date,
      loanStatusReason: String,
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvalDate: Date,
      rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rejectedAt: Date
    },

    mpebDetails: {
      documents: [documentSchema],
      applicationDate: Date,
      approvalDate: Date,
      inspectionDate: Date,
      statusReason: String,
    },

    installationDetails: {
      assignedTechnicians: [technicianSchema],
      scheduleDate: Date,
      completionDate: Date,
      statusReason: String,
      phases: [
        {
          name: { type: String, required: true },
          status: {
            type: String,
            enum: ["pending", "in-progress", "completed", "halted"],
            default: "pending"
          },
          updatedAt: { type: Date, default: Date.now },
          updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          remark: String,
          documents: [documentSchema]
        }
      ],
    },

    invoiceDetails: {
      invoiceNumber: String,
      amount: Number,
      dueDate: Date,
      status: { type: String, enum: ["generated", "sent", "paid", "overdue"], default: "generated" },
      invoiceUrl: String,
      generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      generatedAt: { type: Date, default: Date.now },
      remark: String,
    },

    paymentDetails: [paymentSchema],

    commissionTracking: {
      feCommissionAmount: { type: Number, default: 0 },
      feCommissionStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
      feCommissionLastPaidDate: Date,
      feCommissionPaidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      telecallerCommissionAmount: { type: Number, default: 0 },
      telecallerCommissionStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
      telecallerCommissionLastPaidDate: Date,
      telecallerCommissionPaidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
module.exports.documentSchema = documentSchema;