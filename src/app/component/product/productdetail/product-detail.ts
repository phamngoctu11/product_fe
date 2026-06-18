import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject as injectToast } from '@angular/core';
import { ToastService } from '../../../service/toast.service';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProductService } from '../../../service/product.service';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../service/auth.service';
import { ChatService } from '../../../service/chat.service';
import { ConsultationService } from '../../../service/consultation.service';
import { ApiResponse, unwrapApiResponse } from '../../../model/api-response.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetailComponent implements OnInit {
  private readonly toast = injectToast(ToastService);
  productForm: FormGroup;
  isEdit = false;
  isView = false;
  dynamicFields: string[] = [];
  isStaffMode = false;

  availableTags: string[] = [];
  selectedTags: string[] = [];
  newTagInput: string = '';

  customFields: string[] = [];
  newCustomFieldInput: string = '';

  standardFields = ['size', 'color', 'material', 'fit', 'ram', 'storage', 'chipset', 'power', 'capacity', 'shade', 'volume', 'skin_type', 'flavor', 'weight', 'type'];
  attributeDictionary: { [key: string]: string } = {
    'size': 'Kích cỡ', 'color': 'Màu sắc', 'material': 'Chất liệu', 'fit': 'Kiểu dáng',
    'ram': 'RAM', 'storage': 'Bộ nhớ (ROM)', 'chipset': 'Vi xử lý', 'power': 'Công suất',
    'capacity': 'Dung tích', 'shade': 'Mã màu / Tone', 'volume': 'Thể tích',
    'skin_type': 'Loại da phù hợp', 'flavor': 'Hương vị', 'weight': 'Trọng lượng',
    'type': 'Phân loại chung'
  };

  isUploadingImage: boolean = false;
  uploadedImageUrl: string = '';
  isUploadingVariantImage: boolean[] = [];
  staffRestockQuantities: number[] = [];
  isRestockingVariant: boolean[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ProductDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number | null, availableTags: string[], isView?: boolean, staffMode?: boolean },
    private productService: ProductService,
    private http: HttpClient,
    private chatService: ChatService,
    private consultationService: ConsultationService,
    public authService: AuthService // 🚨 Đổi thành public để dùng trong HTML
  ) {
    this.isView = data.isView || false;
    this.isStaffMode = !!data.staffMode;
    this.availableTags = data.availableTags || [];
    this.productForm = this.fb.group({
      id: [null],
      product_name: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      tags: [''],
      image_url: [''],
      variants: this.fb.array([])
    });
  }

  get variants(): FormArray { return this.productForm.get('variants') as FormArray; }

  ngOnInit() {
    this.productForm.get('tags')?.valueChanges.subscribe(() => this.refreshDynamicFields());

    if (this.isView) {
      this.productForm.disable();
    }

    if (this.data && this.data.id) {
      this.isEdit = true;
      this.productService.getById(this.data.id).subscribe((res: any) => {
        this.uploadedImageUrl = res.image_url || '';

        this.productForm.patchValue({
          id: res.id, product_name: res.product_name, price: res.price,
          tags: res.tags, image_url: this.uploadedImageUrl
        });

        if (res.tags) this.selectedTags = res.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t !== '');
        this.variants.clear();
        this.isUploadingVariantImage = [];

        if (res.variants) {
          res.variants.forEach((v: any) => {
            const parsed = v.attributes ? JSON.parse(v.attributes) : {};
            Object.keys(parsed).forEach(k => {
              if (!this.standardFields.includes(k) && !this.customFields.includes(k)) this.customFields.push(k);
            });
            const dynGroup = this.fb.group({});
            Object.keys(parsed).forEach(k => dynGroup.addControl(k, this.fb.control(parsed[k])));

            const variantGroup = this.fb.group({
              id: [v.id], variantName: [v.variantName, Validators.required],
              price: [v.price, [Validators.required, Validators.min(0)]], quantity: [v.quantity, [Validators.required, Validators.min(0)]],
              image_url: [v.image_url || ''], dynamicAttributes: dynGroup
            });

            if (this.isStaffMode) {
              variantGroup.disable({ emitEvent: false });
            }

            this.variants.push(variantGroup);
            this.isUploadingVariantImage.push(false);
            this.staffRestockQuantities.push(0);
            this.isRestockingVariant.push(false);
          });
          this.refreshDynamicFields();

          if (this.isView) this.productForm.disable();
        }
      });
    } else {
      this.addVariant();
    }
  }

  // 🚨 HÀM TƯ VẤN ĐÃ ĐƯỢC FIX CHUẨN
  askAboutProduct() {
    if (!this.authService.isLoggedIn()) {
      this.toast.notify("Vui lòng đăng nhập để chat với Admin về sản phẩm này!");
      return;
    }

    // Dùng getRawValue() để lấy dữ liệu kể cả khi Form bị disable (isView = true)
    const formValue = this.productForm.getRawValue();

    if (!formValue.id) {
      this.toast.notify("Sản phẩm chưa có trên hệ thống!");
      return;
    }

    const productInfo = {
      id: formValue.id,
      name: formValue.product_name,
      price: formValue.price,
      imageUrl: formValue.image_url,
      tags: formValue.tags || '',
      variantsCount: formValue.variants ? formValue.variants.length : 0
    };

    this.consultationService.createRequest({
      productId: productInfo.id,
      firstMessage: `Tôi cần tư vấn thêm về sản phẩm ${productInfo.name}.`,
    }).subscribe({
      next: (consultation) => {
        this.chatService.openConsultation(consultation, productInfo);
        this.toast.notify('Đã gửi yêu cầu tư vấn. Nhân viên sẽ phản hồi trong khung chat.');
        this.dialogRef.close();
      },
      error: () => this.toast.notify('Không thể tạo yêu cầu tư vấn lúc này. Vui lòng thử lại sau.'),
    });
  }

  onFileSelected(event: any) {
    if (this.isView) return;
    const file: File = event.target.files[0];
    if (file) {
      this.isUploadingImage = true;
      const formData = new FormData(); formData.append('file', file);
      this.http
        .post<ApiResponse<{ url: string }> | { url: string }>(`${environment.apiUrl}/upload/image`, formData)
        .pipe(map(unwrapApiResponse))
        .subscribe({
        next: (res) => { this.uploadedImageUrl = res.url; this.productForm.patchValue({ image_url: res.url }); this.isUploadingImage = false; },
        error: () => { this.toast.notify('Lỗi tải ảnh lên!'); this.isUploadingImage = false; }
      });
    }
  }

  onVariantFileSelected(event: any, index: number) {
    if (!this.canEditVariant(index)) return;
    const file: File = event.target.files[0];
    if (file) {
      this.isUploadingVariantImage[index] = true;
      const formData = new FormData(); formData.append('file', file);
      this.http
        .post<ApiResponse<{ url: string }> | { url: string }>(`${environment.apiUrl}/upload/image`, formData)
        .pipe(map(unwrapApiResponse))
        .subscribe({
        next: (res) => { (this.variants.at(index) as FormGroup).patchValue({ image_url: res.url }); this.isUploadingVariantImage[index] = false; },
        error: () => { this.toast.notify('Lỗi tải ảnh biến thể!'); this.isUploadingVariantImage[index] = false; }
      });
    }
  }

  getUnselectedAvailableTags(): string[] { return this.availableTags.filter(t => !this.selectedTags.includes(t)); }
  toggleTag(tag: string) {
    if (this.isView) return;
    if (this.selectedTags.includes(tag)) this.selectedTags = this.selectedTags.filter(t => t !== tag);
    else this.selectedTags.push(tag);
    this.syncTagsToForm();
  }

  addNewTag() {
    if (this.isView) return;
    let tag = this.newTagInput.trim().toLowerCase();
    if (!tag) return;
    if (!tag.startsWith('#')) tag = '#' + tag;
    if (!this.selectedTags.includes(tag)) this.selectedTags.push(tag);
    if (!this.availableTags.includes(tag)) this.availableTags.push(tag);
    this.newTagInput = ''; this.syncTagsToForm();
  }
  syncTagsToForm() { this.productForm.patchValue({ tags: this.selectedTags.join(', ') }); }

  addCustomField() {
    if (this.isView) return;
    const field = this.newCustomFieldInput.trim();
    if (!field) return;
    if (!this.customFields.includes(field)) this.customFields.push(field);
    this.refreshDynamicFields(); this.newCustomFieldInput = '';
  }
  removeCustomField(field: string) {
    if (this.isView) return;
    this.customFields = this.customFields.filter(f => f !== field);
    this.variants.controls.forEach(control => {
      const dynGroup = control.get('dynamicAttributes') as FormGroup;
      if (dynGroup.contains(field)) dynGroup.removeControl(field);
    });
    this.refreshDynamicFields();
  }

  refreshDynamicFields() {
    const t = (this.productForm.get('tags')?.value || '').toLowerCase();
    let newFieldsSet = new Set<string>();
    if (t.includes('#quanao') || t.includes('#thoitrang') || t.includes('áo') || t.includes('quần') || t.includes('#vay')) ['size', 'color', 'material', 'fit'].forEach(f => newFieldsSet.add(f));
    if (t.includes('#giay') || t.includes('#dep') || t.includes('#balo')) ['size', 'color', 'material'].forEach(f => newFieldsSet.add(f));
    if (t.includes('#dienthoai') || t.includes('#laptop') || t.includes('#congnghe')) ['color', 'ram', 'storage', 'chipset'].forEach(f => newFieldsSet.add(f));
    if (t.includes('#giadung') || t.includes('#dienmay')) ['power', 'capacity', 'material', 'color'].forEach(f => newFieldsSet.add(f));
    if (t.includes('#mypham') || t.includes('#lamdep')) ['shade', 'volume', 'skin_type'].forEach(f => newFieldsSet.add(f));
    if (t.includes('#thucpham') || t.includes('#doan') || t.includes('#douong')) ['flavor', 'weight'].forEach(f => newFieldsSet.add(f));
    this.customFields.forEach(f => newFieldsSet.add(f));
    if (newFieldsSet.size === 0) newFieldsSet.add('type');
    this.dynamicFields = Array.from(newFieldsSet);
    this.variants.controls.forEach(control => {
      const dynGroup = control.get('dynamicAttributes') as FormGroup;
      const lockExistingVariant = this.isStaffMode && !!control.get('id')?.value;
      this.dynamicFields.forEach(f => {
        if (!dynGroup.contains(f)) {
          dynGroup.addControl(f, this.fb.control({ value: '', disabled: this.isView || lockExistingVariant }));
        }
      });
      if (lockExistingVariant) {
        control.disable({ emitEvent: false });
      }
    });
  }

  getLabel(key: string): string { return this.attributeDictionary[key] || key; }

  isExistingVariant(index: number): boolean {
    return !!this.variants.at(index)?.get('id')?.value;
  }

  canEditVariant(index: number): boolean {
    return !this.isView && (!this.isStaffMode || !this.isExistingVariant(index));
  }

  canRemoveVariant(index: number): boolean {
    return !this.isView && (!this.isStaffMode || !this.isExistingVariant(index));
  }

  isInvalid(controlName: string): boolean {
    const control = this.productForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  isVariantInvalid(index: number, controlName: string): boolean {
    const control = this.variants.at(index).get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  addVariant() {
    if (this.isView) return;
    const dynGroup = this.fb.group({});
    this.dynamicFields.forEach(f => dynGroup.addControl(f, this.fb.control('')));
    this.variants.push(this.fb.group({
      id: [null], variantName: ['', Validators.required], price: [this.productForm.value.price || 0, [Validators.required, Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(0)]], image_url: [''], dynamicAttributes: dynGroup
    }));
    this.isUploadingVariantImage.push(false);
    this.staffRestockQuantities.push(0);
    this.isRestockingVariant.push(false);
  }

  restockVariant(index: number) {
    if (!this.isStaffMode || this.isView) return;

    const variantId = this.variants.at(index)?.get('id')?.value;
    const quantity = Number(this.staffRestockQuantities[index] || 0);
    const userId = this.authService.getUserId();

    if (!variantId) {
      this.toast.notify('Chỉ có thể nhập kho cho phân loại đã tồn tại.');
      return;
    }

    if (!userId) {
      this.toast.notify('Không tìm thấy userId!');
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.toast.notify('Số lượng nhập kho phải lớn hơn 0.');
      return;
    }

    this.isRestockingVariant[index] = true;
    this.productService.restockVariant(variantId, { quantity }, userId).subscribe({
      next: (updatedVariant) => {
        const currentQuantity = Number(this.variants.at(index)?.get('quantity')?.value || 0);
        this.variants.at(index)?.patchValue(
          { quantity: updatedVariant?.quantity ?? currentQuantity + quantity },
          { emitEvent: false }
        );
        this.staffRestockQuantities[index] = 0;
        this.isRestockingVariant[index] = false;
        this.toast.notify('Nhập kho thành công!');
      },
      error: () => {
        this.isRestockingVariant[index] = false;
        this.toast.notify('Không thể nhập kho cho phân loại này.');
      },
    });
  }

  removeVariant(index: number) {
    if (!this.canRemoveVariant(index)) return;
    this.variants.removeAt(index);
    this.isUploadingVariantImage.splice(index, 1);
    this.staffRestockQuantities.splice(index, 1);
    this.isRestockingVariant.splice(index, 1);
  }

  save() {
    const userId = this.authService.getUserId();

    if (this.productForm.invalid || this.isView) {
      this.productForm.markAllAsTouched();
      return;
    }
    if (!userId) {
      this.toast.notify('Không tìm thấy userId!');
      return;
    }
    const payload = JSON.parse(JSON.stringify(this.productForm.getRawValue()));

    payload.variants = payload.variants.map((v: any) => {
      const attrs = { ...v.dynamicAttributes };
      Object.keys(attrs).forEach(k => { if (!attrs[k]) delete attrs[k]; });
      v.attributes = JSON.stringify(attrs); delete v.dynamicAttributes; return v;
    });

    if (this.isStaffMode) {
      this.saveStaffProductChanges(payload, userId);
      return;
    }

    const request = this.isEdit ? this.productService.update(payload.id, payload, userId) : this.productService.create(payload, userId);
    request.subscribe({
      next: () => { this.toast.notify(this.isEdit ? 'Cập nhật thành công!' : 'Thêm mới thành công!'); this.dialogRef.close(true); },
      error: () => this.toast.notify('Đã xảy ra lỗi!')
    });
  }

  private saveStaffProductChanges(payload: any, userId: number) {
    if (!payload.id) {
      this.toast.notify('Staff chỉ được cập nhật sản phẩm đã tồn tại.');
      return;
    }

    const basicInfo = {
      product_name: payload.product_name,
      price: payload.price,
      tags: payload.tags,
      image_url: payload.image_url,
    };

    const newVariants = (payload.variants || [])
      .filter((variant: any) => !variant.id)
      .map((variant: any) => {
        delete variant.id;
        delete variant.parsedAttributes;
        delete variant.restockQuantity;
        return variant;
      });

    const requests = [
      this.productService.updateStaffInfo(payload.id, basicInfo),
      ...newVariants.map((variant: any) => this.productService.addVariant(payload.id, variant, userId)),
    ];

    forkJoin(requests).subscribe({
      next: () => {
        this.toast.notify(newVariants.length > 0 ? 'Đã cập nhật thông tin và thêm phân loại mới!' : 'Đã cập nhật thông tin sản phẩm!');
        this.dialogRef.close(true);
      },
      error: () => this.toast.notify('Không thể cập nhật sản phẩm bằng quyền staff.'),
    });
  }

  onCancel() { this.dialogRef.close(false); }
}
