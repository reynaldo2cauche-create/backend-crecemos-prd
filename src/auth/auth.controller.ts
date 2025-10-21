import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('backend_api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) {}

 @Post('login')
@HttpCode(HttpStatus.OK)
async login(@Body() body: { username: string; password: string }) {
  console.log('Body recibido:', body);
  return this.authService.login(body.username, body.password);
}
} 