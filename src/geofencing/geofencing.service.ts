import { Injectable } from '@nestjs/common';

/**
 * Servicio de Geofencing para validar ubicación del usuario
 */
@Injectable()
export class GeofencingService {
  // 📍 Coordenadas del centro de labores
  // Dirección: Calle 48 Nro. 234 Urbanización El Pinar, Comas 15316 Lima, Perú
  // ⚠️ COORDENADAS APROXIMADAS - Actualizar con coordenadas exactas desde /test-ubicacion
private readonly CENTRO_LAT = -11.915504916666666; 
private readonly CENTRO_LNG = -77.05404908333334;
  // ⚠️ RADIO TEMPORAL PARA TESTING - Cambiar a 100 en producción
  private readonly RADIO_PERMITIDO_METROS = 5000; // 5 km (temporal para testing)

  /**
   * Calcular distancia entre dos puntos GPS usando fórmula de Haversine
   * @param lat1 Latitud punto 1
   * @param lon1 Longitud punto 1
   * @param lat2 Latitud punto 2
   * @param lon2 Longitud punto 2
   * @returns Distancia en metros
   */
  private calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
  }

  /**
   * Verificar si una ubicación está dentro del perímetro permitido
   * @param lat Latitud del usuario
   * @param lng Longitud del usuario
   * @returns true si está dentro, false si está fuera
   */
  verificarPerimetro(lat: number, lng: number): boolean {
    const distancia = this.calcularDistancia(
      lat,
      lng,
      this.CENTRO_LAT,
      this.CENTRO_LNG,
    );

    console.log(`📍 Verificando perímetro:`);
    console.log(`   - Ubicación usuario: ${lat}, ${lng}`);
    console.log(`   - Distancia al centro: ${distancia.toFixed(2)} metros`);
    console.log(`   - Dentro del perímetro: ${distancia <= this.RADIO_PERMITIDO_METROS}`);

    return distancia <= this.RADIO_PERMITIDO_METROS;
  }

  /**
   * Obtener distancia desde el centro de labores
   * @param lat Latitud del usuario
   * @param lng Longitud del usuario
   * @returns Distancia en metros
   */
  obtenerDistancia(lat: number, lng: number): number {
    return Math.round(
      this.calcularDistancia(lat, lng, this.CENTRO_LAT, this.CENTRO_LNG),
    );
  }

  /**
   * Obtener coordenadas del centro
   * @returns Objeto con lat y lng
   */
  obtenerCoordenadasCentro() {
    return {
      lat: this.CENTRO_LAT,
      lng: this.CENTRO_LNG,
    };
  }

  /**
   * Obtener radio permitido
   * @returns Radio en metros
   */
  obtenerRadioPermitido(): number {
    return this.RADIO_PERMITIDO_METROS;
  }
}
