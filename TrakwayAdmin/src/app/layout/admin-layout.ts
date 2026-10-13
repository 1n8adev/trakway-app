import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../core/services/auth.service';

type NavIcon = 'products' | 'categories' | 'attributes' | 'faqs' | 'bookings' | 'technicians' | 'users' | 'coupons' | 'orders';

interface NavSection {
  heading: string;
  items: { label: string; path: string; icon: NavIcon }[];
}

// Shell for every signed-in page: sidebar, floating top bar with the admin's menu, and logout.
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatMenuModule],
  templateUrl: './admin-layout.html',
})
export class AdminLayout implements OnInit {
  protected readonly auth = inject(AuthService);

  // Sidebar is always visible on lg+; below that it slides in over the page.
  protected readonly sidebarOpen = signal(false);

  protected readonly nav: NavSection[] = [
    {
      heading: 'Catalog',
      items: [
        { label: 'Products', path: '/products', icon: 'products' },
        { label: 'Categories', path: '/categories', icon: 'categories' },
        { label: 'Attributes', path: '/attributes', icon: 'attributes' },
      ],
    },
    {
      heading: 'Sales',
      items: [
        { label: 'Orders', path: '/orders', icon: 'orders' },
        { label: 'Coupons', path: '/coupons', icon: 'coupons' },
      ],
    },
    {
      heading: 'Service',
      items: [
        { label: 'Service Bookings', path: '/service-bookings', icon: 'bookings' },
        { label: 'Technicians', path: '/technicians', icon: 'technicians' },
      ],
    },
    {
      heading: 'Customers',
      items: [{ label: 'Website Users', path: '/users', icon: 'users' }],
    },
    {
      heading: 'Content',
      items: [{ label: 'FAQs', path: '/faqs', icon: 'faqs' }],
    },
  ];

  protected readonly initials = computed(() => {
    const name = this.auth.admin()?.name?.trim();
    if (!name) return 'A';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  });

  ngOnInit(): void {
    this.auth.loadProfile().subscribe();
  }

  protected logout(): void {
    this.auth.logout();
  }
}
