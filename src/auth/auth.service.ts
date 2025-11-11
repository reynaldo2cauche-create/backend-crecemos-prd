import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajadorCentro } from '../usuarios/trabajador-centro.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    
    const user = await this.trabajadorRepository.findOne({ 
      where: { username },
      relations: ['institucion']
    });
     console.log('Usuario encontrado:', user);
  console.log('Password recibido:', password);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.estado) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const payload = { 
      username: user.username, 
      sub: user.id, 
      rol: user.rol,
      institucion_id: user.institucion?.id 
    };
    
    // Actualizar último acceso
    await this.trabajadorRepository.update(user.id, {
      ultimo_acceso: new Date()
    });

    return {
      access_token: this.jwtService.sign(payload),
      expires_in: '24h',
      user: {
        id: user.id,
        username: user.username,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol: user.rol,
        email: user.email,
        especialidad: user.especialidad,
        institucion: user.institucion
      }
    };
  }
} 