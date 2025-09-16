const sum_to_n_a = (num) => {
  const numList = [...Array(num).keys()]; // [0..,num-1]
  const result = numList
    .map((num) => num + 1)
    .reduce((prev, cur) => prev + cur, 0);
  return result;
};

const sum_to_n_b = (num) => {
  let sum = 0;
  for (let i = 1; i <= num; i++) {
    sum += i;
  }
  return sum;
};

const sum_to_n_c = (num) => {
  return (num * (num + 1)) / 2;
};

console.log(sum_to_n_c(5));
