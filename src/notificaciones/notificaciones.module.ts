import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesEventsService } from './notificaciones-events.service';
import { Notificacion } from './notificacion.entity';
import { ConfiguracionNotificacion } from './configuracion-notificacion.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { SseAuthGuard } from '../auth/guards/sse-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notificacion,
      ConfiguracionNotificacion,
      Paciente,
      TrabajadorCentro,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'tu-secreto-seguro',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService, NotificacionesEventsService, SseAuthGuard],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
