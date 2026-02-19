const express = require('express');
const authController = require('../controllers/authController');
const fieldExecutiveController = require('../controllers/fieldexecutive.controller')
const { authenticate, isFieldExecutive } = require('../middleware/auth');
const router = express.Router();

router.post("/login", authController.login);
router.use(authenticate, isFieldExecutive);
router.get('/getMyLeads', fieldExecutiveController.getMyLeads);
router.put("/lead/:id/enquiry", fieldExecutiveController.updateEnquiryDetails);
router.put("/lead/:id/status", fieldExecutiveController.updateStatus);

module.exports = router;