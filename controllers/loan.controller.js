// const leadModel = require("../models/lead.model");

// const fieldMap = {
//     aadhaarFile: "Aadhar_Front",
//     aadhaarBackFile: "Aadhar_Back",
//     panFile: "PAN_Front",
//     panBackFile: "PAN_Back",
//     passportFile: "Passport",
//     voterIdFile: "VoterID",
//     drivingLicenseFile: "DrivingLicense",
//     loanApplicationFile: "LoanApplication",
//     passportPhotoFile: "PassportPhoto",
//     propertyOwnershipFile: "PropertyOwnership",
//     saleAgreementFile: "SaleAgreement",
//     titleDeedFile: "TitleDeed",
//     utilityBillFile: "UtilityBill",
//     aadhaarAddressFile: "AadhaarAddressProof",
//     passportAddressFile: "PassportAddressProof",
//     rationCardFile: "RationCard",
//     rentAgreementFile: "RentAgreement",
//     drivingLicenseAddressFile: "DrivingLicenseAddressProof",
//     salarySlipFile: "SalarySlip",
//     form16File: "Form16",
//     itrFile: "ITR",
//     businessProofFile: "BusinessProof",
//     bankStatementFile: "BankStatement"
// };

// const updateLeadStatus = (lead, newStatus, remark, userId, userRole) => {
//     lead.status = newStatus;
//     lead.statusHistory.push({
//         status: newStatus,
//         updatedBy: userId,
//         updatedAt: new Date(),
//         remark: remark,
//         role: userRole
//     });
//     if (lead.currentStatusDetail) {
//         lead.currentStatusDetail[userRole] = newStatus;
//     }
// };

// function calculateEmiSchedule(principal, annualInterestRate, months, disbursalDate) {
//     const monthlyInterestRate = (annualInterestRate / 100) / 12;
//     let monthlyEmi;
//     if (monthlyInterestRate === 0) {
//         monthlyEmi = principal / months;
//     } else {
//         monthlyEmi = (principal * monthlyInterestRate * Math.pow((1 + monthlyInterestRate), months)) /
//             (Math.pow((1 + monthlyInterestRate), months) - 1);
//     }
//     monthlyEmi = parseFloat(monthlyEmi.toFixed(2));

//     const emiSchedule = [];
//     const start = new Date(disbursalDate);
//     for (let i = 0; i < months; i++) {
//         const due = new Date(start);
//         due.setMonth(start.getMonth() + i + 1);
//         emiSchedule.push({
//             dueDate: due,
//             amount: monthlyEmi,
//             status: "pending"
//         });
//     }

//     return { monthlyEmi, emiSchedule };
// }

// exports.getMyLoans = async (req, res) => {
//     try {
//         const leads = await leadModel.find({ assignedTo: req.user.id })
//             .populate("createdBy", "fullName email role")
//             .populate("assignedTo", "fullName email role");

//         return res.status(200).json({ leads });
//     } catch (err) {
//         console.error("❌ Error fetching my loans:", err);
//         return res.status(500).json({ message: "Server error" });
//     }
// };

// exports.uploadDocuments = async (req, res) => {
//     try {
//         const { leadId } = req.params;
//         const lead = await leadModel.findById(leadId)
//             .populate("createdBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
//             .populate("loanApplicationDetails.approvedBy", "fullName email role")
//             .populate("loanApplicationDetails.rejectedBy", "fullName email role");
//         if (!lead) return res.status(404).json({ message: "Lead not found" });

//         if (!req.files || Object.keys(req.files).length === 0)
//             return res.status(400).json({ message: "No files uploaded" });

//         Object.keys(req.files).forEach(field => {
//             const docType = fieldMap[field];
//             const file = req.files[field][0];

//             if (docType && file) {
//                 lead.loanApplicationDetails.documents.push({
//                     type: docType,
//                     url: file.location,
//                     uploadedBy: req.user.id
//                 });
//             }
//         });

//         updateLeadStatus(lead, "loan_docs_uploaded", "Loan documents uploaded.", req.user.id, req.user.role);
//         await lead.save();

//         res.status(200).json({ message: "Documents uploaded successfully", lead });
//     } catch (err) {
//         console.error("❌ Upload doc error:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.getLeadDocuments = async (req, res) => {
//     try {
//         const { leadId } = req.params;

//         const lead = await leadModel.findById(leadId).select("loanApplicationDetails.documents")
//             .populate("createdBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
//             .populate("loanApplicationDetails.approvedBy", "fullName email role")
//             .populate("loanApplicationDetails.rejectedBy", "fullName email role");
//         if (!lead) return res.status(404).json({ message: "Lead not found" });

//         const docs = lead.loanApplicationDetails.documents.map(doc => ({
//             id: doc._id,
//             type: doc.type,
//             url: doc.url,
//             verificationStatus: doc.verificationStatus || "not_verified",
//             uploadedAt: doc.uploadedAt
//         }));

//         res.status(200).json({
//             leadId,
//             documents: docs
//         });
//     } catch (err) {
//         console.error("❌ Get lead documents error:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.bulkVerifyDocuments = async (req, res) => {
//     try {
//         const { leadId } = req.params;
//         const { documents } = req.body;
//         // Example: [{ docId: "xxx", verificationStatus: "verified" }, { docId: "yyy", verificationStatus: "rejected" }]

//         const lead = await leadModel.findById(leadId)
//             .populate("createdBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
//             .populate("loanApplicationDetails.approvedBy", "fullName email role")
//             .populate("loanApplicationDetails.rejectedBy", "fullName email role");
//         if (!lead) return res.status(404).json({ message: "Lead not found" });

//         documents.forEach(update => {
//             const doc = lead.loanApplicationDetails.documents.id(update.docId);
//             if (doc) {
//                 doc.verificationStatus = update.verificationStatus;
//                 doc.verifiedBy = req.user.id;   // ✅ jisne verify kiya
//                 doc.verifiedAt = new Date();
//             }
//         });

//         await lead.save();
//         res.status(200).json({ message: "Documents updated", lead });
//     } catch (err) {
//         console.error("❌ Bulk verify error:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.verifyDocument = async (req, res) => {
//     try {
//         const { leadId, docId } = req.params;
//         const { verificationStatus, reason } = req.body;

//         const lead = await leadModel.findById(leadId)
//             .populate("createdBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
//             .populate("loanApplicationDetails.approvedBy", "fullName email role")
//             .populate("loanApplicationDetails.rejectedBy", "fullName email role");
//         if (!lead) return res.status(404).json({ message: "Lead not found" });

//         const doc = lead.loanApplicationDetails.documents.id(docId);
//         if (!doc) return res.status(404).json({ message: "Document not found" });

//         doc.verificationStatus = verificationStatus;
//         doc.verifiedBy = req.user.id;
//         doc.verifiedAt = new Date();

//         if (verificationStatus === "rejected") {
//             updateLeadStatus(lead, "loan_docs_rejected", reason || "Loan document rejected by admin.", req.user.id, req.user.role);
//             lead.loanApplicationDetails.loanStatusReason = reason || "Rejected by admin";
//             lead.loanApplicationDetails.rejectedBy = req.user.id;
//             lead.loanApplicationDetails.rejectedAt = new Date();
//         } else {
//             // Check if all documents are verified before setting overall lead status
//             const allDocsVerified = lead.loanApplicationDetails.documents.every(d => d.verificationStatus === "verified");
//             if (allDocsVerified) {
//                 updateLeadStatus(lead, "loan_docs_verified", "All loan documents verified.", req.user.id, req.user.role);
//             } else {
//                 updateLeadStatus(lead, "loan_docs_review_pending", "Loan document status updated.", req.user.id, req.user.role);
//             }
//         }

//         await lead.save();
//         res.status(200).json({ message: "Document verified", lead });
//     } catch (err) {
//         console.error("❌ Verify doc error:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.processLoan = async (req, res) => {
//     try {
//         const { leadId } = req.params;
//         const { loanAmount, interestRate, tenureMonths, disbursalDate } = req.body; // disbursalDate जोड़ा गया

//         const lead = await leadModel.findById(leadId)
//             .populate("createdBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.approvedBy", "fullName email role")
//             .populate("loanApplicationDetails.rejectedBy", "fullName email role");
//         if (!lead) return res.status(404).json({ message: "Lead not found" });

//         const { monthlyEmi, emiSchedule } = calculateEmiSchedule(loanAmount, interestRate, tenureMonths, disbursalDate || new Date());

//         lead.loanApplicationDetails.loanAmount = loanAmount;
//         lead.loanApplicationDetails.interestRate = interestRate;
//         lead.loanApplicationDetails.tenureMonths = tenureMonths;
//         lead.loanApplicationDetails.monthlyEmi = monthlyEmi;
//         lead.loanApplicationDetails.emiSchedule = emiSchedule;


//         updateLeadStatus(lead, "loan_emi_scheduled", "Loan EMI scheduled.", req.user.id, req.user.role);
//         lead.loanApplicationDetails.processedBy = req.user.id;
//         lead.loanApplicationDetails.processedAt = new Date();
//         await lead.save();

//         res.status(200).json({ message: "Loan processed successfully", lead });
//     } catch (err) {
//         console.error("❌ Process loan error:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.approveLoan = async (req, res) => {
//     try {
//         const { leadId } = req.params;
//         const { status, loanDisbursalDate, loanStatusReason } = req.body;

//         let lead = await leadModel.findById(leadId);
//         if (!lead) return res.status(404).json({ message: "Lead not found" });

//         if (status === "approved") {
//             updateLeadStatus(lead, "loan_approved", "Loan approved and disbursed.", req.user.id, req.user.role);
//             lead.loanApplicationDetails.loanDisbursalDate = loanDisbursalDate || new Date();
//             lead.loanApplicationDetails.approvedBy = req.user.id;
//             lead.loanApplicationDetails.approvalDate = new Date();
//         } else { // status === "rejected"
//             updateLeadStatus(lead, "loan_rejected", loanStatusReason || "Loan rejected by admin.", req.user.id, req.user.role);
//             lead.loanApplicationDetails.loanStatusReason = loanStatusReason || "Rejected by admin";
//             lead.loanApplicationDetails.rejectedBy = req.user.id;
//             lead.loanApplicationDetails.rejectedAt = new Date();
//         }

//         await lead.save();

//         lead = await leadModel.findById(leadId)
//             .populate("createdBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
//             .populate("loanApplicationDetails.approvedBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.rejectedBy", "fullName email role"); // Changed rejectedBy for doc to documents.rejectedBy
//         // Also ensure that if rejectedBy on doc is used, it should be the ID of the user who rejected it.
//         // The populate above should be on the main lead.
//         // Correct populate for rejectedBy on the main loanApplicationDetails:
//         // .populate("loanApplicationDetails.rejectedBy", "fullName email role");

//         res.status(200).json({ message: "Loan status updated", lead });
//     } catch (err) {
//         console.error("❌ Approve loan error:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };

// exports.updateLoanLeadStatus = async (req, res) => {
//     try {
//         const { leadId } = req.params;
//         const { status, remark, loanStatusReason, loanDisbursalDate } = req.body;

//         let lead = await leadModel.findById(leadId);
//         if (!lead) return res.status(404).json({ message: "Lead not found" });

//         // Ensure the loan admin is assigned to this lead if that's a requirement
//         // For now, let's assume if they can access this endpoint, they are authorized.
//         // if (lead.assignedTo.toString() !== req.user.id) {
//         //   return res.status(403).json({ message: "Not authorized to update this lead's status" });
//         // }

//         // Update main status, history, and role-specific status
//         if (status) {
//             updateLeadStatus(lead, status, remark || `Loan status updated to ${status}.`, req.user.id, req.user.role);
//         }

//         // Handle loan-specific fields based on status
//         if (status === "loan_approved") {
//             lead.loanApplicationDetails.loanDisbursalDate = loanDisbursalDate || new Date();
//             lead.loanApplicationDetails.approvedBy = req.user.id;
//             lead.loanApplicationDetails.approvalDate = new Date();
//             lead.loanApplicationDetails.loanStatusReason = undefined; // Clear rejection reason
//         } else if (status === "loan_rejected") {
//             lead.loanApplicationDetails.loanStatusReason = loanStatusReason || "Loan rejected by Loan Admin.";
//             lead.loanApplicationDetails.rejectedBy = req.user.id;
//             lead.loanApplicationDetails.rejectedAt = new Date();
//             lead.loanApplicationDetails.loanDisbursalDate = undefined; // Clear disbursal date
//             lead.loanApplicationDetails.approvedBy = undefined;
//             lead.loanApplicationDetails.approvalDate = undefined;
//         } else {
//             // For other statuses, clear approval/rejection specifics if set
//             lead.loanApplicationDetails.loanDisbursalDate = undefined;
//             lead.loanApplicationDetails.approvedBy = undefined;
//             lead.loanApplicationDetails.approvalDate = undefined;
//             lead.loanApplicationDetails.rejectedBy = undefined;
//             lead.loanApplicationDetails.rejectedAt = undefined;
//             lead.loanApplicationDetails.loanStatusReason = undefined;
//         }

//         await lead.save();

//         // Re-populate for response if needed
//         lead = await leadModel.findById(leadId)
//             .populate("createdBy", "fullName email role")
//             .populate("assignedTo", "fullName email role") // Ensure assignedTo is populated
//             .populate("statusHistory.updatedBy", "fullName email role") // Populate history
//             .populate("remarks.addedBy", "fullName email role") // Populate remarks
//             .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
//             .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
//             .populate("loanApplicationDetails.approvedBy", "fullName email role")
//             .populate("loanApplicationDetails.rejectedBy", "fullName email role");

//         res.status(200).json({ message: "Loan lead status updated successfully", lead });
//     } catch (err) {
//         console.error("❌ Error updating loan lead status:", err);
//         res.status(500).json({ message: "Server error occurred while updating loan lead status." });
//     }
// };

// module.exports.fieldMap = fieldMap;

const leadModel = require("../models/lead.model");

const fieldMap = {
    aadhaarFile: "Aadhar_Front",
    aadhaarBackFile: "Aadhar_Back",
    panFile: "PAN_Front",
    panBackFile: "PAN_Back",
    passportFile: "Passport",
    voterIdFile: "VoterID",
    drivingLicenseFile: "DrivingLicense",
    loanApplicationFile: "LoanApplication",
    passportPhotoFile: "PassportPhoto",
    propertyOwnershipFile: "PropertyOwnership",
    saleAgreementFile: "SaleAgreement",
    titleDeedFile: "TitleDeed",
    utilityBillFile: "UtilityBill",
    aadhaarAddressFile: "AadhaarAddressProof",
    passportAddressFile: "PassportAddressProof",
    rationCardFile: "RationCard",
    rentAgreementFile: "RentAgreement",
    drivingLicenseAddressFile: "DrivingLicenseAddressProof",
    salarySlipFile: "SalarySlip",
    form16File: "Form16",
    itrFile: "ITR",
    businessProofFile: "BusinessProof",
    bankStatementFile: "BankStatement"
};

const updateLeadStatus = (lead, newStatus, remark, userId, userRole) => {
    lead.status = newStatus;
    lead.statusHistory.push({
        status: newStatus,
        updatedBy: userId,
        updatedAt: new Date(),
        remark: remark,
        role: userRole
    });
    if (lead.currentStatusDetail) {
        lead.currentStatusDetail[userRole] = newStatus;
    }
};

function calculateEmiSchedule(principal, annualInterestRate, months, disbursalDate) {
    const monthlyInterestRate = (annualInterestRate / 100) / 12;
    let monthlyEmi;
    if (monthlyInterestRate === 0) {
        monthlyEmi = principal / months;
    } else {
        monthlyEmi = (principal * monthlyInterestRate * Math.pow((1 + monthlyInterestRate), months)) /
            (Math.pow((1 + monthlyInterestRate), months) - 1);
    }
    monthlyEmi = parseFloat(monthlyEmi.toFixed(2));

    const emiSchedule = [];
    const start = new Date(disbursalDate);
    for (let i = 0; i < months; i++) {
        const due = new Date(start);
        due.setMonth(start.getMonth() + i + 1);
        emiSchedule.push({
            dueDate: due,
            amount: monthlyEmi,
            status: "pending"
        });
    }

    return { monthlyEmi, emiSchedule };
}

exports.getMyLoans = async (req, res) => {
    try {
        const loanAdminId = req.user.id;
        const leads = await leadModel.find({
            $or: [
                { assignedTo: loanAdminId },
                { "statusHistory.updatedBy": loanAdminId },
                { "remarks.addedBy": loanAdminId }
            ]
        })
            .populate("createdBy", "fullName email role")
            .populate("assignedTo", "fullName email role")
            .populate("statusHistory.updatedBy", "fullName email role")
            .populate("remarks.addedBy", "fullName email role");


        return res.status(200).json({ data: leads, total: leads.length }); // Changed to data/total format
    } catch (err) {
        console.error("❌ Error fetching my loans:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.uploadDocuments = async (req, res) => {
    try {
        const { leadId } = req.params;
        const lead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
            .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
            .populate("loanApplicationDetails.approvedBy", "fullName email role")
            .populate("loanApplicationDetails.rejectedBy", "fullName email role");
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        if (!req.files || Object.keys(req.files).length === 0)
            return res.status(400).json({ message: "No files uploaded" });

        Object.keys(req.files).forEach(field => {
            const docType = fieldMap[field];
            const file = req.files[field][0];

            if (docType && file) {
                lead.loanApplicationDetails.documents.push({
                    type: docType,
                    url: file.location,
                    uploadedBy: req.user.id
                });
            }
        });

        updateLeadStatus(lead, "loan_docs_uploaded", "Loan documents uploaded.", req.user.id, req.user.role);
        await lead.save();

        res.status(200).json({ message: "Documents uploaded successfully", lead });
    } catch (err) {
        console.error("❌ Upload doc error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getLeadDocuments = async (req, res) => {
    try {
        const { leadId } = req.params;

        const lead = await leadModel.findById(leadId).select("loanApplicationDetails.documents")
            .populate("createdBy", "fullName email role")
            .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
            .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        const docs = lead.loanApplicationDetails.documents.map(doc => ({
            id: doc._id,
            type: doc.type,
            url: doc.url,
            verificationStatus: doc.verificationStatus || "not_verified",
            uploadedAt: doc.uploadedAt
        }));

        res.status(200).json({
            leadId,
            documents: docs
        });
    } catch (err) {
        console.error("❌ Get lead documents error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.bulkVerifyDocuments = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { documents } = req.body;
        // Example: [{ docId: "xxx", verificationStatus: "verified" }, { docId: "yyy", verificationStatus: "rejected" }]

        const lead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
            .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
            .populate("loanApplicationDetails.approvedBy", "fullName email role")
            .populate("loanApplicationDetails.rejectedBy", "fullName email role");
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        documents.forEach(update => {
            const doc = lead.loanApplicationDetails.documents.id(update.docId);
            if (doc) {
                doc.verificationStatus = update.verificationStatus;
                doc.verifiedBy = req.user.id;   // ✅ jisne verify kiya
                doc.verifiedAt = new Date();
            }
        });

        await lead.save();
        res.status(200).json({ message: "Documents updated", lead });
    } catch (err) {
        console.error("❌ Bulk verify error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.verifyDocument = async (req, res) => {
    try {
        const { leadId, docId } = req.params;
        const { verificationStatus, reason } = req.body;

        const lead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
            .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
            .populate("loanApplicationDetails.approvedBy", "fullName email role")
            .populate("loanApplicationDetails.rejectedBy", "fullName email role");
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        const doc = lead.loanApplicationDetails.documents.id(docId);
        if (!doc) return res.status(404).json({ message: "Document not found" });

        doc.verificationStatus = verificationStatus;
        doc.verifiedBy = req.user.id;
        doc.verifiedAt = new Date();

        if (verificationStatus === "rejected") {
            updateLeadStatus(lead, "loan_docs_rejected", reason || "Loan document rejected by admin.", req.user.id, req.user.role);
            lead.loanApplicationDetails.loanStatusReason = reason || "Rejected by admin";
            lead.loanApplicationDetails.rejectedBy = req.user.id;
            lead.loanApplicationDetails.rejectedAt = new Date();
        } else {
            // Check if all documents are verified before setting overall lead status
            const allDocsVerified = lead.loanApplicationDetails.documents.every(d => d.verificationStatus === "verified");
            if (allDocsVerified) {
                updateLeadStatus(lead, "loan_docs_verified", "All loan documents verified.", req.user.id, req.user.role);
            } else {
                updateLeadStatus(lead, "loan_docs_review_pending", "Loan document status updated.", req.user.id, req.user.role);
            }
        }

        await lead.save();
        res.status(200).json({ message: "Document verified", lead });
    } catch (err) {
        console.error("❌ Verify doc error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.processLoan = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { loanAmount, interestRate, tenureMonths, disbursalDate } = req.body; // disbursalDate जोड़ा गया

        const lead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
            .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
            .populate("loanApplicationDetails.approvedBy", "fullName email role")
            .populate("loanApplicationDetails.rejectedBy", "fullName email role");
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        const { monthlyEmi, emiSchedule } = calculateEmiSchedule(loanAmount, interestRate, tenureMonths, disbursalDate || new Date());

        lead.loanApplicationDetails.loanAmount = loanAmount;
        lead.loanApplicationDetails.interestRate = interestRate;
        lead.loanApplicationDetails.tenureMonths = tenureMonths;
        lead.loanApplicationDetails.monthlyEmi = monthlyEmi;
        lead.loanApplicationDetails.emiSchedule = emiSchedule;


        updateLeadStatus(lead, "loan_emi_scheduled", "Loan EMI scheduled.", req.user.id, req.user.role);
        lead.loanApplicationDetails.processedBy = req.user.id;
        lead.loanApplicationDetails.processedAt = new Date();
        await lead.save();

        res.status(200).json({ message: "Loan processed successfully", lead });
    } catch (err) {
        console.error("❌ Process loan error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.approveLoan = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { status, loanDisbursalDate, loanStatusReason } = req.body;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        if (status === "approved") {
            updateLeadStatus(lead, "loan_approved", "Loan approved and disbursed.", req.user.id, req.user.role);
            lead.loanApplicationDetails.loanDisbursalDate = loanDisbursalDate || new Date();
            lead.loanApplicationDetails.approvedBy = req.user.id;
            lead.loanApplicationDetails.approvalDate = new Date();
        } else { // status === "rejected"
            updateLeadStatus(lead, "loan_rejected", loanStatusReason || "Loan rejected by admin.", req.user.id, req.user.role);
            lead.loanApplicationDetails.loanStatusReason = loanStatusReason || "Rejected by admin";
            lead.loanApplicationDetails.rejectedBy = req.user.id;
            lead.loanApplicationDetails.rejectedAt = new Date();
        }

        await lead.save();

        lead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
            .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
            .populate("loanApplicationDetails.approvedBy", "fullName email role")
            .populate("loanApplicationDetails.rejectedBy", "fullName email role");

        res.status(200).json({ message: "Loan status updated", lead });
    } catch (err) {
        console.error("❌ Approve loan error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

// New function for loan admin to update status with specific fields
exports.updateLoanLeadStatus = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { status, remark, loanStatusReason, loanDisbursalDate } = req.body;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // Ensure the loan admin is assigned to this lead if that's a requirement
        // For now, let's assume if they can access this endpoint, they are authorized.
        // if (lead.assignedTo.toString() !== req.user.id) {
        //   return res.status(403).json({ message: "Not authorized to update this lead's status" });
        // }

        // Update main status, history, and role-specific status
        if (status) {
            updateLeadStatus(lead, status, remark || `Loan status updated to ${status}.`, req.user.id, req.user.role);
        }

        // Handle loan-specific fields based on status
        if (status === "loan_approved") {
            lead.loanApplicationDetails.loanDisbursalDate = loanDisbursalDate || new Date();
            lead.loanApplicationDetails.approvedBy = req.user.id;
            lead.loanApplicationDetails.approvalDate = new Date();
            lead.loanApplicationDetails.loanStatusReason = undefined; // Clear rejection reason
        } else if (status === "loan_rejected") {
            lead.loanApplicationDetails.loanStatusReason = loanStatusReason || "Loan rejected by Loan Admin.";
            lead.loanApplicationDetails.rejectedBy = req.user.id;
            lead.loanApplicationDetails.rejectedAt = new Date();
            lead.loanApplicationDetails.loanDisbursalDate = undefined; // Clear disbursal date
            lead.loanApplicationDetails.approvedBy = undefined;
            lead.loanApplicationDetails.approvalDate = undefined;
        } else {
            // For other statuses, clear approval/rejection specifics if set
            lead.loanApplicationDetails.loanDisbursalDate = undefined;
            lead.loanApplicationDetails.approvedBy = undefined;
            lead.loanApplicationDetails.approvalDate = undefined;
            lead.loanApplicationDetails.rejectedBy = undefined;
            lead.loanApplicationDetails.rejectedAt = undefined;
            lead.loanApplicationDetails.loanStatusReason = undefined;
        }

        await lead.save();

        // Re-populate for response if needed
        lead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("assignedTo", "fullName email role") // Ensure assignedTo is populated
            .populate("statusHistory.updatedBy", "fullName email role") // Populate history
            .populate("remarks.addedBy", "fullName email role") // Populate remarks
            .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
            .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
            .populate("loanApplicationDetails.approvedBy", "fullName email role")
            .populate("loanApplicationDetails.rejectedBy", "fullName email role");

        res.status(200).json({ message: "Loan lead status updated successfully", lead });
    } catch (err) {
        console.error("❌ Error updating loan lead status:", err);
        res.status(500).json({ message: "Server error occurred while updating loan lead status." });
    }
};


module.exports.fieldMap = fieldMap;