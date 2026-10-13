import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

// App-wide notifications, shown as Material snackbars.
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 4000, panelClass: 'toast-success' });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Close', { duration: 6000, panelClass: 'toast-error' });
  }
}
