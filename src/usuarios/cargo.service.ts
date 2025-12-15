import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cargo } from './cargo.entity';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

@Injectable()
export class CargoService {
  constructor(
    @InjectRepository(Cargo)
    private cargoRepository: Repository<Cargo>,
  ) {}

  async findAll(): Promise<Cargo[]> {
    return await this.cargoRepository.find({
      where: { activo: true },
      order: {
        es_jefe: 'DESC', // Jefes primero
        nombre: 'ASC'
      }
    });
  }

  async findOne(id: number): Promise<Cargo> {
    const cargo = await this.cargoRepository.findOne({ where: { id } });
    if (!cargo) {
      throw new NotFoundException(`Cargo con ID ${id} no encontrado`);
    }
    return cargo;
  }

  async create(createCargoDto: CreateCargoDto, userId: number): Promise<Cargo> {
    const cargo = this.cargoRepository.create({
      ...createCargoDto,
      user_id_crea: userId,
      user_id_actua: userId,
    });
    return await this.cargoRepository.save(cargo);
  }

  async update(id: number, updateCargoDto: UpdateCargoDto, userId: number): Promise<Cargo> {
    const cargo = await this.findOne(id);

    Object.assign(cargo, updateCargoDto);
    cargo.user_id_actua = userId;

    return await this.cargoRepository.save(cargo);
  }

  async remove(id: number): Promise<void> {
    const cargo = await this.findOne(id);
    cargo.activo = false;
    await this.cargoRepository.save(cargo);
  }
}
