const util = require('util');
const URL = require('url');
const qs = require('querystring');
const cheerio = require('cheerio');
const requestModule = require('request');
const requestPromise = util.promisify(requestModule);

const COOKIE = '';

const jar = requestModule.jar();
COOKIE.split('; ').forEach((cookie) => {
    jar.setCookie(cookie, 'https://www.facebook.com');
});

const request = requestPromise.defaults({
    headers: {
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36'
    },
    gzip: true,
    jar: jar
});

const getFriends = async (id) => {
    const {body} = await request({
        url: `https://www.facebook.com/${id}/friends`,
    });
    // const fs = require('fs');
    // const path = require('path');
    // fs.writeFileSync(path.resolve(__dirname, 'test.html'), body, 'utf8');
    const res = [];
    const $ = cheerio.load(body, {decodeEntities: false});
    const codeList = $('code').toArray();
    codeList.forEach((codeTag) => {
        const code = $(codeTag).html();
        const $ul = cheerio.load(code.substring(3, code.length - 6), {decodeEntities: false});
        $ul('a[data-hovercard-prefer-more-content-show][data-hovercard]').toArray().forEach((item) => {
            const child = $(item);
            const hoverUrl = URL.parse(child.attr('data-hovercard'));
            const hoverQs = qs.parse(hoverUrl.query);
            const friend = {
                id: hoverQs.id,
                name: child.text(),
            };
            if(!friend.id || !friend.name){
                return;
            }
            res.push(friend);
        });
    });
    return res;
};

getFriends('daoquang.phuong').then(console.log, console.log);