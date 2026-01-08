import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Req,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable, merge } from 'rxjs';
import { map, filter, switchMap } from 'rxjs/operators';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesEventsService } from './notificaciones-events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SseAuthGuard } from '../auth/guards/sse-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('backend_api/notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly eventsService: NotificacionesEventsService,
  ) {}

  /**
   * Obtiene notificaciones del usuario
   */
  @Get()
  async obtenerNotificaciones(
    @Req() req,
    @Query('leida') leida?: string,
    @Query('limite') limite?: string,
  ) {
    const usuarioId = req.user.userId;
    const leidaBoolean = leida === 'true' ? true : leida === 'false' ? false : undefined;
    const limiteNum = limite ? parseInt(limite) : 15;

    return this.notificacionesService.obtenerNotificaciones(
      usuarioId,
      leidaBoolean,
      limiteNum,
    );
  }

  /**
   * Cuenta notificaciones no leídas
   */
  @Get('contador/no-leidas')
  async contarNoLeidas(@Req() req) {
    const usuarioId = req.user.userId;
    const total = await this.notificacionesService.contarNoLeidas(usuarioId);
    return { total };
  }

  /**
   * Marca una notificación como leída
   */
  @Put(':id/marcar-leida')
  async marcarLeida(@Param('id') id: number) {
    await this.notificacionesService.marcarComoLeida(id);
    return { mensaje: 'Notificación marcada como leída' };
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  @Put('marcar-todas-leidas')
  async marcarTodasLeidas(@Req() req) {
    const usuarioId = req.user.userId;
    await this.notificacionesService.marcarTodasLeidas(usuarioId);
    return { mensaje: 'Todas las notificaciones marcadas como leídas' };
  }

  /**
   * ENDPOINT MANUAL PARA TESTING
   * Fuerza la generación de notificaciones diarias sin importar si ya se ejecutó hoy
   * Solo para administradores
   */
  @Get('generar-diarias-manual')
  async generarManual(@Req() req) {
    const usuarioId = req.user.userId;
    const usuario = await this.notificacionesService['trabajadorRepo'].findOne({
      where: { id: usuarioId },
      relations: ['rol'],
    });

    if (usuario?.rol?.id !== 1) {
      return { error: 'Solo administradores pueden ejecutar esto' };
    }

    // Resetear el flag para permitir regeneración
    this.notificacionesService['ultimoCalculoDiario'] = null;

    const resultado = await this.notificacionesService.generarNotificacionesDiarias();
    return {
      ...resultado,
      mensaje: 'Notificaciones generadas manualmente para testing',
    };
  }

  /**
   * ENDPOINT PARA INICIALIZAR CONFIGURACIONES
   * Crea las configuraciones iniciales si no existen
   * Solo para administradores
   */
  @Get('inicializar-configuraciones')
  async inicializarConfiguraciones(@Req() req) {
    const usuarioId = req.user.userId;
    const usuario = await this.notificacionesService['trabajadorRepo'].findOne({
      where: { id: usuarioId },
      relations: ['rol'],
    });

    if (usuario?.rol?.id !== 1) {
      return { error: 'Solo administradores pueden ejecutar esto' };
    }

    const resultado = await this.notificacionesService.inicializarConfiguraciones();
    return resultado;
  }

  /**
   * SSE: Stream de notificaciones en tiempo real
   * Funciona en cPanel y hosting compartido
   * Usa RxJS Subject (100% nativo de NestJS, sin librerías externas)
   */
  @Public()
  @Sse('stream')
  @UseGuards(SseAuthGuard)
  sseNotificaciones(@Req() req): Observable<MessageEvent> {
    const usuarioId = req.user.userId;

    console.log(`📡 SSE: Usuario ${usuarioId} conectado`);

    // Escuchar eventos de nuevas notificaciones desde el Subject
    const notificacionEvent$ = this.eventsService.notificacionNueva$.pipe(
      filter((event) => event.usuarioId === usuarioId),
      map(() => ({ trigger: 'nueva' })),
    );

    // Enviar datos iniciales + eventos en tiempo real
    return merge(
      new Observable((observer) => observer.next({ trigger: 'inicial' })),
      notificacionEvent$,
    ).pipe(
      switchMap(async () => {
        try {
          const total = await this.notificacionesService.contarNoLeidas(usuarioId);
          const notificaciones = await this.notificacionesService.obtenerNotificaciones(
            usuarioId,
            false,
            5,
          );

          console.log(`📨 SSE: Enviando update a usuario ${usuarioId} - Total: ${total}`);

          return {
            data: {
              total,
              notificaciones,
              timestamp: new Date().toISOString(),
            },
          };
        } catch (error) {
          console.error('Error en SSE stream:', error);
          return {
            data: {
              total: 0,
              notificaciones: [],
              timestamp: new Date().toISOString(),
              error: 'Error al obtener notificaciones',
            },
          };
        }
      }),
    );
  }
}
