// const express = require('express');
// const mpebController = require('../controllers/mpeb.controller')
// const authController = require('../controllers/authController');
// const { authenticate, isMPEBAdmin,  } = require('../middleware/auth');
// const router = express.Router();

// // Login ==============================================================================================================
// router.post("/login", authController.login);

// // Auth routes=========================================================================================================
// router.use(authenticate, isMPEBAdmin);

// // MPEB================================================================================================================
// router.get("/getMyMpebRequests", mpebController.getMyRequests);
// router.put("/mpeb/:id/status", mpebController.updateMpebStatus);

// module.exports = router;

const express = require('express');
const mpebController = require('../controllers/mpeb.controller') // New controller
const authController = require('../controllers/authController');
const { authenticate, isMPEBAdmin,  } = require('../middleware/auth');
const router = express.Router();

// Login ==============================================================================================================
router.post("/login", authController.login);

// Auth routes=========================================================================================================
router.use(authenticate, isMPEBAdmin);

// MPEB================================================================================================================
router.get("/getMyMpebRequests", mpebController.getMyMpebRequests); // Corrected function name
router.put("/mpeb/:id/status", mpebController.updateMpebStatus);

module.exports = router;