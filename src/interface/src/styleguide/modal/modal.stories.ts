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
import { Component } from '@angular/core';

@Component({
  selector: 'storybook-modal-wrapper',
  template: `<button (click)="openDialog()">Click for Modal</button> `,
})
class StorybookModalWrapperComponent {
  title = 'Modal Title';
  showClose = true;
  showModal = false;

  constructor(private dialog: MatDialog) {}

  openDialog() {
    const dialogRef = this.dialog.open(ModalComponent, {
      data: { title: 'Example Name' },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log('Dialog result:', result);
      this.showModal = false;
    });

    this.showModal = true;
  }

  dialogClosed(event: any) {
    console.log('Dialog closed with:', event);
  }
}

const meta: Meta<StorybookModalWrapperComponent> = {
  title: 'Components/Modal',
  component: StorybookModalWrapperComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [ModalComponent, MatDialogModule, BrowserAnimationsModule],
      declarations: [StorybookModalWrapperComponent],
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
type Story = StoryObj<StorybookModalWrapperComponent>;

export const Default: Story = {
  args: {
    title: 'Here is a title',
  },
};
