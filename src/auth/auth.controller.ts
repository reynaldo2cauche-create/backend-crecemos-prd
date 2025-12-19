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
  return this.authService.login(body.username, body.password, ip as string, userAgent);
}
} 