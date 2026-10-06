import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam } from '@nestjs/swagger';
import { FichaSeguimientoPsicologiaService } from './ficha-seguimiento-psicologia.service';
import { CreateFichaSeguimientoPsicologiaDto } from './dto/create-ficha-seguimiento-psicologia.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Public } from 'src/auth/decorators/public.decorator';
import { GeofencingGuard } from 'src/geofencing/geofencing.guard';

@Controller('backend_api/ficha-seguimiento-psicologia')
@UseGuards(JwtAuthGuard, GeofencingGuard)
export class FichaSeguimientoPsicologiaController {
  constructor(private readonly fichaService: FichaSeguimientoPsicologiaService) {}

  @Post()
  @ApiOperation({ summary: 'Generar una solicitud de ficha de seguimiento psicológico (Admisión/Admin)' })
  crear(@Body() dto: CreateFichaSeguimientoPsicologiaDto) {
    return this.fichaService.crear(dto);
  }

  @Get('paciente/:pacienteId')
  @ApiOperation({ summary: 'Listar fichas de seguimiento psicológico de un paciente' })
  @ApiParam({ name: 'pacienteId', type: Number })
  listarPorPaciente(@Param('pacienteId', ParseIntPipe) pacienteId: number) {
    return this.fichaService.listarPorPaciente(pacienteId);
  }

  @Public()
  @Get('publico/:token')
  @ApiOperation({ summary: 'Obtener la ficha para que la docente la llene (público)' })
  obtenerPublico(@Param('token') token: string) {
    return this.fichaService.obtenerPublico(token);
  }

  @Public()
  @Post('publico/:token')
  @ApiOperation({ summary: 'La docente envía la ficha completada (público, un solo uso)' })
  completar(
    @Param('token') token: string,
    @Body() body: Record<string, any>,
  ) {
    // body tipado como Object → el ValidationPipe global lo deja pasar sin recortar columnas
    return this.fichaService.completar(token, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Anular una ficha pendiente' })
  @ApiParam({ name: 'id', type: Number })
  anular(@Param('id', ParseIntPipe) id: number) {
    return this.fichaService.anular(id);
  }
}
