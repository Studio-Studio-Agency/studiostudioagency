/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Login-Link für bling</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://itxpdoppymvbotsiutea.supabase.co/storage/v1/object/public/email-assets/goodgoods-logo.svg"
          width="140"
          height="28"
          alt="bling"
          style={logo}
        />
        <Heading style={h1}>Dein Login-Link</Heading>
        <Text style={text}>
          Klicke auf den Button unten, um dich bei bling anzumelden.
          Dieser Link ist nur kurze Zeit gültig.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Jetzt anmelden
        </Button>
        <Text style={footer}>
          Falls du diesen Link nicht angefordert hast, kannst du diese E-Mail ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '40px 25px' }
const logo = { margin: '0 0 30px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1f2937',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#4b5563',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#4CAF50',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#9ca3af', margin: '35px 0 0' }