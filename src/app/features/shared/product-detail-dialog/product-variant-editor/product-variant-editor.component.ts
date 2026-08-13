import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-variant-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-variant-editor.component.html',
  styleUrl: './product-variant-editor.component.css',
})
export class ProductVariantEditorComponent {
  @Input({ required: true }) group!: AbstractControl;
  @Input() index = 0;
  @Input() viewOnly = false;
  @Input() staffMode = false;
  @Input() existing = false;
  @Input() editable = false;
  @Input() removable = false;
  @Input() uploading = false;
  @Input() restocking = false;
  @Input() restockQuantity = 0;
  @Input() showReviews = false;
  @Input() dynamicFields: readonly string[] = [];
  @Input() fieldLabels: Readonly<Record<string, string>> = {};
  @Output() imageSelected = new EventEmitter<Event>();
  @Output() remove = new EventEmitter<void>();
  @Output() restock = new EventEmitter<void>();
  @Output() restockQuantityChange = new EventEmitter<number>();
  @Output() viewReviews = new EventEmitter<void>();

  isInvalid(controlName: string): boolean {
    const control = this.group.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get formGroup(): FormGroup {
    return this.group as FormGroup;
  }

  getLabel(field: string): string {
    return this.fieldLabels[field] || field.replace(/_/g, ' ');
  }

  get attributes(): { label: string; value: string }[] {
    const value = (this.group.get('dynamicAttributes') as FormGroup | null)?.getRawValue() || {};
    return Object.keys(value)
      .filter((key) => value[key])
      .map((key) => ({ label: this.getLabel(key), value: value[key] }));
  }
}
