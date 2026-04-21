import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatosEstudiante } from '../datos-estudiante.entity';

@Injectable()
export class DatosEstudianteService {
  constructor(
    @InjectRepository(DatosEstudiante)
    private datosEstudianteRepository: Repository<DatosEstudiante>,
  ) {}

  async findAll() {
    return this.datosEstudianteRepository.find({
      relations: [
        'institucion',
        'grado',
        'seccion',
        'evaluador'
      ],
      order: {
        nombre_estudiante: 'ASC',
        apellidos_estudiante: 'ASC'
      }
    });
  }
} 