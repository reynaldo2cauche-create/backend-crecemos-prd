import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditoriaService } from './auditoria.service';
import { AlertasService } from './alertas.service';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';
import { SeveridadAlerta } from './alerta-sistema.entity';
import { Auditable } from './decorators/auditable.decorator';

@Controller('backend_api/auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditoriaController {
  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly alertasService: AlertasService,
  ) {}

  // ==========================================
  // ENDPOINTS DE AUDITORÍA
  // ==========================================

  /**
   * Obtiene el historial de auditoría con filtros
   * Solo para ADMINISTRADORES
   */
  @Get('historial')
  @Roles('Administrador')
  async obtenerHistorial(@Query() filtros: FiltrarAuditoriaDto) {
    return this.auditoriaService.obtenerHistorial(filtros);
  }

  /**
   * Obtiene estadísticas de auditoría
   * Solo para ADMINISTRADORES
   */
  @Get('estadisticas')
  @Roles('Administrador')
  async obtenerEstadisticas(
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const inicio = fechaInicio ? new Date(fechaInicio) : undefined;
    const fin = fechaFin ? new Date(fechaFin) : undefined;
    return this.auditoriaService.obtenerEstadisticas(inicio, fin);
  }

  /**
   * Obtiene la actividad reciente de un usuario
   * Solo para ADMINISTRADORES
   */
  @Get('actividad-usuario/:trabajadorId')
  @Roles('Administrador')
  async obtenerActividadUsuario(
    @Param('trabajadorId', ParseIntPipe) trabajadorId: number,
    @Query('limite', ParseIntPipe) limite: number = 20,
  ) {
    return this.auditoriaService.obtenerActividadUsuario(trabajadorId, limite);
  }

  /**
   * Obtiene las últimas acciones del sistema
   * Solo para ADMINISTRADORES
   */
  @Get('ultimas-acciones')
  @Roles('Administrador')
  async obtenerUltimasAcciones(@Query('limite', ParseIntPipe) limite: number = 10) {
    return this.auditoriaService.obtenerUltimasAcciones(limite);
  }

  // ==========================================
  // ENDPOINTS DE ALERTAS
  // ==========================================

  /**
   * Obtiene alertas con filtros
   * Solo para ADMINISTRADORES
   */
  @Get('alertas')
  @Roles('Administrador')
  async obtenerAlertas(
    @Query('leida') leida?: string,
    @Query('resuelta') resuelta?: string,
    @Query('severidad') severidad?: SeveridadAlerta,
    @Query('tipo') tipo?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    return this.alertasService.obtenerAlertas({
      leida: leida !== undefined ? leida === 'true' : undefined,
      resuelta: resuelta !== undefined ? resuelta === 'true' : undefined,
      severidad,
      tipo,
      page,
      limit,
    });
  }

  /**
   * Obtiene el conteo de alertas no leídas
   * Solo para ADMINISTRADORES
   */
  @Get('alertas/contador/no-leidas')
  @Roles('Administrador')
  async contarAlertasNoLeidas() {
    const total = await this.alertasService.contarNoLeidas();
    return { total };
  }

  /**
   * Marca una alerta como leída
   * Solo para ADMINISTRADORES
   */
  @Put('alertas/:id/marcar-leida')
  @Roles('Administrador')
  async marcarAlertaLeida(@Param('id', ParseIntPipe) id: number) {
    await this.alertasService.marcarComoLeida(id);
    return { mensaje: 'Alerta marcada como leída' };
  }

  /**
   * Marca todas las alertas como leídas
   * Solo para ADMINISTRADORES
   */
  @Put('alertas/marcar-todas-leidas')
  @Roles('Administrador')
  async marcarTodasAlertasLeidas() {
    await this.alertasService.marcarTodasComoLeidas();
    return { mensaje: 'Todas las alertas marcadas como leídas' };
  }

  /**
   * Marca una alerta como resuelta
   * Solo para ADMINISTRADORES
   */
  @Put('alertas/:id/resolver')
  @Roles('Administrador')
  @Auditable({
    modulo: 'AUDITORIA',
    accion: 'RESOLVER_ALERTA',
  })
  async resolverAlerta(
    @Param('id', ParseIntPipe) id: number,
    @Body('comentarios') comentarios: string,
    @Request() req,
  ) {
    await this.alertasService.marcarComoResuelta(id, req.user.id, comentarios);
    return { mensaje: 'Alerta marcada como resuelta' };
  }

  /**
   * Obtiene estadísticas de alertas
   * Solo para ADMINISTRADORES
   */
  @Get('alertas/estadisticas')
  @Roles('Administrador')
  async obtenerEstadisticasAlertas() {
    return this.alertasService.obtenerEstadisticas();
  }
}