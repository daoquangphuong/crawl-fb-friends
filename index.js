const util = require('util');
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
        url: `https://www.facebook.com/${id}`,
    });
    // const fs = require('fs');
    // const path = require('path');
    // fs.writeFileSync(path.resolve(__dirname, 'test.html'), body, 'utf8');
    const resMatch = body.match(/shortProfiles:([\s\S]+?),nearby:/m);
    if(!resMatch){
        throw new Error('Not found friends list');
    }
    let res;
    eval(`res = ${resMatch[1]}`);
    return res;
};

getFriends('daoquang.phuong').then(console.log, console.log);