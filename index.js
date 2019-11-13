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

const parseFriends = (body) => {
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
            if (!friend.id || !friend.name) {
                return;
            }
            res.push(friend);
        });
    });
    return res;
};

const getNextFriends = async ({userId, token, collection, profile, pageLet} = {}, cursor) => {
    const {body} = await request({
        url: 'https://www.facebook.com/ajax/pagelet/generic.php/AllFriendsAppCollectionPagelet',
        method: 'GET',
        qs: {
            fb_dtsg_ag: token,
            data: JSON.stringify({
                "collection_token": collection,
                "cursor": cursor || '',
                "disablepager": false,
                "overview": false,
                "profile_id": profile,
                "pagelet_token": pageLet,
                "tab_key": "friends",
                // "lst": "100002698673284:100003875776180:1573632615",
                "order": null,
                "sk": "friends",
                "importer_state": null
            }),
            __user: userId,
            __a: '1',
        },
    });

    // const fs = require('fs');
    // const path = require('path');
    // fs.writeFileSync(path.resolve(__dirname, 'test2.html'), body, 'utf8');

    const json = JSON.parse(body.replace('for (;;);', ''));
    const res = parseFriends(`<body><code>${json.payload}</code></body>`);

    const abc = json.jsmods.require.find(i => i && i[0] === 'TimelineAppCollection' && i[1] === 'enableContentLoader');
    const next = abc[3][2];

    return {
        list: res,
        next,
    }
};

const getFriends = async (id, maxPage = 10) => {
    const {body} = await request({
        url: `https://www.facebook.com/${id}/friends`,
    });
    // const fs = require('fs');
    // const path = require('path');
    // fs.writeFileSync(path.resolve(__dirname, 'test.html'), body, 'utf8');

    const nameMatch = body.match(/<title id="pageTitle">(.*?)<\/title>/);
    const userIdMatch = body.match(/"USER_ID":"(.*?)"/);
    const tokenMatch = body.match(/async_get_token":"(.*?)"/);
    const collectionMatch = body.match(/"pagelet_timeline_app_collection_(.*?)"/);
    const profileMatch = body.match(/"entity_id":"(.*?)"/);
    const pageLetMatch = body.match(/pagelet_token:"(.*?)"/);

    const name = nameMatch[1];
    const userId = userIdMatch[1];
    const token = tokenMatch[1];
    const collection = collectionMatch[1];
    const profile = profileMatch[1];
    const pageLet = pageLetMatch[1];

    const data = {userId, token, collection, profile, pageLet};

    const list = [];
    let times = 0;
    const loop = async (cursor) => {
        times += 1;
        if (times > maxPage) {
            return;
        }
        console.log(`${id} - Crawling Page ${times}: ${name}`);
        const res = await getNextFriends(data, cursor);
        Array.prototype.push.apply(list, res.list);
        if (res.next) {
            return loop(res.next);
        }
    };

    await loop();
    console.log(`${id} - Crawl DONE: ${name}`);

    return list;
};

getFriends('daoquang.phuong').then(console.log, console.log);