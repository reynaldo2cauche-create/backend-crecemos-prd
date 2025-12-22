import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

/**
 * Servicio de eventos para notificaciones
 * Usa RxJS Subject (nativo de NestJS) en lugar de EventEmitter2
 * No requiere instalación de librerías adicionales
 */
@Injectable()
export class NotificacionesEventsService {
  // Subject es como un EventEmitter pero de RxJS (ya incluido en NestJS)
  private notificacionNuevaSubject = new Subject<{
    usuarioId: number;
    notificacion: any;
  }>();

  /**
   * Observable que los controladores pueden suscribirse
   */
  get notificacionNueva$() {
    return this.notificacionNuevaSubject.asObservable();
  }

  /**
   * Emite un evento de nueva notificación
   */
  emitirNotificacionNueva(usuarioId: number, notificacion: any) {
    this.notificacionNuevaSubject.next({ usuarioId, notificacion });
  }
}
