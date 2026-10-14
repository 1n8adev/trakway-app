const express = require('express');
const categoryRoutes = require('./category/category.routes');
const productRoutes = require('./product/product.routes');
const faqRoutes = require('./faq/faq.routes');
const serviceBookingRoutes = require('./service-booking/service-booking.routes');
const authRoutes = require('./auth/auth.routes');
const addressRoutes = require('./address/address.routes');
const cartRoutes = require('./cart/cart.routes');
const { checkoutRouter, ordersRouter } = require('./order/order.routes');
const clientLogoRoutes = require('./client-logo/client-logo.routes');

// Storefront API, mounted at /api. Catalogue, FAQs, bookings and auth are public;
// addresses, cart, checkout and orders need a logged-in customer (see requireCustomer).
const router = express.Router();

router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/faqs', faqRoutes);
router.use('/client-logos', clientLogoRoutes);
router.use('/service-bookings', serviceBookingRoutes);
router.use('/auth', authRoutes);
router.use('/addresses', addressRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRouter);
router.use('/orders', ordersRouter);

module.exports = router;
