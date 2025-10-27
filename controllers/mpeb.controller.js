const leadModel = require("../models/lead.model");
// const { leadModel, documentSchema } = require("../models/lead.model");
const { fieldMap } = require('./loan.controller'); // Document types are shared

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
    const mpebAdminId = req.user.id; // वर्तमान MPEB Admin की ID

    // एक लीड को फेच करें यदि:
    // 1. वह वर्तमान में MPEB Admin को असाइन की गई है।
    // 2. या MPEB Admin ने उस लीड के statusHistory में कोई अपडेट किया है।
    // 3. या MPEB Admin ने उस लीड पर कोई remark जोड़ा है।

    const leads = await leadModel.find({
      $or: [
        { assignedTo: mpebAdminId },
        { "statusHistory.updatedBy": mpebAdminId },
        { "remarks.addedBy": mpebAdminId }
      ],
      // MPEB से संबंधित स्टेटस वाली लीड्स को फिल्टर करें,
      // या यदि assignedTo MPEB Admin है, तो सभी स्टेटस वाली लीड्स दिखें
      // (यह वर्कफ्लो पर निर्भर करता है, अभी $or कंडीशन के साथ assignedTo को प्राथमिकता दी है)
    })
      .populate("createdBy", "fullName email role")
      .populate("assignedTo", "fullName email role")
      .populate("statusHistory.updatedBy", "fullName email role") // statusHistory में अपडेट करने वाले को पॉपुलेट करें
      .populate("remarks.addedBy", "fullName email role"); // remarks में ऐड करने वाले को पॉपुलेट करें

    // Frontend DataTable के लिए 'data' और 'total' फॉर्मेट में भेजें
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

    // Ensure mpebDetails exists and its documents array is initialized
    if (!lead.mpebDetails) {
      lead.mpebDetails = {};
    }
    if (!lead.mpebDetails.documents) {
      lead.mpebDetails.documents = [];
    }

    // सीधे documentSchema से enum को एक्सेस करें
    const allowedDocTypes = leadModel.schema
      .path('mpebDetails.documents')
      .schema.path('type').enumValues;

    // Process each uploaded file
    for (const field of Object.keys(req.files)) {
      const docType = field; // Multer sends the actual field name (e.g., "aadhaarFile")
      const file = req.files[field][0]; // Get the first file from the array

      // Validate docType against allowedDocTypes enum
      if (!allowedDocTypes.includes(docType)) {
        console.warn(`Attempted to upload document with invalid type: ${docType}. Skipping.`);
        return res.status(400).json({ message: `Invalid document type: ${docType}. Please ensure the document type is valid.` });
      }

      // Find if a document of this type already exists in mpebDetails.documents
      const existingDocIndex = lead.mpebDetails.documents.findIndex(d => d.type === docType);

      if (existingDocIndex > -1) {
        // Update existing document
        lead.mpebDetails.documents[existingDocIndex].url = file.location;
        lead.mpebDetails.documents[existingDocIndex].uploadedBy = req.user.id;
        lead.mpebDetails.documents[existingDocIndex].uploadedAt = new Date();
        lead.mpebDetails.documents[existingDocIndex].verificationStatus = "pending"; // Reset status on re-upload
      } else {
        // Add new document
        lead.mpebDetails.documents.push({
          type: docType,
          url: file.location,
          uploadedBy: req.user.id,
          uploadedAt: new Date(),
          verificationStatus: "pending"
        });
      }
    }

    // Update status based on MPEB document collection
    if (lead.status === "assigned_to_mpebadmin" || lead.status === "mpeb_application_scheduled" || lead.status === "mpeb_docs_collected") {
      updateLeadStatus(lead, "mpeb_docs_collected", "MPEB documents collected/uploaded.", req.user.id, req.user.role);
    } else {
      updateLeadStatus(lead, lead.status, "MPEB additional documents uploaded.", req.user.id, req.user.role);
    }

    await lead.save(); // Save the lead document
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
      .populate("mpebDetails.documents.uploadedBy", "fullName email role") // Populate uploader
      .populate("mpebDetails.documents.verifiedBy", "fullName email role"); // Populate verifier

    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const docs = lead.mpebDetails?.documents?.map(doc => ({
      id: doc._id,
      type: doc.type,
      url: doc.url,
      verificationStatus: doc.verificationStatus || "not_verified",
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploadedBy // Populated user object
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
    doc.reason = reason; // Add reason for rejection

    // Check if all documents are verified before setting overall MPEB status
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

    // केवल असाइन किए गए MPEB Admin को स्टेटस अपडेट करने की अनुमति दें (या SuperAdmin/Admin)
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


// New function for MPEB admin to update status with specific fields
exports.updateMpebLeadStatus = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status, remark, applicationDate, approvalDate, inspectionDate, statusReason } = req.body;

    let lead = await leadModel.findById(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // Ensure MPEB admin is assigned to this lead if that's a requirement
    // For now, let's assume if they can access this endpoint, they are authorized.
    // if (lead.assignedTo && lead.assignedTo.toString() !== req.user.id) {
    //   return res.status(403).json({ message: "Not authorized to update this MPEB lead status" });
    // }

    if (!lead.mpebDetails) {
      lead.mpebDetails = {};
    }

    // Update MPEB specific details
    if (applicationDate) lead.mpebDetails.applicationDate = applicationDate;
    if (approvalDate) lead.mpebDetails.approvalDate = approvalDate;
    if (inspectionDate) lead.mpebDetails.inspectionDate = inspectionDate;
    if (statusReason) lead.mpebDetails.statusReason = statusReason;

    // Update main status, history, and role-specific status
    if (status) {
      updateLeadStatus(lead, status, remark || `MPEB status updated to ${status}.`, req.user.id, req.user.role);
    } else if (remark) {
      lead.remarks.push({ text: remark, addedBy: req.user.id });
    }

    await lead.save();

    // Re-populate for response if needed
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