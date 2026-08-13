import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { ActionDialogComponent, ActionDialogData } from '../features/shared/action-dialog/action-dialog.component';
import { APP_DIALOG_SIZE } from '../config/dialog.config';

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
      ...APP_DIALOG_SIZE.action,
      panelClass: 'app-action-dialog-panel',
      autoFocus: data.input ? 'textarea' : '.btn-confirm',
      restoreFocus: true,
    }).afterClosed();
  }
}
