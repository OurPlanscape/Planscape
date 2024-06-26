import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig, argsToTemplate } from '@storybook/angular';
import { FilterDropdownComponent } from './filter-dropdown.component';
import { provideAnimations } from '@angular/platform-browser/animations';

const meta: Meta<FilterDropdownComponent<string>> = {
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
type Story = StoryObj<FilterDropdownComponent<string>>;

export const Default: Story = {
  args: {
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
  },
};

export const Small: Story = {
  args: {
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
    size: 'small',
  },
};

export const Large: Story = {
  args: {
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
    size: 'large',
  },
};

export const WithLeadingIcon: Story = {
  args: {
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
    leadingIcon: 'home',
  },
};

export const CheckboxMenu: Story = {
  args: {
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
  },
};
export const NoSearch: Story = {
  args: {
    hasSearch: false,
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
  },
};

export const Disabled: Story = {
  args: {
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
    disabled: true,
  },
};

export const MultipleSelections: Story = {
  args: {
    selectedItems: ['hello', 'this'],
    menuLabel: 'Region',
    menuItems: ['hello', 'this', 'is', 'selectable', 'content'],
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
  },
};

export const LongOptionList: Story = {
  args: {
    selectedItems: ['Jack Young', 'Katherine Wilson'],
    menuLabel: 'Creator',
    menuItems: [
      'Amelia Rose',
      'Benjamin Walker',
      'Charlotte Lee',
      'David Anderson',
      'Evelyn Wright',
      'Felix Thompson',
      'Grace Miller',
      'Henry Jackson',
      'Isabella Clark',
      'Jack Young',
      'Katherine Wilson',
      'Liam Moore',
      'Mia Brown',
      'Noah Garcia',
      'Olivia Harris',
      'Owen Lewis',
      'Penelope Martin',
      'William Johnson',
      'Amelia Hernandez',
      'Benjamin King',
      'Charlotte Lopez',
      'David Scott',
      'Evelyn Ramirez',
      'Felix Cruz',
      'Grace Alexander',
      'Henry Turner',
      'Isabella Allen',
      'Jack White',
      'Katherine Thomas',
      'Liam Walker',
      'Mia Hernandez',
      'Noah Moore',
      'Olivia Garcia',
      'Owen Lopez',
      'Penelope Ramirez',
      'William Allen',
      'Amelia Young',
      'Benjamin Lewis',
      'Charlotte Turner',
      'David Hernandez',
      'Evelyn King',
      'Felix Johnson',
      'Grace Scott',
      'Henry Walker',
      'Isabella Moore',
      'Jack Garcia',
      'Katherine Lopez',
      'Liam Ramirez',
      'Mia Allen',
      'Noah Lewis',
      'Olivia Turner',
      'Owen King',
      'Penelope Johnson',
    ],
  },
};

interface Thing {
  id: number;
  name: string;
}

type GenericStory = StoryObj<FilterDropdownComponent<Thing>>;

export const GenericItems: GenericStory = {
  args: {
    menuLabel: 'Region',
    displayField: 'name',
    menuItems: [
      { id: 1, name: 'Amelia Rose' },
      { id: 2, name: 'Benjamin Walker' },
      { id: 3, name: 'Charlotte Lee' },
      { id: 4, name: 'David Anderson' },
      { id: 5, name: 'Evelyn Wright' },
      { id: 6, name: 'Felix Thompson' },
      { id: 7, name: 'Grace Miller' },
      { id: 8, name: 'Henry Jackson' },
      { id: 9, name: 'Isabella Clark' },
      { id: 10, name: 'Jack Young' },
      { id: 11, name: 'Katherine Wilson' },
      { id: 12, name: 'Liam Moore' },
      { id: 13, name: 'Mia Brown' },
      { id: 14, name: 'Noah Garcia' },
      { id: 15, name: 'Olivia Harris' },
      { id: 16, name: 'Owen Lewis' },
    ],
  },
};
