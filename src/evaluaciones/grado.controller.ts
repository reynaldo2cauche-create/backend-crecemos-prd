// src/evaluaciones/controllers/grado.controller.ts
import { Controller, Get } from '@nestjs/common';
import { GradoService } from './grado.service';

@Controller('backend_api/evaluaciones/grados')
export class GradoController {
  constructor(private readonly gradoService: GradoService) {}

  @Get()
  findAll() {
    return this.gradoService.findAll();
  }
}