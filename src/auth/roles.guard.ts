import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    // Si no hay usuario o rol, bloquear
    if (!user || !user.rol || !user.rol.nombre) {
      throw new ForbiddenException('Usuario no tiene rol asignado');
    }

    // Verifica si el rol del usuario está dentro de los requeridos
    const hasRole = requiredRoles.includes(user.rol.nombre);
    if (!hasRole) {
      throw new ForbiddenException('No tienes permiso para acceder a esta ruta');
    }

    return true;
  }
}
