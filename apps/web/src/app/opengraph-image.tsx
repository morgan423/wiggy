import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import tokens from '@wiggy/tokens/json' with { type: 'json' }

/**
 * Image de partage — 1200 × 630.
 *
 * Baseline corrigée : « pour les coiffeuses & coiffeurs à domicile » remplace
 * « pour les pros de la beauté à domicile ». Le métier se nomme, il ne se
 * dilue pas dans une catégorie — c'est le segment délaissé qu'on adresse.
 *
 * Générée par le code plutôt qu'exportée en PNG : le claim et la baseline sont
 * du contenu, ils bougeront. Une image figée dans `assets/` ne bouge pas.
 */

export const alt = 'Wiggy : l’agenda des coiffeuses et coiffeurs à domicile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const C = tokens.couleur

export default async function Image() {
  const polices = join(process.cwd(), 'src/app/_polices')
  const [fraunces, jakarta] = await Promise.all([
    readFile(join(polices, 'fraunces-700.ttf')),
    readFile(join(polices, 'jakarta-600.ttf')),
  ])

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        // Ratio inversé : la pleine couleur domine, la crème respire.
        background: C.prune.valeur,
        padding: '72px 80px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 999,
            background: C.action.valeur,
            color: C.surface.valeur,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Fraunces',
            fontSize: 40,
          }}
        >
          W
        </div>
        <div style={{ fontFamily: 'Fraunces', fontSize: 44, color: C.fond.valeur }}>Wiggy</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            fontFamily: 'Fraunces',
            fontSize: 104,
            lineHeight: 0.9,
            color: C.fond.valeur,
            letterSpacing: '-0.02em',
          }}
        >
          Tes journées, bouclées.
        </div>
        <div
          style={{
            fontFamily: 'Jakarta',
            fontSize: 30,
            color: C.celebration.valeur,
            maxWidth: 900,
          }}
        >
          L’agenda qui tourne en tournées, pour les coiffeuses &amp; coiffeurs à domicile.
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Fraunces', data: fraunces, weight: 700, style: 'normal' },
        { name: 'Jakarta', data: jakarta, weight: 600, style: 'normal' },
      ],
    },
  )
}
