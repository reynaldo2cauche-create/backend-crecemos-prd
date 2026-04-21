import { Controller, Get } from '@nestjs/common';
import { TiposTestService } from './tipos-test.service';

@Controller('backend_api/evaluaciones/tipos-test')
export class TiposTestController {
  constructor(private readonly tiposTestService: TiposTestService) {}

  @Get()
  findAll() {
    return this.tiposTestService.findAllActivosIdNombre();
  }
} 