import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicioPaquetePrecio } from '../entities/servicio-paquete-precio.entity';
import { CreateServicioPaquetePrecioDto } from '../dto/create-servicio-paquete-precio.dto';
import { UpdateServicioPaquetePrecioDto } from '../dto/update-servicio-paquete-precio.dto';

@Injectable()
export class ServicioPaquetePrecioService {
  constructor(
    @InjectRepository(ServicioPaquetePrecio)
    private readonly servicioPaquetePrecioRepo: Repository<ServicioPaquetePrecio>,
  ) {}

  async create(createDto: CreateServicioPaquetePrecioDto): Promise<ServicioPaquetePrecio> {
    // Verificar si ya existe una configuración para este servicio_tarifa + paquete
    const existe = await this.servicioPaquetePrecioRepo.findOne({
      where: {
        servicio_tarifa_id: createDto.servicio_tarifa_id,
        paquete_id: createDto.paquete_id,
      },
    });

    if (existe) {
      throw new ConflictException(
        'Ya existe una configuración de precio para este servicio y paquete',
      );
    }

    const nuevo = this.servicioPaquetePrecioRepo.create(createDto);
    return this.servicioPaquetePrecioRepo.save(nuevo);
  }

  async findAll(): Promise<ServicioPaquetePrecio[]> {
    return this.servicioPaquetePrecioRepo.find({
      relations: ['servicioTarifa', 'paquete'],
      where: { flg_activo: 1 },
    });
  }

  async findByServicioTarifa(servicioTarifaId: number): Promise<ServicioPaquetePrecio[]> {
    return this.servicioPaquetePrecioRepo
      .createQueryBuilder('spp')
      .leftJoinAndSelect('spp.paquete', 'paquete')
      .where('spp.servicio_tarifa_id = :servicioTarifaId', { servicioTarifaId })
      .andWhere('spp.flg_activo = 1')
      .orderBy('paquete.cantidadSesiones', 'ASC')
      .getMany();
  }

  async findOne(id: number): Promise<ServicioPaquetePrecio> {
    const precio = await this.servicioPaquetePrecioRepo.findOne({
      where: { id },
      relations: ['servicioTarifa', 'paquete'],
    });

    if (!precio) {
      throw new NotFoundException(`Precio de paquete con ID ${id} no encontrado`);
    }

    return precio;
  }

  async update(id: number, updateDto: UpdateServicioPaquetePrecioDto): Promise<ServicioPaquetePrecio> {
    const precio = await this.findOne(id);

    // Si se está cambiando el paquete o servicio_tarifa, verificar duplicados
    if (updateDto.servicio_tarifa_id || updateDto.paquete_id) {
      const servicioTarifaId = updateDto.servicio_tarifa_id || precio.servicio_tarifa_id;
      const paqueteId = updateDto.paquete_id || precio.paquete_id;

      const existe = await this.servicioPaquetePrecioRepo.findOne({
        where: {
          servicio_tarifa_id: servicioTarifaId,
          paquete_id: paqueteId,
        },
      });

      if (existe && existe.id !== id) {
        throw new ConflictException(
          'Ya existe una configuración de precio para este servicio y paquete',
        );
      }
    }

    Object.assign(precio, updateDto);
    return this.servicioPaquetePrecioRepo.save(precio);
  }

  async remove(id: number): Promise<void> {
    const precio = await this.findOne(id);
    precio.flg_activo = 0;
    await this.servicioPaquetePrecioRepo.save(precio);
  }

  async delete(id: number): Promise<void> {
    const precio = await this.findOne(id);
    await this.servicioPaquetePrecioRepo.remove(precio);
  }
}
