# JSON Transformer

Transform JSON structures with chainable API. Perfect for Ferrow data mapping.

```javascript
const transformer = new JSONTransformer()
  .pick(['name', 'email'])
  .map('email', e => e.toLowerCase());
```

Features: Chainable, recursive, streaming, Ferrow integration.
License: MIT
