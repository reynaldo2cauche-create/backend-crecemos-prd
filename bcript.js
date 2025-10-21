import * as bcrypt from 'bcrypt';

const plainPassword = '1234';
const hash = await bcrypt.hash(plainPassword, 10);
console.log('Hashed password:', hash);