import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProductService } from '../../../service/product.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../service/auth.service';
import { ChatService } from '../../../service/chat.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './product-detail.html',
})
export class ProductDetailComponent implements OnInit {
  productForm: FormGroup;
  isEdit = false;
  isView = false;
  dynamicFields: string[] = [];

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

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ProductDetailComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: number | null, availableTags: string[], isView?: boolean },
    private productService: ProductService,
    private http: HttpClient,
    private chatService: ChatService,
    public authService: AuthService // 🚨 Đổi thành public để dùng trong HTML
  ) {
    this.isView = data.isView || false;
    this.availableTags = data.availableTags || [];
    this.productForm = this.fb.group({
      id: [null],
      product_name: ['', [Validators.required, Validators.minLength(5)]],
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

            this.variants.push(this.fb.group({
              id: [v.id], variantName: [v.variantName, Validators.required],
              price: [v.price, Validators.required], quantity: [v.quantity, Validators.required],
              image_url: [v.image_url || ''], dynamicAttributes: dynGroup
            }));
            this.isUploadingVariantImage.push(false);
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
      alert("Vui lòng đăng nhập để chat với Admin về sản phẩm này!");
      return;
    }

    // Dùng getRawValue() để lấy dữ liệu kể cả khi Form bị disable (isView = true)
    const formValue = this.productForm.getRawValue();

    if (!formValue.id) {
      alert("Sản phẩm chưa có trên hệ thống!");
      return;
    }

    const productInfo = {
      id: formValue.id,
      name: formValue.product_name,
      price: formValue.price,
      imageUrl: formValue.image_url
    };

    // Bắn tín hiệu sang Khung Chat
    this.chatService.triggerProductQuery(productInfo);

    // Tự động đóng Modal chi tiết sản phẩm lại để khách nhìn thấy Khung chat rõ hơn
    this.dialogRef.close();
  }

  onFileSelected(event: any) {
    if (this.isView) return;
    const file: File = event.target.files[0];
    if (file) {
      this.isUploadingImage = true;
      const formData = new FormData(); formData.append('file', file);
      this.http.post<{url: string}>('http://localhost:8080/api/upload/image', formData).subscribe({
        next: (res) => { this.uploadedImageUrl = res.url; this.productForm.patchValue({ image_url: res.url }); this.isUploadingImage = false; },
        error: () => { alert('Lỗi tải ảnh lên!'); this.isUploadingImage = false; }
      });
    }
  }

  onVariantFileSelected(event: any, index: number) {
    if (this.isView) return;
    const file: File = event.target.files[0];
    if (file) {
      this.isUploadingVariantImage[index] = true;
      const formData = new FormData(); formData.append('file', file);
      this.http.post<{url: string}>('http://localhost:8080/api/upload/image', formData).subscribe({
        next: (res) => { (this.variants.at(index) as FormGroup).patchValue({ image_url: res.url }); this.isUploadingVariantImage[index] = false; },
        error: () => { alert('Lỗi tải ảnh biến thể!'); this.isUploadingVariantImage[index] = false; }
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
      this.dynamicFields.forEach(f => { if (!dynGroup.contains(f)) dynGroup.addControl(f, this.fb.control({ value: '', disabled: this.isView })); });
    });
  }

  getLabel(key: string): string { return this.attributeDictionary[key] || key; }

  addVariant() {
    if (this.isView) return;
    const dynGroup = this.fb.group({});
    this.dynamicFields.forEach(f => dynGroup.addControl(f, this.fb.control('')));
    this.variants.push(this.fb.group({
      id: [null], variantName: ['', Validators.required], price: [this.productForm.value.price || 0, Validators.required],
      quantity: [1, Validators.min(1)], image_url: [''], dynamicAttributes: dynGroup
    }));
    this.isUploadingVariantImage.push(false);
  }
  removeVariant(index: number) { if (this.isView) return; this.variants.removeAt(index); this.isUploadingVariantImage.splice(index, 1); }

  save() {
    if (this.productForm.invalid || this.isView) return;
    const payload = JSON.parse(JSON.stringify(this.productForm.getRawValue()));

    payload.variants = payload.variants.map((v: any) => {
      const attrs = { ...v.dynamicAttributes };
      Object.keys(attrs).forEach(k => { if (!attrs[k]) delete attrs[k]; });
      v.attributes = JSON.stringify(attrs); delete v.dynamicAttributes; return v;
    });

    const request = this.isEdit ? this.productService.update(payload.id, payload) : this.productService.create(payload);
    request.subscribe({
      next: () => { alert(this.isEdit ? 'Cập nhật thành công!' : 'Thêm mới thành công!'); this.dialogRef.close(true); },
      error: () => alert('Đã xảy ra lỗi!')
    });
  }

  onCancel() { this.dialogRef.close(false); }
}
