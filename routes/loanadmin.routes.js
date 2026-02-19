const express = require('express');
const authController = require('../controllers/authController');
const loanController = require('../controllers/loan.controller');
const upload = require("../multer/multerImageVideo");
const uploadToSpaces = require("../middleware/uploadToSpaces");
const { fieldMap } = require('../controllers/loan.controller');
const { authenticate, isLoanAdmin } = require('../middleware/auth');
const router = express.Router();

const documentFields = Object.keys(fieldMap).map(field => ({
    name: field,
    maxCount: 1
}));

router.post("/login", authController.login);
router.use(authenticate, isLoanAdmin);
router.get("/getMyLoans", loanController.getMyLoans);
router.post("/upload-documents/:leadId", upload.fields(documentFields), uploadToSpaces, loanController.uploadDocuments);
router.get("/documents/:leadId", loanController.getLeadDocuments);
router.put("/verify-documents/:leadId", loanController.bulkVerifyDocuments);
router.put("/verify-document/:leadId/:docId", loanController.verifyDocument);
router.put("/process/:leadId", loanController.processLoan);
router.put("/approve/:leadId", loanController.approveLoan);
router.put("/update-status/:leadId", loanController.updateLoanLeadStatus);

module.exports = router;
