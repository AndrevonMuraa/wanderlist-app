// Country Fun Facts - "Did you know?" sections
// Interesting facts about each country to enhance exploration

export const COUNTRY_FUN_FACTS: { [key: string]: string[] } = {
  // Europe
  france: [
    "France is the most visited country in the world with over 89 million tourists annually!",
    "It's illegal to name a pig 'Napoleon' in France.",
    "The French invented the metric system, camera phone, and hair transplant.",
  ],
  italy: [
    "Italy has more UNESCO World Heritage Sites than any other country - 58 in total!",
    "Italians consume 25% of their body weight in pasta each year on average.",
    "The world's oldest university still in operation is in Bologna, founded in 1088.",
  ],
  spain: [
    "Spain produces 45% of the world's olive oil - more than any other country!",
    "The Spanish national anthem has no words - it's one of only 3 in the world.",
    "Spaniards eat dinner between 9pm-11pm - the latest dinner time in Europe!",
  ],
  
  // Asia
  japan: [
    "Japan has over 6,800 islands, but only about 430 are inhabited!",
    "There are more pets than children in Japan - seriously!",
    "Square watermelons were invented in Japan to save refrigerator space.",
  ],
  china: [
    "China consumes 1.6 billion pounds of pork per year - half the world's total!",
    "The Great Wall is NOT visible from space (that's a myth!).",
    "There are over 35 million more men than women in China.",
  ],
  
  // Americas  
  usa: [
    "The USA has no official language - English is just the most common!",
    "Alaska is simultaneously the northernmost, westernmost, AND easternmost state.",
    "Americans eat 100 acres of pizza every single day!",
  ],
  brazil: [
    "Brazil is named after a tree - the brazilwood tree that was heavily exported.",
    "The Amazon rainforest produces 20% of Earth's oxygen!",
    "Brazil has won the FIFA World Cup 5 times - more than any country.",
  ],
  
  // Africa
  egypt: [
    "The pyramids were built with 2.3 million stone blocks, each weighing 2.5 tons!",
    "Ancient Egyptians invented toothpaste, locks and keys, and breath mints.",
    "Cleopatra lived closer to the iPhone than to the pyramids (time-wise)!",
  ],
  south_africa: [
    "South Africa has 3 capital cities: Pretoria, Cape Town, and Bloemfontein!",
    "The world's largest diamond (3,106 carats) was found here in 1905.",
    "South Africa has 11 official languages - the most of any country!",
  ],
  
  // Oceania
  australia: [
    "Australia is wider than the moon - 4,000km vs 3,400km!",
    "Australians invented WiFi, Google Maps, and the black box flight recorder.",
    "There are 10 times more kangaroos than people in Australia!",
  ],
  new_zealand: [
    "New Zealand has more sheep than people - 6 sheep per person!",
    "It was the first country to give women the right to vote (1893).",
    "Lord of the Rings put NZ on the map - tourism doubled after the films!",
  ],
  
  // More countries (add as needed)
  greece: [
    "Greece has over 6,000 islands, but only 227 are inhabited!",
    "Democracy was invented in Athens over 2,500 years ago.",
    "80% of Greece is mountains - perfect for dramatic sunsets!",
  ],
  thailand: [
    "Thailand means 'Land of the Free' - never colonized by Europeans!",
    "The world's smallest mammal (bumblebee bat) lives in Thailand.",
    "Siamese cats are named after Siam, Thailand's old name!",
  ],
  mexico: [
    "Mexico City is sinking at 10 inches per year due to ancient lake bed!",
    "Mexicans consume more Coca-Cola per capita than any country.",
    "Chocolate, corn, and chili peppers all originated in Mexico!",
  ],
};

export const getCountryFunFact = (countryId: string): string | null => {
  const facts = COUNTRY_FUN_FACTS[countryId];
  if (!facts || facts.length === 0) return null;
  
  // Return random fact
  return facts[Math.floor(Math.random() * facts.length)];
};

export const getAllCountryFacts = (countryId: string): string[] => {
  return COUNTRY_FUN_FACTS[countryId] || [];
};
