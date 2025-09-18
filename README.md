This is work for the assignment from 99tech, frontend work
# A1
- Three ways of sum number from 0 to n:
  - Iteration from 0 to n, each time sum up the number : 1+2+3..n
  - Use high level function, reduce to sum up to the number n
  - user mathematical formula
# A2
## Simple Currency Converter

A simple React + TypeScript currency converter that fetches live token prices from [Switcheo API](https://interview.switcheo.com/prices.json).  
It allows users to convert between currencies, view conversion rates, and keep track of recent conversions using session storage.

---

##  Features
- Fetches real-time token prices
- Convert between different currencies
- Displays conversion rate and result
- Keeps the last 10 conversions in history (stored in session storage)
- Option to clear conversion history
- Handles loading and error states gracefully
- Responsive and styled with custom CSS
## Tech Stack
- [React](https://react.dev/) (with Hooks)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) – fast development server and build tool
- [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) – custom styling
- Fetch API – for retrieving live token prices
## Installation and run
- `git clone https://github.com/your-username/currency-converter.git`
- `cd currency-converter`
- `npm install`
- `npm run dev`
# A3
What I change in this assignment:
- create a map is faster to access than create a switch
- add blockchain prop to WalletBalance 
- add blockchain prop to FormattedWalletBalance
- put getPriorityOutside out the component so it will not be rerender when component is reloaded
- change `{ children,...rest }`to `{...rest}`because children is not used in the component
- enforce balances type to be WalletBalance[]
- enfoce prices type to be PricesMap
- change filter and sort logic to show balance with amount > 0 and priority > -99
- add the propType of FormattedWalletBalance to the variable to variable formattedBalances
- `balance.amount.toFixed(2)` to display balance amount as, eg: 100.00
- change type of sortedBalances to FormattedWalletBalance
- key of item in component should have a distict value, in this case is the currency of the balance
