import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { AddWineFormComponent } from './add-wine-form.component';

describe('AddWineFormComponent', () => {
  let component: AddWineFormComponent;
  let fixture: ComponentFixture<AddWineFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        IonicModule.forRoot(),
        AddWineFormComponent,
        TranslocoTestingModule.forRoot({
          langs: { fr: {} },
          translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddWineFormComponent);
    component = fixture.componentInstance;
    component.form = new FormGroup({
      type: new FormControl('red'),
      name: new FormControl(''),
      domain: new FormControl(''),
      vintage: new FormControl(null),
      peakMaturityYear: new FormControl(null),
      region: new FormControl(''),
      grapeVariety: new FormControl(''),
      unitPrice: new FormControl(null),
      rating: new FormControl(null),
      description: new FormControl(''),
      foodPairing: new FormControl(''),
      quantity: new FormControl(1),
    });
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
