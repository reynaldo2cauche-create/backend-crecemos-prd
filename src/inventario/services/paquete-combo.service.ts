import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaqueteCombo } from '../entities/paquete-combo.entity';
import { PaqueteComboItem } from '../entities/paquete-combo-item.entity';
import { CreatePaqueteComboDto } from '../dto/create-paquete-combo.dto';
import { UpdatePaqueteComboDto } from '../dto/update-paquete-combo.dto';

@Injectable()
export class PaqueteComboService {
  constructor(
    @InjectRepository(PaqueteCombo)
    private readonly comboRepo: Repository<PaqueteCombo>,
    @InjectRepository(PaqueteComboItem)
    private readonly itemRepo: Repository<PaqueteComboItem>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(soloActivos = true) {
    const qb = this.comboRepo
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.items', 'items')
      .leftJoinAndSelect('items.servicioTarifa', 'servicioTarifa')
      .leftJoinAndSelect('servicioTarifa.servicio', 'servicio')
      .leftJoinAndSelect('servicioTarifa.motivo_cita', 'motivoCita')
      .leftJoinAndSelect('items.documentoTarifa', 'documentoTarifa')
      .orderBy('pc.id', 'DESC');

    if (soloActivos) {
      qb.where('pc.flgActivo = 1');
    }

    return qb.getMany();
  }

  async findOne(id: number) {
    const combo = await this.comboRepo.findOne({
      where: { id },
      relations: [
        'items',
        'items.servicioTarifa',
        'items.servicioTarifa.servicio',
        'items.servicioTarifa.motivo_cita',
        'items.documentoTarifa',
      ],
    });

    if (!combo) {
      throw new NotFoundException(`Paquete combo ${id} no encontrado`);
    }

    return combo;
  }

  async create(dto: CreatePaqueteComboDto) {
    const resultado = await this.dataSource.transaction(async (manager) => {
      // Validar que cada ítem tenga servicio_tarifa_id O documento_tarifa_id
      for (const item of dto.items) {
        const tieneServicio = !!item.servicio_tarifa_id;
        const tieneDocumento = !!item.documento_tarifa_id;

        if ((tieneServicio && tieneDocumento) || (!tieneServicio && !tieneDocumento)) {
          throw new BadRequestException(
            'Cada ítem debe tener servicio_tarifa_id O documento_tarifa_id, no ambos ni ninguno'
          );
        }
      }

      // Crear el combo
      const combo = manager.create(PaqueteCombo, {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        precioTotal: dto.precio_total,
        precioTachado: dto.precio_tachado,
        flgActivo: dto.flg_activo ?? 1,
        user_crea_id: dto.user_crea_id,
      });

      const savedCombo = await manager.save(combo);

      // Crear los ítems
      for (const itemDto of dto.items) {
        const item = manager.create(PaqueteComboItem, {
          paqueteComboId: savedCombo.id,
          servicioTarifaId: itemDto.servicio_tarifa_id,
          documentoTarifaId: itemDto.documento_tarifa_id,
          cantidad: itemDto.cantidad,
          descripcionLinea: itemDto.descripcion_linea,
          user_crea_id: dto.user_crea_id,
        });
        await manager.save(item);
      }

      return savedCombo.id;
    });

    // Después de commitear la transacción, buscar el combo completo
    return this.findOne(resultado);
  }

  async update(id: number, dto: UpdatePaqueteComboDto) {
    await this.dataSource.transaction(async (manager) => {
      const combo = await this.comboRepo.findOne({ where: { id } });
      if (!combo) {
        throw new NotFoundException(`Paquete combo ${id} no encontrado`);
      }

      // Actualizar campos del combo
      if (dto.nombre !== undefined) combo.nombre = dto.nombre;
      if (dto.descripcion !== undefined) combo.descripcion = dto.descripcion;
      if (dto.precio_total !== undefined) combo.precioTotal = dto.precio_total;
      if (dto.precio_tachado !== undefined) combo.precioTachado = dto.precio_tachado;
      if (dto.flg_activo !== undefined) combo.flgActivo = dto.flg_activo;
      if (dto.user_actua_id !== undefined) combo.user_actua_id = dto.user_actua_id;

      await manager.save(combo);

      // Si se enviaron ítems, reemplazar todos
      if (dto.items) {
        // Validar ítems
        for (const item of dto.items) {
          const tieneServicio = !!item.servicio_tarifa_id;
          const tieneDocumento = !!item.documento_tarifa_id;

          if ((tieneServicio && tieneDocumento) || (!tieneServicio && !tieneDocumento)) {
            throw new BadRequestException(
              'Cada ítem debe tener servicio_tarifa_id O documento_tarifa_id, no ambos ni ninguno'
            );
          }
        }

        // Eliminar ítems existentes
        await manager.delete(PaqueteComboItem, { paqueteComboId: id });

        // Crear nuevos ítems
        for (const itemDto of dto.items) {
          const item = manager.create(PaqueteComboItem, {
            paqueteComboId: id,
            servicioTarifaId: itemDto.servicio_tarifa_id,
            documentoTarifaId: itemDto.documento_tarifa_id,
            cantidad: itemDto.cantidad,
            descripcionLinea: itemDto.descripcion_linea,
            user_crea_id: dto.user_actua_id,
          });
          await manager.save(item);
        }
      }
    });

    // Después de commitear la transacción, buscar el combo completo
    return this.findOne(id);
  }

  async remove(id: number) {
    const combo = await this.comboRepo.findOne({ where: { id } });
    if (!combo) {
      throw new NotFoundException(`Paquete combo ${id} no encontrado`);
    }

    // Verificar que no existan ventas con este combo
    const ventasConCombo = await this.dataSource.query(
      'SELECT COUNT(*) as total FROM venta_servicio_detalle WHERE paquete_combo_id = ?',
      [id]
    );

    if (ventasConCombo[0]?.total > 0) {
      throw new BadRequestException(
        `No se puede eliminar el combo porque existen ${ventasConCombo[0].total} ventas asociadas`
      );
    }

    await this.comboRepo.remove(combo);
    return { message: 'Paquete combo eliminado correctamente' };
  }

  async toggleActivo(id: number) {
    const combo = await this.comboRepo.findOne({ where: { id } });
    if (!combo) {
      throw new NotFoundException(`Paquete combo ${id} no encontrado`);
    }

    combo.flgActivo = combo.flgActivo === 1 ? 0 : 1;
    await this.comboRepo.save(combo);

    return { flgActivo: combo.flgActivo };
  }
}
