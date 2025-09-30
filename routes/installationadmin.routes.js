// const express = require('express');
// const authController = require('../controllers/authController');
// const installationController = require('../controllers/installation.controller')
// const { authenticate, isInstallationAdmin, } = require('../middleware/auth');
// const router = express.Router();

// // Login ==============================================================================================================
// router.post("/login", authController.login);

// // Auth routes=========================================================================================================
// router.use(authenticate, isInstallationAdmin);

// // Installation================================================================================================================
// router.get("/getMyInstallations", installationController.getAll);
// router.put("/installation/:id/status", installationController.updateInstallationStatus);

// module.exports = router;

const express = require('express');
const authController = require('../controllers/authController');
const installationController = require('../controllers/installation.controller') // New controller
const { authenticate, isInstallationAdmin, } = require('../middleware/auth');
const router = express.Router();

// Login ==============================================================================================================
router.post("/login", authController.login);

// Auth routes=========================================================================================================
router.use(authenticate, isInstallationAdmin);

// Installation================================================================================================================
router.get("/getMyInstallations", installationController.getMyInstallations); // Corrected function name
router.put("/installation/:id/status", installationController.updateInstallationStatus);

module.exports = router;