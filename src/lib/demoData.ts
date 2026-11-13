import { addRecurring, db, type EntryType, type Expense } from '../db'
import { addMonths, currentMonth, daysInMonth, today } from './dates'

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1))
const euros = (min: number, max: number) => Math.round(rand(min, max) * 100) // → cents

/** Adds realistic sample income and expenses for the last 12 months (including this month up to today), plus a few category budgets. */
export async function loadDemoData(): Promise<number> {
  const categories = await db.categories.toArray()
  if (categories.length === 0) return 0
  // Look up by default name and type; fall back to the first category of that type if it was renamed/deleted.
  const idOf = (name: string, type: EntryType = 'expense') => {
    const ofType = categories.filter((c) => c.type === type)
    return (ofType.find((c) => c.name === name) ?? ofType[0] ?? categories[0]).id
  }

  const todayStr = today()
  const items: Omit<Expense, 'id'>[] = []
  const addEntry = (type: EntryType, month: string, day: number, category: string, amountCents: number, note?: string) => {
    const date = `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, '0')}`
    if (date > todayStr) return // nothing in the future
    items.push({ type, amountCents, categoryId: idOf(category, type), date, note, createdAt: Date.now() + items.length })
  }
  const add = (month: string, day: number, category: string, amountCents: number, note?: string) =>
    addEntry('expense', month, day, category, amountCents, note)

  for (let i = -11; i <= 0; i++) {
    const m = addMonths(currentMonth(), i)
    const anyDay = () => randInt(1, 28)

    add(m, 3, 'Housing', euros(55, 85), 'Strom & Internet')

    for (let n = 0; n < randInt(7, 10); n++) add(m, anyDay(), 'Groceries', euros(8, 75), pick(['Supermarkt', 'Bäcker', 'Wochenmarkt', undefined]))
    for (let n = 0; n < randInt(4, 8); n++) add(m, anyDay(), 'Eating out', euros(6, 48), pick(['Mittagessen', 'Café', 'Pizza', 'Restaurant', undefined]))
    for (let n = 0; n < randInt(2, 4); n++) add(m, anyDay(), 'Transport', euros(3, 45), pick(['Bahn', 'Tanken', 'Bus', undefined]))
    for (let n = 0; n < randInt(1, 3); n++) add(m, anyDay(), 'Shopping', euros(15, 120), pick(['Kleidung', 'Elektronik', 'Geschenk', undefined]))
    for (let n = 0; n < randInt(1, 3); n++) add(m, anyDay(), 'Leisure', euros(8, 60), pick(['Kino', 'Konzert', 'Sport', undefined]))
    if (Math.random() < 0.5) add(m, anyDay(), 'Health', euros(5, 60), pick(['Apotheke', 'Arzt', undefined]))
    if (Math.random() < 0.15) add(m, anyDay(), 'Travel', euros(120, 600), pick(['Hotel', 'Flug', 'Wochenendtrip']))
    if (Math.random() < 0.5) add(m, anyDay(), 'Other', euros(5, 40))

    // Occasional income on top of the monthly salary (a recurring series, see below).
    if (Math.random() < 0.12) addEntry('income', m, anyDay(), 'Family', euros(100, 300), pick(['Geschenk von den Eltern', 'Oma', 'Zuschuss']))
    if (Math.random() < 0.1) addEntry('income', m, anyDay(), 'Refunds', euros(10, 90), pick(['Rückerstattung', 'Retoure']))
    if (Math.random() < 0.15) addEntry('income', m, anyDay(), 'Side income', euros(60, 250), pick(['Nebenjob', 'Nachhilfe', 'Verkauf']))
  }

  await db.expenses.bulkAdd(items as Expense[])

  // Fixed costs are recurring series; the generator creates their expenses for the past 12 months.
  const expensesBefore = await db.expenses.count()
  const firstMonth = addMonths(currentMonth(), -11)
  const series = [
    { type: 'income', category: 'Salary', amountCents: 240000, note: 'Gehalt', frequency: 'monthly', startDate: `${firstMonth}-01` },
    { type: 'expense', category: 'Housing', amountCents: 72000, note: 'Miete', frequency: 'monthly', startDate: `${firstMonth}-01` },
    { type: 'expense', category: 'Subscriptions', amountCents: 1299, note: 'Streaming', frequency: 'monthly', startDate: `${firstMonth}-05` },
    { type: 'expense', category: 'Subscriptions', amountCents: 1099, note: 'Musik', frequency: 'monthly', startDate: `${firstMonth}-08` },
    { type: 'expense', category: 'Other', amountCents: 24000, note: 'Haftpflichtversicherung', frequency: 'yearly', startDate: `${addMonths(currentMonth(), -5)}-15` },
  ] as const
  for (const { category, ...rest } of series) {
    await addRecurring({ ...rest, categoryId: idOf(category, rest.type), interval: 1 }, true)
  }

  // A few monthly category budgets (for the Stats tab).
  for (const [name, budgetCents] of [['Eating out', 15000], ['Shopping', 10000], ['Leisure', 8000]] as const) {
    await db.categories.update(idOf(name), { budgetCents })
  }
  return items.length + (await db.expenses.count()) - expensesBefore
}

function pick<T>(list: T[]): T {
  return list[randInt(0, list.length - 1)]
}
