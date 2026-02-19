const express = require('express');
const installationController = require('../controllers/installation.controller')
const authController = require('../controllers/authController');
const telecallerController = require('../controllers/telecaller.controller');
const { authenticate, isInstallationAdmin, } = require('../middleware/auth');
const upload = require("../multer/multerImageVideo");
const uploadToSpaces = require("../middleware/uploadToSpaces");
const { fieldMap } = require('../controllers/loan.controller');
const router = express.Router();

const installationPhaseDocumentFields = [
    { name: "completionCertificate", maxCount: 1 },
    { name: "sitePhoto_Completed", maxCount: 5 },
    { name: "installationReport", maxCount: 1 },
    { name: "sitePhoto_PreInstallation", maxCount: 1 },
    { name: "sitePhoto_Phase1", maxCount: 1 },
    { name: "sitePhoto_Phase2", maxCount: 1 },
];

router.post("/login", authController.login);
router.use(authenticate, isInstallationAdmin);
router.get("/all/leads", telecallerController.getAllLeads);
router.get("/getMyInstallations", installationController.getMyInstallations);
router.get("/details/:leadId", installationController.getInstallationDetails);
router.put("/update-status/:leadId", installationController.updateInstallationStatus);
router.post("/:leadId/technicians", installationController.addInstallationTechnicians);
router.delete("/:leadId/technicians/:technicianId", installationController.removeInstallationTechnician);
router.post("/:leadId/phases", upload.fields(installationPhaseDocumentFields), uploadToSpaces, installationController.updateInstallationPhase);
router.put("/:leadId/phases/:phaseId", upload.fields(installationPhaseDocumentFields), uploadToSpaces, installationController.updateInstallationPhase);
router.delete("/:leadId/phases/:phaseId", installationController.deleteInstallationPhase);

module.exports = router;