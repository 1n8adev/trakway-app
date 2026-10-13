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

module.exports = router;
