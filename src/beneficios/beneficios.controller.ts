import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BeneficiosService } from './beneficios.service';

@Controller('backend_api/beneficios')
@UseGuards(JwtAuthGuard)
export class BeneficiosController {
  constructor(private readonly service: BeneficiosService) {}

  @Get('paciente/:id/puntos')
  getPuntosPaciente(@Param('id', ParseIntPipe) id: number) {
    return this.service.getResumenPuntos(id);
  }
  // ── Config ──
  @Get('config')
  getConfig() {
    return this.service.getConfig();
  }

  @Patch('config')
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  actualizarConfig(@Body() body: { porcentaje: number; motivo?: string }, @Req() req: any) {
    return this.service.actualizarConfig(body.porcentaje, req.user?.id, body.motivo);
  }

  // ── Calculadora (helper para el front) ──
  @Get('calcular')
  calcular(@Query('precio') precio: string, @Query('porcentaje') porcentaje: string) {
    return { puntos: this.service.calcularPuntosNecesarios(parseFloat(precio), parseFloat(porcentaje)) };
  }

  // ── Catálogo de premios (productos canjeables) ──
  @Get('premios')
  listarPremios(@Query('q') q?: string) {
    return this.service.listarPremios(q);
  }

  @Post('premios')
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  guardarPremio(@Body() body: any, @Req() req: any) {
    return this.service.guardarPremio(body, req.user?.id);
  }

  @Delete('premios/:id')
  @UseGuards(RolesGuard)
  @Roles('Administrador')
  async quitarPremio(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.service.quitarPremio(id, req.user?.id);
    return { message: 'Producto quitado del catálogo de premios' };
  }
}
