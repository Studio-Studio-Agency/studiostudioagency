/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

interface CategoryStat {
  name: string;
  count: number;
  spent: number;
}

interface MonthSummaryProps {
  vorname: string;
  monthLabel: string;
  totalItems: number;
  totalSpent: number;
  topCategories: CategoryStat[];
  monthlyBudget?: number | null;
  unsubscribeUrl: string;
}

const MonthSummaryEmail = ({ vorname, monthLabel, totalItems, totalSpent, topCategories, monthlyBudget, unsubscribeUrl }: MonthSummaryProps) => (
  <html>
    <body style={{ margin: 0, padding: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f8f9fa' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: 24 }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px' }}>
            📊 Monatszusammenfassung
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px' }}>
            {monthLabel} · Hallo {vorname || 'dort'}!
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, backgroundColor: '#f0f9ff', borderRadius: 8, padding: 16, textAlign: 'center' as const }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>{totalItems}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Artikel gekauft</div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#f0fdf4', borderRadius: 8, padding: 16, textAlign: 'center' as const }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a2e' }}>
                {totalSpent > 0 ? `CHF ${totalSpent.toFixed(0)}` : '–'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Ausgaben</div>
            </div>
          </div>

          {monthlyBudget && monthlyBudget > 0 && (
            <div style={{
              backgroundColor: totalSpent > monthlyBudget ? '#fef2f2' : '#f0fdf4',
              borderRadius: 8,
              padding: 12,
              marginBottom: 24,
              fontSize: 14,
              color: totalSpent > monthlyBudget ? '#dc2626' : '#16a34a',
              fontWeight: 600,
            }}>
              {totalSpent > monthlyBudget
                ? `⚠️ Budget überschritten: CHF ${totalSpent.toFixed(0)} von ${monthlyBudget.toFixed(0)}`
                : `✅ Im Budget: CHF ${totalSpent.toFixed(0)} von ${monthlyBudget.toFixed(0)}`
              }
            </div>
          )}

          {topCategories.length > 0 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', margin: '0 0 12px' }}>
                Top-Kategorien
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <tbody>
                  {topCategories.slice(0, 5).map((cat, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 0', fontSize: 14, color: '#374151' }}>{cat.name}</td>
                      <td style={{ padding: '8px 0', fontSize: 14, color: '#6b7280', textAlign: 'right' as const }}>{cat.count} Artikel</td>
                      {cat.spent > 0 && (
                        <td style={{ padding: '8px 0', fontSize: 14, color: '#6b7280', textAlign: 'right' as const }}>CHF {cat.spent.toFixed(0)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <p style={{ fontSize: 13, color: '#9ca3af', margin: '24px 0 0', textAlign: 'center' as const }}>
            <a href={unsubscribeUrl} style={{ color: '#9ca3af' }}>Abmelden</a>
          </p>
        </div>
      </div>
    </body>
  </html>
)

export const template = {
  component: MonthSummaryEmail,
  subject: (data: Record<string, any>) => `📊 Deine Monatszusammenfassung – ${data.monthLabel}`,
  displayName: 'Monatszusammenfassung',
  previewData: {
    vorname: 'Max',
    monthLabel: 'März 2026',
    totalItems: 47,
    totalSpent: 312.50,
    topCategories: [
      { name: 'Milchprodukte', count: 12, spent: 45 },
      { name: 'Obst & Früchte', count: 10, spent: 32 },
      { name: 'Getränke', count: 8, spent: 28 },
    ],
    monthlyBudget: 400,
    unsubscribeUrl: '#',
  },
}
