import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { FilterDropdownComponent } from './filter-dropdown.component';
import { provideAnimations } from '@angular/platform-browser/animations';

/**
 *
 */
const meta: Meta<FilterDropdownComponent> = {
  title: 'Components/Filter Dropdown',
  component: FilterDropdownComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [provideAnimations()],
    }),
  ],
  render: ({ ...args }) => ({
    props: args,
    template: `
     <sg-filter-dropdown ${argsToTemplate(args)}></sg-filter-dropdown>`,
  }),
};

export default meta;
type Story = StoryObj<FilterDropdownComponent>;

export const Default: Story = {
  args: {
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
    menuType: 'standard',
  },
};
export const CheckboxMenu: Story = {
  args: {
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
    menuType: 'standard',
  },
};

export const Disabled: Story = {
  args: {
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
    menuType: 'standard',
    disabled: true,
  },
};

export const OneSelection: Story = {
  args: {
    selectedItems: ['hello'],
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
    menuType: 'standard',
  },
};

export const MultipleSelections: Story = {
  args: {
    selectedItems: ['hello', 'this'],
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
    menuType: 'standard',
  },
};

export const DoubleDigitSelections: Story = {
  args: {
    selectedItems: [
      'hello',
      'this',
      'is',
      'selectable',
      'content',
      'and',
      'here',
      'is',
      'even',
      'more',
      'selectable',
      'stuff',
    ],
    menuLabel: 'Region',
    menuItems: [
      'hello',
      'this',
      'is',
      'selectable',
      'content',
      'and',
      'here',
      'is',
      'even',
      'more',
      'selectable',
      'stuff',
    ],
    menuType: 'standard',
  },
};
