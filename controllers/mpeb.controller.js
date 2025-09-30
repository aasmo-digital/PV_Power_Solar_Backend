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


const leadModel = require("../models/lead.model");

exports.getMyMpebRequests = async (req, res) => {
  try {
    const leads = await leadModel.find({ assignedTo: req.user.id, status: "mpeb-process" })
      .populate("createdBy", "fullName email role")
      .populate("assignedTo", "fullName email role");

    res.status(200).json({ leads });
  } catch (err) {
    console.error("❌ Error fetching my MPEB requests:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateMpebStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark, applicationDate, approvalDate } = req.body; // Add these to lead model if needed

    let lead = await leadModel.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this MPEB status" });
    }

    lead.status = status; // e.g., "mpeb-application-submitted", "mpeb-approved", "mpeb-rejected"
    if (remark) lead.remarks.push({ text: remark, addedBy: req.user.id });
    // if (applicationDate) lead.mpebApplicationDate = applicationDate; // Add to lead model if needed
    // if (approvalDate) lead.mpebApprovalDate = approvalDate; // Add to lead model if needed

    await lead.save();
    res.status(200).json({ message: "MPEB status updated", lead });
  } catch (err) {
    console.error("❌ Error updating MPEB status:", err);
    res.status(500).json({ message: "Server error" });
  }
};