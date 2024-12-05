import natural from 'natural';
const { JaroWinklerDistance } = natural;


export async function verifySecurityAnswer(userInput, correctAnswer) {
  const similarityThreshold = 0.7;
  const similarity = JaroWinklerDistance(userInput, correctAnswer);
  return similarity >= similarityThreshold;
}
