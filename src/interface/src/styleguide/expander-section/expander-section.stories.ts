import type { Meta, StoryObj } from '@storybook/angular';
import {
  applicationConfig,
  argsToTemplate,
  moduleMetadata,
} from '@storybook/angular';
import { ExpanderSectionComponent } from '@styleguide';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ExpanderItemComponent } from '../expander-item/expander-item.component';

const meta: Meta<ExpanderSectionComponent> = {
  title: 'Components/Expander Section',
  component: ExpanderSectionComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
    moduleMetadata({ imports: [ExpanderItemComponent] }),
  ],
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<sg-expander-section ${argsToTemplate(args)}>
      <sg-expander-item label='Red' value='1' groupName='options' [checked]='true'></sg-expander-item>
      <sg-expander-item label='Green' value='2' groupName='options'></sg-expander-item>
      <sg-expander-item label='Blue' value='3' groupName='options'></sg-expander-item>
</sg-expander-section>`,
  }),
};

export default meta;
type Story = StoryObj<ExpanderSectionComponent>;

export const Default: Story = {
  args: {
    title: 'Pick your color',
  },
};

export const Open: Story = {
  args: {
    title: 'Pick your color',
    isOpen: true,
  },
};

export const WithTooltips: Story = {
  args: {
    title: 'Pick your size',
    isOpen: true,
  },
  render: (args) => ({
    props: args,
    template: `<sg-expander-section ${argsToTemplate(args)}>
      <sg-expander-item label='Small' value='1' groupName='sizes' [showTooltip]='true'>
      Some tooltip content
</sg-expander-item>
      <sg-expander-item label='Medium' value='2' groupName='sizes' [showTooltip]='true'>
      Another tooltip content
</sg-expander-item>
      <sg-expander-item label='Large' value='3' groupName='sizes' [showTooltip]='true'>
      This can be <strong>html</strong>
</sg-expander-item>
</sg-expander-section>`,
  }),
};

export const AnyContent: Story = {
  args: {
    title: 'Pick your size',
    isOpen: true,
  },
  render: (args) => ({
    props: args,
    template: `<sg-expander-section ${argsToTemplate(args)}>
     This can actually be whatever content we want.
</sg-expander-section>`,
  }),
};
