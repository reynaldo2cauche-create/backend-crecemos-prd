import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoArchivo } from './entities/tipo-archivo.entity';

@Injectable()
export class TiposArchivoService {
  constructor(
    @InjectRepository(TipoArchivo)
    private readonly tipoArchivoRepository: Repository<TipoArchivo>,
  ) {}

  async findAll(): Promise<TipoArchivo[]> {
    return this.tipoArchivoRepository.find({
      where: { activo: 1 },
      select: ['id', 'nombre', 'descripcion','destinatario_tipo','vigencia_meses'],
    });
  }
}