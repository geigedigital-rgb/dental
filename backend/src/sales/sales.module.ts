import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { FinancialEngine } from './financial.engine';
import { AuthModule } from '../auth/auth.module';
import { StockModule } from '../stock/stock.module';
import { MaterialsModule } from '../materials/materials.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [AuthModule, StockModule, MaterialsModule, ServicesModule],
  controllers: [SalesController],
  providers: [SalesService, FinancialEngine],
  exports: [SalesService, FinancialEngine],
})
export class SalesModule {}
