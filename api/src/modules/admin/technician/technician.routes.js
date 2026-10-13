const express = require('express');
const validate = require('../../../middlewares/validate');
const { imagesUpload, formFields } = require('../../../middlewares/upload');
const technicianValidation = require('./technician.validation');
const technicianController = require('./technician.controller');

// Mounted at /api/admin/technicians (admin JWT required — see admin.routes.js).
// POST / PUT take multipart/form-data with one image each in technician_photo, shop_photo,
// id_proof_photo (max 5 MB). id_proof_photo is stored in storage/private, never under /uploads.
const router = express.Router();
const withPhotos = [
  imagesUpload('technicians', {
    // Headroom above 3 so extra/unknown files get a specific error instead of "Too many files".
    maxFiles: technicianValidation.PHOTO_FIELDS.length * 2,
    isAllowedField: technicianValidation.isPhotoField,
    maxMb: technicianValidation.MAX_PHOTO_MB,
    privateFields: technicianValidation.PRIVATE_PHOTO_FIELDS,
  }),
  technicianValidation.normalize,
];

router.get('/', technicianController.list);
router.get('/:id', technicianController.getById);
router.get('/:id/id-proof', technicianController.idProof);
router.post('/', ...withPhotos, validate(technicianValidation.create), technicianController.create);
router.put('/:id', ...withPhotos, validate(technicianValidation.update), technicianController.update);
router.patch('/:id/status', formFields(), technicianValidation.normalize, validate(technicianValidation.status), technicianController.setStatus);
router.delete('/:id', technicianController.remove);

module.exports = router;
