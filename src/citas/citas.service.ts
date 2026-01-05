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

    return guardada;
  }

  private async crearReunionClinica(dto: CrearCitaDto): Promise<any> {
    if (!dto.terapeutas_ids || dto.terapeutas_ids.length === 0) {
      throw new BadRequestException('Se requiere al menos un terapeuta para reunión clínica');
    }

    if (!dto.servicios_ids || dto.servicios_ids.length === 0) {
      throw new BadRequestException('Se requiere al menos un servicio para reunión clínica');
    }

    // Crear cita base
    const cita = this.citaRepo.create({
      paciente_id: dto.paciente_id,
      doctor_id: dto.terapeutas_ids[0],
      servicio_id: dto.servicios_ids[0],
      motivo_id: dto.motivo_id,
      estado_id: dto.estado_id,
      fecha: dto.fecha,
      hora_inicio: dto.hora_inicio,
      duracion_minutos: dto.duracion_minutos,
      nota: dto.nota,
      firma_documento: false,
      user_id_crea: dto.user_id_crea,
    });

    const citaGuardada = await this.citaRepo.save(cita);
    console.log(`✅ Cita base para reunión clínica creada: ID ${citaGuardada.id}`);

    // Crear registro de reunión clínica
    const reunion = this.reunionRepo.create({
      id: citaGuardada.id,
      estado_cita_id: dto.estado_id,
      user_id_crea: dto.user_id_crea,
    });
    await this.reunionRepo.save(reunion);
    console.log(`✅ Registro de reunión clínica creado`);

    // Agregar terapeutas
    for (const terapeuta_id of dto.terapeutas_ids) {
      await this.reunionTerapeutasRepo.save({
        reunion_id: citaGuardada.id,
        terapeuta_id: terapeuta_id,
        user_id_crea: dto.user_id_crea,
      });
    }
    console.log(`✅ ${dto.terapeutas_ids.length} terapeutas agregados`);

    // Agregar servicios
    for (const servicio_id of dto.servicios_ids) {
      await this.reunionServiciosRepo.save({
        reunion_id: citaGuardada.id,
        servicio_id: servicio_id,
        user_id_crea: dto.user_id_crea,
      });
    }
    console.log(`✅ ${dto.servicios_ids.length} servicios agregados`);

    return citaGuardada;
  }

  private async crearVisitaEscolar(dto: CrearCitaDto): Promise<Cita> {
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

  async listar(filtros: any = {}): Promise<any[]> {
    // Obtener todas las citas normales
    const citasNormales = await this.citaRepo.find({
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
      order: { fecha: 'ASC', hora_inicio: 'ASC' },
    });

    // Obtener IDs de reuniones clínicas
    const reunionesIds = await this.reunionRepo.find({
      select: ['id'],
    });

    // Obtener citas que son reuniones clínicas
    const reuniones = await Promise.all(
      reunionesIds.map(async (r) => {
        const cita = await this.citaRepo.findOne({
          where: { id: r.id },
          relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
        });

        const reunion = await this.reunionRepo.findOne({
          where: { id: r.id },
          relations: ['terapeutas', 'terapeutas.terapeuta', 'servicios', 'servicios.servicio'],
        });

        return { ...cita, ...reunion, tipo_cita: 'REUNION_CLINICA' };
      })
    );

    // Obtener IDs de visitas escolares
    const visitasIds = await this.visitaEscolarRepo.find({
      select: ['id_cita'],
    });

    // Obtener citas que son visitas escolares
    const visitas = await Promise.all(
      visitasIds.map(async (v) => {
        const cita = await this.citaRepo.findOne({
          where: { id: v.id_cita },
          relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
        });

        const visita = await this.visitaEscolarRepo.findOne({
          where: { id_cita: v.id_cita },
        });

        return { ...cita, ...visita, tipo_cita: 'VISITA_ESCOLAR' };
      })
    );

    // Filtrar citas normales (excluir las que son reuniones o visitas)
    const idsReuniones = new Set(reunionesIds.map(r => r.id));
    const idsVisitas = new Set(visitasIds.map(v => v.id_cita));
    
    const citasNormalesFiltered = citasNormales
      .filter(c => !idsReuniones.has(c.id) && !idsVisitas.has(c.id))
      .map(c => ({ ...c, tipo_cita: 'NORMAL' }));

    // Unificar y ordenar
    const todasLasCitas = [...citasNormalesFiltered, ...reuniones, ...visitas];
    
    return todasLasCitas.sort((a, b) => {
      const fechaA = new Date(`${a.fecha} ${a.hora_inicio}`);
      const fechaB = new Date(`${b.fecha} ${b.hora_inicio}`);
      return fechaA.getTime() - fechaB.getTime();
    });
  }

  async obtenerPorId(id: number): Promise<any> {
    // Buscar en citas base
    const cita = await this.citaRepo.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado'],
    });

    if (!cita) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    // Verificar si es reunión clínica
    const reunion = await this.reunionRepo.findOne({
      where: { id },
      relations: ['terapeutas', 'terapeutas.terapeuta', 'servicios', 'servicios.servicio'],
    });

    if (reunion) {
      return { ...cita, ...reunion, tipo_cita: 'REUNION_CLINICA' };
    }

    // Verificar si es visita escolar
    const visita = await this.visitaEscolarRepo.findOne({
      where: { id_cita: id },
    });

    if (visita) {
      return { ...cita, ...visita, tipo_cita: 'VISITA_ESCOLAR' };
    }

    return { ...cita, tipo_cita: 'NORMAL' };
  }

  async eliminar(id: number): Promise<{ mensaje: string }> {
    const cita = await this.citaRepo.findOne({ where: { id } });
    
    if (!cita) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    // TypeORM manejará las eliminaciones en cascada automáticamente
    await this.citaRepo.delete(id);
    console.log(`✅ Cita ${id} eliminada`);
    
    return { mensaje: 'Cita eliminada correctamente' };
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
}