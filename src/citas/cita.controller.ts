import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CitaService } from './cita.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';

@Controller('backend_api/citas')
export class CitaController {
  constructor(private readonly citaService: CitaService) {}

  @Post()
  create(@Body() createCitaDto: CreateCitaDto | CreateCitaDto[]) {
    return this.citaService.create(createCitaDto);
  }

  @Get()
  findAll(@Query('terapeuta_id') terapeutaId?: string) {
    const terapeutaIdNumber = terapeutaId ? +terapeutaId : undefined;
    return this.citaService.findAll(terapeutaIdNumber);
  } 

  @Get(':id/historial')
  obtenerHistorial(@Param('id') id: string) {
    return this.citaService.obtenerHistorial(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.citaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCitaDto: UpdateCitaDto) {
    return this.citaService.update(+id, updateCitaDto, updateCitaDto.user_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Body() body?: { user_id?: number }) {
    return this.citaService.remove(+id, body?.user_id);
  }
}
