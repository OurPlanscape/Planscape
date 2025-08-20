import { urls } from '../support/util';

describe('Map', () => {
  it('Shows welcome page', () => {
    cy.visit(urls.MAP);
    cy.url().should('include', '/explore');
    cy.get('app-multi-map-control').should('exist');
  });
  it('Switches number of maps', () => {
    cy.visit(urls.MAP);
    cy.get('.maps').should('be.visible');
    cy.get('[aria-label="Show 1 map"]').click();
    cy.get('.maps app-explore-map').should('have.length', 1);

    cy.get('[aria-label="Show 2 maps"]').click();
    cy.get('.maps app-explore-map').should('have.length', 2);

    cy.get('[aria-label="Show 4 maps"]').click();
    cy.get('.maps app-explore-map').should('have.length', 4);
  });

  it('should show the correct basemap map layer when changing basemap', () => {
    cy.visit(urls.MAP);
    cy.intercept('GET', '**/tiles.mapbox.com/**').as('tiles');
    cy.intercept('GET', '**mapbox**', (req: any) => {
      if (req.url.includes('mapbox')) {
        console.log('Mapbox request:', req.url);
      }
    }).as('any');
    cy.get('app-map-base-dropdown').click();
    cy.get('[aria-label="Select road base map"]').should('be.visible');
    cy.get('[aria-label="Select road base map"]').click();
    cy.wait('@tiles').then((interception: any) => {
      // Check if the tile URL indicates road base map
      expect(interception.request.url).to.contain('road') // or whatever identifier
    });

    // cy.get('[aria-label="Select road base map"]').click();


    // cy.get('img.leaflet-tile')
    //   .invoke('attr', 'src')
    //   .should('contain', 'tiles.stadiamaps.com/tiles/alidade_smooth/');

    // cy.get('[aria-label="Select terrain base map"]').click();
    // cy.get('img.leaflet-tile')
    //   .invoke('attr', 'src')
    //   .should('contain', 'World_Terrain_Base/MapServer');

    // cy.get('[aria-label="Select satellite base map"]').click();
    // cy.get('img.leaflet-tile')
    //   .invoke('attr', 'src')
    //   .should('contain', 'World_Imagery/MapServer');
  });
});
