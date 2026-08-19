import DopplerSDK from '@dopplerhq/node-sdk'
import "dotenv/config";

const doppler = new DopplerSDK({ accessToken: process.env.DROPLER_ACCESS_TOKEN });

export async function updateDopplerSecrets(cookie) {
    const input = {
        config: 'prd',
        project: 'hbcc-ci',
        secrets: {
            TIDYHQ_WEB_USERNAME: process.env.TIDYHQ_WEB_USERNAME,
            TIDYHQ_WEB_PASSWORD: process.env.TIDYHQ_WEB_PASSWORD,
            TIDYHQ_COOKIE: cookie || process.env.TIDYHQ_COOKIE
        }
    };
    const result = await doppler.secrets.update(input);
}

export async function getDopplerSecrets() {
    const input = {
        config: 'prd',
        project: 'hbcc-ci',
        name: 'TIDYHQ_COOKIE'
    };
    const result = await doppler.secrets.get(input.project, input.config, input.name);
    return {
        TIDYHQ_COOKIE: result.value.raw
    };
}