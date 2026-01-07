import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { Staff } from './entities/staff.entity';
import { TrabajadorServicio } from '../usuarios/trabajador-servicio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Staff, TrabajadorServicio])],
  providers: [StaffService],
  controllers: [StaffController],
  exports: [StaffService],
})
export class StaffModule {}
