// Open extension page on click
browser.browserAction.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
});

/****************** REQUEST CAPTURER ****************/
const bind_requests = (process_request_data) => {
    const save_response_listener = details => {
        const filter = browser.webRequest.filterResponseData(details.requestId);

        const content_frags = [];

        filter.ondata = event => {
            content_frags.push(new Uint8Array(event.data));
            filter.write(event.data);
        }

        filter.onstop = event => {
            let all_len = 0;
            content_frags.forEach(f => {
                all_len += f.length;
            });

            const joined = new Uint8Array(all_len);
            let pos = 0;
            content_frags.forEach(f => {
                joined.set(f, pos);
                pos += f.length;
            });
            
            const jsonString = new TextDecoder("utf-8").decode(joined)
            const parsed = JSON.parse(jsonString);

            process_request_data(details.url, parsed);
            filter.close();
        }
    };

    browser.webRequest.onBeforeRequest.addListener(
        save_response_listener,
        { urls: ["https://tinder.com/", "https://api.gotinder.com/*"] },
        ["blocking"]
    );
};

/****************** STORAGE ****************/
const database_name = "request_storage";
const db_request = indexedDB.open(database_name, 2);

db_request.onupgradeneeded = (event) => {
    const db = event.target.result;
    db.createObjectStore("requests", { keyPath: "id", autoIncrement: true });
};

db_request.onsuccess = (event) => {
    const db = event.target.result;

    bind_requests((request_url, request_data) => {
        console.log('Captured request `', request_url, '`');
        const store = db.transaction("requests", "readwrite").objectStore("requests");
        store.add({ request_url: request_url, timestamp: Date.now(), content: request_data })
    });
};

console.log('Loaded tinder inspector');