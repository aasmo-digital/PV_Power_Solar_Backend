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
    if (newStatus === "fe_rescheduled_followup" && nextFollowUpDate) {
        lead.nextFollowUpDate = nextFollowUpDate;
    } else if (newStatus !== "fe_rescheduled_followup") {
        lead.nextFollowUpDate = undefined;
    }
};

exports.getMyLeads = async (req, res) => {
  try {
    const feId = req.user.id; 
        
    const leads = await leadModel.find({
      $or: [
        { assignedTo: feId },
        { "statusHistory.updatedBy": feId }, 
        { "remarks.addedBy": feId }          
      ]
    })
      .populate("createdBy", "fullName email role")
      .populate("assignedTo", "fullName email role")
      .populate("statusHistory.updatedBy", "fullName email role") 
      .populate("remarks.addedBy", "fullName email role"); 

    res.status(200).json({ data: leads, total: leads.length });
  } catch (err) {
    console.error("❌ Error fetching my leads for field executive:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateEnquiryDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      promoter, mobileNo, structureType, customerName, plantType, kwRequired,
      account1, mpeb1, portal1, bank, totalProjectCost, dcrInvoice,
      receivedAmount, pendingAmount, tat, remark 
    } = req.body;

    let lead = await leadModel.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (req.user.role === 'fieldexecutive' && lead.assignedTo && lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this lead's enquiry details" });
    }

    const updatedEnquiryDetails = { ...lead.enquiryDetails };
    if (promoter !== undefined) updatedEnquiryDetails.promoter = promoter;
    if (mobileNo !== undefined) updatedEnquiryDetails.mobileNo = mobileNo;
    if (structureType !== undefined) updatedEnquiryDetails.structureType = structureType;
    if (customerName !== undefined) updatedEnquiryDetails.customerName = customerName;
    if (plantType !== undefined) updatedEnquiryDetails.plantType = plantType;
    if (kwRequired !== undefined) updatedEnquiryDetails.kwRequired = kwRequired;
    if (account1 !== undefined) updatedEnquiryDetails.account1 = account1;
    if (mpeb1 !== undefined) updatedEnquiryDetails.mpeb1 = mpeb1;
    if (portal1 !== undefined) updatedEnquiryDetails.portal1 = portal1;
    if (bank !== undefined) updatedEnquiryDetails.bank = bank;
    if (totalProjectCost !== undefined) updatedEnquiryDetails.totalProjectCost = totalProjectCost;
    if (dcrInvoice !== undefined) updatedEnquiryDetails.dcrInvoice = dcrInvoice;
    if (receivedAmount !== undefined) updatedEnquiryDetails.receivedAmount = receivedAmount;
    if (pendingAmount !== undefined) updatedEnquiryDetails.pendingAmount = pendingAmount;
    if (tat !== undefined) updatedEnquiryDetails.tat = tat;
    if (remark !== undefined) updatedEnquiryDetails.remark = remark; 
    lead.enquiryDetails = updatedEnquiryDetails;

    if (remark) {
        lead.remarks.push({ text: remark, addedBy: req.user.id });
    }
    
    await lead.save();

    lead = await leadModel.findById(id)
      .populate("assignedTo", "fullName email role")
      .populate("createdBy", "fullName email role");

    res.status(200).json({
      message: "Lead enquiry details updated successfully by field executive",
      lead,
    });
  } catch (err) {
    console.error("❌ Error updating lead enquiry details by executive:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark, nextFollowUpDate } = req.body;

    let lead = await leadModel.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (req.user.role === 'fieldexecutive' && lead.assignedTo && lead.assignedTo.toString() !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to update this lead's status" });
    }

    if (status) {
        updateLeadStatus(lead, status, remark || `Status updated by field executive to ${status}.`, req.user.id, req.user.role, nextFollowUpDate);

        if (status === 'loan_required') {
            const loanAdmin = await User.findOne({ role: 'loan_admin' }).sort({ createdAt: 1 }); 
            if (loanAdmin) {
                lead.assignedTo = loanAdmin._id;
                updateLeadStatus(lead, 'assigned_to_loanadmin', `Lead automatically assigned to Loan Admin (${loanAdmin.fullName}) as loan is required.`, req.user.id, req.user.role);
            } else {
                console.warn("No Loan Admin found for automatic assignment of lead:", lead._id);
            }
        }

    } else if (remark) {
        lead.remarks.push({ text: remark, addedBy: req.user.id });
    }
    
    await lead.save();
    res.status(200).json({ message: "Status updated", lead });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ message: "Server error" });
  }
};