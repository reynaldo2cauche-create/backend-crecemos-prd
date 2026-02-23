import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicioTarifa } from '../entities/servicio-tarifa.entity';
import { CreateServicioTarifaDto, UpdateServicioTarifaDto } from '../dto/create-servicio-tarifa.dto';

@Injectable()
export class ServicioTarifaService {
  constructor(
    @InjectRepository(ServicioTarifa)
    private readonly repo: Repository<ServicioTarifa>,
  ) {}

  private baseQuery() {
    return this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.servicio', 'servicio')
      .leftJoinAndSelect('t.motivo_cita', 'motivo_cita')
      .orderBy('servicio.nombre', 'ASC')
      .addOrderBy('motivo_cita.nombre', 'ASC');
  }

  async findAll(soloActivas = true) {
    const qb = this.baseQuery();
    if (soloActivas) qb.where('t.flg_activo = 1');
    return qb.getMany();
  }

  async findByServicio(servicioId: number) {
    return this.baseQuery()
      .where('t.servicio_id = :servicioId', { servicioId })
      .andWhere('t.flg_activo = 1')
      .getMany();
  }

  async getPrecio(servicioId: number, motivoCitaId: number): Promise<number> {
    const tarifa = await this.repo.findOne({
      where: { servicio_id: servicioId, motivo_cita_id: motivoCitaId, flg_activo: 1 },
    });
    if (!tarifa) {
      throw new NotFoundException(
        `No existe tarifa activa para servicio ${servicioId} + motivo ${motivoCitaId}`,
      );
    }
    return Number(tarifa.precio);
  }

  async create(dto: CreateServicioTarifaDto) {
    const existe = await this.repo.findOne({
      where: { servicio_id: dto.servicio_id, motivo_cita_id: dto.motivo_cita_id },
    });
    if (existe) {
      throw new ConflictException(
        `Ya existe tarifa para servicio ${dto.servicio_id} + motivo ${dto.motivo_cita_id}`,
      );
    }
    const saved = await this.repo.save(this.repo.create({ ...dto }));
    return this.baseQuery().where('t.id = :id', { id: saved.id }).getOne();
  }

  async update(id: number, dto: UpdateServicioTarifaDto) {
    const tarifa = await this.repo.findOne({ where: { id } });
    if (!tarifa) throw new NotFoundException(`Tarifa ${id} no encontrada`);
    await this.repo.update(id, dto);
    return this.baseQuery().where('t.id = :id', { id }).getOne();
  }

  async desactivar(id: number, userId: number) {
    const tarifa = await this.repo.findOne({ where: { id } });
    if (!tarifa) throw new NotFoundException(`Tarifa ${id} no encontrada`);
    await this.repo.update(id, { flg_activo: 0, user_actua_id: userId });
    return { message: 'Tarifa desactivada' };
  }

  async activar(id: number, userId: number) {
    const tarifa = await this.repo.findOne({ where: { id } });
    if (!tarifa) throw new NotFoundException(`Tarifa ${id} no encontrada`);
    await this.repo.update(id, { flg_activo: 1, user_actua_id: userId });
    return { message: 'Tarifa activada' };
  }
}