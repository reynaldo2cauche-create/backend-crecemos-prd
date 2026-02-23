import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from '../entities/producto.entity';
import { CreateProductoDto } from '../dto/create-producto.dto';

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly repo: Repository<Producto>,
  ) {}

  async findAll(soloActivos = true) {
    const qb = this.repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.categoria', 'categoria')
      .leftJoinAndSelect('p.proveedor', 'proveedor')
      .leftJoinAndSelect('p.tipo_producto', 'tipo_producto')
      .orderBy('p.nombre', 'ASC');

    if (soloActivos) qb.where('p.flg_activo = 1');
    return qb.getMany();
  }

  async findOne(id: number) {
    const prod = await this.repo.findOne({
      where: { id },
      relations: ['categoria', 'proveedor', 'tipo_producto'],
    });
    if (!prod) throw new NotFoundException(`Producto ${id} no encontrado`);
    return prod;
  }

  async findPorCategoria(categoriaId: number) {
    return this.repo.find({
      where: { categoria_id: categoriaId, flg_activo: 1 },
      relations: ['proveedor', 'tipo_producto'],
      order: { nombre: 'ASC' },
    });
  }

  /** Solo productos de tipo 1 (Para venta) */
  async findParaVenta() {
    return this.repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.categoria', 'categoria')
      .leftJoinAndSelect('p.proveedor', 'proveedor')
      .where('p.flg_activo = 1')
      .andWhere('p.tipo_producto_id = 1')
      .orderBy('p.nombre', 'ASC')
      .getMany();
  }

  /** Solo productos de tipo 2 (Uso interno) */
  async findUsoInterno() {
    return this.repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.categoria', 'categoria')
      .leftJoinAndSelect('p.proveedor', 'proveedor')
      .where('p.flg_activo = 1')
      .andWhere('p.tipo_producto_id = 2')
      .orderBy('p.nombre', 'ASC')
      .getMany();
  }

  /** Productos cuyo stock_actual <= stock_minimo */
  async findStockBajo() {
    return this.repo.createQueryBuilder('p')
      .leftJoinAndSelect('p.categoria', 'categoria')
      .leftJoinAndSelect('p.tipo_producto', 'tipo_producto')
      .where('p.flg_activo = 1')
      .andWhere('p.stock_actual <= p.stock_minimo')
      .orderBy('p.stock_actual', 'ASC')
      .getMany();
  }

  async create(dto: CreateProductoDto) {
    const prod = this.repo.create({ ...dto });
    return this.repo.save(prod);
  }

  async update(id: number, dto: Partial<CreateProductoDto> & { user_actua_id?: number }) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  /** Ajusta el stock directamente (usado por CompraReposicion y VentaProducto) */
  async ajustarStock(id: number, delta: number) {
    await this.repo.createQueryBuilder()
      .update(Producto)
      .set({ stock_actual: () => `stock_actual + ${delta}` })
      .where('id = :id', { id })
      .execute();
  }

  async desactivar(id: number, userId: number) {
    await this.findOne(id);
    await this.repo.update(id, { flg_activo: 0, user_actua_id: userId });
    return { message: 'Producto desactivado' };
  }

  async activar(id: number, userId: number) {
    await this.findOne(id);
    await this.repo.update(id, { flg_activo: 1, user_actua_id: userId });
    return { message: 'Producto activado' };
  }
}