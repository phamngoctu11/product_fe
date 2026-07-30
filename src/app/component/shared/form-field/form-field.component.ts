import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

const DEFAULT_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  required: 'Trường này là bắt buộc.',
  email: 'Email không đúng định dạng.',
  minlength: 'Nội dung chưa đủ độ dài tối thiểu.',
  maxlength: 'Nội dung vượt quá độ dài cho phép.',
  min: 'Giá trị nhỏ hơn mức cho phép.',
  max: 'Giá trị lớn hơn mức cho phép.',
  pattern: 'Giá trị không đúng định dạng.',
};

@Component({
  selector: 'app-form-field',
  standalone: true,
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.css',
})
export class FormFieldComponent {
  @Input({ required: true }) label = '';
  @Input() for = '';
  @Input() required = false;
  @Input() control: AbstractControl | null | undefined;
  @Input() errorMap: Readonly<Record<string, string>> = {};

  get showError(): boolean {
    return !!this.control && this.control.invalid && (this.control.dirty || this.control.touched);
  }

  get errorMessage(): string {
    const errorKey = Object.keys(this.control?.errors ?? {})[0];
    return this.errorMap[errorKey] ?? DEFAULT_ERROR_MESSAGES[errorKey] ?? 'Giá trị không hợp lệ.';
  }
}
