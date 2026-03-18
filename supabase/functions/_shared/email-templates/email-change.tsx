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
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Bestätige deine E-Mail-Änderung für bling</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://itxpdoppymvbotsiutea.supabase.co/storage/v1/object/public/email-assets/goodgoods-logo.svg"
          width="140"
          height="28"
          alt="bling"
          style={logo}
        />
        <Heading style={h1}>E-Mail-Adresse ändern</Heading>
        <Text style={text}>
          Du hast angefordert, deine E-Mail-Adresse für bling von{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          zu{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>{' '}
          zu ändern.
        </Text>
        <Text style={text}>
          Klicke auf den Button unten, um diese Änderung zu bestätigen:
        </Text>
        <Button style={button} href={confirmationUrl}>
          E-Mail-Änderung bestätigen
        </Button>
        <Text style={footer}>
          Falls du diese Änderung nicht angefordert hast, sichere bitte sofort dein Konto.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
const link = { color: '#4CAF50', textDecoration: 'underline' }
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