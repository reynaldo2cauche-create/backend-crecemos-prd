import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BeneficiosService } from './beneficios.service';
import { PacienteService } from '../pacientes/paciente.service';

@Controller('backend_api/beneficios/publico')
export class BeneficiosPublicoController {
  constructor(
    private readonly service: BeneficiosService,
    private readonly pacienteService: PacienteService,
  ) {}

  @Get('puntos/:dni')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async getPuntos(@Param('dni') dni: string) {
    const paciente = await this.pacienteService.buscarActivoPorDocumento(dni);
    const { saldo, historico, proximoVencimiento } = await this.service.getResumenPuntos(paciente.id);
    return { saldo, historico, proximoVencimiento };
  }
}