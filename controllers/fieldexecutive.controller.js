const leadModel = require("../models/lead.model");

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
    // Update nextFollowUpDate
    if (newStatus === "fe_rescheduled_followup" && nextFollowUpDate) {
        lead.nextFollowUpDate = nextFollowUpDate;
    } else if (newStatus !== "fe_rescheduled_followup") {
        lead.nextFollowUpDate = undefined;
    }
};

exports.getMyLeads = async (req, res) => {
  try {
    const feId = req.user.id; // वर्तमान फील्ड एग्जीक्यूटिव की ID
        
    const leads = await leadModel.find({
      $or: [
        { assignedTo: feId },
        { "statusHistory.updatedBy": feId }, // FE ने कभी स्टेटस अपडेट किया हो
        { "remarks.addedBy": feId }          // FE ने कभी कोई रिमार्क जोड़ा हो
      ]
    })
      .populate("createdBy", "fullName email role")
      .populate("assignedTo", "fullName email role")
      .populate("statusHistory.updatedBy", "fullName email role") // statusHistory में अपडेट करने वाले को पॉपुलेट करें
      .populate("remarks.addedBy", "fullName email role"); // remarks में ऐड करने वाले को पॉपुलेट करें

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
      receivedAmount, pendingAmount, tat, remark // Status removed from general updateEnquiryDetails
    } = req.body;

    let lead = await leadModel.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // Allow only currently assigned FE or SuperAdmin/Admin to update enquiry details
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
    if (remark !== undefined) updatedEnquiryDetails.remark = remark; // Update remark in enquiryDetails directly if applicable
    lead.enquiryDetails = updatedEnquiryDetails;

    // Only remark added without status change, if status is not provided separately.
    // If FE updates a field and adds a remark, the remark is pushed to general remarks.
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

    // Allow only currently assigned FE or SuperAdmin/Admin to update status
    if (req.user.role === 'fieldexecutive' && lead.assignedTo && lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this lead's status" });
    }

    if (status) {
        updateLeadStatus(lead, status, remark || `Status updated by field executive to ${status}.`, req.user.id, req.user.role, nextFollowUpDate);
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