import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CompraReposicion } from '../entities/compra-reposicion.entity';
import { CompraReposicionDetalle } from '../entities/compra-reposicion-detalle.entity';
import { CreateCompraReposicionDto } from '../dto/create-compra-reposicion.dto';
import { ProductoService } from './producto.service';

@Injectable()
export class CompraReposicionService {
  constructor(
    @InjectRepository(CompraReposicion)
    private readonly compraRepo: Repository<CompraReposicion>,
    @InjectRepository(CompraReposicionDetalle)
    private readonly detalleRepo: Repository<CompraReposicionDetalle>,
    private readonly productoService: ProductoService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    return this.compraRepo.find({
      relations: ['proveedor', 'detalles', 'detalles.producto'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    const compra = await this.compraRepo.findOne({
      where: { id },
      relations: ['proveedor', 'detalles', 'detalles.producto'],
    });
    if (!compra) throw new NotFoundException(`Compra ${id} no encontrada`);
    return compra;
  }

async create(dto: CreateCompraReposicionDto) {
  return this.dataSource.transaction(async (manager) => {
    let total = 0;
    const detallesConSubtotal = dto.detalles.map((d) => {
      const subtotal = d.cantidad * d.precio_unitario;
      total += subtotal;
      return { ...d, subtotal };
    });

    const compra = manager.create(CompraReposicion, {
      proveedor_id: dto.proveedor_id,
      fecha_compra: dto.fecha_compra,
      nota: dto.nota,
      total,
      user_crea_id: dto.user_crea_id,
    });
    const savedCompra = await manager.save(compra);

    for (const d of detallesConSubtotal) {
      const detalle = manager.create(CompraReposicionDetalle, {
        compra_id: savedCompra.id,
        producto_id: d.producto_id,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal,
      });
      await manager.save(detalle);

      await manager
        .createQueryBuilder()
        .update('producto')
        .set({ stock_actual: () => `stock_actual + ${d.cantidad}` })
        .where('id = :id', { id: d.producto_id })
        .execute();
    }

    // Retornar con findOne DENTRO del manager, no fuera
    return manager.findOne(CompraReposicion, {
      where: { id: savedCompra.id },
      relations: ['proveedor', 'detalles', 'detalles.producto'],
    });
  });
}
}
