import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import type { ProductEdit } from './pages/products/product-edit/product-edit';
import type { InvoiceForm } from './pages/vendor-invoices/invoice-form/invoice-form';

// Asks before leaving the product editor with unsaved changes on the open tab.
const confirmLeaveProduct = (page: ProductEdit) => page.confirmDiscard();
// Same for the vendor invoice editor.
const confirmLeaveInvoice = (page: InvoiceForm) => page.confirmDiscard();

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · Trakway Admin',
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    title: 'Forgot password · Trakway Admin',
    loadComponent: () => import('./pages/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'products',
        title: 'Products · Trakway Admin',
        loadComponent: () => import('./pages/products/products').then((m) => m.Products),
      },
      {
        path: 'products/new',
        title: 'Add Product · Trakway Admin',
        loadComponent: () => import('./pages/products/product-edit/product-edit').then((m) => m.ProductEdit),
        canDeactivate: [confirmLeaveProduct],
      },
      {
        path: 'products/:id/edit',
        title: 'Edit Product · Trakway Admin',
        loadComponent: () => import('./pages/products/product-edit/product-edit').then((m) => m.ProductEdit),
        canDeactivate: [confirmLeaveProduct],
      },
      {
        path: 'categories',
        title: 'Categories · Trakway Admin',
        loadComponent: () => import('./pages/categories/categories').then((m) => m.Categories),
      },
      {
        path: 'attributes',
        title: 'Attributes · Trakway Admin',
        loadComponent: () => import('./pages/attributes/attributes').then((m) => m.Attributes),
      },
      {
        path: 'service-bookings',
        title: 'Service Bookings · Trakway Admin',
        loadComponent: () => import('./pages/service-bookings/service-bookings').then((m) => m.ServiceBookings),
      },
      {
        path: 'technicians',
        title: 'Technicians · Trakway Admin',
        loadComponent: () => import('./pages/technicians/technicians').then((m) => m.Technicians),
      },
      {
        path: 'orders',
        title: 'Orders · Trakway Admin',
        loadComponent: () => import('./pages/orders/orders').then((m) => m.Orders),
      },
      {
        path: 'orders/:id',
        title: 'Order · Trakway Admin',
        loadComponent: () => import('./pages/orders/order-detail/order-detail').then((m) => m.OrderDetail),
      },
      {
        path: 'accessories',
        title: 'Accessories · Trakway Admin',
        loadComponent: () => import('./pages/accessories/accessories').then((m) => m.Accessories),
      },
      {
        path: 'vendors',
        title: 'Vendors · Trakway Admin',
        loadComponent: () => import('./pages/vendors/vendors').then((m) => m.Vendors),
      },
      {
        path: 'vendor-invoices',
        title: 'Vendor Invoices · Trakway Admin',
        loadComponent: () => import('./pages/vendor-invoices/vendor-invoices').then((m) => m.VendorInvoices),
      },
      {
        path: 'vendor-invoices/new',
        title: 'New Invoice · Trakway Admin',
        loadComponent: () => import('./pages/vendor-invoices/invoice-form/invoice-form').then((m) => m.InvoiceForm),
        canDeactivate: [confirmLeaveInvoice],
      },
      {
        path: 'vendor-invoices/:id',
        title: 'Invoice · Trakway Admin',
        loadComponent: () => import('./pages/vendor-invoices/invoice-detail/invoice-detail').then((m) => m.InvoiceDetail),
      },
      {
        path: 'vendor-invoices/:id/edit',
        title: 'Edit Invoice · Trakway Admin',
        loadComponent: () => import('./pages/vendor-invoices/invoice-form/invoice-form').then((m) => m.InvoiceForm),
        canDeactivate: [confirmLeaveInvoice],
      },
      {
        path: 'settings/invoice',
        title: 'Invoice Settings · Trakway Admin',
        loadComponent: () => import('./pages/settings/invoice-settings/invoice-settings').then((m) => m.InvoiceSettingsPage),
      },
      {
        path: 'coupons',
        title: 'Coupons · Trakway Admin',
        loadComponent: () => import('./pages/coupons/coupons').then((m) => m.Coupons),
      },
      {
        path: 'users',
        title: 'Website Users · Trakway Admin',
        loadComponent: () => import('./pages/users/users').then((m) => m.Users),
      },
      {
        path: 'users/:id',
        title: 'Customer · Trakway Admin',
        loadComponent: () => import('./pages/users/user-detail/user-detail').then((m) => m.UserDetail),
      },
      {
        path: 'faqs',
        title: 'FAQs · Trakway Admin',
        loadComponent: () => import('./pages/faqs/faqs').then((m) => m.Faqs),
      },
      {
        path: 'client-logos',
        title: 'Client Logos · Trakway Admin',
        loadComponent: () => import('./pages/client-logos/client-logos').then((m) => m.ClientLogos),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
