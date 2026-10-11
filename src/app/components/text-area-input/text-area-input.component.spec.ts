import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { TextAreaInputComponent } from './text-area-input.component';

describe('TextAreaInputComponent', () => {
  let component: TextAreaInputComponent;
  let fixture: ComponentFixture<TextAreaInputComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TextAreaInputComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TextAreaInputComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Description');
    fixture.componentRef.setInput('control', new FormControl(''));
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
