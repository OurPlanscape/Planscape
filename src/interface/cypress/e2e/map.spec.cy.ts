import { urls } from '../support/util';

describe('Map', () => {
  it('Shows welcome page', () => {
    cy.visit(urls.MAP);
    cy.contains('Planning Areas');
  });
  it('Switches number of maps', () => {
    cy.visit(urls.MAP);
    cy.get('.map').should('be.visible');
    cy.get('[aria-label="Show 1 map"]').click();
    let maps = cy.get('.map:visible');
    maps.should('have.length', 1);

    cy.get('[aria-label="Show 2 maps"]').click();
    maps = cy.get('.map:visible');
    maps.should('have.length', 2);

    cy.get('[aria-label="Show 4 maps"]').click();
    maps = cy.get('.map:visible');
    maps.should('have.length', 4);
  });

  it('should show the correct basemap map layer when changing basemap', () => {
    cy.visit(urls.MAP);
    cy.get('.mat-radio-button').contains('Road').click();
    cy.get('img.leaflet-tile')
      .invoke('attr', 'src')
      .should('contain', 'tiles.stadiamaps.com/tiles/alidade_smooth/');

    cy.get('.mat-radio-button').contains('Terrain').click();
    cy.get('img.leaflet-tile')
      .invoke('attr', 'src')
      .should('contain', 'World_Terrain_Base/MapServer');

    cy.get('.mat-radio-button').contains('Satellite').click();
    cy.get('img.leaflet-tile')
      .invoke('attr', 'src')
      .should('contain', 'World_Imagery/MapServer');
  });
});
