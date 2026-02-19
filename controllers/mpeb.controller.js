const leadModel = require("../models/lead.model");
const User = require("../models/user.model");
const { fieldMap } = require('./loan.controller');

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

exports.getMyMpebRequests = async (req, res) => {
  try {
    const mpebAdminId = req.user.id;

    const leads = await leadModel.find({
      $or: [
        { assignedTo: mpebAdminId },
        { "statusHistory.updatedBy": mpebAdminId },
        { "remarks.addedBy": mpebAdminId }
      ],
    })
      .populate("createdBy", "fullName email role")
      .populate("assignedTo", "fullName email role")
      .populate("statusHistory.updatedBy", "fullName email role")
      .populate("remarks.addedBy", "fullName email role");

    res.status(200).json({ data: leads, total: leads.length });
  } catch (err) {
    console.error("❌ Error fetching my MPEB requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.uploadMpebDocuments = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await leadModel.findById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (req.user.role === 'mpeb_admin' && lead.assignedTo && lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to upload documents for this lead." });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    if (!lead.mpebDetails) {
      lead.mpebDetails = {};
    }
    if (!lead.mpebDetails.documents) {
      lead.mpebDetails.documents = [];
    }

    const allowedDocTypes = leadModel.schema
      .path('mpebDetails.documents')
      .schema.path('type').enumValues;

    for (const field of Object.keys(req.files)) {
      const docType = field;
      const file = req.files[field][0];

      if (!allowedDocTypes.includes(docType)) {
        console.warn(`Attempted to upload document with invalid type: ${docType}. Skipping.`);
        return res.status(400).json({ message: `Invalid document type: ${docType}. Please ensure the document type is valid.` });
      }

      const existingDocIndex = lead.mpebDetails.documents.findIndex(d => d.type === docType);

      if (existingDocIndex > -1) {
        lead.mpebDetails.documents[existingDocIndex].url = file.location;
        lead.mpebDetails.documents[existingDocIndex].uploadedBy = req.user.id;
        lead.mpebDetails.documents[existingDocIndex].uploadedAt = new Date();
        lead.mpebDetails.documents[existingDocIndex].verificationStatus = "pending";
      } else {
        lead.mpebDetails.documents.push({
          type: docType,
          url: file.location,
          uploadedBy: req.user.id,
          uploadedAt: new Date(),
          verificationStatus: "pending"
        });
      }
    }

    if (lead.status === "assigned_to_mpebadmin" || lead.status === "mpeb_application_scheduled" || lead.status === "mpeb_docs_collected") {
      updateLeadStatus(lead, "mpeb_docs_collected", "MPEB documents collected/uploaded.", req.user.id, req.user.role);
    } else {
      updateLeadStatus(lead, lead.status, "MPEB additional documents uploaded.", req.user.id, req.user.role);
    }

    await lead.save();
    res.status(200).json({ message: "MPEB documents uploaded successfully", lead });

  } catch (err) {
    if (err.name === 'ValidationError') {
      console.error("❌ MPEB Upload doc validation error:", err.message, err.errors);
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: "Validation failed:", errors: errors });
    }
    console.error("❌ MPEB Upload doc error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getMpebDocuments = async (req, res) => {
  try {
    const { leadId } = req.params;
    const lead = await leadModel.findById(leadId).select("mpebDetails.documents")
      .populate("mpebDetails.documents.uploadedBy", "fullName email role")
      .populate("mpebDetails.documents.verifiedBy", "fullName email role");

    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const docs = lead.mpebDetails?.documents?.map(doc => ({
      id: doc._id,
      type: doc.type,
      url: doc.url,
      verificationStatus: doc.verificationStatus || "not_verified",
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy
    })) || [];

    res.status(200).json({
      leadId,
      documents: docs
    });
  } catch (err) {
    console.error("❌ Get MPEB documents error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyMpebDocument = async (req, res) => {
  try {
    const { leadId, docId } = req.params;
    const { verificationStatus, reason } = req.body;

    const lead = await leadModel.findById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (req.user.role === 'mpeb_admin' && lead.assignedTo && lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to verify documents for this lead." });
    }

    const doc = lead.mpebDetails?.documents?.id(docId);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    doc.verificationStatus = verificationStatus;
    doc.verifiedBy = req.user.id;
    doc.verifiedAt = new Date();
    doc.reason = reason;

    const allMpebDocsVerified = lead.mpebDetails.documents.every(d => d.verificationStatus === "verified");

    if (allMpebDocsVerified) {
      updateLeadStatus(lead, "mpeb_docs_collected", "All MPEB documents verified.", req.user.id, req.user.role);
    } else if (verificationStatus === "rejected") {
      updateLeadStatus(lead, "mpeb_rejected", reason || "MPEB document rejected.", req.user.id, req.user.role);
    } else {
      updateLeadStatus(lead, "mpeb_docs_collected", "MPEB document verification status updated.", req.user.id, req.user.role);
    }

    await lead.save();
    res.status(200).json({ message: "MPEB document verification status updated", lead });
  } catch (err) {
    console.error("❌ Verify MPEB document error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateMpebStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark, applicationDate, approvalDate, inspectionDate, statusReason } = req.body;

    let lead = await leadModel.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (req.user.role === 'mpeb_admin' && lead.assignedTo && lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this MPEB status" });
    }

    if (!lead.mpebDetails) {
      lead.mpebDetails = {};
    }
    if (applicationDate) lead.mpebDetails.applicationDate = applicationDate;
    if (approvalDate) lead.mpebDetails.approvalDate = approvalDate;
    if (inspectionDate) lead.mpebDetails.inspectionDate = inspectionDate;
    if (statusReason) lead.mpebDetails.statusReason = statusReason;

    if (status) {
      updateLeadStatus(lead, status, remark || `MPEB status updated to ${status}.`, req.user.id, req.user.role);
    }
    if (remark && (!status || remark !== lead.remarks[lead.remarks.length - 1]?.text)) {
      lead.remarks.push({ text: remark, addedBy: req.user.id });
    }

    await lead.save();
    res.status(200).json({ message: "MPEB status updated", lead });
  } catch (err) {
    console.error("❌ Error updating MPEB status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateMpebLeadStatus = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status, remark, applicationDate, approvalDate, inspectionDate, statusReason } = req.body;

    let lead = await leadModel.findById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (!lead.mpebDetails) {
      lead.mpebDetails = {};
    }

    if (applicationDate) lead.mpebDetails.applicationDate = applicationDate;
    if (approvalDate) lead.mpebDetails.approvalDate = approvalDate;
    if (inspectionDate) lead.mpebDetails.inspectionDate = inspectionDate;
    if (statusReason) lead.mpebDetails.statusReason = statusReason;

    if (status) {
      updateLeadStatus(lead, status, remark || `MPEB status updated to ${status}.`, req.user.id, req.user.role);

      if (status === "mpeb_approved") {
        const installationAdmin = await User.findOne({ role: 'installation_admin' }).sort({ createdAt: 1 });
        if (installationAdmin) {
          lead.assignedTo = installationAdmin._id;
          updateLeadStatus(lead, 'assigned_to_installationadmin', `Lead automatically assigned to Installation Admin (${installationAdmin.fullName}) as MPEB is approved.`, req.user.id, req.user.role);
        } else {
          console.warn("No Installation Admin found for automatic assignment of lead:", lead._id);
        }
      }

    } else if (remark) {
      lead.remarks.push({ text: remark, addedBy: req.user.id });
    }

    await lead.save();

    lead = await leadModel.findById(leadId)
      .populate("createdBy", "fullName email role")
      .populate("assignedTo", "fullName email role")
      .populate("statusHistory.updatedBy", "fullName email role")
      .populate("remarks.addedBy", "fullName email role");

    res.status(200).json({ message: "MPEB lead status updated successfully", lead });
  } catch (err) {
    console.error("❌ Error updating MPEB lead status:", err);
    res.status(500).json({ message: "Server error occurred while updating MPEB lead status." });
  }
};