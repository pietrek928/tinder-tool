
const get_url_name = url => url.split('?')[0].split('/v2/').at(-1);

const get_choinces_lines = selected_descriptors => {
    lines = [];
    if (selected_descriptors) {
        selected_descriptors.forEach(descr => {
            let d = descr.name + ':';
            if (descr.choice_selections) {
                descr.choice_selections.forEach(s => {
                    d += ' ' + s.name;
                });
            }
            lines.push(d);
        });
    }
    return lines;
};

const get_bio_lines = bio => {
    lines = [];
    if (bio) {
        lines.push(...bio.split('\n'));
    }
    return lines;
};

const get_city_lines = city => {
    if (city) return ['City: ' + city.name];
    return [];
};

const get_distance_lines = distance_mi => {
    if (distance_mi === undefined) return [];
    const distance_km = Math.round(distance_mi * 1.60934);
    return [`Distance: ${distance_km} km`]
};

const get_activity_lines = user_descr => {
    let a = '';
    if (user_descr.online_now) {
        a += ' online'
    }
    if (user_descr.recently_active) {
        a += ' active'
    }
    if (a) return [a]; else return [];
};

const get_teasers_lines = teasers => {
    const lines = [];
    if (teasers) {
        teasers.forEach(teaser => {
            lines.push(`${teaser.type}: ${teaser.string}`);
        });
    }
    return lines
};

const get_bith_date_descr = birth_date => {
    const date = Date.parse(birth_date);
    const age = ~~((Date.now() - date) / (31557600000));
    return 'Age: ' + age;
};

const get_interests_lines = user_interests => {
    if (!user_interests) return [];
    let s = 'Interests: ';
    user_interests.forEach(interest => {
        s += ' ' + interest.name;
        if (interest.is_common) {
            s += '❤️';
        }
    });
    return [s];
};

const get_intent_lines = intent => {
    if (!intent) return [];

    return [intent.emoji + intent.body_text];
};

const get_user_description_lines = user => {
    return [
        user.user.name,
        ...get_activity_lines(user.user),
        get_bith_date_descr(user.user.birth_date),
        // 'user id: ' + user.user._id,
        ...get_city_lines(user.user.city),
        ...get_distance_lines(user.distance_mi),
        ...get_intent_lines(user.user.relationship_intent),
        ...get_interests_lines(user?.experiment_info?.user_interests?.selected_interests),
        ...get_choinces_lines(user.user.selected_descriptors),
        ...get_teasers_lines(user.teasers),
        ...get_bio_lines(user.user.bio),
    ];
};

const get_full_photo_urls = user => {
    urls = [];
    user.user.photos.forEach(photo => {
        urls.push(photo.url);
    });
    if (user.instagram && user.instagram.photos) {
        user.instagram.photos.forEach(photo => {
            urls.push(photo.image);
        });
    }
    return urls;
};

const get_photo_min_url = (photo, min_num) => {
    return photo.processedFiles[min_num].url;
};

const get_user_tile_photo = user => {
    return get_photo_min_url(user.user.photos[0], 1);
};

const describe_user = user => {
    const div = document.createElement('div');

    const im = document.createElement('img');
    im.src = get_user_tile_photo(user);
    im.onclick = () => show_all_user_photos(user);
    div.appendChild(im);

    get_user_description_lines(user).forEach(ln => {
        dd = document.createElement('div');
        dd.innerText = ln;
        div.appendChild(dd);
    });
    return div;
};

const prepare_users_tiles = users_data => {
    const users_tiles = document.createElement('div');
    users_tiles.className = 'users-tiles';
    users_data.forEach(user => {
        const td = document.createElement('td');
        td.className = 'user-tile';
        td.appendChild(describe_user(user));
        users_tiles.appendChild(td);
    });

    const table = document.createElement('div');
    table.appendChild(users_tiles);

    const photos_div = document.createElement('div');
    photos_div.id = 'all-photos';
    table.appendChild(photos_div);

    return table;
};

const show_request = (request) => {
    const request_info = document.getElementById('request_info');
    request_info.innerHTML = '';
    request_info.appendChild(
        prepare_users_tiles(request.content.data.results)
    );
};

const show_all_user_photos = user => {
    const photos_tr = document.getElementById('all-photos');
    photos_tr.innerHTML = '';

    get_full_photo_urls(user).forEach(url => {
        const im = document.createElement('img');
        im.src = url;
        im.className = 'presentation-photo';
        photos_tr.appendChild(im);
    });
};

const get_request_list_item = request => {
    const url_name = get_url_name(request.request_url);
    if (url_name === 'recs/core' || url_name === 'my-likes') {
        const results = request.content.data.results;
        if (!results) {
            return;
        }

        const div = document.createElement('div');
        div.className = 'request-item';
        console.log(request.content);
        let txt = url_name === 'my-likes' ? 'My likes' : 'Find people';
        txt += `(${request.content.data.results.length})`;
        div.innerText = txt;
        return div;
    }
};

const render_requests_list = (requests) => {
    const list_container = document.getElementById("requests_list");
    list_container.innerHTML = '';
    requests.forEach(request => {
        const item = get_request_list_item(request);
        if (item !== undefined) {
            item.onclick = () => show_request(request);
            list_container.appendChild(item);
        }
    });
};

const database_name = "request_storage";
const db_request = indexedDB.open(database_name, 2);

db_request.onupgradeneeded = (event) => {
    const db = event.target.result;
    db.createObjectStore("requests", { keyPath: "id", autoIncrement: true });
};

db_request.onsuccess = (event) => {
    const db = event.target.result;

    const load_requests = (url_filter, start_time, end_time) => {
        const store = db.transaction("requests", "readonly").objectStore("requests");
        const get_all = store.getAll();  // TODO: use index to speed up ?
        get_all.onsuccess = () => {
            const filtered = get_all.result.filter(
                record => {
                    if (url_filter && !record['request_url'].includes(url_filter)) return false;
                    if (start_time && record['timestamp'] < start_time) return false;
                    if (end_time && record['timestamp'] > end_time) return false;
                    return true;
                }
            );
            render_requests_list(filtered);
        };
    };

    document.getElementById("load_requests").onclick = () => {
        load_requests();
    };
};