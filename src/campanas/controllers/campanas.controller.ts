import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards,Request } from '@nestjs/common';
import { CampanasService } from '../services/campanas.service';
import { CreateCampanaDto } from '../dto/create-campana.dto';
import { UpdateCampanaDto } from '../dto/update-campana.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Auditable } from '../../auditoria/decorators/auditable.decorator';

@Controller('backend_api/campanas')
export class CampanasController {
  constructor(private readonly campanasService: CampanasService) {}

  /**
   * Endpoint público: obtener campañas activas
   */
  @Get('publicas')
  findActivas() {
    return this.campanasService.findActivas();
  }

  /**
   * Endpoints protegidos (admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.campanasService.findAll();
  }

  @Get('estados')
  @UseGuards(JwtAuthGuard)
  getEstados() {
    return this.campanasService.getEstados();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.campanasService.findOne(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Auditable({ modulo: 'CAMPAÑAS', accion: 'CREAR_CAMPANA' })
  async create(@Body() createCampanaDto: CreateCampanaDto) {
    console.log('📥 CREATE CAMPANA DTO:', JSON.stringify(createCampanaDto, null, 2));
    try {
      const result = await this.campanasService.create(createCampanaDto);
      console.log('✅ CAMPANA CREADA ID:', result.id);
      return result;
    } catch (err) {
      console.error('❌ ERROR CREAR CAMPANA:', err.message, err.stack);
      throw err;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Auditable({ modulo: 'CAMPAÑAS', accion: 'ACTUALIZAR_CAMPANA' })
  update(@Param('id') id: string, @Body() updateCampanaDto: UpdateCampanaDto) {
    return this.campanasService.update(+id, updateCampanaDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Auditable({ modulo: 'CAMPAÑAS', accion: 'ELIMINAR_CAMPANA' })
  remove(@Param('id') id: string) {
    return this.campanasService.remove(+id);
  }
}
