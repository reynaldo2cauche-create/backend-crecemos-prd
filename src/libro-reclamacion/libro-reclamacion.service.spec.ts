import { Test, TestingModule } from '@nestjs/testing';
import { LibroReclamacionService } from './libro-reclamacion.service';

describe('LibroReclamacionService', () => {
  let service: LibroReclamacionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LibroReclamacionService],
    }).compile();

    service = module.get<LibroReclamacionService>(LibroReclamacionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
