import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from '../entities/proveedor.entity';
import { CreateProveedorDto } from '../dto/create-proveedor.dto';

@Injectable()
export class ProveedorService {
  constructor(
    @InjectRepository(Proveedor)
    private readonly repo: Repository<Proveedor>,
  ) {}

  async findAll(soloActivos = true) {
    const where = soloActivos ? { flg_activo: 1 } : {};
    return this.repo.find({ where, order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const prov = await this.repo.findOne({ where: { id } });
    if (!prov) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return prov;
  }

  async create(dto: CreateProveedorDto) {
    const prov = this.repo.create({ ...dto });
    return this.repo.save(prov);
  }

  async update(id: number, dto: Partial<CreateProveedorDto>) {
    await this.findOne(id);
    const { user_crea_id, ...campos } = dto; // nunca pisamos user_crea_id en update
    await this.repo.update(id, campos);
    return this.findOne(id);
  }

  async desactivar(id: number, userId: number) {
    await this.findOne(id);
    await this.repo.update(id, { flg_activo: 0, user_actua_id: userId });
    return { message: 'Proveedor desactivado' };
  }

  async activar(id: number, userId: number) {
    await this.findOne(id);
    await this.repo.update(id, { flg_activo: 1, user_actua_id: userId });
    return { message: 'Proveedor activado' };
  }
}