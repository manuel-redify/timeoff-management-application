const crypto = require('crypto');
const crypto_secret = "!2~`HswpPPLa22+=±§sdq qwe,appp qwwokDF_";

function hashify_password(password) {
    return crypto
        .createHash('md5')
        .update(
            password + crypto_secret,
            'binary'
        )
        .digest('hex');
}

const passwords = ['test', 'password', 'Tony', 'admin'];
passwords.forEach(p => {
    console.log(`${p}: ${hashify_password(p)}`);
});
