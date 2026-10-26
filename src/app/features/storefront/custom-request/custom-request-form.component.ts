import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CustomRequestService } from '../../../service/custom-request.service';
import { UploadService } from '../../../service/upload.service';
import { UserService } from '../../../service/user.service';
import { ToastService } from '../../../service/toast.service';
import { getApiErrorMessage } from '../../../model/api-response.model';
import {
  CUSTOM_DESCRIPTION_MAX_WORDS,
  CustomRequestDTO,
  CustomRequestSubmissionDTO,
  ProductTypeField,
  ProductTypeOption,
  countWords,
  isHttpUrl,
} from '../../../model/custom-request.model';
import { SfPageIntroComponent } from '../ui/page-intro/sf-page-intro.component';
import { SfButtonDirective } from '../ui/button/sf-button.directive';

function maxWordsValidator(max: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const words = countWords(control.value);
    return words > max ? { maxWords: { max, actual: words } } : null;
  };
}

function httpUrlValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (!value) return null; // ô trống sẽ bị lọc khi lưu
  return isHttpUrl(value) ? null : { httpUrl: true };
}

@Component({
  selector: 'app-custom-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SfPageIntroComponent, SfButtonDirective],
  templateUrl: './custom-request-form.component.html',
  styleUrl: './custom-request-form.component.css'
})
export class CustomRequestFormComponent implements OnInit, OnDestroy {
  readonly maxWords = CUSTOM_DESCRIPTION_MAX_WORDS;

  draftForm: FormGroup;
  submitForm: FormGroup;

  draftId: number | null = null;
  currentDraft: CustomRequestDTO | null = null;
  submission: CustomRequestSubmissionDTO | null = null;
  productTypes: ProductTypeOption[] = [];
  selectedFields: ProductTypeField[] = [];

  isLoading = false;
  isSaving = false;
  isSubmitting = false;
  isUploading = false;

  private createKey: string | null = null;
  private submitKey: string | null = null;
  private routeDraftId: number | null = null;
  private readonly subs = new Subscription();

  constructor(
    private readonly fb: FormBuilder,
    private readonly customRequestService: CustomRequestService,
    private readonly uploadService: UploadService,
    private readonly userService: UserService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    this.draftForm = this.fb.group({
      description: ['', [Validators.required, maxWordsValidator(CUSTOM_DESCRIPTION_MAX_WORDS)]],
      quantity: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      productTypeId: [null, Validators.required],
      fieldValues: this.fb.group({}),
      imageUrls: this.fb.array<FormControl<string | null>>([]),
    });

    this.submitForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      phone: ['', [Validators.required, Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      address: ['', Validators.required],
      note: ['', Validators.maxLength(1000)],
    });

    this.subs.add(this.submitForm.valueChanges.subscribe(() => (this.submitKey = null)));
    this.subs.add(this.draftForm.valueChanges.subscribe(() => (this.submitKey = null)));
    this.subs.add(this.draftForm.get('productTypeId')!.valueChanges.subscribe((value: number | null) => {
      this.onProductTypeChange(value);
    }));
  }

  get descriptionCtrl(): AbstractControl {
    return this.draftForm.get('description')!;
  }

  get wordCount(): number {
    return countWords(this.descriptionCtrl.value);
  }

  get imageUrls(): FormArray {
    return this.draftForm.get('imageUrls') as FormArray;
  }

  get isReadonly(): boolean {
    return !!this.currentDraft && !this.currentDraft.editable;
  }

  ngOnInit() {
    this.subs.add(this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const nextId = idParam && idParam !== 'new' ? Number(idParam) : null;
      if (nextId !== null && (!Number.isSafeInteger(nextId) || nextId <= 0)) {
        this.toast.notify('Đường dẫn bản nháp không hợp lệ.');
        this.router.navigate(['/store/custom-requests']);
        return;
      }
      if (nextId === this.routeDraftId) return;
      const previousRouteDraftId = this.routeDraftId;
      this.routeDraftId = nextId;
      if (nextId === null) {
        if (previousRouteDraftId !== null) {
          this.draftId = null;
          this.currentDraft = null;
          this.draftForm.enable({ emitEvent: false });
          this.submitForm.enable({ emitEvent: false });
          this.draftForm.reset({ description: '', quantity: 1 }, { emitEvent: false });
          this.imageUrls.clear({ emitEvent: false });
          this.selectedFields = [];
        }
        return;
      }
      if (this.currentDraft?.id === nextId) return;
      this.draftId = nextId;
      this.loadDraft();
    }));
    this.prefillContact();
    this.customRequestService.getProductTypes().subscribe({
      next: (types) => { this.productTypes = types; },
      error: (err) => this.toast.notify(getApiErrorMessage(err, 'Không thể tải danh sách loại sản phẩm.')),
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  isValidUrl(value: string | null): boolean {
    return isHttpUrl(value);
  }

  isInvalid(name: string): boolean {
    const ctrl = this.submitForm.get(name);
    return !!ctrl && ctrl.invalid && ctrl.touched;
  }

  private loadDraft() {
    if (!this.draftId) return;
    this.isLoading = true;
    this.customRequestService.get(this.draftId).subscribe({
      next: (draft) => {
        this.applyDraft(draft);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.toast.notify(getApiErrorMessage(err, 'Không thể tải bản nháp.'));
        this.router.navigate(['/store/custom-requests']);
      },
    });
  }

  private applyDraft(draft: CustomRequestDTO) {
    this.currentDraft = draft;
    this.draftId = draft.id;
    this.selectedFields = draft.fields ?? [];
    this.rebuildFieldControls(this.selectedFields, draft.fieldValues ?? {});
    this.draftForm.patchValue({ description: draft.description, quantity: draft.quantity, productTypeId: draft.productTypeId }, { emitEvent: false });
    this.imageUrls.clear({ emitEvent: false });
    (draft.imageUrls ?? []).forEach((url) => this.imageUrls.push(this.createUrlControl(url), { emitEvent: false }));
    this.draftForm.markAsPristine();

    if (this.isReadonly) {
      this.draftForm.disable({ emitEvent: false });
      this.submitForm.disable({ emitEvent: false });
    }
  }

  onProductTypeChange(value: number | null) {
    const type = this.productTypes.find((item) => item.id === value);
    this.selectedFields = type?.fields ?? [];
    this.rebuildFieldControls(this.selectedFields, {});
    this.draftForm.markAsDirty();
  }

  private rebuildFieldControls(fields: ProductTypeField[], values: Record<string, unknown>) {
    const controls: Record<string, FormControl> = {};
    for (const field of fields) {
      const validators = [field.kind === 'BOOLEAN' ? (control: AbstractControl) => control.value === null || control.value === undefined ? { required: true } : null : Validators.required];
      if (field.kind === 'TEXT' && field.maxLength) validators.push(Validators.maxLength(field.maxLength));
      if (field.kind === 'NUMBER' && field.minimum !== null && field.minimum !== undefined) validators.push(Validators.min(field.minimum));
      if (field.kind === 'NUMBER' && field.maximum !== null && field.maximum !== undefined) validators.push(Validators.max(field.maximum));
      controls[field.code] = this.fb.control(values[field.code] ?? (field.kind === 'MULTI_SELECT' ? [] : null), validators);
    }
    this.draftForm.setControl('fieldValues', this.fb.group(controls), { emitEvent: false });
  }

  private prefillContact() {
    this.userService.getInfor().subscribe({
      next: (user) => {
        if (!user) return;
        const fullName = `${user.lastname ?? ''} ${user.firstname ?? ''}`.trim();
        const current = this.submitForm.value;
        this.submitForm.patchValue(
          {
            fullName: current.fullName || fullName,
            phone: current.phone || user.phone || '',
            email: current.email || user.email || '',
            address: current.address || user.address || '',
          },
          { emitEvent: false },
        );
      },
      error: () => {},
    });
  }

  private createUrlControl(value = ''): FormControl<string | null> {
    return this.fb.control<string | null>(value, httpUrlValidator);
  }

  addImageUrl() {
    this.imageUrls.push(this.createUrlControl());
  }

  removeImageUrl(index: number) {
    this.imageUrls.removeAt(index);
    this.draftForm.markAsDirty();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    const invalid = files.find((f) => !f.type.startsWith('image/'));
    if (invalid) {
      this.toast.notify(`"${invalid.name}" không phải là file ảnh.`);
      return;
    }

    this.isUploading = true;
    let remaining = files.length;
    const done = () => {
      remaining -= 1;
      if (remaining === 0) this.isUploading = false;
    };

    files.forEach((file) => {
      this.uploadService.uploadImage(file).subscribe({
        next: (res) => {
          const url = res?.data?.url;
          if (url) {
            this.imageUrls.push(this.createUrlControl(url));
            this.draftForm.markAsDirty();
          } else {
            this.toast.notify(`Ảnh "${file.name}" chưa tải thành công.`);
          }
          done();
        },
        error: (err) => {
          this.toast.notify(getApiErrorMessage(err, `Ảnh "${file.name}" chưa tải thành công.`));
          done();
        },
      });
    });
  }

  saveDraft() {
    if (this.isReadonly) return;
    if (this.draftForm.invalid) {
      this.draftForm.markAllAsTouched();
      return;
    }

    const value = this.draftForm.getRawValue();
    const payload = {
      description: (value.description as string).trim(),
      quantity: Number(value.quantity),
      fieldValues: value.fieldValues as Record<string, unknown>,
      imageUrls: (value.imageUrls as (string | null)[])
        .map((u) => (u ?? '').trim())
        .filter((u) => u.length > 0),
    };

    this.isSaving = true;
    const request$ =
      this.draftId && this.currentDraft
        ? this.customRequestService.update(this.draftId, { description: payload.description, quantity: payload.quantity, fieldValues: payload.fieldValues, imageUrls: payload.imageUrls, expectedVersion: this.currentDraft.version })
        : this.customRequestService.create({ ...payload, productTypeId: Number(value.productTypeId) }, (this.createKey ??= this.customRequestService.newIdempotencyKey()));

    request$.subscribe({
      next: (draft) => {
        const isNew = !this.currentDraft;
        this.isSaving = false;
        this.createKey = null;
        this.applyDraft(draft);
        this.toast.notify('Đã lưu bản nháp.');
        if (isNew) {
          this.router.navigate(['/store/custom-requests', draft.id], { replaceUrl: true });
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.handleConflict(err, 'Không thể lưu bản nháp.');
      },
    });
  }

  submitOrder() {
    if (!this.draftId || !this.currentDraft || this.isReadonly) return;
    if (this.draftForm.dirty) {
      this.toast.notify('Vui lòng lưu bản nháp trước khi gửi.');
      return;
    }
    if (this.submitForm.invalid) {
      this.submitForm.markAllAsTouched();
      this.toast.notify('Vui lòng điền đủ họ tên, email, số điện thoại và địa chỉ.');
      return;
    }
    if (!confirm('Gửi yêu cầu này để tạo đơn đặt làm riêng?')) return;

    const v = this.submitForm.getRawValue();
    const blankToNull = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

    this.submitKey ??= this.customRequestService.newIdempotencyKey();
    this.isSubmitting = true;

    this.customRequestService
      .submit(
        this.draftId,
        {
          expectedVersion: this.currentDraft.version,
          fullName: blankToNull(v.fullName),
          email: blankToNull(v.email),
          phone: blankToNull(v.phone),
          address: blankToNull(v.address),
          note: blankToNull(v.note),
        },
        this.submitKey,
      )
      .subscribe({
        next: (result) => {
          this.isSubmitting = false;
          this.submitKey = null;
          this.submission = result;
          this.toast.notify(result?.message || `Đã tạo đơn #${result.orderId}, đang chờ quản lý duyệt.`);
        },
        error: (err) => {
          this.isSubmitting = false;
          if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500) {
            this.submitKey = null;
          }
          this.handleConflict(err, 'Không thể gửi yêu cầu.');
        },
      });
  }

  private handleConflict(err: unknown, fallback: string) {
    const message = getApiErrorMessage(err, fallback);
    if (err instanceof HttpErrorResponse && err.status === 409) {
      this.toast.notify(`${message} Dữ liệu đã được tải lại bản mới nhất.`);
      this.loadDraft();
      return;
    }
    this.toast.notify(message);
  }
}
