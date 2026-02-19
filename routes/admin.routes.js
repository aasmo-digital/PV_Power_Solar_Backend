const express = require('express');
const router = express.Router();
const upload = require("../multer/multerImageVideo");
const uploadToSpaces = require("../middleware/uploadToSpaces");
const { authenticate, isAdmin, checkRoles } = require('../middleware/auth');
const authController = require('../controllers/authController')
const telecallerController = require('../controllers/telecaller.controller')

router.post("/login", authController.login);
router.get("/manage-users", authenticate, checkRoles('admin', 'superadmin', 'telecaller'), authController.getAllUsers);
router.post("/register", authenticate, isAdmin, upload.single("profileImage"), uploadToSpaces, authController.register);
router.put("/user/:id", authenticate, isAdmin, upload.single("profileImage"), uploadToSpaces, authController.updateUser);
router.delete("/user/:id", authenticate, isAdmin, authController.deleteUser);
router.post("/create/lead", authenticate, checkRoles('admin', 'superadmin', 'telecaller'), telecallerController.createLead);
router.get("/all/leads", authenticate, checkRoles('admin', 'superadmin', 'telecaller'), telecallerController.getAllLeads);
router.put("/lead/:id", authenticate, checkRoles('admin', 'superadmin', 'telecaller'), telecallerController.updateLeadGeneral);
router.delete("/lead/:id", authenticate, isAdmin, telecallerController.deleteLead);
router.get("/assignable-users", authenticate, authController.getAssignableUsers);
router.get("/dashboard-summary/leads", authenticate, checkRoles('admin', 'superadmin', 'telecaller'), telecallerController.getLeadsSummary);
router.get("/dashboard-summary/users", authenticate, checkRoles('admin', 'superadmin', 'telecaller'), telecallerController.getUsersSummary);
router.put("/assign/lead/:id", authenticate, isAdmin, telecallerController.assignLead);

module.exports = router;