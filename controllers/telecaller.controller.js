const leadModel = require("../models/lead.model");
const User = require("../models/user.model");


const updateLeadStatus = (lead, newStatus, remark, userId, userRole) => {
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
};

exports.createLead = async (req, res) => {
    try {
        const { name, email, phone, source, enquiryDetails, remark } = req.body;

        const lead = new leadModel({
            name,
            email,
            phone,
            source: source || "telecaller",
            createdBy: req.user.id,
            enquiryDetails: enquiryDetails || {},
            currentStatusDetail: { telecaller: "new" } // Initial status
        });

        // Add initial status to history
        updateLeadStatus(lead, "new", remark || "Lead created by telecaller.", req.user.id, req.user.role);

        await lead.save();
        res.status(201).json({ message: "Lead created successfully", lead });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getAllLeads = async (req, res) => {
    try {
        let query = {};
        const { globalSearch, name, email, phone, status, assignedTo, createdBy, page, limit, sortBy, sortDirection } = req.query; // 'createdBy' का नाम 'createdTo' से 'createdBy' में बदला

        // यूज़र रोल के आधार पर बेस क्वेरी शर्तें
        if (["telecaller", "superadmin", "accounting_admin", "admin"].includes(req.user.role)) {
            query = {}; // इन रोल्स के लिए सभी लीड्स
        }
        else if (req.user.role === "fieldexecutive") {
            query = { assignedTo: req.user.id }; // सीधे assignedTo ObjectId को क्वेरी करें
        }
        else if (req.user.role === "installation_admin") {
            query = { assignedTo: req.user.id, status: "assigned_to_installationadmin" };
        }
        else if (req.user.role === "mpeb_admin") {
            query = { assignedTo: req.user.id, status: "assigned_to_mpebadmin" };
        }
        else if (req.user.role === "loan_admin") {
            query = { assignedTo: req.user.id, status: "assigned_to_loanadmin" };
        }

        // Frontend DataTable से आने वाले अतिरिक्त फिल्टर लागू करें
        if (name) query.name = { $regex: name, $options: 'i' };
        if (email) query.email = { $regex: email, $options: 'i' };
        if (phone) query.phone = { $regex: phone, $options: 'i' };
        if (status) query.status = status;
        if (assignedTo) query.assignedTo = assignedTo; // अगर फ्रंटएंड assignee की ID भेज रहा है
        if (createdBy) query.createdBy = createdBy; // अगर फ्रंटएंड creator की ID भेज रहा है


        // Global search हैंडल करें
        if (globalSearch) {
            const searchRegex = { $regex: globalSearch, $options: 'i' };
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { status: searchRegex },
                // पॉपुलेटेड फील्ड्स (जैसे assignedTo.fullName) में सर्च करने के लिए
                // एग्रीगेशन या अलग क्वेरी की आवश्यकता होती है।
                // अभी के लिए, हम सिर्फ डायरेक्ट फ़ील्ड्स में सर्च कर रहे हैं।
            ];
        }

        // Pagination और Sorting
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        let sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = sortDirection === 'desc' ? -1 : 1;
        } else {
            sortOptions.createdAt = -1; // डिफ़ॉल्ट रूप से नए को पहले सॉर्ट करें
        }

        const leads = await leadModel.find(query)
            .populate("assignedTo", "fullName email role")
            .populate("createdBy", "fullName email role")
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum);

        const totalLeads = await leadModel.countDocuments(query); // Pagination के लिए कुल संख्या प्राप्त करें

        // फ्रंटएंड DataTable के लिए अपेक्षित फॉर्मेट में प्रतिक्रिया भेजें
        res.status(200).json({
            data: leads,
            total: totalLeads,
            page: pageNum,
            limit: limitNum,
        });
    } catch (err) {
        console.error("Error in getAllLeads:", err); // अधिक विस्तृत एरर लॉगिंग
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateLeadGeneral = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, source, status, remark, nextFollowUpDate } = req.body;

        let lead = await leadModel.findById(id);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        if (name) lead.name = name;
        if (email) lead.email = email;
        if (phone) lead.phone = phone;
        if (source) lead.source = source;

        if (status) {
            updateLeadStatus(lead, status, remark || `Status updated by ${req.user.role}.`, req.user.id, req.user.role);
        }

        if (remark) {
            lead.remarks.push({ text: remark, addedBy: req.user.id });
        }

        if (nextFollowUpDate) lead.nextFollowUpDate = nextFollowUpDate;
        else if (status !== "fe_rescheduled_followup" && status !== "rescheduled") lead.nextFollowUpDate = undefined;


        await lead.save();

        lead = await leadModel.findById(id)
            .populate("assignedTo", "fullName email role")
            .populate("createdBy", "fullName email role");

        res.status(200).json({ message: "Lead updated successfully", lead });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await leadModel.findByIdAndDelete(id);
        if (!lead) return res.status(404).json({ message: "Lead not found" });
        res.status(200).json({ message: "Lead deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.assignLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedTo } = req.body;

        let lead = await leadModel.findById(id);
        if (!lead) return res.status(404).json({ message: "Lead not found" });

        const targetUser = await User.findById(assignedTo);
        if (!targetUser) {
            return res.status(400).json({ message: "Assigned user not found" });
        }
        const assignableRoles = ["fieldexecutive", "installation_admin", "mpeb_admin", "loan_admin", "accounting_admin"];
        if (!assignableRoles.includes(targetUser.role)) {
            return res.status(400).json({ message: `Cannot assign lead to a user with role ${targetUser.role}` });
        }

        lead.assignedTo = assignedTo;

        let newStatus;
        if (targetUser.role === "fieldexecutive") {
            newStatus = "assigned_to_fieldexecutive";
        } else if (targetUser.role === "installation_admin") {
            newStatus = "assigned_to_installationadmin";
        } else if (targetUser.role === "mpeb_admin") {
            newStatus = "assigned_to_mpebadmin";
        } else if (targetUser.role === "loan_admin") {
            newStatus = "assigned_to_loanadmin";
        } else if (targetUser.role === "accounting_admin") {
            newStatus = "assigned_to_accounting";
        } else {
            return res.status(400).json({ message: "Invalid role for assignment" });
        }

        // Update main status, history, and currentStatusDetail
        updateLeadStatus(lead, newStatus, `Lead assigned to ${targetUser.role} (${targetUser.fullName}).`, req.user.id, req.user.role);


        await lead.save();

        res.status(200).json({ message: "Lead assigned successfully", lead });
    } catch (err) {
        console.error("❌ Error assigning lead:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getLeadsSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query; // डेट रेंज फिल्टर्स

        let matchQuery = {};
        if (startDate && endDate) {
            matchQuery.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const leadsByStatus = await leadModel.aggregate([
            { $match: matchQuery }, // डेट रेंज फिल्टर
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    status: "$_id",
                    count: 1,
                    _id: 0
                }
            }
        ]);

        const totalLeads = await leadModel.countDocuments(matchQuery);

        // फ्रंटएंड के अपेक्षित फॉर्मेट में डेटा तैयार करें
        const dashboardLeadsSummary = {
            totalLeads: totalLeads,
            leadsByStatus: leadsByStatus,
            // आप यहां pendingLeads, approvedLeads आदि की गणना कर सकते हैं
            pendingLeads: leadsByStatus.find(item => item.status === 'new')?.count || 0,
            approvedLeads: leadsByStatus.find(item => item.status === 'loan_approved')?.count || 0,
        };

        res.status(200).json(dashboardLeadsSummary);
    } catch (err) {
        console.error("Error in getLeadsSummary:", err);
        res.status(500).json({ message: "Server error occurred while fetching lead summary." });
    }
};

exports.getUsersSummary = async (req, res) => {
    try {
        let matchQuery = {};
        // Filter users based on the role of the requesting user
        if (req.user && req.user.role) {
            if (req.user.role === 'admin') {
                // Admin can now see ALL roles, including superadmin and other admins
                // जैसे सुपरएडमिन सभी रोल देख सकता है, वैसे ही एडमिन भी सभी रोल्स देख पाएगा
                matchQuery.role = {
                    $in: ["superadmin", "admin", "telecaller", "fieldexecutive", "installation_admin", "mpeb_admin", "loan_admin", "accounting_admin"]
                };
            } else if (req.user.role === 'superadmin') {
                // Superadmin can see all roles
                matchQuery.role = {
                    $in: ["superadmin", "admin", "telecaller", "fieldexecutive", "installation_admin", "mpeb_admin", "loan_admin", "accounting_admin"]
                };
            }
            // For other roles, if they need this summary, define their scope here.
            // For example, a telecaller might see no users, or only users they created.
        }

        // Add date range filter if provided (from req.query)
        const { startDate, endDate } = req.query;
        if (startDate && endDate) {
            matchQuery.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const usersByRole = await User.aggregate([
            { $match: matchQuery }, // Apply role and date filters
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    role: "$_id",
                    count: 1,
                    _id: 0
                }
            }
        ]);

        const totalUsers = await User.countDocuments(matchQuery); // कुल यूज़र्स की संख्या

        const dashboardUsersSummary = {
            totalUsers: totalUsers,
            usersByRole: usersByRole,
        };

        res.status(200).json(dashboardUsersSummary);
    } catch (err) {
        console.error("Error in getUsersSummary:", err);
        res.status(500).json({ message: "Server error occurred while fetching user summary." });
    }
};