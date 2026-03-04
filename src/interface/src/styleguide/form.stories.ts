import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';
import { InputFieldComponent } from '@styleguide/input/input-field.component';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { InputDirective } from '@styleguide/input/input.directive';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@styleguide/button/button.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ToggleComponent } from '@styleguide/toggle/toggle.component';

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
    MatSlideToggleModule,
    ToggleComponent,
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
    .toggle-stories {
      padding: 32px 0;
      display: flex;
      flex-direction: column;
      gap: 32px;
      text-align: left;
    }
    .toggle-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .toggle-grid {
      display: grid;
      grid-template-columns: repeat(4, 88px);
      row-gap: 28px;
      align-items: center;
      padding: 24px 32px;
      border-radius: 8px;
      width: fit-content;
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
