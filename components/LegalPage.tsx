import { LEGAL } from "@/lib/legal-info"

export type LegalSection = {
  title: string
  paragraphs?: string[]
  items?: string[]
}

/** Replaces {name}, {orgNr}, {email}, ... tokens with the values in LEGAL. */
function fill(text: string) {
  return text
    .replaceAll("{service}", LEGAL.service)
    .replaceAll("{name}", LEGAL.name)
    .replaceAll("{orgNr}", LEGAL.orgNr)
    .replaceAll("{address}", LEGAL.address)
    .replaceAll("{email}", LEGAL.email)
}

/**
 * Shared layout for the Terms and Privacy pages: title, last-updated
 * line, intro and numbered sections (paragraphs and/or bullet lists).
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-gray-500 mb-8">{updated}</p>
      <p className="mb-8 text-gray-700 leading-relaxed">{fill(intro)}</p>

      {sections.map((section, i) => (
        <section key={i} className="mb-8">
          <h2 className="text-lg font-semibold mb-2">
            {i + 1}. {fill(section.title)}
          </h2>
          {section.paragraphs?.map((p, j) => (
            <p key={j} className="mb-3 text-gray-700 leading-relaxed">
              {fill(p)}
            </p>
          ))}
          {section.items && (
            <ul className="list-disc pl-6 space-y-1 text-gray-700 leading-relaxed">
              {section.items.map((item, j) => (
                <li key={j}>{fill(item)}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  )
}