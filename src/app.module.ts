import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PacienteModule } from './pacientes/paciente.module';
import { PostulacionesModule } from './postulaciones/postulaciones.module';
import { Postulacion } from './postulaciones/postulacion.entity';
import { ConfigModule } from '@nestjs/config';
import { Paciente } from './pacientes/paciente.entity';
import { PacienteServicio } from './pacientes/paciente-servicio.entity';
import { AsignacionTerapeuta } from './pacientes/asignacion-terapeuta.entity';
import { HistoriaClinica } from './pacientes/historia-clinica.entity';
import { ComentarioTerapia } from './pacientes/comentario-terapia.entity';
import { EstadoPaciente } from './pacientes/estado-paciente.entity';

import { AreaServicio } from './catalogos/area-servicio.entity';
import { RelacionResponsable } from './catalogos/relacion-responsable.entity';

import { Distrito } from './catalogos/distrito.entity';
import { Sexo } from './catalogos/sexo.entity';
import { TipoDocumento } from './catalogos/tipo-documento.entity';
import { CatalogosModule } from './catalogos/catalogos.module';
import { Servicios } from './catalogos/servicios.entity';
import { GradoEscolar } from './catalogos/grado-escolar.entity';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { TiposTest } from './evaluaciones/tipos-test.entity';
import { GruposPreguntas } from './evaluaciones/grupos-preguntas.entity';
import { Pregunta } from './evaluaciones/pregunta.entity';
import { OpcionesPregunta } from './evaluaciones/opciones-pregunta.entity';
import { PreguntasGrupo } from './evaluaciones/preguntas-grupo.entity';
import { ResultadosTest } from './evaluaciones/resultados-test.entity';
import { DatosEstudiante } from './evaluaciones/datos-estudiante.entity';
import { Grado } from './evaluaciones/grado.entity';
import { Institucion } from './evaluaciones/institucion.entity';
import { Seccion } from './evaluaciones/seccion.entity';
import { TrabajadorCentro } from './evaluaciones/trabajador-centro.entity';
import { TrabajadorCentro as TrabajadorCentroUsuario } from './usuarios/trabajador-centro.entity';
import { TrabajadorServicio } from './usuarios/trabajador-servicio.entity';
import { AuthModule } from './auth/auth.module';
import { TrabajadorCentroModule } from './usuarios/trabajador-centro.module';
import { NotaEvolucion } from './pacientes/entities/nota-evolucion.entity';
import { Rol } from './usuarios/rol.entity';
import { Especialidad } from './usuarios/especialidad.entity';
import { ParejaPaciente } from './pacientes/entities/pareja-paciente.entity';
import { HistoriaClinicaModule } from './historia-clinica/historia-clinica.module';
import { CitasModule } from './citas/citas.module';
import { ReporteEvolucion } from './historia-clinica/entities/reporte-evolucion.entity';
import { EntrevistaPadres } from './historia-clinica/entities/entrevista-padres.entity';
import { ArchivoDigital } from './historia-clinica/entities/archivo-digital.entity';
import { TipoArchivo } from './historia-clinica/entities/tipo-archivo.entity';
import { Atenciones } from './catalogos/atenciones.entity';
import { RelacionPadres } from './catalogos/relacion-padres.entity';
import { AntecedentesFamiliares } from './catalogos/antecedentes-familiares.entity';
import { Ocupaciones } from './catalogos/ocupaciones.entity';
import { Cita } from './citas/entities/cita.entity';
import { CitaReunionClinica } from './citas/entities/cita-reunion-clinica.entity';
import { CitaReunionClinicaTerapeutas } from './citas/entities/cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './citas/entities/cita-reunion-clinica-servicios.entity';
import { CitaVisitaEscolar } from './citas/entities/cita-visita-escolar.entity';
import { HistorialCita } from './citas/entities/historial-cita.entity';
import { HistorialCitaReunionTerapeutas } from './citas/entities/historial-cita-reunion-terapeutas.entity';
import { HistorialCitaReunionServicios } from './citas/entities/historial-cita-reunion-servicios.entity';
import { HistorialCitaVisitaEscolar } from './citas/entities/historial-cita-visita-escolar.entity';
import { MotivoCita } from './catalogos/motivo-cita.entity';
import { EstadoCita } from './catalogos/estado-cita.entity';
import { TipoCita } from './catalogos/tipo-cita.entity';
import { HermanoEntrevista } from './historia-clinica/entities/hermano-entrevista.entity';
import { FamiliarEntrevista } from './historia-clinica/entities/familiar-entrevista.entity';

import { Comentario } from './postulaciones/comentario.entity';
import { EvaluacionTerapiaOcupacional } from './historia-clinica/entities/evaluacion-terapia-ocupacional.entity';
import { ArchivoOficial } from './historia-clinica/entities/archivo-oficial.entity';
import { ArchivoTerapia } from './historia-clinica/entities/archivo-terapia.entity';
import { Beneficio } from './convenios/entities/beneficio.entity';
import { CargoPostulacion } from './postulaciones/cargo-postulacion.entity';
import { EstadoPostulacion } from './postulaciones/estado-postulacion.entity';
import { PopupModule } from './popup/popup.module';
import { PopupProgramado } from './popup/popup-programado.entity';
import { RrhhModule } from './rrhh/rrhh.module';
import { Pago } from './rrhh/pago.entity';
import { Vacacion } from './rrhh/vacacion.entity';
import { CuentaBancaria } from './rrhh/cuenta-bancaria.entity';
import { TipoSueldo } from './rrhh/tipo-sueldo.entity';
import { Mes } from './rrhh/mes.entity';
import { PeriodoGratificacion } from './rrhh/periodo-gratificacion.entity';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AuditoriaAccion } from './auditoria/auditoria-accion.entity';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditoriaInterceptor } from './auditoria/auditoria.interceptor';
import { Cargo } from './usuarios/cargo.entity';
import { TransferenciaNotas } from './pacientes/entities/transferencia-notas.entity';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { Notificacion } from './notificaciones/notificacion.entity';
import { ConfiguracionNotificacion } from './notificaciones/configuracion-notificacion.entity';
import { Convenio } from './convenios/entities/convenio.entity';
import { PacienteConvenio } from './convenios/entities/paciente-convenio.entity';
import { ConveniosModule } from './convenios/convenios.module';
import { CategoriaBeneficio } from './convenios/entities/categoria-beneficio.entity';
import { StaffModule } from './staff/staff.module';
import { Staff } from './staff/entities/staff.entity';
// import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace las variables accesibles en toda la aplicación
    }),
    // ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),  // Ruta de la carpeta de archivos
      serveRoot: '/uploads',  // URL base para acceder a los archivos
      serveStaticOptions: {
        index: false,
        setHeaders: (res, path) => {
          // Configurar headers para diferentes tipos de archivo
          if (path.endsWith('.pdf')) {
            res.set('Content-Type', 'application/pdf');
          } else if (path.endsWith('.doc')) {
            res.set('Content-Type', 'application/msword');
          } else if (path.endsWith('.docx')) {
            res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          } else if (path.endsWith('.xls')) {
            res.set('Content-Type', 'application/vnd.ms-excel');
          } else if (path.endsWith('.xlsx')) {
            res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          } else if (path.endsWith('.ppt')) {
            res.set('Content-Type', 'application/vnd.ms-powerpoint');
          } else if (path.endsWith('.pptx')) {
            res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
          } else if (path.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
          }
          // Permitir que los archivos se puedan visualizar en el navegador
          res.set('Access-Control-Allow-Origin', '*');
        },
      },
    }),
    TypeOrmModule.forRoot({
      //  type: 'mysql',
      // host: 'localhost',
      // port: 3306,
      // username: 'crecemos',
      // password: 'KiJg8ns629',
      // database: 'crecemos_website',
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',  // Asegúrate de poner el nombre de usuario correcto
      password: 'admin',  // Asegúrate de poner la contraseña correcta
      database: 'crecemos_website',
      entities: [
        Postulacion,
        Paciente,
        PacienteServicio,
        AsignacionTerapeuta,
        HistoriaClinica,
        ComentarioTerapia,
        EstadoPaciente,
        TipoDocumento,
        Sexo,
        Distrito,
        RelacionResponsable,
        AreaServicio,
        Servicios,
        GradoEscolar,
        TiposTest,
        GruposPreguntas,
        Pregunta,
        OpcionesPregunta,
        PreguntasGrupo,
        ResultadosTest,
        DatosEstudiante,
        Grado,
        Institucion,
        Seccion,
        TrabajadorCentro,
        Cargo,
        NotaEvolucion,
        TrabajadorCentroUsuario,
        Rol,
        Especialidad,
        ParejaPaciente,
        ReporteEvolucion,
        EntrevistaPadres,
        ArchivoDigital,
        TipoArchivo,
        Atenciones,
        RelacionPadres,
        AntecedentesFamiliares,
        Ocupaciones,
        MotivoCita,
        EstadoCita,
        TipoCita,
        Cita,
        CitaReunionClinica,
        CitaReunionClinicaTerapeutas,
        CitaReunionClinicaServicios,
        CitaVisitaEscolar,
        HistorialCita,
        HistorialCitaReunionTerapeutas,
        HistorialCitaReunionServicios,
        HistorialCitaVisitaEscolar,
        HermanoEntrevista,
        FamiliarEntrevista,

        
        ,Comentario,
        EvaluacionTerapiaOcupacional,
        ArchivoOficial,
        ArchivoTerapia,
        Beneficio,
        CargoPostulacion,
        EstadoPostulacion,
        PopupProgramado,
        Pago,
        Vacacion,
        CuentaBancaria,
        TipoSueldo,
        Mes,
        PeriodoGratificacion,
        TrabajadorServicio,
        AuditoriaAccion,
        TransferenciaNotas,
        Notificacion,
        ConfiguracionNotificacion,
        Convenio,
        PacienteConvenio,
        CategoriaBeneficio,
        TipoCita,
        Staff
      ],
        synchronize: false,   // true en desarrollo, false en producción
          // Activar logs de SQL para debug

    }),

    // TypeOrmModule.forRoot({
    //   type: 'mysql',
    //   host: process.env.DB_HOST,
    //   port: parseInt(process.env.DB_PORT!, 10),
    //   username: process.env.DB_USERNAME,  // Asegúrate de poner el nombre de usuario correcto
    //   password: process.env.DB_PASSWORD,  // Asegúrate de poner la contraseña correcta
    //   database: process.env.DB_DATABASE,
    //   entities: [User, Postulacion],
    //   synchronize: true,    // Sincroniza automáticamente las tablas (desactívalo en producción)
    // }),

    PostulacionesModule,
    PacienteModule,
    CatalogosModule,
    EvaluacionesModule,
    AuthModule,
    TrabajadorCentroModule,
    HistoriaClinicaModule,
    CitasModule,
    PopupModule,
    RrhhModule,
    AuditoriaModule,
    NotificacionesModule,
    AuthModule,
    Comentario,
    ConveniosModule,
    StaffModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditoriaInterceptor,
    },
  ],
})

export class AppModule {}
