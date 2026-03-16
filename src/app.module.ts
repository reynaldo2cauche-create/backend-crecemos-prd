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
import { Provincia } from './catalogos/provincia.entity';
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
import { GeofencingModule } from './geofencing/geofencing.module';
import { NotaEvolucion } from './pacientes/entities/nota-evolucion.entity';
import { Rol } from './usuarios/rol.entity';
import { Especialidad } from './usuarios/especialidad.entity';
import { ParejaPaciente } from './pacientes/entities/pareja-paciente.entity';
import { PacienteResponsable } from './pacientes/entities/paciente-responsable.entity';
import { HistoriaClinicaModule } from './historia-clinica/historia-clinica.module';
import { CitasModule } from './citas/citas.module';
import { BloqueosModule } from './bloqueos/bloqueos.module';
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
import { SeguimientoAsistencia } from './citas/entities/seguimiento-asistencia.entity';
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
import { EventoSistema } from './notificaciones/entities/evento-sistema.entity';
import { Notificacion } from './notificaciones/entities/notificacion.entity';
import { NotificacionDestino } from './notificaciones/entities/notificacion-destino.entity';
import { NotificacionLeida } from './notificaciones/entities/notificacion-leida.entity';
import { Convenio } from './convenios/entities/convenio.entity';
import { PacienteConvenio } from './convenios/entities/paciente-convenio.entity';
import { ConveniosModule } from './convenios/convenios.module';
import { CategoriaBeneficio } from './convenios/entities/categoria-beneficio.entity';
import { BeneficioTermino } from './convenios/entities/beneficio-termino.entity';
import { StaffModule } from './staff/staff.module';
import { Staff } from './staff/entities/staff.entity';
import { StaffCursos } from './staff/entities/staff-cursos.entity';
import { EstadoCivil } from './catalogos/estado-civil.entity';
import { Parentesco } from './catalogos/parentesco.entity';
import { DatosAcademicos } from './usuarios/datos-academicos.entity';
import { NivelEducacion } from './catalogos/nivel-educacion.entity';
import { ProcesoLegalInfantil } from './procesos-legales-infantiles/entities/proceso-legal-infantil.entity';
import { ProcesosLegalesInfantilesModule } from './procesos-legales-infantiles/procesos-legales-infantiles.module';
import { SorteoModule } from './sorteos/sorteo.module';
import { Sorteo } from './sorteos/entities/sorteo.entity';
import { SorteoGanador } from './sorteos/entities/sorteo-ganador.entity';
import { EstadoSorteo } from './sorteos/entities/estado-sorteo.entity';
import { SorteoParticipante } from './sorteos/entities/sorteo-participante.entity';

import { TipoCompra } from './sorteos/entities/tipo-compra.entity';
import { Paquete } from './catalogos/paquete.entity';
import { Modalidad } from './catalogos/modalidad.entity';
import { Frecuencia } from './catalogos/frecuencia.entity';
import { TipoBloqueo } from './catalogos/tipo-bloqueo.entity';
import { BloqueoHorarios } from './bloqueos/entities/bloqueo-horarios.entity';
import { IndicacionTerapeutica } from './historia-clinica/entities/indicacion-terapeutica.entity';
import { IndicacionCita } from './historia-clinica/entities/indicacion-cita.entity';
import { IndicacionReferencia } from './historia-clinica/entities/indicacion-referencia.entity';
import { IndicacionRecomendaciones } from './historia-clinica/entities/indicacion-recomendaciones.entity';
import { IndicacionMateriales } from './historia-clinica/entities/indicacion-materiales.entity';

// ── Inventario ────────────────────────────────────────────────────────────────
import { InventarioModule } from './inventario/inventario.module';
import { CategoriaProducto } from './inventario/entities/categoria-producto.entity';
import { Proveedor } from './inventario/entities/proveedor.entity';
import { TipoProducto } from './inventario/entities/tipo-producto.entity';
import { Producto } from './inventario/entities/producto.entity';

import { CompraReposicion } from './inventario/entities/compra-reposicion.entity';
import { CompraReposicionDetalle } from './inventario/entities/compra-reposicion-detalle.entity';

// ── Ventas ────────────────────────────────────────────────────────────────────
import { VentasModule } from './ventas/ventas.module';
import { TipoVentaServicio } from './ventas/entities/tipo-venta-servicio.entity';
import { TipoPagador } from './ventas/entities/tipo-pagador.entity';
import { TipoDescuento } from './ventas/entities/tipo-descuento.entity';
import { CompradorExterno } from './ventas/entities/comprador-externo.entity';
import { VentaServicio } from './ventas/entities/venta-servicio.entity';
import { VentaServicioDetalle } from './ventas/entities/venta-servicio-detalle.entity';
import { VentaProducto } from './ventas/entities/venta-producto.entity';
import { VentaProductoDetalle } from './ventas/entities/venta-producto-detalle.entity';
import { ServicioTarifa } from './inventario/entities/servicio-tarifa.entity';
import { TipoComprobante } from './ventas/entities/tipo-comprobante.entity';
import { ResponsablePaciente } from './pacientes/entities/responsable-paciente.entity';
import { Responsable } from './pacientes/entities/responsable.entity';

// ── Promociones ───────────────────────────────────────────────────────────────
import { PromocionesModule } from './promociones/promociones.module';
import { Promocion } from './promociones/entities/promocion.entity';
import { PromocionRegla } from './promociones/entities/promocion-regla.entity';
import { PromocionAlcance } from './promociones/entities/promocion-alcance.entity';
import { VentaPromocionAplicada } from './promociones/entities/venta-promocion-aplicada.entity';
import { TipoCondicionPromo } from './promociones/entities/tipo-condicion-promo.entity';
import { TipoBeneficioPromo } from './promociones/entities/tipo-beneficio-promo.entity';
import { TipoAlcancePromo } from './promociones/entities/tipo-alcance-promo.entity';
import { TipoVentaPromo } from './promociones/entities/tipo-venta-promo.entity';
import { EntrevistaAdultos } from './historia-clinica/entities/entrevista-adultos.entity';


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
      // type: 'mysql',
      // host: 'localhost',
      // port: 3306,
      // username: 'crecemos',
      // password: 'DB_PASSWORD_REMOVED',
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
        Responsable,
        ResponsablePaciente,
        AsignacionTerapeuta,
        HistoriaClinica,
        ComentarioTerapia,
        EstadoPaciente,
        TipoDocumento,
        Sexo,
        Distrito,
        Provincia,
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
        PacienteResponsable,
        ReporteEvolucion,
        EntrevistaPadres,
        EntrevistaAdultos,
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
        SeguimientoAsistencia,
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
        EventoSistema,
        Notificacion,
        NotificacionDestino,
        NotificacionLeida,
        Convenio,
        PacienteConvenio,
        CategoriaBeneficio,
        BeneficioTermino,
        TipoCita,
        Staff,
        StaffCursos,
        EstadoCivil,
        Parentesco,
        DatosAcademicos,
        NivelEducacion,
        ProcesoLegalInfantil,
        Sorteo,
      
        SorteoGanador,
        EstadoSorteo,
        SorteoParticipante,
        TipoCompra,

        Paquete,
        Modalidad,
        Frecuencia,
        TipoBloqueo,
        BloqueoHorarios,
        IndicacionTerapeutica,
        IndicacionCita,
        IndicacionReferencia,
        IndicacionRecomendaciones,
        IndicacionMateriales,
        // Inventario
        CategoriaProducto,
        Proveedor,
        Producto,
        TipoProducto,
        CompraReposicion,
        CompraReposicionDetalle,
        ServicioTarifa,
        // Ventas
        TipoVentaServicio,
        TipoPagador,
        TipoDescuento,
        CompradorExterno,
        VentaServicio,
        VentaServicioDetalle,
        VentaProducto,
        VentaProductoDetalle,
        TipoComprobante,
        // Promociones
        Promocion,
        PromocionRegla,
        PromocionAlcance,
        VentaPromocionAplicada,
        TipoCondicionPromo,
        TipoBeneficioPromo,
        TipoAlcancePromo,
        TipoVentaPromo,

      ],
        synchronize: false,   // true en desarrollo, false en producción - DESHABILITADO para evitar conflictos con foreign keys
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
    BloqueosModule,
    PopupModule,
    RrhhModule,
    AuditoriaModule,
    NotificacionesModule,
    AuthModule,
    GeofencingModule,
    Comentario,
    ConveniosModule,
    StaffModule,
    ProcesosLegalesInfantilesModule,
    SorteoModule,
    InventarioModule,
    VentasModule,
    PromocionesModule,
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
