// const express = require('express');
// const authController = require('../controllers/authController');
// const loanController = require('../controllers/loan.controller')
// const { authenticate, isLoanAdmin } = require('../middleware/auth');
// const router = express.Router();

// // Login ==============================================================================================================
// router.post("/login", authController.login);

// // Auth routes=========================================================================================================
// router.use(authenticate, isLoanAdmin);

// // Loans===============================================================================================================
// router.get("/getMyLoans", loanController.getMyLoans);
// router.put("/loan/:id/status", loanController.updateLoanStatus);
// router.put("/:id/update", loanController.updateLoanStatus);


// module.exports = router;

// routes/loan.routes.js
const express = require('express');
const authController = require('../controllers/authController');
const loanController = require('../controllers/loan.controller');
const upload = require("../multer/multerImageVideo");           // should be memoryStorage muler
const uploadToSpaces = require("../middleware/uploadToSpaces"); // sets req.file.location
const { fieldMap } = require('../controllers/loan.controller');
const { authenticate, isLoanAdmin } = require('../middleware/auth');
const router = express.Router();

// ================== DEFINE ALL FILE FIELDS ==================
// const documentFields = [
//     { name: "aadhaarFile", maxCount: 1 },
//     { name: "panFile", maxCount: 1 },
//     { name: "passportFile", maxCount: 1 },
//     { name: "voterIdFile", maxCount: 1 },
//     { name: "drivingLicenseFile", maxCount: 1 },
//     { name: "loanApplicationFile", maxCount: 1 },
//     { name: "passportPhotoFile", maxCount: 1 },
//     { name: "propertyOwnershipFile", maxCount: 1 },
//     { name: "saleAgreementFile", maxCount: 1 },
//     { name: "titleDeedFile", maxCount: 1 },
//     { name: "utilityBillFile", maxCount: 1 },
//     { name: "rentAgreementFile", maxCount: 1 },
//     { name: "salarySlipFile", maxCount: 1 },
//     { name: "form16File", maxCount: 1 },
//     { name: "itrFile", maxCount: 1 },
//     { name: "businessProofFile", maxCount: 1 },
//     { name: "bankStatementFile", maxCount: 1 },
// ];


const documentFields = Object.keys(fieldMap).map(field => ({
    name: field,
    maxCount: 1
}));


// Login (if you want)
router.post("/login", authController.login);

// Protected for loan admin
router.use(authenticate, isLoanAdmin);

// Get my loans
router.get("/getMyLoans", loanController.getMyLoans);

router.post("/upload-documents/:leadId", upload.fields(documentFields), uploadToSpaces, loanController.uploadDocuments);
router.get("/documents/:leadId", loanController.getLeadDocuments);
router.put("/verify-documents/:leadId", loanController.bulkVerifyDocuments);
router.put("/verify-document/:leadId/:docId", loanController.verifyDocument);
router.put("/process/:leadId", loanController.processLoan);
router.put("/approve/:leadId", loanController.approveLoan);
router.put("/update-status/:leadId", loanController.updateLoanLeadStatus);

module.exports = router;
