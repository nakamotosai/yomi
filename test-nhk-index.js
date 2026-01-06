const https = require('https');

const url = 'https://www3.nhk.or.jp/news/easy/index.html';

https.get(url, (res) => {
    console.log('StatusCode:', res.statusCode);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Body Length:', data.length);
        // Look for .json links
        const jsonLinks = data.match(/[\w\-\/\.]+\.json/g) || [];
        console.log('JSON Links found:', jsonLinks);
    });

}).on('error', (e) => {
    console.error(e);
});
