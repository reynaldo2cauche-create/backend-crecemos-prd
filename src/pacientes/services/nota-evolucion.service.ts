import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotaEvolucion } from '../entities/nota-evolucion.entity';
import { CreateNotaEvolucionDto } from '../dto/create-nota-evolucion.dto';
import { Paciente } from '../paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';

@Injectable()
export class NotaEvolucionService {
  constructor(
    @InjectRepository(NotaEvolucion)
    private notaEvolucionRepository: Repository<NotaEvolucion>,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
  ) {}

  async create(dto: CreateNotaEvolucionDto) {
    console.log('📝 Creando nota de evolución:', dto);

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

    console.log('✅ Paciente encontrado:', paciente.id, paciente.nombres);
    console.log('✅ Trabajador encontrado:', trabajador.id, trabajador.nombres);

    // Crear la nota de evolución
    const nota = this.notaEvolucionRepository.create({
      paciente,
      usuarioCreador: trabajador,
      entrevista: dto.entrevista,
      sesion_evaluacion: dto.sesion_evaluacion,
      sesion_terapias: dto.sesion_terapias,
      objetivos_terapeuticos: dto.objetivos_terapeuticos,
      observaciones: dto.observaciones,
      fecha_crea: new Date(),
    });

    console.log('💾 Guardando nota en BD...');

    try {
      const notaGuardada = await this.notaEvolucionRepository.save(nota);
      console.log('✅ Nota guardada exitosamente con ID:', notaGuardada.id);

      // Obtener la nota con todas las relaciones para la respuesta
      const notaCompleta = await this.notaEvolucionRepository.findOne({
        where: { id: notaGuardada.id },
        relations: ['paciente', 'usuarioCreador', 'usuarioCreador.rol', 'usuarioCreador.especialidad']
      });

      return notaCompleta;
    } catch (error) {
      console.error('❌ Error al guardar nota en BD:', error);
      throw new BadRequestException(`Error al guardar la nota: ${error.message}`);
    }
  }

  async findByPaciente(paciente_id: number, trabajador_id?: number) {
    const whereCondition: any = { 
      paciente: { id: paciente_id } 
    };

    // Si se proporciona trabajador_id, agregar el filtro
    if (trabajador_id) {
      whereCondition.usuarioCreador = { id: trabajador_id };
    }

    const notas = await this.notaEvolucionRepository.find({
      where: whereCondition,
      order: { fecha_crea: 'DESC' },
      relations: ['usuarioCreador', 'usuarioCreador.rol', 'usuarioCreador.especialidad']
    });

    return notas.map(nota => ({
      id: nota.id,
      entrevista: nota.entrevista,
      sesion_evaluacion: nota.sesion_evaluacion,
      sesion_terapias: nota.sesion_terapias,
      objetivos_terapeuticos: nota.objetivos_terapeuticos,
      observaciones: nota.observaciones,
      fecha_crea: nota.fecha_crea,
      trabajador: nota.usuarioCreador
        ? {
            nombres: nota.usuarioCreador.nombres,
            apellidos: nota.usuarioCreador.apellidos,
            especialidad: nota.usuarioCreador.especialidad,
            rol: nota.usuarioCreador.rol
          }
        : null
    }));
  }
} 