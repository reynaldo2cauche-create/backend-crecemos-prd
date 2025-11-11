import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriaClinicaController } from './historia-clinica.controller';
import { HistoriaClinicaService } from './historia-clinica.service';


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
import { ArchivoOficial } from './entities/archivo-oficial.entity';
import { ArchivoTerapia } from './entities/archivo-terapia.entity';
import { ArchivosOficialesService } from './archivos-oficiales.service';
import { ArchivosTerapiaService } from './archivos-terapia.service';
import { ArchivosOficialesController } from './archivos-oficiales.controller';
import { ArchivosTerapiaController } from './archivos-terapia.controller';
import { TiposArchivoController } from './tipo-archivo.controller';
import { TiposArchivoService } from './tipo-archivo.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReporteEvolucion, 
      EntrevistaPadres,
      EvaluacionTerapiaOcupacional,
      HermanoEntrevista,
      FamiliarEntrevista,
      ArchivoOficial,
      ArchivoTerapia,
      TipoArchivo, 
      Paciente, 
      TrabajadorCentro,
      Servicios,
      Sexo,
      Ocupaciones
    ]),
  ],
  controllers: [HistoriaClinicaController,ArchivosOficialesController,ArchivosTerapiaController,TiposArchivoController],
  providers: [HistoriaClinicaService, ArchivosTerapiaService, ArchivosOficialesService, TiposArchivoService],
  exports: [HistoriaClinicaService, ArchivosTerapiaService, ArchivosOficialesService, TiposArchivoService],
})
export class HistoriaClinicaModule {}
