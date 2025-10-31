import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriaClinicaController } from './historia-clinica.controller';
import { HistoriaClinicaService } from './historia-clinica.service';
import { ArchivosDigitalesController } from './archivos-digitales.controller';
import { ArchivosDigitalesService } from './archivos-digitales.service';
import { ReporteEvolucion } from './entities/reporte-evolucion.entity';
import { EntrevistaPadres } from './entities/entrevista-padres.entity';
import { HermanoEntrevista } from './entities/hermano-entrevista.entity';
import { FamiliarEntrevista } from './entities/familiar-entrevista.entity';
import { ArchivoDigital } from './entities/archivo-digital.entity';
import { TipoArchivo } from './entities/tipo-archivo.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { Sexo } from '../catalogos/sexo.entity';
import { Ocupaciones } from '../catalogos/ocupaciones.entity';
import { EvaluacionTerapiaOcupacional } from './entities/evaluacion-terapia-ocupacional.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReporteEvolucion, 
      EntrevistaPadres,
      EvaluacionTerapiaOcupacional,
      HermanoEntrevista,
      FamiliarEntrevista,
      ArchivoDigital, 
      TipoArchivo, 
      Paciente, 
      TrabajadorCentro,
      Servicios,
      Sexo,
      Ocupaciones
    ]),
  ],
  controllers: [HistoriaClinicaController, ArchivosDigitalesController],
  providers: [HistoriaClinicaService, ArchivosDigitalesService],
  exports: [HistoriaClinicaService, ArchivosDigitalesService],
})
export class HistoriaClinicaModule {}
