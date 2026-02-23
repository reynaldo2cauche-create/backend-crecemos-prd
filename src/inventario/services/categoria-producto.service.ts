import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaProducto } from '../entities/categoria-producto.entity';
import { CreateCategoriaProductoDto } from '../dto/create-categoria-producto.dto';

@Injectable()
export class CategoriaProductoService {
  constructor(
    @InjectRepository(CategoriaProducto)
    private readonly repo: Repository<CategoriaProducto>,
  ) {}

  async findAll(soloActivos = true) {
    const where = soloActivos ? { flg_activo: 1 } : {};
    return this.repo.find({ where, order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const cat = await this.repo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Categoría ${id} no encontrada`);
    return cat;
  }

  async create(dto: CreateCategoriaProductoDto) {
    const cat = this.repo.create({ ...dto });
    return this.repo.save(cat);
  }

  async update(id: number, dto: Partial<CreateCategoriaProductoDto> & { user_actua_id?: number }) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async desactivar(id: number, userId: number) {
    await this.findOne(id);
    await this.repo.update(id, { flg_activo: 0, user_actua_id: userId });
    return { message: 'Categoría desactivada' };
  }

  async activar(id: number, userId: number) {
    await this.findOne(id);
    await this.repo.update(id, { flg_activo: 1, user_actua_id: userId });
    return { message: 'Categoría activada' };
  }
}
