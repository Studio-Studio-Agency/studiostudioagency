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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Setze dein Passwort für GoodGoods zurück</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://itxpdoppymvbotsiutea.supabase.co/storage/v1/object/public/email-assets/goodgoods-logo.svg"
          width="140"
          height="28"
          alt="GoodGoods"
          style={logo}
        />
        <Heading style={h1}>Passwort zurücksetzen</Heading>
        <Text style={text}>
          Du hast angefordert, dein Passwort für GoodGoods zurückzusetzen. 
          Klicke auf den Button unten, um ein neues Passwort zu wählen.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Neues Passwort setzen
        </Button>
        <Text style={footer}>
          Falls du kein neues Passwort angefordert hast, kannst du diese E-Mail ignorieren. 
          Dein Passwort bleibt unverändert.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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