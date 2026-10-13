const express = require('express');
const validate = require('../../../middlewares/validate');
const { imagesUpload, formFields } = require('../../../middlewares/upload');
const productValidation = require('./product.validation');
const productController = require('./product.controller');

// Mounted at /api/admin/products (admin JWT required — see admin.routes.js).
// One save endpoint per admin tab. All accept JSON or multipart/form-data.
const router = express.Router();

// Basic Information: gallery files in "images".
const withGallery = [
  imagesUpload('products', { maxFiles: productValidation.MAX_IMAGES, isAllowedField: productValidation.isGalleryField }),
  productValidation.normalize,
];
// Benefits: each benefit's image in "benefits[<index>][image]".
const withBenefitImages = [
  imagesUpload('products', { maxFiles: productValidation.MAX_BENEFITS, isAllowedField: productValidation.isBenefitImageField }),
  productValidation.normalize,
];
// Text-only tabs.
const withText = [formFields(), productValidation.normalize];

router.get('/', productController.list);
router.get('/:id', productController.getById);

router.post('/', ...withGallery, validate(productValidation.create), productController.create);
router.put('/:id/basic', ...withGallery, validate(productValidation.basic), productController.updateBasic);
router.put('/:id/benefits', ...withBenefitImages, validate(productValidation.benefits), productController.updateBenefits);
router.put('/:id/specifications', ...withText, validate(productValidation.specifications), productController.updateSpecifications);
router.put('/:id/package-details', ...withText, validate(productValidation.packageDetails), productController.updatePackageDetails);
router.put('/:id/box-contents', ...withText, validate(productValidation.boxContents), productController.updateBoxContents);

router.get('/:id/variants', productController.getVariants);
router.put('/:id/variants', ...withText, validate(productValidation.variants), productController.updateVariants);

router.patch('/:id/status', ...withText, validate(productValidation.status), productController.setStatus);
router.delete('/:id', productController.remove);

module.exports = router;
