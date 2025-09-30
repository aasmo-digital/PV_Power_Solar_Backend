// const leadModel = require("../models/lead.model");

// exports.getMyLeads = async (req, res) => {
//   try {
//     const leads = await leadModel.find({ assignedTo: req.user.id })
//       .populate("createdBy", "fullName email role")
//       .populate("assignedTo", "fullName email role");

//     res.status(200).json({ leads });
//   } catch (err) {
//     console.error("❌ Error fetching my leads:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


// // fieldexecutive.controller.js
// exports.updateStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, remark, nextFollowUpDate } = req.body;

//     let lead = await leadModel.findById(id);
//     if (!lead) return res.status(404).json({ message: "Lead not found" });

//     if (lead.assignedTo.toString() !== req.user.id) {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     if (status) lead.status = status;
//     if (remark) lead.remarks.push({ text: remark, addedBy: req.user.id });
//     if (status === "rescheduled" && nextFollowUpDate) {
//       lead.nextFollowUpDate = nextFollowUpDate;
//     }

//     await lead.save();
//     res.status(200).json({ message: "Status updated", lead });
//   } catch (err) {
//     console.error("❌ Error updating status:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };


const leadModel = require("../models/lead.model");

exports.getMyLeads = async (req, res) => {
  try {
    const leads = await leadModel.find({ assignedTo: req.user.id })
      .populate("createdBy", "fullName email role")
      .populate("assignedTo", "fullName email role");

    res.status(200).json({ leads });
  } catch (err) {
    console.error("❌ Error fetching my leads:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateEnquiryDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      promoter,
      mobileNo,
      structureType,
      customerName,
      plantType,
      kwRequired,
      account1,
      mpeb1,
      portal1,
      bank,
      totalProjectCost,
      dcrInvoice,
      receivedAmount,
      pendingAmount,
      tat,
      status, // Field executive can also update general status
      remark,
      nextFollowUpDate // <--- यह नया फ़ील्ड जोड़ा गया
    } = req.body;

    let lead = await leadModel.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // ✅ Sirf apna lead update kar sakta hai
    if (lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this lead" });
    }

    // ✅ Enquiry details update (partial allowed)
    // Only update fields that are provided in the request body
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

    lead.enquiryDetails = updatedEnquiryDetails;

    // ✅ Status update (Field executive can change status, e.g., to "loan-process", "mpeb-process" etc.)
    if (status) lead.status = status;

    // ✅ Remark add
    if (remark) {
      lead.remarks.push({ text: remark, addedBy: req.user.id });
    }

    // ✅ nextFollowUpDate को अपडेट करें यदि स्टेटस 'rescheduled' है
    if (status === "rescheduled" && nextFollowUpDate) {
      lead.nextFollowUpDate = nextFollowUpDate;
    } else if (status !== "rescheduled") {
      lead.nextFollowUpDate = undefined; // यदि स्टेटस 'rescheduled' नहीं है तो इसे हटा दें
    }

    await lead.save();

    // ✅ Populate data for response
    lead = await leadModel.findById(id)
      .populate("assignedTo", "fullName email role")
      .populate("createdBy", "fullName email role");

    res.status(200).json({
      message: "Lead updated successfully by field executive",
      lead,
    });
  } catch (err) {
    console.error("❌ Error updating lead by executive:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Field executive can update general status (e.g., 'in-progress', 'rescheduled', 'converted', 'rejected')
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark, nextFollowUpDate } = req.body;

    let lead = await leadModel.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this lead's status" });
    }

    if (status) lead.status = status;
    if (remark) lead.remarks.push({ text: remark, addedBy: req.user.id });
    if (status === "rescheduled" && nextFollowUpDate) {
      lead.nextFollowUpDate = nextFollowUpDate; // Make sure your Lead model has nextFollowUpDate
    } else if (status !== "rescheduled") {
      lead.nextFollowUpDate = undefined; // यदि स्टेटस 'rescheduled' नहीं है तो इसे हटा दें
    }

    await lead.save();
    res.status(200).json({ message: "Status updated", lead });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ message: "Server error" });
  }
};