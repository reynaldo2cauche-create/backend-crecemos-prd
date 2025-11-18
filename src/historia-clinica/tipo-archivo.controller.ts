import { Controller, Get } from '@nestjs/common';
import { TiposArchivoService } from './tipo-archivo.service';
import { TipoArchivo } from './entities/tipo-archivo.entity';

@Controller('backend_api/tipos-archivo')
export class TiposArchivoController {
  constructor(private readonly tiposArchivoService: TiposArchivoService) {}

  @Get()
  async findAll(): Promise<TipoArchivo[]> {
    return this.tiposArchivoService.findAll();
  }
}