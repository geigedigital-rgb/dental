import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateServiceSaleDto } from './dto/create-service-sale.dto';
import { UpdateServiceSaleDto } from './dto/update-service-sale.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';

@Controller('api/sales')
@UseGuards(OptionalJwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('service')
  createServiceSale(@Body() dto: CreateServiceSaleDto, @Req() req: { user?: { id: string; email?: string } }) {
    return this.salesService.registerServiceSale(dto, req.user?.id);
  }

  @Get('service')
  getServiceSales(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.salesService.getServiceSales({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      serviceId,
    });
  }

  @Get('service/:id')
  getServiceSale(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.getServiceSaleById(id);
  }

  @Patch('service/:id')
  updateServiceSale(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceSaleDto,
    @Req() req: { user?: { id: string; email?: string } },
  ) {
    return this.salesService.updateServiceSale(id, dto, req.user?.id);
  }

  @Delete('service/:id')
  deleteServiceSale(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user?: { id: string; email?: string } }) {
    return this.salesService.deleteServiceSale(id, req.user?.id);
  }
}
