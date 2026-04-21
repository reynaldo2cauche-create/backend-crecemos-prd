// src/evaluaciones/controllers/trabajador-centro.controller.ts
import { Controller, Get } from '@nestjs/common';
import { TrabajadorCentroService } from './trabajador-centro.service';

@Controller('backend_api/evaluaciones/trabajadores')
export class TrabajadorCentroController {
  constructor(private readonly trabajadorService: TrabajadorCentroService) {}

  @Get()
  findAll() {
    return this.trabajadorService.findAll();
  }
}