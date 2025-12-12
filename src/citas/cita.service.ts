import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cita } from './cita.entity';
import { CitaReunionClinica } from './cita-reunion-clinica.entity';
import { CitaReunionClinicaTerapeutas } from './cita-reunion-clinica-terapeutas.entity';
import { CitaReunionClinicaServicios } from './cita-reunion-clinica-servicios.entity';
import { VisitaEscolar } from './visita-escolar.entity';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';

@Injectable()
export class CitaService {
  constructor(
    @InjectRepository(Cita)
    private citaRepository: Repository<Cita>,
    @InjectRepository(CitaReunionClinica)
    private reunionRepository: Repository<CitaReunionClinica>,
    @InjectRepository(CitaReunionClinicaTerapeutas)
    private reunionTerapeutasRepository: Repository<CitaReunionClinicaTerapeutas>,
    @InjectRepository(CitaReunionClinicaServicios)
    private reunionServiciosRepository: Repository<CitaReunionClinicaServicios>,
    @InjectRepository(VisitaEscolar)
    private visitaRepository: Repository<VisitaEscolar>,
  ) {}

  async create(createCitaDto: CreateCitaDto | CreateCitaDto[]): Promise<any> {
    if (Array.isArray(createCitaDto)) {
      return this.createMultiple(createCitaDto);
    }
    return this.createSingle(createCitaDto);
  }

  private async createSingle(dto: CreateCitaDto): Promise<any> {
    const horaInicio = new Date(`2000-01-01T${dto.hora_inicio}`);
    const horaFin = new Date(horaInicio.getTime() + dto.duracion_minutos * 60000);
    const horaFinString = horaFin.toTimeString().slice(0, 8);

    // Validar según tipo de cita
    if (dto.tipo_cita_id === 1) {
      if (!dto.doctor_id || !dto.servicio_id) {
        throw new BadRequestException('Cita normal requiere doctor_id y servicio_id');
      }
      await this.validarDisponibilidadTerapeuta(dto.doctor_id, dto.fecha, dto.hora_inicio, horaFinString);
    } else if (dto.tipo_cita_id === 2) {
      if (!dto.terapeutas_ids?.length || !dto.servicios_ids?.length) {
        throw new BadRequestException('Reunión clínica requiere terapeutas_ids y servicios_ids');
      }
    } else if (dto.tipo_cita_id === 3) {
      if (!dto.encargado?.nombre_completo || !dto.encargado?.institucion || !dto.encargado?.telefono) {
        throw new BadRequestException('Visita escolar requiere datos completos del encargado');
      }
    }

    // Crear cita base
    const cita = this.citaRepository.create({
      tipo_cita_id: dto.tipo_cita_id,
      paciente_id: dto.paciente_id,
      doctor_id: dto.doctor_id || null,
      servicio_id: dto.servicio_id || null,
      motivo_id: dto.motivo_id,
      estado_id: dto.estado_id,
      fecha: dto.fecha,
      hora_inicio: dto.hora_inicio,
      hora_fin: horaFinString,
      duracion_minutos: dto.duracion_minutos,
      nota: dto.nota,
      firma_documento: dto.tipo_cita_id === 3 ? (dto.firma_documento || 0) : 0,
      user_id_crea: dto.user_id
    });

    const citaGuardada = await this.citaRepository.save(cita);

    // Crear entidades adicionales según tipo
    if (dto.tipo_cita_id === 2) {
      await this.crearReunionClinica(citaGuardada.id, dto);
    } else if (dto.tipo_cita_id === 3) {
      await this.crearVisitaEscolar(citaGuardada.id, dto);
    }

    return this.findOne(citaGuardada.id);
  }

  private async crearReunionClinica(citaId: number, dto: CreateCitaDto): Promise<void> {
    const reunion = this.reunionRepository.create({
      id_cita: citaId,
      id_estado: dto.estado_id,
      user_id_crea: dto.user_id
    });
    const reunionGuardada = await this.reunionRepository.save(reunion);

    if (dto.terapeutas_ids?.length) {
      const terapeutas = dto.terapeutas_ids.map(id => 
        this.reunionTerapeutasRepository.create({
          id_reunion: reunionGuardada.id,
          id_terapeuta: id,
          user_id_crea: dto.user_id
        })
      );
      await this.reunionTerapeutasRepository.save(terapeutas);
    }

    if (dto.servicios_ids?.length) {
      const servicios = dto.servicios_ids.map(id =>
        this.reunionServiciosRepository.create({
          id_reunion: reunionGuardada.id,
          id_servicio: id,
          user_id_crea: dto.user_id
        })
      );
      await this.reunionServiciosRepository.save(servicios);
    }
  }

  private async crearVisitaEscolar(citaId: number, dto: CreateCitaDto): Promise<void> {
    const visita = this.visitaRepository.create({
      id_cita: citaId,
      nombre_colegio: dto.encargado.institucion,
      nombre_intermediario: dto.encargado.nombre_completo,
      telefono: dto.encargado.telefono,
      observaciones: dto.nota,
      user_id_crea: dto.user_id
    });
    await this.visitaRepository.save(visita);
  }

  private async createMultiple(citasDto: CreateCitaDto[]): Promise<any> {
    const citasCreadas = [];
    const errores = [];

    for (let i = 0; i < citasDto.length; i++) {
      const citaDto = citasDto[i];
      try {
        const horaInicio = new Date(`2000-01-01T${citaDto.hora_inicio}`);
        const horaFin = new Date(horaInicio.getTime() + citaDto.duracion_minutos * 60000);
        const horaFinString = horaFin.toTimeString().slice(0, 8);

        if (citaDto.tipo_cita_id === 1 && citaDto.doctor_id) {
          await this.validarDisponibilidadTerapeuta(
            citaDto.doctor_id,
            citaDto.fecha,
            citaDto.hora_inicio,
            horaFinString
          );
        }
      } catch (error) {
        errores.push({
          index: i,
          fecha: citaDto.fecha,
          hora_inicio: citaDto.hora_inicio,
          error: error.message
        });
      }
    }

    if (errores.length > 0) {
      throw new ConflictException({
        message: 'Conflictos encontrados',
        errores
      });
    }

    for (const citaDto of citasDto) {
      const citaCreada = await this.createSingle(citaDto);
      citasCreadas.push(citaCreada);
    }

    return {
      message: 'Citas creadas exitosamente',
      total: citasCreadas.length,
      citas: citasCreadas
    };
  }

  async findAll(terapeutaId?: number): Promise<any[]> {
    const queryBuilder = this.citaRepository.createQueryBuilder('cita')
      .leftJoinAndSelect('cita.paciente', 'paciente')
      .leftJoinAndSelect('cita.doctor', 'doctor')
      .leftJoinAndSelect('cita.servicio', 'servicio')
      .leftJoinAndSelect('cita.motivo', 'motivo')
      .leftJoinAndSelect('cita.estado', 'estado')
      .leftJoinAndSelect('cita.tipo_cita', 'tipo_cita')
      .orderBy('cita.fecha', 'ASC')
      .addOrderBy('cita.hora_inicio', 'ASC');

    if (terapeutaId) {
      queryBuilder.where('cita.doctor_id = :terapeutaId', { terapeutaId });
    }

    const citas = await queryBuilder.getMany();
    
    const citasFormateadas = await Promise.all(
      citas.map(async (cita) => {
        const citaBase = this.formatearCitaRespuesta(cita);

        if (cita.tipo_cita_id === 2) {
          const reunion = await this.reunionRepository.findOne({
            where: { id_cita: cita.id },
            relations: ['terapeutas', 'terapeutas.terapeuta', 'servicios', 'servicios.servicio']
          });
          if (reunion) {
            citaBase.terapeutas = reunion.terapeutas.map(t => ({
              id: t.terapeuta.id,
              nombre: `${t.terapeuta.nombres} ${t.terapeuta.apellidos}`.trim()
            }));
            citaBase.servicios = reunion.servicios.map(s => ({
              id: s.servicio.id,
              nombre: s.servicio.nombre
            }));
          }
        } else if (cita.tipo_cita_id === 3) {
          const visita = await this.visitaRepository.findOne({
            where: { id_cita: cita.id }
          });
          if (visita) {
            citaBase.visita = {
              colegio: visita.nombre_colegio,
              encargado: visita.nombre_intermediario,
              telefono: visita.telefono
            };
          }
        }

        return citaBase;
      })
    );

    return citasFormateadas;
  }

  async findOne(id: number): Promise<any> {
    const cita = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'motivo', 'estado', 'tipo_cita']
    });

    if (!cita) {
      return null;
    }

    const citaBase = this.formatearCitaRespuesta(cita);

    if (cita.tipo_cita_id === 2) {
      const reunion = await this.reunionRepository.findOne({
        where: { id_cita: cita.id },
        relations: ['terapeutas', 'terapeutas.terapeuta', 'servicios', 'servicios.servicio']
      });
      if (reunion) {
        citaBase.terapeutas = reunion.terapeutas.map(t => ({
          id: t.terapeuta.id,
          nombre: `${t.terapeuta.nombres} ${t.terapeuta.apellidos}`.trim()
        }));
        citaBase.servicios = reunion.servicios.map(s => ({
          id: s.servicio.id,
          nombre: s.servicio.nombre
        }));
      }
    } else if (cita.tipo_cita_id === 3) {
      const visita = await this.visitaRepository.findOne({
        where: { id_cita: cita.id }
      });
      if (visita) {
        citaBase.visita = {
          colegio: visita.nombre_colegio,
          encargado: visita.nombre_intermediario,
          telefono: visita.telefono
        };
      }
    }

    return citaBase;
  }

  async update(id: number, updateDto: UpdateCitaDto, userId?: number): Promise<any> {
    const citaAnterior = await this.citaRepository.findOne({
      where: { id },
      relations: ['tipo_cita']
    });

    if (!citaAnterior) {
      throw new BadRequestException('Cita no encontrada');
    }

    let horaFinCalculada = citaAnterior.hora_fin;
    if (updateDto.duracion_minutos || updateDto.hora_inicio) {
      const horaInicio = updateDto.hora_inicio || citaAnterior.hora_inicio;
      const duracion = updateDto.duracion_minutos || citaAnterior.duracion_minutos;
      const horaInicioDate = new Date(`2000-01-01T${horaInicio}`);
      const horaFinDate = new Date(horaInicioDate.getTime() + duracion * 60000);
      horaFinCalculada = horaFinDate.toTimeString().slice(0, 8);
    }

    const cambiaHorario =
      (updateDto.doctor_id && updateDto.doctor_id !== citaAnterior.doctor_id) ||
      (updateDto.fecha && updateDto.fecha !== citaAnterior.fecha) ||
      (updateDto.hora_inicio && updateDto.hora_inicio !== citaAnterior.hora_inicio) ||
      (updateDto.duracion_minutos && updateDto.duracion_minutos !== citaAnterior.duracion_minutos);

    if (cambiaHorario && updateDto.doctor_id && citaAnterior.tipo_cita_id === 1) {
      await this.validarDisponibilidadTerapeuta(
        updateDto.doctor_id,
        updateDto.fecha || citaAnterior.fecha,
        updateDto.hora_inicio || citaAnterior.hora_inicio,
        horaFinCalculada,
        id
      );
    }

    const datosActualizacion: any = {
      user_id_actua: userId,
      fecha_actua: new Date()
    };

    if (updateDto.tipo_cita_id !== undefined) datosActualizacion.tipo_cita_id = updateDto.tipo_cita_id;
    if (updateDto.paciente_id !== undefined) datosActualizacion.paciente_id = updateDto.paciente_id;
    if (updateDto.doctor_id !== undefined) datosActualizacion.doctor_id = updateDto.doctor_id;
    if (updateDto.servicio_id !== undefined) datosActualizacion.servicio_id = updateDto.servicio_id;
    if (updateDto.motivo_id !== undefined) datosActualizacion.motivo_id = updateDto.motivo_id;
    if (updateDto.estado_id !== undefined) datosActualizacion.estado_id = updateDto.estado_id;
    if (updateDto.fecha !== undefined) datosActualizacion.fecha = updateDto.fecha;
    if (updateDto.hora_inicio !== undefined) datosActualizacion.hora_inicio = updateDto.hora_inicio;
    if (horaFinCalculada !== citaAnterior.hora_fin) datosActualizacion.hora_fin = horaFinCalculada;
    if (updateDto.duracion_minutos !== undefined) datosActualizacion.duracion_minutos = updateDto.duracion_minutos;
    if (updateDto.nota !== undefined) datosActualizacion.nota = updateDto.nota;
    if (updateDto.firma_documento !== undefined) datosActualizacion.firma_documento = updateDto.firma_documento;

    await this.citaRepository.update(id, datosActualizacion);

    if (citaAnterior.tipo_cita_id === 2 && updateDto.terapeutas_ids) {
      const reunion = await this.reunionRepository.findOne({
        where: { id_cita: id }
      });
      if (reunion) {
        await this.reunionTerapeutasRepository.delete({ id_reunion: reunion.id });
        const terapeutas = updateDto.terapeutas_ids.map(tId =>
          this.reunionTerapeutasRepository.create({
            id_reunion: reunion.id,
            id_terapeuta: tId,
            user_id_crea: userId
          })
        );
        await this.reunionTerapeutasRepository.save(terapeutas);
      }
    }

    if (citaAnterior.tipo_cita_id === 2 && updateDto.servicios_ids) {
      const reunion = await this.reunionRepository.findOne({
        where: { id_cita: id }
      });
      if (reunion) {
        await this.reunionServiciosRepository.delete({ id_reunion: reunion.id });
        const servicios = updateDto.servicios_ids.map(sId =>
          this.reunionServiciosRepository.create({
            id_reunion: reunion.id,
            id_servicio: sId,
            user_id_crea: userId
          })
        );
        await this.reunionServiciosRepository.save(servicios);
      }
    }

    if (citaAnterior.tipo_cita_id === 3 && updateDto.encargado) {
      await this.visitaRepository.update(
        { id_cita: id },
        {
          nombre_colegio: updateDto.encargado.institucion,
          nombre_intermediario: updateDto.encargado.nombre_completo,
          telefono: updateDto.encargado.telefono,
          user_id_actua: userId,
          fecha_actua: new Date()
        }
      );
    }

    return this.findOne(id);
  }

  async remove(id: number, userId?: number): Promise<any> {
    const cita = await this.citaRepository.findOne({
      where: { id },
      relations: ['paciente', 'doctor', 'servicio', 'tipo_cita']
    });

    if (!cita) {
      throw new BadRequestException(`Cita con ID ${id} no encontrada`);
    }

    if (cita.tipo_cita_id === 2) {
      const reunion = await this.reunionRepository.findOne({
        where: { id_cita: id }
      });
      if (reunion) {
        await this.reunionTerapeutasRepository.delete({ id_reunion: reunion.id });
        await this.reunionServiciosRepository.delete({ id_reunion: reunion.id });
        await this.reunionRepository.delete(reunion.id);
      }
    } else if (cita.tipo_cita_id === 3) {
      await this.visitaRepository.delete({ id_cita: id });
    }

    await this.citaRepository.delete(id);

    return {
      success: true,
      message: 'Cita eliminada exitosamente',
      cita_eliminada: {
        id: cita.id,
        paciente_nombre: `${cita.paciente.nombres} ${cita.paciente.apellido_paterno} ${cita.paciente.apellido_materno}`.trim(),
        fecha: cita.fecha,
        hora_inicio: cita.hora_inicio
      }
    };
  }

  private async validarDisponibilidadTerapeuta(
    doctorId: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    citaIdExcluir?: number
  ): Promise<void> {
    const queryBuilder = this.citaRepository.createQueryBuilder('cita')
      .leftJoinAndSelect('cita.paciente', 'paciente')
      .where('cita.doctor_id = :doctorId', { doctorId })
      .andWhere('cita.fecha = :fecha', { fecha });

    if (citaIdExcluir) {
      queryBuilder.andWhere('cita.id != :citaIdExcluir', { citaIdExcluir });
    }

    const citasExistentes = await queryBuilder.getMany();

    for (const citaExistente of citasExistentes) {
      if (this.hayConflictoHorario(horaInicio, horaFin, citaExistente.hora_inicio, citaExistente.hora_fin)) {
        throw new ConflictException(
          `El terapeuta ya tiene una cita de ${citaExistente.hora_inicio} a ${citaExistente.hora_fin} ` +
          `con ${citaExistente.paciente.nombres} ${citaExistente.paciente.apellido_paterno}`
        );
      }
    }
  }

  private hayConflictoHorario(inicio1: string, fin1: string, inicio2: string, fin2: string): boolean {
    const convertir = (tiempo: string): number => {
      const [h, m, s] = tiempo.split(':').map(Number);
      return h * 60 + m + (s || 0) / 60;
    };

    const inicio1Min = convertir(inicio1);
    const fin1Min = convertir(fin1);
    const inicio2Min = convertir(inicio2);
    const fin2Min = convertir(fin2);

    return inicio1Min < fin2Min && fin1Min > inicio2Min;
  }

  private formatearCitaRespuesta(cita: Cita): any {
    return {
      id: cita.id,
      tipo_cita_id: cita.tipo_cita?.id,
      tipo_cita_nombre: cita.tipo_cita?.nombre,
      paciente_id: cita.paciente?.id,
      paciente_nombre: cita.paciente
        ? `${cita.paciente.nombres} ${cita.paciente.apellido_paterno} ${cita.paciente.apellido_materno}`.trim()
        : null,
      doctor_id: cita.doctor?.id,
      doctor_nombre: cita.doctor
        ? `${cita.doctor.nombres} ${cita.doctor.apellidos}`.trim()
        : null,
      servicio_id: cita.servicio?.id,
      servicio_nombre: cita.servicio?.nombre,
      motivo_id: cita.motivo?.id,
      motivo_nombre: cita.motivo?.nombre,
      estado_id: cita.estado?.id,
      estado_nombre: cita.estado?.nombre,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      duracion_minutos: cita.duracion_minutos,
      nota: cita.nota,
      firma_documento: cita.firma_documento,
      created_at: cita.created_at,
      updated_at: cita.updated_at
    };
  }
}