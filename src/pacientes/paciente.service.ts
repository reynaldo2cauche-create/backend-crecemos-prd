import { Injectable, UnauthorizedException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, LessThan, Brackets } from 'typeorm';
import { Paciente } from './paciente.entity';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import axios from 'axios';
import { EstadoPaciente } from './estado-paciente.entity';
import { PacienteServicio } from './paciente-servicio.entity';
import { Servicios } from '../catalogos/servicios.entity';
import { ParejaPacienteService } from './services/pareja-paciente.service';
import { PacienteResponsableService } from './services/paciente-responsable.service';
import { requierePareja } from '../constants/servicios.constants';
import { CreatePacienteCompletoDto } from './dto/create-paciente-completo.dto';
import { UpdateEstadoPacienteDto } from './dto/update-estado-paciente.dto';
import { ConveniosService } from 'src/convenios/convenios.service';
import { tieneAccesoBeneficios } from '../constants/estados-paciente.constants';
import { Cita } from '../citas/entities/cita.entity';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { AuditoriaService } from 'src/auditoria/auditoria.service';

@Injectable()
export class PacienteService {
  private readonly logger = new Logger(PacienteService.name);
  // private readonly RECAPTCHA_SECRET_KEY = '6LdAwDErAAAAALQO3h8PbXQUmQbihEheROCTlmrC';
  private readonly RECAPTCHA_SECRET_KEY = '6Lck2jErAAAAAMYHs4pWwWGggJhgJ5_SrRlE4GrW';

  constructor(
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    private readonly conveniosService: ConveniosService,
    @InjectRepository(EstadoPaciente)
    private estadoPacienteRepository: Repository<EstadoPaciente>,
    @InjectRepository(PacienteServicio)
    private pacienteServicioRepository: Repository<PacienteServicio>,
    @InjectRepository(Servicios)
    private serviciosRepository: Repository<Servicios>,
    @InjectRepository(Cita)
    private citaRepository: Repository<Cita>,
    private parejaPacienteService: ParejaPacienteService,
    private pacienteResponsableService: PacienteResponsableService,
    private readonly notificacionesService: NotificacionesService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Parsea una fecha desde string (YYYY-MM-DD) a Date sin problemas de timezone
   * Evita el desfase de 1 día causado por new Date() con fechas ISO
   * @param fechaString - Fecha en formato YYYY-MM-DD o Date
   * @returns Date con la fecha correcta en UTC medianoche
   */
  private parsearFechaSinTimezone(fechaString: string | Date): Date | string {
    if (!fechaString) return null;

    // Si es string en formato YYYY-MM-DD, devolverlo directamente como string
    // Esto permite que MySQL lo interprete como DATE sin conversión de timezone
    if (typeof fechaString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaString)) {
      return fechaString; // Devolver string puro, no Date
    }

    // Si es string con timestamp, extraer solo la fecha
    if (typeof fechaString === 'string' && fechaString.includes('T')) {
      return fechaString.split('T')[0]; // Devolver string puro YYYY-MM-DD
    }

    // Si ya es Date, convertir a string YYYY-MM-DD
    if (fechaString instanceof Date) {
      const fecha = new Date(fechaString);
      const year = fecha.getUTCFullYear();
      const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fecha.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`; // Devolver string puro
    }

    // Fallback: intentar parsear y convertir a string
    const fecha = new Date(fechaString);
    if (!isNaN(fecha.getTime())) {
      const year = fecha.getUTCFullYear();
      const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fecha.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  }

  /**
 * Verifica que el paciente exista y esté activo
 * Si cumple las condiciones, retorna los beneficios disponibles
 * @param numeroDocumento - Número de documento del paciente
 */
async verificarPacienteYObtenerBeneficios(numeroDocumento: string) {
  // 1. Buscar el paciente por número de documento
  const paciente = await this.pacienteRepository
    .createQueryBuilder('paciente')
    .leftJoinAndSelect('paciente.tipo_documento', 'tipo_documento')
    .leftJoinAndSelect('paciente.sexo', 'sexo')
    .leftJoinAndSelect('paciente.distrito', 'distrito')
    .leftJoinAndSelect('paciente.estado', 'estado')
    .leftJoinAndSelect('paciente.servicio', 'servicio')
    .where('paciente.numero_documento = :numeroDocumento', { numeroDocumento })
    .getOne();

  // 2. Validar que el paciente existe
  if (!paciente) {
    throw new NotFoundException(
      'No se encontró ningún paciente registrado con el número de documento proporcionado.'
    );
  }

  // 3. Validar que el paciente tenga acceso a beneficios según su estado
  const estadoPacienteId = paciente.estado?.id; // Obtener el ID del estado cargado

  console.log('🔍 Verificando paciente:', {
    id: paciente.id,
    nombres: paciente.nombres,
    estado_paciente_id: estadoPacienteId,
    estado_nombre: paciente.estado?.nombre
  });

  // Estados válidos: 1=Nuevo, 2=Entrevista, 3=Evaluación, 4=Terapia
  // Estado inválido: 5=Inactivo
  if (!tieneAccesoBeneficios(estadoPacienteId)) {
    console.log('❌ Paciente INACTIVO (estado_paciente_id=' + estadoPacienteId + ') - Negando acceso a beneficios');
    throw new ForbiddenException(
      'El paciente se encuentra inactivo en el sistema y actualmente no cuenta con acceso a beneficios. Por favor, comuníquese con el área de atención al cliente para más información.'
    );
  }

  console.log('✅ Paciente ACTIVO (estado_paciente_id=' + estadoPacienteId + ') - Permitiendo acceso a beneficios');

  // 5. Si cumple las condiciones, obtener solo los beneficios ACTIVOS
  const beneficios = await this.conveniosService.findAllBeneficios(true);

  return {
    paciente: {
      id: paciente.id,
      nombres: paciente.nombres,
      apellido_paterno: paciente.apellido_paterno,
      apellido_materno: paciente.apellido_materno,
      numero_documento: paciente.numero_documento,
      activo: paciente.activo,
      estado_paciente_id: estadoPacienteId,
      estado_nombre: paciente.estado?.nombre
    },
    total_beneficios: beneficios.length,
    beneficios: beneficios
  };
}

// Función auxiliar para validar acceso a beneficios
tieneAccesoBeneficios(estadoPacienteId: number): boolean {
  // Estados activos: 1 (Nuevo), 2 (Entrevista), 3 (Evaluacion), 4 (Terapia)
  // Estado inactivo: 5 (Inactivo)
  const estadosActivos = [1, 2, 3, 4];
  return estadosActivos.includes(estadoPacienteId);
}
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
      // ❌ YA NO guardar datos del responsable en campos legacy de paciente
      // ✅ Ahora se guardan en tablas responsable y responsable_paciente
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

    // ✅ Crear responsable si viene con datos de responsable (paciente menor de edad)
    if (dto.responsable_nombres && dto.responsable_numero_documento) {
      await this.pacienteResponsableService.agregarResponsable(savedPaciente.id, {
        nombres: dto.responsable_nombres,
        apellido_paterno: dto.responsable_apellido_paterno,
        apellido_materno: dto.responsable_apellido_materno,
        tipo_documento_id: dto.responsable_tipo_documento_id,
        numero_documento: dto.responsable_numero_documento,
        responsable_relacion_id: dto.responsable_relacion_id,
        telefono: dto.responsable_telefono,
        email: dto.responsable_email,
        tiene_proceso_legal: dto.responsable_tiene_proceso_legal || false,
        proceso_legal_infantil_id: dto.responsable_proceso_legal_infantil_id || null,
      });
    }

    return {
      paciente: savedPaciente,
      pareja: pareja
    };
  }

async findAll(filters?: {
  terapeutaId?: number;
  terapeutaIds?: number[];
  numeroDocumento?: string;
  nombre?: string;
  distritoId?: number;
  estadoId?: number;
  servicioId?: number;
  estadoServicioId?: number;
}): Promise<Paciente[]> {
  const queryBuilder = this.pacienteRepository
    .createQueryBuilder('paciente')
    .leftJoinAndSelect('paciente.tipo_documento', 'tipo_documento')
    .leftJoinAndSelect('paciente.sexo', 'sexo')
    .leftJoinAndSelect('paciente.distrito', 'distrito')
    // ❌ YA NO cargar relaciones legacy de responsable
    // ✅ Los responsables ahora se obtienen desde responsable_paciente
    .leftJoinAndSelect('paciente.estado', 'estado')
    .where('paciente.activo = :activo', { activo: true })
    .andWhere('paciente.mostrar_en_listado = :mostrarEnListado', { mostrarEnListado: true });

  // Join con paciente_servicio activo para obtener el servicio actual
  queryBuilder
    .leftJoin('paciente.pacienteServicios', 'pacienteServicioGeneral', 
      'pacienteServicioGeneral.activo = :pacienteServicioActivo', 
      { pacienteServicioActivo: true }
    )
    .leftJoinAndSelect('pacienteServicioGeneral.servicio', 'servicio');

  // ⭐ FILTRO POR TERAPEUTA — soporta un solo ID o array (para jefes con subordinados)
  const idsParaFiltrar: number[] = filters?.terapeutaIds?.length
    ? filters.terapeutaIds
    : filters?.terapeutaId
    ? [filters.terapeutaId]
    : [];

  if (idsParaFiltrar.length > 0) {
    queryBuilder
      .innerJoin('paciente.pacienteServicios', 'ps_terapeuta',
        'ps_terapeuta.activo = :psActivo AND ps_terapeuta.estado = :psEstado',
        { psActivo: true, psEstado: 'ACTIVO' }
      )
      .innerJoin('ps_terapeuta.asignaciones', 'asignacion',
        'asignacion.activo = :asigActivo AND asignacion.estado = :asigEstado',
        { asigActivo: true, asigEstado: 'ACTIVO' }
      )
      .innerJoin('asignacion.terapeuta', 'terapeuta',
        'terapeuta.id IN (:...terapeutaIds)',
        { terapeutaIds: idsParaFiltrar }
      );
  }

  // Filtro por número de documento
  if (filters?.numeroDocumento) {
    queryBuilder.andWhere('paciente.numero_documento LIKE :numeroDocumento', { 
      numeroDocumento: `%${filters.numeroDocumento}%` 
    });
  }

  // Filtro por nombre del paciente (búsqueda inteligente por palabras)
  if (filters?.nombre) {
    const palabras = filters.nombre.trim().split(/\s+/).filter(p => p.length > 0);

    if (palabras.length === 1) {
      // Un solo término: buscar en cualquier campo
      queryBuilder.andWhere(
        '(paciente.nombres LIKE :nombre OR paciente.apellido_paterno LIKE :nombre OR paciente.apellido_materno LIKE :nombre)',
        { nombre: `%${palabras[0]}%` }
      );
    } else {
      // Múltiples términos: cada palabra debe estar en algún campo
      palabras.forEach((palabra, index) => {
        queryBuilder.andWhere(
          new Brackets(qb => {
            qb.where(`paciente.nombres LIKE :palabra${index}`, { [`palabra${index}`]: `%${palabra}%` })
              .orWhere(`paciente.apellido_paterno LIKE :palabra${index}`, { [`palabra${index}`]: `%${palabra}%` })
              .orWhere(`paciente.apellido_materno LIKE :palabra${index}`, { [`palabra${index}`]: `%${palabra}%` });
          })
        );
      });
    }
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
    queryBuilder.andWhere('pacienteServicioGeneral.servicio.id = :servicioId', {
      servicioId: filters.servicioId
    });
  }

  // Filtro por estado de servicio (por servicio específico, no global)
  if (filters?.estadoServicioId) {
    queryBuilder
      .innerJoin('paciente.pacienteServicios', 'ps_estado', 'ps_estado.activo = :psEstActivo', { psEstActivo: true })
      .innerJoin('ps_estado.estadoPaciente', 'ep_estado', 'ep_estado.id = :estadoServicioId', { estadoServicioId: filters.estadoServicioId });
  }

  queryBuilder.orderBy('paciente.created_at', 'DESC');

  const pacientes = await queryBuilder.getMany();

  // Obtener todos los servicios asignados para cada paciente
  const pacientesConServicios = await Promise.all(
    pacientes.map(async (paciente) => {
      const servicios = await this.pacienteServicioRepository
        .createQueryBuilder('ps')
        .leftJoinAndSelect('ps.servicio', 'servicio')
        .leftJoinAndSelect('ps.estadoPaciente', 'estadoPaciente')
        .where('ps.paciente_id = :pacienteId', { pacienteId: paciente.id })
        .andWhere('ps.activo = :activo', { activo: true })
        .getMany();

      (paciente as any).servicios = servicios.map(ps => ({
        id: ps.id,
        servicio_id: ps.servicio.id,
        servicio_nombre: ps.servicio.nombre,
        estado_paciente_id: ps.estadoPaciente?.id ?? null,
        estado_nombre: ps.estadoPaciente?.nombre ?? null,
      }));

      // Mantener compatibilidad con código antiguo que usa .servicio
      const servicioActivo = paciente.pacienteServicios?.find(ps => ps.activo === true);
      (paciente as any).servicio = servicioActivo ? servicioActivo.servicio : null;

      return paciente;
    })
  );

  return pacientesConServicios;
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
    if (dto.fecha_nacimiento !== undefined) updateData.fecha_nacimiento = this.parsearFechaSinTimezone(dto.fecha_nacimiento);
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

    // Retornar datos anteriores y nuevos para auditoría detallada
    return {
      datosAnteriores: paciente,
      datosNuevos: resultado,
      ...resultado  // Spread para mantener compatibilidad con código existente
    } as any;
  }

  async findOneById(id: number): Promise<{ paciente: Paciente; parejas: any[]; responsables: any[] }> {
    const paciente = await this.pacienteRepository.findOne({
      where: { id, activo: true, mostrar_en_listado: true },
      relations: [
        'tipo_documento',
        'sexo',
        'distrito',
        'servicio'
      ]
    });
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${id} no encontrado`);
    }

    // Obtener las parejas del paciente
    const parejas = await this.parejaPacienteService.findByPaciente(id);

    // ✅ Obtener los responsables desde las nuevas tablas
    const responsables = await this.pacienteResponsableService.getResponsablesPorPaciente(id);

    return {
      paciente,
      parejas,
      responsables
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
      // Parsear fecha sin timezone para evitar desfase de 1 día
      fecha_nacimiento: this.parsearFechaSinTimezone(dto.paciente.fecha_nacimiento),
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

      // Datos del responsable único (legacy - mantener compatibilidad)
      // Solo se guarda en las columnas viejas SI no viene el array de responsables
      responsable_nombre: (!dto.responsables && dto.responsable) ? dto.responsable.nombre : null,
      responsable_apellido_paterno: (!dto.responsables && dto.responsable) ? dto.responsable.apellido_paterno : null,
      responsable_apellido_materno: (!dto.responsables && dto.responsable) ? dto.responsable.apellido_materno : null,
      responsable_tipo_documento: (!dto.responsables && dto.responsable) ? { id: dto.responsable.tipo_documento_id } : null,
      responsable_numero_documento: (!dto.responsables && dto.responsable) ? dto.responsable.numero_documento : null,
      responsable_relacion: (!dto.responsables && dto.responsable) ? { id: dto.responsable.relacion_id } : null,
      responsable_telefono: (!dto.responsables && dto.responsable) ? dto.responsable.telefono : null,
      responsable_email: (!dto.responsables && dto.responsable) ? dto.responsable.email : null,

      // Consentimientos
      acepta_terminos: dto.consentimientos.acepta_terminos,
      acepta_info_comercial: dto.consentimientos.acepta_info_comercial,

      // Estado y metadata
      estado: estadoPaciente,
      user_id_crea: dto.metadata.user_id,
    });

    const savedPaciente = await this.pacienteRepository.save(paciente);

    // 🆕 Crear múltiples responsables en la tabla nueva si vienen
    if (dto.responsables && dto.responsables.length > 0) {
      const responsablesParaCrear = dto.responsables.map(resp => {
        // 🆕 Si viene responsable_id, es un responsable existente → NO DUPLICAR
        if (resp.responsable_id) {
          return {
            responsable_id: resp.responsable_id, // Reutilizar responsable existente
            responsable_relacion_id: resp.relacion_id,
            tiene_proceso_legal: resp.tiene_proceso_legal ?? false,
            proceso_legal_infantil_id: resp.proceso_legal_infantil_id ?? null,
          };
        }
        // Si NO viene responsable_id, es un responsable nuevo → CREAR
        return {
          nombres: resp.nombre,
          apellido_paterno: resp.apellido_paterno,
          apellido_materno: resp.apellido_materno,
          tipo_documento_id: resp.tipo_documento_id,
          numero_documento: resp.numero_documento,
          responsable_relacion_id: resp.relacion_id,
          telefono: resp.telefono,
          email: resp.email,
          tiene_proceso_legal: resp.tiene_proceso_legal ?? false,
          proceso_legal_infantil_id: resp.proceso_legal_infantil_id ?? null,
        };
      });

      await this.pacienteResponsableService.agregarMultiplesResponsables(
        savedPaciente.id,
        responsablesParaCrear,
      );
    }

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

    // Actualizar solo el estado, NO el campo activo
    // El campo activo solo debe cambiar cuando se oculta/muestra el paciente
    const updateData: any = {
      estado: { id: dto.estado_paciente_id },
      user_id_actua: dto.user_id_actua,
      fecha_actua: new Date(),
      updated_at: new Date() // Forzar actualización de updated_at
    };

    // Actualizar el estado del paciente y los campos de auditoría
    await this.pacienteRepository.update(id, updateData);

    // 🔔 Crear notificación de cambio manual de estado
    try {
      const nombreCompleto = `${paciente.nombres} ${paciente.apellido_paterno} ${paciente.apellido_materno}`;
      const estadoAnterior = paciente.estado?.nombre || 'Sin estado';
      const estadoNuevo = estado.nombre;

      const evento = await this.notificacionesService['crearEvento']({
        tipo_evento: 'CAMBIO_ESTADO_PACIENTE_MANUAL',
        descripcion: `El estado del paciente ${nombreCompleto} fue cambiado de "${estadoAnterior}" a "${estadoNuevo}"`,
        usuario_id: dto.user_id_actua,
        datos_adicionales: {
          entidad_afectada: 'paciente',
          entidad_id: id,
          estado_anterior: estadoAnterior,
          estado_nuevo: estadoNuevo
        }
      });

      await this.notificacionesService['crearNotificacion']({
        tipo_notificacion: 'CAMBIO_ESTADO_PACIENTE',
        titulo: 'Estado de paciente actualizado',
        mensaje: `El paciente ${nombreCompleto} cambió de estado de "${estadoAnterior}" a "${estadoNuevo}"`,
        evento_id: evento.id,
        roles_destino: [1, 2], // Admin y Admisión
      });

      this.logger.log(`📢 Notificación creada para cambio de estado de paciente ID ${id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error al crear notificación de cambio de estado: ${errorMessage}`);
    }

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
   * Busca pacientes por nombre/apellido/DNI para autocompletado
   * @param query Término de búsqueda
   * @returns Array con id, nombre completo, DNI y celular
   */
  async buscarPacientes(query: string): Promise<{ id: number; nombre_completo: string; numero_documento: string; celular: string }[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    // Dividir la query en palabras individuales y limpiar
    const palabras = query.trim().split(/\s+/).filter(p => p.length > 0);

    const queryBuilder = this.pacienteRepository
      .createQueryBuilder('paciente')
      .select([
        'paciente.id',
        'paciente.nombres',
        'paciente.apellido_paterno',
        'paciente.apellido_materno',
        'paciente.numero_documento',
        'paciente.celular',
      ])
      .leftJoin('paciente.estado', 'estado')
      .where('paciente.mostrar_en_listado = :mostrarEnListado', { mostrarEnListado: true })
      .andWhere('(estado.id IS NULL OR estado.id != :estadoExcluido)', { estadoExcluido: 5 });

    // Si es un solo término, buscar en todos los campos (incluyendo documento)
    if (palabras.length === 1) {
      const termino = palabras[0];
      queryBuilder.andWhere(
        '(paciente.nombres LIKE :query OR paciente.apellido_paterno LIKE :query OR paciente.apellido_materno LIKE :query OR paciente.numero_documento LIKE :query)',
        { query: `%${termino}%` }
      );
    } else {
      // Si son múltiples términos, buscar que TODAS las palabras estén presentes en alguna combinación
      palabras.forEach((palabra, index) => {
        queryBuilder.andWhere(
          new Brackets(qb => {
            qb.where(`paciente.nombres LIKE :palabra${index}`, { [`palabra${index}`]: `%${palabra}%` })
              .orWhere(`paciente.apellido_paterno LIKE :palabra${index}`, { [`palabra${index}`]: `%${palabra}%` })
              .orWhere(`paciente.apellido_materno LIKE :palabra${index}`, { [`palabra${index}`]: `%${palabra}%` });
          })
        );
      });
    }

    const pacientes = await queryBuilder
      .orderBy('paciente.nombres', 'ASC')
      .limit(20)
      .getMany();

    return pacientes.map(paciente => ({
      id: paciente.id,
      nombre_completo: `${paciente.nombres} ${paciente.apellido_paterno} ${paciente.apellido_materno}`.trim(),
      numero_documento: paciente.numero_documento || '',
      celular: paciente.celular || ''
    }));
  }

  /**
   * Obtener estadísticas de pacientes del mes actual
   */
  async getEstadisticasMesActual() {
    const now = new Date(); // Fecha fija para pruebas
    const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1);
    const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Pacientes activos este mes (created_at en el mes actual y activo = true)
    const pacientesActivosMes = await this.pacienteRepository
      .createQueryBuilder('paciente')
      .where('paciente.activo = :activo', { activo: true })
      .andWhere('paciente.created_at >= :inicio', { inicio: primerDiaMes })
      .andWhere('paciente.created_at <= :fin', { fin: ultimoDiaMes })
      .getCount();

    // Pacientes dados de baja este mes (cambiados a estado "Inactivo" en el mes actual)
    // Solo cuenta si el último cambio de estado en el mes fue a "Inactivo"
    const estadoInactivo = await this.estadoPacienteRepository.findOne({
      where: { nombre: 'Inactivo' }
    });

    const pacientesInactivosMes = await this.pacienteRepository
      .createQueryBuilder('paciente')
      .where('paciente.estado_paciente_id = :estadoInactivo', { estadoInactivo: estadoInactivo?.id })
      .andWhere('paciente.fecha_actua >= :inicio', { inicio: primerDiaMes })
      .andWhere('paciente.fecha_actua <= :fin', { fin: ultimoDiaMes })
      .getCount();

    // Estadísticas por estado desde paciente_servicio (suma todos los servicios activos)
    const estadisticasPorEstado = await this.pacienteServicioRepository
      .createQueryBuilder('ps')
      .innerJoin('ps.estadoPaciente', 'ep')
      .innerJoin('ps.paciente', 'paciente')
      .select('ep.id', 'id')
      .addSelect('ep.nombre', 'nombre')
      .addSelect('COUNT(ps.id)', 'total')
      .where('ps.activo = :activo', { activo: true })
      .andWhere('ep.nombre != :inactivo', { inactivo: 'Inactivo' })
      .andWhere('paciente.activo = :pacActivo', { pacActivo: true })
      .andWhere('paciente.mostrar_en_listado = :mostrar', { mostrar: true })
      .groupBy('ep.id')
      .addGroupBy('ep.nombre')
      .getRawMany();

    return {
      pacientesActivosMes,
      pacientesInactivosMes,
      estadisticas: estadisticasPorEstado.map(e => ({
        estadoId: e.id,
        estadoNombre: e.nombre,
        total: parseInt(e.total),
      })),
    };
  }

  /**
   * Actualiza automáticamente el estado de pacientes a "Inactivo" cuando:
   * - Han pasado más de 15 días desde su última cita
   * - No tienen citas futuras programadas
   *
   * Este método debe ser llamado periódicamente (ej: diariamente por un cron job)
   *
   * @returns Objeto con cantidad de pacientes actualizados y sus IDs
   */
async actualizarPacientesInactivos(): Promise<{
  actualizados: number;
  pacientesIds: number[];
  detalles: Array<{ id: number; nombre: string; ultimaCita: string }>;
}> {
  this.logger.log('🔄 Iniciando verificación de pacientes inactivos...');

  const estadoInactivo = await this.estadoPacienteRepository.findOne({ where: { id: 5 } });
  if (!estadoInactivo) {
    this.logger.error('❌ No se encontró el estado "Inactivo" (id=5)');
    throw new NotFoundException('Estado "Inactivo" no encontrado');
  }

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - 15);
  const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
  const hoy = new Date().toISOString().split('T')[0];

  this.logger.log(`📅 Fecha límite: ${fechaLimiteStr} (hace 15 días)`);
  this.logger.log(`📅 Fecha hoy: ${hoy}`);

  const pacientesActivos = await this.pacienteRepository
    .createQueryBuilder('paciente')
    .where('paciente.activo = :activo', { activo: true })
    .andWhere('paciente.mostrar_en_listado = :mostrar', { mostrar: true })
    .andWhere('(paciente.estado_paciente_id != :estadoInactivo OR paciente.estado_paciente_id IS NULL)', { estadoInactivo: 5 })
    .getMany();

  this.logger.log(`👥 Encontrados ${pacientesActivos.length} pacientes activos a verificar`);

  const pacientesParaInactivar: Array<{ id: number; nombre: string; ultimaCita: string }> = [];

  for (const paciente of pacientesActivos) {
    const ultimaCita = await this.citaRepository
      .createQueryBuilder('cita')
      .where('cita.paciente_id = :pacienteId', { pacienteId: paciente.id })
      .andWhere('cita.flg_activo = 1')
      .orderBy('cita.fecha', 'DESC')
      .addOrderBy('cita.hora_inicio', 'DESC')
      .getOne();

    if (!ultimaCita) continue;

    const tieneCitasFuturas = await this.citaRepository
      .createQueryBuilder('cita')
      .where('cita.paciente_id = :pacienteId', { pacienteId: paciente.id })
      .andWhere('cita.flg_activo = 1')
      .andWhere('cita.fecha >= :hoy', { hoy })
      .getCount();

    if (tieneCitasFuturas > 0) continue;

          // DESPUÉS
        const fechaRaw = ultimaCita.fecha as unknown as string | Date;
        const fechaUltimaCitaStr = fechaRaw instanceof Date
          ? fechaRaw.toISOString().split('T')[0]
          : String(fechaRaw).split('T')[0];

        this.logger.log(`🔍 Paciente ${paciente.id} - última cita: "${fechaUltimaCitaStr}" | límite: "${fechaLimiteStr}" | ¿inactivar?: ${fechaUltimaCitaStr <= fechaLimiteStr}`);

        if (fechaUltimaCitaStr <= fechaLimiteStr) {
          pacientesParaInactivar.push({
            id: paciente.id,
            nombre: `${paciente.nombres} ${paciente.apellido_paterno} ${paciente.apellido_materno}`,
            ultimaCita: fechaUltimaCitaStr,
          });
        }
  }

  this.logger.log(`🎯 Pacientes a inactivar: ${pacientesParaInactivar.length}`);

  const pacientesIds: number[] = [];

  for (const pacienteInfo of pacientesParaInactivar) {
    await this.pacienteRepository.update(pacienteInfo.id, {
      estado: { id: 5 },
      fecha_actua: new Date(),
      updated_at: new Date(),
    });

    // 🔔 Crear notificación de cambio automático de estado
    try {
      const evento = await this.notificacionesService['crearEvento']({
        tipo_evento: 'CAMBIO_ESTADO_PACIENTE_AUTOMATICO',
        descripcion: `El paciente ${pacienteInfo.nombre} fue marcado como Inactivo automáticamente por inactividad de más de 15 días`,
        usuario_id: 1, // Sistema
        datos_adicionales: {
          entidad_afectada: 'paciente',
          entidad_id: pacienteInfo.id,
          estado_nuevo: 'Inactivo',
          ultima_cita: pacienteInfo.ultimaCita
        }
      });

      await this.notificacionesService['crearNotificacion']({
        tipo_notificacion: 'CAMBIO_ESTADO_PACIENTE',
        titulo: 'Paciente marcado como Inactivo',
        mensaje: `El paciente ${pacienteInfo.nombre} fue marcado automáticamente como Inactivo por presentar inactividad de más de 15 días. Última cita: ${new Date(pacienteInfo.ultimaCita).toLocaleDateString('es-PE')}`,
        evento_id: evento.id,
        roles_destino: [1, 2], // Admin y Admisión
      });

      this.logger.log(`📢 Notificación creada para paciente ID ${pacienteInfo.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error al crear notificación para paciente ${pacienteInfo.id}: ${errorMessage}`);
    } 

    pacientesIds.push(pacienteInfo.id);
    this.logger.log(`✅ Paciente ID ${pacienteInfo.id} (${pacienteInfo.nombre}) → Inactivo. Última cita: ${pacienteInfo.ultimaCita}`);
  }

  this.logger.log(`✨ Proceso completado. Total actualizados: ${pacientesIds.length}`);

  return {
    actualizados: pacientesIds.length,
    pacientesIds,
    detalles: pacientesParaInactivar,
  };
}

  /**
   * Marca como Inactivo (estado_paciente_id = 5) cada paciente_servicio activo
   * cuyo paciente no tenga citas para ese servicio en los últimos 15 días
   * ni citas futuras programadas para el mismo servicio.
   * Envía notificación al administrador por cada servicio inactivado.
   */
  async actualizarServiciosInactivos(): Promise<{
    actualizados: number;
    detalles: Array<{ pacienteServicioId: number; paciente: string; servicio: string; ultimaCita: string | null }>;
  }> {
    this.logger.log('🔄 Iniciando verificación de servicios inactivos por paciente...');

    const estadoInactivo = await this.estadoPacienteRepository.findOne({ where: { id: 5 } });
    if (!estadoInactivo) {
      this.logger.error('❌ Estado "Inactivo" (id=5) no encontrado');
      return { actualizados: 0, detalles: [] };
    }

    const hoy = new Date().toISOString().split('T')[0];
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 15);
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];

    // Obtener todos los paciente_servicio activos que NO estén ya inactivos
    const serviciosActivos = await this.pacienteServicioRepository.find({
      where: { activo: true },
      relations: ['paciente', 'servicio', 'estadoPaciente'],
    });

    const paraInactivar = serviciosActivos.filter(
      ps => ps.estadoPaciente?.id !== 5 && ps.paciente?.activo && ps.paciente?.mostrar_en_listado,
    );

    this.logger.log(`👥 Servicios activos a verificar: ${paraInactivar.length}`);

    const detalles: Array<{ pacienteServicioId: number; paciente: string; servicio: string; ultimaCita: string | null }> = [];

    for (const ps of paraInactivar) {
      // Última cita pasada para este paciente + servicio
      const ultimaCita = await this.citaRepository
        .createQueryBuilder('cita')
        .where('cita.paciente_id = :pacienteId', { pacienteId: ps.paciente.id })
        .andWhere('cita.servicio_id = :servicioId', { servicioId: ps.servicio.id })
        .andWhere('cita.flg_activo = 1')
        .andWhere('cita.fecha <= :hoy', { hoy })
        .orderBy('cita.fecha', 'DESC')
        .addOrderBy('cita.hora_inicio', 'DESC')
        .getOne();

      // Si tiene citas futuras para este servicio, no inactivar
      const citasFuturas = await this.citaRepository
        .createQueryBuilder('cita')
        .where('cita.paciente_id = :pacienteId', { pacienteId: ps.paciente.id })
        .andWhere('cita.servicio_id = :servicioId', { servicioId: ps.servicio.id })
        .andWhere('cita.flg_activo = 1')
        .andWhere('cita.fecha > :hoy', { hoy })
        .getCount();

      if (citasFuturas > 0) continue;

      // Sin ninguna cita pasada → no inactivar (es nuevo en el servicio)
      if (!ultimaCita) continue;

      const fechaRaw = ultimaCita.fecha as unknown as string | Date;
      const fechaUltima = fechaRaw instanceof Date
        ? fechaRaw.toISOString().split('T')[0]
        : String(fechaRaw).split('T')[0];

      // Si la última cita fue hace más de 15 días → inactivar
      if (fechaUltima > fechaLimiteStr) continue;

      // Marcar como Inactivo
      await this.pacienteServicioRepository.update(ps.id, {
        estadoPaciente: { id: 5 },
      });

      const nombrePaciente = `${ps.paciente.nombres} ${ps.paciente.apellido_paterno} ${ps.paciente.apellido_materno}`;
      const nombreServicio = ps.servicio.nombre;

      detalles.push({
        pacienteServicioId: ps.id,
        paciente: nombrePaciente,
        servicio: nombreServicio,
        ultimaCita: fechaUltima,
      });

      // Notificación solo al administrador
      try {
        const evento = await this.notificacionesService['crearEvento']({
          tipo_evento: 'SERVICIO_INACTIVO_AUTOMATICO',
          descripcion: `El servicio "${nombreServicio}" del paciente ${nombrePaciente} fue marcado como Inactivo por inactividad de mas de 15 dias`,
          usuario_id: 1,
          datos_adicionales: {
            entidad_afectada: 'paciente_servicio',
            paciente_servicio_id: ps.id,
            paciente_id: ps.paciente.id,
            servicio_id: ps.servicio.id,
            servicio_nombre: nombreServicio,
            estado_anterior: ps.estadoPaciente?.nombre ?? 'Sin estado',
            estado_nuevo: 'Inactivo',
            ultima_cita: fechaUltima,
          },
        });

        await this.notificacionesService['crearNotificacion']({
          tipo_notificacion: 'SERVICIO_INACTIVO',
          titulo: 'Servicio marcado como Inactivo',
          mensaje: `El paciente ${nombrePaciente} no ha asistido al servicio "${nombreServicio}" en más de 15 días. Última cita: ${new Date(fechaUltima).toLocaleDateString('es-PE')}`,
          evento_id: evento.id,
          roles_destino: [1], // Solo administrador
        });

        this.logger.log(`📢 Notificación enviada al admin — PS ID ${ps.id} (${nombrePaciente} · ${nombreServicio})`);
      } catch (error) {
        this.logger.error(`❌ Error al notificar PS ID ${ps.id}: ${error instanceof Error ? error.message : error}`);
      }

      // Auditoría del cambio automático de estado
      try {
        await this.auditoriaService.registrar({
          trabajadorId: 1,
          accion: 'SERVICIO_INACTIVADO_AUTOMATICO',
          modulo: 'PACIENTES',
          descripcion: `Sistema: servicio "${nombreServicio}" de ${nombrePaciente} inactivado automáticamente por inactividad de más de 15 días (última cita: ${fechaUltima})`,
          datosNuevos: {
            paciente_servicio_id: ps.id,
            paciente_id: ps.paciente.id,
            servicio_nombre: nombreServicio,
            ultima_cita: fechaUltima,
            estado_nuevo: 'Inactivo',
          },
        });
      } catch (error) {
        this.logger.error(`❌ Error al registrar auditoría PS ID ${ps.id}: ${error instanceof Error ? error.message : error}`);
      }

      this.logger.log(`✅ Servicio inactivado — PS ID ${ps.id}: ${nombrePaciente} · ${nombreServicio} (última cita: ${fechaUltima})`);
    }

    this.logger.log(`✨ Servicios inactivados: ${detalles.length}`);

    // Recalcular estado global para cada paciente afectado
    const pacientesAfectados = [...new Set(paraInactivar
      .filter(ps => detalles.some(d => d.pacienteServicioId === ps.id))
      .map(ps => ps.paciente.id))];

    for (const pacienteId of pacientesAfectados) {
      await this.recalcularEstadoGlobal(pacienteId);
    }

    return { actualizados: detalles.length, detalles };
  }

  /**
   * Recalcula el estado global del paciente según los estados de sus servicios:
   * - Todos Inactivo → global Inactivo (5)
   * - Alguno no Inactivo → global = estado de mayor prioridad (Terapia > Evaluacion > Entrevista > Nuevo)
   */
  async recalcularEstadoGlobal(pacienteId: number): Promise<void> {
    const servicios = await this.pacienteServicioRepository.find({
      where: { paciente: { id: pacienteId }, activo: true },
      relations: ['estadoPaciente'],
    });

    if (servicios.length === 0) return;

    const estadoIds = servicios
      .map(ps => ps.estadoPaciente?.id ?? null)
      .filter((id): id is number => id !== null);

    if (estadoIds.length === 0) return;

    const PRIORIDAD = [4, 3, 2, 1]; // Terapia > Evaluacion > Entrevista > Nuevo
    const todosInactivos = estadoIds.every(id => id === 5);

    let nuevoEstadoId: number;
    if (todosInactivos) {
      nuevoEstadoId = 5;
    } else {
      const activos = estadoIds.filter(id => id !== 5);
      nuevoEstadoId = PRIORIDAD.find(p => activos.includes(p)) ?? 1;
    }

    await this.pacienteRepository.update(pacienteId, { estado: { id: nuevoEstadoId } });
    this.logger.log(`🔄 Estado global paciente ${pacienteId} → ${nuevoEstadoId}`);
  }
}