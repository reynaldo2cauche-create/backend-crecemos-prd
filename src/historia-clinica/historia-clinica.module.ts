import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoriaClinicaController } from './historia-clinica.controller';
import { HistoriaClinicaService } from './historia-clinica.service';


import { ReporteEvolucion } from './entities/reporte-evolucion.entity';
import { EntrevistaPadres } from './entities/entrevista-padres.entity';
import { EntrevistaAdultos } from './entities/entrevista-adultos.entity';
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
import { ArchivosDigitalesController } from './archivos-digitales.controller';
import { ArchivosDigitalesService } from './archivos-digitales.service';
import { EntrevistaAdultosController } from './entrevista-adultos.controller';
import { EntrevistaAdultosService } from './entrevista-adultos.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { IndicacionTerapeutica } from './entities/indicacion-terapeutica.entity';
import { IndicacionCita } from './entities/indicacion-cita.entity';
import { IndicacionReferencia } from './entities/indicacion-referencia.entity';
import { IndicacionRecomendaciones } from './entities/indicacion-recomendaciones.entity';
import { IndicacionMateriales } from './entities/indicacion-materiales.entity';
import { IndicacionTerapeuticaController } from './indicacion-terapeutica.controller';
import { IndicacionTerapeuticaService } from './indicacion-terapeutica.service';
import { Modalidad } from '../catalogos/modalidad.entity';
import { Frecuencia } from '../catalogos/frecuencia.entity';
import { MotivoCita } from '../catalogos/motivo-cita.entity';
import { Especialidad } from '../usuarios/especialidad.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReporteEvolucion,
      EntrevistaPadres,
      EntrevistaAdultos,
      EvaluacionTerapiaOcupacional,
      HermanoEntrevista,
      FamiliarEntrevista,
      ArchivoOficial,
      ArchivoTerapia,
      ArchivoDigital,
      TipoArchivo,
      IndicacionTerapeutica,
      IndicacionCita,
      IndicacionReferencia,
      IndicacionRecomendaciones,
      IndicacionMateriales,
      Paciente,
      TrabajadorCentro,
      Servicios,
      Sexo,
      Ocupaciones,
      Modalidad,
      Frecuencia,
      MotivoCita,
      Especialidad
    ]),
    AuditoriaModule,
    NotificacionesModule,
  ],
  controllers: [HistoriaClinicaController,ArchivosOficialesController,ArchivosTerapiaController,TiposArchivoController,ArchivosDigitalesController,IndicacionTerapeuticaController,EntrevistaAdultosController],
  providers: [HistoriaClinicaService, ArchivosTerapiaService, ArchivosOficialesService, TiposArchivoService,ArchivosDigitalesService,IndicacionTerapeuticaService,EntrevistaAdultosService],
  exports: [HistoriaClinicaService, ArchivosTerapiaService, ArchivosOficialesService, TiposArchivoService,ArchivosDigitalesService,IndicacionTerapeuticaService,EntrevistaAdultosService],
})
export class HistoriaClinicaModule {}
