import { TestBed } from '@angular/core/testing';
import { FileSaverService } from '@services/file-saver.service';

describe('FileSaverService', () => {
  let service: FileSaverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileSaverService);
  });

  it('Should call saveAs with the expected params', async () => {
    const mockSaveAs = jasmine.createSpy('saveAs');
    spyOn(service as any, 'loadFileSaver').and.returnValue(
      Promise.resolve(mockSaveAs)
    );

    const blob = new Blob(['contenido'], { type: 'text/plain' });
    const filename = 'archivo.txt';

    await service.saveAs(blob, filename);

    expect(mockSaveAs).toHaveBeenCalledWith(blob, filename);
  });
});
