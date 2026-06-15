import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ActionDialogComponent, ActionDialogData } from '../component/action-dialog/action-dialog.component';

@Injectable({ providedIn: 'root' })
export class ActionDialogService {
  constructor(private dialog: MatDialog) {}

  confirm(data: ActionDialogData): Observable<boolean> {
    return this.open(data).pipe(map((result) => result === true));
  }

  prompt(data: ActionDialogData): Observable<string | null> {
    return this.open(data).pipe(map((result) => typeof result === 'string' ? result : null));
  }

  private open(data: ActionDialogData): Observable<boolean | string | undefined> {
    return this.dialog.open(ActionDialogComponent, {
      data,
      width: '560px',
      maxWidth: 'calc(100vw - 24px)',
      panelClass: 'app-action-dialog-panel',
      autoFocus: data.input ? 'textarea' : '.btn-confirm',
      restoreFocus: true,
    }).afterClosed();
  }
}
