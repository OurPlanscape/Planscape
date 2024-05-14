import type { Meta, StoryObj } from '@storybook/angular';
import { InputFieldComponent } from './input-field.component';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { InputDirective } from './input.directive';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@styleguide';

@Component({
  selector: 'sg-demo-form',
  standalone: true,
  imports: [
    MatIconModule,
    CommonModule,
    MatInputModule,
    MatFormFieldModule,
    InputFieldComponent,
    InputDirective,
    ReactiveFormsModule,
    ButtonComponent,
  ],
  template: `
    <h3>Demo of input fields on reactive forms</h3>
    <form
      [formGroup]="demoForm"
      style="display: flex; gap: 16px; flex-direction: column">
      <sg-input-field
        supportMessage="Full name"
        [error]="demoForm.get('firstName')?.errors !== null"
        [disabled]="demoForm.get('firstName')?.disabled || false">
        <input sgInput formControlName="firstName" />
      </sg-input-field>
      <sg-input-field
        supportMessage="5 digits"
        [error]="demoForm.get('phone')?.errors !== null"
        [disabled]="demoForm.get('phone')?.disabled || false">
        <input sgInput formControlName="phone" />
      </sg-input-field>
    </form>
    <button sg-button (click)="disableFields()">Disable</button>
  `,
})
export class DemoFormComponent {
  constructor(private fb: FormBuilder) {}

  demoForm = this.fb.group({
    firstName: ['', Validators.required],
    phone: ['', Validators.maxLength(5)],
  });

  disableFields() {
    this.demoForm.get('firstName')?.disable();
    this.demoForm.get('phone')?.disable();
  }
}

const meta: Meta<DemoFormComponent> = {
  title: 'Components/Form Demo',
  component: DemoFormComponent,
  tags: [''],
};

export default meta;
type Story = StoryObj<DemoFormComponent>;

export const Default: Story = {
  args: {},
};
