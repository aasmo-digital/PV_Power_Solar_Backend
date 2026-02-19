const express = require('express');
const router = express.Router();
const optionsController = require('../controllers/options.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/:fieldName', optionsController.getOptions);
router.post('/', optionsController.addOption);

module.exports = router;