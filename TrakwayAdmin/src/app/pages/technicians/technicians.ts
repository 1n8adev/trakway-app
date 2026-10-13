import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Pagination } from '../../core/models/api.model';
import { Technician } from '../../core/models/technician.model';
import { ServiceBookingService } from '../../core/services/service-booking.service';
import { TechnicianService } from '../../core/services/technician.service';
import { ToastService } from '../../core/services/toast.service';
import { assetUrl } from '../../core/utils/asset-url';
import { getErrorMessage } from '../../core/utils/http-error';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';
import { IdProofViewer, IdProofViewerData } from './id-proof-viewer/id-proof-viewer';
import { TechnicianForm, TechnicianFormData } from './technician-form/technician-form';

// Installation technicians who are assigned service bookings.
@Component({
  selector: 'app-technicians',
  imports: [FormsModule, MatMenuModule, RouterLink],
  templateUrl: './technicians.html',
})
export class Technicians implements OnInit {
  private readonly technicianService = inject(TechnicianService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly search$ = new Subject<string>();

  private readonly limit = 20;

  protected readonly assetUrl = assetUrl;
  protected readonly states = toSignal(inject(ServiceBookingService).options().pipe(map((o) => o.states)), {
    initialValue: [] as string[],
  });

  protected readonly technicians = signal<Technician[]>([]);
  protected readonly pagination = signal<Pagination | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly busyId = signal<number | null>(null);

  protected search = '';
  protected state = '';
  protected status: '' | 'active' | 'inactive' = '';
  protected page = 1;

  constructor() {
    this.search$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed()).subscribe(() => {
      this.page = 1;
      this.load();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  protected get hasFilters(): boolean {
    return !!(this.search.trim() || this.state || this.status);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.technicianService
      .list({
        page: this.page,
        limit: this.limit,
        search: this.search.trim() || undefined,
        state: this.state || undefined,
        status: this.status || undefined,
      })
      .subscribe({
        next: (res) => {
          this.technicians.set(res.data);
          this.pagination.set(res.pagination);
          this.loading.set(false);
          if (!res.data.length && this.page > 1) {
            this.page--;
            this.load();
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(getErrorMessage(err, 'Could not load technicians'));
        },
      });
  }

  protected onSearch(value: string): void {
    this.search$.next(value);
  }

  protected onFilterChange(): void {
    this.page = 1;
    this.load();
  }

  protected clearFilters(): void {
    this.search = '';
    this.state = '';
    this.status = '';
    this.page = 1;
    this.load();
  }

  protected goTo(page: number): void {
    this.page = page;
    this.load();
  }

  // technician null = onboard.
  protected openForm(technician: Technician | null = null): void {
    this.dialog
      .open<TechnicianForm, TechnicianFormData, Technician>(TechnicianForm, {
        data: { technician },
        width: '760px',
        autoFocus: '#tech-name',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.toast.success(technician ? 'Technician updated' : 'Technician onboarded');
        if (technician && this.matchesFilter(saved)) {
          this.technicians.update((list) => list.map((t) => (t.id === saved.id ? saved : t)));
        } else {
          this.load();
        }
      });
  }

  protected viewIdProof(technician: Technician): void {
    this.dialog.open<IdProofViewer, IdProofViewerData>(IdProofViewer, {
      data: { technician },
      width: '720px',
      autoFocus: false,
    });
  }

  protected toggleStatus(technician: Technician): void {
    this.busyId.set(technician.id);
    this.technicianService.setStatus(technician.id, !technician.is_active).subscribe({
      next: (res) => {
        this.busyId.set(null);
        this.toast.success(res.message);
        if (this.matchesFilter(res.data)) this.technicians.update((list) => list.map((t) => (t.id === technician.id ? res.data : t)));
        else this.load();
      },
      error: (err) => {
        this.busyId.set(null);
        this.toast.error(getErrorMessage(err, 'Could not change status'));
      },
    });
  }

  protected confirmDelete(technician: Technician): void {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        data: {
          title: 'Delete technician?',
          message: `${technician.name} and their photos, including the ID proof, will be permanently deleted. To stop assigning work, deactivate instead.`,
          confirmText: 'Delete',
          danger: true,
        },
        width: '460px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.busyId.set(technician.id);
        this.technicianService.remove(technician.id).subscribe({
          next: () => {
            this.busyId.set(null);
            this.toast.success('Technician deleted');
            this.load();
          },
          error: (err) => {
            this.busyId.set(null);
            this.toast.error(getErrorMessage(err, 'Could not delete technician'));
          },
        });
      });
  }

  private matchesFilter(t: Technician): boolean {
    return (!this.status || (this.status === 'active') === t.is_active) && (!this.state || this.state === t.state);
  }
}
