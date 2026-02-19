const Lead = require("../models/lead.model");
const User = require("../models/user.model");
const CustomOption = require('../models/customOption.model');

const WORKFLOW_STAGES = [
    'plant_1', 'mpeb_1', 'account_1', 'portal_1', 'bank', 'loan_1',
    'installation_1', 'account_2', 'portal_2', 'installation_2',
    'account_3', 'mpeb_2', 'meter_sn', 'loan_2', 'account_4', 'portal_3',
    'dcr_invoice', 'completed'
];

const STAGE_ROLE_MAP = {
    plant_1: 'fieldexecutive',
    mpeb_1: 'mpeb_admin',
    account_1: 'accounting_admin',
    portal_1: 'admin',
    bank: 'admin',
    loan_1: 'loan_admin',
    installation_1: 'installation_admin',
    account_2: 'accounting_admin',
    portal_2: 'admin',
    installation_2: 'installation_admin',
    account_3: 'accounting_admin',
    mpeb_2: 'mpeb_admin',
    meter_sn: 'installation_admin',
    loan_2: 'loan_admin',
    account_4: 'accounting_admin',
    portal_3: 'admin',
    dcr_invoice: 'accounting_admin',
};

const getNextStage = (currentStage, paymentType) => {
    const currentIndex = WORKFLOW_STAGES.indexOf(currentStage);
    if (currentIndex === -1 || currentIndex >= WORKFLOW_STAGES.length - 1) {
        return 'completed';
    }

    let nextIndex = currentIndex + 1;
    let nextStage = WORKFLOW_STAGES[nextIndex];

    if (paymentType === 'Cash' && (nextStage === 'loan_1' || nextStage === 'loan_2')) {
        return getNextStage(nextStage, paymentType);
    }

    return nextStage;
};

const findUserForRole = async (role) => {
    if (!role) return null;
    return await User.findOne({ role: role });
};

const formatValue = (value) => value ? String(value).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'N/A';

exports.createLead = async (req, res) => {
    try {
        const leadData = req.body;
        const newLead = new Lead({
            ...leadData,
            createdBy: req.user.id,
            currentStage: 'plant_1',
            plant_1: { status: 'Pending' },
        });

        newLead.statusHistory.push({
            stage: 'System',
            status: 'Lead Created',
            remark: `Lead created by ${req.user.fullName || 'user'}.`,
            updatedBy: req.user.id,
            updatedAt: new Date()
        });

        const initialAssignee = await findUserForRole('fieldexecutive');
        if (initialAssignee) {
            newLead.assignedTo = initialAssignee._id;
            newLead.statusHistory.push({
                stage: 'System',
                status: `Assigned to ${initialAssignee.fullName}`,
                remark: 'Initial assignment to Field Executive.',
                updatedBy: req.user.id,
                updatedAt: new Date()
            });
        }

        await newLead.save();
        res.status(201).json({ message: "Lead created successfully", data: newLead });
    } catch (err) {
        console.error("Error creating lead:", err);
        res.status(500).json({ message: "Server error occurred while creating lead." });
    }
};

exports.getAllLeads = async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortDirection = 'desc', ...filters } = req.query;

        let query = {};
        const { role, id } = req.user;

        if (!['superadmin', 'admin', 'telecaller'].includes(role)) {
            query = {
                $or: [
                    { assignedTo: id },
                    { 'statusHistory.updatedBy': id }
                ]
            };
        }

        if (filters.name) query.name = { $regex: filters.name, $options: 'i' };
        if (filters.leadNo) query.leadNo = { $regex: filters.leadNo, $options: 'i' };
        if (filters.status) query.currentStage = filters.status;
        if (filters.currentStage) query.currentStage = filters.currentStage;

        if (filters.phone) {
            query.contactNumber = { $regex: filters.phone, $options: 'i' };
        }

        const leads = await Lead.find(query)
            .populate('createdBy', 'fullName role')
            .populate('assignedTo', 'fullName role')
            .populate('statusHistory.updatedBy', 'fullName')
            .sort({ [sortBy]: sortDirection === 'desc' ? -1 : 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Lead.countDocuments(query);

        res.status(200).json({ data: leads, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error("Error fetching leads:", err);
        res.status(500).json({ message: "Server error occurred while fetching leads." });
    }
};

exports.getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.leadId)
            .populate('createdBy', 'fullName role')
            .populate('assignedTo', 'fullName role')
            .populate('statusHistory.updatedBy', 'fullName');

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }
        res.status(200).json({ data: lead });
    } catch (err) {
        console.error("Error fetching lead by ID:", err);
        res.status(500).json({ message: "Server error occurred while fetching lead by ID." });
    }
};

exports.updateLeadStage = async (req, res) => {
    try {
        const { leadId, stageName } = req.params;
        const { status, amount, remark, customStatus } = req.body;

        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        if (!['superadmin', 'admin'].includes(req.user.role) && lead.assignedTo?.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to update this lead." });
        }
        if (lead.currentStage !== stageName) {
            return res.status(400).json({ message: `This lead is not at the '${stageName}' stage. Current stage: '${lead.currentStage}'.` });
        }

        let finalStatus = status;
        if (status === 'Others' && customStatus) {
            finalStatus = customStatus;
            await new CustomOption({ fieldName: stageName, value: customStatus }).save().catch(err => console.log("Custom option might already exist."));
        }

        const updateData = {
            status: finalStatus,
            remark,
            updatedBy: req.user.id,
            updatedAt: new Date(),
        };
        if (amount !== undefined) updateData.amount = Number(amount);

        lead[stageName] = updateData;
        lead.statusHistory.push({ stage: stageName, ...updateData });

        if (finalStatus === 'Project Complete') {
            const nextStage = getNextStage(lead.currentStage, lead.paymentType);
            lead.currentStage = nextStage;

            if (nextStage !== 'completed') {
                const nextRole = STAGE_ROLE_MAP[nextStage];
                const nextAssignee = await findUserForRole(nextRole);
                if (nextAssignee) {
                    lead.assignedTo = nextAssignee._id;
                    lead.statusHistory.push({
                        stage: 'System',
                        status: `Assigned for stage: ${nextStage}`,
                        remark: `Automatically assigned to ${nextAssignee.fullName} for stage '${formatValue(nextStage)}'`,
                        updatedBy: req.user.id,
                        updatedAt: new Date()
                    });
                } else {
                    lead.assignedTo = null;
                    console.warn(`No user found for role '${nextRole}' to assign lead ${lead._id}`);
                }
            } else {
                lead.assignedTo = null;
            }
        }

        lead.statusHistory.forEach(item => {
            if (!item.stage) {
                console.warn(`Found a history item without a stage for lead ${lead._id}. Setting to 'Unknown'.`);
                item.stage = 'Unknown';
            }
        });

        await lead.save();

        res.status(200).json({ message: `Stage '${stageName}' updated successfully.`, data: lead });
    } catch (err) {
        console.warn(`Error updating stage ${req.params.stageName}:`, err);
        res.status(500).json({ message: "Server error occurred while updating stage." });
    }
};

exports.deleteLead = async (req, res) => {
    try {
        const { leadId } = req.params;
        const lead = await Lead.findByIdAndDelete(leadId);

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.status(200).json({ message: "Lead deleted successfully" });
    } catch (err) {
        console.error("Error deleting lead:", err);
        res.status(500).json({ message: "Server error occurred while deleting lead." });
    }
};