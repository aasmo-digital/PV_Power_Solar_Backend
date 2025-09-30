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

exports.getMyInstallations = async (req, res) => {
  try {
    const leads = await leadModel.find({ assignedTo: req.user.id, status: "installation" })
      .populate("createdBy", "fullName email role")
      .populate("assignedTo", "fullName email role");

    res.status(200).json({ leads });
  } catch (err) {
    console.error("❌ Error fetching my installations:", err);
    res.status(500).json({ message: "Server error" });
  }
};
  
exports.updateInstallationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark, installationDate } = req.body; // installationDate can be added to lead model

    let lead = await leadModel.findById(id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    if (lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this installation status" });
    }

    lead.status = status; // e.g., "installation-scheduled", "installation-completed"
    if (remark) lead.remarks.push({ text: remark, addedBy: req.user.id });
    // if (installationDate) lead.installationDate = installationDate; // Add to lead model if needed

    await lead.save();
    res.status(200).json({ message: "Installation status updated", lead });
  } catch (err) {
    console.error("❌ Error updating installation status:", err);
    res.status(500).json({ message: "Server error" });
  }
};