import GUN from 'gun'; // in ESM
import { v4 as uuidv4 } from 'uuid';

const gun = GUN('http://localhost:8080/gun');

const quill = new Quill('#editor', {
    theme: 'snow'
});

let uuid = (new URL(document.location)).searchParams.get('uuid');
if (!uuid) {
    uuid = uuidv4();
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('uuid', uuid);
    window.location.search = searchParams.toString();

    gun.get(uuid).put({
        delta: JSON.stringify(quill.getContents()),
        range: JSON.stringify(quill.getSelection())
    });
}

gun.get(uuid).on((data, key) => {
    console.log("data updates:", data);
    quill.setContents(JSON.parse(data.delta), 'api');
    quill.setSelection(JSON.parse(data.range), 'api');
});

quill.on('editor-change', function (eventName, ...args) {
    console.log('eventName', eventName)
    if (eventName === 'text-change') {
        const [_a, _b, source] = args;
        if (source === 'user') {
            gun.get(uuid).put({
                delta: JSON.stringify(quill.getContents()),
                range: JSON.stringify(quill.getSelection()),
            })
        }
    } else if (eventName === 'selection-change') {
        const [_a, _b, source] = args;
        if (source === 'user') {
            gun.get(uuid).get('range').put(JSON.stringify(quill.getSelection()));
        }
    }
});