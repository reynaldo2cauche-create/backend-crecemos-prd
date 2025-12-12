import { Controller, Get } from '@nestjs/common';
import { BeneficiosService } from './beneficios.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Beneficios')
@Controller('backend_api/beneficios')
export class BeneficiosController {
  constructor(private readonly beneficiosService: BeneficiosService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los beneficios activos',
    description: 'Retorna todos los beneficios que están activos'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de beneficios activos'
  })
  async findAll() {
    return this.beneficiosService.findAll();
  }
}