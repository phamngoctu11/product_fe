import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProductTypeOption } from '../../../model/custom-request.model';
import { CustomRequestService } from '../../../service/custom-request.service';
import { ToastService } from '../../../service/toast.service';
import { UploadService } from '../../../service/upload.service';
import { UserService } from '../../../service/user.service';
import { CustomRequestFormComponent } from './custom-request-form.component';

describe('CustomRequestFormComponent', () => {
  let fixture: ComponentFixture<CustomRequestFormComponent>;
  let component: CustomRequestFormComponent;
  let customRequestService: jasmine.SpyObj<CustomRequestService>;

  const ceramicType: ProductTypeOption = {
    id: 7,
    code: 'do_gom',
    name: 'Đồ gốm',
    description: null,
    active: true,
    fields: [{
      code: 'chieu_cao',
      label: 'Chiều cao',
      kind: 'NUMBER',
      unit: 'cm',
      minimum: 1,
      maximum: 50,
    }],
  };

  beforeEach(async () => {
    customRequestService = jasmine.createSpyObj<CustomRequestService>('CustomRequestService', [
      'getProductTypes', 'get', 'create', 'update', 'submit', 'newIdempotencyKey',
    ]);
    customRequestService.getProductTypes.and.returnValue(of([ceramicType]));

    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const uploadService = jasmine.createSpyObj<UploadService>('UploadService', ['uploadImage']);
    const userService = jasmine.createSpyObj<UserService>('UserService', ['getInfor']);
    const toastService = jasmine.createSpyObj<ToastService>('ToastService', ['notify']);
    userService.getInfor.and.returnValue(of({ firstname: 'An', lastname: 'Nguyen' } as any));

    await TestBed.configureTestingModule({
      imports: [CustomRequestFormComponent],
      providers: [
        { provide: CustomRequestService, useValue: customRequestService },
        { provide: UploadService, useValue: uploadService },
        { provide: UserService, useValue: userService },
        { provide: ToastService, useValue: toastService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({})) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomRequestFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('dùng trực tiếp ID số từ select và dựng các trường bắt buộc của loại đã chọn', () => {
    const select = fixture.nativeElement.querySelector('select[formControlName="productTypeId"]') as HTMLSelectElement;
    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(component.draftForm.get('productTypeId')?.value).toBe(7);
    expect(component.selectedFields).toEqual(ceramicType.fields);
    expect(fixture.nativeElement.querySelector('input[type="number"]')).not.toBeNull();
    expect(component.draftForm.get('fieldValues.chieu_cao')?.invalid).toBeTrue();

    component.draftForm.get('fieldValues.chieu_cao')?.setValue(18);
    expect(component.draftForm.get('fieldValues.chieu_cao')?.valid).toBeTrue();
  });
});
