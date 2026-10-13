import { Component } from '@angular/core';

// Split-screen frame for signed-out pages: GPS brand panel on the left (desktop only), form on the right.
@Component({
  selector: 'app-auth-shell',
  template: `
    <div class="flex min-h-dvh bg-white font-sans">
      <!-- Light-orange panel, same from-brand-100 → brand-50 wash the website uses. -->
      <aside class="relative hidden w-1/2 items-center overflow-hidden bg-gradient-to-br from-brand-100 via-brand-50 to-brand-100 lg:flex">
        <div
          class="absolute inset-0 [background-image:radial-gradient(rgba(231,95,0,0.14)_1px,transparent_1px)] [background-size:28px_28px]"
        ></div>
        <div class="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl"></div>
        <div class="absolute -right-24 -bottom-40 h-96 w-96 rounded-full bg-brand-300/25 blur-3xl"></div>

        <div class="relative mx-auto max-w-lg px-12">
          <!-- GPS pin with signal rings -->
          <div class="relative mb-10 h-36 w-36" aria-hidden="true">
            <span class="absolute inset-0 animate-ping rounded-full bg-brand-500/15 [animation-duration:2.5s]"></span>
            <span class="absolute inset-3 rounded-full border-2 border-brand-500/25"></span>
            <span class="absolute inset-8 rounded-full border-2 border-brand-500/40"></span>
            <span class="absolute inset-[52px] rounded-full bg-gradient-to-br from-brand-600 to-brand-500 shadow-[0_4px_14px_rgba(231,95,0,0.45)]"></span>
            <svg class="absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
            </svg>
          </div>

          <div class="mb-6 h-1 w-14 rounded-full bg-gradient-to-r from-brand-600 to-brand-500"></div>
          <h2 class="text-[32px] leading-tight font-bold tracking-tight text-ink-800">
            Track every device, <span class="text-brand-500">every journey.</span>
          </h2>
          <p class="mt-3 text-base text-ink-700/80">
            Manage your GPS trackers, SIM &amp; recharge plans and orders from one dashboard.
          </p>

          <ul class="mt-8 space-y-4">
            @for (point of points; track point.title) {
              <li class="flex items-start gap-3">
                <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-brand-500 shadow-[0_2px_6px_rgba(231,95,0,0.15)]">
                  @switch (point.icon) {
                    @case ('live') {
                      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        <circle cx="12" cy="12" r="7" />
                      </svg>
                    }
                    @case ('alert') {
                      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                    }
                    @case ('sim') {
                      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                        <rect x="8" y="12" width="8" height="6" rx="1" />
                      </svg>
                    }
                  }
                </span>
                <div>
                  <p class="text-[15px] font-semibold text-ink-800">{{ point.title }}</p>
                  <p class="text-[14px] text-ink-700/70">{{ point.text }}</p>
                </div>
              </li>
            }
          </ul>
        </div>
      </aside>

      <section class="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div class="w-full max-w-[500px]">
          <!-- The PNG has wide, even white margins; object-cover at 17:4 crops them off. -->
          <img
            src="trakway-technologies.png"
            alt="Trakway Technologies"
            class="mb-12 aspect-[17/4] w-[260px] object-cover"
          />
          <ng-content />
        </div>
      </section>
    </div>
  `,
})
export class AuthShell {
  protected readonly points = [
    { icon: 'live', title: 'Real-time location', text: 'Vehicle, personal and pet trackers with live GPS updates.' },
    { icon: 'alert', title: 'Geo-fence & SOS alerts', text: 'Instant alerts when a device leaves a zone or raises SOS.' },
    { icon: 'sim', title: 'SIM & recharge plans', text: 'Sell trackers with the right SIM and recharge combination.' },
  ];
}
