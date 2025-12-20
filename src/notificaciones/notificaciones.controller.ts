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
import { Observable, fromEvent, merge } from 'rxjs';
import { map, filter, switchMap } from 'rxjs/operators';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SseAuthGuard } from '../auth/guards/sse-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Controller('backend_api/notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
    private eventEmitter: EventEmitter2,
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
   * SSE: Stream de notificaciones en tiempo real
   * Funciona en cPanel y hosting compartido
   * Envía updates solo cuando hay cambios reales
   */
  @Public()
  @Sse('stream')
  @UseGuards(SseAuthGuard)
  sseNotificaciones(@Req() req): Observable<MessageEvent> {
    const usuarioId = req.user.userId;

    console.log(`📡 SSE: Usuario ${usuarioId} conectado`);

    // Escuchar eventos de nuevas notificaciones
    const notificacionEvent$ = fromEvent(this.eventEmitter, 'notificacion.nueva').pipe(
      filter((event: any) => event.usuarioId === usuarioId),
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
