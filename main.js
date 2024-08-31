const axios = require('axios');
const { faker } = require('@faker-js/faker');

// Credentials and other necessary variables
const accessToken = '6c69bfdce978f2af81ce7ea27b307159fb1b5a623e1ed25bc03db6d87bbc4f7a6066f489b2f23def39796e4e98323903';
const lockdownToken = 's5MNWtjTM5TvCMkAzxov';
const identifier = 'QgrpJOPPMWM7AC72mhW-J';
const initialBetAmount = 0.05; // Initial bet amount in USDT
const maxBetAmount = 5.00; // Maximum bet amount before resetting
let betAmount = initialBetAmount;
let target = 50.5;
let condition = 'above'; // Initial condition can be 'above' or 'below'

// Function to generate random browser details
const generateBrowserHeaders = () => {
  const browsers = ['Chrome', 'Firefox', 'Edge', 'Safari'];
  const platforms = ['Windows', 'Macintosh', 'Linux'];

  const browser = browsers[Math.floor(Math.random() * browsers.length)];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];

  const version = faker.number.int({ min: 80, max: 128 });
  const userAgent = `${browser}/${version}.0 (${platform}; ${faker.system.cpuArchitecture()}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.${faker.number.int(
    { min: 1000, max: 4000 }
  )}.0 Safari/537.36`;

  return {
    'User-Agent': userAgent,
    'sec-ch-ua': `"${browser}";v="${version}", "Not;A=Brand";v="24", "Google Chrome";v="${version}"`,
    'sec-ch-ua-arch': `"${faker.system.cpuArchitecture()}"`,
    'sec-ch-ua-bitness': `"${faker.number.int({ min: 32, max: 64 })}"`,
    'sec-ch-ua-full-version': `"${version}.0.0.0"`,
    'sec-ch-ua-full-version-list': `"${browser}";v="${version}.0.0.0", "Not;A=Brand";v="24.0.0.0", "Google Chrome";v="${version}.0.0.0"`,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-model': '""',
    'sec-ch-ua-platform': `"${platform}"`,
    'sec-ch-ua-platform-version': `"${faker.number.int({ min: 10, max: 15 })}.0.0"`,
    'Referer': 'https://stake.com/casino/games/dice',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'x-access-token': accessToken,
    'x-lockdown-token': lockdownToken,
    'content-type': 'application/json',
  };
};

const placeBet = async () => {
  const headers = generateBrowserHeaders();

  const query = `
    mutation DiceRoll($amount: Float!, $target: Float!, $condition: CasinoGameDiceConditionEnum!, $currency: CurrencyEnum!, $identifier: String!) {
      diceRoll(
        amount: $amount
        target: $target
        condition: $condition
        currency: $currency
        identifier: $identifier
      ) {
        ...CasinoBet
        state {
          ...CasinoGameDice
        }
      }
    }

    fragment CasinoBet on CasinoBet {
      id
      active
      payoutMultiplier
      amountMultiplier
      amount
      payout
      updatedAt
      currency
      game
      user {
        id
        name
      }
    }

    fragment CasinoGameDice on CasinoGameDice {
      result
      target
      condition
    }
  `;

  const variables = {
    amount: betAmount,
    target: target,
    condition: condition,
    currency: 'usdt',
    identifier: identifier,
  };

  try {
    const response = await axios.post(
      'https://stake.com/_api/graphql',
      {
        query,
        variables,
      },
      {
        headers: headers,
      }
    );

    return response.data.data.diceRoll;
  } catch (error) {
    console.error('Error placing bet:', error.response ? error.response.data : error.message);
    throw error;
  }
};

const run = async () => {
  while (true) {
    try {
      const betResult = await placeBet();
      const { payout, state } = betResult;
      const win = payout > 0;

      console.log(`Bet Result: ${state.result}, Target: ${state.target}, Condition: ${state.condition}, Win: ${win}`);

      if (win) {
        // On win, reset the bet amount and switch condition
        betAmount = initialBetAmount;
      } else {
        // On loss, double the bet amount
        betAmount *= 2;

        // If bet amount exceeds $5, reset it to $0.05
        if (betAmount > maxBetAmount) {
          console.log(`Bet amount exceeded ${maxBetAmount}. Resetting to ${initialBetAmount}.`);
          betAmount = initialBetAmount;
        }
      }

      // Switch condition
      condition = condition === 'above' ? 'below' : 'above';

      // Add a delay to avoid rate-limiting issues
      await new Promise((resolve) => setTimeout(resolve, 2000));

    } catch (error) {
      // Add a delay before retrying after an error
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

run();
