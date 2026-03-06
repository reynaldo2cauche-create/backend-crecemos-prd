import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, IsNull, DataSource } from 'typeorm';
import { Sorteo } from './entities/sorteo.entity';
import { SorteoGanador } from './entities/sorteo-ganador.entity';
import { EstadoSorteo } from './entities/estado-sorteo.entity';
import { SorteoParticipante } from './entities/sorteo-participante.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { CrearSorteoDto, RealizarSorteoDto } from './dto/crear-sorteo.dto';
import { CrearSorteoManualDto, AgregarParticipanteDto, AgregarMultiplesParticipantesDto, FinalizarSorteoManualDto } from './dto/sorteo-manual.dto';

@Injectable()
export class SorteoService {
  constructor(
    @InjectRepository(Sorteo)
    private sorteoRepository: Repository<Sorteo>,

    @InjectRepository(SorteoGanador)
    private ganadorRepository: Repository<SorteoGanador>,

    @InjectRepository(EstadoSorteo)
    private estadoSorteoRepository: Repository<EstadoSorteo>,

    @InjectRepository(SorteoParticipante)
    private participanteRepository: Repository<SorteoParticipante>,

    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,

    private dataSource: DataSource,
  ) {}

  async crearSorteo(dto: CrearSorteoDto, userId?: number) {
    const sorteo = this.sorteoRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion || '',
      fechaInicio: new Date(dto.fecha_inicio),
      fechaFin: new Date(dto.fecha_fin),
      fechaSorteo: new Date(dto.fecha_sorteo),
      cantidadGanadores: dto.cantidad_ganadores,
      userCreaId: userId || null,
      userActuaId: userId || null,
    });

    const sorteoGuardado = await this.sorteoRepository.save(sorteo);

    return this.sorteoRepository.findOne({
      where: { id: sorteoGuardado.id },
      relations: ['ganadores', 'ganadores.paciente'],
    });
  }

  async realizarSorteo(dto: RealizarSorteoDto, userId?: number) {
    const sorteo = await this.crearSorteo(dto, userId);

    const pacienteIds = dto.ganadores.map(g => g.paciente_id);
    const pacientes = await this.pacienteRepository.findBy({ id: In(pacienteIds) });

    if (pacientes.length !== pacienteIds.length) {
      throw new BadRequestException('Uno o más pacientes no existen');
    }

    const ganadores = dto.ganadores.map(g =>
      this.ganadorRepository.create({
        sorteoId: sorteo.id,
        pacienteId: g.paciente_id,
        posicion: g.posicion,
      }),
    );

    await this.ganadorRepository.save(ganadores);
    console.log(`🎉 Sorteo realizado por usuario ${userId}: ${ganadores.length} ganadores guardados`);

    return this.sorteoRepository.findOne({
      where: { id: sorteo.id },
      relations: ['ganadores', 'ganadores.paciente'],
    });
  }

  async obtenerHistorial(page = 1, limit = 10) {
    const [sorteos, total] = await this.sorteoRepository.findAndCount({
      relations: ['ganadores', 'userCrea'],
      order: { fechaSorteo: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: sorteos.map(s => ({
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        fecha_inicio: s.fechaInicio,
        fecha_fin: s.fechaFin,
        fecha_sorteo: s.fechaSorteo,
        cantidad_ganadores: s.cantidadGanadores,
        total_ganadores_registrados: s.ganadores?.length || 0,
        registrado_por: s.userCrea ? `${s.userCrea.nombres} ${s.userCrea.apellidos}` : 'Sistema',
        created_at: s.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async obtenerDetalle(id: number) {
    const sorteo = await this.sorteoRepository.findOne({
      where: { id },
      relations: ['ganadores', 'ganadores.paciente', 'userCrea', 'estadoSorteo'],
    });

    if (!sorteo) {
      throw new NotFoundException(`Sorteo con ID ${id} no encontrado`);
    }

    return {
      id: sorteo.id,
      nombre: sorteo.nombre,
      descripcion: sorteo.descripcion,
      fecha_inicio: sorteo.fechaInicio,
      fecha_fin: sorteo.fechaFin,
      fecha_sorteo: sorteo.fechaSorteo,
      cantidad_ganadores: sorteo.cantidadGanadores,
      estado: sorteo.estadoSorteo?.nombre || 'desconocido',
      registrado_por: sorteo.userCrea ? `${sorteo.userCrea.nombres} ${sorteo.userCrea.apellidos}` : 'Sistema',
      created_at: sorteo.createdAt,
      ganadores: sorteo.ganadores
        ?.map(g => ({
          id: g.id,
          posicion: g.posicion,
          paciente_id: g.pacienteId,
          nombres: g.paciente?.nombres,
          apellido_paterno: g.paciente?.apellido_paterno,
          apellido_materno: g.paciente?.apellido_materno,
          numero_documento: g.paciente?.numero_documento,
          celular: g.paciente?.celular,
          correo: g.paciente?.correo,
          created_at: g.createdAt,
        }))
        .sort((a, b) => a.posicion - b.posicion) || [],
    };
  }

  async eliminar(id: number) {
    const sorteo = await this.sorteoRepository.findOne({ where: { id } });
    if (!sorteo) throw new NotFoundException(`Sorteo con ID ${id} no encontrado`);
    await this.sorteoRepository.remove(sorteo);
    return { message: 'Sorteo eliminado exitosamente' };
  }

  // ========== SORTEOS MANUALES ==========

  async crearSorteoManual(dto: CrearSorteoManualDto, userId?: number) {
    const estadoPreparacion = await this.estadoSorteoRepository.findOne({ where: { nombre: 'preparacion' } });
    if (!estadoPreparacion) throw new NotFoundException('Estado "preparacion" no encontrado en la BD');

    const sorteo = this.sorteoRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion || '',
      estadoSorteoId: estadoPreparacion.id,
      userCreaId: userId || null,
      userActuaId: userId || null,
    });

    const sorteoGuardado = await this.sorteoRepository.save(sorteo);
    console.log(`✅ Sorteo MANUAL creado (ID: ${sorteoGuardado.id}) por usuario ${userId}`);
    return sorteoGuardado;
  }

  async agregarParticipante(sorteoId: number, dto: AgregarParticipanteDto) {
    const sorteo = await this.sorteoRepository.findOne({ where: { id: sorteoId }, relations: ['estadoSorteo'] });
    if (!sorteo) throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
    if (sorteo.estadoSorteo?.nombre !== 'preparacion')
      throw new BadRequestException('No se pueden agregar participantes a un sorteo finalizado');

    const paciente = await this.pacienteRepository.findOne({ where: { id: dto.paciente_id } });
    if (!paciente) throw new NotFoundException(`Paciente con ID ${dto.paciente_id} no encontrado`);

    const participante = this.participanteRepository.create({ sorteoId, pacienteId: dto.paciente_id });
    await this.participanteRepository.save(participante);

    const vecesEnSorteo = await this.participanteRepository.count({ where: { sorteoId, pacienteId: dto.paciente_id } });
    console.log(`➕ Participante ${dto.paciente_id} agregado al sorteo ${sorteoId} (${vecesEnSorteo}x)`);

    return { message: 'Participante agregado exitosamente', participante, veces: vecesEnSorteo };
  }

  async agregarMultiplesParticipantes(sorteoId: number, dto: AgregarMultiplesParticipantesDto) {
    const sorteo = await this.sorteoRepository.findOne({ where: { id: sorteoId }, relations: ['estadoSorteo'] });
    if (!sorteo) throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
    if (sorteo.estadoSorteo?.nombre !== 'preparacion')
      throw new BadRequestException('No se pueden agregar participantes a un sorteo finalizado');

    const pacientes = await this.pacienteRepository.findBy({ id: In(dto.pacientes_ids) });
    if (pacientes.length !== dto.pacientes_ids.length)
      throw new BadRequestException('Uno o más pacientes no existen');

    const participantes = dto.pacientes_ids.map(id =>
      this.participanteRepository.create({ sorteoId, pacienteId: id })
    );
    await this.participanteRepository.save(participantes);
    console.log(`➕ ${participantes.length} participantes agregados al sorteo ${sorteoId}`);

    return { message: `${participantes.length} participante(s) agregado(s) exitosamente`, agregados: participantes.length };
  }

  async eliminarParticipante(sorteoId: number, entradaId: number) {
    const sorteo = await this.sorteoRepository.findOne({ where: { id: sorteoId }, relations: ['estadoSorteo'] });
    if (!sorteo) throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
    if (sorteo.estadoSorteo?.nombre !== 'preparacion')
      throw new BadRequestException('No se pueden eliminar participantes de un sorteo finalizado');

    const participante = await this.participanteRepository.findOne({ where: { id: entradaId, sorteoId } });
    if (!participante) throw new NotFoundException('La entrada no fue encontrada en este sorteo');

    await this.participanteRepository.remove(participante);
    console.log(`➖ Entrada ${entradaId} (paciente ${participante.pacienteId}) eliminada del sorteo ${sorteoId}`);
    return { message: 'Entrada eliminada exitosamente' };
  }

  async obtenerParticipantes(sorteoId: number) {
    const sorteo = await this.sorteoRepository.findOne({ where: { id: sorteoId } });
    if (!sorteo) throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);

    const participantes = await this.participanteRepository.find({
      where: { sorteoId },
      relations: ['paciente'],
      order: { fechaRegistro: 'ASC' },
    });

    return participantes.map(p => ({
      id: p.id,
      paciente_id: p.pacienteId,
      nombres: p.paciente?.nombres,
      apellido_paterno: p.paciente?.apellido_paterno,
      apellido_materno: p.paciente?.apellido_materno,
      numero_documento: p.paciente?.numero_documento,
      celular: p.paciente?.celular,
      correo: p.paciente?.correo,
      fecha_registro: p.fechaRegistro,
    }));
  }

  async obtenerSorteosEnPreparacion() {
    const sorteos = await this.sorteoRepository.find({
      relations: ['userCrea', 'estadoSorteo', 'ganadores', 'ganadores.paciente'],
      order: { createdAt: 'DESC' },
      where: [{ estadoSorteoId: Not(IsNull()) }],
    });

    return Promise.all(
      sorteos.map(async (sorteo) => {
        const participantes = await this.participanteRepository.count({ where: { sorteoId: sorteo.id } });
        const ganadores = sorteo.ganadores || [];
        return {
          id: sorteo.id,
          nombre: sorteo.nombre,
          descripcion: sorteo.descripcion,
          cantidad_participantes: participantes,
          cantidad_ganadores: ganadores.length,
          estado: sorteo.estadoSorteo?.nombre || 'desconocido',
          fecha_sorteo: sorteo.fechaSorteo,
          registrado_por: sorteo.userCrea ? `${sorteo.userCrea.nombres} ${sorteo.userCrea.apellidos}` : 'Sistema',
          created_at: sorteo.createdAt,
        };
      })
    );
  }

  async finalizarSorteoManual(sorteoId: number, dto: FinalizarSorteoManualDto, userId?: number) {
    console.log('📥 BACKEND - Recibiendo datos:', { sorteoId, ganadores: dto.ganadores, userId });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sorteo = await queryRunner.manager.findOne(Sorteo, { where: { id: sorteoId }, relations: ['estadoSorteo'] });
      if (!sorteo) throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
      if (sorteo.estadoSorteo?.nombre !== 'preparacion')
        throw new BadRequestException('El sorteo ya ha sido finalizado');

      const pacienteIds = dto.ganadores.map(g => g.paciente_id);
      const participantes = await queryRunner.manager.find(SorteoParticipante, {
        where: { sorteoId, pacienteId: In(pacienteIds) },
      });

      const pacientesUnicos = [...new Set(pacienteIds)];
      const participantesUnicos = [...new Set(participantes.map(p => p.pacienteId))];
      if (!pacientesUnicos.every(id => participantesUnicos.includes(id)))
        throw new BadRequestException('Uno o más ganadores no son participantes del sorteo');

      const ganadoresEntities = dto.ganadores.map(g => {
        const ganador = new SorteoGanador();
        ganador.sorteoId = sorteoId;
        ganador.pacienteId = g.paciente_id;
        ganador.posicion = g.posicion;
        return ganador;
      });

      const ganadoresGuardados = await queryRunner.manager.save(SorteoGanador, ganadoresEntities);

      const estadoFinalizado = await queryRunner.manager.findOne(EstadoSorteo, { where: { nombre: 'finalizado' } });
      if (!estadoFinalizado)
        throw new BadRequestException('Estado "finalizado" no encontrado en la base de datos');

      await queryRunner.manager.update(Sorteo, { id: sorteoId }, {
        estadoSorteoId: estadoFinalizado.id,
        fechaSorteo: new Date(),
        cantidadGanadores: ganadoresGuardados.length,
        userActuaId: userId || sorteo.userActuaId,
      });

      await queryRunner.commitTransaction();
      console.log('✅ TRANSACCIÓN COMPLETADA');
      return this.obtenerDetalle(sorteoId);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ ERROR - Transacción revertida:', error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}