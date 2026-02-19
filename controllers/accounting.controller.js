const leadModel = require("../models/lead.model");
const User = require("../models/user.model");

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
            .populate("paymentDetails.addedBy", "fullName email role")
            .populate("commissionTracking.feCommissionPaidBy", "fullName email role")
            .populate("commissionTracking.telecallerCommissionPaidBy", "fullName email role");


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
        let { amount, dueDate, remark } = req.body;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        if (req.user.role !== 'accounting_admin' && !req.user.role === 'superadmin' && !req.user.role === 'admin') {
            return res.status(403).json({ message: "Not authorized to generate invoice for this lead." });
        }

        if (!dueDate) {
            return res.status(400).json({ message: "Invoice due date is required." });
        }

        if (!amount) {
            const totalProjectCost = lead.enquiryDetails?.totalProjectCost || 0;
            const totalPaidAmount = lead.paymentDetails.reduce((sum, payment) => {
                if (payment.status === 'full' || payment.status === 'partial' || payment.status === 'advance') {
                    return sum + (payment.amount || 0);
                }
                return sum;
            }, 0);
            amount = totalProjectCost - totalPaidAmount;
            if (amount < 0) amount = 0;
        }

        let invoiceUrl = null;

        const timestamp = Date.now();
        const generatedInvoiceNumber = `INV-${req.user.id.substring(0, 4)}-${timestamp.toString().substring(8)}`;

        lead.invoiceDetails = {
            invoiceNumber: generatedInvoiceNumber,
            amount,
            dueDate,
            status: "generated",
            invoiceUrl,
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

        if (req.user.role !== 'accounting_admin' && !['superadmin', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: "Not authorized to record payments for this lead." });
        }

        if (!amount || !status) {
            return res.status(400).json({ message: "Payment amount and status are required." });
        }

        let receiptUrl = null;

        const newPayment = {
            amount, method, status, transactionId, receiptUrl,
            addedBy: req.user.id, remark
        };

        if (!lead.paymentDetails) {
            lead.paymentDetails = [];
        }
        lead.paymentDetails.push(newPayment);

        let newLeadStatus;
        if (status === "advance") {
            newLeadStatus = "accounting_payment_advance";
        } else if (status === "partial") {
            newLeadStatus = "accounting_payment_partial";
        } else if (status === "full") {
            newLeadStatus = "accounting_payment_full";
            if (lead.invoiceDetails) {
                lead.invoiceDetails.status = "paid";
            }
            newLeadStatus = "completed";
            lead.assignedTo = null;
        } else {
            newLeadStatus = lead.status;
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
    return res.status(501).json({ message: "Commission tracking functionality is currently disabled." });
};

exports.getFinancialReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let matchQuery = {
            $or: [
                { "invoiceDetails.generatedAt": { $exists: true } },
                { "paymentDetails": { $exists: true, $not: { $size: 0 } } },
            ]
        };

        if (startDate && endDate) {
            matchQuery["invoiceDetails.generatedAt"] = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const financialData = await leadModel.aggregate([
            { $match: matchQuery },
            {
                $project: {
                    _id: 0,
                    leadId: "$_id",
                    clientName: "$name",
                    invoiceNumber: "$invoiceDetails.invoiceNumber",
                    invoiceAmount: "$invoiceDetails.amount",
                    invoiceStatus: "$invoiceDetails.status",
                    invoiceUrl: "$invoiceDetails.invoiceUrl",
                    payments: "$paymentDetails",
                    createdAt: "$createdAt",
                    lastUpdatedAt: "$updatedAt"
                }
            },
            { $unwind: { path: "$payments", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    clientName: 1,
                    invoiceNumber: 1,
                    invoiceAmount: 1,
                    invoiceStatus: 1,
                    invoiceUrl: 1,
                    paymentAmount: "$payments.amount",
                    paymentStatus: "$payments.status",
                    paymentDate: "$payments.paymentDate",
                    paymentMethod: "$payments.method",
                    paymentTransactionId: "$payments.transactionId",
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

        if (req.user.role !== 'accounting_admin' && !req.user.role === 'superadmin' && !req.user.role === 'admin') {
            return res.status(403).json({ message: "Not authorized to update this accounting lead status." });
        }

        if (status) {
            updateLeadStatus(lead, status, remark || `Accounting status updated to ${status}.`, req.user.id, req.user.role);
        } else if (remark) {
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