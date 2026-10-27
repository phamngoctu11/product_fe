import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductTypeField, ProductTypeOption } from '../../../model/custom-request.model';
import { getApiErrorMessage } from '../../../model/api-response.model';
import { ProductService, SaveProductType } from '../../../service/product.service';
import { ToastService } from '../../../service/toast.service';

@Component({
  standalone: true,
  selector: 'app-product-types',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-types.component.html',
  styleUrl: './product-types.component.css',
})
export class ProductTypesComponent implements OnInit {
  types: ProductTypeOption[] = [];
  editingType: ProductTypeOption | null = null;
  viewingType: ProductTypeOption | null = null;
  pendingDeleteType: ProductTypeOption | null = null;
  isEditorOpen = false;
  typeForm: SaveProductType = this.emptyType();
  fieldDraft: ProductTypeField = this.emptyField();
  optionText = '';
  busy = false;
  error = '';

  constructor(private readonly products: ProductService, private readonly toast: ToastService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.products.getProductTypes(true).subscribe({
      next: (items) => this.types = items,
      error: (error) => this.error = getApiErrorMessage(error, 'Không thể tải loại sản phẩm.'),
    });
  }

  addField(): void {
    const field = { ...this.fieldDraft, displayOrder: this.typeForm.fields.length };
    if (!field.code.trim() || !field.label.trim()) return;
    if (['SINGLE_SELECT', 'MULTI_SELECT'].includes(field.kind) && !field.options?.length) {
      field.options = this.optionText.split(',').map((value) => value.trim()).filter(Boolean);
    }
    this.typeForm.fields = [...this.typeForm.fields, field];
    this.fieldDraft = this.emptyField();
    this.optionText = '';
  }

  removeField(index: number): void { this.typeForm.fields = this.typeForm.fields.filter((_, i) => i !== index); }

  openCreate(): void {
    this.resetType();
    this.isEditorOpen = true;
  }

  viewType(type: ProductTypeOption): void { this.viewingType = type; }
  closeTypeDetails(): void { this.viewingType = null; }

  @HostListener('document:keydown.escape')
  closeActiveDialogOnEscape(): void {
    if (this.busy) return;
    if (this.isEditorOpen) this.resetType();
    else if (this.viewingType) this.closeTypeDetails();
    else if (this.pendingDeleteType) this.cancelDeleteType();
  }

  editType(type: ProductTypeOption): void {
    this.viewingType = null;
    this.editingType = type;
    this.typeForm = {
      code: type.code,
      name: type.name,
      description: type.description || '',
      active: type.active,
      fields: type.fields.map((field) => ({ ...field, options: [...(field.options || [])] })),
    };
    this.isEditorOpen = true;
  }

  saveType(): void {
    this.busy = true;
    this.products.saveProductType(this.typeForm, this.editingType?.id).subscribe({
      next: () => { this.toast.notify('Đã lưu loại sản phẩm.'); this.resetType(); this.load(); this.busy = false; },
      error: (error) => { this.busy = false; this.toast.notify(getApiErrorMessage(error, 'Không thể lưu loại sản phẩm.')); },
    });
  }

  requestDeleteType(type: ProductTypeOption): void { this.pendingDeleteType = type; }
  cancelDeleteType(): void { this.pendingDeleteType = null; }

  confirmDeleteType(): void {
    const type = this.pendingDeleteType;
    if (!type) return;
    this.busy = true;
    this.products.deactivateProductType(type.id).subscribe({
      next: () => {
        this.toast.notify('Đã ngừng sử dụng loại sản phẩm.');
        this.viewingType = null;
        this.pendingDeleteType = null;
        this.busy = false;
        this.load();
      },
      error: (error) => {
        this.busy = false;
        this.toast.notify(getApiErrorMessage(error, 'Không thể xóa loại sản phẩm.'));
      },
    });
  }

  fieldKindLabel(kind: ProductTypeField['kind']): string {
    const labels: Record<ProductTypeField['kind'], string> = {
      TEXT: 'Văn bản',
      NUMBER: 'Số',
      SINGLE_SELECT: 'Chọn một',
      MULTI_SELECT: 'Chọn nhiều',
      BOOLEAN: 'Có / không',
    };
    return labels[kind];
  }

  resetType(): void { this.typeForm = this.emptyType(); this.editingType = null; this.isEditorOpen = false; }
  private emptyType(): SaveProductType { return { code: '', name: '', description: '', active: true, fields: [] }; }
  private emptyField(): ProductTypeField { return { code: '', label: '', kind: 'TEXT', options: [] }; }
}
