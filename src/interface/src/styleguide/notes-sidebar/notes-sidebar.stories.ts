import {
  Meta,
  StoryObj,
  moduleMetadata,
  argsToTemplate,
} from '@storybook/angular';
import { NotesSidebarComponent } from './notes-sidebar.component';
import {
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClientModule } from '@angular/common/http'; // Add this import
import { BaseNotesService, ProjectAreaNotesService } from '@services';

const meta: Meta<NotesSidebarComponent> = {
  title: 'Components/Notes Sidebar',
  component: NotesSidebarComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [
        HttpClientModule,
        MatDialogModule,
        BrowserAnimationsModule,
        MatProgressSpinnerModule,
        NotesSidebarComponent,
        MatSnackBarModule,
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: MatDialogRef, useValue: {} },
        { provide: BaseNotesService, useValue: ProjectAreaNotesService },
      ],
    }),
  ],
  render: ({ ...args }) => ({
    props: args,
    template: `<div style="width:300px;height:400px;border:1px black solid;"><sg-notes-sidebar ${argsToTemplate(args)}>
          </sg-notes-sidebar></div>`,
  }),
};

export default meta;

const exampleNotes = [
  {
    id: 1,
    user_id: 10,
    user_name: 'Larry Larrington',
    content: 'Here is some content',
    created_at: '2024-01-01',
    can_delete: true,
  },
  {
    id: 2,
    user_id: 11,
    user_name: 'Someone Else',
    content: 'Here is some content',
    created_at: '2024-02-01',
    can_delete: false,
  },

  {
    id: 3,
    user_id: 10,
    user_name: 'Larry Larrington',
    content:
      'Here is some additional content.' +
      ' Here is some additional content. Here is some additional content. ' +
      'Here is some additional content. Here is some additional content. ' +
      'Here is some additional content. ',
    created_at: '2024-05-01',
    can_delete: true,
  },
];

type Story = StoryObj<NotesSidebarComponent>;

export const Default: Story = {
  args: {
    showHeader: false,
    notesModel: 'planning_area',
    objectId: 1,
    notes: exampleNotes,
    noNotesTitleText: 'No Notes Yet',
    noNotesDetailText:
      'Start adding notes to help your team learn more about this section.',
  },
};

export const NoNotes: Story = {
  args: {
    showHeader: false,
    notesModel: 'planning_area',
    objectId: 1,
    notes: [],
    noNotesTitleText: 'No Notes Yet',
    noNotesDetailText:
      'Start adding notes to help your team learn more about this section.',
  },
};
