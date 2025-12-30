// src/convenios/convenios.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConveniosController } from './convenios.controller';
import { ConveniosService } from './convenios.service';
import { Convenio } from './entities/convenio.entity';
import { PacienteConvenio } from './entities/paciente-convenio.entity';
import { Beneficio } from './entities/beneficio.entity';
import { CategoriaBeneficio } from './entities/categoria-beneficio.entity';
import { diskStorage } from 'multer';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([Convenio, PacienteConvenio, Beneficio, CategoriaBeneficio]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/convenios',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          const filename = `convenio-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Tipo de archivo no permitido'), false);
        }
      },
    }),
  ],
  controllers: [ConveniosController],
  providers: [ConveniosService],
  exports: [ConveniosService],
})
export class ConveniosModule {}