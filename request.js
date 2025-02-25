const fetchPort = async()=>{
    try {
        const response = await fetch('../../../../backend/db/config.json');
        if(response.ok){
            const data = await response.json();
            const port = data.system.port
            return port;
        }
    } catch (error) {
        throw error;
    }
}

const fetchRequest = async (route, body = null) => {
    const PORT = await fetchPort();
    const BASE_URL = "http://localhost:3000/api/simba-systems/";
    const REPLACEMENT_URL = `http://localhost:${PORT}/api/pixelwave-systems/`;
    const token = localStorage.getItem('token');

    if (body) {
        body = { ...body, token };
    } else {
        body = { token };
    }

    const fullRoute = route.replace(BASE_URL, REPLACEMENT_URL);

    const response = await fetch(fullRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    return response;
};
