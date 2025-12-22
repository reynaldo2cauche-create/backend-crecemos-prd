import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
  ) {}

  /**
   * Determinar el tipo de cita según el motivo_id
   */
  private async determinarTipoCita(motivo_id: number): Promise<string> {
    const motivo = await this.motivoRepo.findOne({
      where: { id: motivo_id },
      relations: ['tipoCita'],
    });

    if (!motivo || !motivo.tipoCita) {
      throw new BadRequestException('Motivo de cita no válido');
    }

    return motivo.tipoCita.codigo; // 'NORMAL', 'REUNION_CLINICA', 'VISITA_ESCOLAR'
  }

  /**
   * Crear cita (detecta automáticamente el tipo y guarda en la tabla correcta)
   */
  async crear(dto: CrearCitaDto): Promise<any> {
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

  /**
   * Crear CITA NORMAL
   */
  private async crearCitaNormal(dto: CrearCitaDto): Promise<Cita> {
    if (!dto.doctor_id || !dto.servicio_id) {
      throw new BadRequestException('Se requiere doctor_id y servicio_id para cita normal');
    }

    const cita = this.citaRepo.create({
      paciente_id: dto.paciente_id,
      doctor_id: dto.doctor_id,
      servicio_id: dto.servicio_id,
      motivo_id: dto.motivo_id,
      estado_id: dto.estado_id,
      fecha: dto.fecha,
      hora_inicio: dto.hora_inicio,
      duracion_minutos: dto.duracion_minutos,
      nota: dto.nota,
      firma_documento: false,
      user_id_crea: dto.user_id_crea,
    });

    const guardada = await this.citaRepo.save(cita);
    console.log(`✅ Cita normal creada: ID ${guardada.id}`);

    // Crear visita escolar si viene encargado
    if (dto.encargado) {
      await this.visitaEscolarRepo.save({
        id_cita: guardada.id,
        nombre_colegio: dto.encargado.institucion,
        nombre_intermediario: dto.encargado.nombre_completo,
        telefono: dto.encargado.telefono,
        user_id_crea: dto.user_id_crea,
      });
      console.log(`✅ Datos de visita escolar agregados a cita ${guardada.id}`);
    }

    return guardada;
  }

  /**
   * Crear REUNIÓN CLÍNICA
   */
  private async crearReunionClinica(dto: CrearCitaDto): Promise<CitaReunionClinica> {
    if (!dto.terapeutas_ids || dto.terapeutas_ids.length === 0) {
      throw new BadRequestException('Se requiere al menos un terapeuta para reunión clínica');
    }

    if (!dto.servicios_ids || dto.servicios_ids.length === 0) {
      throw new BadRequestException('Se requiere al menos un servicio para reunión clínica');
    }

    // Crear la reunión
    const reunion = this.reunionRepo.create({
      paciente_id: dto.paciente_id,
      motivo_id: dto.motivo_id,
      estado_cita_id: dto.estado_id,
      fecha: dto.fecha,
      hora_inicio: dto.hora_inicio,
      duracion_minutos: dto.duracion_minutos,
      nota: dto.nota,
      firma_documento: false,
      user_id_crea: dto.user_id_crea,
    });

    const reunionGuardada = await this.reunionRepo.save(reunion);
    console.log(`✅ Reunión clínica creada: ID ${reunionGuardada.id}`);

    // Agregar terapeutas
    for (const terapeuta_id of dto.terapeutas_ids) {
      await this.reunionTerapeutasRepo.save({
        reunion_id: reunionGuardada.id,
        terapeuta_id,
        es_coordinador: false,
        user_id_crea: dto.user_id_crea,
      });
    }
    console.log(`✅ ${dto.terapeutas_ids.length} terapeutas agregados`);

    // Agregar servicios
    for (const servicio_id of dto.servicios_ids) {
      await this.reunionServiciosRepo.save({
        reunion_id: reunionGuardada.id,
        servicio_id,
        user_id_crea: dto.user_id_crea,
      });
    }
    console.log(`✅ ${dto.servicios_ids.length} servicios agregados`);

    return reunionGuardada;
  }

  /**
   * Crear VISITA ESCOLAR
   */
  private async crearVisitaEscolar(dto: CrearCitaDto): Promise<Cita> {
    if (!dto.doctor_id) {
      throw new BadRequestException('Se requiere doctor_id para visita escolar');
    }

    if (!dto.encargado || !dto.encargado.institucion || !dto.encargado.nombre_completo) {
      throw new BadRequestException('Se requieren datos del encargado para visita escolar');
    }

    // Crear cita normal base
    const cita = this.citaRepo.create({
      paciente_id: dto.paciente_id,
      doctor_id: dto.doctor_id,
      servicio_id: dto.servicio_id || null,
      motivo_id: dto.motivo_id,
      estado_id: dto.estado_id,
      fecha: dto.fecha,
      hora_inicio: dto.hora_inicio,
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

    return citaGuardada;
  }

  /**
   * Listar todas las citas (unifica las 3 tablas)
   */
  async listar(filtros: any = {}): Promise<any[]> {
    const citasNormales = await this.citaRepo.find({
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
      order: { fecha: 'ASC', hora_inicio: 'ASC' },
    });

    const reuniones = await this.reunionRepo.find({
      relations: ['paciente', 'motivo', 'estado', 'terapeutas', 'terapeutas.terapeuta', 'servicios', 'servicios.servicio'],
      order: { fecha: 'ASC', hora_inicio: 'ASC' },
    });

    // Formatear y unificar
    const citasFormateadas = citasNormales.map(c => ({
      ...c,
      tipo_cita: 'NORMAL',
      tipo_cita_id: 1,
    }));

    const reunionesFormateadas = reuniones.map(r => ({
      ...r,
      tipo_cita: 'REUNION_CLINICA',
      tipo_cita_id: 2,
    }));

    return [...citasFormateadas, ...reunionesFormateadas].sort((a, b) => {
      const fechaA = new Date(`${a.fecha} ${a.hora_inicio}`);
      const fechaB = new Date(`${b.fecha} ${b.hora_inicio}`);
      return fechaA.getTime() - fechaB.getTime();
    });
  }

  /**
   * Obtener una cita por ID (busca en todas las tablas)
   */
  async obtenerPorId(id: number, tipo?: string): Promise<any> {
    // Buscar en citas normales
    const citaNormal = await this.citaRepo.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
    });

    if (citaNormal) {
      return { ...citaNormal, tipo_cita: 'NORMAL' };
    }

    // Buscar en reuniones
    const reunion = await this.reunionRepo.findOne({
      where: { id },
      relations: ['paciente', 'motivo', 'estado', 'terapeutas', 'servicios'],
    });

    if (reunion) {
      return { ...reunion, tipo_cita: 'REUNION_CLINICA' };
    }

    throw new NotFoundException(`Cita con ID ${id} no encontrada`);
  }

  /**
   * Eliminar cita
   */
  async eliminar(id: number): Promise<{ mensaje: string }> {
    // Intentar eliminar de citas normales
    const resultadoCita = await this.citaRepo.delete(id);
    if (resultadoCita.affected > 0) {
      console.log(`✅ Cita normal ${id} eliminada`);
      return { mensaje: 'Cita eliminada correctamente' };
    }

    // Intentar eliminar de reuniones
    const resultadoReunion = await this.reunionRepo.delete(id);
    if (resultadoReunion.affected > 0) {
      console.log(`✅ Reunión clínica ${id} eliminada`);
      return { mensaje: 'Reunión clínica eliminada correctamente' };
    }

    throw new NotFoundException(`Cita con ID ${id} no encontrada`);
  }

  /**
   * Obtener catálogo de motivos de cita
   */
  async getMotivosCita(): Promise<MotivoCita[]> {
    return this.motivoRepo.find({
      where: { activo: true },
      relations: ['tipoCita'],
      order: { nombre: 'ASC' },
    });
  }

  /**
   * Obtener catálogo de estados de cita
   */
  async getEstadosCita(): Promise<EstadoCita[]> {
    return this.estadoRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  /**
   * Obtener catálogo de tipos de cita
   */
  async getTiposCita(): Promise<TipoCita[]> {
    return this.tipoRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }
}
