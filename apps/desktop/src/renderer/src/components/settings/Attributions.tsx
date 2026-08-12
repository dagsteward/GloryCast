/**
 * Third-party data attributions.
 *
 * Several datasets GloryCast ships are licensed CC-BY or CC-BY-SA, which make
 * visible attribution a CONDITION of use — not a courtesy. This panel is how
 * that condition is met, so it must stay reachable in the shipped product and
 * must list every dataset that carries an attribution requirement.
 *
 * If you add a dataset, add it here. If you remove one, remove it here.
 */

export interface Attribution {
  /** What it powers, in the user's language rather than the file name. */
  feature: string
  title: string
  source: string
  url: string
  licence: string
  /** Extra obligations worth surfacing to whoever maintains this. */
  note?: string
}

export const ATTRIBUTIONS: Attribution[] = [
  {
    feature: 'Bible text',
    title: 'World English Bible (WEB)',
    source: 'eBible.org',
    url: 'https://ebible.org/web/',
    licence: 'Public domain',
  },
  {
    feature: 'Bible text',
    title: 'King James Version (KJV)',
    source: 'Public domain',
    url: 'https://ebible.org/kjv/',
    licence: 'Public domain',
  },
  {
    feature: 'Cross-references',
    title: 'Cross-reference dataset (344,800 references)',
    source: 'OpenBible.info',
    url: 'https://www.openbible.info/labs/cross-references/',
    licence: 'CC BY 4.0',
  },
  {
    feature: 'Topical index',
    title: 'Topical index (6,711 topics)',
    source: 'OpenBible.info',
    url: 'https://www.openbible.info/topics/',
    licence: 'CC BY 4.0',
    note: 'Community-scored topical index — not Nave’s Topical Bible.',
  },
  {
    feature: 'Strong’s numbers',
    title: 'Strong’s Greek & Hebrew dictionaries (14,177 entries)',
    source: 'Open Scriptures',
    url: 'https://github.com/openscriptures/strongs',
    licence: 'CC BY-SA 4.0',
    note:
      'Share-alike: Strong’s Concordance itself (1890) is public domain, but this ' +
      'JSON compilation is CC BY-SA. Redistributing a MODIFIED dataset obliges you ' +
      'to license that derivative under CC BY-SA too. Bundling it unmodified is fine.',
  },
  {
    feature: 'Speech recognition',
    title: 'whisper.cpp',
    source: 'Georgi Gerganov and contributors',
    url: 'https://github.com/ggerganov/whisper.cpp',
    licence: 'MIT',
  },
  {
    feature: 'Online translations',
    title: 'API.Bible',
    source: 'American Bible Society',
    url: 'https://scripture.api.bible/',
    licence: 'Per ABS API terms',
    note:
      'Accessed with the operator’s own API key under their own agreement with ABS. ' +
      'GloryCast redistributes no text obtained this way.',
  },
]

export function Attributions() {
  const open = (url: string) => window.glorycast?.shell.openExternal(url)

  return (
    <div className="space-y-2">
      <p className="text-xs text-white/50 leading-relaxed mb-3">
        GloryCast includes data from the projects below. Attribution is a condition of
        several of these licences, so this list ships with the product.
      </p>

      {ATTRIBUTIONS.map(a => (
        <div
          key={`${a.feature}-${a.title}`}
          className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]"
        >
          <div className="flex items-start gap-3">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-300 mt-0.5 w-24 shrink-0">
              {a.feature}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-white/85">{a.title}</div>
              <div className="text-[10.5px] text-white/45">
                {a.source} ·{' '}
                <button
                  onClick={() => open(a.url)}
                  className="text-purple-300/80 hover:text-purple-200 underline underline-offset-2"
                >
                  {a.url.replace(/^https?:\/\//, '')}
                </button>
              </div>
              {a.note && (
                <div className="text-[10px] text-white/40 mt-1 leading-relaxed">{a.note}</div>
              )}
            </div>
            <span className="text-[9.5px] font-mono text-white/50 shrink-0">{a.licence}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
