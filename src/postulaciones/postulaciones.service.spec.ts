import { Test, TestingModule } from '@nestjs/testing';
import { PostulacionesService } from './postulaciones.service';

describe('PostulacionesService', () => {
  let service: PostulacionesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostulacionesService],
    }).compile();

    service = module.get<PostulacionesService>(PostulacionesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
