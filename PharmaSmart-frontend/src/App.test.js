import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the PharmaSmart application', () => {
  render(<App />);
  expect(screen.getAllByText(/PharmaSmart/i).length).toBeGreaterThan(0);
});
