interface Config {
  api: {
    upload: string;
    scan: string;
    hello: string;
    rescan: string;
  };
}

let USE_PRODUCTION = false //process.env.NODE_ENV !== 'development';

if (process.env.FIREBASE_MODE === 'live') {
  USE_PRODUCTION = true;
}
else if (process.env.NODE_ENV === 'development') {
  USE_PRODUCTION = false;
}
else{
  USE_PRODUCTION = true
}
//https://hello2-111834125610.us-central1.run.app/

const LOCAL_API_BASE = 'http://127.0.0.1:5001/boringketo/asia-east1';// 'http://127.0.0.1:5001/boringketo/us-central1';
const PRODUCTION_API_BASE = '-111834125610.us-central1.run.app';
//https://scan-111834125610.us-central1.run.app
//https://hello2-111834125610.us-central1.run.app

const config: Config = {
  api: {
    hello: !USE_PRODUCTION ? `${LOCAL_API_BASE}/hello2` : `https://hello2${PRODUCTION_API_BASE}`,
    upload: !USE_PRODUCTION ? `${LOCAL_API_BASE}/upload` : `https://upload${PRODUCTION_API_BASE}`,
    scan: !USE_PRODUCTION ? `${LOCAL_API_BASE}/scan` : `https://scan${PRODUCTION_API_BASE}`,
    rescan: !USE_PRODUCTION ? `${LOCAL_API_BASE}/rescan` : `https://rescan${PRODUCTION_API_BASE}`
  },
};

export default config;