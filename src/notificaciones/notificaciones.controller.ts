import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { NotificacionesService } from './notificaciones.service';

@Controller('backend_api/notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Obtiene las notificaciones para el rol del usuario autenticado
   * GET /backend_api/notificaciones
   */
  @Get()
  async obtenerNotificaciones(
    @Request() req,
    @Query('limite') limite?: number,
  ) {
    const rolId = req.user?.rol?.id;

    if (!rolId) {
      return { message: 'Usuario sin rol asignado', notificaciones: [] };
    }

    const limiteNum = limite ? parseInt(limite.toString()) : 50;
    const notificaciones = await this.notificacionesService.obtenerNotificacionesPorRol(rolId, limiteNum);

    return {
      total: notificaciones.length,
      rol_id: rolId,
      notificaciones,
    };
  }

  /**
   * Obtiene las notificaciones recientes (últimas 24 horas)
   * GET /backend_api/notificaciones/recientes
   */
  @Get('recientes')
  async obtenerNotificacionesRecientes(@Request() req) {
    const rolId = req.user?.rol?.id;

    if (!rolId) {
      return { message: 'Usuario sin rol asignado', notificaciones: [] };
    }

    const notificaciones = await this.notificacionesService.obtenerNotificacionesRecientes(rolId);

    return {
      total: notificaciones.length,
      rol_id: rolId,
      tiempo_actual: new Date(),
      notificaciones,
    };
  }

  /**
   * Obtiene el conteo de notificaciones para el usuario
   * GET /backend_api/notificaciones/count
   */
  @Get('count')
  async contarNotificaciones(@Request() req) {
    const rolId = req.user?.rol?.id;

    if (!rolId) {
      return { message: 'Usuario sin rol asignado', total: 0 };
    }

    const total = await this.notificacionesService.contarNotificacionesPorRol(rolId);

    return {
      rol_id: rolId,
      total,
    };
  }
}
