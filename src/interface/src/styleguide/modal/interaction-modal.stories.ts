import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ModalComponent } from './modal.component';
import { ModalWrapperComponent } from './modalwrapper.component';

const meta: Meta<ModalWrapperComponent> = {
  title: 'Components/Interactive Modal',
  component: ModalWrapperComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ModalComponent, MatDialogModule, BrowserAnimationsModule],
      declarations: [ModalWrapperComponent],
      providers: [
        MatDialog,
        {
          provide: MAT_DIALOG_DATA,
          useValue: { name: 'Example Name' },
        },
        {
          provide: MatDialogRef,
          useValue: {
            close: (dialogResult: any) => {},
          },
        },
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<ModalWrapperComponent>;

export const Default: Story = {
  args: {},
};
