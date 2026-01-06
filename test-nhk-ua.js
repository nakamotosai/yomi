const https = require('https');

const url = 'https://www3.nhk.or.jp/news/easy/top-list.json';
// const url = 'https://www3.nhk.or.jp/news/easy/news-list.json';

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
};

https.get(url, options, (res) => {
    console.log('StatusCode:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';

    // Check encoding? binary?
    res.setEncoding('utf8');

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Body Preview:', data.substring(0, 500));
    });

}).on('error', (e) => {
    console.error(e);
});
