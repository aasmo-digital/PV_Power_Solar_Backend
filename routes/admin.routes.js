const express = require('express');
const router = express.Router();
const upload = require("../multer/multerImageVideo");
const uploadToSpaces = require("../middleware/uploadToSpaces");
const { authenticate, isAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController')
const telecallerController = require('../controllers/telecaller.controller')

// Login Register======================================================================================================
router.post("/login", authController.login);

// Auth routes=========================================================================================================
router.use(authenticate, isAdmin);

// Login Register======================================================================================================
router.post("/register", upload.single("profileImage"), uploadToSpaces, authController.register);
router.get("/manage-users", authController.getAllUsers);
router.put("/user/:id", upload.single("profileImage"), uploadToSpaces, authController.updateUser);
router.delete("/user/:id", authController.deleteUser);

// Lead routes=========================================================================================================
router.post("/create/lead", telecallerController.createLead);
router.get("/all/leads", telecallerController.getAllLeads);
router.put("/lead/:id", telecallerController.updateLeadGeneral);
router.delete("/lead/:id", telecallerController.deleteLead);

router.get("/assignable-users", authController.getAssignableUsers); // <--- यहाँ जोड़ा गया

// ************ NEW ROUTES FOR ADMIN DASHBOARD SUMMARY ************
router.get("/dashboard-summary/leads", telecallerController.getLeadsSummary);
router.get("/dashboard-summary/users", telecallerController.getUsersSummary);
// ************ END NEW ROUTES ************

// ************ ADMIN CAN ASSIGN LEADS ************
router.put("/assign/lead/:id", telecallerController.assignLead); // <--- यह नया रूट जोड़ा गया
// ************ END ADMIN CAN ASSIGN LEADS ************



module.exports = router;