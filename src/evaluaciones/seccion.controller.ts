// src/evaluaciones/controllers/seccion.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { SeccionService } from './seccion.service';

@Controller('backend_api/evaluaciones/secciones')
export class SeccionController {
  constructor(private readonly seccionService: SeccionService) {}

  @Get()
  findAll() {
    return this.seccionService.findAll();
  }
}