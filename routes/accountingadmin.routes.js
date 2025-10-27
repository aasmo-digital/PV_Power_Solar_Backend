const express = require('express');
const { authenticate, isAccountingAdmin, checkRoles } = require('../middleware/auth'); // checkRoles इम्पोर्ट किया गया
const authController = require('../controllers/authController')
const telecallerController = require('../controllers/telecaller.controller') // To fetch general lead list
const accountingController = require('../controllers/accounting.controller');

const upload = require("../multer/multerImageVideo"); // For invoice/receipt documents (assuming memory storage)
const uploadToSpaces = require("../middleware/uploadToSpaces"); // For S3 upload

const router = express.Router();

// Document fields for accounting (invoice, receipt)
// अब इनवॉइस/रसीद के लिए कोई फ़ाइल अपलोड नहीं की जाएगी, इसलिए यह ऑब्जेक्ट खाली रहेगा
const accountingDocumentFields = []; 

// Login route (publicly accessible)
router.post("/login", authController.login);

// All routes below this middleware will require authentication and the 'accounting_admin' role
router.use(authenticate, checkRoles('accounting_admin', 'admin', 'superadmin')); // सुपरएडमिन और एडमिन को भी अनुमति दें

// Accounting specific routes
router.get("/getMyAccountingLeads", accountingController.getMyAccountingLeads); // Accounting Admin can see leads assigned to them or they worked on

// Get full accounting details for a specific lead
router.get("/manage/:leadId", accountingController.getAccountingDetails); // Endpoint for ManageAccountingPage

// Generate Invoice (अब बिना दस्तावेज़ अपलोड के)
router.post("/:leadId/invoice", accountingController.generateInvoice); // Multer और S3 अपलोड मिडलवेयर हटा दिए गए

// Record Payment (अब बिना रसीद दस्तावेज़ अपलोड के)
router.post("/:leadId/payment", accountingController.recordPayment); // Multer और S3 अपलोड मिडलवेयर हटा दिए गए

// Update Commission Tracking
router.put("/:leadId/commission", accountingController.updateCommissionTracking);

// Get Financial Report
router.get("/financial-report", accountingController.getFinancialReport);

// Update general accounting lead status
router.put("/update-status/:leadId", accountingController.updateAccountingLeadStatus);


module.exports = router;