import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/**
 * Gateway de notificaciones en tiempo real (reemplaza el polling de la campana).
 *
 * El cliente conecta con el JWT en `auth.token` (o `?token=`). Al autenticar,
 * se une a la sala `rol:<rolId>` (y `user:<id>`). Cuando se crea una notificación
 * (NotificacionesService), se emite a las salas de los roles destino.
 *
 * Si el WS no conecta (nginx sin upgrade, etc.), socket.io cae a long-polling y
 * además el front mantiene un polling lento de respaldo.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  // path por defecto /socket.io
})
export class NotificacionesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificacionesGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth && client.handshake.auth.token) ||
        (client.handshake.query && (client.handshake.query.token as string));

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'tu-secreto-seguro',
      });

      const rolId = payload?.rol?.id;
      const userId = payload?.sub;

      if (rolId) client.join(`rol:${rolId}`);
      if (userId) client.join(`user:${userId}`);
      client.data.userId = userId;
      client.data.rolId = rolId;
    } catch (e) {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {
    // nada que limpiar: socket.io maneja la salida de salas
  }

  /** Emite un evento a las salas de los roles indicados. */
  emitirARoles(rolesDestino: number[], evento: string, payload: any) {
    if (!this.server || !rolesDestino?.length) return;
    const rooms = rolesDestino.map((r) => `rol:${r}`);
    this.server.to(rooms).emit(evento, payload);
  }
}
