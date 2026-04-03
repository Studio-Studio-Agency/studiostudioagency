import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "GoodGoods"
const LOGO_URL = "https://itxpdoppymvbotsiutea.supabase.co/storage/v1/object/public/email-assets/goodgoods-logo.svg"

interface ExpiryReminderProps {
  vorname?: string
  items?: Array<{ name: string; ablauf_datum: string; tage: number }>
}

const ExpiryReminderEmail = ({ vorname, items = [] }: ExpiryReminderProps) => {
  const expiredItems = items.filter(i => i.tage <= 0)
  const soonItems = items.filter(i => i.tage > 0)

  return (
    <Html lang="de" dir="ltr">
      <Head />
      <Preview>
        {expiredItems.length > 0
          ? `${expiredItems.length} Lebensmittel abgelaufen!`
          : `${soonItems.length} Lebensmittel laufen bald ab`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} width="140" height="28" alt="GoodGoods" style={logo} />
          <Heading style={h1}>
            {vorname ? `Hallo ${vorname}! 👋` : 'Hallo! 👋'}
          </Heading>
          <Text style={text}>
            Hier ist deine tägliche Haltbarkeits-Übersicht:
          </Text>

          {expiredItems.length > 0 && (
            <>
              <Text style={sectionTitle}>🔴 Abgelaufen</Text>
              {expiredItems.map((item, i) => (
                <Text key={i} style={itemRow}>
                  <strong>{item.name}</strong> — seit {Math.abs(item.tage)} {Math.abs(item.tage) === 1 ? 'Tag' : 'Tagen'}
                </Text>
              ))}
            </>
          )}

          {soonItems.length > 0 && (
            <>
              <Text style={sectionTitle}>
                {soonItems.some(i => i.tage <= 2) ? '🟠' : '🟡'} Läuft bald ab
              </Text>
              {soonItems.map((item, i) => (
                <Text key={i} style={itemRow}>
                  <strong>{item.name}</strong> — noch {item.tage} {item.tage === 1 ? 'Tag' : 'Tage'} (bis {item.ablauf_datum})
                </Text>
              ))}
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Du erhältst diese E-Mail, weil du Haltbarkeits-Benachrichtigungen in {SITE_NAME} aktiviert hast.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ExpiryReminderEmail,
  subject: (data: Record<string, any>) => {
    const items = data?.items ?? []
    const expired = items.filter((i: any) => i.tage <= 0).length
    if (expired > 0) return `⚠️ ${expired} Lebensmittel abgelaufen!`
    return `${items.length} Lebensmittel laufen bald ab`
  },
  displayName: 'Haltbarkeits-Erinnerung',
  previewData: {
    vorname: 'Anna',
    items: [
      { name: 'Milch', ablauf_datum: '03.04.2026', tage: 0 },
      { name: 'Joghurt', ablauf_datum: '05.04.2026', tage: 2 },
      { name: 'Käse', ablauf_datum: '07.04.2026', tage: 4 },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 25px' }
const logo = { margin: '0 0 30px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f2937', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 25px' }
const sectionTitle = { fontSize: '16px', fontWeight: '600' as const, color: '#1f2937', margin: '20px 0 8px' }
const itemRow = { fontSize: '14px', color: '#4b5563', margin: '4px 0', paddingLeft: '8px' }
const hr = { borderColor: '#e5e7eb', margin: '30px 0' }
const footer = { fontSize: '13px', color: '#9ca3af', margin: '0' }
