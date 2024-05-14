import type { Meta, StoryObj } from '@storybook/angular';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
} from '@storybook/angular';
import { InputFieldComponent } from './input-field.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { InputDirective } from './input.directive';

/**
 *Inputs
 *
 */
const meta: Meta<InputFieldComponent> = {
  title: 'Components/Input',
  component: InputFieldComponent,
  tags: ['autodocs'],

  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
    moduleMetadata({ imports: [InputDirective] }),
  ],
  render: (args) => ({
    props: args,
    template: `
     <sg-input-field ${argsToTemplate(args)}>
     <input sgInput  value='12' placeholder='12'>
</sg-input-field>`,
  }),
};

export default meta;
type Story = StoryObj<InputFieldComponent>;

export const Default: Story = {
  args: {
    disabled: false,
    error: false,
    leadingIcon: 'add_box',
    suffix: '',
    supportMessage: 'Enter whatever you like',
    trailingIcon: '',
  },
};

export const JustLabel: Story = {
  args: {
    disabled: false,
    error: false,

    supportMessage: 'Enter whatever you like',
  },
};

// @Component({
//   selector: 'sg-demo-form',
//   standalone: true,
//   imports: [
//     MatIconModule,
//     CommonModule,
//     MatInputModule,
//     MatFormFieldModule,
//     InputFieldComponent,
//   ],
//   template: ` <form>
//     <sg-input placeholder="one"></sg-input>
//     <sg-input placeholder="two"></sg-input>
//   </form>`,
// })
// export class DemoFormComponent {}
