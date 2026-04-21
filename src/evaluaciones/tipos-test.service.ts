import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TiposTest } from './tipos-test.entity';

@Injectable()
export class TiposTestService {
  constructor(
    @InjectRepository(TiposTest)
    private tiposTestRepository: Repository<TiposTest>,
  ) {}

  async findAllActivosIdNombre(): Promise<{ id: number; nombre: string }[]> {
    return this.tiposTestRepository.find({
      select: ['id', 'nombre'],
      where: { estado: true }
    });
  }
} 