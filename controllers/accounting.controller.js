const leadModel = require("../models/lead.model");
const User = require("../models/user.model"); // Assuming you need to populate user details

// This helper function should be defined in your accounting.controller.js
// or imported from a common utilities file if used across multiple controllers.
// For this response, I'm including it here for completeness within this file's context.
const updateLeadStatus = (lead, newStatus, remark, userId, userRole, nextFollowUpDate = undefined) => {
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
    if (nextFollowUpDate !== undefined) {
        lead.nextFollowUpDate = nextFollowUpDate;
    }
};

exports.getMyAccountingLeads = async (req, res) => {
    try {
        const accountingAdminId = req.user.id;

        // Fetch leads where:
        // 1. Currently assigned to the Accounting Admin
        // 2. Or, Accounting Admin has updated status/added remark in history
        // 3. Or, Accounting Admin has added a remark
        const leads = await leadModel.find({
            $or: [
                { assignedTo: accountingAdminId },
                { "statusHistory.updatedBy": accountingAdminId },
                { "remarks.addedBy": accountingAdminId }
            ],
        })
            .populate("createdBy", "fullName email role")
            .populate("assignedTo", "fullName email role")
            .populate("statusHistory.updatedBy", "fullName email role")
            .populate("remarks.addedBy", "fullName email role")
            .populate("paymentDetails.addedBy", "fullName email role") // Populate who added payment
            .populate("commissionTracking.feCommissionPaidBy", "fullName email role") // Populate who paid FE commission
            .populate("commissionTracking.telecallerCommissionPaidBy", "fullName email role"); // Populate who paid Telecaller commission


        res.status(200).json({ data: leads, total: leads.length });
    } catch (err) {
        console.error("❌ Error fetching my accounting leads:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getAccountingDetails = async (req, res) => {
    try {
        const { leadId } = req.params;
        const lead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("assignedTo", "fullName email role")
            .populate("invoiceDetails.generatedBy", "fullName email role")
            .populate("paymentDetails.addedBy", "fullName email role")
            .populate("commissionTracking.feCommissionPaidBy", "fullName email role")
            .populate("commissionTracking.telecallerCommissionPaidBy", "fullName email role");

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        // Authorization check for Accounting Admin to view details
        if (req.user.role !== 'accounting_admin' && !req.user.role === 'superadmin' && !req.user.role === 'admin') {
            return res.status(403).json({ message: "Not authorized to view these accounting details." });
        }

        res.status(200).json({ data: lead });
    } catch (err) {
        console.error("❌ Error fetching accounting details:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.generateInvoice = async (req, res) => {
    try {
        const { leadId } = req.params;
        let { amount, dueDate, remark } = req.body; // amount अब वैकल्पिक है

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // Relaxed Authorization check
        if (req.user.role !== 'accounting_admin' && !req.user.role === 'superadmin' && !req.user.role === 'admin') {
            return res.status(403).json({ message: "Not authorized to generate invoice for this lead." });
        }

        if (!dueDate) {
            return res.status(400).json({ message: "Invoice due date is required." });
        }

        // यदि राशि प्रदान नहीं की गई है, तो बकाया राशि की गणना करें
        if (!amount) {
            const totalProjectCost = lead.enquiryDetails?.totalProjectCost || 0;
            const totalPaidAmount = lead.paymentDetails.reduce((sum, payment) => {
                if (payment.status === 'full' || payment.status === 'partial' || payment.status === 'advance') {
                    return sum + (payment.amount || 0);
                }
                return sum;
            }, 0);
            amount = totalProjectCost - totalPaidAmount;
            if (amount < 0) amount = 0; // नकारात्मक बकाया राशि नहीं होनी चाहिए
        }

        // इनवॉइस डॉक्यूमेंट अपलोड फ़ील्ड हटाया गया
        let invoiceUrl = null; // अब URL जेनरेट नहीं होगा क्योंकि कोई फ़ाइल अपलोड नहीं हो रही है

        // --- NEW: Auto-generate invoice number ---
        const timestamp = Date.now();
        const generatedInvoiceNumber = `INV-${req.user.id.substring(0, 4)}-${timestamp.toString().substring(8)}`; // Example: INV-65d1-123456789
        // --- END NEW ---

        lead.invoiceDetails = {
            invoiceNumber: generatedInvoiceNumber, // Auto-generated number
            amount,
            dueDate,
            status: "generated", // Initial status
            invoiceUrl, // null रहेगा
            generatedBy: req.user.id,
            generatedAt: new Date(),
            remark
        };

        updateLeadStatus(lead, "accounting_invoice_generated", `Invoice ${generatedInvoiceNumber} generated for ${amount}.`, req.user.id, req.user.role);
        await lead.save();

        const updatedLead = await leadModel.findById(leadId).populate("invoiceDetails.generatedBy", "fullName email role");
        res.status(200).json({ message: "Invoice generated successfully", lead: updatedLead });
    } catch (err) {
        console.error("❌ Error generating invoice:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.recordPayment = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { amount, method, status, transactionId, remark } = req.body;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // Relaxed Authorization check
        if (req.user.role !== 'accounting_admin' && !req.user.role === 'superadmin' && !req.user.role === 'admin') {
            return res.status(403).json({ message: "Not authorized to record payments for this lead." });
        }

        if (!amount || !status) {
            return res.status(400).json({ message: "Payment amount and status are required." });
        }

        // रसीद दस्तावेज़ अपलोड फ़ील्ड हटाया गया
        let receiptUrl = null; // अब URL जेनरेट नहीं होगा क्योंकि कोई फ़ाइल अपलोड नहीं हो रही है

        const newPayment = {
            amount,
            method,
            status,
            transactionId,
            receiptUrl, // null रहेगा
            addedBy: req.user.id,
            remark
        };

        if (!lead.paymentDetails) {
            lead.paymentDetails = [];
        }
        lead.paymentDetails.push(newPayment);

        // Update overall lead status based on payment status
        let newLeadStatus;
        if (status === "advance") {
            newLeadStatus = "accounting_payment_advance";
        } else if (status === "partial") {
            newLeadStatus = "accounting_payment_partial";
        } else if (status === "full") {
            newLeadStatus = "accounting_payment_full";
            if (lead.invoiceDetails) { // Only update invoice status if an invoice exists
                lead.invoiceDetails.status = "paid"; // Mark invoice as paid if full payment
            }
        } else {
            newLeadStatus = lead.status; // No change if other status
        }

        updateLeadStatus(lead, newLeadStatus, `Payment of ${amount} recorded (${status}).`, req.user.id, req.user.role);
        await lead.save();

        const updatedLead = await leadModel.findById(leadId)
            .populate("paymentDetails.addedBy", "fullName email role")
            .populate("invoiceDetails.generatedBy", "fullName email role");

        res.status(200).json({ message: "Payment recorded successfully", lead: updatedLead });
    } catch (err) {
        console.error("❌ Error recording payment:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateCommissionTracking = async (req, res) => {
    // --- Commission Tracking API को कमेंट कर दिया गया है ---
    return res.status(501).json({ message: "Commission tracking functionality is currently disabled." });

    /*
    try {
        const { leadId } = req.params;
        const { feCommissionAmount, feCommissionStatus, telecallerCommissionAmount, telecallerCommissionStatus, remark } = req.body;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // Relaxed Authorization check
        if (req.user.role !== 'accounting_admin' && !req.user.role === 'superadmin' && !req.user.role === 'admin') {
            return res.status(403).json({ message: "Not authorized to update commission tracking for this lead." });
        }

        if (!lead.commissionTracking) {
            lead.commissionTracking = {};
        }

        if (feCommissionAmount !== undefined) lead.commissionTracking.feCommissionAmount = feCommissionAmount;
        if (feCommissionStatus !== undefined) {
            lead.commissionTracking.feCommissionStatus = feCommissionStatus;
            if (feCommissionStatus === "paid") {
                lead.commissionTracking.feCommissionLastPaidDate = new Date();
                lead.commissionTracking.feCommissionPaidBy = req.user.id;
            }
        }
        if (telecallerCommissionAmount !== undefined) lead.commissionTracking.telecallerCommissionAmount = telecallerCommissionAmount;
        if (telecallerCommissionStatus !== undefined) {
            lead.commissionTracking.telecallerCommissionStatus = telecallerCommissionStatus;
            if (telecallerCommissionStatus === "paid") {
                lead.commissionTracking.telecallerCommissionLastPaidDate = new Date();
                lead.commissionTracking.telecallerCommissionPaidBy = req.user.id;
            }
        }
        
        let newLeadStatus = lead.status;
        if (feCommissionStatus === "paid" || telecallerCommissionStatus === "paid") {
             newLeadStatus = "accounting_commission_paid";
        } else if (feCommissionStatus === "pending" || telecallerCommissionStatus === "pending") {
            newLeadStatus = "accounting_commission_pending";
        }

        updateLeadStatus(lead, newLeadStatus, remark || "Commission tracking updated.", req.user.id, req.user.role);
        await lead.save();

        const updatedLead = await leadModel.findById(leadId)
            .populate("commissionTracking.feCommissionPaidBy", "fullName email role")
            .populate("commissionTracking.telecallerCommissionPaidBy", "fullName email role");

        res.status(200).json({ message: "Commission tracking updated successfully", lead: updatedLead });
    } catch (err) {
        console.error("❌ Error updating commission tracking:", err);
        res.status(500).json({ message: "Server error" });
    }
    */
};

exports.getFinancialReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Base match query for relevant accounting leads
        let matchQuery = {
            $or: [
                { "invoiceDetails.generatedAt": { $exists: true } },
                { "paymentDetails": { $exists: true, $not: { $size: 0 } } },
                // { "commissionTracking.feCommissionAmount": { $exists: true } }, // Removed from report
                // { "commissionTracking.telecallerCommissionAmount": { $exists: true } } // Removed from report
            ]
        };

        // Add date range filter to generatedAt if provided
        if (startDate && endDate) {
            // Adjust the query to filter on either invoiceDetails.generatedAt or paymentDetails.paymentDate
            // This requires a more complex $match or separate aggregations
            // For simplicity, we'll keep the current approach, assuming most reports are invoice-centric
            matchQuery["invoiceDetails.generatedAt"] = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const financialData = await leadModel.aggregate([
            { $match: matchQuery },
            {
                $project: {
                    _id: 0, // Lead ID हटा दिया गया है
                    leadId: "$_id", // आंतरिक उपयोग के लिए लीड आईडी रखें, लेकिन आउटपुट से हटा दें
                    clientName: "$name",
                    invoiceNumber: "$invoiceDetails.invoiceNumber",
                    invoiceAmount: "$invoiceDetails.amount",
                    invoiceStatus: "$invoiceDetails.status",
                    invoiceUrl: "$invoiceDetails.invoiceUrl", // इनवॉइस URL शामिल करें
                    payments: "$paymentDetails", // Entire array of payment details
                    // feCommission: "$commissionTracking.feCommissionAmount", // Removed from report
                    // feCommissionStatus: "$commissionTracking.feCommissionStatus", // Removed from report
                    // telecallerCommission: "$commissionTracking.telecallerCommissionAmount", // Removed from report
                    // telecallerCommissionStatus: "$commissionTracking.telecallerCommissionStatus", // Removed from report
                    createdAt: "$createdAt",
                    lastUpdatedAt: "$updatedAt"
                }
            },
            // Optionally, unwind payments to get individual payment records for reporting
            { $unwind: { path: "$payments", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    // leadId: 1, // Output से हटा दिया गया है
                    clientName: 1,
                    invoiceNumber: 1,
                    invoiceAmount: 1,
                    invoiceStatus: 1,
                    invoiceUrl: 1, // प्रोजेक्ट आउटपुट में इनवॉइस URL शामिल करें
                    paymentAmount: "$payments.amount",
                    paymentStatus: "$payments.status",
                    paymentDate: "$payments.paymentDate",
                    paymentMethod: "$payments.method",
                    paymentTransactionId: "$payments.transactionId",
                    // feCommission: 1, // Removed from report
                    // feCommissionStatus: 1, // Removed from report
                    // telecallerCommission: 1, // Removed from report
                    // telecallerCommissionStatus: 1, // Removed from report
                    createdAt: 1,
                    lastUpdatedAt: 1
                }
            }
        ]);

        res.status(200).json({ data: financialData });
    } catch (err) {
        console.error("❌ Error generating financial report:", err);
        res.status(500).json({ message: "Server error" });
    }
};


exports.updateAccountingLeadStatus = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { status, remark } = req.body;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // Relaxed Authorization check
        if (req.user.role !== 'accounting_admin' && !req.user.role === 'superadmin' && !req.user.role === 'admin') {
            return res.status(403).json({ message: "Not authorized to update this accounting lead status." });
        }

        if (status) {
            updateLeadStatus(lead, status, remark || `Accounting status updated to ${status}.`, req.user.id, req.user.role);
        } else if (remark) {
            // If only a remark is provided without a status change, add it to general remarks
            if (!lead.remarks) {
                lead.remarks = [];
            }
            lead.remarks.push({ text: remark, addedBy: req.user.id, addedAt: new Date() });
        }

        await lead.save();

        const updatedLead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("assignedTo", "fullName email role");

        res.status(200).json({ message: "Accounting lead status updated successfully", lead: updatedLead });
    } catch (err) {
        console.error("❌ Error updating accounting lead status:", err);
        res.status(500).json({ message: "Server error occurred while updating accounting lead status." });
    }
};