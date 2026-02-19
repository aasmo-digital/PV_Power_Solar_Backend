const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const telecallerController = require('../controllers/telecaller.controller')
const { authenticate, isTelecaller } = require('../middleware/auth');
const uploadToSpaces = require('../middleware/uploadToSpaces');
const upload = require('../multer/multerImageVideo');

router.post("/login", authController.login);
router.use(authenticate, isTelecaller);
router.get("/manage-users", authController.getAllUsers);
router.put("/user/:id", upload.single("profileImage"), uploadToSpaces, authController.updateUser);
router.delete("/user/:id", authController.deleteUser);
router.post("/create/lead", telecallerController.createLead);
router.get("/all/leads", telecallerController.getAllLeads);
router.put("/lead/:id", telecallerController.updateLeadGeneral);
router.delete("/lead/:id", telecallerController.deleteLead);
router.put("/assign/lead/:id", telecallerController.assignLead);
router.get("/assignable-users", authController.getAssignableUsers);

module.exports = router;