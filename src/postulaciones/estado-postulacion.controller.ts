// =====================================================
// src/modules/catalogos/catalogos.controller.ts
// =====================================================

import { Controller, Get } from '@nestjs/common';
import { EstadoPostulacionService } from './estados-postulacion.service';
import { EstadoPostulacion } from './estado-postulacion.entity';


@Controller('backend_api/estados-postulacion')
export class EstadosPostulacionController {
  constructor(private readonly estadosService: EstadoPostulacionService) {}

  @Get()
  async getCargos(): Promise<EstadoPostulacion[]> {
    return await this.estadosService.findAllActivos();
  }
}