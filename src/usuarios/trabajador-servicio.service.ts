import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajadorServicio } from './trabajador-servicio.entity';

@Injectable()
export class TrabajadorServicioService {
  constructor(
    @InjectRepository(TrabajadorServicio)
    private trabajadorServicioRepository: Repository<TrabajadorServicio>,
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
  async asignarServicio(trabajadorId: number, servicioId: number, observaciones?: string, userId?: number) {
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
