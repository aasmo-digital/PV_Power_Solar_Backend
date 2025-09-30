// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController');
// const telecallerController = require('../controllers/telecaller.controller')
// const { authenticate, isTelecaller,  } = require('../middleware/auth');

// // Login ==============================================================================================================
// router.post("/login", authController.login);

// // Auth routes=========================================================================================================
// router.use(authenticate, isTelecaller);

// // Lead routes=========================================================================================================
// router.post("/create/lead", telecallerController.createLead);
// router.get("/all/leads", telecallerController.getAllLeads);
// router.put("/lead/:id", telecallerController.updateLead);
// router.delete("/lead/:id", telecallerController.deleteLead);


// router.put("/assign/lead/:id", telecallerController.assignLead); // assign to any role
// router.get("/all/leads", telecallerController.getAllLeads); // show all with statuses


// module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const telecallerController = require('../controllers/telecaller.controller')
const { authenticate, isTelecaller } = require('../middleware/auth');
const uploadToSpaces = require('../middleware/uploadToSpaces');
const upload = require('../multer/multerImageVideo');

// Login ==============================================================================================================
router.post("/login", authController.login);

// Auth routes=========================================================================================================
router.use(authenticate, isTelecaller);


router.get("/manage-users", authController.getAllUsers);
router.put("/user/:id", upload.single("profileImage"), uploadToSpaces, authController.updateUser);
router.delete("/user/:id", authController.deleteUser);


// Lead routes=========================================================================================================
router.post("/create/lead", telecallerController.createLead);
router.get("/all/leads", telecallerController.getAllLeads);
router.put("/lead/:id", telecallerController.updateLeadGeneral); // Telecaller can update general details
router.delete("/lead/:id", telecallerController.deleteLead);
router.put("/assign/lead/:id", telecallerController.assignLead); // Telecaller can assign leads

router.get("/assignable-users", authController.getAssignableUsers); // <--- यहाँ जोड़ा गया


module.exports = router;