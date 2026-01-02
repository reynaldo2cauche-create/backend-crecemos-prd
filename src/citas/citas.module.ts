import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';

import { CitaService } from './cita.service';
import { CitaController } from './cita.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cita]),
    forwardRef(() => NotificacionesModule),
  ],
  providers: [CitaService],
  controllers: [CitaController],
  exports: [CitaService]
})
export class CitasModule {}
