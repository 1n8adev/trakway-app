const express = require('express');
const { authenticate, authorize } = require('../../middlewares/auth');
const authRoutes = require('./auth/auth.routes');
const categoryRoutes = require('./category/category.routes');
const productRoutes = require('./product/product.routes');
const attributeRoutes = require('./attribute/attribute.routes');
const faqRoutes = require('./faq/faq.routes');
const serviceBookingRoutes = require('./service-booking/service-booking.routes');
const technicianRoutes = require('./technician/technician.routes');
const userRoutes = require('./user/user.routes');
const couponRoutes = require('./coupon/coupon.routes');
const orderRoutes = require('./order/order.routes');
const clientLogoRoutes = require('./client-logo/client-logo.routes');
const vendorRoutes = require('./vendor/vendor.routes');
const vendorInvoiceRoutes = require('./vendor-invoice/vendor-invoice.routes');
const vendorInvoiceTypeRoutes = require('./vendor-invoice-type/vendor-invoice-type.routes');
const productAccessoryRoutes = require('./product-accessory/product-accessory.routes');
const supplierRoutes = require('./supplier/supplier.routes');
const supplierProductRoutes = require('./supplier-product/supplier-product.routes');
const purchaseRoutes = require('./purchase/purchase.routes');
const stockRoutes = require('./stock/stock.routes');
const settingRoutes = require('./setting/setting.routes');

const router = express.Router();

// Public admin routes
router.use('/auth', authRoutes);

// Everything below requires an admin JWT
router.use(authenticate, authorize('admin'));
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/attributes', attributeRoutes);
router.use('/faqs', faqRoutes);
router.use('/service-bookings', serviceBookingRoutes);
router.use('/technicians', technicianRoutes);
router.use('/users', userRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);
router.use('/client-logos', clientLogoRoutes);
router.use('/vendors', vendorRoutes);
router.use('/vendor-invoices', vendorInvoiceRoutes);
router.use('/vendor-invoice-types', vendorInvoiceTypeRoutes);
router.use('/product-accessories', productAccessoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/supplier-products', supplierProductRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/stock', stockRoutes);
router.use('/settings', settingRoutes);

module.exports = router;
