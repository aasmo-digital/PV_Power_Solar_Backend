// const mongoose = require("mongoose");

// const leadSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     email: { type: String },
//     phone: { type: String },

//     // Loan Process status
//     status: {
//       type: String,
//       enum: [
//         "new",
//         "assigned_to_loanadmin",
//         "loan_application_started",
//         "loan_docs_uploaded",
//         "loan_docs_review_pending",
//         "loan_docs_verified",
//         "loan_docs_rejected",
//         "loan_emi_calculation_pending",
//         "loan_emi_scheduled",
//         "loan_final_approval_pending",
//         "loan_approved",
//         "loan_rejected"
//       ],
//       default: "new",
//     },

//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

//     loanApplicationDetails: {
//       requiredDocuments: {
//         type: [String],
//         default: ["Aadhar", "PAN", "Bank Passbook", "Photo"]
//       },

//       // हर डॉक्यूमेंट की Entry
//       documents: [
//         {
//           type: {
//             type: String,
//             required: true,
//             enum: [
//               "Aadhar_Front",
//               "Aadhar_Back",
//               "PAN_Front",
//               "PAN_Back",
//               "Passport",
//               "VoterID",
//               "DrivingLicense",
//               "LoanApplication",
//               "PassportPhoto",
//               "PropertyOwnership",
//               "SaleAgreement",
//               "TitleDeed",
//               "UtilityBill",
//               "AadhaarAddressProof",
//               "PassportAddressProof",
//               "RationCard",
//               "RentAgreement",
//               "DrivingLicenseAddressProof",
//               "SalarySlip",
//               "Form16",
//               "ITR",
//               "BusinessProof",
//               "BankStatement"
//             ]
//           },
//           url: { type: String, required: true },
//           verificationStatus: {
//             type: String,
//             enum: ["pending", "verified", "rejected"],
//             default: "pending"
//           },
//           uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//           uploadedAt: { type: Date, default: Date.now },
//           verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },   // ✅ Added
//           verifiedAt: { type: Date }
//         }
//       ],

//       // Loan financial details
//       loanAmount: { type: Number },
//       interestRate: { type: Number },
//       tenureMonths: { type: Number },
//       monthlyEmi: { type: Number },
//       emiSchedule: [
//         {
//           dueDate: { type: Date },
//           amount: { type: Number },
//           status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" }
//         }
//       ],
//       loanDisbursalDate: { type: Date },
//       loanStatusReason: { type: String },
//       approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },   // ✅ Added
//       approvalDate: { type: Date },                                        // ✅ Added
//       rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },   // ✅ Added
//       rejectedAt: { type: Date }
//     }
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Lead", leadSchema);


const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },

    // लीड को किसे असाइन किया गया है
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null // यदि शुरुआत में कोई असाइनमेंट नहीं है
    },

    // लीड का वर्तमान स्टेटस
    status: {
      type: String,
      enum: [
        "new",                          // नई लीड
        "assigned_to_fieldexecutive",   // Field Executive को असाइन की गई
        "assigned_to_loanadmin",        // Loan Admin को असाइन की गई
        "assigned_to_installationadmin",// Installation Admin को असाइन की गई
        "assigned_to_mpebadmin",        // MPEB Admin को असाइन की गई
        "assigned_to_accounting",       // Accounting Admin को असाइन की गई

        // Loan Process Statuses
        "loan_application_started",     // लोन एप्लिकेशन शुरू हुई
        "loan_docs_uploaded",           // लोन डॉक्यूमेंट्स अपलोड हुए
        "loan_docs_review_pending",     // लोन डॉक्यूमेंट्स रिव्यू के लिए लंबित
        "loan_docs_verified",           // लोन डॉक्यूमेंट्स वेरिफाई हुए
        "loan_docs_rejected",           // लोन डॉक्यूमेंट्स रिजेक्ट हुए
        "loan_emi_calculation_pending", // EMI कैलकुलेशन लंबित
        "loan_emi_scheduled",           // EMI शेड्यूल की गई
        "loan_final_approval_pending",  // अंतिम अप्रूवल लंबित
        "loan_approved",                // लोन अप्रूव हुआ
        "loan_rejected",                // लोन रिजेक्ट हुआ

        // Other generic statuses
        "in-progress",                  // कार्य प्रगति पर है (FE: Interested)
        "rescheduled",                  // मीटिंग/टास्क रीशेड्यूल किया गया (FE: Follow-up)
        "converted",                    // लीड क्लाइंट में परिवर्तित हुई (FE: Converted)
        "rejected",                     // लीड पूरी तरह से रिजेक्ट हुई (FE: Not Interested)
        "completed",                    // प्रोसेस पूरा हुआ (जैसे इंस्टॉलेशन के बाद)
        "site_visit_scheduled",         // साइट विजिट शेड्यूल की गई
        "site_visit_completed",         // साइट विजिट पूरी हुई
        "quotation_sent",               // कोटेशन भेजा गया
        "quotation_approved",           // कोटेशन अप्रूव हुआ
        "payment_received",             // पेमेंट प्राप्त हुआ
        "installation_scheduled",       // इंस्टॉलेशन शेड्यूल किया गया
        "installation_completed",       // इंस्टॉलेशन पूरा हुआ
        "mpeb_application_submitted",   // MPEB एप्लिकेशन सबमिट की गई
        "mpeb_approved",                // MPEB अप्रूव हुई
        "mpeb_rejected",                // MPEB रिजेक्ट हुई
        "docs_uploaded_by_fieldexecutive", // फील्ड एग्जीक्यूटिव द्वारा डॉक्यूमेंट अपलोड
        "docs_verified_by_admin",       // एडमिन द्वारा डॉक्यूमेंट वेरिफाई
        "payment_followup_pending"      // पेमेंट फॉलोअप लंबित
      ],
      default: "new",
    },

    // फील्ड एग्जीक्यूटिव द्वारा फॉलो-अप के लिए अगली तारीख
    nextFollowUpDate: { type: Date }, // <--- यह नया फ़ील्ड जोड़ा गया

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    remarks: [{
      text: { type: String },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      addedAt: { type: Date, default: Date.now }
    }],

    enquiryDetails: {
      promoter: { type: String },
      mobileNo: { type: String },
      structureType: { type: String },
      customerName: { type: String },
      plantType: { type: String },
      kwRequired: { type: Number },
      account1: { type: String },
      mpeb1: { type: String },
      portal1: { type: String },
      bank: { type: String },
      totalProjectCost: { type: Number },
      dcrInvoice: { type: String },
      receivedAmount: { type: Number },
      pendingAmount: { type: Number },
      tat: { type: String }, // Turn Around Time
    },

    loanApplicationDetails: {
      requiredDocuments: {
        type: [String],
        default: ["Aadhar", "PAN", "Bank Passbook", "Photo"]
      },
      documents: [
        {
          type: {
            type: String,
            required: true,
            enum: [
              "Aadhar_Front", "Aadhar_Back", "PAN_Front", "PAN_Back",
              "Passport", "VoterID", "DrivingLicense", "LoanApplication",
              "PassportPhoto", "PropertyOwnership", "SaleAgreement", "TitleDeed",
              "UtilityBill", "AadhaarAddressProof", "PassportAddressProof", "RationCard",
              "RentAgreement", "DrivingLicenseAddressProof", "SalarySlip", "Form16",
              "ITR", "BusinessProof", "BankStatement"
            ]
          },
          url: { type: String, required: true },
          verificationStatus: {
            type: String,
            enum: ["pending", "verified", "rejected"],
            default: "pending"
          },
          uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          uploadedAt: { type: Date, default: Date.now },
          verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          verifiedAt: { type: Date }
        }
      ],
      loanAmount: { type: Number },
      interestRate: { type: Number },
      tenureMonths: { type: Number },
      monthlyEmi: { type: Number },
      emiSchedule: [
        {
          dueDate: { type: Date },
          amount: { type: Number },
          status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" }
        }
      ],
      loanDisbursalDate: { type: Date },
      loanStatusReason: { type: String },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvalDate: { type: Date },
      rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rejectedAt: { type: Date }
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);