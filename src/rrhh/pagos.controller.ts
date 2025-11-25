// src/pagos/pagos.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CalcularGratificacionesDto } from './dto/calcular-gratificaciones.dto';
import { RegistrarGratificacionDto } from './dto/registrar-gratificacion.dto';
import { RegistrarPagoMensualDto } from './dto/registrar-pago-mensual.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('backend_api/pagos')

export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  create(@Body() createPagoDto: CreatePagoDto) {
    return this.pagosService.create(createPagoDto);
  }

  @Post('calcular-gratificaciones')
  calcularGratificaciones(@Body() dto: CalcularGratificacionesDto) {
    return this.pagosService.calcularGratificaciones(dto);
  }

  @Post('registrar-gratificacion')
  registrarGratificacion(@Body() dto: RegistrarGratificacionDto) {
    return this.pagosService.registrarGratificacion(dto);
  }

  @Post('registrar-pago-mensual')
  registrarPagoMensual(@Body() dto: RegistrarPagoMensualDto) {
    return this.pagosService.registrarPagoMensual(dto);
  }

  @Get()
  findAll(
    @Query('tipo') tipo?: string,
    @Query('periodo') periodo?: string,
    @Query('anio') anio?: string,
  ) {
    return this.pagosService.findAll(tipo, periodo, anio ? +anio : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pagosService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pagosService.remove(+id);
  }
}