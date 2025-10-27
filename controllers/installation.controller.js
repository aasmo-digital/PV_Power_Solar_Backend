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

const normalizePhaseNameForEnum = (phaseName) => {
    return phaseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
};

exports.getMyInstallations = async (req, res) => {
    try {
        const installationAdminId = req.user.id;

        const leads = await leadModel.find({
            $or: [
                { assignedTo: installationAdminId },
                { "statusHistory.updatedBy": installationAdminId },
                { "remarks.addedBy": installationAdminId }
            ],
        })
            .populate("createdBy", "fullName email role")
            .populate("assignedTo", "fullName email role")
            .populate("statusHistory.updatedBy", "fullName email role")
            .populate("remarks.addedBy", "fullName email role")
            .populate("installationDetails.assignedTechnicians.addedBy", "fullName email role");


        res.status(200).json({ data: leads, total: leads.length });
    } catch (err) {
        console.error("❌ Error fetching my installations:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getInstallationDetails = async (req, res) => {
    try {
        const { leadId } = req.params;
        const lead = await leadModel.findById(leadId)
            .populate("createdBy", "fullName email role")
            .populate("assignedTo", "fullName email role")
            .populate("installationDetails.assignedTechnicians.addedBy", "fullName email role")
            .populate("installationDetails.phases.updatedBy", "fullName email role")
            .populate("installationDetails.phases.documents.uploadedBy", "fullName email role");

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        // Authorization check for Installation Admin to view details
        if (req.user.role === 'installation_admin' && lead.assignedTo && lead.assignedTo.toString() !== req.user.id && !lead.statusHistory.some(h => h.updatedBy.toString() === req.user.id)) {
            // Allow if currently assigned OR has worked on it before
            // We'll allow Superadmin and Admin through middleware, so this check is primarily for the specific admin
        }

        res.status(200).json({ data: lead });
    } catch (err) {
        console.error("❌ Error fetching installation details:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.addInstallationTechnicians = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { fullName, contactNo, specialty } = req.body;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // --- MODIFIED AUTHORIZATION LOGIC ---
        // This check ensures that only an 'installation_admin' can proceed.
        // The previous condition requiring the lead to be *assigned* to the specific admin (lead.assignedTo.toString() !== req.user.id)
        // has been removed. This means any logged-in installation_admin can now add technicians to any installation lead.
        if (req.user.role !== 'installation_admin') {
            return res.status(403).json({ message: "Not authorized. Only Installation Admins can modify technicians." });
        }
        // --- END MODIFIED AUTHORIZATION LOGIC ---

        if (!fullName || !contactNo) {
            return res.status(400).json({ message: "Technician full name and contact number are required." });
        }

        if (!lead.installationDetails) {
            lead.installationDetails = {};
        }
        if (!lead.installationDetails.assignedTechnicians) {
            lead.installationDetails.assignedTechnicians = [];
        }

        // Check if a technician with the same contact number already exists for this lead
        const existingTechnician = lead.installationDetails.assignedTechnicians.some(
            tech => tech.contactNo === contactNo
        );

        if (existingTechnician) {
            return res.status(400).json({ message: "Technician with this contact number is already assigned to this lead." });
        }

        const newTechnician = {
            fullName,
            contactNo,
            specialty: specialty || '',
            addedBy: req.user.id,
            addedAt: new Date()
        };

        lead.installationDetails.assignedTechnicians.push(newTechnician);

        // Update lead status, but keep its current main status as the change is internal to installationDetails
        updateLeadStatus(lead, lead.status, `Added new technician: ${fullName}.`, req.user.id, req.user.role);
        await lead.save();

        const updatedLead = await leadModel.findById(leadId) // Re-populate for response
            .populate("installationDetails.assignedTechnicians.addedBy", "fullName email role");

        res.status(200).json({ message: "Technician added successfully", lead: updatedLead });
    } catch (err) {
        console.error("❌ Error adding installation technician:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.removeInstallationTechnician = async (req, res) => {
    try {
        const { leadId, technicianId } = req.params;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        if (req.user.role === 'installation_admin' && lead.assignedTo && lead.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to modify technicians for this lead." });
        }

        if (!lead.installationDetails || !lead.installationDetails.assignedTechnicians) {
            return res.status(404).json({ message: "No technicians assigned to this lead." });
        }

        const initialLength = lead.installationDetails.assignedTechnicians.length;
        lead.installationDetails.assignedTechnicians = lead.installationDetails.assignedTechnicians.filter(
            tech => tech._id.toString() !== technicianId
        );

        if (lead.installationDetails.assignedTechnicians.length === initialLength) {
            return res.status(404).json({ message: "Technician not found for this lead." });
        }

        updateLeadStatus(lead, lead.status, `Removed a technician.`, req.user.id, req.user.role);
        await lead.save();

        const updatedLead = await leadModel.findById(leadId) // Re-populate for response
            .populate("installationDetails.assignedTechnicians.addedBy", "fullName email role");

        res.status(200).json({ message: "Technician removed successfully", lead: updatedLead });
    } catch (err) {
        console.error("❌ Error removing installation technician:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateInstallationStatus = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { status, remark, scheduleDate, completionDate, statusReason } = req.body;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // --- MODIFIED AUTHORIZATION LOGIC ---
        // This check ensures that only an 'installation_admin' can proceed.
        // The previous condition requiring the lead to be *assigned* to the specific admin (lead.assignedTo.toString() !== req.user.id)
        // has been removed. This means any logged-in installation_admin can now update the overall status for any installation lead.
        if (req.user.role !== 'installation_admin') {
            return res.status(403).json({ message: "Not authorized. Only Installation Admins can update this installation status." });
        }
        // --- END MODIFIED AUTHORIZATION LOGIC ---

        if (!lead.installationDetails) {
            lead.installationDetails = {};
        }

        if (scheduleDate !== undefined) lead.installationDetails.scheduleDate = scheduleDate;
        if (completionDate !== undefined) lead.installationDetails.completionDate = completionDate;
        if (statusReason !== undefined) lead.installationDetails.statusReason = statusReason;

        if (status) {
            updateLeadStatus(lead, status, remark || `Installation status updated to ${status}.`, req.user.id, req.user.role);
        } else if (remark) {
            // If only a remark is provided without a status change, add it to general remarks
            lead.remarks.push({ text: remark, addedBy: req.user.id });
        }

        await lead.save();
        res.status(200).json({ message: "Installation status updated", lead });
    } catch (err) {
        console.error("❌ Error updating installation status:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateInstallationPhase = async (req, res) => {
    try {
        const { leadId, phaseId } = req.params;
        const { name, status, remark, isNewPhase } = req.body;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // --- MODIFIED AUTHORIZATION LOGIC ---
        // This check ensures that only an 'installation_admin' can proceed.
        // The previous condition requiring the lead to be *assigned* to the specific admin (lead.assignedTo.toString() !== req.user.id)
        // has been removed. This means any logged-in installation_admin can now manage phases for any installation lead.
        if (req.user.role !== 'installation_admin') {
            return res.status(403).json({ message: "Not authorized. Only Installation Admins can manage installation phases." });
        }
        // --- END MODIFIED AUTHORIZATION LOGIC ---

        if (!lead.installationDetails) {
            lead.installationDetails = {};
        }
        if (!lead.installationDetails.phases) {
            lead.installationDetails.phases = [];
        }

        let phase;
        if (isNewPhase === 'true') {
            if (!name) return res.status(400).json({ message: "Phase name is required for a new phase." });
            phase = {
                name: name,
                status: status || "pending",
                updatedBy: req.user.id,
                updatedAt: new Date(),
                remark: remark,
                documents: []
            };
            lead.installationDetails.phases.push(phase);
            phase = lead.installationDetails.phases[lead.installationDetails.phases.length - 1];
        } else {
            phase = lead.installationDetails.phases.id(phaseId);
            if (!phase) return res.status(404).json({ message: "Installation phase not found." });

            if (name) phase.name = name;
            if (status) phase.status = status;
            if (remark) phase.remark = remark;
            phase.updatedBy = req.user.id;
            phase.updatedAt = new Date();
        }

        // Handle document uploads for the phase
        if (req.files && Object.keys(req.files).length > 0) {
            if (!phase.documents) phase.documents = [];
            for (const field in req.files) {
                const docType = fieldMap[field] || field;
                const file = req.files[field][0];
                if (docType && file) {
                    const existingDocIndex = phase.documents.findIndex(d => d.type === docType);
                    if (existingDocIndex > -1) {
                        phase.documents[existingDocIndex].url = file.location;
                        phase.documents[existingDocIndex].uploadedBy = req.user.id;
                        phase.documents[existingDocIndex].uploadedAt = new Date();
                        phase.documents[existingDocIndex].verificationStatus = "pending"; // Reset status on re-upload
                    } else {
                        phase.documents.push({
                            type: docType,
                            url: file.location,
                            uploadedBy: req.user.id,
                            uploadedAt: new Date(),
                            verificationStatus: "pending"
                        });
                    }
                }
            }
        }

        // Update overall lead status based on phase status - MODIFIED
        let newLeadOverallStatus = lead.status;
        const normalizedPhaseName = normalizePhaseNameForEnum(phase.name); // Use helper

        if (status === "completed") {
            const allPhasesCompleted = lead.installationDetails.phases.every(p => p.status === "completed");
            if (allPhasesCompleted) {
                newLeadOverallStatus = "installation_completed_final";
                lead.installationDetails.completionDate = new Date();
            } else {
                newLeadOverallStatus = `installation_${normalizedPhaseName}_completed`;
            }
        } else if (status === "in-progress") {
            newLeadOverallStatus = `installation_${normalizedPhaseName}_started`;
        } else if (status === "halted") {
            newLeadOverallStatus = "installation_halted"; // Use a generic halted for phases
        } else if (status === "pending" && isNewPhase === 'true') {
            newLeadOverallStatus = "installation_scheduled"; // Initial state for new phase
        }

        updateLeadStatus(lead, newLeadOverallStatus, remark || `Installation phase "${phase.name}" ${isNewPhase === 'true' ? 'added' : 'updated'}. Status: ${status}.`, req.user.id, req.user.role);


        await lead.save();
        const updatedLead = await leadModel.findById(leadId) // Re-populate for response
            .populate("installationDetails.phases.updatedBy", "fullName email role")
            .populate("installationDetails.phases.documents.uploadedBy", "fullName email role")
            .populate("installationDetails.assignedTechnicians.addedBy", "fullName email role");

        res.status(200).json({ message: `Installation phase ${isNewPhase === 'true' ? 'added' : 'updated'} successfully`, lead: updatedLead });

    } catch (err) {
        console.error("❌ Error updating installation phase:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteInstallationPhase = async (req, res) => {
    try {
        const { leadId, phaseId } = req.params;

        let lead = await leadModel.findById(leadId);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        // --- MODIFIED AUTHORIZATION LOGIC ---
        // This check ensures that only an 'installation_admin' can proceed.
        // The previous condition requiring the lead to be *assigned* to the specific admin (lead.assignedTo.toString() !== req.user.id)
        // has been removed. This means any logged-in installation_admin can now delete phases for any installation lead.
        if (req.user.role !== 'installation_admin') {
            return res.status(403).json({ message: "Not authorized. Only Installation Admins can delete installation phases." });
        }
        // --- END MODIFIED AUTHORIZATION LOGIC ---

        if (!lead.installationDetails || !lead.installationDetails.phases) {
            return res.status(404).json({ message: "No installation phases found for this lead." });
        }

        const initialLength = lead.installationDetails.phases.length;
        lead.installationDetails.phases = lead.installationDetails.phases.filter(
            phase => phase._id.toString() !== phaseId
        );

        if (lead.installationDetails.phases.length === initialLength) {
            return res.status(404).json({ message: "Installation phase not found for this lead." });
        }

        updateLeadStatus(lead, lead.status, `Deleted an installation phase.`, req.user.id, req.user.role);
        await lead.save();

        const updatedLead = await leadModel.findById(leadId) // Re-populate for response
            .populate("installationDetails.phases.updatedBy", "fullName email role");

        res.status(200).json({ message: "Installation phase deleted successfully", lead: updatedLead });
    } catch (err) {
        console.error("❌ Error deleting installation phase:", err);
        res.status(500).json({ message: "Server error" });
    }
};