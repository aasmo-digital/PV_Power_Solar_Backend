// const express = require('express');
// const mpebController = require('../controllers/mpeb.controller')
// const authController = require('../controllers/authController');
// const { authenticate, isMPEBAdmin,  } = require('../middleware/auth');
// const upload = require("../multer/multerImageVideo");           // file upload
// const uploadToSpaces = require("../middleware/uploadToSpaces"); // s3 upload
// const { fieldMap } = require('../controllers/loan.controller'); // Document types

// const router = express.Router();

// const mpebDocumentFields = [
//     { name: "electricityBill", maxCount: 1 },
//     { name: "idProof", maxCount: 1 }, // Assuming ID proof
//     { name: "sanctionLetter", maxCount: 1 },
//     { name: "sitePhoto", maxCount: 1 },
//     // Add other MPEB specific document fields as needed
// ];

// // Login
// router.post("/login", authController.login);

// // Protected for MPEB admin
// router.use(authenticate, isMPEBAdmin);

// // MPEB specific routes
// router.get("/getMyMpebRequests", mpebController.getMyMpebRequests);
// router.put("/mpeb/:id/status", mpebController.updateMpebStatus);

// // New MPEB document upload routes
// router.post("/upload-documents/:leadId", upload.fields(mpebDocumentFields), uploadToSpaces, mpebController.uploadMpebDocuments);
// router.get("/documents/:leadId", mpebController.getMpebDocuments);
// router.put("/verify-document/:leadId/:docId", mpebController.verifyMpebDocument);

// router.put("/update-status/:leadId", mpebController.updateMpebLeadStatus);


// module.exports = router;


const express = require('express');
const mpebController = require('../controllers/mpeb.controller')
const authController = require('../controllers/authController');
const { authenticate, isMPEBAdmin,  } = require('../middleware/auth');
const upload = require("../multer/multerImageVideo");           // file upload
const uploadToSpaces = require("../middleware/uploadToSpaces"); // s3 upload
const { fieldMap } = require('../controllers/loan.controller'); // Document types
const telecallerController = require('../controllers/telecaller.controller'); // Import telecallerController - ADDED

const router = express.Router();

const mpebDocumentFields = [
    { name: "electricityBill", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
    { name: "sanctionLetter", maxCount: 1 },
    { name: "sitePhoto", maxCount: 1 },
    // MPEB के लिए आवश्यक अन्य सामान्य दस्तावेज़ों को भी शामिल करें
    { name: "aadhaarFile", maxCount: 1 },       // <-- यह पहले से था, सुनिश्चित करें
    { name: "aadhaarBackFile", maxCount: 1 },
    { name: "panFile", maxCount: 1 },           // <-- यह पहले से था, सुनिश्चित करें
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

// Login
router.post("/login", authController.login);

// Protected for MPEB admin
router.use(authenticate, isMPEBAdmin);

// MPEB specific routes
router.get("/getMyMpebRequests", mpebController.getMyMpebRequests);

// ADDED: Generic route to fetch all leads, used by frontend for individual lead details
router.get("/all/leads", telecallerController.getAllLeads); 

// New MPEB document upload routes
router.post("/upload-documents/:leadId", upload.fields(mpebDocumentFields), uploadToSpaces, mpebController.uploadMpebDocuments);
router.get("/documents/:leadId", mpebController.getMpebDocuments);
router.put("/verify-document/:leadId/:docId", mpebController.verifyMpebDocument); // New for MPEB doc verification

// New route for MPEB Admin to update status specifically
router.put("/update-status/:leadId", mpebController.updateMpebLeadStatus);


module.exports = router;