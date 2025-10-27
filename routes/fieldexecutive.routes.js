// const express = require('express');
// const authController = require('../controllers/authController');
// const telecallerController = require('../controllers/telecaller.controller')
// const fieldExecutiveController = require('../controllers/fieldexecutive.controller')
// const { authenticate, isFieldExecutive } = require('../middleware/auth');
// const router = express.Router();

// // Login ==============================================================================================================
// router.post("/login", authController.login);

// // Auth routes=========================================================================================================
// router.use(authenticate, isFieldExecutive);

// // Leads===============================================================================================================
// router.get('/getMyLeads', fieldExecutiveController.getMyLeads);
// router.put("/lead/:id", telecallerController.updateLead);
// router.put("/lead/status/:id", fieldExecutiveController.updateStatus);



// module.exports = router;

const express = require('express');
const authController = require('../controllers/authController');
const fieldExecutiveController = require('../controllers/fieldexecutive.controller')
const { authenticate, isFieldExecutive } = require('../middleware/auth');
const router = express.Router();

// Login
router.post("/login", authController.login);

// Auth routes
router.use(authenticate, isFieldExecutive);

// Leads
router.get('/getMyLeads', fieldExecutiveController.getMyLeads);
router.put("/lead/:id/enquiry", fieldExecutiveController.updateEnquiryDetails); // Field executive updates their assigned lead's enquiry details
router.put("/lead/:id/status", fieldExecutiveController.updateStatus); // Field executive updates general status (e.g., in-progress, rescheduled)

module.exports = router;