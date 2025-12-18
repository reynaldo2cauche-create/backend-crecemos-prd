import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotaEvolucion } from '../entities/nota-evolucion.entity';
import { CreateNotaEvolucionDto } from '../dto/create-nota-evolucion.dto';
import { Paciente } from '../paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { AsignacionTerapeuta } from '../asignacion-terapeuta.entity';
import { Servicios } from '../../catalogos/servicios.entity';

@Injectable()
export class NotaEvolucionService {
  constructor(
    @InjectRepository(NotaEvolucion)
    private notaEvolucionRepository: Repository<NotaEvolucion>,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
    @InjectRepository(AsignacionTerapeuta)
    private asignacionRepository: Repository<AsignacionTerapeuta>,
    @InjectRepository(Servicios)
    private serviciosRepository: Repository<Servicios>,
  ) {}

  private async detectarServicioAutomatico(terapeuta_id: number, paciente_id: number): Promise<number | null> {
    console.log('🔍 Buscando asignaciones activas para terapeuta:', terapeuta_id, 'paciente:', paciente_id);
    
    const asignaciones = await this.asignacionRepository.find({
      where: {
        terapeuta: { id: terapeuta_id },
        pacienteServicio: { 
          paciente: { id: paciente_id }, 
          activo: true
        },
        estado: 'ACTIVO',
        activo: true
      },
      relations: ['pacienteServicio', 'pacienteServicio.servicio', 'pacienteServicio.servicio.especialidad'],
      order: { fecha_asignacion: 'DESC' }
    });
    
    console.log('📊 Asignaciones encontradas:', asignaciones.length);
    
    if (asignaciones.length === 0) {
      console.log('⚠️ No hay asignaciones activas');
      return null;
    }
    
    // Mostrar todas las asignaciones para debug
    asignaciones.forEach((asig, idx) => {
      console.log(`  ${idx + 1}. Servicio: ${asig.pacienteServicio?.servicio?.nombre} (ID: ${asig.pacienteServicio?.servicio?.id}) | Especialidad: ${asig.pacienteServicio?.servicio?.especialidad?.nombre}`);
    });
    
    const servicioId = asignaciones[0].pacienteServicio.servicio.id;
    console.log('✅ Servicio más reciente seleccionado (ID):', servicioId);
    
    return servicioId;
  }

  async create(dto: CreateNotaEvolucionDto) {
    // Validar que los campos requeridos no estén vacíos
    if (!dto.paciente_id) {
      throw new BadRequestException('El ID del paciente es requerido');
    }
    if (!dto.user_id_crea) {
      throw new BadRequestException('El ID del usuario creador es requerido');
    }

    // Buscar el paciente
    const paciente = await this.pacienteRepository.findOne({
      where: { id: dto.paciente_id }
    });
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${dto.paciente_id} no encontrado`);
    }

    // Buscar el trabajador (usuario creador)
    const trabajador = await this.trabajadorRepository.findOne({
      where: { id: dto.user_id_crea }
    });
    if (!trabajador) {
      throw new NotFoundException(`Trabajador con ID ${dto.user_id_crea} no encontrado`);
    }

    // Detectar servicio automáticamente
    const servicioId = await this.detectarServicioAutomatico(dto.user_id_crea, dto.paciente_id);

    let servicio = null;
    if (servicioId) {
      servicio = await this.serviciosRepository.findOne({
        where: { id: servicioId },
        relations: ['especialidad']
      });
      if (servicio) {
        console.log('✅ Servicio encontrado:', servicio.nombre, '| Especialidad:', servicio.especialidad?.nombre);
      } else {
        console.log('⚠️ No se encontró el servicio con ID:', servicioId);
      }
    } else {
      console.log('⚠️ No se pudo detectar ningún servicio automáticamente');
    }

    // Crear la nota de evolución CON el servicio detectado
    const nota = this.notaEvolucionRepository.create({
      paciente,
      usuarioCreador: trabajador,
      servicio: servicio,
      entrevista: dto.entrevista,
      sesion_evaluacion: dto.sesion_evaluacion,
      sesion_terapias: dto.sesion_terapias,
      objetivos_terapeuticos: dto.objetivos_terapeuticos,
      observaciones: dto.observaciones,
      fecha_crea: new Date(),
    });

    try {
      const notaGuardada = await this.notaEvolucionRepository.save(nota);

      // Obtener la nota con todas las relaciones para la respuesta
      const notaCompleta = await this.notaEvolucionRepository.findOne({
        where: { id: notaGuardada.id },
        relations: ['paciente', 'usuarioCreador', 'usuarioCreador.rol', 'usuarioCreador.especialidad', 'servicio', 'servicio.especialidad']
      });

      return notaCompleta;
    } catch (error) {
      console.error('❌ Error al guardar nota en BD:', error);
      throw new BadRequestException(`Error al guardar la nota: ${error.message}`);
    }
  }

  async findByPaciente(paciente_id: number, trabajador_id?: number, page: number = 1, limit: number = 20) {
    let notas: NotaEvolucion[];
    let total: number;

    if (trabajador_id) {
      // Obtener especialidades del terapeuta basado en sus asignaciones activas
      const especialidadesQuery = this.asignacionRepository
        .createQueryBuilder('asig')
        .innerJoin('asig.pacienteServicio', 'ps')
        .innerJoin('ps.servicio', 's')
        .where('asig.terapeuta_id = :trabajador_id', { trabajador_id })
        .andWhere('ps.paciente_id = :paciente_id', { paciente_id })
        .andWhere('asig.estado = :estado', { estado: 'ACTIVO' })
        .andWhere('s.especialidad_id IS NOT NULL')
        .select('DISTINCT s.especialidad_id', 'id')
        .getRawMany();

      const especialidades = await especialidadesQuery;
      const especialidadIds = especialidades.map(e => e.id).filter(Boolean);

      if (especialidadIds.length === 0) {
        return { data: [], total: 0, page, totalPages: 0 };
      }

      // Obtener notas que coincidan con las especialidades
      const queryBuilder = this.notaEvolucionRepository
        .createQueryBuilder('nota')
        .leftJoinAndSelect('nota.servicio', 'servicio')
        .leftJoinAndSelect('servicio.especialidad', 'especialidad')
        .leftJoinAndSelect('nota.usuarioCreador', 'usuario')
        .leftJoinAndSelect('usuario.especialidad', 'usuarioEspecialidad')
        .leftJoinAndSelect('usuario.rol', 'rol')
        .where('nota.paciente_id = :paciente_id', { paciente_id })
        .andWhere('servicio.especialidad_id IN (:...especialidadIds)', { especialidadIds })
        .orderBy('nota.fecha_crea', 'DESC')
        .take(limit)
        .skip((page - 1) * limit);

      [notas, total] = await queryBuilder.getManyAndCount();
    } else {
      // Si no hay trabajador_id, devolver todas las notas
      const queryBuilder = this.notaEvolucionRepository
        .createQueryBuilder('nota')
        .leftJoinAndSelect('nota.servicio', 'servicio')
        .leftJoinAndSelect('servicio.especialidad', 'especialidad')
        .leftJoinAndSelect('nota.usuarioCreador', 'usuario')
        .leftJoinAndSelect('usuario.especialidad', 'usuarioEspecialidad')
        .leftJoinAndSelect('usuario.rol', 'rol')
        .where('nota.paciente_id = :paciente_id', { paciente_id })
        .orderBy('nota.fecha_crea', 'DESC')
        .take(limit)
        .skip((page - 1) * limit);

      [notas, total] = await queryBuilder.getManyAndCount();
    }

    return {
      data: notas.map(nota => ({
        id: nota.id,
        entrevista: nota.entrevista,
        sesion_evaluacion: nota.sesion_evaluacion,
        sesion_terapias: nota.sesion_terapias,
        objetivos_terapeuticos: nota.objetivos_terapeuticos,
        observaciones: nota.observaciones,
        fecha_crea: nota.fecha_crea,
        servicio: nota.servicio ? {
          id: nota.servicio.id,
          nombre: nota.servicio.nombre,
          especialidad: nota.servicio.especialidad?.nombre
        } : null,
        trabajador: nota.usuarioCreador ? {
          id: nota.usuarioCreador.id,
          nombres: nota.usuarioCreador.nombres,
          apellidos: nota.usuarioCreador.apellidos,
          especialidad: nota.usuarioCreador['usuarioEspecialidad'],
          rol: nota.usuarioCreador.rol
        } : null
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}