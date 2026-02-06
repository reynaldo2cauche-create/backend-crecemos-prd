import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request } from 'express';

@Controller('backend_api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string }, @Req() req: Request) {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    // 📍 EXTRAER COORDENADAS GPS DE LOS HEADERS
    const latHeader = req.headers['x-user-latitude'] as string;
    const lngHeader = req.headers['x-user-longitude'] as string;

    let coordenadas: { latitud?: number; longitud?: number } = {};

    if (latHeader && lngHeader) {
      const lat = parseFloat(latHeader);
      const lng = parseFloat(lngHeader);

      if (!isNaN(lat) && !isNaN(lng)) {
        coordenadas = { latitud: lat, longitud: lng };
        console.log(`📍 LOGIN - Coordenadas GPS recibidas: ${lat}, ${lng}`);
      }
    }

    return this.authService.login(
      body.username,
      body.password,
      ip as string,
      userAgent,
      coordenadas
    );
  }
} 