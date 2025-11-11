import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReporteEvolucion } from './entities/reporte-evolucion.entity';
import { EntrevistaPadres } from './entities/entrevista-padres.entity';
import { HermanoEntrevista } from './entities/hermano-entrevista.entity';
import { FamiliarEntrevista } from './entities/familiar-entrevista.entity';
import { CreateReporteEvolucionDto } from './dto/create-reporte-evolucion.dto';
import { CreateEntrevistaPadresDto } from './dto/create-entrevista-padres.dto';
import { UpdateEntrevistaPadresDto } from './dto/update-entrevista-padres.dto';
import { UpdateReporteEvolucionDto } from './dto/update-reporte-evolucion.dto';
import { Paciente } from '../pacientes/paciente.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { Sexo } from '../catalogos/sexo.entity';
import { Ocupaciones } from '../catalogos/ocupaciones.entity';
import { EvaluacionTerapiaOcupacional } from './entities/evaluacion-terapia-ocupacional.entity';
import { CreateEvaluacionTerapiaDto } from './dto/create-evaluacion-terapia.dto';
import { UpdateEvaluacionTerapiaDto } from './dto/update-evaluacion-terapia.dto';

@Injectable()
export class HistoriaClinicaService {
  constructor(
    @InjectRepository(ReporteEvolucion)
    private reporteEvolucionRepository: Repository<ReporteEvolucion>,
    @InjectRepository(EntrevistaPadres)
    private entrevistaPadresRepository: Repository<EntrevistaPadres>,
    @InjectRepository(HermanoEntrevista)
    private hermanoEntrevistaRepository: Repository<HermanoEntrevista>,
    @InjectRepository(FamiliarEntrevista)
    private familiarEntrevistaRepository: Repository<FamiliarEntrevista>,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    @InjectRepository(Servicios)
    private serviciosRepository: Repository<Servicios>,
    @InjectRepository(Sexo)
    private sexoRepository: Repository<Sexo>,
    @InjectRepository(Ocupaciones)
    private ocupacionesRepository: Repository<Ocupaciones>,
    @InjectRepository(EvaluacionTerapiaOcupacional)
  private evaluacionTerapiaRepository: Repository<EvaluacionTerapiaOcupacional>,
  ) {}

  async createEntrevistaPadres(createEntrevistaDto: CreateEntrevistaPadresDto): Promise<EntrevistaPadres> {
    // Verificar que el paciente existe
    const paciente = await this.pacienteRepository.findOne({
      where: { id: createEntrevistaDto.paciente_id, activo: true }
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${createEntrevistaDto.paciente_id} no encontrado`);
    }

    // Crear la entrevista a padres
    const entrevistaPadres = this.entrevistaPadresRepository.create({
      pacienteId: createEntrevistaDto.paciente_id,
      usuarioId: createEntrevistaDto.usuario_id,
      fecha: createEntrevistaDto.fecha ? new Date(createEntrevistaDto.fecha) : null,
      escolaridad: createEntrevistaDto.escolaridad,
      motivoConsulta: createEntrevistaDto.motivo_consulta,
      otrasAtenciones: createEntrevistaDto.otras_atenciones,
      antecedentesFamiliares: createEntrevistaDto.antecedentes_familiares,
      antecedentesMedicos: createEntrevistaDto.antecedentes_medicos,
      antecedentesPsiquiatricos: createEntrevistaDto.antecedentes_psiquiatricos,
      antecedentesToxicologicos: createEntrevistaDto.antecedentes_toxicologicos,
      relacionEntrePadres: createEntrevistaDto.relacion_entre_padres,
      detalleRelacionPadres: createEntrevistaDto.detalle_relacion_padres,
      cantidadHermanos: createEntrevistaDto.cantidad_hermanos,
      tiempoJuego: createEntrevistaDto.tiempo_juego,
      tiempoDispositivos: createEntrevistaDto.tiempo_dispositivos,
      antecedentesPrenatales: createEntrevistaDto.antecedentes_prenatales,
      desarrolloMotor: createEntrevistaDto.desarrollo_motor,
      desarrolloLenguaje: createEntrevistaDto.desarrollo_lenguaje,
      alimentacion: createEntrevistaDto.alimentacion,
      sueno: createEntrevistaDto.sueno,
      controlEsfinteres: createEntrevistaDto.control_esfinteres,
      antecedentesMedicosNino: createEntrevistaDto.antecedentes_medicos_nino,
      antecedentesEscolares: createEntrevistaDto.antecedentes_escolares,
      relacionPares: createEntrevistaDto.relacion_pares,
      expresionEmocional: createEntrevistaDto.expresion_emocional,
      relacionAutoridad: createEntrevistaDto.relacion_autoridad,
      juegosPreferidos: createEntrevistaDto.juegos_preferidos,
      actividadesFavoritas: createEntrevistaDto.actividades_favoritas,
      recomendaciones: createEntrevistaDto.recomendaciones,
      userIdActua: createEntrevistaDto.usuario_id,
    });

    // Guardar la entrevista
    const entrevistaGuardada = await this.entrevistaPadresRepository.save(entrevistaPadres);

    // Crear hermanos si existen
    if (createEntrevistaDto.hermanos && createEntrevistaDto.hermanos.length > 0) {
      for (const hermanoData of createEntrevistaDto.hermanos) {
        // Verificar que el sexo existe
        const sexo = await this.sexoRepository.findOne({
          where: { id: hermanoData.sexo, activo: true }
        });

        if (!sexo) {
          throw new NotFoundException(`Sexo con ID ${hermanoData.sexo} no encontrado`);
        }

        const hermano = this.hermanoEntrevistaRepository.create({
          entrevistaId: entrevistaGuardada.id,
          nombre: hermanoData.nombre,
          edad: hermanoData.edad,
          sexoId: hermanoData.sexo
        });

        await this.hermanoEntrevistaRepository.save(hermano);
      }
    }

    // Crear familiares si existen
    if (createEntrevistaDto.familiares && createEntrevistaDto.familiares.length > 0) {
      for (const familiarData of createEntrevistaDto.familiares) {
        // Verificar que la ocupación existe
        const ocupacion = await this.ocupacionesRepository.findOne({
          where: { id: familiarData.ocupacion, activo: true }
        });

        if (!ocupacion) {
          throw new NotFoundException(`Ocupación con ID ${familiarData.ocupacion} no encontrada`);
        }

        const familiar = this.familiarEntrevistaRepository.create({
          entrevistaId: entrevistaGuardada.id,
          nombre: familiarData.nombre,
          tipo: familiarData.tipo,
          edad: familiarData.edad,
          ocupacionId: familiarData.ocupacion
        });

        await this.familiarEntrevistaRepository.save(familiar);
      }
    }

    return entrevistaGuardada;
  }

  async createReporteEvolucion(createReporteDto: CreateReporteEvolucionDto): Promise<ReporteEvolucion> {
    // Verificar que el paciente existe
    const paciente = await this.pacienteRepository.findOne({
      where: { id: createReporteDto.paciente_id, activo: true }
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${createReporteDto.paciente_id} no encontrado`);
    }

    // Verificar que el servicio existe si se proporciona
    if (createReporteDto.servicio_id) {
      const servicio = await this.serviciosRepository.findOne({
        where: { id: createReporteDto.servicio_id, activo: true }
      });

      if (!servicio) {
        throw new NotFoundException(`Servicio con ID ${createReporteDto.servicio_id} no encontrado`);
      }
    }

    // Crear el reporte de evolución
    const reporteEvolucion = this.reporteEvolucionRepository.create({
      pacienteId: createReporteDto.paciente_id,
      usuarioId: createReporteDto.usuario_id,
      servicioId: createReporteDto.servicio_id,
      edad: createReporteDto.edad,
      fechaEvaluacion: createReporteDto.fecha_evaluacion ? new Date(createReporteDto.fecha_evaluacion) : null,
      periodoIntervencion: createReporteDto.periodo_intervencion,
      frecuenciaAtencion: createReporteDto.frecuencia_atencion,
      especialista: createReporteDto.especialista,
      metodologia: createReporteDto.metodologia,
      objetivos: createReporteDto.objetivos,
      logros: createReporteDto.logros,
      dificultades: createReporteDto.dificultades,
      objetivosSiguientePeriodo: createReporteDto.objetivos_siguiente_periodo,
      userIdActua: createReporteDto.usuario_id,
    });

    return await this.reporteEvolucionRepository.save(reporteEvolucion);
  }

  async getHistoriaClinica(pacienteId: number): Promise<ReporteEvolucion[]> {
    // Verificar que el paciente existe
    const paciente = await this.pacienteRepository.findOne({
      where: { id: pacienteId, activo: true }
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${pacienteId} no encontrado`);
    }

    // Obtener todos los reportes de evolución del paciente
    const reportes = await this.reporteEvolucionRepository.find({
      where: { 
        pacienteId: pacienteId,
        activo: true 
      },
      relations: ['usuario', 'servicio', 'servicio.area'],
      // order: {
      //   fechaEvaluacion: 'DESC',
      //   fechaCreacion: 'DESC'
      // }
    });

    return reportes;
  }

  async getReporteEvolucionById(reporteId: number): Promise<ReporteEvolucion> {
    const reporte = await this.reporteEvolucionRepository.findOne({
      where: { 
        id: reporteId,
        activo: true 
      },
      relations: ['paciente', 'usuario', 'servicio', 'servicio.area']
    });

    if (!reporte) {
      throw new NotFoundException(`Reporte de evolución con ID ${reporteId} no encontrado`);
    }

    return reporte;
  }

  async updateReporteEvolucion(reporteId: number, updateReporteDto: UpdateReporteEvolucionDto): Promise<ReporteEvolucion> {
    // Verificar que el reporte existe
    const reporte = await this.reporteEvolucionRepository.findOne({
      where: { id: reporteId, activo: true }
    });

    if (!reporte) {
      throw new NotFoundException(`Reporte de evolución con ID ${reporteId} no encontrado`);
    }

    // Verificar que el servicio existe si se proporciona
    if (updateReporteDto.servicio_id) {
      const servicio = await this.serviciosRepository.findOne({
        where: { id: updateReporteDto.servicio_id, activo: true }
      });

      if (!servicio) {
        throw new NotFoundException(`Servicio con ID ${updateReporteDto.servicio_id} no encontrado`);
      }
    }

    // Preparar los datos de actualización
    const updateData: any = {};

    if (updateReporteDto.servicio_id !== undefined) updateData.servicioId = updateReporteDto.servicio_id;
    if (updateReporteDto.edad !== undefined) updateData.edad = updateReporteDto.edad;
    if (updateReporteDto.fecha_evaluacion !== undefined) {
      updateData.fechaEvaluacion = new Date(updateReporteDto.fecha_evaluacion);
    }
    if (updateReporteDto.periodo_intervencion !== undefined) updateData.periodoIntervencion = updateReporteDto.periodo_intervencion;
    if (updateReporteDto.frecuencia_atencion !== undefined) updateData.frecuenciaAtencion = updateReporteDto.frecuencia_atencion;
    if (updateReporteDto.especialista !== undefined) updateData.especialista = updateReporteDto.especialista;
    if (updateReporteDto.metodologia !== undefined) updateData.metodologia = updateReporteDto.metodologia;
    if (updateReporteDto.objetivos !== undefined) updateData.objetivos = updateReporteDto.objetivos;
    if (updateReporteDto.logros !== undefined) updateData.logros = updateReporteDto.logros;
    if (updateReporteDto.dificultades !== undefined) updateData.dificultades = updateReporteDto.dificultades;
    if (updateReporteDto.objetivos_siguiente_periodo !== undefined) updateData.objetivosSiguientePeriodo = updateReporteDto.objetivos_siguiente_periodo;
    
    // Actualizar el usuario que modifica el reporte
    if (updateReporteDto.usuario_id !== undefined) {
      updateData.userIdActua = updateReporteDto.usuario_id;
    }

    // Actualizar el reporte
    await this.reporteEvolucionRepository.update(reporteId, updateData);

    // Retornar el reporte actualizado
    return await this.getReporteEvolucionById(reporteId);
  }

  async getEntrevistasPadres(pacienteId: number): Promise<EntrevistaPadres[]> {
    // Verificar que el paciente existe
    const paciente = await this.pacienteRepository.findOne({
      where: { id: pacienteId, activo: true }
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${pacienteId} no encontrado`);
    }

    // Obtener todas las entrevistas a padres del paciente
    const entrevistas = await this.entrevistaPadresRepository.find({
      where: { 
        pacienteId: pacienteId,
        activo: true 
      },
      relations: [
        'usuario', 
        'usuarioActua', 
        'atenciones', 
        'relacionPadres',
        'hermanos',
        'hermanos.sexo',
        'familiares',
        'familiares.ocupacion'
      ],
      order: {
        fecha: 'DESC',
        fechaCreacion: 'DESC'
      }
    });

    return entrevistas;
  }

  async getEntrevistaPadresById(entrevistaId: number): Promise<EntrevistaPadres> {
    const entrevista = await this.entrevistaPadresRepository.findOne({
      where: { 
        id: entrevistaId,
        activo: true 
      },
      relations: [
        'paciente', 
        'usuario', 
        'usuarioActua', 
        'atenciones', 
        'relacionPadres',
        'hermanos',
        'hermanos.sexo',
        'familiares',
        'familiares.ocupacion'
      ]
    });

    if (!entrevista) {
      throw new NotFoundException(`Entrevista a padres con ID ${entrevistaId} no encontrada`);
    }

    return entrevista;
  }

  async updateEntrevistaPadres(entrevistaId: number, updateEntrevistaDto: UpdateEntrevistaPadresDto): Promise<EntrevistaPadres> {
    // Verificar que la entrevista existe
    const entrevista = await this.entrevistaPadresRepository.findOne({
      where: { id: entrevistaId, activo: true }
    });

    if (!entrevista) {
      throw new NotFoundException(`Entrevista a padres con ID ${entrevistaId} no encontrada`);
    }

    // Preparar los datos de actualización
    const updateData: any = {};

    if (updateEntrevistaDto.fecha !== undefined) {
      updateData.fecha = new Date(updateEntrevistaDto.fecha);
    }
    if (updateEntrevistaDto.escolaridad !== undefined) updateData.escolaridad = updateEntrevistaDto.escolaridad;
    if (updateEntrevistaDto.motivo_consulta !== undefined) updateData.motivoConsulta = updateEntrevistaDto.motivo_consulta;
    if (updateEntrevistaDto.otras_atenciones !== undefined) updateData.otrasAtenciones = updateEntrevistaDto.otras_atenciones;
    if (updateEntrevistaDto.antecedentes_familiares !== undefined) updateData.antecedentesFamiliares = updateEntrevistaDto.antecedentes_familiares;
    if (updateEntrevistaDto.antecedentes_medicos !== undefined) updateData.antecedentesMedicos = updateEntrevistaDto.antecedentes_medicos;
    if (updateEntrevistaDto.antecedentes_psiquiatricos !== undefined) updateData.antecedentesPsiquiatricos = updateEntrevistaDto.antecedentes_psiquiatricos;
    if (updateEntrevistaDto.antecedentes_toxicologicos !== undefined) updateData.antecedentesToxicologicos = updateEntrevistaDto.antecedentes_toxicologicos;
    if (updateEntrevistaDto.relacion_entre_padres !== undefined) updateData.relacionEntrePadres = updateEntrevistaDto.relacion_entre_padres;
    if (updateEntrevistaDto.detalle_relacion_padres !== undefined) updateData.detalleRelacionPadres = updateEntrevistaDto.detalle_relacion_padres;
    if (updateEntrevistaDto.cantidad_hermanos !== undefined) updateData.cantidadHermanos = updateEntrevistaDto.cantidad_hermanos;
    if (updateEntrevistaDto.tiempo_juego !== undefined) updateData.tiempoJuego = updateEntrevistaDto.tiempo_juego;
    if (updateEntrevistaDto.tiempo_dispositivos !== undefined) updateData.tiempoDispositivos = updateEntrevistaDto.tiempo_dispositivos;
    if (updateEntrevistaDto.antecedentes_prenatales !== undefined) updateData.antecedentesPrenatales = updateEntrevistaDto.antecedentes_prenatales;
    if (updateEntrevistaDto.desarrollo_motor !== undefined) updateData.desarrolloMotor = updateEntrevistaDto.desarrollo_motor;
    if (updateEntrevistaDto.desarrollo_lenguaje !== undefined) updateData.desarrolloLenguaje = updateEntrevistaDto.desarrollo_lenguaje;
    if (updateEntrevistaDto.alimentacion !== undefined) updateData.alimentacion = updateEntrevistaDto.alimentacion;
    if (updateEntrevistaDto.sueno !== undefined) updateData.sueno = updateEntrevistaDto.sueno;
    if (updateEntrevistaDto.control_esfinteres !== undefined) updateData.controlEsfinteres = updateEntrevistaDto.control_esfinteres;
    if (updateEntrevistaDto.antecedentes_medicos_nino !== undefined) updateData.antecedentesMedicosNino = updateEntrevistaDto.antecedentes_medicos_nino;
    if (updateEntrevistaDto.antecedentes_escolares !== undefined) updateData.antecedentesEscolares = updateEntrevistaDto.antecedentes_escolares;
    if (updateEntrevistaDto.relacion_pares !== undefined) updateData.relacionPares = updateEntrevistaDto.relacion_pares;
    if (updateEntrevistaDto.expresion_emocional !== undefined) updateData.expresionEmocional = updateEntrevistaDto.expresion_emocional;
    if (updateEntrevistaDto.relacion_autoridad !== undefined) updateData.relacionAutoridad = updateEntrevistaDto.relacion_autoridad;
    if (updateEntrevistaDto.juegos_preferidos !== undefined) updateData.juegosPreferidos = updateEntrevistaDto.juegos_preferidos;
    if (updateEntrevistaDto.actividades_favoritas !== undefined) updateData.actividadesFavoritas = updateEntrevistaDto.actividades_favoritas;
    if (updateEntrevistaDto.recomendaciones !== undefined) updateData.recomendaciones = updateEntrevistaDto.recomendaciones;
    
    // Actualizar el usuario que modifica la entrevista
    if (updateEntrevistaDto.usuario_id !== undefined) {
      updateData.userIdActua = updateEntrevistaDto.usuario_id;
    }

    // Actualizar la entrevista
    await this.entrevistaPadresRepository.update(entrevistaId, updateData);

    // Retornar la entrevista actualizada
    return await this.getEntrevistaPadresById(entrevistaId);
  }
  // ==================== EVALUACIÓN TERAPIA OCUPACIONAL ====================

async createEvaluacionTerapia(createDto: CreateEvaluacionTerapiaDto): Promise<EvaluacionTerapiaOcupacional> {
  // Verificar que el paciente existe
  const paciente = await this.pacienteRepository.findOne({
    where: { id: createDto.paciente_id, activo: true }
  });

  if (!paciente) {
    throw new NotFoundException(`Paciente con ID ${createDto.paciente_id} no encontrado`);
  }

  // Crear la evaluación
  const evaluacion = this.evaluacionTerapiaRepository.create({
    pacienteId: createDto.paciente_id,
    fechaEvaluacion: createDto.fecha_evaluacion,
    motivoConsulta: createDto.motivo_consulta,
    
    // 1. Datos generales
    tipoParto: createDto.tipo_parto,
    estimulacionTemprana: createDto.estimulacion_temprana || false,
    terapiasAnteriores: createDto.terapias_anteriores || false,
    observacionesDatosGenerales: createDto.observaciones_datos_generales,
    
    // 2. Observaciones generales
    nivelAlerta: createDto.nivel_alerta,
    nivelAtencion: createDto.nivel_atencion,
    nivelActividad: createDto.nivel_actividad,
    
    // 3. Componente sensorial - Visuales
    usaLentes: createDto.usa_lentes || false,
    fijacionVisual: createDto.fijacion_visual || false,
    contactoVisual: createDto.contacto_visual || false,
    seguimientoVisual: createDto.seguimiento_visual || false,
    observacionesVisuales: createDto.observaciones_visuales,
    
    // 3. Componente sensorial - Auditivas
    reconoceFuentesSonoras: createDto.reconoce_fuentes_sonoras || false,
    buscaSonido: createDto.busca_sonido || false,
    observacionesAuditivas: createDto.observaciones_auditivas,
    
    // 3. Componente sensorial - Táctiles
    desordenesModulacion: createDto.desordenes_modulacion || false,
    hiperresponsividadTactil: createDto.hiperresponsividad_tactil || false,
    hiporresponsividadTactil: createDto.hiporresponsividad_tactil || false,
    observacionesTactiles: createDto.observaciones_tactiles,
    
    // 3. Componente sensorial - Gustativos
    selectividadComidas: createDto.selectividad_comidas || false,
    observacionesGustativos: createDto.observaciones_gustativos,
    
    // 3. Componente sensorial - Propioceptivo
    hiperresponsividadPropioceptivo: createDto.hiperresponsividad_propioceptivo || false,
    hiporresponsividadPropioceptivo: createDto.hiporresponsividad_propioceptivo || false,
    observacionesPropioceptivo: createDto.observaciones_propioceptivo,
    
    // 3. Componente sensorial - Vestibular
    inseguridadGravitacional: createDto.inseguridad_gravitacional || false,
    intoleranciaMovimiento: createDto.intolerancia_movimiento || false,
    hiporrespuestaMovimiento: createDto.hiporrespuesta_movimiento || false,
    observacionesVestibular: createDto.observaciones_vestibular,
    
    // 4. Componente motor
    fuerzaMuscular: createDto.fuerza_muscular,
    rangoArticular: createDto.rango_articular,
    coordinacionBimanual: createDto.coordinacion_bimanual,
    cruceLineaMedia: createDto.cruce_linea_media || false,
    dominacionManual: createDto.dominacion_manual,
    observacionesMotor: createDto.observaciones_motor,
    
    // 5. Componente psicológico
    intereses: createDto.intereses,
    
    // 6. Componente cognitivo
    atencionConcentracion: createDto.atencion_concentracion,
    seguimientoOrdenes: createDto.seguimiento_ordenes,
    otrosCognitivo: createDto.otros_cognitivo,
    
    // 7. AVD - Alimentación
    alimentacionIndependiente: createDto.alimentacion_independiente,
    observacionAlimentacion: createDto.observacion_alimentacion,
    
    // 7. AVD - Vestido
    desvestidoSuperior: createDto.desvestido_superior || false,
    desvestidoInferior: createDto.desvestido_inferior || false,
    vestidoSuperior: createDto.vestido_superior || false,
    vestidoInferior: createDto.vestido_inferior || false,
    manejoBotones: createDto.manejo_botones || false,
    manejoCierre: createDto.manejo_cierre || false,
    manejoLazos: createDto.manejo_lazos || false,
    observacionVestido: createDto.observacion_vestido,
    
    // 7. AVD - Higiene
    esfinterVesical: createDto.esfinter_vesical || false,
    esfinterAnal: createDto.esfinter_anal || false,
    lavadoManos: createDto.lavado_manos || false,
    lavadoCara: createDto.lavado_cara || false,
    cepilladoDientes: createDto.cepillado_dientes || false,
    observacionHigiene: createDto.observacion_higiene,
    
    // 8. Área escolar
    prensionLapizImitado: createDto.prension_lapiz_imitado || false,
    prensionLapizCopiado: createDto.prension_lapiz_copiado || false,
    prensionLapizColoreado: createDto.prension_lapiz_coloreado || false,
    recortado: createDto.recortado || false,
    prensionTijeras: createDto.prension_tijeras,
    observacionEscolar: createDto.observacion_escolar,
    
    // 9. Área del desempeño - Juego
    juguetesPreferidos: createDto.juguetes_preferidos,
    tipoJuegoSensoriomotor: createDto.tipo_juego_sensoriomotor || false,
    tipoJuegoSimbolico: createDto.tipo_juego_simbolico || false,
    tipoJuegoOtro: createDto.tipo_juego_otro || false,
    lugarPreferidoJugar: createDto.lugar_preferido_jugar,
    observacionJuego: createDto.observacion_juego,
    
    // 10. Comunicación
    lenguaje: createDto.lenguaje,
    
    // 11-13. Conclusiones, sugerencias y objetivos
    conclusiones: createDto.conclusiones,
    sugerencias: createDto.sugerencias,
    objetivosIniciales: createDto.objetivos_iniciales,
    
    creadoPor: createDto.usuario_id,
  });

  return await this.evaluacionTerapiaRepository.save(evaluacion);
}

async getEvaluacionesTerapia(pacienteId: number): Promise<EvaluacionTerapiaOcupacional[]> {
  // Verificar que el paciente existe
  const paciente = await this.pacienteRepository.findOne({
    where: { id: pacienteId, activo: true }
  });

  if (!paciente) {
    throw new NotFoundException(`Paciente con ID ${pacienteId} no encontrado`);
  }

  // Obtener todas las evaluaciones del paciente
  const evaluaciones = await this.evaluacionTerapiaRepository.find({
    where: { 
      pacienteId: pacienteId,
      
    },
    relations: ['usuario'],
    order: {
      fechaEvaluacion: 'DESC',
      creadoEn: 'DESC'
    }
  });

  return evaluaciones;
}

async getEvaluacionTerapiaById(evaluacionId: number): Promise<EvaluacionTerapiaOcupacional> {
  const evaluacion = await this.evaluacionTerapiaRepository.findOne({
    where: { 
      id: evaluacionId,
     
    },
    relations: ['paciente', 'usuario']
  });

  if (!evaluacion) {
    throw new NotFoundException(`Evaluación de terapia con ID ${evaluacionId} no encontrada`);
  }

  return evaluacion;
}
async updateEvaluacionTerapia(
  evaluacionId: number, 
  updateDto: UpdateEvaluacionTerapiaDto
): Promise<EvaluacionTerapiaOcupacional> {
  // Verificar que la evaluación existe
  const evaluacion = await this.evaluacionTerapiaRepository.findOne({
    where: { id: evaluacionId}
  });

  if (!evaluacion) {
    throw new NotFoundException(`Evaluación de terapia con ID ${evaluacionId} no encontrada`);
  }

  // Si se va a cambiar el paciente, verificar que existe
  if (updateDto.paciente_id && updateDto.paciente_id !== evaluacion.pacienteId) {
    const paciente = await this.pacienteRepository.findOne({
      where: { id: updateDto.paciente_id, activo: true }
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${updateDto.paciente_id} no encontrado`);
    }
  }

  // Actualizar los campos
  if (updateDto.paciente_id) evaluacion.pacienteId = updateDto.paciente_id;
  if (updateDto.fecha_evaluacion) evaluacion.fechaEvaluacion = updateDto.fecha_evaluacion;
  if (updateDto.motivo_consulta !== undefined) evaluacion.motivoConsulta = updateDto.motivo_consulta;
  
  // 1. Datos generales
  if (updateDto.tipo_parto !== undefined) evaluacion.tipoParto = updateDto.tipo_parto;
  if (updateDto.estimulacion_temprana !== undefined) evaluacion.estimulacionTemprana = updateDto.estimulacion_temprana;
  if (updateDto.terapias_anteriores !== undefined) evaluacion.terapiasAnteriores = updateDto.terapias_anteriores;
  if (updateDto.observaciones_datos_generales !== undefined) evaluacion.observacionesDatosGenerales = updateDto.observaciones_datos_generales;
  
  // 2. Observaciones generales
  if (updateDto.nivel_alerta !== undefined) evaluacion.nivelAlerta = updateDto.nivel_alerta;
  if (updateDto.nivel_atencion !== undefined) evaluacion.nivelAtencion = updateDto.nivel_atencion;
  if (updateDto.nivel_actividad !== undefined) evaluacion.nivelActividad = updateDto.nivel_actividad;
  
  // 3. Componente sensorial - Visuales
  if (updateDto.usa_lentes !== undefined) evaluacion.usaLentes = updateDto.usa_lentes;
  if (updateDto.fijacion_visual !== undefined) evaluacion.fijacionVisual = updateDto.fijacion_visual;
  if (updateDto.contacto_visual !== undefined) evaluacion.contactoVisual = updateDto.contacto_visual;
  if (updateDto.seguimiento_visual !== undefined) evaluacion.seguimientoVisual = updateDto.seguimiento_visual;
  if (updateDto.observaciones_visuales !== undefined) evaluacion.observacionesVisuales = updateDto.observaciones_visuales;
  
  // 3. Componente sensorial - Auditivas
  if (updateDto.reconoce_fuentes_sonoras !== undefined) evaluacion.reconoceFuentesSonoras = updateDto.reconoce_fuentes_sonoras;
  if (updateDto.busca_sonido !== undefined) evaluacion.buscaSonido = updateDto.busca_sonido;
  if (updateDto.observaciones_auditivas !== undefined) evaluacion.observacionesAuditivas = updateDto.observaciones_auditivas;
  
  // 3. Componente sensorial - Táctiles
  if (updateDto.desordenes_modulacion !== undefined) evaluacion.desordenesModulacion = updateDto.desordenes_modulacion;
  if (updateDto.hiperresponsividad_tactil !== undefined) evaluacion.hiperresponsividadTactil = updateDto.hiperresponsividad_tactil;
  if (updateDto.hiporresponsividad_tactil !== undefined) evaluacion.hiporresponsividadTactil = updateDto.hiporresponsividad_tactil;
  if (updateDto.observaciones_tactiles !== undefined) evaluacion.observacionesTactiles = updateDto.observaciones_tactiles;
  
  // 3. Componente sensorial - Gustativos
  if (updateDto.selectividad_comidas !== undefined) evaluacion.selectividadComidas = updateDto.selectividad_comidas;
  if (updateDto.observaciones_gustativos !== undefined) evaluacion.observacionesGustativos = updateDto.observaciones_gustativos;
  
  // 3. Componente sensorial - Propioceptivo
  if (updateDto.hiperresponsividad_propioceptivo !== undefined) evaluacion.hiperresponsividadPropioceptivo = updateDto.hiperresponsividad_propioceptivo;
  if (updateDto.hiporresponsividad_propioceptivo !== undefined) evaluacion.hiporresponsividadPropioceptivo = updateDto.hiporresponsividad_propioceptivo;
  if (updateDto.observaciones_propioceptivo !== undefined) evaluacion.observacionesPropioceptivo = updateDto.observaciones_propioceptivo;
  
  // 3. Componente sensorial - Vestibular
  if (updateDto.inseguridad_gravitacional !== undefined) evaluacion.inseguridadGravitacional = updateDto.inseguridad_gravitacional;
  if (updateDto.intolerancia_movimiento !== undefined) evaluacion.intoleranciaMovimiento = updateDto.intolerancia_movimiento;
  if (updateDto.hiporrespuesta_movimiento !== undefined) evaluacion.hiporrespuestaMovimiento = updateDto.hiporrespuesta_movimiento;
  if (updateDto.observaciones_vestibular !== undefined) evaluacion.observacionesVestibular = updateDto.observaciones_vestibular;
  
  // 4. Componente motor
  if (updateDto.fuerza_muscular !== undefined) evaluacion.fuerzaMuscular = updateDto.fuerza_muscular;
  if (updateDto.rango_articular !== undefined) evaluacion.rangoArticular = updateDto.rango_articular;
  if (updateDto.coordinacion_bimanual !== undefined) evaluacion.coordinacionBimanual = updateDto.coordinacion_bimanual;
  if (updateDto.cruce_linea_media !== undefined) evaluacion.cruceLineaMedia = updateDto.cruce_linea_media;
  if (updateDto.dominacion_manual !== undefined) evaluacion.dominacionManual = updateDto.dominacion_manual;
  if (updateDto.observaciones_motor !== undefined) evaluacion.observacionesMotor = updateDto.observaciones_motor;
  
  // 5. Componente psicológico
  if (updateDto.intereses !== undefined) evaluacion.intereses = updateDto.intereses;
  
  // 6. Componente cognitivo
  if (updateDto.atencion_concentracion !== undefined) evaluacion.atencionConcentracion = updateDto.atencion_concentracion;
  if (updateDto.seguimiento_ordenes !== undefined) evaluacion.seguimientoOrdenes = updateDto.seguimiento_ordenes;
  if (updateDto.otros_cognitivo !== undefined) evaluacion.otrosCognitivo = updateDto.otros_cognitivo;
  
  // 7. AVD - Alimentación
  if (updateDto.alimentacion_independiente !== undefined) evaluacion.alimentacionIndependiente = updateDto.alimentacion_independiente;
  if (updateDto.observacion_alimentacion !== undefined) evaluacion.observacionAlimentacion = updateDto.observacion_alimentacion;
  
  // 7. AVD - Vestido
  if (updateDto.desvestido_superior !== undefined) evaluacion.desvestidoSuperior = updateDto.desvestido_superior;
  if (updateDto.desvestido_inferior !== undefined) evaluacion.desvestidoInferior = updateDto.desvestido_inferior;
  if (updateDto.vestido_superior !== undefined) evaluacion.vestidoSuperior = updateDto.vestido_superior;
  if (updateDto.vestido_inferior !== undefined) evaluacion.vestidoInferior = updateDto.vestido_inferior;
  if (updateDto.manejo_botones !== undefined) evaluacion.manejoBotones = updateDto.manejo_botones;
  if (updateDto.manejo_cierre !== undefined) evaluacion.manejoCierre = updateDto.manejo_cierre;
  if (updateDto.manejo_lazos !== undefined) evaluacion.manejoLazos = updateDto.manejo_lazos;
  if (updateDto.observacion_vestido !== undefined) evaluacion.observacionVestido = updateDto.observacion_vestido;
  
  // 7. AVD - Higiene
  if (updateDto.esfinter_vesical !== undefined) evaluacion.esfinterVesical = updateDto.esfinter_vesical;
  if (updateDto.esfinter_anal !== undefined) evaluacion.esfinterAnal = updateDto.esfinter_anal;
  if (updateDto.lavado_manos !== undefined) evaluacion.lavadoManos = updateDto.lavado_manos;
  if (updateDto.lavado_cara !== undefined) evaluacion.lavadoCara = updateDto.lavado_cara;
  if (updateDto.cepillado_dientes !== undefined) evaluacion.cepilladoDientes = updateDto.cepillado_dientes;
  if (updateDto.observacion_higiene !== undefined) evaluacion.observacionHigiene = updateDto.observacion_higiene;
  
  // 8. Área escolar
  if (updateDto.prension_lapiz_imitado !== undefined) evaluacion.prensionLapizImitado = updateDto.prension_lapiz_imitado;
  if (updateDto.prension_lapiz_copiado !== undefined) evaluacion.prensionLapizCopiado = updateDto.prension_lapiz_copiado;
  if (updateDto.prension_lapiz_coloreado !== undefined) evaluacion.prensionLapizColoreado = updateDto.prension_lapiz_coloreado;
  if (updateDto.recortado !== undefined) evaluacion.recortado = updateDto.recortado;
  if (updateDto.prension_tijeras !== undefined) evaluacion.prensionTijeras = updateDto.prension_tijeras;
  if (updateDto.observacion_escolar !== undefined) evaluacion.observacionEscolar = updateDto.observacion_escolar;
  
  // 9. Área del desempeño - Juego
  if (updateDto.juguetes_preferidos !== undefined) evaluacion.juguetesPreferidos = updateDto.juguetes_preferidos;
  if (updateDto.tipo_juego_sensoriomotor !== undefined) evaluacion.tipoJuegoSensoriomotor = updateDto.tipo_juego_sensoriomotor;
  if (updateDto.tipo_juego_simbolico !== undefined) evaluacion.tipoJuegoSimbolico = updateDto.tipo_juego_simbolico;
  if (updateDto.tipo_juego_otro !== undefined) evaluacion.tipoJuegoOtro = updateDto.tipo_juego_otro;
  if (updateDto.lugar_preferido_jugar !== undefined) evaluacion.lugarPreferidoJugar = updateDto.lugar_preferido_jugar;
  if (updateDto.observacion_juego !== undefined) evaluacion.observacionJuego = updateDto.observacion_juego;
  
  // 10. Comunicación
  if (updateDto.lenguaje !== undefined) evaluacion.lenguaje = updateDto.lenguaje;
  
  // 11-13. Conclusiones, sugerencias y objetivos
  if (updateDto.conclusiones !== undefined) evaluacion.conclusiones = updateDto.conclusiones;
  if (updateDto.sugerencias !== undefined) evaluacion.sugerencias = updateDto.sugerencias;
  if (updateDto.objetivos_iniciales !== undefined) evaluacion.objetivosIniciales = updateDto.objetivos_iniciales;

  // Guardar los cambios
  return await this.evaluacionTerapiaRepository.save(evaluacion);
}

}
