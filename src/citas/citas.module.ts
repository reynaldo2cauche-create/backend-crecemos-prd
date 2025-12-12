import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';
import { CitaService } from './cita.service';
import { CitaController } from './cita.controller';
import { CitaReunionEstado } from './cita-reunion-estado.entity';
import { CitaReunionClinica } from './cita-reunion-clinica.entity';
import { CitaReunionClinicaTerapeutas } from './cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './cita-reunion-clinica-servicios.entity';
import { VisitaEscolar } from './visita-escolar.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cita,
      CitaReunionEstado,
      CitaReunionClinica,
      CitaReunionClinicaTerapeutas,
      CitaReunionClinicaServicios,
      VisitaEscolar
    ])
  ],
  providers: [CitaService],
  controllers: [CitaController],
  exports: [CitaService]
})
export class CitasModule {}
