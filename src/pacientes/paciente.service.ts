import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Paciente } from './paciente.entity';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import axios from 'axios';
import { EstadoPaciente } from './estado-paciente.entity';
import { PacienteServicio } from './paciente-servicio.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { ParejaPacienteService } from './services/pareja-paciente.service';
import { requierePareja } from '../constants/servicios.constants';
import { CreatePacienteCompletoDto } from './dto/create-paciente-completo.dto';
import { UpdateEstadoPacienteDto } from './dto/update-estado-paciente.dto';

@Injectable()
export class PacienteService {
  // private readonly RECAPTCHA_SECRET_KEY = '6LdAwDErAAAAALQO3h8PbXQUmQbihEheROCTlmrC';
  private readonly RECAPTCHA_SECRET_KEY = '6Lck2jErAAAAAMYHs4pWwWGggJhgJ5_SrRlE4GrW';

  constructor(
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    @InjectRepository(EstadoPaciente)
    private estadoPacienteRepository: Repository<EstadoPaciente>,
    @InjectRepository(PacienteServicio)
    private pacienteServicioRepository: Repository<PacienteServicio>,
    @InjectRepository(Servicios)
    private serviciosRepository: Repository<Servicios>,
    private parejaPacienteService: ParejaPacienteService,
  ) {}

  private async verifyRecaptcha(token: string): Promise<boolean> {
    try {
      const response = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: this.RECAPTCHA_SECRET_KEY,
            response: token,
          },
        },
      );
      console.log('response', response.data);
      return response.data.success;
    } catch (error) {
      console.error('Error verificando reCAPTCHA:', error);
      return false;
    }
  }

  async create(dto: CreatePacienteDto): Promise<{ paciente: Paciente; pareja?: any }> {    
    // Verificar reCAPTCHA
    console.log('dto.recaptchaToken', dto.recaptchaToken);
    // const isValidRecaptcha = await this.verifyRecaptcha(dto.recaptchaToken);
    // if (!isValidRecaptcha) {
    //   throw new UnauthorizedException('reCAPTCHA inválido');
    // }

    let estadoPaciente: EstadoPaciente;
    if (dto.estado_paciente_id) {
      estadoPaciente = await this.estadoPacienteRepository.findOne({ where: { id: dto.estado_paciente_id } });
    } else {
      estadoPaciente = await this.estadoPacienteRepository.findOne({ where: { nombre: 'Nuevo' } });
    }

    const paciente = this.pacienteRepository.create({
      ...dto,
      tipo_documento: { id: dto.tipo_documento_id },
      sexo: { id: dto.sexo_id },
      distrito: { id: dto.distrito_id },
      servicio: dto.servicio_id ? { id: dto.servicio_id } : null,
      responsable_tipo_documento: dto.responsable_tipo_documento_id ? { id: dto.responsable_tipo_documento_id } : null,
      responsable_relacion: dto.responsable_relacion_id ? { id: dto.responsable_relacion_id } : null,
      estado: estadoPaciente,
      user_id_crea: dto.user_id,
    });
    const savedPaciente = await this.pacienteRepository.save(paciente);

    // Crear paciente_servicio si se envía servicio_id
    if (dto.servicio_id) {
      const servicio = await this.serviciosRepository.findOne({ where: { id: dto.servicio_id } });
      if (servicio) {
        const pacienteServicio = this.pacienteServicioRepository.create({
          paciente: savedPaciente,
          servicio: servicio,
          fecha_inicio: new Date(),
          estado: 'ACTIVO',
          motivo_consulta: dto.motivo_consulta,
          observaciones: '',
          activo: true,
        });
        await this.pacienteServicioRepository.save(pacienteServicio);
      }
    }

    // ✅ Verificar si el servicio requiere pareja (Terapia de Pareja = ID 8)
    let pareja = null;
    if (dto.servicio_id && requierePareja(dto.servicio_id) && dto.pareja) {
      pareja = await this.parejaPacienteService.create(savedPaciente.id, dto.pareja);
    }

    return {
      paciente: savedPaciente,
      pareja: pareja
    };
  }

  async findAll(filters?: {
    terapeutaId?: number;
    numeroDocumento?: string;
    nombre?: string;
    distritoId?: number;
    estadoId?: number;
    servicioId?: number;
  }): Promise<Paciente[]> {
    const queryBuilder = this.pacienteRepository
      .createQueryBuilder('paciente')
      .leftJoinAndSelect('paciente.tipo_documento', 'tipo_documento')
      .leftJoinAndSelect('paciente.sexo', 'sexo')
      .leftJoinAndSelect('paciente.distrito', 'distrito')
      .leftJoinAndSelect('paciente.responsable_relacion', 'responsable_relacion')
      .leftJoinAndSelect('paciente.responsable_tipo_documento', 'responsable_tipo_documento')
      .leftJoinAndSelect('paciente.estado', 'estado')
      .where('paciente.activo = :activo', { activo: true })
      .andWhere('paciente.mostrar_en_listado = :mostrarEnListado', { mostrarEnListado: true });

    // Hacer join con paciente_servicio activo solo para obtener el servicio actual
    // pero no filtrar por esto para que aparezcan todos los pacientes
    queryBuilder
      .leftJoin('paciente.pacienteServicios', 'pacienteServicioGeneral', 'pacienteServicioGeneral.activo = :pacienteServicioActivo', { 
        pacienteServicioActivo: true 
      })
      .leftJoinAndSelect('pacienteServicioGeneral.servicio', 'servicio')
      .addSelect('paciente.id', 'paciente_id')
      .addSelect('servicio.id', 'servicio_id')
      .addSelect('servicio.nombre', 'servicio_nombre');

    // Filtro por terapeuta
    if (filters?.terapeutaId) {
      queryBuilder
        .leftJoin('paciente.pacienteServicios', 'pacienteServicioTerapeuta')
        .leftJoin('pacienteServicioTerapeuta.asignaciones', 'asignacionTerapeuta')
        .andWhere('asignacionTerapeuta.terapeuta.id = :terapeutaId', { terapeutaId: filters.terapeutaId })
        .andWhere('asignacionTerapeuta.estado = :estadoAsignacion', { estadoAsignacion: 'ACTIVO' })
        .andWhere('asignacionTerapeuta.activo = :activoAsignacion', { activoAsignacion: true });
    }

    // Filtro por número de documento
    if (filters?.numeroDocumento) {
      queryBuilder.andWhere('paciente.numero_documento LIKE :numeroDocumento', { 
        numeroDocumento: `%${filters.numeroDocumento}%` 
      });
    }

    // Filtro por nombre del paciente (nombres, apellido paterno y materno)
    if (filters?.nombre) {
      console.log('Aplicando filtro por nombre:', filters.nombre);
      queryBuilder.andWhere(
        '(paciente.nombres LIKE :nombre OR paciente.apellido_paterno LIKE :nombre OR paciente.apellido_materno LIKE :nombre)',
        { nombre: `%${filters.nombre}%` }
      );
      console.log('Filtro por nombre aplicado');
    }

    // Filtro por distrito
    if (filters?.distritoId) {
      queryBuilder.andWhere('paciente.distrito.id = :distritoId', { 
        distritoId: filters.distritoId 
      });
    }

    // Filtro por estado
    if (filters?.estadoId) {
      queryBuilder.andWhere('paciente.estado.id = :estadoId', { 
        estadoId: filters.estadoId 
      });
    }

    // Filtro por servicio asignado
    if (filters?.servicioId) {
      console.log('Aplicando filtro por servicioId:', filters.servicioId);
      queryBuilder.andWhere('pacienteServicioGeneral.servicio.id = :servicioId', { 
        servicioId: filters.servicioId 
      });
      console.log('Filtro por servicio aplicado');
    }

    queryBuilder.orderBy('paciente.created_at', 'DESC');

    // Log de la consulta SQL para debug
    console.log('Query SQL generada:', queryBuilder.getSql());
    console.log('Parámetros:', queryBuilder.getParameters());
    console.log('Filtros aplicados:', filters);

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    // Construir un índice por paciente_id a su primer servicio activo (si existe)
    const pacienteIdToServicioRaw: Record<number, { servicio_id?: number; servicio_nombre?: string }> = {};
    for (const r of raw) {
      const pid = Number(r['paciente_id']);
      if (!pacienteIdToServicioRaw[pid] && r['servicio_id']) {
        pacienteIdToServicioRaw[pid] = {
          servicio_id: Number(r['servicio_id']),
          servicio_nombre: r['servicio_nombre'] as string,
        };
      }
    }

    const resultados = entities.map((paciente) => {
      const srv = pacienteIdToServicioRaw[paciente.id];
      (paciente as any).servicio = srv
        ? { id: srv.servicio_id, nombre: srv.servicio_nombre }
        : null;
      return paciente;
    });

    return resultados;
  }

  async findAllIncludingInactive(filters?: {
    terapeutaId?: number;
    numeroDocumento?: string;
    nombre?: string;
    distritoId?: number;
    estadoId?: number;
    servicioId?: number;
    activo?: boolean; // Nuevo filtro opcional
  }): Promise<Paciente[]> {
    const queryBuilder = this.pacienteRepository
      .createQueryBuilder('paciente')
       .select([
        'paciente',  // Esto selecciona TODOS los campos de paciente
      ])
      .leftJoinAndSelect('paciente.tipo_documento', 'tipo_documento')
      .leftJoinAndSelect('paciente.sexo', 'sexo')
      .leftJoinAndSelect('paciente.distrito', 'distrito')
      .leftJoinAndSelect('paciente.responsable_relacion', 'responsable_relacion')
      .leftJoinAndSelect('paciente.responsable_tipo_documento', 'responsable_tipo_documento')
      .leftJoinAndSelect('paciente.estado', 'estado');

    // SIN filtro de activo por defecto - muestra todos
    // Solo filtrar si se especifica explícitamente
    if (filters?.activo !== undefined) {
      queryBuilder.where('paciente.activo = :activo', { activo: filters.activo });
    }

    // Hacer join con paciente_servicio activo solo para obtener el servicio actual
    queryBuilder
      .leftJoin('paciente.pacienteServicios', 'pacienteServicioGeneral', 'pacienteServicioGeneral.activo = :pacienteServicioActivo', { 
        pacienteServicioActivo: true 
      })
      .leftJoinAndSelect('pacienteServicioGeneral.servicio', 'servicio')
      .addSelect('paciente.id', 'paciente_id')
      .addSelect('servicio.id', 'servicio_id')
      .addSelect('servicio.nombre', 'servicio_nombre');

    // Filtro por terapeuta
    if (filters?.terapeutaId) {
      queryBuilder
        .leftJoin('paciente.pacienteServicios', 'pacienteServicioTerapeuta')
        .leftJoin('pacienteServicioTerapeuta.asignaciones', 'asignacionTerapeuta')
        .andWhere('asignacionTerapeuta.terapeuta.id = :terapeutaId', { terapeutaId: filters.terapeutaId })
        .andWhere('asignacionTerapeuta.estado = :estadoAsignacion', { estadoAsignacion: 'ACTIVO' })
        .andWhere('asignacionTerapeuta.activo = :activoAsignacion', { activoAsignacion: true });
    }

    // Filtro por número de documento
    if (filters?.numeroDocumento) {
      queryBuilder.andWhere('paciente.numero_documento LIKE :numeroDocumento', { 
        numeroDocumento: `%${filters.numeroDocumento}%` 
      });
    }

    // Filtro por nombre del paciente
    if (filters?.nombre) {
      console.log('Aplicando filtro por nombre:', filters.nombre);
      queryBuilder.andWhere(
        '(paciente.nombres LIKE :nombre OR paciente.apellido_paterno LIKE :nombre OR paciente.apellido_materno LIKE :nombre)',
        { nombre: `%${filters.nombre}%` }
      );
     
    }

    // Filtro por distrito
    if (filters?.distritoId) {
      queryBuilder.andWhere('paciente.distrito.id = :distritoId', { 
        distritoId: filters.distritoId 
      });
    }

    // Filtro por estado
    if (filters?.estadoId) {
      queryBuilder.andWhere('paciente.estado.id = :estadoId', { 
        estadoId: filters.estadoId 
      });
    }

    // Filtro por servicio asignado
    if (filters?.servicioId) {
      console.log('Aplicando filtro por servicioId:', filters.servicioId);
      queryBuilder.andWhere('pacienteServicioGeneral.servicio.id = :servicioId', { 
        servicioId: filters.servicioId 
      });
     
    }

    queryBuilder.orderBy('paciente.created_at', 'DESC');

    

    const { entities, raw } = await queryBuilder.getRawAndEntities();

    // Construir un índice por paciente_id a su primer servicio activo (si existe)
    const pacienteIdToServicioRaw: Record<number, { servicio_id?: number; servicio_nombre?: string }> = {};
    for (const r of raw) {
      const pid = Number(r['paciente_id']);
      if (!pacienteIdToServicioRaw[pid] && r['servicio_id']) {
        pacienteIdToServicioRaw[pid] = {
          servicio_id: Number(r['servicio_id']),
          servicio_nombre: r['servicio_nombre'] as string,
        };
      }
    }

    
    const resultados = entities.map((paciente) => {
    
      const srv = pacienteIdToServicioRaw[paciente.id];
      (paciente as any).servicio = srv
        ? { id: srv.servicio_id, nombre: srv.servicio_nombre }
        : null;
      return paciente;
    });

    return resultados;
  }
  

  async update(id: number, dto: UpdatePacienteDto): Promise<Paciente> {
    console.log('Update - ID:', id);
    console.log('Update - DTO:', dto);
    
    const paciente = await this.pacienteRepository.findOne({
      where: { id, activo: true },
      relations: [
        'tipo_documento',
        'sexo',
        'distrito',
        'servicio',
        'responsable_relacion',
        'responsable_tipo_documento'
      ]
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${id} no encontrado`);
    }

    // Crear objeto de actualización solo con los campos que se envían
    const updateData: any = {
      user_id_actua: dto.user_id,
      fecha_actua: new Date()
    };

    // Solo agregar campos si se envían en el DTO
    if (dto.nombres !== undefined) updateData.nombres = dto.nombres;
    if (dto.apellido_paterno !== undefined) updateData.apellido_paterno = dto.apellido_paterno;
    if (dto.apellido_materno !== undefined) updateData.apellido_materno = dto.apellido_materno;
    if (dto.fecha_nacimiento !== undefined) updateData.fecha_nacimiento = dto.fecha_nacimiento;
    if (dto.numero_documento !== undefined) updateData.numero_documento = dto.numero_documento;
    if (dto.direccion !== undefined) updateData.direccion = dto.direccion;
    if (dto.motivo_consulta !== undefined) updateData.motivo_consulta = dto.motivo_consulta;
    if (dto.referido_por !== undefined) updateData.referido_por = dto.referido_por;
    if (dto.diagnostico_medico !== undefined) updateData.diagnostico_medico = dto.diagnostico_medico;
    if (dto.alergias !== undefined) updateData.alergias = dto.alergias;
    if (dto.medicamentos_actuales !== undefined) updateData.medicamentos_actuales = dto.medicamentos_actuales;
    if (dto.acepta_terminos !== undefined) updateData.acepta_terminos = dto.acepta_terminos;
    if (dto.acepta_info_comercial !== undefined) updateData.acepta_info_comercial = dto.acepta_info_comercial;

    // Relaciones
    if (dto.tipo_documento_id !== undefined) updateData.tipo_documento = { id: dto.tipo_documento_id };
    if (dto.sexo_id !== undefined) updateData.sexo = { id: dto.sexo_id };
    if (dto.distrito_id !== undefined) updateData.distrito = { id: dto.distrito_id };
    if (dto.servicio_id !== undefined) updateData.servicio = { id: dto.servicio_id };
    if (dto.responsable_tipo_documento_id !== undefined) updateData.responsable_tipo_documento = { id: dto.responsable_tipo_documento_id };
    if (dto.responsable_relacion_id !== undefined) updateData.responsable_relacion = { id: dto.responsable_relacion_id };

    // Campos del responsable
    if (dto.responsable_nombre !== undefined) updateData.responsable_nombre = dto.responsable_nombre;
    if (dto.responsable_apellido_paterno !== undefined) updateData.responsable_apellido_paterno = dto.responsable_apellido_paterno;
    if (dto.responsable_apellido_materno !== undefined) updateData.responsable_apellido_materno = dto.responsable_apellido_materno;
    if (dto.responsable_numero_documento !== undefined) updateData.responsable_numero_documento = dto.responsable_numero_documento;
    if (dto.responsable_telefono !== undefined) updateData.responsable_telefono = dto.responsable_telefono;
    if (dto.responsable_email !== undefined) updateData.responsable_email = dto.responsable_email;
    if (dto.celular !== undefined) updateData.celular = dto.celular;
    if (dto.celular2 !== undefined) updateData.celular2 = dto.celular2;
    if (dto.correo !== undefined) updateData.correo = dto.correo;

    console.log('Update - Data a actualizar:', updateData);

    // Actualizar usando update en lugar de save
    await this.pacienteRepository.update(id, updateData);
    
    // Obtener el paciente actualizado con sus relaciones
    const resultado = await this.pacienteRepository.findOne({
      where: { id },
      relations: [
        'tipo_documento',
        'sexo',
        'distrito',
        'servicio',
        'responsable_relacion',
        'responsable_tipo_documento'
      ]
    });
    
    console.log('Update - Resultado:', resultado);
    return resultado;
  }

  async findOneById(id: number): Promise<{ paciente: Paciente; parejas: any[] }> {
    const paciente = await this.pacienteRepository.findOne({
      where: { id, activo: true, mostrar_en_listado: true },
      relations: [
        'tipo_documento',
        'sexo',
        'distrito',
        'servicio',
        'responsable_relacion',
        'responsable_tipo_documento'
      ]
    });
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${id} no encontrado`);
    }

    // Obtener las parejas del paciente
    const parejas = await this.parejaPacienteService.findByPaciente(id);

    return {
      paciente,
      parejas
    };
  }

  async findByDocumento(numeroDocumento: string): Promise<Paciente[]> {
    return this.pacienteRepository.find({
      where: { 
        numero_documento: numeroDocumento,
        activo: true,
        mostrar_en_listado: true
      },
      relations: [
        'tipo_documento',
        'sexo',
        'distrito',
        'servicio',
        'responsable_relacion',
        'responsable_tipo_documento'
      ]
    });
  }

  async checkDocumentoExists(numeroDocumento: string): Promise<{ exists: boolean; paciente?: any }> {
    const paciente = await this.pacienteRepository.findOne({
      where: { 
        numero_documento: numeroDocumento,
        mostrar_en_listado: true
      },
      relations: ['tipo_documento'],
      select: ['id', 'nombres', 'apellido_paterno', 'apellido_materno', 'numero_documento', 'activo', 'mostrar_en_listado']
    });

    if (paciente) {
      return {
        exists: true,
        paciente: {
          id: paciente.id,
          nombres: paciente.nombres,
          apellido_paterno: paciente.apellido_paterno,
          apellido_materno: paciente.apellido_materno,
          numero_documento: paciente.numero_documento,
          activo: paciente.activo,
          tipo_documento: paciente.tipo_documento
        }
      };
    }

    return {
      exists: false
    };
  }

  async createCompleto(dto: CreatePacienteCompletoDto): Promise<{ paciente: Paciente; pareja?: any }> {
    // Verificar reCAPTCHA
    if (dto.metadata.recaptchaToken) {
      const isValidRecaptcha = await this.verifyRecaptcha(dto.metadata.recaptchaToken);
      if (!isValidRecaptcha) {
        throw new UnauthorizedException('reCAPTCHA inválido');
      }
    }

    // Obtener estado por defecto
    const estadoPaciente = await this.estadoPacienteRepository.findOne({ where: { nombre: 'Nuevo' } });

    // Crear el paciente con la nueva estructura
    const paciente = this.pacienteRepository.create({
      // Datos del paciente
      nombres: dto.paciente.nombres,
      apellido_paterno: dto.paciente.apellido_paterno,
      apellido_materno: dto.paciente.apellido_materno,
      fecha_nacimiento: new Date(dto.paciente.fecha_nacimiento),
      tipo_documento: { id: dto.paciente.tipo_documento_id },
      numero_documento: dto.paciente.numero_documento,
      sexo: { id: dto.paciente.sexo_id },
      distrito: { id: dto.paciente.distrito_id },
      direccion: dto.paciente.direccion,
      celular: dto.paciente.celular,
      celular2: dto.paciente.celular2,
      correo: dto.paciente.correo,
      diagnostico_medico: dto.paciente.diagnostico_medico,
      alergias: dto.paciente.alergias,
      medicamentos_actuales: dto.paciente.medicamentos_actuales,

      // Datos del servicio
      servicio: { id: dto.servicio.servicio_id },
      motivo_consulta: dto.servicio.motivo_consulta,
      referido_por: dto.servicio.referido_por,

      // Datos del responsable (si existe)
      responsable_nombre: dto.responsable?.nombre,
      responsable_apellido_paterno: dto.responsable?.apellido_paterno,
      responsable_apellido_materno: dto.responsable?.apellido_materno,
      responsable_tipo_documento: dto.responsable ? { id: dto.responsable.tipo_documento_id } : null,
      responsable_numero_documento: dto.responsable?.numero_documento,
      responsable_relacion: dto.responsable ? { id: dto.responsable.relacion_id } : null,
      responsable_telefono: dto.responsable?.telefono,
      responsable_email: dto.responsable?.email,

      // Consentimientos
      acepta_terminos: dto.consentimientos.acepta_terminos,
      acepta_info_comercial: dto.consentimientos.acepta_info_comercial,

      // Estado y metadata
      estado: estadoPaciente,
      user_id_crea: dto.metadata.user_id,
    });

    const savedPaciente = await this.pacienteRepository.save(paciente);

    // Crear paciente_servicio
    if (dto.servicio.servicio_id) {
      const servicio = await this.serviciosRepository.findOne({ where: { id: dto.servicio.servicio_id } });
      if (servicio) {
        const pacienteServicio = this.pacienteServicioRepository.create({
          paciente: savedPaciente,
          servicio: servicio,
          fecha_inicio: new Date(),
          estado: 'ACTIVO',
          motivo_consulta: dto.servicio.motivo_consulta,
          observaciones: '',
          activo: true,
        });
        await this.pacienteServicioRepository.save(pacienteServicio);
      }
    }

    // ✅ Verificar si el servicio requiere pareja (Terapia de Pareja = ID 8)
    let pareja = null;
    if (dto.servicio.servicio_id && requierePareja(dto.servicio.servicio_id) && dto.pareja) {
      pareja = await this.parejaPacienteService.create(savedPaciente.id, dto.pareja);
    }

    return {
      paciente: savedPaciente,
      pareja: pareja
    };
  }

  async updateEstado(id: number, dto: UpdateEstadoPacienteDto): Promise<Paciente> {
    // Verificar que el paciente existe
    const paciente = await this.pacienteRepository.findOne({
      where: { id, activo: true }
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${id} no encontrado`);
    }

    // Verificar que el estado existe
    const estado = await this.estadoPacienteRepository.findOne({
      where: { id: dto.estado_paciente_id, activo: true }
    });

    if (!estado) {
      throw new NotFoundException(`Estado con ID ${dto.estado_paciente_id} no encontrado`);
    }

    // Actualizar el estado del paciente y los campos de auditoría
    await this.pacienteRepository.update(id, {
      estado: { id: dto.estado_paciente_id },
      user_id_actua: dto.user_id_actua,
      fecha_actua: new Date()
    });

    // Retornar el paciente actualizado con sus relaciones
    return this.pacienteRepository.findOne({
      where: { id },
      relations: [
        'tipo_documento',
        'sexo',
        'distrito',
        'servicio',
        'responsable_relacion',
        'responsable_tipo_documento',
        'estado'
      ]
    });
  }

  /**
   * Controla la visibilidad de un paciente en el listado
   * @param id ID del paciente
   * @param mostrarEnListado true para mostrar, false para ocultar
   * @param userId ID del usuario que realiza la acción
   */
  async controlarVisibilidad(id: number, mostrarEnListado: boolean, userId: number): Promise<Paciente> {
    // Verificar que el paciente existe
    const paciente = await this.pacienteRepository.findOne({
      where: { id, activo: true }
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${id} no encontrado`);
    }

    // Actualizar la visibilidad del paciente
    await this.pacienteRepository.update(id, {
      mostrar_en_listado: mostrarEnListado,
      user_id_actua: userId,
      fecha_actua: new Date()
    });

    // Retornar el paciente actualizado con sus relaciones
    return this.pacienteRepository.findOne({
      where: { id },
      relations: [
        'tipo_documento',
        'sexo',
        'distrito',
        'servicio',
        'responsable_relacion',
        'responsable_tipo_documento',
        'estado'
      ]
    });
  }

  /**
   * Busca pacientes por nombre/apellido para autocompletado
   * @param query Término de búsqueda
   * @returns Array con id, nombres y apellidos
   */ 
  async buscarPacientes(query: string): Promise<{ id: number; nombre_completo: string }[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const pacientes = await this.pacienteRepository
      .createQueryBuilder('paciente')
      .leftJoinAndSelect('paciente.estado', 'estado')
      .select([
        'paciente.id',
        'paciente.nombres',
        'paciente.apellido_paterno',
        'paciente.apellido_materno'
      ])
      .where('paciente.activo = :activo', { activo: true })
      .andWhere('paciente.mostrar_en_listado = :mostrarEnListado', { mostrarEnListado: true })
      .andWhere('estado.id IN (:...estados)', { estados: [1, 2, 3, 4] })
      .andWhere(
        '(paciente.nombres LIKE :query OR paciente.apellido_paterno LIKE :query OR paciente.apellido_materno LIKE :query)',
        { query: `%${query.trim()}%` }
      )
      .orderBy('paciente.nombres', 'ASC')
      .limit(20)
      .getMany();

    return pacientes.map(paciente => ({
      id: paciente.id,
      nombre_completo: `${paciente.nombres} ${paciente.apellido_paterno} ${paciente.apellido_materno}`.trim()
    }));
  }
}