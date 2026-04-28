import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cita } from './entities/cita.entity';
import { CitaReunionClinica } from './entities/cita-reunion-clinica.entity';
import { CitaReunionClinicaTerapeutas } from './entities/cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './entities/cita-reunion-clinica-servicios.entity';
import { CitaVisitaEscolar } from './entities/cita-visita-escolar.entity';
import { MotivoCita } from './entities/motivo-cita.entity';
import { EstadoCita } from './entities/estado-cita.entity';
import { TipoCita } from './entities/tipo-cita.entity';
import { CrearCitaDto } from './dto/crear-cita.dto';
import { HistorialCitasService } from './historial-citas.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { VentaServicioDetalle } from '../ventas/entities/venta-servicio-detalle.entity';
import { ResponsablePaciente } from '../pacientes/entities/responsable-paciente.entity';


@Injectable()
export class CitasService {
  constructor(
    @InjectRepository(Cita)
    private citaRepo: Repository<Cita>,
    @InjectRepository(CitaReunionClinica)
    private reunionRepo: Repository<CitaReunionClinica>,
    @InjectRepository(CitaReunionClinicaTerapeutas)
    private reunionTerapeutasRepo: Repository<CitaReunionClinicaTerapeutas>,
    @InjectRepository(CitaReunionClinicaServicios)
    private reunionServiciosRepo: Repository<CitaReunionClinicaServicios>,
    @InjectRepository(CitaVisitaEscolar)
    private visitaEscolarRepo: Repository<CitaVisitaEscolar>,
    @InjectRepository(MotivoCita)
    private motivoRepo: Repository<MotivoCita>,
    @InjectRepository(EstadoCita)
    private estadoRepo: Repository<EstadoCita>,
    @InjectRepository(TipoCita)
    private tipoRepo: Repository<TipoCita>,
    @InjectRepository(VentaServicioDetalle)
    private ventaDetalleRepo: Repository<VentaServicioDetalle>,
    @InjectRepository(ResponsablePaciente)
    private responsablePacienteRepo: Repository<ResponsablePaciente>,
    @Inject(forwardRef(() => HistorialCitasService))
    private historialService: HistorialCitasService,
    @Inject(forwardRef(() => NotificacionesService))
    private notificacionesService: NotificacionesService,

  ) {}

  private async determinarTipoCita(motivo_id: number): Promise<string> {
    const motivo = await this.motivoRepo.findOne({
      where: { id: motivo_id },
      relations: ['tipoCita'],
    });

    if (!motivo || !motivo.tipoCita) {
      throw new BadRequestException('Motivo de cita no válido');
    }

    return motivo.tipoCita.codigo;
  }

  /**
   * Verifica que el paciente no tenga una cita que se solape en el mismo horario.
   * Lanza BadRequestException si existe conflicto.
   */
  private async verificarConflictoPaciente(
    paciente_id: number,
    fecha: string,
    hora_inicio: string,
    hora_fin: string,
    excludeCitaId?: number,
  ): Promise<void> {
    // Convierte "HH:mm" o "HH:mm:ss" a minutos totales
    const toMinutes = (time: string): number => {
      if (!time) return 0;
      const partes = time.split(':').map(Number);
      return partes[0] * 60 + (partes[1] || 0);
    };

    const nuevaInicio = toMinutes(hora_inicio);
    const nuevaFin = hora_fin ? toMinutes(hora_fin) : nuevaInicio + 40;

    const query = this.citaRepo
      .createQueryBuilder('cita')
      .where('cita.paciente_id = :paciente_id', { paciente_id })
      .andWhere('cita.fecha = :fecha', { fecha })
      .andWhere('cita.flg_activo = 1');

    if (excludeCitaId) {
      query.andWhere('cita.id != :excludeId', { excludeId: excludeCitaId });
    }

    const citasExistentes = await query.getMany();

    for (const cita of citasExistentes) {
      const existInicio = toMinutes(cita.hora_inicio);
      const existFin = cita.hora_fin
        ? toMinutes(cita.hora_fin)
        : existInicio + (cita.duracion_minutos || 40);

      const hayConflicto =
        (nuevaInicio >= existInicio && nuevaInicio < existFin) ||
        (nuevaFin > existInicio && nuevaFin <= existFin) ||
        (nuevaInicio <= existInicio && nuevaFin >= existFin);

      if (hayConflicto) {
        const ini = cita.hora_inicio.substring(0, 5);
        const fin = cita.hora_fin?.substring(0, 5) ?? `${Math.floor(existFin / 60).toString().padStart(2, '0')}:${(existFin % 60).toString().padStart(2, '0')}`;
        throw new BadRequestException(
          `El paciente ya tiene una cita agendada en ese horario (${ini} - ${fin}). No se pueden superponer citas.`,
        );
      }
    }
  }

  /**
   * Verifica que el terapeuta no tenga una cita solapada en el mismo horario.
   * Lanza BadRequestException si existe conflicto.
   */
  private async verificarConflictoTerapeuta(
    doctor_id: number,
    fecha: string,
    hora_inicio: string,
    hora_fin: string,
    excludeCitaId?: number,
  ): Promise<void> {
    const toMinutes = (time: string): number => {
      if (!time) return 0;
      const partes = time.split(':').map(Number);
      return partes[0] * 60 + (partes[1] || 0);
    };

    const nuevaInicio = toMinutes(hora_inicio);
    const nuevaFin = hora_fin ? toMinutes(hora_fin) : nuevaInicio + 40;

    const query = this.citaRepo
      .createQueryBuilder('cita')
      .where('cita.doctor_id = :doctor_id', { doctor_id })
      .andWhere('cita.fecha = :fecha', { fecha })
      .andWhere('cita.flg_activo = 1');

    if (excludeCitaId) {
      query.andWhere('cita.id != :excludeId', { excludeId: excludeCitaId });
    }

    const citasExistentes = await query.getMany();

    for (const cita of citasExistentes) {
      const existInicio = toMinutes(cita.hora_inicio);
      const existFin = cita.hora_fin
        ? toMinutes(cita.hora_fin)
        : existInicio + (cita.duracion_minutos || 40);

      const hayConflicto =
        (nuevaInicio >= existInicio && nuevaInicio < existFin) ||
        (nuevaFin > existInicio && nuevaFin <= existFin) ||
        (nuevaInicio <= existInicio && nuevaFin >= existFin);

      if (hayConflicto) {
        const ini = cita.hora_inicio.substring(0, 5);
        const fin = cita.hora_fin?.substring(0, 5) ?? `${Math.floor(existFin / 60).toString().padStart(2, '0')}:${(existFin % 60).toString().padStart(2, '0')}`;
        throw new BadRequestException(
          `El terapeuta ya tiene una cita agendada en ese horario (${ini} - ${fin}). No se pueden superponer citas.`,
        );
      }
    }
  }

  async crear(dto: CrearCitaDto): Promise<any> {
    // Validar que el paciente no tenga otra cita solapada ese día (solo si hay paciente)
    if (dto.paciente_id) {
      await this.verificarConflictoPaciente(
        dto.paciente_id,
        dto.fecha,
        dto.hora_inicio,
        dto.hora_fin,
      );
    }

    // Validar que el terapeuta no tenga otra cita solapada ese día
    if (dto.doctor_id) {
      await this.verificarConflictoTerapeuta(
        dto.doctor_id,
        dto.fecha,
        dto.hora_inicio,
        dto.hora_fin,
      );
    }

    const tipoCita = await this.determinarTipoCita(dto.motivo_id);
    console.log(`🔍 Creando cita tipo: ${tipoCita}`);


    if (tipoCita === 'NORMAL') {
      return this.crearCitaNormal(dto);
    } else if (tipoCita === 'REUNION_CLINICA') {
      return this.crearReunionClinica(dto);
    } else if (tipoCita === 'VISITA_ESCOLAR') {
      return this.crearVisitaEscolar(dto);
    }

    throw new BadRequestException('Tipo de cita no soportado');
  }


  private async crearCitaNormal(dto: CrearCitaDto): Promise<Cita> {
    if (!dto.paciente_id) {
      throw new BadRequestException('Se requiere paciente_id para cita normal');
    }
    if (!dto.doctor_id || !dto.servicio_id) {
      throw new BadRequestException('Se requiere doctor_id y servicio_id para cita normal');
    }

    // 🛒 VALIDACIÓN OBLIGATORIA: venta_servicio_detalle_id
    if (!dto.venta_servicio_detalle_id) {
      throw new BadRequestException('Se requiere una venta previa (venta_servicio_detalle_id) para agendar la cita. El paciente debe tener una compra de sesiones disponibles.');
    }

    // 🛒 VALIDAR QUE LA VENTA EXISTE Y TIENE SESIONES DISPONIBLES
    const ventaDetalle = await this.ventaDetalleRepo.findOne({
      where: { id: dto.venta_servicio_detalle_id },
      relations: ['venta', 'servicio_tarifa', 'servicio_tarifa.servicio', 'servicio_tarifa.motivo_cita'],
    });

    if (!ventaDetalle) {
      throw new BadRequestException(`La venta seleccionada (ID: ${dto.venta_servicio_detalle_id}) no existe.`);
    }

    // 🛒 VALIDAR QUE LA VENTA CORRESPONDE AL PACIENTE CORRECTO
    if (ventaDetalle.paciente_id !== dto.paciente_id) {
      throw new BadRequestException(`La venta seleccionada pertenece a otro paciente. Por favor selecciona una venta válida para este paciente.`);
    }

    // 🛒 VALIDAR QUE LA VENTA TIENE SESIONES DISPONIBLES
    if (ventaDetalle.sesiones_usadas >= ventaDetalle.sesiones_totales) {
      throw new BadRequestException(`La venta seleccionada ya no tiene sesiones disponibles (${ventaDetalle.sesiones_usadas}/${ventaDetalle.sesiones_totales} usadas). Por favor selecciona otra venta con sesiones disponibles.`);
    }

    // 🛒 VALIDAR QUE EL SERVICIO DE LA VENTA COINCIDE CON EL SERVICIO DE LA CITA
    if (ventaDetalle.servicio_tarifa?.servicio_id !== dto.servicio_id) {
      throw new BadRequestException(`El servicio de la venta seleccionada no coincide con el servicio de la cita.`);
    }

    console.log(`✅ Venta validada: ID ${ventaDetalle.id}, Sesiones disponibles: ${ventaDetalle.sesiones_totales - ventaDetalle.sesiones_usadas}/${ventaDetalle.sesiones_totales}`);



    

    const cita = this.citaRepo.create({
      paciente_id: dto.paciente_id,
      doctor_id: dto.doctor_id,
      servicio_id: dto.servicio_id,
      venta_servicio_detalle_id: dto.venta_servicio_detalle_id, // 🛒 Vincular con compra
      motivo_id: dto.motivo_id,
      estado_id: dto.estado_id,
      fecha: dto.fecha,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      duracion_minutos: dto.duracion_minutos,
      nota: dto.nota,
      firma_documento: false,
      user_id_crea: dto.user_id_crea,
    });

    const guardada = await this.citaRepo.save(cita);
    console.log(`✅ Cita normal creada: ID ${guardada.id}`);

    // 🛒 INCREMENTAR SESIONES USADAS EN LA VENTA
    await this.citaRepo.query(
      `UPDATE venta_servicio_detalle
       SET sesiones_usadas = sesiones_usadas + 1
       WHERE id = ?`,
      [dto.venta_servicio_detalle_id]
    );
    console.log(`✅ Sesión descontada de venta ID ${dto.venta_servicio_detalle_id}: ${ventaDetalle.sesiones_usadas + 1}/${ventaDetalle.sesiones_totales}`);

    // Registrar en historial
    await this.historialService.registrarHistorial(
      guardada.id,
      'CREATE',
      dto.user_id_crea,
    );

    return guardada;
  }

// Agrega este método a tu CitasService (citas.service.ts)

async crearMultiples(citas: CrearCitaDto[]): Promise<any> {
  console.log(`🔍 Creando ${citas.length} citas...`);
  
  const resultados = [];
  const errores = [];

  for (let i = 0; i < citas.length; i++) {
    try {
      const citaCreada = await this.crear(citas[i]);
      resultados.push({
        index: i,
        cita: citaCreada,
        exito: true
      });
      console.log(`✅ Cita ${i + 1}/${citas.length} creada con éxito`);
    } catch (error) {
      errores.push({
        index: i,
        error: error.message,
        cita: citas[i]
      });
      console.log(`❌ Error al crear cita ${i + 1}/${citas.length}: ${error.message}`);
    }
  }

  console.log(`✅ Proceso completado: ${resultados.length} exitosas, ${errores.length} fallidas`);

  return {
    total: citas.length,
    exitosas: resultados.length,
    fallidas: errores.length,
    resultados,
    errores
  };
}

  private async crearReunionClinica(dto: CrearCitaDto): Promise<any> {
    if (!dto.terapeutas_ids || dto.terapeutas_ids.length === 0) {
      throw new BadRequestException('Se requiere al menos un terapeuta para reunión clínica');
    }

    if (!dto.servicios_ids || dto.servicios_ids.length === 0) {
      throw new BadRequestException('Se requiere al menos un servicio para reunión clínica');
    }

    // Crear cita base SIN doctor_id ni servicio_id (porque son múltiples)
    const cita = this.citaRepo.create({
      paciente_id: dto.paciente_id,
      doctor_id: null as any, // Se pondrá NULL en BD
      servicio_id: null as any, // Se pondrá NULL en BD
      motivo_id: dto.motivo_id,
      estado_id: dto.estado_id,
      fecha: dto.fecha,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      duracion_minutos: dto.duracion_minutos,
      nota: dto.nota,
      firma_documento: dto.firma_documento || false,
      user_id_crea: dto.user_id_crea,
    });

    const citaGuardada = await this.citaRepo.save(cita);
    console.log(`✅ Cita base para reunión clínica creada: ID ${citaGuardada.id}`);

    // Crear registro de reunión clínica relacionado con id_cita
    const reunion = this.reunionRepo.create({
      id_cita: citaGuardada.id,
      estado_cita_id: dto.estado_id,
      user_id_crea: dto.user_id_crea,
    });
    const reunionGuardada = await this.reunionRepo.save(reunion);
    console.log(`✅ Registro de reunión clínica creado con ID: ${reunionGuardada.id}`);

    // Agregar terapeutas
    for (const terapeuta_id of dto.terapeutas_ids) {
      await this.reunionTerapeutasRepo.save({
        id_reunion: reunionGuardada.id,
        id_terapeuta: terapeuta_id,
        user_id_crea: dto.user_id_crea,
      });
    }
    console.log(`✅ ${dto.terapeutas_ids.length} terapeutas agregados`);

    // Agregar servicios
    for (const servicio_id of dto.servicios_ids) {
      await this.reunionServiciosRepo.save({
        id_reunion: reunionGuardada.id,
        id_servicio: servicio_id,
        user_id_crea: dto.user_id_crea,
      });
    }
    console.log(`✅ ${dto.servicios_ids.length} servicios agregados`);

    // Registrar en historial
    await this.historialService.registrarHistorial(
      citaGuardada.id,
      'CREATE',
      dto.user_id_crea,
    );

    return citaGuardada;
  }

  private async crearVisitaEscolar(dto: CrearCitaDto): Promise<Cita> {
    if (!dto.paciente_id) {
      throw new BadRequestException('Se requiere paciente_id para visita escolar');
    }
    if (!dto.doctor_id) {
      throw new BadRequestException('Se requiere doctor_id para visita escolar');
    }

    if (!dto.encargado || !dto.encargado.institucion || !dto.encargado.nombre_completo) {
      throw new BadRequestException('Se requieren datos del encargado para visita escolar');
    }

    // Crear cita base
    const cita = this.citaRepo.create({
      paciente_id: dto.paciente_id,
      doctor_id: dto.doctor_id,
      servicio_id: dto.servicio_id || null,
      motivo_id: dto.motivo_id,
      estado_id: dto.estado_id,
      fecha: dto.fecha,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      duracion_minutos: dto.duracion_minutos,
      nota: dto.nota,
      firma_documento: dto.firma_documento || false,
      user_id_crea: dto.user_id_crea,
    });

    const citaGuardada = await this.citaRepo.save(cita);
    console.log(`✅ Cita base creada para visita escolar: ID ${citaGuardada.id}`);

    // Crear registro de visita escolar
    await this.visitaEscolarRepo.save({
      id_cita: citaGuardada.id,
      nombre_colegio: dto.encargado.institucion,
      nombre_intermediario: dto.encargado.nombre_completo,
      telefono: dto.encargado.telefono,
      observaciones: dto.nota,
      user_id_crea: dto.user_id_crea,
    });
    console.log(`✅ Datos de visita escolar agregados`);

    // Registrar en historial
    await this.historialService.registrarHistorial(
      citaGuardada.id,
      'CREATE',
      dto.user_id_crea,
    );

    return citaGuardada;
  }

async listar(filtros: any = {}): Promise<any[]> {
  const terapeutaId = filtros.terapeuta_id ? parseInt(filtros.terapeuta_id) : null;

  // Rango de fechas
  let fechaDesde: string;
  let fechaHasta: string;
  if (filtros.fecha_desde && filtros.fecha_hasta) {
    fechaDesde = filtros.fecha_desde;
    fechaHasta = filtros.fecha_hasta;
  } else {
    const hoy = new Date();
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    fechaDesde = fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    fechaHasta = fmt(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
  }

  // ── FASE 1: 3 queries en paralelo ─────────────────────────────────────────
  // Responsables NO se carga aquí — se trae solo al abrir el detalle (getCitaById)
  const [citasNormales, reunionesAll, visitasAll] = await Promise.all([

    this.citaRepo
      .createQueryBuilder('cita')
      .leftJoinAndSelect('cita.paciente', 'paciente')
      .leftJoinAndSelect('cita.doctor', 'doctor')
      .leftJoinAndSelect('cita.servicio', 'servicio')
      .leftJoinAndSelect('cita.motivo', 'motivo')
      .leftJoinAndSelect('cita.estado', 'estado')
      .where('cita.fecha BETWEEN :fechaDesde AND :fechaHasta', { fechaDesde, fechaHasta })
      .andWhere('cita.flg_activo = 1')
      .andWhere(terapeutaId ? 'cita.doctor_id = :terapeutaId' : '1=1', { terapeutaId })
      .orderBy('cita.fecha', 'ASC')
      .addOrderBy('cita.hora_inicio', 'ASC')
      .getMany(),

    this.reunionRepo.find({
      relations: ['terapeutas', 'terapeutas.terapeuta', 'servicios', 'servicios.servicio'],
    }),

    this.visitaEscolarRepo.find(),
  ]);

  // IDs de citas requeridas por reuniones y visitas
  const reunionCitaIds = reunionesAll.map(r => r.id_cita ?? r.id).filter(Boolean);
  const visitaCitaIds  = visitasAll.map(v => v.id_cita).filter(Boolean);

  // ── FASE 2: citas de reuniones y visitas en paralelo ──────────────────────
  const [citasDeReuniones, citasDeVisitas] = await Promise.all([

    reunionCitaIds.length
      ? this.citaRepo
          .createQueryBuilder('cita')
          .leftJoinAndSelect('cita.paciente', 'paciente')
          .leftJoinAndSelect('cita.motivo', 'motivo')
          .leftJoinAndSelect('cita.estado', 'estado')
          .whereInIds(reunionCitaIds)
          .andWhere('cita.fecha BETWEEN :fechaDesde AND :fechaHasta', { fechaDesde, fechaHasta })
          .andWhere('cita.flg_activo = 1')
          .getMany()
      : Promise.resolve([]),

    visitaCitaIds.length
      ? this.citaRepo
          .createQueryBuilder('cita')
          .leftJoinAndSelect('cita.paciente', 'paciente')
          .leftJoinAndSelect('cita.doctor', 'doctor')
          .leftJoinAndSelect('cita.servicio', 'servicio')
          .leftJoinAndSelect('cita.motivo', 'motivo')
          .leftJoinAndSelect('cita.estado', 'estado')
          .whereInIds(visitaCitaIds)
          .andWhere('cita.fecha BETWEEN :fechaDesde AND :fechaHasta', { fechaDesde, fechaHasta })
          .andWhere('cita.flg_activo = 1')
          .andWhere(terapeutaId ? 'cita.doctor_id = :terapeutaId' : '1=1', { terapeutaId })
          .getMany()
      : Promise.resolve([]),
  ]);

  // ── FASE 3: combinar en memoria, sin más queries ───────────────────────────
  const citaMapReunion = new Map(citasDeReuniones.map(c => [c.id, c]));
  const visitaMap      = new Map(visitasAll.map(v => [v.id_cita, v]));

  const reuniones = reunionesAll
    .map(r => {
      const citaId = r.id_cita ?? r.id;
      const cita   = citaMapReunion.get(citaId);
      if (!cita) return null;
      if (terapeutaId && !r.terapeutas.some(t => t.id_terapeuta === terapeutaId)) return null;
      return { ...cita, terapeutas: r.terapeutas, servicios: r.servicios, tipo_cita: 'REUNION_CLINICA' };
    })
    .filter(Boolean);

  const visitas = citasDeVisitas.map(cita => {
    const v = visitaMap.get(cita.id);
    return {
      ...cita,
      nombre_colegio: v?.nombre_colegio,
      nombre_intermediario: v?.nombre_intermediario,
      telefono: v?.telefono,
      observaciones: v?.observaciones,
      tipo_cita: 'VISITA_ESCOLAR',
    };
  });

  const idsReuniones = new Set(reunionCitaIds);
  const idsVisitas   = new Set(visitaCitaIds);

  const citasNormalesFiltered = citasNormales
    .filter(c => !idsReuniones.has(c.id) && !idsVisitas.has(c.id))
    .map(c => ({ ...c, tipo_cita: 'NORMAL' }));

  const todasLasCitas = [...citasNormalesFiltered, ...reuniones, ...visitas];

  return todasLasCitas.sort((a, b) => {
    const fechaA = new Date(`${a.fecha} ${a.hora_inicio}`);
    const fechaB = new Date(`${b.fecha} ${b.hora_inicio}`);
    return fechaA.getTime() - fechaB.getTime();
  });
}
  async obtenerPorId(id: number): Promise<any> {
    console.log(`🔍 Buscando cita con ID: ${id}`);

    // Buscar en citas base
    const cita = await this.citaRepo.findOne({
      where: { id },
      relations: ['paciente', 'paciente.responsables', 'doctor', 'servicio', 'motivo', 'estado'],
    });

    if (!cita) {
      console.log(`❌ Cita con ID ${id} NO encontrada en tabla citas`);
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    console.log(`✅ Cita encontrada. Paciente: ${cita.paciente?.nombres || 'N/A'}`);

    // 🆕 Consultar responsables MANUALMENTE desde la tabla responsable_paciente
    if (cita.paciente) {
      const responsables = await this.responsablePacienteRepo
        .createQueryBuilder('rp')
        .leftJoinAndSelect('rp.responsable', 'responsable')
        .where('rp.paciente_id = :pacienteId', { pacienteId: cita.paciente.id })
        .andWhere('rp.activo = :activo', { activo: true })
        .getMany();

      // Agregar responsables al objeto paciente
      cita.paciente.responsables = responsables.map(rp => ({
        id: rp.id,
        nombres: rp.responsable?.nombres || '',
        apellido_paterno: rp.responsable?.apellido_paterno || '',
        apellido_materno: rp.responsable?.apellido_materno || '',
        numero_documento: rp.responsable?.numero_documento || '',
        telefono: rp.responsable?.telefono || '',
        email: rp.responsable?.email || '',
        activo: rp.activo,
        orden: rp.orden
      })) as any;

      console.log(`🔍 DEBUG RESPONSABLES EN BACKEND:`, {
        cantidad: responsables.length,
        responsables: cita.paciente.responsables
      });
    }

    // Verificar si es reunión clínica (soportar registros antiguos y nuevos)
    let reunion = await this.reunionRepo.findOne({
      where: { id_cita: id },
      relations: ['terapeutas', 'terapeutas.terapeuta', 'servicios', 'servicios.servicio'],
    });

    // 🔥 Si no se encontró por id_cita, buscar por id (registros antiguos con id_cita = NULL)
    if (!reunion) {
      reunion = await this.reunionRepo.findOne({
        where: { id: id },
        relations: ['terapeutas', 'terapeutas.terapeuta', 'servicios', 'servicios.servicio'],
      });
    }

    if (reunion) {
      console.log(`📋 Es REUNIÓN CLÍNICA con ${reunion.terapeutas?.length || 0} terapeutas`);
      return {
        ...cita,
        terapeutas: reunion.terapeutas,
        servicios: reunion.servicios,
        tipo_cita: 'REUNION_CLINICA'
      };
    }

    // Verificar si es visita escolar
    const visita = await this.visitaEscolarRepo.findOne({
      where: { id_cita: id },
    });

    if (visita) {
      console.log(`🏫 Es VISITA ESCOLAR a ${visita.nombre_colegio}`);
      return {
        ...cita,
        nombre_colegio: visita.nombre_colegio,
        nombre_intermediario: visita.nombre_intermediario,
        telefono: visita.telefono,
        observaciones: visita.observaciones,
        tipo_cita: 'VISITA_ESCOLAR'
      };
    }

    console.log(`📝 Es CITA NORMAL`);
    return { ...cita, tipo_cita: 'NORMAL' };
  }
  async actualizar(id: number, dto: CrearCitaDto): Promise<any> {
  // Motivo de modificación obligatorio
  if (!dto.motivo_accion || dto.motivo_accion.trim() === '') {
    throw new BadRequestException('El motivo de la modificación es obligatorio');
  }
  const motivoAccionFinal = dto.motivo_accion.trim();

  // Validar que el paciente no tenga otra cita solapada (excluyendo la cita actual, solo si hay paciente)
  if (dto.paciente_id) {
    await this.verificarConflictoPaciente(
      dto.paciente_id,
      dto.fecha,
      dto.hora_inicio,
      dto.hora_fin,
      id,
    );
  }

  // Validar que el terapeuta no tenga otra cita solapada en ese horario (excluyendo la cita actual)
  if (dto.doctor_id) {
    await this.verificarConflictoTerapeuta(
      dto.doctor_id,
      dto.fecha,
      dto.hora_inicio,
      dto.hora_fin,
      id,
    );
  }

  const tipoCita = await this.determinarTipoCita(dto.motivo_id);
  console.log(`🔍 Actualizando cita ID ${id}, tipo: ${tipoCita}`);
  console.log(`📝 Motivo de modificación: ${motivoAccionFinal}`);

  // Obtener la cita existente con todas sus relaciones ANTES de actualizar
  const citaAntigua = await this.citaRepo.findOne({
    where: { id },
    relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
  });

  if (!citaAntigua) {
    throw new NotFoundException(`Cita con ID ${id} no encontrada`);
  }

  // 🔥 Cargar datos específicos según tipo de cita ANTES de actualizar
  let datosAntiguosCompletos: any = {
    ...citaAntigua,
    servicioNombre: citaAntigua.servicio?.nombre || null,
    doctorNombre: citaAntigua.doctor
      ? `${citaAntigua.doctor.nombres} ${citaAntigua.doctor.apellidos}`.trim()
      : null,
  };

  if (tipoCita === 'VISITA_ESCOLAR') {
    const visitaAntigua = await this.visitaEscolarRepo.findOne({
      where: { id_cita: id }
    });
    if (visitaAntigua) {
      datosAntiguosCompletos = {
        ...datosAntiguosCompletos,
        nombre_colegio: visitaAntigua.nombre_colegio,
        nombre_intermediario: visitaAntigua.nombre_intermediario,
        telefono: visitaAntigua.telefono,
        observaciones: visitaAntigua.observaciones,
      };
    }
  } else if (tipoCita === 'REUNION_CLINICA') {
    const reunionAntigua = await this.reunionRepo.findOne({
      where: { id_cita: id },
      relations: ['terapeutas', 'servicios']
    });
    if (reunionAntigua) {
      // Cargar nombres de terapeutas antiguos
      const terapeutasAntiguos = await this.reunionTerapeutasRepo.find({
        where: { id_reunion: reunionAntigua.id }
      });
      const terapeutasIds = terapeutasAntiguos.map(t => t.id_terapeuta);

      let terapeutasNombresAntiguos = [];
      if (terapeutasIds.length > 0) {
        const queryTerapeutas = `SELECT id, nombres, apellidos FROM trabajador_centro WHERE id IN (?)`;
        const terapeutas = await this.citaRepo.query(queryTerapeutas, [terapeutasIds]);
        terapeutasNombresAntiguos = terapeutas.map(t => `${t.nombres} ${t.apellidos}`.trim());
      }

      // Cargar nombres de servicios antiguos
      const serviciosAntiguos = await this.reunionServiciosRepo.find({
        where: { id_reunion: reunionAntigua.id }
      });
      const serviciosIds = serviciosAntiguos.map(s => s.id_servicio);

      let serviciosNombresAntiguos = [];
      if (serviciosIds.length > 0) {
        const queryServicios = `SELECT id, nombre FROM servicios WHERE id IN (?)`;
        const servicios = await this.citaRepo.query(queryServicios, [serviciosIds]);
        serviciosNombresAntiguos = servicios.map(s => s.nombre);
      }

      datosAntiguosCompletos = {
        ...datosAntiguosCompletos,
        reunion_clinica: reunionAntigua,
        terapeutasNombres: terapeutasNombresAntiguos.join(', '),
        serviciosNombres: serviciosNombresAntiguos.join(', '),
      };
    }
  }

  // Guardar datos antiguos para la notificación
  const datosAntiguos = {
    fecha: citaAntigua.fecha,
    hora_inicio: citaAntigua.hora_inicio,
    doctor_id: citaAntigua.doctor_id,
    doctor_nombre: citaAntigua.doctor
      ? `${citaAntigua.doctor.nombres} ${citaAntigua.doctor.apellidos}`
      : 'No asignado',
  };

  // Actualizar según tipo
  let resultado;
  if (tipoCita === 'NORMAL') {
    resultado = await this.actualizarCitaNormal(id, { ...dto, motivo_accion: motivoAccionFinal });
  } else if (tipoCita === 'REUNION_CLINICA') {
    resultado = await this.actualizarReunionClinica(id, { ...dto, motivo_accion: motivoAccionFinal });
  } else if (tipoCita === 'VISITA_ESCOLAR') {
    resultado = await this.actualizarVisitaEscolar(id, { ...dto, motivo_accion: motivoAccionFinal });
  } else {
    throw new BadRequestException('Tipo de cita no soportado');
  }

  // 🔔 Disparar notificación de cita modificada
  try {
    // Obtener información del usuario que modifica
    const queryUsuario = `SELECT nombres, apellidos FROM trabajador_centro WHERE id = ?`;
    const usuario = await this.citaRepo.query(queryUsuario, [dto.user_id_crea]);
    const nombreUsuario = usuario && usuario.length > 0
      ? `${usuario[0].nombres} ${usuario[0].apellidos}`
      : 'Usuario desconocido';

    // Obtener nombre del paciente
    const pacienteNombre = citaAntigua.paciente
      ? `${citaAntigua.paciente.nombres} ${citaAntigua.paciente.apellido_paterno} ${citaAntigua.paciente.apellido_materno || ''}`.trim()
      : 'Paciente desconocido';

    // Obtener nombre del nuevo terapeuta si cambió
    let nuevoTerapeutaNombre = datosAntiguos.doctor_nombre;
    if (dto.doctor_id && dto.doctor_id !== datosAntiguos.doctor_id) {
      const queryTerapeuta = `SELECT nombres, apellidos FROM trabajador_centro WHERE id = ?`;
      const terapeuta = await this.citaRepo.query(queryTerapeuta, [dto.doctor_id]);
      nuevoTerapeutaNombre = terapeuta && terapeuta.length > 0
        ? `${terapeuta[0].nombres} ${terapeuta[0].apellidos}`
        : 'Terapeuta desconocido';
    }

    await this.notificacionesService.notificarCitaModificada(
        id,                              // citaId
      dto.user_id_crea,                // usuarioModificadorId
      nombreUsuario,                   // nombreUsuarioModificador
      pacienteNombre,                  // pacienteNombre
      datosAntiguos.fecha,             // fechaAnterior
      datosAntiguos.hora_inicio,       // horaAnterior
      datosAntiguos.doctor_nombre,     // terapeutaNombre
      datosAntiguos.doctor_id,         // 👈 terapeutaId (agregado)
      dto.fecha,                       // 👈 fechaNueva (corregido)
      dto.hora_inicio,                 // 👈 horaNueva (corregido)
      motivoAccionFinal, 
    );
  } catch (error) {
    console.error('❌ Error al crear notificación de cita modificada:', error.message);
    // No detener la actualización si falla la notificación
  }

  // Retornar datos anteriores y nuevos para auditoría detallada
  return {
    datosAnteriores: datosAntiguosCompletos,
    datosNuevos: resultado,
    ...resultado  // Spread para mantener compatibilidad con código existente
  };
}

private async actualizarCitaNormal(id: number, dto: CrearCitaDto): Promise<any> {
  if (!dto.paciente_id) {
    throw new BadRequestException('Se requiere paciente_id para cita normal');
  }
  if (!dto.doctor_id || !dto.servicio_id) {
    throw new BadRequestException('Se requiere doctor_id y servicio_id para cita normal');
  }

  await this.citaRepo.update(id, {
    paciente_id: dto.paciente_id,
    doctor_id: dto.doctor_id,
    servicio_id: dto.servicio_id,
    motivo_id: dto.motivo_id,
    estado_id: dto.estado_id,
    fecha: dto.fecha,
    hora_inicio: dto.hora_inicio,
    hora_fin: dto.hora_fin,
    duracion_minutos: dto.duracion_minutos,
    nota: dto.nota,
    user_id_actua: dto.user_id_crea,
  });

  console.log(`✅ Cita normal actualizada: ID ${id}`);

  // Registrar en historial con motivo
  await this.historialService.registrarHistorial(
    id,
    'UPDATE',
    dto.user_id_crea,
    undefined,
    dto.motivo_accion,
  );

  const citaActualizada = await this.citaRepo.findOne({
    where: { id },
    relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado']
  });

  // 🔥 Retornar con motivo y nombres para auditoría
  return {
    ...citaActualizada,
    servicioNombre: citaActualizada.servicio?.nombre || null,
    doctorNombre: citaActualizada.doctor
      ? `${citaActualizada.doctor.nombres} ${citaActualizada.doctor.apellidos}`.trim()
      : null,
    motivo_accion: dto.motivo_accion
  };
}

private async actualizarReunionClinica(id: number, dto: CrearCitaDto): Promise<any> {
  if (!dto.terapeutas_ids || dto.terapeutas_ids.length === 0) {
    throw new BadRequestException('Se requiere al menos un terapeuta para reunión clínica');
  }

  if (!dto.servicios_ids || dto.servicios_ids.length === 0) {
    throw new BadRequestException('Se requiere al menos un servicio para reunión clínica');
  }

  // Actualizar cita base
  await this.citaRepo.update(id, {
    paciente_id: dto.paciente_id,
    motivo_id: dto.motivo_id,
    estado_id: dto.estado_id,
    fecha: dto.fecha,
    hora_inicio: dto.hora_inicio,
    hora_fin: dto.hora_fin,
    duracion_minutos: dto.duracion_minutos,
    nota: dto.nota,
    user_id_actua: dto.user_id_crea,
  });

  console.log(`✅ Cita base actualizada: ID ${id}`);

  // Buscar el registro de reunión clínica por id_cita (soportar registros antiguos y nuevos)
  let reunion = await this.reunionRepo.findOne({ where: { id_cita: id } });

  // 🔥 Si no se encontró por id_cita, buscar por id (registros antiguos con id_cita = NULL)
  if (!reunion) {
    reunion = await this.reunionRepo.findOne({ where: { id: id } });
  }

  if (!reunion) {
    throw new BadRequestException(`No se encontró reunión clínica para la cita ${id}`);
  }

  // Actualizar registro de reunión clínica
  await this.reunionRepo.update(reunion.id, {
    estado_cita_id: dto.estado_id,
    user_id_actua: dto.user_id_crea,
  });

  // Eliminar terapeutas anteriores
  await this.reunionTerapeutasRepo.delete({ id_reunion: reunion.id });

  // Agregar nuevos terapeutas
  for (const terapeuta_id of dto.terapeutas_ids) {
    await this.reunionTerapeutasRepo.save({
      id_reunion: reunion.id,
      id_terapeuta: terapeuta_id,
      user_id_crea: dto.user_id_crea,
    });
  }
  console.log(`✅ ${dto.terapeutas_ids.length} terapeutas actualizados`);

  // Eliminar servicios anteriores
  await this.reunionServiciosRepo.delete({ id_reunion: reunion.id });

  // Agregar nuevos servicios
  for (const servicio_id of dto.servicios_ids) {
    await this.reunionServiciosRepo.save({
      id_reunion: reunion.id,
      id_servicio: servicio_id,
      user_id_crea: dto.user_id_crea,
    });
  }
  console.log(`✅ ${dto.servicios_ids.length} servicios actualizados`);

  // Registrar en historial con motivo
  await this.historialService.registrarHistorial(
    id,
    'UPDATE',
    dto.user_id_crea,
    undefined,
    dto.motivo_accion,
  );

  const citaActualizada = await this.citaRepo.findOne({
    where: { id },
    relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado']
  });

  // 🔥 Cargar datos actualizados de reunión clínica con nombres
  let reunionFinal = await this.reunionRepo.findOne({
    where: { id_cita: id },
    relations: ['terapeutas', 'servicios']
  });
  if (!reunionFinal) {
    reunionFinal = await this.reunionRepo.findOne({
      where: { id: id },
      relations: ['terapeutas', 'servicios']
    });
  }

  // Cargar nombres de terapeutas
  let terapeutasNombres = [];
  if (dto.terapeutas_ids && dto.terapeutas_ids.length > 0) {
    const queryTerapeutas = `SELECT id, nombres, apellidos FROM trabajador_centro WHERE id IN (?)`;
    const terapeutas = await this.citaRepo.query(queryTerapeutas, [dto.terapeutas_ids]);
    terapeutasNombres = terapeutas.map(t => `${t.nombres} ${t.apellidos}`.trim());
  }

  // Cargar nombres de servicios
  let serviciosNombres = [];
  if (dto.servicios_ids && dto.servicios_ids.length > 0) {
    const queryServicios = `SELECT id, nombre FROM servicios WHERE id IN (?)`;
    const servicios = await this.citaRepo.query(queryServicios, [dto.servicios_ids]);
    serviciosNombres = servicios.map(s => s.nombre);
  }

  const reunionActualizada = reunionFinal ? {
    estado_cita_id: reunionFinal.estado_cita_id,
    terapeutas_ids: dto.terapeutas_ids,
    terapeutasNombres: terapeutasNombres.join(', '),
    servicios_ids: dto.servicios_ids,
    serviciosNombres: serviciosNombres.join(', '),
  } : null;

  // 🔥 Retornar con motivo y datos específicos de reunión clínica para auditoría
  return {
    ...citaActualizada,
    reunion_clinica: reunionActualizada,
    terapeutasNombres: terapeutasNombres.join(', '),
    serviciosNombres: serviciosNombres.join(', '),
    motivo_accion: dto.motivo_accion
  };
}

private async actualizarVisitaEscolar(id: number, dto: CrearCitaDto): Promise<any> {
  if (!dto.paciente_id) {
    throw new BadRequestException('Se requiere paciente_id para visita escolar');
  }
  if (!dto.doctor_id) {
    throw new BadRequestException('Se requiere doctor_id para visita escolar');
  }

  if (!dto.encargado || !dto.encargado.institucion || !dto.encargado.nombre_completo) {
    throw new BadRequestException('Se requieren datos del encargado para visita escolar');
  }

  // Actualizar cita base
  await this.citaRepo.update(id, {
    paciente_id: dto.paciente_id,
    doctor_id: dto.doctor_id,
    servicio_id: dto.servicio_id || null,
    motivo_id: dto.motivo_id,
    estado_id: dto.estado_id,
    fecha: dto.fecha,
    hora_inicio: dto.hora_inicio,
    hora_fin: dto.hora_fin,
    duracion_minutos: dto.duracion_minutos,
    nota: dto.nota,
    firma_documento: dto.firma_documento || false,
    user_id_actua: dto.user_id_crea,
  });

  console.log(`✅ Cita base actualizada: ID ${id}`);

  // Actualizar datos de visita escolar
  await this.visitaEscolarRepo.update(
    { id_cita: id },
    {
      nombre_colegio: dto.encargado.institucion,
      nombre_intermediario: dto.encargado.nombre_completo,
      telefono: dto.encargado.telefono,
      observaciones: dto.nota,
      user_id_actua: dto.user_id_crea,
    }
  );

  console.log(`✅ Datos de visita escolar actualizados`);

  // Registrar en historial con motivo
  await this.historialService.registrarHistorial(
    id,
    'UPDATE',
    dto.user_id_crea,
    undefined,
    dto.motivo_accion,
  );

  const citaActualizada = await this.citaRepo.findOne({
    where: { id },
    relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado']
  });

  // 🔥 Cargar datos actualizados de visita escolar
  const visitaActualizada = await this.visitaEscolarRepo.findOne({
    where: { id_cita: id }
  });

  // 🔥 Retornar con motivo y datos específicos de visita escolar para auditoría
  return {
    ...citaActualizada,
    servicioNombre: citaActualizada.servicio?.nombre || null,
    doctorNombre: citaActualizada.doctor
      ? `${citaActualizada.doctor.nombres} ${citaActualizada.doctor.apellidos}`.trim()
      : null,
    nombre_colegio: visitaActualizada?.nombre_colegio,
    nombre_intermediario: visitaActualizada?.nombre_intermediario,
    telefono: visitaActualizada?.telefono,
    observaciones: visitaActualizada?.observaciones,
    motivo_accion: dto.motivo_accion
  };
}

  async eliminar(id: number, usuarioId?: number, motivoAccion?: string): Promise<any> {
    // ✅ VALIDAR MOTIVO DE ACCIÓN (OBLIGATORIO PARA DELETE)
    if (!motivoAccion || motivoAccion.trim() === '') {
      throw new BadRequestException('El motivo de eliminación es obligatorio');
    }

    console.log(`🗑️ Eliminando (soft delete) cita ID ${id}`);
    console.log(`📝 Motivo de eliminación: ${motivoAccion}`);

    // Obtener la cita con todas sus relaciones para auditoría
    const cita = await this.citaRepo.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
    });

    if (!cita) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    // Verificar si ya está eliminada
    if (cita.flg_activo === 0) {
      throw new BadRequestException('La cita ya fue eliminada');
    }

    // Obtener información del usuario que elimina
    const query = `SELECT nombres, apellidos FROM trabajador_centro WHERE id = ?`;
    const usuario = await this.citaRepo.query(query, [usuarioId || cita.user_id_crea]);
    const nombreUsuario = usuario && usuario.length > 0
      ? `${usuario[0].nombres} ${usuario[0].apellidos}`
      : 'Usuario desconocido';

    // Registrar en historial ANTES de "eliminar" (con motivo)
    await this.historialService.registrarHistorial(
      id,
      'DELETE',
      usuarioId || cita.user_id_crea,
      undefined,
      motivoAccion,
    );

    // 🔔 Disparar notificación de cita eliminada
    try {
      // Determinar el tipo de cita para el nombre correcto
      const tipoCita = await this.determinarTipoCita(cita.motivo_id);
      const pacienteNombre = cita.paciente
        ? `${cita.paciente.nombres} ${cita.paciente.apellido_paterno} ${cita.paciente.apellido_materno || ''}`.trim()
        : (tipoCita === 'REUNION_CLINICA' ? 'Reunión Interna' : 'Sin paciente');

      const terapeutaNombre = cita.doctor
        ? `${cita.doctor.nombres} ${cita.doctor.apellidos}`
        : 'Terapeuta no asignado';

      await this.notificacionesService.notificarCitaEliminada(
        id,
        usuarioId || cita.user_id_crea,
        nombreUsuario,
        pacienteNombre,
        cita.fecha,
        cita.hora_inicio,
        terapeutaNombre,
        motivoAccion,
      );
    } catch (error) {
      console.error('❌ Error al crear notificación de cita eliminada:', error.message);
      // No detener la eliminación si falla la notificación
    }

    // ✅ SOFT DELETE: Marcar como eliminado en lugar de borrar físicamente
    await this.citaRepo.update(id, {
      flg_activo: 0,
      user_id_actua: usuarioId || cita.user_id_crea,
    });
    console.log(`✅ Cita ${id} marcada como eliminada (flg_activo = 0)`);

    // 🛒 DEVOLVER SESIÓN A LA VENTA (si la cita tenía venta asociada)
    if (cita.venta_servicio_detalle_id) {
      await this.citaRepo.query(
        `UPDATE venta_servicio_detalle
         SET sesiones_usadas = GREATEST(0, sesiones_usadas - 1)
         WHERE id = ?`,
        [cita.venta_servicio_detalle_id]
      );
      console.log(`✅ Sesión devuelta a venta ID ${cita.venta_servicio_detalle_id}`);
    }

    // 🔥 Retornar con motivo y datos de la cita para auditoría
    return {
      mensaje: 'Cita eliminada correctamente',
      motivo_accion: motivoAccion,
      cita: cita
    };
  }

  async getMotivosCita(): Promise<MotivoCita[]> {
    return this.motivoRepo.find({
      where: { activo: true },
      relations: ['tipoCita'],
      order: { nombre: 'ASC' },
    });
  }

  async getEstadosCita(): Promise<EstadoCita[]> {
    return this.estadoRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async getTiposCita(): Promise<TipoCita[]> {
    return this.tipoRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }


/**
 * Obtener estadísticas de citas
 * @param fechaDesde - Primer día del mes visible (YYYY-MM-DD)
 * @param fechaHasta - Último día del mes visible (YYYY-MM-DD)
 * @param terapeutaId - ID del terapeuta (opcional)
 * @param fechaReferencia - Fecha de referencia del calendario (YYYY-MM-DD)
 */
async obtenerEstadisticas(
  fechaDesde: string,
  fechaHasta: string,
  terapeutaId?: number,
  fechaReferencia?: string
): Promise<any> {
  console.log(`📊 Obteniendo estadísticas de citas`);
  console.log(`   - Rango mes visible: ${fechaDesde} al ${fechaHasta}`);
  console.log(`   - Terapeuta ID: ${terapeutaId || 'TODOS'}`);
  console.log(`   - Fecha de referencia: ${fechaReferencia || 'HOY (sin calendario)'}`);

  // Función auxiliar para formatear fechas
  const formatearFecha = (fecha: Date) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ===================================================================
  // DETERMINAR FECHA BASE PARA LOS CÁLCULOS
  // ===================================================================
  let fechaBase: Date;
  let esModoCalendario = false; // ¿Hay terapeuta seleccionado?

  if (fechaReferencia) {
    // Siempre usar la fecha de referencia del calendario si está disponible
    fechaBase = new Date(fechaReferencia + 'T00:00:00');
    esModoCalendario = !!terapeutaId; // true si hay terapeuta, false si es global
    console.log(`   ✅ Modo: ${esModoCalendario ? 'CALENDARIO (terapeuta seleccionado)' : 'GLOBAL (calendario visible)'}`);
    console.log(`   📅 Fecha base: ${formatearFecha(fechaBase)}`);
  } else {
    // Fallback: usar fecha actual de Perú (GMT-5)
    const ahora = new Date();
    const fechaPeru = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Lima' }));
    fechaBase = fechaPeru;
    console.log(`   ⚠️ Modo: FALLBACK (usando hora de Perú)`);
    console.log(`   📅 Fecha base: ${formatearFecha(fechaBase)}`);
  }

  // ===================================================================
  // 1. TOTAL DE CITAS DEL AÑO (excluyendo motivo_id = 7)
  // ===================================================================
  const anioBase = fechaBase.getFullYear();
  const inicioAnio = `${anioBase}-01-01`;
  const finAnio = `${anioBase}-12-31`;

  const queryAnio = this.citaRepo
    .createQueryBuilder('cita')
    .where('cita.fecha >= :inicioAnio', { inicioAnio })
    .andWhere('cita.fecha <= :finAnio', { finAnio })
    .andWhere('cita.flg_activo = 1')
    .andWhere('cita.motivo_id != 7'); // ❌ EXCLUIR reuniones clínicas

  if (terapeutaId) {
    queryAnio.andWhere('cita.doctor_id = :terapeutaId', { terapeutaId });
  }

  const totalCitasAnio = await queryAnio.getCount();

  // ===================================================================
  // 2. TOTAL DE CITAS DEL MES
  // ===================================================================
  let mesDesde: string;
  let mesHasta: string;

  if (esModoCalendario) {
    // Con calendario: usar el mes visible
    mesDesde = fechaDesde;
    mesHasta = fechaHasta;
  } else {
    // Sin calendario: usar el mes actual real
    const primerDiaMes = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1);
    const ultimoDiaMes = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + 1, 0);
    mesDesde = formatearFecha(primerDiaMes);
    mesHasta = formatearFecha(ultimoDiaMes);
  }

  const queryMes = this.citaRepo
    .createQueryBuilder('cita')
    .where('cita.fecha >= :mesDesde', { mesDesde })
    .andWhere('cita.fecha <= :mesHasta', { mesHasta })
    .andWhere('cita.flg_activo = 1')
    .andWhere('cita.motivo_id != 7'); // ❌ EXCLUIR reuniones clínicas

  if (terapeutaId) {
    queryMes.andWhere('cita.doctor_id = :terapeutaId', { terapeutaId });
  }

  const totalCitasMes = await queryMes.getCount();

  // ===================================================================
  // 3. TOTAL DE REUNIONES CLÍNICAS DEL MES (SOLO motivo_id = 7)
  // ===================================================================
  const queryReuniones = this.citaRepo
    .createQueryBuilder('cita')
    .innerJoin('cita_reunion_clinica', 'rc', 'rc.id_cita = cita.id')
    .where('cita.fecha >= :mesDesde', { mesDesde })
    .andWhere('cita.fecha <= :mesHasta', { mesHasta })
    .andWhere('cita.flg_activo = 1')
    .andWhere('cita.motivo_id = 7'); // ✅ SOLO reuniones clínicas

  if (terapeutaId) {
    console.log(`   🔍 Filtrando reuniones clínicas por terapeuta ID: ${terapeutaId}`);
    // Para reuniones clínicas, buscar en la tabla de terapeutas asociados
    queryReuniones.innerJoin(
      'cita_reunion_clinica_terapeutas',
      'rct',
      'rct.id_reunion = rc.id AND rct.id_terapeuta = :terapeutaId',
      { terapeutaId }
    );
  }

  // 🔥 LOG DE LA QUERY SQL GENERADA
  const sqlQuery = queryReuniones.getSql();
  console.log(`   🔍 SQL Query para reuniones clínicas:`);
  console.log(`   ${sqlQuery}`);
  console.log(`   📊 Parámetros: mesDesde=${mesDesde}, mesHasta=${mesHasta}, terapeutaId=${terapeutaId || 'N/A'}`);

  const totalReunionesClinicasMes = await queryReuniones.getCount();
  console.log(`   ✅ Reuniones clínicas encontradas: ${totalReunionesClinicasMes}`);

  // ===================================================================
  // 4. CITAS DE ESTA SEMANA (Lunes a Sábado) - SIN motivo_id = 7
  // ===================================================================
  const diaSemana = fechaBase.getDay(); // 0=domingo, 1=lunes, ..., 6=sábado
  const lunes = new Date(fechaBase);

  if (diaSemana === 0) {
    // Si es domingo, ir al lunes anterior
    lunes.setDate(fechaBase.getDate() - 6);
  } else {
    // Cualquier otro día, ir al lunes de esa semana
    lunes.setDate(fechaBase.getDate() - (diaSemana - 1));
  }

  const sabado = new Date(lunes);
  sabado.setDate(lunes.getDate() + 5); // Lunes + 5 días = Sábado

  const inicioSemana = formatearFecha(lunes);
  const finSemana = formatearFecha(sabado);

  const querySemana = this.citaRepo
    .createQueryBuilder('cita')
    .where('cita.fecha >= :inicioSemana', { inicioSemana })
    .andWhere('cita.fecha <= :finSemana', { finSemana })
    .andWhere('cita.flg_activo = 1')
    .andWhere('cita.motivo_id != 7'); // ❌ EXCLUIR reuniones clínicas

  if (terapeutaId) {
    querySemana.andWhere('cita.doctor_id = :terapeutaId', { terapeutaId });
  }

  const citasEstaSemana = await querySemana.getCount();

  // ===================================================================
  // LOGS FINALES
  // ===================================================================
  console.log(`✅ Estadísticas calculadas:`);
  console.log(`   📅 Año ${anioBase}: ${totalCitasAnio} citas (sin RC)`);
  console.log(`   📅 Mes (${mesDesde} - ${mesHasta}): ${totalCitasMes} citas (sin RC)`);
  console.log(`   📋 Reuniones Clínicas del Mes: ${totalReunionesClinicasMes}`);
  console.log(`   📅 Semana (${inicioSemana} - ${finSemana}): ${citasEstaSemana} citas (sin RC)`);

  return {
    // Totales principales (SIN reuniones clínicas)
    totalCitasAnio,
    totalCitasMes,
    citasEstaSemana,
    
    // ✅ Contador separado de reuniones clínicas
    totalReunionesClinicasMes,
    
    // Información de la semana
    inicioSemana,
    finSemana,
    
    // Información del mes usado
    mesDesde,
    mesHasta,
    
    // Metadatos
    anioBase,
    esModoCalendario,
    terapeutaId: terapeutaId || null,
  };
}

/**
 * Obtener estadísticas de sesiones para el dashboard
 * @param fechaDesde - Fecha inicio del rango (YYYY-MM-DD)
 * @param fechaHasta - Fecha fin del rango (YYYY-MM-DD)
 * @param terapeutaId - ID del terapeuta (opcional)
 * @param pacienteId - ID del paciente (opcional)
 */
async obtenerEstadisticasSesiones(
  fechaDesde: string,
  fechaHasta: string,
  terapeutaId?: number,
  pacienteId?: number
): Promise<any> {
  console.log(`📊 Obteniendo estadísticas de sesiones`);
  console.log(`   - Rango: ${fechaDesde} al ${fechaHasta}`);
  console.log(`   - Terapeuta ID: ${terapeutaId || 'TODOS'} (tipo: ${typeof terapeutaId})`);
  console.log(`   - Paciente ID: ${pacienteId || 'TODOS'} (tipo: ${typeof pacienteId})`);

  // Query base
  let queryBase = this.citaRepo
    .createQueryBuilder('cita')
    .where('cita.fecha >= :fechaDesde', { fechaDesde })
    .andWhere('cita.fecha <= :fechaHasta', { fechaHasta })
    .andWhere('cita.flg_activo = 1')
    .andWhere('cita.motivo_id != 7'); // Excluir reuniones clínicas

  if (terapeutaId) {
    queryBase.andWhere('cita.doctor_id = :terapeutaId', { terapeutaId });
  }

  if (pacienteId) {
    queryBase.andWhere('cita.paciente_id = :pacienteId', { pacienteId });
  }

  // Total de sesiones
  const totalSesiones = await queryBase.getCount();

  // Sesiones por terapeuta
  const queryTerapeutas = this.citaRepo
    .createQueryBuilder('cita')
    .select('tc.id', 'terapeuta_id')
    .addSelect('tc.nombres', 'terapeuta_nombres')
    .addSelect('tc.apellidos', 'terapeuta_apellidos')
    .addSelect('COUNT(cita.id)', 'total_sesiones')
    .addSelect('COUNT(DISTINCT cita.paciente_id)', 'total_pacientes')
    .innerJoin('cita.doctor', 'tc')
    .where('cita.fecha >= :fechaDesde', { fechaDesde })
    .andWhere('cita.fecha <= :fechaHasta', { fechaHasta })
    .andWhere('cita.flg_activo = 1')
    .andWhere('cita.motivo_id != 7');

  if (terapeutaId) {
    queryTerapeutas.andWhere('cita.doctor_id = :terapeutaIdFilter', { terapeutaIdFilter: terapeutaId });
  }

  if (pacienteId) {
    queryTerapeutas.andWhere('cita.paciente_id = :pacienteIdFilter', { pacienteIdFilter: pacienteId });
  }

  const sesionesPorTerapeuta = await queryTerapeutas
    .groupBy('tc.id')
    .addGroupBy('tc.nombres')
    .addGroupBy('tc.apellidos')
    .orderBy('total_sesiones', 'DESC')
    .getRawMany();

  // Sesiones por paciente
  const queryPacientes = this.citaRepo
    .createQueryBuilder('cita')
    .select('p.id', 'paciente_id')
    .addSelect('p.nombres', 'paciente_nombres')
    .addSelect('p.apellido_paterno', 'paciente_apellido_paterno')
    .addSelect('p.apellido_materno', 'paciente_apellido_materno')
    .addSelect('COUNT(cita.id)', 'total_sesiones')
    .addSelect('tc.nombres', 'terapeuta_principal_nombres')
    .addSelect('tc.apellidos', 'terapeuta_principal_apellidos')
    .innerJoin('cita.paciente', 'p')
    .innerJoin('cita.doctor', 'tc')
    .where('cita.fecha >= :fechaDesde', { fechaDesde })
    .andWhere('cita.fecha <= :fechaHasta', { fechaHasta })
    .andWhere('cita.flg_activo = 1')
    .andWhere('cita.motivo_id != 7');

  if (terapeutaId) {
    queryPacientes.andWhere('cita.doctor_id = :terapeutaId', { terapeutaId });
  }

  if (pacienteId) {
    queryPacientes.andWhere('cita.paciente_id = :pacienteIdFilter', { pacienteIdFilter: pacienteId });
  }

  const sesionesPorPaciente = await queryPacientes
    .groupBy('p.id')
    .addGroupBy('p.nombres')
    .addGroupBy('p.apellido_paterno')
    .addGroupBy('p.apellido_materno')
    .addGroupBy('tc.nombres')
    .addGroupBy('tc.apellidos')
    .orderBy('total_sesiones', 'DESC')
    .limit(20)
    .getRawMany();

  // Sesiones por servicio
  const queryServicios = this.citaRepo
    .createQueryBuilder('cita')
    .select('s.id', 'servicio_id')
    .addSelect('s.nombre', 'servicio_nombre')
    .addSelect('COUNT(cita.id)', 'total_sesiones')
    .innerJoin('cita.servicio', 's')
    .where('cita.fecha >= :fechaDesde', { fechaDesde })
    .andWhere('cita.fecha <= :fechaHasta', { fechaHasta })
    .andWhere('cita.flg_activo = 1')
    .andWhere('cita.motivo_id != 7');

  if (terapeutaId) {
    queryServicios.andWhere('cita.doctor_id = :terapeutaId', { terapeutaId });
  }

  if (pacienteId) {
    queryServicios.andWhere('cita.paciente_id = :pacienteId', { pacienteId });
  }

  const sesionesPorServicio = await queryServicios
    .groupBy('s.id')
    .addGroupBy('s.nombre')
    .orderBy('total_sesiones', 'DESC')
    .getRawMany();

  // Calcular totales únicos
  const totalTerapeutas = sesionesPorTerapeuta.length;
  const queryTotalPacientes = this.citaRepo
    .createQueryBuilder('cita')
    .select('COUNT(DISTINCT cita.paciente_id)', 'total')
    .where('cita.fecha >= :fechaDesde', { fechaDesde })
    .andWhere('cita.fecha <= :fechaHasta', { fechaHasta })
    .andWhere('cita.flg_activo = 1')
    .andWhere('cita.motivo_id != 7');

  if (terapeutaId) {
    queryTotalPacientes.andWhere('cita.doctor_id = :terapeutaId', { terapeutaId });
  }

  if (pacienteId) {
    queryTotalPacientes.andWhere('cita.paciente_id = :pacienteId', { pacienteId });
  }

  const totalPacientes = await queryTotalPacientes.getRawOne();

  // Calcular promedio por día
  const diasRango = Math.ceil((new Date(fechaHasta).getTime() - new Date(fechaDesde).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const promedioPorDia = totalSesiones > 0 ? (totalSesiones / diasRango).toFixed(1) : '0';

  return {
    resumen: {
      total_sesiones: totalSesiones,
      total_terapeutas: totalTerapeutas,
      total_pacientes: parseInt(totalPacientes.total) || 0,
      promedio_por_dia: promedioPorDia,
      rango_fechas: {
        desde: fechaDesde,
        hasta: fechaHasta,
        dias: diasRango
      }
    },
    sesiones_por_terapeuta: sesionesPorTerapeuta.map(t => ({
      id: t.terapeuta_id,
      nombre: `${t.terapeuta_nombres} ${t.terapeuta_apellidos}`,
      total_sesiones: parseInt(t.total_sesiones),
      total_pacientes: parseInt(t.total_pacientes),
      porcentaje: totalSesiones > 0 ? ((parseInt(t.total_sesiones) / totalSesiones) * 100).toFixed(1) : '0'
    })),
    sesiones_por_paciente: sesionesPorPaciente.map(p => ({
      id: p.paciente_id,
      nombre: `${p.paciente_nombres} ${p.paciente_apellido_paterno} ${p.paciente_apellido_materno || ''}`.trim(),
      total_sesiones: parseInt(p.total_sesiones),
      terapeuta_principal: `${p.terapeuta_principal_nombres} ${p.terapeuta_principal_apellidos}`
    })),
    sesiones_por_servicio: sesionesPorServicio.map(s => ({
      id: s.servicio_id,
      nombre: s.servicio_nombre,
      total_sesiones: parseInt(s.total_sesiones),
      porcentaje: totalSesiones > 0 ? ((parseInt(s.total_sesiones) / totalSesiones) * 100).toFixed(1) : '0'
    }))
  };
}

/**
 * BUSCA AUTOMÁTICAMENTE el paquete/sesión activa del paciente
 * Devuelve el primer paquete con sesiones disponibles (más reciente)
 */
  async obtenerPaqueteActivoPaciente(pacienteId: number, servicioId?: number, motivoCitaId?: number): Promise<any> {
    try {
      const query = `
        SELECT
          vsd.id,
          vsd.venta_id,
          st.servicio_id,
          s.nombre as servicio_nombre,
          st.motivo_cita_id,
          mc.nombre as motivo_cita_nombre,
          vsd.tipo_venta_id,
          tvs.nombre as tipo_venta_nombre,
          vsd.paquete_id,
          p.nombre as paquete_nombre,
          vsd.sesiones_totales,
          vsd.sesiones_usadas,
          (vsd.sesiones_totales - vsd.sesiones_usadas) as sesiones_disponibles,
          vsd.precio_unitario,
          vsd.subtotal,
          vs.fecha_venta,
          vs.codigo_comprobante,
          tc.nombre as tipo_comprobante_nombre
        FROM venta_servicio_detalle vsd
        INNER JOIN venta_servicio vs ON vs.id = vsd.venta_id
        INNER JOIN servicio_tarifa st ON st.id = vsd.servicio_tarifa_id
        INNER JOIN servicios s ON s.id = st.servicio_id
        INNER JOIN motivo_cita mc ON mc.id = st.motivo_cita_id
        INNER JOIN tipo_venta_servicio tvs ON tvs.id = vsd.tipo_venta_id
        INNER JOIN tipo_comprobante tc ON tc.id = vs.tipo_comprobante_id
        LEFT JOIN paquetes p ON p.id = vsd.paquete_id
        WHERE vsd.paciente_id = ?
          AND vsd.sesiones_usadas < vsd.sesiones_totales
          ${servicioId ? 'AND st.servicio_id = ?' : ''}
          ${motivoCitaId ? 'AND st.motivo_cita_id = ?' : ''}
        ORDER BY vs.fecha_venta DESC, vsd.id DESC
      `;

      const params = [pacienteId];
      if (servicioId) params.push(servicioId);
      if (motivoCitaId) params.push(motivoCitaId);

      const sesiones = await this.citaRepo.query(query, params);

      console.log(`📦 Sesiones disponibles para paciente ${pacienteId}:`, sesiones.length);

      return sesiones.map(s => ({
        id: s.id,
        venta_id: s.venta_id,
        servicio_id: s.servicio_id,
        servicio_nombre: s.servicio_nombre,
        motivo_cita_id: s.motivo_cita_id,
        motivo_cita_nombre: s.motivo_cita_nombre,
        tipo_venta_id: s.tipo_venta_id,
        tipo_venta_nombre: s.tipo_venta_nombre,
        paquete_id: s.paquete_id,
        paquete_nombre: s.paquete_nombre,
        sesiones_totales: parseInt(s.sesiones_totales),
        sesiones_usadas: parseInt(s.sesiones_usadas),
        sesiones_disponibles: parseInt(s.sesiones_disponibles),
        precio_unitario: parseFloat(s.precio_unitario),
        subtotal: parseFloat(s.subtotal),
        fecha_venta: s.fecha_venta,
        codigo_comprobante: s.codigo_comprobante,
        tipo_comprobante_nombre: s.tipo_comprobante_nombre,
        // Descripción para mostrar en el modal
        descripcion: `${s.servicio_nombre} - ${s.motivo_cita_nombre}${s.paquete_nombre ? ` (${s.paquete_nombre})` : ''} | ${s.sesiones_disponibles}/${s.sesiones_totales} disponibles | ${s.codigo_comprobante || 'Sin código'}`
      }));
    } catch (error) {
      console.error('❌ Error al obtener sesiones disponibles:', error);
      throw error;
    }
  }

  async obtenerListadoCitasPorPaciente(pacienteId: number) {
    try {
      console.log(`📋 Obteniendo listado detallado de citas para paciente ${pacienteId}`);

      // 🔥 1. CITAS REALES
      const queryCitas = `
        SELECT
          c.id,
          c.fecha,
          c.hora_inicio,
          c.servicio_id,
          s.nombre as servicio_nombre,
          c.venta_servicio_detalle_id,
          vsd.paquete_combo_id,
          vsd.venta_id,
          COALESCE(pc.nombre, vsd.descripcion_linea, 'Sesión individual') as paquete_nombre,
          CONCAT(t.nombres, ' ', t.apellidos) as especialista,
          mc.nombre as motivo_nombre,
          c.motivo_id,
          vs.fecha_venta as fecha_pago,
          vs.codigo_comprobante,
          sa.terapeuta_estado_id,
          sa.recepcion_estado_id,
          CASE
            WHEN sa.terapeuta_estado_id = 7 AND sa.recepcion_estado_id = 7 THEN 1
            WHEN sa.terapeuta_estado_id = 6 AND sa.recepcion_estado_id = 6 THEN 0
            ELSE NULL
          END as asistencia
        FROM citas c
        INNER JOIN servicios s ON s.id = c.servicio_id
        LEFT JOIN trabajador_centro t ON t.id = c.doctor_id
        LEFT JOIN motivo_cita mc ON mc.id = c.motivo_id
        LEFT JOIN venta_servicio_detalle vsd ON vsd.id = c.venta_servicio_detalle_id
        LEFT JOIN venta_servicio vs ON vs.id = vsd.venta_id
        LEFT JOIN seguimiento_asistencia sa ON sa.cita_id = c.id
        LEFT JOIN paquete_combo pc ON pc.id = vsd.paquete_combo_id
        WHERE c.paciente_id = ?
          AND c.flg_activo = 1
      `;

      // 🔥 2. TODAS LAS VENTAS
      const queryVentas = `
        SELECT
          vsd.id,
          vsd.venta_id,
          vsd.paquete_combo_id,
          vsd.sesiones_totales,
          vsd.sesiones_usadas,
          COALESCE(pc.nombre, vsd.descripcion_linea, 'Sesión individual') as paquete_nombre,
          st.servicio_id,
          s.nombre as servicio_nombre,
          vs.codigo_comprobante,
          vs.fecha_venta as fecha_pago,
          st.motivo_cita_id,
          mc.nombre as motivo_cita_nombre
        FROM venta_servicio_detalle vsd
        INNER JOIN venta_servicio vs ON vs.id = vsd.venta_id
        LEFT JOIN servicio_tarifa st ON st.id = vsd.servicio_tarifa_id
        LEFT JOIN servicios s ON s.id = st.servicio_id
        LEFT JOIN motivo_cita mc ON mc.id = st.motivo_cita_id
        LEFT JOIN paquete_combo pc ON pc.id = vsd.paquete_combo_id
        WHERE vsd.paciente_id = ?
          AND vsd.tipo_item_venta = 1
          AND vsd.sesiones_totales > 0
      `;

      const [citas, ventas] = await Promise.all([
        this.citaRepo.query(queryCitas, [pacienteId]),
        this.citaRepo.query(queryVentas, [pacienteId]),
      ]);

      // 🔥 ELIMINAR DUPLICADOS (tu lógica original)
      const ventasMap = new Map();
      for (const venta of ventas) {
        let key;
        if (venta.paquete_combo_id) {
          key = `combo_${venta.paquete_combo_id}_s${venta.servicio_id}_m${venta.motivo_cita_id}`;
        } else {
          key = `venta_${venta.id}`;
        }

        const existing = ventasMap.get(key);
        if (!existing || venta.id < existing.id) {
          ventasMap.set(key, venta);
        }
      }

      const ventasFiltradas = Array.from(ventasMap.values());

      const agrupado: Record<string, any> = {};

      // 🔥 PASO 1: CREAR ESTRUCTURA DESDE VENTAS (NO TOCAR)
      for (const venta of ventasFiltradas) {

        const servicioKey = `servicio_${venta.servicio_id || 0}`;

        const paqueteKey = venta.paquete_combo_id
          ? `combo_${venta.paquete_combo_id}_linea_${venta.id}`
          : `venta_${venta.id}`;

        const sesionesTotales = Number(venta.sesiones_totales) || 0;
        // Crear siempre sesionesTotales slots; PASO 2 reemplaza los que ya tienen cita real.
        // No restar sesiones_usadas aquí porque PASO 2 ya hace ese reemplazo — de lo contrario
        // las citas agendadas se cuentan dos veces y faltan slots.
        const pendientes = sesionesTotales;

        if (!agrupado[servicioKey]) {
          agrupado[servicioKey] = {
            servicio_id: venta.servicio_id,
            servicio_nombre: venta.servicio_nombre || 'Servicio',
            paquetes: {},
          };
        }

        if (!agrupado[servicioKey].paquetes[paqueteKey]) {
          agrupado[servicioKey].paquetes[paqueteKey] = {
            paquete_id: paqueteKey,
            venta_servicio_detalle_id: Number(venta.id),
            paquete_combo_id: venta.paquete_combo_id,
            paquete_nombre: venta.paquete_nombre,
            paquete_combo_nombre: venta.paquete_combo_id ? venta.paquete_nombre : null,
            sesiones_totales: sesionesTotales,
            venta_id: venta.venta_id,
            citas: [],
          };
        }

        // 🔥 CREAR SLOTS
        for (let i = 0; i < pendientes; i++) {
          agrupado[servicioKey].paquetes[paqueteKey].citas.push({
            id: null,
            fecha: null,
            hora: null,
            asistencia: null,
            especialista: 'Por asignar',
            motivo_id: venta.motivo_cita_id,
            motivo_nombre: venta.motivo_cita_nombre || 'Por agendar',
            programada: false,
            venta_id: venta.venta_id,
            comprobante: venta.codigo_comprobante,
            fecha_pago: venta.fecha_pago,
          });
        }
      }

      // 🔥 PASO 2: INSERTAR CITAS CON VENTA (NO TOCAR)
      for (const cita of citas) {

        if (!cita.venta_servicio_detalle_id) continue;

        const servicioKey = `servicio_${cita.servicio_id}`;

        const paqueteKey = cita.paquete_combo_id
          ? `combo_${cita.paquete_combo_id}_linea_${cita.venta_servicio_detalle_id}`
          : `venta_${cita.venta_servicio_detalle_id}`;

        if (!agrupado[servicioKey]) continue;
        const paquete = agrupado[servicioKey].paquetes[paqueteKey];
        if (!paquete) continue;

        const index = paquete.citas.findIndex(c =>
          c.programada === false &&
          (c.motivo_id === cita.motivo_id || !c.motivo_id)
        );

        const citaReal = {
          id: cita.id,
          fecha: cita.fecha,
          hora: cita.hora_inicio,
          asistencia: cita.asistencia,
          especialista: cita.especialista || 'No asignado',
          motivo_id: cita.motivo_id,
          terapeuta_estado_id: cita.terapeuta_estado_id,
          recepcion_estado_id: cita.recepcion_estado_id,
          motivo_nombre: cita.motivo_nombre,
          programada: true,
          venta_id: cita.venta_id,
          comprobante: cita.codigo_comprobante,
          fecha_pago: cita.fecha_pago,
        };

        if (index !== -1) {
          paquete.citas[index] = citaReal;
        } else {
          paquete.citas.push(citaReal);
        }
      }

      // 🔥 PASO 3: CITAS SIN VENTA (NUEVO 🔥)
      for (const cita of citas) {

        if (cita.venta_servicio_detalle_id) continue;

        const servicioKey = `servicio_${cita.servicio_id}`;

        if (!agrupado[servicioKey]) {
          agrupado[servicioKey] = {
            servicio_id: cita.servicio_id,
            servicio_nombre: cita.servicio_nombre || 'Servicio',
            paquetes: {},
          };
        }

        const paqueteKey = `virtual_${cita.id}`;

        if (!agrupado[servicioKey].paquetes[paqueteKey]) {
          agrupado[servicioKey].paquetes[paqueteKey] = {
            paquete_id: paqueteKey,
            paquete_combo_id: null,
            paquete_nombre: 'Cita individual',
            sesiones_totales: 1,
            venta_id: null,
            citas: [],
          };
        }

        agrupado[servicioKey].paquetes[paqueteKey].citas.push({
          id: cita.id,
          fecha: cita.fecha,
          hora: cita.hora_inicio,
          asistencia: cita.asistencia,
          especialista: cita.especialista || 'No asignado',
          motivo_id: cita.motivo_id,
          motivo_nombre: cita.motivo_nombre,
          programada: true,
          terapeuta_estado_id: cita.terapeuta_estado_id,
          recepcion_estado_id: cita.recepcion_estado_id,
          venta_id: null,
          comprobante: null,
          fecha_pago: null,
        });
      }

      // 🔥 ORDENAR
      Object.values(agrupado).forEach((servicio: any) => {
        Object.values(servicio.paquetes).forEach((paq: any) => {
          paq.citas.sort((a: any, b: any) => {
            if (a.programada === false) return 1;
            if (b.programada === false) return -1;
            return new Date(a.fecha || 0).getTime() - new Date(b.fecha || 0).getTime();
          });
        });
      });

      // 🔥 FORMATO FINAL
      const servicios = Object.values(agrupado).map((s: any) => ({
        ...s,
        paquetes: Object.values(s.paquetes),
      }));

      return { servicios };

    } catch (error) {
      console.error(error);
      throw error;
    }
  }
// 📊 OBTENER RESUMEN DE TERAPIAS POR PACIENTE
async obtenerResumenTerapiasPorPaciente(pacienteId: number) {
  try {
    console.log(`📊 Obteniendo resumen de terapias para paciente ${pacienteId}`);

    const query = `
      SELECT
        s.id as servicio_id,
        s.nombre as servicio_nombre,
        COUNT(DISTINCT c.id) as total_citas,
        SUM(CASE
          WHEN sa.terapeuta_estado_id = 7 AND sa.recepcion_estado_id = 7 THEN 1
          ELSE 0
        END) as asistencias,
        SUM(CASE
          WHEN sa.terapeuta_estado_id = 6 AND sa.recepcion_estado_id = 6 THEN 1
          ELSE 0
        END) as faltas
      FROM citas c
      INNER JOIN servicios s ON s.id = c.servicio_id
      LEFT JOIN seguimiento_asistencia sa ON sa.cita_id = c.id
      WHERE c.paciente_id = ?
        AND c.flg_activo = 1
      GROUP BY s.id, s.nombre
      ORDER BY s.nombre ASC
    `;

    const resultados = await this.citaRepo.query(query, [pacienteId]);

    // Calcular totales
    const totales = resultados.reduce((acc, row) => ({
      total_citas: acc.total_citas + parseInt(row.total_citas || 0),
      asistencias: acc.asistencias + parseInt(row.asistencias || 0),
      faltas: acc.faltas + parseInt(row.faltas || 0)
    }), { total_citas: 0, asistencias: 0, faltas: 0 });

    return {
      servicios: resultados.map(row => ({
        servicio_id: parseInt(row.servicio_id),
        servicio_nombre: row.servicio_nombre,
        total_citas: parseInt(row.total_citas || 0),
        asistencias: parseInt(row.asistencias || 0),
        faltas: parseInt(row.faltas || 0)
      })),
      totales
    };
  } catch (error) {
    console.error('❌ Error al obtener resumen de terapias:', error);
    throw error;
  }
}


async obtenerInfoVentaDeCita(citaId: number): Promise<any> {
  // 1. Obtener la cita actual para saber su venta_servicio_detalle_id y paciente_id
  const cita = await this.citaRepo.findOne({
    where: { id: citaId, flg_activo: 1 }
  });

  if (!cita || !cita.venta_servicio_detalle_id) return null;

  // 2. Reutilizar obtenerListadoCitasPorPaciente que ya tienes
  const listado = await this.obtenerListadoCitasPorPaciente(cita.paciente_id);

  // 3. Buscar el paquete que corresponde a esta cita usando venta_servicio_detalle_id
  let paqueteInfo = null;
  for (const servicio of listado.servicios) {
    const paquetes = servicio.paquetes as any[];
    const encontrado = paquetes.find(
      p => Number(p.venta_servicio_detalle_id) === Number(cita.venta_servicio_detalle_id)
    );
    if (encontrado) {
      paqueteInfo = encontrado;
      break;
    }
  }

  if (!paqueteInfo) return null;

  // 4. Solo citas realmente agendadas (descartar slots vacíos sin fecha ni id)
  const citasProgramadas = (paqueteInfo.citas as any[]).filter(c => c.programada === true && c.id !== null);

  if (citasProgramadas.length === 0) return null;

  // Ordenar por fecha y hora ASC
  const citasOrdenadas = [...citasProgramadas].sort((a, b) => {
    return new Date(`${a.fecha}T${a.hora}`).getTime() - new Date(`${b.fecha}T${b.hora}`).getTime();
  });

  const ultimaCita = citasOrdenadas[citasOrdenadas.length - 1];
  const penultimaCita = citasOrdenadas.length >= 2
    ? citasOrdenadas[citasOrdenadas.length - 2]
    : null;

  // 5. Obtener sesiones_totales de la venta
  const venta = await this.ventaDetalleRepo.findOne({
    where: { id: cita.venta_servicio_detalle_id }
  });

  const sesionesTotales = venta?.sesiones_totales || paqueteInfo.sesiones_totales || citasProgramadas.length;
  const sesionesRestantes = Math.max(0, sesionesTotales - citasProgramadas.length);
  const todasAgendadas = sesionesRestantes === 0;

  // Última sesión: solo cuando YA se agendaron TODAS las sesiones del paquete y ésta es la última cronológicamente
  const esUltimaCita = todasAgendadas && ultimaCita?.id === citaId;
  // Penúltima: falta exactamente 1 sesión por agendar y ésta es la última agendada hasta ahora
  const esPenultimaCita = !todasAgendadas && sesionesRestantes === 1 && ultimaCita?.id === citaId;

  return {
    sesiones_totales: sesionesTotales,
    total_citas_agendadas: citasProgramadas.length,
    sesiones_restantes: sesionesRestantes,
    es_ultima_cita: esUltimaCita,
    es_penultima_cita: esPenultimaCita,
    id_ultima_cita: ultimaCita?.id,
  };
}


}