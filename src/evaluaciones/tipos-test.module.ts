import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposTest } from './tipos-test.entity';
import { TiposTestService } from './tipos-test.service';
import { TiposTestController } from './tipos-test.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TiposTest])],
  providers: [TiposTestService],
  controllers: [TiposTestController],
  exports: [TiposTestService],
})
export class TiposTestModule {} 