import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeneficiosController } from './beneficios.controller';
import { BeneficiosService } from './beneficios.service';
import { Beneficio } from './beneficios.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Beneficio]),
  ],
  controllers: [BeneficiosController],
  providers: [BeneficiosService],
  exports: [BeneficiosService], // Exportamos para que otros módulos puedan consumirlo
})
export class BeneficiosModule {}