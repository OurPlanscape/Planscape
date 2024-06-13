import type { Meta, StoryObj } from '@storybook/angular';
import { InputFieldComponent } from './input/input-field.component';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { InputDirective } from './input/input.directive';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@styleguide';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';

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
    MatCheckboxModule,
    MatRadioModule,
  ],
  styles: `
    form {
      display: flex;
      gap: 48px;
      text-align: left;
    }
    .flex {
      display: flex;
      gap: 16px;
      flex-direction: column;
      align-items: flex-start;
      min-width: 200px;
    }
  `,
  template: `
    <h3>Demo of input fields on reactive forms</h3>
    <form [formGroup]="demoForm" style="">
      <section class="flex">
        <h4>Fields</h4>
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
      </section>

      <section class="flex">
        <h4>Checkbox</h4>
        <mat-checkbox>Checked</mat-checkbox>
        <mat-checkbox checked>Checked</mat-checkbox>
        <mat-checkbox disabled>Checked</mat-checkbox>
        <mat-checkbox disabled checked>Checked</mat-checkbox>
        <mat-checkbox color="warn">Error one</mat-checkbox>
      </section>

      <section class="flex">
        <h4>Radio Buttons</h4>
        <mat-radio-group aria-label="Select an option" class="flex">
          <mat-radio-button value="1">Option 1</mat-radio-button>
          <mat-radio-button value="2">Option 2</mat-radio-button>
          <mat-radio-button value="3" disabled>Option 3</mat-radio-button>
          <mat-radio-button value="4" disabled checked="true">
            Option4
          </mat-radio-button>

          <mat-radio-button value="5" color="warn">Option 5</mat-radio-button>
        </mat-radio-group>
      </section>
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
