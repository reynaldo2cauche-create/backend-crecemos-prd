import { Controller, Get } from '@nestjs/common';
import { DatosEstudianteService } from './datos-estudiante.service';

@Controller('backend_api/datos-estudiantes')
export class DatosEstudianteController {
  constructor(private readonly datosEstudianteService: DatosEstudianteService) {}

  @Get()
  findAll() {
    return this.datosEstudianteService.findAll();
  }
} 