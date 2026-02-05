import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });
  const managerRole = await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: { name: 'manager' },
  });
  const doctorRole = await prisma.role.upsert({
    where: { name: 'doctor' },
    update: {},
    create: { name: 'doctor' },
  });
  const viewerRole = await prisma.role.upsert({
    where: { name: 'viewer' },
    update: {},
    create: { name: 'viewer' },
  });

  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@clinic.local' },
    update: {},
    create: {
      email: 'admin@clinic.local',
      passwordHash: hash,
      fullName: 'Администратор',
      roleId: adminRole.id,
    },
  });

  // Классификация типов материалов (стоматология)
  const typeAdhesiveTotal = await prisma.materialType.upsert({
    where: { id: '10000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Адгезив тотальное протравливание',
      description: 'Сначала кислота, затем адгезив. Примеры: OptiBond FL, Adper Single Bond 2',
      sortOrder: 10,
    },
  });
  const typeAdhesiveSelf = await prisma.materialType.upsert({
    where: { id: '10000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'Адгезив самопротравливающий',
      description: 'Кислота в составе. Примеры: Clearfil SE Bond, G-ænial Bond',
      sortOrder: 20,
    },
  });
  const typeAdhesiveUniversal = await prisma.materialType.upsert({
    where: { id: '10000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000003',
      name: 'Адгезив универсальный',
      description: 'Универсальное применение. Примеры: Single Bond Universal, Peak Universal Bond',
      sortOrder: 30,
    },
  });
  const typeCementGIC = await prisma.materialType.upsert({
    where: { id: '10000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000004',
      name: 'Цемент стеклоиономерный (СИЦ)',
      description: 'Фиксация коронок, детская стоматология. Примеры: Fuji I (GC), Ketac Cem (3M)',
      sortOrder: 40,
    },
  });
  const typeCementCompositeDual = await prisma.materialType.upsert({
    where: { id: '10000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000005',
      name: 'Цемент композитный двойного отверждения',
      description: 'Примеры: RelyX U200, Maxcem Elite',
      sortOrder: 50,
    },
  });
  const typeCementCompositeLC = await prisma.materialType.upsert({
    where: { id: '10000000-0000-0000-0000-000000000006' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000006',
      name: 'Цемент композитный светового отверждения',
      description: 'Для виниров. Пример: Variolink Esthetic LC',
      sortOrder: 60,
    },
  });
  const typeCementZinc = await prisma.materialType.upsert({
    where: { id: '10000000-0000-0000-0000-000000000007' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000007',
      name: 'Цемент цинк-фосфатный',
      description: 'Временная/простая фиксация. Примеры: Adhesor, Унифас',
      sortOrder: 70,
    },
  });
  const typeCementTemp = await prisma.materialType.upsert({
    where: { id: '10000000-0000-0000-0000-000000000008' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000008',
      name: 'Цемент временный',
      description: 'Примеры: Temp-Bond, RelyX Temp NE',
      sortOrder: 80,
    },
  });
  const typeAnesthetic = await prisma.materialType.upsert({
    where: { id: '10000000-0000-0000-0000-000000000009' },
    update: {},
    create: {
      id: '10000000-0000-0000-0000-000000000009',
      name: 'Анестетики',
      sortOrder: 90,
    },
  });
  const typeOther = await prisma.materialType.findFirst({
    where: { name: 'Прочее' },
  }) ?? await prisma.materialType.create({
    data: { name: 'Прочее', sortOrder: 999 },
  });

  const { Decimal } = require('@prisma/client/runtime/library');

  // Библиотека материалов: реальные типичные позиции для стоматологии (UA/EU рынок)
  // unit = ед. учета (списания), purchaseUnit = ед. закупки, purchaseUnitRatio = в 1 закупке
  const mat1 = await prisma.material.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { materialTypeId: typeCementCompositeLC.id, unit: 'Шприц (шт)', purchaseUnit: 'Шприц', purchaseUnitRatio: new Decimal(1) },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Композит светового отверждения (пример)',
      materialTypeId: typeCementCompositeLC.id,
      unit: 'Шприц (шт)',
      purchaseUnit: 'Шприц',
      purchaseUnitRatio: new Decimal(1),
      minStockThreshold: 5,
      averageCost: 0,
    },
  });
  const mat2 = await prisma.material.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { materialTypeId: typeAdhesiveUniversal.id, unit: 'Флакон (шт)', purchaseUnit: 'Флакон', purchaseUnitRatio: new Decimal(1) },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Адгезив универсальный (пример)',
      materialTypeId: typeAdhesiveUniversal.id,
      unit: 'Флакон (шт)',
      purchaseUnit: 'Флакон',
      purchaseUnitRatio: new Decimal(1),
      minStockThreshold: 2,
      averageCost: 0,
    },
  });
  const mat3 = await prisma.material.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: { materialTypeId: typeAnesthetic.id, unit: 'Карпула (шт)', purchaseUnit: 'Коробка (50 карпул)', purchaseUnitRatio: new Decimal(50) },
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Лидокаин 2% (пример)',
      materialTypeId: typeAnesthetic.id,
      unit: 'Карпула (шт)',
      purchaseUnit: 'Коробка (50 карпул)',
      purchaseUnitRatio: new Decimal(50),
      minStockThreshold: 20,
      averageCost: 0,
    },
  });

  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000001' },
    update: { unit: 'Флакон (шт)', purchaseUnit: 'Флакон', purchaseUnitRatio: new Decimal(1) },
    create: {
      id: '30000000-0000-0000-0000-000000000001',
      name: 'Single Bond Universal (3M)',
      materialTypeId: typeAdhesiveUniversal.id,
      unit: 'Флакон (шт)',
      purchaseUnit: 'Флакон',
      purchaseUnitRatio: new Decimal(1),
      country: 'США',
      description: 'Универсальный бонд 8-го поколения',
      minStockThreshold: 2,
      averageCost: 0,
    },
  });
  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000002' },
    update: { unit: 'Флакон (шт)', purchaseUnit: 'Флакон', purchaseUnitRatio: new Decimal(1) },
    create: {
      id: '30000000-0000-0000-0000-000000000002',
      name: 'OptiBond Solo Plus (Kerr)',
      materialTypeId: typeAdhesiveTotal.id,
      unit: 'Флакон (шт)',
      purchaseUnit: 'Флакон',
      purchaseUnitRatio: new Decimal(1),
      country: 'США',
      description: '5-е поколение (Total-Etch)',
      minStockThreshold: 2,
      averageCost: 0,
    },
  });
  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000003' },
    update: { unit: 'Набор (шт)', purchaseUnit: 'Набор', purchaseUnitRatio: new Decimal(1) },
    create: {
      id: '30000000-0000-0000-0000-000000000003',
      name: 'Fuji I (GC)',
      materialTypeId: typeCementGIC.id,
      unit: 'Набор (шт)',
      purchaseUnit: 'Набор',
      purchaseUnitRatio: new Decimal(1),
      country: 'Япония',
      description: 'СИЦ: фиксация коронок, вкладок',
      minStockThreshold: 1,
      averageCost: 0,
    },
  });
  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000004' },
    update: { unit: 'Шприц (шт)', purchaseUnit: 'Шприц', purchaseUnitRatio: new Decimal(1) },
    create: {
      id: '30000000-0000-0000-0000-000000000004',
      name: 'RelyX U200 Automix (3M)',
      materialTypeId: typeCementCompositeDual.id,
      unit: 'Шприц (шт)',
      purchaseUnit: 'Шприц',
      purchaseUnitRatio: new Decimal(1),
      country: 'США',
      description: 'Самоадгезивный цемент для циркония',
      minStockThreshold: 1,
      averageCost: 0,
    },
  });
  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000005' },
    update: { unit: 'Набор (шт)', purchaseUnit: 'Набор', purchaseUnitRatio: new Decimal(1) },
    create: {
      id: '30000000-0000-0000-0000-000000000005',
      name: 'Adhesor (SpofaDental)',
      materialTypeId: typeCementZinc.id,
      unit: 'Набор (шт)',
      purchaseUnit: 'Набор',
      purchaseUnitRatio: new Decimal(1),
      country: 'Чехия',
      description: 'Цинк-фосфатный цемент',
      minStockThreshold: 1,
      averageCost: 0,
    },
  });
  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000006' },
    update: { unit: 'Карпула (шт)', purchaseUnit: 'Банка (50 карпул)', purchaseUnitRatio: new Decimal(50) },
    create: {
      id: '30000000-0000-0000-0000-000000000006',
      name: 'Ubistesin Forte (3M)',
      materialTypeId: typeAnesthetic.id,
      unit: 'Карпула (шт)',
      purchaseUnit: 'Банка (50 карпул)',
      purchaseUnitRatio: new Decimal(50),
      country: 'Германия',
      description: 'Артикаин 4% + адреналин 1:100 000',
      minStockThreshold: 10,
      averageCost: 0,
    },
  });
  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000007' },
    update: { unit: 'Карпула (шт)', purchaseUnit: 'Коробка (50 карпул)', purchaseUnitRatio: new Decimal(50) },
    create: {
      id: '30000000-0000-0000-0000-000000000007',
      name: 'Septanest (Septodont)',
      materialTypeId: typeAnesthetic.id,
      unit: 'Карпула (шт)',
      purchaseUnit: 'Коробка (50 карпул)',
      purchaseUnitRatio: new Decimal(50),
      country: 'Франция',
      description: 'Артикаин 4%, 1:200 000 или 1:100 000',
      minStockThreshold: 10,
      averageCost: 0,
    },
  });
  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000008' },
    update: { unit: 'Карпула (шт)', purchaseUnit: 'Коробка (50 карпул)', purchaseUnitRatio: new Decimal(50) },
    create: {
      id: '30000000-0000-0000-0000-000000000008',
      name: 'Scandonest 3% (Septodont)',
      materialTypeId: typeAnesthetic.id,
      unit: 'Карпула (шт)',
      purchaseUnit: 'Коробка (50 карпул)',
      purchaseUnitRatio: new Decimal(50),
      country: 'Франция',
      description: 'Мепивакаин без вазоконстриктора',
      minStockThreshold: 10,
      averageCost: 0,
    },
  });
  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000009' },
    update: {},
    create: {
      id: '30000000-0000-0000-0000-000000000009',
      name: 'Temp-Bond NE (Kerr)',
      materialTypeId: typeCementTemp.id,
      unit: 'Шприц (шт)',
      purchaseUnit: 'Шприц',
      purchaseUnitRatio: new Decimal(1),
      country: 'США',
      description: 'Временный цемент без эвгенола',
      minStockThreshold: 1,
      averageCost: 0,
    },
  });
  await prisma.material.upsert({
    where: { id: '30000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '30000000-0000-0000-0000-000000000010',
      name: 'G-ænial Bond (GC)',
      materialTypeId: typeAdhesiveSelf.id,
      unit: 'Флакон (шт)',
      purchaseUnit: 'Флакон',
      purchaseUnitRatio: new Decimal(1),
      country: 'Япония',
      description: 'Самопротравливающий адгезив',
      minStockThreshold: 2,
      averageCost: 0,
    },
  });

  await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'ООО Стома-Снаб',
      contactInfo: 'тел: +7 (495) 123-45-67, email: info@stoma.ru',
    },
  });
  await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Денталюкс (Украина)',
      contactInfo: 'тел: +380 (44) 123-45-67, Київ, вул. Хрещатик 1, email: office@dentalux.ua',
    },
  });
  await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      name: 'Стоматлайн Україна',
      contactInfo: 'тел: +380 (57) 700-00-00, Харків, email: info@stomatline.ua',
    },
  });
  await prisma.supplier.upsert({
    where: { id: '00000000-0000-0000-0000-000000000013' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000013',
      name: 'Henry Schein (Europe)',
      contactInfo: 'EU distribution, tel: +32 2 722 50 00, email: info@henryschein.eu',
    },
  });

  const serviceFilling = await prisma.service.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      name: 'Пломбирование',
      description: 'Пломбирование зуба композитом',
      basePrice: 3500,
    },
  });
  await prisma.serviceMaterial.upsert({
    where: {
      serviceId_materialId: {
        serviceId: serviceFilling.id,
        materialId: mat1.id,
      },
    },
    update: {},
    create: {
      serviceId: serviceFilling.id,
      materialId: mat1.id,
      quantity: new Decimal(1),
    },
  });
  await prisma.serviceMaterial.upsert({
    where: {
      serviceId_materialId: {
        serviceId: serviceFilling.id,
        materialId: mat2.id,
      },
    },
    update: {},
    create: {
      serviceId: serviceFilling.id,
      materialId: mat2.id,
      quantity: new Decimal(0.1),
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
