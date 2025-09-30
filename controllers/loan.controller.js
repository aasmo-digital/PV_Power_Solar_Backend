// const leadModel = require("../models/lead.model");

// // loan.controller.js
// exports.updateLoanStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { status, remark } = req.body;

//         let lead = await leadModel.findById(id);
//         if (!lead) return res.status(404).json({ message: "Lead not found" });

//         if (!lead.assignedTo.loanAdmin || lead.assignedTo.loanAdmin.toString() !== req.user.id) {
//             return res.status(403).json({ message: "Not authorized" });
//         }


//         if (lead.assignedTo.toString() !== req.user.id) {
//             return res.status(403).json({ message: "Not authorized" });
//         }

//         lead.loanStatus = status;
//         if (remark) lead.remarks.push({ text: remark, addedBy: req.user.id });

//         await lead.save();
//         res.status(200).json({ message: "Loan status updated", lead });
//     } catch (err) {
//         console.error("❌ Error updating loan status:", err);
//         res.status(500).json({ message: "Server error" });
//     }
// };


// controllers/loan.controller.js





const leadModel = require("../models/lead.model");

// controllers/loan.controller.js (top me)
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
        const leads = await leadModel.find({ assignedTo: req.user.id })
            .populate("createdBy", "fullName email role")
            .populate("assignedTo", "fullName email role");

        return res.status(200).json({ leads });
    } catch (err) {
        console.error("❌ Error fetching my loans:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

exports.uploadDocuments = async (req, res) => {
    console.log("req.files ===>", req.files);

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

        // req.files object hota hai jab fields use karte ho
        Object.keys(req.files).forEach(field => {
            const docType = fieldMap[field]; // e.g. aadhaarFile -> Aadhar_Front
            const file = req.files[field][0]; // multer.fields array deta hai

            if (docType && file) {
                lead.loanApplicationDetails.documents.push({
                    type: docType,
                    url: file.location, // S3 ka link
                    uploadedBy: req.user.id
                });
            }
        });

        lead.status = "loan_docs_uploaded";
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
            .populate("loanApplicationDetails.approvedBy", "fullName email role")
            .populate("loanApplicationDetails.rejectedBy", "fullName email role");
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
        doc.verifiedBy = req.user.id;   // ✅
        doc.verifiedAt = new Date();

        if (verificationStatus === "rejected") {
            lead.status = "loan_docs_rejected";
            lead.loanApplicationDetails.loanStatusReason = reason || "Rejected by admin";
            lead.loanApplicationDetails.rejectedBy = req.user.id;   // ✅
            lead.loanApplicationDetails.rejectedAt = new Date();
        } else {
            lead.status = "loan_docs_verified";
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
        const { loanAmount, interestRate, tenureMonths } = req.body;

        const lead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("loanApplicationDetails.documents.uploadedBy", "fullName email role")
            .populate("loanApplicationDetails.documents.verifiedBy", "fullName email role")
            .populate("loanApplicationDetails.approvedBy", "fullName email role")
            .populate("loanApplicationDetails.rejectedBy", "fullName email role");
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        const monthlyRate = interestRate / 12 / 100;
        const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
            (Math.pow(1 + monthlyRate, tenureMonths) - 1);

        lead.loanApplicationDetails.loanAmount = loanAmount;
        lead.loanApplicationDetails.interestRate = interestRate;
        lead.loanApplicationDetails.tenureMonths = tenureMonths;
        lead.loanApplicationDetails.monthlyEmi = Math.round(emi);

        // generate EMI schedule
        lead.loanApplicationDetails.emiSchedule = [];
        let dueDate = new Date();
        for (let i = 1; i <= tenureMonths; i++) {
            dueDate.setMonth(dueDate.getMonth() + 1);
            lead.loanApplicationDetails.emiSchedule.push({
                dueDate: new Date(dueDate),
                amount: Math.round(emi),
            });
        }

        lead.status = "loan_emi_scheduled";
        lead.loanApplicationDetails.processedBy = req.user.id;   // ✅
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
      lead.status = "loan_approved";
      lead.loanApplicationDetails.loanDisbursalDate = loanDisbursalDate || new Date();
      lead.loanApplicationDetails.approvedBy = req.user.id;
      lead.loanApplicationDetails.approvalDate = new Date();
    } else {
      lead.status = "loan_rejected";
      lead.loanApplicationDetails.loanStatusReason = loanStatusReason || "Rejected by admin";
      lead.loanApplicationDetails.rejectedBy = req.user.id;
      lead.loanApplicationDetails.rejectedAt = new Date();
    }

    await lead.save();

    // 🔑 अब populate दोबारा
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



module.exports.fieldMap = fieldMap;