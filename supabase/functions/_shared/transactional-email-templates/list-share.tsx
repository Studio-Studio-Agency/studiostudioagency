import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "goodgoods"

interface ListShareProps {
  senderName?: string
  listName?: string
  itemCount?: number
  downloadUrl?: string
}

const ListShareEmail = ({ senderName, listName, itemCount, downloadUrl }: ListShareProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>{senderName ? `${senderName} hat` : 'Jemand hat'} dir eine Einkaufsliste geschickt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          📋 Einkaufsliste erhalten
        </Heading>
        <Text style={text}>
          {senderName ? `${senderName} hat` : 'Jemand hat'} dir die Einkaufsliste
          {listName ? ` «${listName}»` : ''} geschickt
          {itemCount ? ` (${itemCount} Artikel)` : ''}.
        </Text>
        {downloadUrl && (
          <Button style={button} href={downloadUrl}>
            PDF herunterladen
          </Button>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          Diese E-Mail wurde über {SITE_NAME} versendet.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ListShareEmail,
  subject: (data: Record<string, any>) =>
    data.listName ? `Einkaufsliste: ${data.listName}` : 'Eine Einkaufsliste für dich',
  displayName: 'Einkaufsliste teilen',
  previewData: {
    senderName: 'Max',
    listName: 'Wocheneinkauf',
    itemCount: 12,
    downloadUrl: 'https://example.com/download.pdf',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#3d3d3d', lineHeight: '1.6', margin: '0 0 24px' }
const button = {
  backgroundColor: '#3da349',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const hr = { borderColor: '#e5e5e5', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
