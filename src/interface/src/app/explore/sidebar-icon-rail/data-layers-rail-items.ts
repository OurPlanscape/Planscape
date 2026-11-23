import { SidebarRailItem } from './sidebar-icon-rail.component';

export function dataLayersRailItems(options: {
  baseLayers: boolean;
  uploaded: boolean;
  favoritesEnabled: boolean;
}): SidebarRailItem[] {
  return [
    { id: 'data-layers', icon: 'category', label: 'Data Layers' },
    ...(options.baseLayers
      ? [{ id: 'base-layers', icon: 'layers', label: 'Base Layers' }]
      : []),
    ...(options.uploaded
      ? [{ id: 'uploaded', icon: 'drive_folder_upload', label: 'Uploaded' }]
      : []),
    {
      id: 'favorites',
      icon: 'star',
      label: 'Favorite Data Layers',
      disabled: !options.favoritesEnabled,
    },
  ];
}
