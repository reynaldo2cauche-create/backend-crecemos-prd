import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from './cita.entity';
import { HistorialCita } from './historial-cita.entity';
import { CitaService } from './cita.service';
import { CitaController } from './cita.controller';
import { CitaTerapeuta } from './cita-terapeuta.entity';
import { CitaServicio } from './cita-servicio.entity';
import { HistorialCitaServicio } from './historial-cita-servicio.entity';
import { HistorialCitaTerapeuta } from './historial-cita-terapeuta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cita, CitaTerapeuta,HistorialCita,CitaServicio,HistorialCitaServicio,HistorialCitaTerapeuta])],
  providers: [CitaService],
  controllers: [CitaController],
  exports: [CitaService]
})
export class CitasModule {}
