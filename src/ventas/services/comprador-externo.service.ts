import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompradorExterno } from '../entities/comprador-externo.entity';
import { CreateCompradorExternoDto } from '../dto/create-comprador-externo.dto';

@Injectable()
export class CompradorExternoService {
  constructor(
    @InjectRepository(CompradorExterno)
    private readonly repo: Repository<CompradorExterno>,
  ) {}

  async findAll(soloActivos = true) {
    const where = soloActivos ? { flg_activo: 1 } : {};
    return this.repo.find({ where, order: { nombre: 'ASC' } });
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException(`Comprador externo ${id} no encontrado`);
    return c;
  }

  async buscar(q: string) {
    return this.repo
      .createQueryBuilder('c')
      .where('c.flg_activo = 1')
      .andWhere('(c.nombre LIKE :q OR c.dni LIKE :q)', { q: `%${q}%` })
      .limit(20)
      .getMany();
  }

  async create(dto: CreateCompradorExternoDto) {
    const c = this.repo.create({ ...dto });
    return this.repo.save(c);
  }

  async update(id: number, dto: Partial<CreateCompradorExternoDto> & { user_actua_id?: number }) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async desactivar(id: number, userId: number) {
    await this.findOne(id);
    await this.repo.update(id, { flg_activo: 0, user_actua_id: userId });
    return { message: 'Comprador externo desactivado' };
  }
}
