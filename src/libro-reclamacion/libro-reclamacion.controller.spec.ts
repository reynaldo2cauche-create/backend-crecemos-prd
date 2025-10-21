import { Test, TestingModule } from '@nestjs/testing';
import { LibroReclamacionController } from './libro-reclamacion.controller';
import { LibroReclamacionService } from './libro-reclamacion.service';

describe('LibroReclamacionController', () => {
  let controller: LibroReclamacionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LibroReclamacionController],
      providers: [LibroReclamacionService],
    }).compile();

    controller = module.get<LibroReclamacionController>(LibroReclamacionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
