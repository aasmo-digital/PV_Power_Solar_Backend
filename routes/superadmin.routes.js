const express = require('express');
const router = express.Router();
const { authenticate, isSuperAdmin } = require('../middleware/auth');
const upload = require("../multer/multerImageVideo");
const uploadToSpaces = require("../middleware/uploadToSpaces");
const authController = require('../controllers/authController');
const telecallerController = require('../controllers/telecaller.controller');

router.post("/register", upload.single("profileImage"), uploadToSpaces, authController.register);
router.post("/login", authController.login);
router.use(authenticate, isSuperAdmin);
router.get("/manage-users", authController.getAllUsers);
router.put("/user/:id", upload.single("profileImage"), authController.updateUser);
router.delete("/user/:id", authController.deleteUser);
router.post("/create/lead", telecallerController.createLead);
router.get("/all/leads", telecallerController.getAllLeads);
router.put("/lead/:id", telecallerController.updateLeadGeneral);
router.put("/assign/lead/:id", telecallerController.assignLead);
router.delete("/lead/:id", telecallerController.deleteLead);
router.get("/dashboard-summary/leads", telecallerController.getLeadsSummary);
router.get("/dashboard-summary/users", telecallerController.getUsersSummary);
router.get("/assignable-users", authController.getAssignableUsers);

module.exports = router;