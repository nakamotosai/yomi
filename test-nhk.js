const https = require('https');

// const url = 'https://www3.nhk.or.jp/news/easy/top-list.json';
const url = 'https://www3.nhk.or.jp/news/easy/news-list.json';

https.get(url, (res) => {
    console.log('StatusCode:', res.statusCode);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Body Preview:', data.substring(0, 500));
    });

}).on('error', (e) => {
    console.error(e);
});
