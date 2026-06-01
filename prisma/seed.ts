// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { LIBRARY_SCALES } from '../lib/seed-scales'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding library scales...')

  for (const scaleDef of LIBRARY_SCALES) {
    const existing = await prisma.scale.findFirst({
      where: { name: scaleDef.name, isLibrary: true },
    })
    if (existing) {
      console.log(`  Skipping ${scaleDef.name} (already exists)`)
      continue
    }

    await prisma.scale.create({
      data: {
        name: scaleDef.name,
        description: scaleDef.description,
        isLibrary: true,
        psychologistId: null,
        items: {
          create: scaleDef.items.map(item => ({
            order: item.order,
            text: item.text,
            type: item.type as any,
            required: true,
            options: {
              create: item.options.map(opt => ({
                label: opt.label,
                value: opt.value,
                order: opt.order,
              })),
            },
          })),
        },
        thresholds: {
          create: scaleDef.thresholds,
        },
      },
    })
    console.log(`  Seeded ${scaleDef.name}`)
  }

  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
