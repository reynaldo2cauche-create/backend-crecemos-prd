// src/evaluaciones/controllers/institucion.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InstitucionService } from './institucion.service';

@Controller('backend_api/evaluaciones/instituciones')
export class InstitucionController {
  constructor(private readonly institucionService: InstitucionService) {}

  @Get()
  findAll() {
    return this.institucionService.findAll();
  }
}