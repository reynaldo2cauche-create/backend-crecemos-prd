import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { CitaService } from './cita.service';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { Auditable } from 'src/auditoria/decorators/auditable.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('backend_api/citas')
@UseGuards(JwtAuthGuard)
export class CitaController {
  constructor(private readonly citaService: CitaService) {}

  @Post()
  create(@Body() createCitaDto: CreateCitaDto | CreateCitaDto[], @Request() req: any) {
    // Obtener el usuario autenticado desde el token JWT
    const userId = req.user?.id;

    // Si es un array de citas, agregar el userId a cada una
    if (Array.isArray(createCitaDto)) {
      createCitaDto.forEach(dto => dto.user_id = userId);
    } else {
      createCitaDto.user_id = userId;
    }

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
  update(@Param('id') id: string, @Body() updateCitaDto: UpdateCitaDto, @Request() req: any) {
    // Obtener el usuario autenticado desde el token JWT
    const userId = req.user?.id;
    return this.citaService.update(+id, updateCitaDto, userId);
  }

  @Delete(':id')
  @Auditable({
    modulo: 'CITAS',
    accion: 'ELIMINAR_CITA',
  })
  remove(@Param('id') id: string, @Request() req: any) {
    // Obtener el usuario autenticado desde el token JWT
    const userId = req.user?.id;
    return this.citaService.remove(+id, userId);
  }
}
