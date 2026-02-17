import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Compra } from './entities/compra.entity';
import { TipoCompra } from './entities/tipo-compra.entity';
import { Paquete } from './entities/paquete.entity';
import { Paciente } from '../pacientes/paciente.entity';
import { CrearCompraDto } from './dto/crear-compra.dto';

@Injectable()
export class CompraService {
  constructor(
    @InjectRepository(Compra)
    private compraRepository: Repository<Compra>,
    @InjectRepository(TipoCompra)
    private tipoCompraRepository: Repository<TipoCompra>,
    @InjectRepository(Paquete)
    private paqueteRepository: Repository<Paquete>,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
  ) {}

  /**
   * 🛒 Crear una nueva compra (individual o paquete)
   */
  async crearCompra(dto: CrearCompraDto) {
    // Validar que el paciente exista
    const paciente = await this.pacienteRepository.findOne({
      where: { id: dto.paciente_id },
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${dto.paciente_id} no encontrado`);
    }

    // Validar que el tipo de compra exista
    const tipoCompra = await this.tipoCompraRepository.findOne({
      where: { id: dto.tipo_compra_id },
    });

    if (!tipoCompra) {
      throw new NotFoundException(`Tipo de compra con ID ${dto.tipo_compra_id} no encontrado`);
    }

    // Si es tipo PAQUETE, validar que el paquete exista
    if (tipoCompra.nombre === 'PAQUETE') {
      if (!dto.paquete_id) {
        throw new BadRequestException('Para compras de tipo PAQUETE se requiere especificar el paquete');
      }

      const paquete = await this.paqueteRepository.findOne({
        where: { id: dto.paquete_id },
      });

      if (!paquete) {
        throw new NotFoundException(`Paquete con ID ${dto.paquete_id} no encontrado`);
      }
    }

    // Crear la compra
    const compra = this.compraRepository.create({
      pacienteId: dto.paciente_id,
      tipoCompraId: dto.tipo_compra_id,
      paqueteId: dto.paquete_id || null,
      cantidad: dto.cantidad,
      sesionesTotales: dto.sesiones_totales,
      sesionesUsadas: 0,
      fechaCompra: new Date(dto.fecha_compra),
    });

    const compraGuardada = await this.compraRepository.save(compra);

    // Retornar con relaciones
    return this.compraRepository.findOne({
      where: { id: compraGuardada.id },
      relations: ['paciente', 'tipoCompra', 'paquete'],
    });
  }

  /**
   * 📋 Obtener todas las compras de un paciente
   */
  async obtenerComprasPaciente(pacienteId: number) {
    const compras = await this.compraRepository.find({
      where: { pacienteId },
      relations: ['tipoCompra', 'paquete'],
      order: { fechaCompra: 'DESC' },
    });

    return compras.map(c => ({
      id: c.id,
      tipo_compra: c.tipoCompra?.nombre,
      paquete: c.paquete ? {
        id: c.paquete.id,
        nombre: c.paquete.nombre,
        cantidad_sesiones: c.paquete.cantidadSesiones,
      } : null,
      cantidad: c.cantidad,
      sesiones_totales: c.sesionesTotales,
      sesiones_usadas: c.sesionesUsadas,
      sesiones_restantes: c.sesionesTotales - c.sesionesUsadas,
      fecha_compra: c.fechaCompra,
      created_at: c.createdAt,
    }));
  }

  /**
   * 📦 Obtener paquetes DISPONIBLES del paciente (con sesiones restantes)
   */
  async obtenerPaquetesDisponibles(pacienteId: number) {
    const compras = await this.compraRepository
      .createQueryBuilder('compra')
      .leftJoinAndSelect('compra.tipoCompra', 'tipoCompra')
      .leftJoinAndSelect('compra.paquete', 'paquete')
      .where('compra.pacienteId = :pacienteId', { pacienteId })
      .andWhere('tipoCompra.nombre = :tipo', { tipo: 'PAQUETE' })
      .andWhere('compra.sesionesUsadas < compra.sesionesTotales')
      .orderBy('compra.fechaCompra', 'DESC')
      .getMany();

    return compras.map(c => ({
      compra_id: c.id,
      paquete: {
        id: c.paquete.id,
        nombre: c.paquete.nombre,
        cantidad_sesiones: c.paquete.cantidadSesiones,
      },
      cantidad_paquetes: c.cantidad,
      sesiones_totales: c.sesionesTotales,
      sesiones_usadas: c.sesionesUsadas,
      sesiones_restantes: c.sesionesTotales - c.sesionesUsadas,
      fecha_compra: c.fechaCompra,
    }));
  }

  /**
   * ✅ Marcar sesión como usada (cuando se agenda una cita)
   */
  async usarSesion(compraId: number) {
    const compra = await this.compraRepository.findOne({
      where: { id: compraId },
      relations: ['tipoCompra'],
    });

    if (!compra) {
      throw new NotFoundException(`Compra con ID ${compraId} no encontrada`);
    }

    // Validar que haya sesiones disponibles
    if (compra.sesionesUsadas >= compra.sesionesTotales) {
      throw new BadRequestException('No quedan sesiones disponibles en esta compra');
    }

    // Incrementar sesiones usadas
    compra.sesionesUsadas += 1;
    await this.compraRepository.save(compra);

    return {
      compra_id: compra.id,
      sesiones_usadas: compra.sesionesUsadas,
      sesiones_restantes: compra.sesionesTotales - compra.sesionesUsadas,
    };
  }

  /**
   * ↩️ Liberar sesión (cuando se cancela/elimina una cita)
   */
  async liberarSesion(compraId: number) {
    const compra = await this.compraRepository.findOne({
      where: { id: compraId },
    });

    if (!compra) {
      throw new NotFoundException(`Compra con ID ${compraId} no encontrada`);
    }

    // Validar que haya sesiones usadas para liberar
    if (compra.sesionesUsadas <= 0) {
      throw new BadRequestException('No hay sesiones usadas para liberar');
    }

    // Decrementar sesiones usadas
    compra.sesionesUsadas -= 1;
    await this.compraRepository.save(compra);

    return {
      compra_id: compra.id,
      sesiones_usadas: compra.sesionesUsadas,
      sesiones_restantes: compra.sesionesTotales - compra.sesionesUsadas,
    };
  }

  /**
   * 🔍 Obtener detalle de una compra
   */
  async obtenerCompra(id: number) {
    const compra = await this.compraRepository.findOne({
      where: { id },
      relations: ['paciente', 'tipoCompra', 'paquete'],
    });

    if (!compra) {
      throw new NotFoundException(`Compra con ID ${id} no encontrada`);
    }

    return {
      id: compra.id,
      paciente: {
        id: compra.paciente.id,
        nombre_completo: `${compra.paciente.nombres} ${compra.paciente.apellido_paterno} ${compra.paciente.apellido_materno || ''}`.trim(),
      },
      tipo_compra: compra.tipoCompra?.nombre,
      paquete: compra.paquete ? {
        id: compra.paquete.id,
        nombre: compra.paquete.nombre,
        cantidad_sesiones: compra.paquete.cantidadSesiones,
      } : null,
      cantidad: compra.cantidad,
      sesiones_totales: compra.sesionesTotales,
      sesiones_usadas: compra.sesionesUsadas,
      sesiones_restantes: compra.sesionesTotales - compra.sesionesUsadas,
      fecha_compra: compra.fechaCompra,
      created_at: compra.createdAt,
      updated_at: compra.updatedAt,
    };
  }

  /**
   * 🗑️ Eliminar una compra (solo si no tiene sesiones usadas)
   */
  async eliminarCompra(id: number) {
    const compra = await this.compraRepository.findOne({
      where: { id },
    });

    if (!compra) {
      throw new NotFoundException(`Compra con ID ${id} no encontrada`);
    }

    if (compra.sesionesUsadas > 0) {
      throw new BadRequestException('No se puede eliminar una compra con sesiones ya usadas');
    }

    await this.compraRepository.remove(compra);
    return { message: 'Compra eliminada exitosamente' };
  }
}
