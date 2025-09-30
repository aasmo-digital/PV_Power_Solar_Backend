// const express = require('express');
// const { authenticate, isAccountingAdmin } = require('../middleware/auth');
// const authController = require('../controllers/authController')
// const router = express.Router();

// // Login ==============================================================================================================
// router.post("/login", authController.login);

// // Auth routes=========================================================================================================
// router.use(authenticate, isAccountingAdmin);



// module.exports = router;

const express = require('express');
const { authenticate, isAccountingAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController')
const telecallerController = require('../controllers/telecaller.controller'); // Accounting admin can view all leads

const router = express.Router();

// Login ==============================================================================================================
router.post("/login", authController.login);

// Auth routes=========================================================================================================
router.use(authenticate, isAccountingAdmin);

// Accounting specific routes
router.get("/all/leads", telecallerController.getAllLeads); // Accounting Admin can see all leads
// router.put("/lead/:id/accounting_status", accountingController.updateAccountingStatus); // If you have an accounting specific update

module.exports = router;