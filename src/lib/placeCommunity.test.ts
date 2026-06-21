import { formatFriendVisits } from './placeCommunity'

const profile = (id: string, display_name: string) => ({ id, display_name, avatar_url: null })

it('formats friends who visited without inventing names', () => {
  expect(formatFriendVisits([])).toBe('')
  expect(formatFriendVisits([profile('1', 'Max')])).toBe('Max war hier')
  expect(formatFriendVisits([profile('1', 'Max'), profile('2', 'Leo')])).toBe('Max und Leo waren hier')
  expect(formatFriendVisits([profile('1', 'Max'), profile('2', 'Leo'), profile('3', 'Mia'), profile('4', 'Noa')])).toBe('Max, Leo und 2 weitere Personen waren hier')
})
