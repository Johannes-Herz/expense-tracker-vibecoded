import { Chart } from 'chart.js'
import { describe, expect, it } from 'vitest'
import './chartSetup' // must NOT rely on react-chartjs-2 to register the controllers (tree-shaken in production)

describe('chart setup', () => {
  it('registers every chart type the Stats tab uses', () => {
    for (const type of ['bar', 'line', 'doughnut']) expect(() => Chart.registry.getController(type)).not.toThrow()
  })
})
