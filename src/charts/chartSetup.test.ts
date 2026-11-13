import { Chart } from 'chart.js'
import { describe, expect, it } from 'vitest'
import { eurTooltip, euroValueLabel } from './chartSetup' // must NOT rely on react-chartjs-2 to register the controllers (tree-shaken in production)

describe('chart setup', () => {
  it('registers every chart type the Stats tab uses', () => {
    for (const type of ['bar', 'line', 'doughnut']) expect(() => Chart.registry.getController(type)).not.toThrow()
  })
})

describe('tooltip amounts', () => {
  const norm = (s: string) => s.replace(/\s/g, ' ') // the formatter uses non-breaking spaces

  it('euro-valued datasets show 418 € as 418,00 € (not 4,18 €)', () => {
    expect(norm(euroValueLabel({ dataset: { label: 'Einnahmen' }, parsed: { y: 418 } }))).toBe('Einnahmen: 418,00 €')
    expect(norm(euroValueLabel({ dataset: { label: 'Saldo' }, parsed: { y: -1234.5 } }))).toBe('Saldo: -1.234,50 €')
    expect(norm(euroValueLabel({ dataset: {}, parsed: { y: null } }))).toBe('0,00 €')
  })

  it('cent-valued datasets (doughnut) show 41800 cents as 418,00 €', () => {
    expect(norm(eurTooltip.callbacks.label({ dataset: { label: 'Housing' }, parsed: 41800 }))).toBe('Housing: 418,00 €')
  })
})
