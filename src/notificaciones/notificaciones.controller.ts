import { Controller, Get, Post, Delete, Query, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesScheduler } from './notificaciones.scheduler';
import { InjectRepository } from '@nestjs/typeorm';
import { Notificacion } from './entities/notificacion.entity';
import { Repository } from 'typeorm';

@Controller('backend_api/notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly notificacionesScheduler: NotificacionesScheduler,
     @InjectRepository(Notificacion)
        private notificacionesRepo: Repository<Notificacion>,
  ) {}

  /**
   * ⚠️ IMPORTANTE: Este endpoint debe estar ANTES de otros con rutas dinámicas
   * Obtiene el conteo de notificaciones para el usuario
   * GET /backend_api/notificaciones/count
   */
/**
   * Cuenta SOLO las notificaciones NO LEÍDAS (de TODAS, sin límite)
   */
 @Get('count')
  async contarNotificaciones(@Request() req) {
    const rolId = req.user?.rol?.id;
    const usuarioId = req.user?.id;

 

    if (!rolId || !usuarioId) {
      console.warn('⚠️ Usuario sin rol asignado');
      return { total: 0, rol_id: null, usuario_id: null };
    }

    try {
      const total = await this.notificacionesService.contarNotificacionesPorRol(rolId, usuarioId);
  
      
      return {
        total,
        rol_id: rolId,
        usuario_id: usuarioId,
        fecha: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [CONTROLLER] Error al contar notificaciones:', error);
      return { total: 0, error: error.message };
    }
  }


  /**
   * ⚠️ IMPORTANTE: Este endpoint debe estar ANTES de :id
   * Marca todas las notificaciones como leídas
   * POST /backend_api/notificaciones/marcar-todas-leidas
   */
  @Post('marcar-todas-leidas')
  async marcarTodasComoLeidas(@Request() req) {
    const rolId = req.user?.rol?.id;
    const usuarioId = req.user?.id;

  

    if (!rolId || !usuarioId) {
      return { message: 'Usuario no autenticado', success: false };
    }

    await this.notificacionesService.marcarTodasComoLeidas(rolId, usuarioId);

    return {
      success: true,
      message: 'Todas las notificaciones marcadas como leídas',
    };
  }

  /**
   * ⚠️ IMPORTANTE: Este endpoint debe estar ANTES de :id
   * Obtiene notificaciones del último mes (leídas y no leídas)
   * GET /backend_api/notificaciones/recientes
   */
  @Get('recientes')
  async obtenerNotificacionesRecientes(
    @Request() req,
    @Query('limite') limite?: number,
    @Query('offset') offset?: number,
    @Query('fecha') fecha?: string,       // YYYY-MM-DD — filtra por día exacto en Lima
    @Query('tipo') tipo?: string,         // ej: CUMPLEANOS_PACIENTE
  ) {
    const rolId = req.user?.rol?.id;
    const usuarioId = req.user?.id;

    if (!rolId || !usuarioId) {
      return { message: 'Usuario sin rol asignado', notificaciones: [] };
    }

    const limiteNum = limite ? parseInt(limite.toString()) : 15;
    const offsetNum = offset ? parseInt(offset.toString()) : 0;

    try {
      // Estos dos se ejecutan en paralelo para no sumar latencia
      const [notificaciones, totalNoLeidas] = await Promise.all([
        this.notificacionesService.obtenerNotificacionesRecientes(
          rolId,
          usuarioId,
          limiteNum,
          offsetNum,
          fecha || null,
          tipo  || null,
        ),
        // ✅ El contador SIEMPRE es el total real — sin filtros de fecha ni tipo
        //    No importa qué esté viendo el usuario en pantalla
        this.notificacionesService.contarNotificacionesPorRol(rolId, usuarioId),
      ]);

      return {
        total: notificaciones.length,
        total_no_leidas: totalNoLeidas, // total real, no el de la página actual
        rol_id: rolId,
        usuario_id: usuarioId,
        tiempo_actual: new Date(),
        limite: limiteNum,
        offset: offsetNum,
        tiene_mas: notificaciones.length === limiteNum,
        notificaciones,
      };
    } catch (error) {
      console.error('❌ [CONTROLLER] Error al obtener notificaciones recientes:', error);
      return { notificaciones: [], error: error.message };
    }
  }


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
    const usuarioId = req.user?.id;



    if (!rolId || !usuarioId) {
      return { message: 'Usuario sin rol asignado', notificaciones: [] };
    }

    const limiteNum = limite ? parseInt(limite.toString()) : 50;
    const notificaciones = await this.notificacionesService.obtenerNotificacionesPorRol(rolId, usuarioId, limiteNum);

    return {
      total: notificaciones.length,
      rol_id: rolId,
      usuario_id: usuarioId,
      notificaciones,
    };
  }

@Post(':id/marcar-leida')
async marcarComoLeida(
  @Param('id') notificacionId: string,
  @Request() req,
) {
  const usuarioId = req.user?.id;
  const rolId = req.user?.rol?.id;



  if (!usuarioId) {
    console.error('❌ Usuario no autenticado');
    return {
      success: false,
      message: 'Usuario no autenticado'
    };
  }

  try {
    // 🔴 VERIFICAR ACCESO
    const verificarAccesoQuery = `
      SELECT n.id FROM notificaciones n
      INNER JOIN notificaciones_destino nd ON nd.notificacion_id = n.id
      WHERE n.id = ? AND nd.rol_id = ?
    `;

    const tieneAcceso = await this.notificacionesRepo.query(verificarAccesoQuery, [
      parseInt(notificacionId),
      rolId
    ]);

    if (!tieneAcceso || tieneAcceso.length === 0) {
      console.error('❌ Usuario no tiene acceso a esta notificación');
      return {
        success: false,
        message: 'No tienes permiso para marcar esta notificación'
      };
    }

    // 🔴 EJECUTAR EL SERVICIO
    const resultado = await this.notificacionesService.marcarComoLeida(
      parseInt(notificacionId),
      usuarioId
    );


    return {
      success: true,
      message: 'Notificación marcada como leída',
      notificacion_id: parseInt(notificacionId),
      usuario_id: usuarioId,
      nuevo_conteo: resultado.nuevoConteo,
      fecha: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ [CONTROLLER] Error:', error);
    return {
      success: false,
      message: 'Error al marcar notificación como leída',
      error: error.message,
    };
  }
}

  /**
   * Limpia notificaciones duplicadas de cumpleaños y aniversarios
   * POST /backend_api/notificaciones/limpiar-duplicados
   * ⚠️ Solo accesible para administradores
   */
  @Post('limpiar-duplicados')
  async limpiarDuplicados(@Request() req) {
    const rolId = req.user?.rol?.id;
    const usuarioId = req.user?.id;

    // Verificar que sea administrador (rol_id = 1)
    if (!rolId || rolId !== 1) {
      return {
        success: false,
        message: 'No tienes permisos para ejecutar esta acción. Solo administradores.',
      };
    }

    try {
      const resultado = await this.notificacionesService.limpiarNotificacionesDuplicadas();

      return {
        success: true,
        message: 'Limpieza de duplicados completada exitosamente',
        resultado,
        ejecutado_por: usuarioId,
        fecha: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error al limpiar duplicados:', error);
      return {
        success: false,
        message: 'Error al limpiar notificaciones duplicadas',
        error: error.message,
      };
    }
  }

  /**
   * 🧪 Endpoint temporal para forzar verificación de inconsistencias de asistencia
   * POST /backend_api/notificaciones/forzar-verificacion-inconsistencias
   * ⚠️ Solo accesible para administradores
   */
  @Post('forzar-verificacion-inconsistencias')
  async forzarVerificacionInconsistencias(@Request() req, @Query('fecha') fecha?: string) {
    const rolId = req.user?.rol?.id;
    const usuarioId = req.user?.id;

    // Verificar que sea administrador (rol_id = 1)
    if (!rolId || rolId !== 1) {
      return {
        success: false,
        message: 'No tienes permisos para ejecutar esta acción. Solo administradores.',
      };
    }

    try {
      console.log('🧪 Forzando verificación manual de inconsistencias de asistencia...');

      // Llamar al método privado del scheduler mediante reflexión
      // Como el método es privado, necesitamos acceder mediante el scheduler
      await (this.notificacionesScheduler as any).verificarInconsistenciasAsistencia();

      return {
        success: true,
        message: 'Verificación de inconsistencias ejecutada manualmente',
        ejecutado_por: usuarioId,
        fecha: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Error al verificar inconsistencias:', error);
      return {
        success: false,
        message: 'Error al verificar inconsistencias de asistencia',
        error: error.message,
      };
    }
  }
}