import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { StockMovementEngine } from './stock-movement.engine';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AuthModule, SettingsModule],
  controllers: [StockController],
  providers: [StockService, StockMovementEngine],
  exports: [StockService, StockMovementEngine],
})
export class StockModule {}
