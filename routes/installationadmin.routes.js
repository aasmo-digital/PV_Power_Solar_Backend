const express = require('express');
const installationController = require('../controllers/installation.controller')
const authController = require('../controllers/authController');
const telecallerController = require('../controllers/telecaller.controller'); // For generic getAllLeads
const { authenticate, isInstallationAdmin,  } = require('../middleware/auth');
const upload = require("../multer/multerImageVideo");
const uploadToSpaces = require("../middleware/uploadToSpaces");
const { fieldMap } = require('../controllers/loan.controller'); // Document types

const router = express.Router();

// Document fields for installation phases (completion certificates/photos) - MODIFIED
const installationPhaseDocumentFields = [
    { name: "completionCertificate", maxCount: 1 },
    { name: "sitePhoto_Completed", maxCount: 5 }, // Allow multiple completion photos
    { name: "installationReport", maxCount: 1 },
    { name: "sitePhoto_PreInstallation", maxCount: 1 }, // ADDED
    { name: "sitePhoto_Phase1", maxCount: 1 },         // ADDED
    { name: "sitePhoto_Phase2", maxCount: 1 },         // ADDED
    // Add any other installation specific document fields here that are used in frontendFieldMap
];

// Login
router.post("/login", authController.login);

// Protected for installation admin
router.use(authenticate, isInstallationAdmin);

// General leads fetching for Installation Admin
router.get("/all/leads", telecallerController.getAllLeads); // Installation Admin can fetch general lead data

// Installation specific routes
router.get("/getMyInstallations", installationController.getMyInstallations);
router.get("/details/:leadId", installationController.getInstallationDetails); // New: Get full installation details for a lead
router.put("/update-status/:leadId", installationController.updateInstallationStatus); // New: Update general installation status

// Technician management routes
router.post("/:leadId/technicians", installationController.addInstallationTechnicians);
router.delete("/:leadId/technicians/:technicianId", installationController.removeInstallationTechnician);

// Installation phase management routes
// Note: We use the same endpoint for adding and updating, differentiated by `isNewPhase` in body or absence of `phaseId` in params
router.post("/:leadId/phases", upload.fields(installationPhaseDocumentFields), uploadToSpaces, installationController.updateInstallationPhase); // Add new phase with optional docs
router.put("/:leadId/phases/:phaseId", upload.fields(installationPhaseDocumentFields), uploadToSpaces, installationController.updateInstallationPhase); // Update existing phase with optional docs
router.delete("/:leadId/phases/:phaseId", installationController.deleteInstallationPhase); // Delete a phase

module.exports = router;