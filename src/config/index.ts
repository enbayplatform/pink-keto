interface Config {
  api: {
    vnpaysign: string;
    scan: string;
    hello: string;
    createpayment: string;
    airequest: string;
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
const PRODUCTION_API_BASE = 'asia-east1-boringketo.cloudfunctions.net';
//https://scan-111834125610.us-central1.run.app
//https://hello2-111834125610.us-central1.run.app

const config: Config = {
  api: {
    hello: !USE_PRODUCTION ? `${LOCAL_API_BASE}/hello2` : `https://hello2${PRODUCTION_API_BASE}/hello2`,
    vnpaysign: !USE_PRODUCTION ? `${LOCAL_API_BASE}/vnpaysign` : `https://upload${PRODUCTION_API_BASE}/vnpaysign`,
    scan: !USE_PRODUCTION ? `${LOCAL_API_BASE}/scan` : `https://${PRODUCTION_API_BASE}/scan`,
    createpayment: !USE_PRODUCTION ? `${LOCAL_API_BASE}/createpayment` : `https://${PRODUCTION_API_BASE}/createpayment`,
    airequest: !USE_PRODUCTION ? `${LOCAL_API_BASE}/airequest` : `https://${PRODUCTION_API_BASE}/airequest`
  },
};

export default config;