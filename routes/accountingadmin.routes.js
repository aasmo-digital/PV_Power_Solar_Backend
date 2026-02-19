const express = require('express');
const { authenticate, isAccountingAdmin, checkRoles } = require('../middleware/auth');
const authController = require('../controllers/authController')
const telecallerController = require('../controllers/telecaller.controller')
const accountingController = require('../controllers/accounting.controller');
const upload = require("../multer/multerImageVideo");
const uploadToSpaces = require("../middleware/uploadToSpaces");
const router = express.Router();

const accountingDocumentFields = [];

router.post("/login", authController.login);
router.use(authenticate, checkRoles('accounting_admin', 'admin', 'superadmin'));
router.get("/getMyAccountingLeads", accountingController.getMyAccountingLeads);
router.get("/manage/:leadId", accountingController.getAccountingDetails);
router.post("/:leadId/invoice", accountingController.generateInvoice);
router.post("/:leadId/payment", accountingController.recordPayment);
router.put("/:leadId/commission", accountingController.updateCommissionTracking);
router.get("/financial-report", accountingController.getFinancialReport);
router.put("/update-status/:leadId", accountingController.updateAccountingLeadStatus);

module.exports = router;