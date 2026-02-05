import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const INVENTORY_WRITE_OFF_METHOD = 'inventory.write_off_method'; // FIFO | AVERAGE
export const INVENTORY_LOT_TRACKING = 'inventory.lot_tracking'; // true | false
export const INVENTORY_EXPIRY_RULE = 'inventory.expiry_rule'; // FEFO | NONE

export type WriteOffMethod = 'FIFO' | 'AVERAGE';
export type ExpiryRule = 'FEFO' | 'NONE';

export interface InventorySettings {
  writeOffMethod: WriteOffMethod;
  lotTracking: boolean;
  expiryRule: ExpiryRule;
}

const DEFAULTS: InventorySettings = {
  writeOffMethod: 'AVERAGE',
  lotTracking: false,
  expiryRule: 'NONE',
};

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getString(key: string): Promise<string | null> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return row?.value ?? null;
  }

  async setString(key: string, value: string): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  async getInventorySettings(): Promise<InventorySettings> {
    const [method, lot, expiry] = await Promise.all([
      this.getString(INVENTORY_WRITE_OFF_METHOD),
      this.getString(INVENTORY_LOT_TRACKING),
      this.getString(INVENTORY_EXPIRY_RULE),
    ]);
    return {
      writeOffMethod: (method === 'FIFO' ? 'FIFO' : 'AVERAGE') as WriteOffMethod,
      lotTracking: lot === 'true',
      expiryRule: (expiry === 'FEFO' ? 'FEFO' : 'NONE') as ExpiryRule,
    };
  }

  async setInventorySettings(settings: Partial<InventorySettings>): Promise<InventorySettings> {
    const current = await this.getInventorySettings();
    const next = { ...current, ...settings };
    await Promise.all([
      this.setString(INVENTORY_WRITE_OFF_METHOD, next.writeOffMethod),
      this.setString(INVENTORY_LOT_TRACKING, next.lotTracking ? 'true' : 'false'),
      this.setString(INVENTORY_EXPIRY_RULE, next.expiryRule),
    ]);
    return next;
  }
}
