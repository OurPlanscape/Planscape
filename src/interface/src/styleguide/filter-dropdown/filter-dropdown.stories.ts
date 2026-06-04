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
type Story = StoryObj<FilterDropdownComponent<any>>;

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
  shortName?: string;
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

export const ItemsWithShortLabel: GenericStory = {
  args: {
    menuLabel: 'Region',
    displayField: 'name',
    shortLabel: 'shortName',
    showCountChip: false,
    menuItems: [
      { id: 1, name: 'Amelia Rose', shortName: 'AR' },
      { id: 2, name: 'Benjamin Walker', shortName: 'BW' },
      { id: 3, name: 'Charlotte Lee', shortName: 'CL' },
      { id: 4, name: 'David Anderson', shortName: 'DA' },
      { id: 5, name: 'Evelyn Wright', shortName: 'EW' },
      { id: 6, name: 'Felix Thompson', shortName: 'FT' },
      { id: 7, name: 'Grace Miller', shortName: 'GM' },
      { id: 8, name: 'Henry Jackson', shortName: 'HJ' },
      { id: 9, name: 'Isabella Clark', shortName: 'IC' },
      { id: 10, name: 'Jack Young', shortName: 'JY' },
      { id: 11, name: 'Katherine Wilson', shortName: 'KW' },
      { id: 12, name: 'Liam Moore', shortName: 'LM' },
      { id: 13, name: 'Mia Brown', shortName: 'MB' },
      { id: 14, name: 'Noah Garcia', shortName: 'NG' },
      { id: 15, name: 'Olivia Harris', shortName: 'OH' },
      { id: 16, name: 'Owen Lewis', shortName: 'OL' },
    ],
  },
};

export const ItemsWithShortNameAndDefaultLabel: GenericStory = {
  args: {
    menuLabel: 'Project Areas',
    hasSearch: false,
    unstyledSelections: true,
    noSelectionsLabel: 'All Project Areas',
    displayField: 'name',
    shortLabel: 'shortName',
    showCountChip: false,
    menuItems: [
      { id: 1, name: 'Project Area 1', shortName: '1' },
      { id: 1, name: 'Project Area 2', shortName: '2' },
      { id: 1, name: 'Project Area 3', shortName: '3' },
      { id: 1, name: 'Project Area 4', shortName: '4' },
      { id: 1, name: 'Project Area 5', shortName: '5' },
      { id: 1, name: 'Project Area 6', shortName: '6' },
      { id: 1, name: 'Project Area 7', shortName: '7' },
      { id: 1, name: 'Project Area 8', shortName: '8' },
    ],
  },
};

export const WithSearchTerm: Story = {
  args: {
    searchTerm: 'Jack',
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
