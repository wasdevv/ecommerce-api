import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it('formats integer cents without float drift', () => {
    expect(pipe.transform(1999)).toBe('$19.99');
    expect(pipe.transform(10)).toBe('$0.10');
    expect(pipe.transform(0)).toBe('$0.00');
  });

  it('uses the currency the API reports', () => {
    expect(pipe.transform(4990, 'brl')).toBe('R$49.90');
  });
});
