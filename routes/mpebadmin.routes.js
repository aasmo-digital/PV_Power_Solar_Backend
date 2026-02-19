const express = require('express');
const mpebController = require('../controllers/mpeb.controller')
const authController = require('../controllers/authController');
const { authenticate, isMPEBAdmin, } = require('../middleware/auth');
const upload = require("../multer/multerImageVideo");
const uploadToSpaces = require("../middleware/uploadToSpaces");
const { fieldMap } = require('../controllers/loan.controller');
const telecallerController = require('../controllers/telecaller.controller');

const router = express.Router();

const mpebDocumentFields = [
    { name: "electricityBill", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
    { name: "sanctionLetter", maxCount: 1 },
    { name: "sitePhoto", maxCount: 1 },
    { name: "aadhaarFile", maxCount: 1 },
    { name: "aadhaarBackFile", maxCount: 1 },
    { name: "panFile", maxCount: 1 },
    { name: "panBackFile", maxCount: 1 },
    { name: "passportFile", maxCount: 1 },
    { name: "voterIdFile", maxCount: 1 },
    { name: "drivingLicenseFile", maxCount: 1 },
    { name: "passportPhotoFile", maxCount: 1 },
    { name: "utilityBillFile", maxCount: 1 },
    { name: "aadhaarAddressFile", maxCount: 1 },
    { name: "passportAddressFile", maxCount: 1 },
    { name: "rationCardFile", maxCount: 1 },
    { name: "rentAgreementFile", maxCount: 1 },
    { name: "drivingLicenseAddressFile", maxCount: 1 },
    { name: "salarySlipFile", maxCount: 1 },
    { name: "form16File", maxCount: 1 },
    { name: "itrFile", maxCount: 1 },
    { name: "businessProofFile", maxCount: 1 },
    { name: "bankStatementFile", maxCount: 1 },
];

router.post("/login", authController.login);
router.use(authenticate, isMPEBAdmin);
router.get("/getMyMpebRequests", mpebController.getMyMpebRequests);
router.get("/all/leads", telecallerController.getAllLeads);
router.post("/upload-documents/:leadId", upload.fields(mpebDocumentFields), uploadToSpaces, mpebController.uploadMpebDocuments);
router.get("/documents/:leadId", mpebController.getMpebDocuments);
router.put("/verify-document/:leadId/:docId", mpebController.verifyMpebDocument);
router.put("/update-status/:leadId", mpebController.updateMpebLeadStatus);

module.exports = router;