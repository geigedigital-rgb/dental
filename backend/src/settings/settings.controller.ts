import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SettingsService, InventorySettings } from './settings.service';
import { InventorySettingsDto } from './dto/inventory-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('inventory')
  getInventory(): Promise<InventorySettings> {
    return this.settingsService.getInventorySettings();
  }

  @Patch('inventory')
  patchInventory(@Body() body: InventorySettingsDto): Promise<InventorySettings> {
    return this.settingsService.setInventorySettings(body);
  }
}
