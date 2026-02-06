import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('profit-by-period')
  profitByPeriod(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.profitByPeriod(
      new Date(from || '1970-01-01'),
      new Date(to || '2100-01-01'),
    );
  }

  @Get('material-consumption')
  materialConsumption(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.materialConsumption(
      new Date(from || '1970-01-01'),
      new Date(to || '2100-01-01'),
    );
  }

  @Get('service-profitability')
  serviceProfitability(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.serviceProfitability(
      new Date(from || '1970-01-01'),
      new Date(to || '2100-01-01'),
    );
  }

  @Get('inventory-balance')
  inventoryBalance() {
    return this.reportsService.inventoryBalance();
  }

  @Get('low-stock-alerts')
  lowStockAlerts() {
    return this.reportsService.lowStockAlerts();
  }

  @Get('warehouse-dashboard')
  warehouseDashboard() {
    return this.reportsService.warehouseDashboard();
  }

  @Get('margin-analysis')
  marginAnalysis(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.marginAnalysis(
      new Date(from || '1970-01-01'),
      new Date(to || '2100-01-01'),
    );
  }

  @Get('operation-log')
  operationLog(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.reportsService.operationLog({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      entityType,
      entityId,
    });
  }
}
