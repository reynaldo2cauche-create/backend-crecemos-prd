import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TrabajadorServicio } from './trabajador-servicio.entity';
import { PacienteServicio } from '../pacientes/paciente-servicio.entity';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
@Injectable()
export class TrabajadorServicioService {
  constructor(
    @InjectRepository(TrabajadorServicio)
    private trabajadorServicioRepository: Repository<TrabajadorServicio>,
    @InjectRepository(PacienteServicio)
    private pacienteServicioRepository: Repository<PacienteServicio>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorCentroRepository: Repository<any>,
  ) {}

  /**
   * Obtiene todos los trabajadores asignados a un servicio específico
   * @param servicioId ID del servicio
   * @returns Array de trabajadores con sus datos
   */
  async getTrabajadoresByServicio(servicioId: number) {
    const asignaciones = await this.trabajadorServicioRepository.find({
      where: {
        servicio: { id: servicioId },
        activo: true,
      },
      relations: ['trabajador', 'trabajador.rol', 'trabajador.especialidad'],
    });

    // Devolver solo los trabajadores sin duplicados
    const trabajadores = asignaciones.map(asignacion => {
      const { password, ...trabajadorSinPassword } = asignacion.trabajador;
      return trabajadorSinPassword;
    });

    // Eliminar duplicados por ID
    const trabajadoresUnicos = trabajadores.filter(
      (trabajador, index, self) =>
        index === self.findIndex(t => t.id === trabajador.id)
    );

    return trabajadoresUnicos;
  }

   async getStaffActivos() {
    // 1. Primero obtenemos los IDs de trabajadores que tienen servicios activos
    const asignacionesActivas = await this.trabajadorServicioRepository.find({
      where: { activo: true },
      select: ['trabajador'],
      relations: ['trabajador'],
    });

    // Si no hay asignaciones activas, retornar array vacío
    if (asignacionesActivas.length === 0) {
      return [];
    }

    // Extraemos IDs únicos de trabajadores
    const trabajadorIds = [...new Set(asignacionesActivas.map(a => a.trabajador.id))];

    // 2. Obtenemos los trabajadores que son terapeutas y están activos
    const trabajadores = await this.trabajadorCentroRepository.find({
      where: {
        id: In(trabajadorIds),
        estado: true,
        rol: { nombre: 'Terapeuta' }
      },
      relations: [
        'rol', 
        'especialidad', 
        'cargo',
        'trabajadorServicios',
        'trabajadorServicios.servicio',
        'trabajadorServicios.servicio.area'
      ],
    });

    // 3. Formateamos la respuesta
    const staffFormateado = trabajadores.map(trabajador => {
      // Solo servicios activos
      const serviciosActivos = trabajador.trabajadorServicios
        .filter(ts => ts.activo)
        .map(ts => ts.servicio);

      // Extraer nombres de servicios
      const nombresServicios = serviciosActivos.map(s => s.nombre);
      
      // Extraer áreas únicas
      const areas = [...new Set(serviciosActivos.map(s => s.area?.nombre).filter(Boolean))];

      return {
        id: trabajador.id,
        nombres: trabajador.nombres,
        apellidos: trabajador.apellidos,
        foto: trabajador.foto,
        especialidad: trabajador.especialidad?.nombre,
        cargo: trabajador.cargo?.nombre,
        descripcion_especialidad: trabajador.descripcion_especialidad || 
          'Profesional especializado en terapias de bienestar',
        servicios: nombresServicios,
        areas: areas.length > 0 ? areas : ['Sin área asignada'],
        totalServicios: serviciosActivos.length
      };
    });

    return staffFormateado;
  }

  /**
   * Obtiene todos los servicios asignados a un trabajador específico
   * @param trabajadorId ID del trabajador
   * @returns Array de servicios
   */
  async getServiciosByTrabajador(trabajadorId: number) {
    const asignaciones = await this.trabajadorServicioRepository.find({
      where: {
        trabajador: { id: trabajadorId },
        activo: true,
      },
      relations: ['servicio', 'servicio.area'],
    });

    return asignaciones.map(asignacion => asignacion.servicio);
  }

  /**
   * Asignar un servicio a un trabajador
   */
  async asignarServicio(trabajadorId: number, servicioId: number, observaciones?: string, userId?: number, validarPaciente: boolean = false) {
    // ✅ PRIMERO: Verificar si ya existe una asignación (activa o inactiva)
    const asignacionExistente = await this.trabajadorServicioRepository.findOne({
      where: {
        trabajador: { id: trabajadorId },
        servicio: { id: servicioId },
      },
    });

    // ✅ Si existe y está inactiva, REACTIVARLA en lugar de crear un duplicado
    if (asignacionExistente) {
      if (!asignacionExistente.activo) {
        asignacionExistente.activo = true;
        asignacionExistente.observaciones = observaciones || asignacionExistente.observaciones;
        asignacionExistente.userIdActua = userId;
        return await this.trabajadorServicioRepository.save(asignacionExistente);
      }
      // Si ya está activa, retornarla sin cambios
      return asignacionExistente;
    }

    // ✅ VALIDACIÓN: Solo validar paciente si se especifica (cuando se asigna terapeuta a paciente específico)
    if (validarPaciente) {
      // 1. Obtener el paciente del servicio al que se quiere asignar
      const pacienteServicio = await this.pacienteServicioRepository.findOne({
        where: {
          servicio: { id: servicioId },
          activo: true
        },
        relations: ['paciente']
      });

      if (!pacienteServicio) {
        throw new BadRequestException('El servicio no está asociado a ningún paciente activo');
      }

      const pacienteId = pacienteServicio.paciente.id;

      // 2. Buscar todos los servicios activos del mismo paciente
      const serviciosPaciente = await this.pacienteServicioRepository.find({
        where: {
          paciente: { id: pacienteId },
          activo: true
        },
        relations: ['servicio']
      });

      const servicioIds = serviciosPaciente.map(ps => ps.servicio.id);

      // 3. Verificar si el trabajador ya está asignado a ALGÚN servicio de este paciente
      const asignacionesDelTrabajador = await this.trabajadorServicioRepository.find({
        where: {
          trabajador: { id: trabajadorId },
          activo: true
        },
        relations: ['servicio', 'trabajador']
      });

      // Buscar si alguna asignación del trabajador coincide con los servicios del paciente
      const asignacionDuplicada = asignacionesDelTrabajador.find(asig =>
        servicioIds.includes(asig.servicio.id)
      );

      if (asignacionDuplicada) {
        throw new BadRequestException(
          `La terapeuta ${asignacionDuplicada.trabajador.nombres} ${asignacionDuplicada.trabajador.apellidos} ya está asignada al servicio "${asignacionDuplicada.servicio.nombre}" de este paciente. No se puede asignar a más de un servicio del mismo paciente.`
        );
      }
    }

    // 4. Si no hay conflicto y no existía antes, proceder con la asignación (CREAR NUEVO REGISTRO)
    const nuevaAsignacion = this.trabajadorServicioRepository.create({
      trabajador: { id: trabajadorId } as any,
      servicio: { id: servicioId } as any,
      observaciones,
      activo: true,
      userIdCrea: userId, // ✅ Guardamos quién creó la asignación
      userIdActua: userId, // ✅ Guardamos quién actualizó la asignación
    });

    return await this.trabajadorServicioRepository.save(nuevaAsignacion);
  }

  /**
   * Desactivar un servicio de un trabajador
   */
  async desactivarServicio(trabajadorId: number, servicioId: number, userId?: number) {
    const asignacion = await this.trabajadorServicioRepository.findOne({
      where: {
        trabajador: { id: trabajadorId },
        servicio: { id: servicioId },
      },
    });

    if (asignacion) {
      asignacion.activo = false;
      asignacion.userIdActua = userId; // ✅ Guardamos quién desactivó la asignación
      return await this.trabajadorServicioRepository.save(asignacion);
    }

    throw new Error('Asignación no encontrada');
  }
}
