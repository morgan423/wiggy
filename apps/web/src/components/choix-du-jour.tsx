'use client'

import { useRouter } from 'next/navigation'
import { SelecteurDate } from '@/components/trousse'

/**
 * Aller à une date, sur l'agenda comme sur la tournée.
 *
 * ⚠️ **IL N'Y AVAIT QUE « VEILLE » ET « LENDEMAIN ».** Pour aller voir vendredi
 * prochain, c'était six taps. Les deux écrans lisaient déjà une date en
 * paramètre — `?le=AAAA-MM-JJ` — il ne manquait que le moyen d'en choisir une.
 *
 * Le calendrier est celui de la trousse : lundi en première colonne, et pas le
 * sélecteur du système, qui appartient à l'appareil et non au produit. Les
 * flèches restent : d'un jour à l'autre, un tap vaut mieux qu'un calendrier.
 */
export function ChoixDuJour({
  chemin,
  jour,
  autres,
}: {
  /** `/app/agenda` ou `/app/tournee`. */
  chemin: string
  /** Le jour affiché, au format `AAAA-MM-JJ`. */
  jour: string
  /** Ce qu'il faut garder de l'adresse en changeant de date, comme la vue. */
  autres?: Record<string, string>
}) {
  const router = useRouter()

  return (
    <SelecteurDate
      id="choix-du-jour"
      label="Aller à une date"
      valeur={jour}
      onValeur={(valeur) => {
        if (!valeur) return
        const parametres = new URLSearchParams({ ...autres, le: valeur })
        router.push(`${chemin}?${parametres.toString()}`)
      }}
    />
  )
}
