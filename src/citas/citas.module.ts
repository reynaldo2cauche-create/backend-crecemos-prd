import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades principales (de la carpeta entities - para el nuevo sistema)
import { Cita } from './entities/cita.entity';
import { CitaReunionClinica } from './entities/cita-reunion-clinica.entity';
import { CitaReunionClinicaTerapeutas } from './entities/cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './entities/cita-reunion-clinica-servicios.entity';
import { CitaVisitaEscolar } from './entities/cita-visita-escolar.entity';

// Catálogos (de la carpeta catalogos)
import { MotivoCita } from '../catalogos/motivo-cita.entity';
import { EstadoCita } from '../catalogos/estado-cita.entity';
import { TipoCita } from '../catalogos/tipo-cita.entity';

// Servicios y controladores
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // Entidades de citas
      Cita,
      CitaReunionClinica,
      CitaReunionClinicaTerapeutas,
      CitaReunionClinicaServicios,
      CitaVisitaEscolar,
      // Catálogos
      MotivoCita,
      EstadoCita,
      TipoCita
    ]),
    forwardRef(() => NotificacionesModule),
  ],
  providers: [CitasService],
  controllers: [CitasController],
  exports: [CitasService]
})
export class CitasModule {}
