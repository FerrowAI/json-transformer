const { transform } = require('../dist/index.js');

const input = {
  user: {
    id: 42,
    name: 'Ada Lovelace',
    email: 'ADA@Example.com',
    address: { city: 'London', zip: '10001' },
  },
  internal_id: 'do-not-expose',
  createdAt: '2026-01-01',
};

const result = transform()
  .omit(['internal_id'])
  .rename({ 'user.name': 'user.fullName' })
  .map('user.email', (e) => String(e).toLowerCase())
  .defaults({ 'user.address.country': 'UK' })
  .flatten()
  .run(input);

console.log(JSON.stringify(result, null, 2));

// confirm input was not mutated
console.log('input untouched:', input.internal_id === 'do-not-expose' && input.user.name === 'Ada Lovelace');

// unflatten back
const unflattened = transform().unflatten().run(result);
console.log(JSON.stringify(unflattened, null, 2));

// array + pick
const many = transform().pick(['user.fullName', 'user.address.city']).runMany([
  unflattened,
  { user: { fullName: 'Bob', address: { city: 'NYC' } } },
]);
console.log(many);
