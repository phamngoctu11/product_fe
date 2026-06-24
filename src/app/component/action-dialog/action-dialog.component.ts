import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export type ActionDialogTone = 'primary' | 'warning' | 'danger';

export interface ActionDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ActionDialogTone;
  icon?: string;
  details?: { label: string; value: string }[];
  input?: {
    label: string;
    placeholder?: string;
    value?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    hint?: string;
  };
}

@Component({
  selector: 'app-action-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './action-dialog.component.html',
  styleUrls: ['../../app.css', './action-dialog.component.css'],
})
export class ActionDialogComponent {
  inputValue = '';
  touched = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ActionDialogData,
    private dialogRef: MatDialogRef<ActionDialogComponent, boolean | string>,
  ) {
    this.inputValue = data.input?.value || '';
  }

  get tone(): ActionDialogTone {
    return this.data.tone || 'primary';
  }

  get isInputInvalid(): boolean {
    const input = this.data.input;
    if (!input) return false;
    const value = this.inputValue.trim();
    if (input.required && !value) return true;
    return !!input.minLength && value.length > 0 && value.length < input.minLength;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    this.touched = true;
    if (this.isInputInvalid) return;
    this.dialogRef.close(this.data.input ? this.inputValue.trim() : true);
  }
}
