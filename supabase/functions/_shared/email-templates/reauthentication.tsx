/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Dein Bestätigungscode für bling</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://itxpdoppymvbotsiutea.supabase.co/storage/v1/object/public/email-assets/goodgoods-logo.svg"
          width="140"
          height="28"
          alt="bling"
          style={logo}
        />
        <Heading style={h1}>Bestätigungscode</Heading>
        <Text style={text}>Verwende den folgenden Code, um deine Identität zu bestätigen:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Dieser Code ist nur kurze Zeit gültig. Falls du ihn nicht angefordert hast, 
          kannst du diese E-Mail ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#4CAF50',
  backgroundColor: '#f0fdf4',
  padding: '16px 24px',
  borderRadius: '12px',
  margin: '0 0 30px',
  display: 'inline-block' as const,
}
const footer = { fontSize: '13px', color: '#9ca3af', margin: '35px 0 0' }