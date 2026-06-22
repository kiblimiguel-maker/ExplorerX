import { fireEvent, render, screen } from '@testing-library/react'
import Filters from './Filters'

it('focuses the discovery search with the platform shortcut', () => {
  render(<Filters query="" onQuery={() => undefined} category="Alle" onCategory={() => undefined}/>)
  fireEvent.keyDown(window, { key: 'k', metaKey: true })
  expect(screen.getByRole('textbox', { name: 'Orte suchen' })).toHaveFocus()
})

it('keeps the compact category set focused on the primary choices', () => {
  render(<Filters compactCategories query="" onQuery={() => undefined} category="Alle" onCategory={() => undefined}/>)
  expect(screen.getByRole('button', { name: 'Baden' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Essen' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Schule' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Treffpunkt' })).not.toBeInTheDocument()
})
