import type { Meta, StoryObj } from '@storybook/angular';
import { InputFieldComponent } from './input-field.component';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { InputDirective } from './input.directive';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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
  ],
  template: ` <h3>Demo of input fields on reactive forms</h3>
    <form
      [formGroup]="demoForm"
      style="display: flex; gap: 16px; flex-direction: column">
      <sg-input-field
        supportMessage="Full name"
        [error]="demoForm.get('firstName')?.errors !== null">
        <input sgInput formControlName="firstName" />
      </sg-input-field>
      <sg-input-field
        supportMessage="5 digits"
        [error]="demoForm.get('phone')?.errors !== null">
        <input sgInput formControlName="phone" />
      </sg-input-field>
    </form>`,
})
export class DemoFormComponent {
  constructor(private fb: FormBuilder) {}

  demoForm = this.fb.group({
    firstName: ['', Validators.required],
    phone: ['', Validators.maxLength(5)],
  });
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
