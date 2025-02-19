import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
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
import { MatSelectModule } from '@angular/material/select';
import { provideAnimations } from '@angular/platform-browser/animations';

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
    MatSelectModule,
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
  templateUrl: './form.stories.html',
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
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
};

export default meta;
type Story = StoryObj<DemoFormComponent>;

export const Default: Story = {
  args: {},
};
