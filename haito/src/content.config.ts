import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Wissensbereich. Laut Strategie der wichtigste Kanal im ersten Jahr —
 * das Schema ist deshalb streng: fehlende Pflichtfelder brechen den Build,
 * statt still eine unvollstaendige Seite auszuliefern.
 */
const wissen = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/wissen' }),
  schema: z.object({
    title: z.string().min(1).max(70),
    description: z.string().min(1).max(160),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),

    // TODO: Sobald content-brief.md vorliegt, durch z.enum([...]) mit den dort
    // definierten Themen ersetzen. Als freie Zeichenkette entstehen sonst
    // Dubletten wie «Datenschutz» / «datenschutz» / «Datenschutz & DSG».
    topic: z.string().min(1),

    /** Lesedauer in Minuten. */
    readingTime: z.number().int().positive(),

    draft: z.boolean().default(false),
  }),
});

export const collections = { wissen };
