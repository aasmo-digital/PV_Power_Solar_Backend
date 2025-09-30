const express = require('express');
const router = express.Router();
const { authenticate, isSuperAdmin } = require('../middleware/auth');
const upload = require("../multer/multerImageVideo"); // Ensure this path is correct
const uploadToSpaces = require("../middleware/uploadToSpaces"); // Ensure this path is correct
const authController = require('../controllers/authController');
const telecallerController = require('../controllers/telecaller.controller'); // For general lead ops

// Login Register (for SuperAdmin, but uses general authController)
router.post("/register", upload.single("profileImage"), uploadToSpaces, authController.register); // Register for all roles
router.post("/login", authController.login);

// Auth routes for SuperAdmin
router.use(authenticate, isSuperAdmin);

// Manage all users
router.get("/manage-users", authController.getAllUsers);
router.put("/user/:id",  upload.single("profileImage"), authController.updateUser);
router.delete("/user/:id", authController.deleteUser);

// SuperAdmin specific actions (they can do all telecaller actions)
router.post("/create/lead", telecallerController.createLead); // SuperAdmin can create leads
router.get("/all/leads", telecallerController.getAllLeads); // SuperAdmin can see all leads
router.put("/lead/:id", telecallerController.updateLeadGeneral); // SuperAdmin can update any lead generally
router.put("/assign/lead/:id", telecallerController.assignLead); // SuperAdmin can assign leads
router.delete("/lead/:id", telecallerController.deleteLead); // SuperAdmin can delete leads

// GET: /api/superadmin/dashboard-summary/leads
router.get("/dashboard-summary/leads", telecallerController.getLeadsSummary);

// GET: /api/superadmin/dashboard-summary/users
router.get("/dashboard-summary/users", telecallerController.getUsersSummary);

router.get("/assignable-users", authController.getAssignableUsers); // <--- यहाँ जोड़ा गया


module.exports = router;