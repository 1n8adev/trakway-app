import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {
  BOOKING_LIMITS,
  BookingStatus,
  BookingTechnician,
  BookingUpdatePayload,
  ServiceBooking,
  TechnicianChoice,
} from '../../../core/models/service-booking.model';
import { ServiceBookingService } from '../../../core/services/service-booking.service';
import { assetUrl } from '../../../core/utils/asset-url';
import { getErrorMessage, getFieldErrors } from '../../../core/utils/http-error';
import { applyServerErrors, controlError } from '../../../core/utils/form-errors';
import { formatIsoDate } from '../../../core/utils/date';
import { FIELD_BASE, fieldState } from '../../../core/utils/ui';
import { STATUS_BADGE } from '../booking-status';

export interface BookingDetailData {
  booking: ServiceBooking;
  // Pre-selects a status (e.g. "assigned" from the row menu's Assign technician).
  status?: BookingStatus;
}

const FALLBACK_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'completed', label: 'Completed' },
];

const MATCH_GROUPS: { match: TechnicianChoice['match']; label: string }[] = [
  { match: 'pincode', label: 'Same pincode' },
  { match: 'area', label: 'Nearby area' },
  { match: 'state', label: 'Same state' },
  { match: 'other', label: 'Other areas' },
];

export const MATCH_LABEL: Record<TechnicianChoice['match'], string> = {
  pincode: 'Same pincode',
  area: 'Nearby',
  state: 'Same state',
  other: 'Far',
};

// A booking can't be "assigned" without a technician.
const technicianForAssigned = (group: AbstractControl): ValidationErrors | null =>
  group.get('status')?.value === 'assigned' && !group.get('technician_id')?.value ? { technicianRequired: true } : null;

// Booking details plus status / technician / notes. Closes with the saved booking, or undefined when unchanged.
@Component({
  selector: 'app-booking-detail',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './booking-detail.html',
})
export class BookingDetail {
  private readonly fb = inject(FormBuilder);
  private readonly bookingService = inject(ServiceBookingService);
  private readonly dialogRef = inject<MatDialogRef<BookingDetail, ServiceBooking>>(MatDialogRef);
  private readonly data = inject<BookingDetailData>(MAT_DIALOG_DATA);

  protected readonly booking = signal(this.data.booking);
  protected readonly limits = BOOKING_LIMITS;
  protected readonly FIELD_BASE = FIELD_BASE;
  protected readonly STATUS_BADGE = STATUS_BADGE;
  protected readonly MATCH_LABEL = MATCH_LABEL;
  protected readonly formatIsoDate = formatIsoDate;
  protected readonly assetUrl = assetUrl;

  private readonly options = toSignal(this.bookingService.options(), { initialValue: null });
  protected readonly statuses = computed(() => this.options()?.statuses ?? FALLBACK_STATUSES);

  protected readonly choices = signal<TechnicianChoice[]>([]);
  protected readonly choicesLoading = signal(true);
  protected readonly choicesError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      status: [this.data.status ?? this.data.booking.status],
      technician_id: [this.data.booking.technician_id as number | null],
      admin_notes: [this.data.booking.admin_notes ?? '', [Validators.maxLength(BOOKING_LIMITS.maxAdminNotes)]],
    },
    { validators: technicianForAssigned },
  );

  // The dropdown value as a signal, for the selected-technician card.
  private readonly technicianId = toSignal(this.form.controls.technician_id.valueChanges, {
    initialValue: this.form.controls.technician_id.value,
  });

  // Choices grouped by distance (the API already sorts them).
  protected readonly groups = computed(() =>
    MATCH_GROUPS.map((g) => ({ label: g.label, items: this.choices().filter((c) => c.match === g.match) })).filter(
      (g) => g.items.length,
    ),
  );

  // The current technician may be inactive now, so they're not among the choices.
  protected readonly currentMissing = computed(() => {
    const current = this.booking().technician;
    return current && !this.choices().some((c) => c.id === current.id) ? current : null;
  });

  protected readonly selected = computed<BookingTechnician | null>(() => {
    const id = this.technicianId();
    if (!id) return null;
    return this.choices().find((c) => c.id === id) ?? (this.booking().technician?.id === id ? this.booking().technician : null);
  });

  protected readonly selectedChoice = computed(() => this.choices().find((c) => c.id === this.technicianId()) ?? null);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  // Map link for the service address.
  protected readonly mapUrl = computed(() => {
    const b = this.booking();
    const q = [b.address, b.pincode, b.state, 'India'].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  });

  constructor() {
    this.loadChoices();
  }

  protected loadChoices(): void {
    this.choicesLoading.set(true);
    this.choicesError.set(null);
    this.bookingService.technicianChoices(this.data.booking.id).subscribe({
      next: (list) => {
        this.choices.set(list);
        this.choicesLoading.set(false);
      },
      error: (err) => {
        this.choicesLoading.set(false);
        this.choicesError.set(getErrorMessage(err, 'Could not load technicians'));
      },
    });
  }

  protected choiceText(c: TechnicianChoice): string {
    return `${c.name} · ${c.pincode} · ${c.open_jobs === 1 ? '1 open job' : `${c.open_jobs} open jobs`}`;
  }

  protected technicianError(): string | null {
    const control = this.form.controls.technician_id;
    if (!control.touched) return null;
    if (this.form.hasError('technicianRequired')) return 'Choose a technician to assign this booking';
    return controlError(control, 'Technician');
  }

  protected notesError(): string | null {
    const control = this.form.controls.admin_notes;
    return control.touched ? controlError(control, 'Notes') : null;
  }

  protected fieldClass(invalid: boolean): string {
    return fieldState(invalid);
  }

  // Picking a technician on an open booking moves it to Assigned.
  protected onTechnicianChange(): void {
    if (this.form.controls.technician_id.value && this.form.controls.status.value === 'open') {
      this.form.controls.status.setValue('assigned');
    }
  }

  // Re-opening removes the technician on the API, so mirror that here.
  protected onStatusChange(): void {
    if (this.form.controls.status.value === 'open') this.form.controls.technician_id.setValue(null);
  }

  protected close(): void {
    if (!this.saving()) this.dialogRef.close();
  }

  // One PATCH /:id with only what changed (status, technician_id, admin_notes).
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const b = this.booking();
    const { status, technician_id, admin_notes } = this.form.getRawValue();
    const payload: BookingUpdatePayload = {};
    if (status !== b.status) payload.status = status;
    // "open" drops the technician on the API, so don't send one with it.
    if (status !== 'open' && technician_id !== b.technician_id) payload.technician_id = technician_id;
    const notes = admin_notes.trim() || null;
    if (notes !== (b.admin_notes ?? null)) payload.admin_notes = notes;
    if (!Object.keys(payload).length) {
      this.dialogRef.close();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.dialogRef.disableClose = true;
    this.bookingService.update(b.id, payload).subscribe({
      next: (res) => this.dialogRef.close(res.data),
      error: (err) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.error.set(getErrorMessage(err, 'Could not save booking'));
        applyServerErrors(this.form, getFieldErrors(err));
      },
    });
  }
}
