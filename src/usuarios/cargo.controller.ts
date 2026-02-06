import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CargoService } from './cargo.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('backend_api/cargos')
export class CargoController {
  constructor(private readonly cargoService: CargoService) {}

  @Get()
  findAll() {
    return this.cargoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cargoService.findOne(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createCargoDto: CreateCargoDto, @Request() req) {
    return this.cargoService.create(createCargoDto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateCargoDto: UpdateCargoDto, @Request() req) {
    return this.cargoService.update(+id, updateCargoDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.cargoService.remove(+id);
  }
}
