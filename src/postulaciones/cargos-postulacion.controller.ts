// =====================================================
// src/modules/catalogos/catalogos.controller.ts
// =====================================================

import { Controller, Get } from '@nestjs/common';
import { CargoPostulacionService } from './cargos-postulacion.service';
import { CargoPostulacion } from './cargo-postulacion.entity';


@Controller('backend_api/cargos-postulacion')
export class CargosPostulacionController {
  constructor(private readonly cargosService: CargoPostulacionService) {}

  @Get()
  async getCargos(): Promise<CargoPostulacion[]> {
    return await this.cargosService.findAllActivos();
  }
}