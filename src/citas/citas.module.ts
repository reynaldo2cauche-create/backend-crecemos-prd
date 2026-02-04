import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades principales (de la carpeta entities - para el nuevo sistema)
import { Cita } from './entities/cita.entity';
import { CitaReunionClinica } from './entities/cita-reunion-clinica.entity';
import { CitaReunionClinicaTerapeutas } from './entities/cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './entities/cita-reunion-clinica-servicios.entity';
import { CitaVisitaEscolar } from './entities/cita-visita-escolar.entity';
import { SeguimientoAsistencia } from './entities/seguimiento-asistencia.entity';

// Entidades de historial
import { HistorialCita } from './entities/historial-cita.entity';
import { HistorialCitaReunionTerapeutas } from './entities/historial-cita-reunion-terapeutas.entity';
import { HistorialCitaReunionServicios } from './entities/historial-cita-reunion-servicios.entity';
import { HistorialCitaVisitaEscolar } from './entities/historial-cita-visita-escolar.entity';

// Catálogos (de la carpeta catalogos)
import { MotivoCita } from '../catalogos/motivo-cita.entity';
import { EstadoCita } from '../catalogos/estado-cita.entity';
import { TipoCita } from '../catalogos/tipo-cita.entity';

// Servicios y controladores
import { CitasService } from './citas.service';
import { HistorialCitasService } from './historial-citas.service';
import { AsistenciaService } from './asistencia.service';

import { CitasController } from './citas.controller';
import { AsistenciaController } from './asistencia.controller';
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
      SeguimientoAsistencia,
      // Entidades de historial
      HistorialCita,
      HistorialCitaReunionTerapeutas,
      HistorialCitaReunionServicios,
      HistorialCitaVisitaEscolar,
      // Catálogos
      MotivoCita,
      EstadoCita,
      TipoCita
    ]),
    forwardRef(() => NotificacionesModule),
  ],
  providers: [CitasService, HistorialCitasService, AsistenciaService],
  controllers: [CitasController, AsistenciaController],
  exports: [CitasService, HistorialCitasService, AsistenciaService]
})
export class CitasModule {}
