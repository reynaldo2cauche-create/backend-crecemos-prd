import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades
import { Promocion } from './entities/promocion.entity';
import { PromocionRegla } from './entities/promocion-regla.entity';
import { PromocionAlcance } from './entities/promocion-alcance.entity';
import { VentaPromocionAplicada } from './entities/venta-promocion-aplicada.entity';
import { TipoCondicionPromo } from './entities/tipo-condicion-promo.entity';
import { TipoBeneficioPromo } from './entities/tipo-beneficio-promo.entity';
import { TipoAlcancePromo } from './entities/tipo-alcance-promo.entity';
import { TipoVentaPromo } from './entities/tipo-venta-promo.entity';

// Servicios
import { PromocionService } from './services/promocion.service';
import { AplicadorPromocionService } from './services/aplicador-promocion.service';

// Controladores
import { PromocionController } from './controllers/promocion.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Promocion,
      PromocionRegla,
      PromocionAlcance,
      VentaPromocionAplicada,
      TipoCondicionPromo,
      TipoBeneficioPromo,
      TipoAlcancePromo,
      TipoVentaPromo,
    ]),
  ],
  providers: [PromocionService, AplicadorPromocionService],
  controllers: [PromocionController],
  exports: [PromocionService, AplicadorPromocionService], // Exportar para usar en otros módulos
})
export class PromocionesModule {}
