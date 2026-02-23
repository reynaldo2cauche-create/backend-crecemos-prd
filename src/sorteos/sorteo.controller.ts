import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { SorteoService } from './sorteo.service';
import { CrearSorteoDto, RealizarSorteoDto } from './dto/crear-sorteo.dto';
import { CrearSorteoManualDto, AgregarParticipanteDto, AgregarMultiplesParticipantesDto, FinalizarSorteoManualDto } from './dto/sorteo-manual.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('backend_api/sorteos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SorteoController {
  constructor(private readonly sorteoService: SorteoService) {}

  // ========== STATIC ROUTES (HIGH PRIORITY) ==========

  /**
   * 📦 GET /sorteos/paquetes
   * Obtiene todos los paquetes activos
   */
  @Get('paquetes')
  @UseGuards(JwtAuthGuard)
  async obtenerPaquetes() {
    return this.sorteoService.obtenerPaquetes();
  }

  /**
   * 📋 GET /sorteos/tipos-compra
   * Obtiene todos los tipos de compra
   */
  @Get('tipos-compra')
  @UseGuards(JwtAuthGuard)
  async obtenerTiposCompra() {
    return this.sorteoService.obtenerTiposCompra();
  }

  /**
   * 📚 GET /sorteos/historial
   * Obtiene historial de sorteos con paginación
   */
  @Get('historial')
  @Roles('Administrador', 'Admision')
  async obtenerHistorial(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.sorteoService.obtenerHistorial(+page, +limit);
  }



  /**
   * 📝 POST /sorteos/crear
   * Crea un sorteo CON reglas (sin ganadores aún)
   */
  @Post()
  @Roles('Administrador', 'Admision')
  async crearSorteo(@Body() dto: CrearSorteoDto, @Request() req) {
    const usuarioId = req.user?.id; // ✅ Obtener ID del usuario autenticado
    return this.sorteoService.crearSorteo(dto, usuarioId);
  }

  /**
   * 🎲 POST /sorteos/realizar
   * Crea sorteo Y guarda ganadores
   */
  @Post('realizar')
  @Roles('Administrador', 'Admision')
  async realizarSorteo(@Body() dto: RealizarSorteoDto, @Request() req) {
    const usuarioId = req.user?.id; // ✅ Obtener ID del usuario autenticado
    return this.sorteoService.realizarSorteo(dto, usuarioId);
  }

  // ========== SORTEOS MANUALES ==========

  /**
   * 🎯 POST /sorteos/manual
   * Crea un sorteo MANUAL (sin reglas, estado: preparación)
   */
  @Post('manual')
  @Roles('Administrador', 'Admision')
  async crearSorteoManual(@Body() dto: CrearSorteoManualDto, @Request() req) {
    const usuarioId = req.user?.id;
    return this.sorteoService.crearSorteoManual(dto, usuarioId);
  }

  /**
   * 📚 GET /sorteos/en-preparacion
   * Obtiene sorteos en preparación
   */
  @Get('en-preparacion')
  @Roles('Administrador', 'Admision')
  async obtenerSorteosEnPreparacion() {
    return this.sorteoService.obtenerSorteosEnPreparacion();
  }

  // ========== PARAMETERIZED ROUTES (LOW PRIORITY) ==========

  /**
   * 🎯 GET /sorteos/:id/pacientes-elegibles
   * Obtiene pacientes elegibles según las reglas del sorteo*/


  /**
   * 📄 GET /sorteos/:id/pdf
   * Genera PDF de resultados del sorteo
   */
  @Get(':id/pdf')
  @Roles('Administrador', 'Admision')
  async generarPDF(@Param('id') id: number, @Res() res: Response) {
    const buffer = await this.sorteoService.generarPDF(id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=sorteo_${id}.pdf`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  /**
   * 🔍 GET /sorteos/:id
   * Obtiene detalle de un sorteo específico
   */
  @Get(':id')
  @Roles('Administrador', 'Admision')
  async obtenerDetalle(@Param('id') id: number) {
    return this.sorteoService.obtenerDetalle(id);
  }

  /**
   * 🗑️ DELETE /sorteos/:id
   * Elimina un sorteo
   */
  @Delete(':id')
  @Roles('Administrador')
  async eliminar(@Param('id') id: number) {
    return this.sorteoService.eliminar(id);
  }

  // ========== SORTEOS MANUALES - PARAMETERIZED ROUTES ==========

  /**
   * ➕ POST /sorteos/:id/participantes
   * Agrega un participante a un sorteo manual
   */
  @Post(':id/participantes')
  @Roles('Administrador', 'Admision')
  async agregarParticipante(
    @Param('id') id: number,
    @Body() dto: AgregarParticipanteDto,
  ) {
    return this.sorteoService.agregarParticipante(id, dto);
  }

  /**
   * ➕ POST /sorteos/:id/participantes/multiples
   * Agrega múltiples participantes a un sorteo manual
   */
  @Post(':id/participantes/multiples')
  @Roles('Administrador', 'Admision')
  async agregarMultiplesParticipantes(
    @Param('id') id: number,
    @Body() dto: AgregarMultiplesParticipantesDto,
  ) {
    return this.sorteoService.agregarMultiplesParticipantes(id, dto);
  }

  /**
   * 📋 GET /sorteos/:id/participantes
   * Obtiene participantes de un sorteo manual
   */
  @Get(':id/participantes')
  @Roles('Administrador', 'Admision')
  async obtenerParticipantes(@Param('id') id: number) {
    return this.sorteoService.obtenerParticipantes(id);
  }

  /**
   * ➖ DELETE /sorteos/:id/participantes/:entradaId
   * Elimina UNA entrada específica de un sorteo manual
   */
  @Delete(':id/participantes/:entradaId')
  @Roles('Administrador', 'Admision')
  async eliminarParticipante(
    @Param('id') id: number,
    @Param('entradaId') entradaId: number,
  ) {
    return this.sorteoService.eliminarParticipante(id, entradaId);
  }

  /**
   * 🎉 POST /sorteos/:id/finalizar
   * Finaliza un sorteo manual (guarda ganadores)
   */
  @Post(':id/finalizar')
  @Roles('Administrador', 'Admision')
  async finalizarSorteoManual(
    @Param('id') id: number,
    @Body() dto: FinalizarSorteoManualDto,
    @Request() req,
  ) {
    const usuarioId = req.user?.id;
    return this.sorteoService.finalizarSorteoManual(id, dto, usuarioId);
  }
}