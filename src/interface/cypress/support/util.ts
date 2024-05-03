export function randString(strlen: number) {
  let random_string = '';
  for (let i = 0; i < strlen; i++) {
    random_string += String.fromCharCode(Math.floor(Math.random() * 25 + 97));
  }
  return random_string;
}
