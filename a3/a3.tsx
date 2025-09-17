import React, { useMemo } from "react";

// create a map is faster to access than create a switch
type KNOWNCRYPTO = "Osmosis" | "Ethereum" | "Arbitrum" | "Zilliqa" | "Neo";

const PRIORITY: Record<string, number> = {
  Osmosis: 100,
  Ethereum: 50,
  Arbitrum: 30,
  Zilliqa: 20,
  Neo: 20,
};

interface WalletBalance {
  currency: string;
  amount: number;
  // missing blockchain prop
  blockchain: KNOWNCRYPTO | string;
}
// add blockchain property here
interface FormattedWalletBalance {
  currency: string;
  amount: number;
  blockchain: KNOWNCRYPTO | string;
  formatted: string;
}

type PricesMap = Record<string, number>; // usd, 1

interface Props extends BoxProps {}

// put it outside component so this function will not be removed
const getPriority = (blockchain: KNOWNCRYPTO | string): number => {
  return PRIORITY[blockchain] ?? -99;
};

const WalletPage: React.FC<Props> = (props: Props) => {
  const { ...rest } = props; // children is destructure but not used
  const balances = useWalletBalances() as WalletBalance[]; // enforce type
  const prices = usePrices() as PricesMap; //enforce type;

  // blockchain should have a better type than any >> String

  const sortedBalances = useMemo(() => {
    return balances
      .filter((balance: WalletBalance) => {
        const balancePriority = getPriority(balance.blockchain);
        //it should return balance with priority > -99 and amount >= 0
        return balancePriority > -99 && balance.amount >= 0;
      })
      .sort((lhs: WalletBalance, rhs: WalletBalance) => {
        const leftPriority = getPriority(lhs.blockchain);
        const rightPriority = getPriority(rhs.blockchain);
        return rightPriority - leftPriority;
      });
    // should only depend on balance, prices does not have any effect on balance
  }, [balances]);

  // add the propType of FormattedWalletBalance to the variable
  const formattedBalances = sortedBalances.map(
    (balance: WalletBalance): FormattedWalletBalance => {
      return {
        ...balance,
        formatted: balance.amount.toFixed(2), // should fix to 2 decimals, eg 10.50 usd
      };
    }
  );

  // sortedBalance is of type WalletBalance, but the mapping of it here is of type FormattedWalletBalance
  // should use fortmatedBalanced
  const rows = formattedBalances.map(
    (balance: FormattedWalletBalance, index: number) => {
      // must have null guard, in case prices is null
      const price = prices?.[balance.currency] ?? 0;
      const usdValue = price * balance.amount;
      return (
        <WalletRow
          // classes is undefined, best bet is to remove it
          // className={classes.row}
          // key should be some field tie to data, not on index of data in the list
          // key={index}
          key={balance.currency}
          amount={balance.amount}
          usdValue={usdValue}
          formattedAmount={balance.formatted}
        />
      );
    }
  );

  return <div {...rest}>{rows}</div>;
};
