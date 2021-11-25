import GUN from 'gun';
import http from 'http';

const server = http.createServer().listen(8080, () => {
    console.log('server is listening on http://localhost:8080/gun')
});
const gun = GUN({web: server});