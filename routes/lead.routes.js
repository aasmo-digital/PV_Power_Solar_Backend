const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { authenticate, checkRoles } = require('../middleware/auth');

router.use(authenticate);

router.post(
    '/',
    checkRoles('superadmin', 'admin', 'telecaller'),
    leadController.createLead
);

router.get('/', leadController.getAllLeads);
router.get('/:leadId', leadController.getLeadById);
router.put('/:leadId/stage/:stageName', leadController.updateLeadStage);
router.delete('/:leadId', checkRoles('superadmin', 'admin', 'telecaller'), leadController.deleteLead);

module.exports = router;