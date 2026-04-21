import { Controller, Get } from '@nestjs/common';
import { EspecialidadService } from './especialidad.service';

@Controller('backend_api/especialidades')
export class EspecialidadController {
  constructor(private readonly especialidadService: EspecialidadService) {}

  @Get()
  findAll() {
    return this.especialidadService.findAll();
  }
} 