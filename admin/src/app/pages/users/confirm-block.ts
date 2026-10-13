import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { WebsiteUser } from '../../core/models/user.model';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';

// Blocking ends every session, so it asks first; unblocking goes straight through.
export function confirmStatusChange(dialog: MatDialog, user: WebsiteUser): Observable<boolean | undefined> {
  if (!user.is_active) return of(true);
  return dialog
    .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data: {
        title: 'Block customer?',
        message: `${user.name} will be logged out of every device and won't be able to sign in or place orders until you unblock them.`,
        confirmText: 'Block',
        danger: true,
      },
      width: '460px',
      autoFocus: false,
    })
    .afterClosed();
}
