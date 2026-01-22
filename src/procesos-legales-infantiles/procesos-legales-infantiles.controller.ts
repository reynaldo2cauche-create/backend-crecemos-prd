import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ProcesosLegalesInfantilesService } from './procesos-legales-infantiles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('backend_api/procesos-legales-infantiles')
@UseGuards(JwtAuthGuard)
export class ProcesosLegalesInfantilesController {
  constructor(
    private readonly procesosLegalesService: ProcesosLegalesInfantilesService,
  ) {}

  @Public()
  @Get()
  findAll() {
    return this.procesosLegalesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.procesosLegalesService.findOne(id);
  }
}
