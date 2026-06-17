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
      // Update content in-place: wipe items + thresholds (cascade deletes options)
      // then recreate them. The Scale row itself stays so existing sessions keep
      // their FK reference.
      await prisma.$transaction([
        prisma.scaleItem.deleteMany({ where: { scaleId: existing.id } }),
        prisma.severityThreshold.deleteMany({ where: { scaleId: existing.id } }),
        prisma.scale.update({
          where: { id: existing.id },
          data: { description: scaleDef.description },
        }),
      ])

      for (const item of scaleDef.items) {
        await prisma.scaleItem.create({
          data: {
            scaleId: existing.id,
            order: item.order,
            text: item.text,
            type: item.type as any,
            required: true,
            options: { create: item.options.map(o => ({ label: o.label, value: o.value, order: o.order })) },
          },
        })
      }
      await prisma.severityThreshold.createMany({
        data: scaleDef.thresholds.map(t => ({ ...t, scaleId: existing.id })),
      })
      console.log(`  Updated ${scaleDef.name}`)
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
