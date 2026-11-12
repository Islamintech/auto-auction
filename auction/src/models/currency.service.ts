import https from 'https';

type CachedRate = {
    rate: number;
    date?: string;
    fetchedAt: number;
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const USD_KRW_RATE_URL = 'https://api.frankfurter.dev/v2/rate/USD/KRW';

class CurrencyService {
    private usdKrwRate: CachedRate | null = null;

    public async getUsdKrwRate(): Promise<CachedRate> {
        if (this.usdKrwRate && Date.now() - this.usdKrwRate.fetchedAt < CACHE_TTL_MS) {
            return this.usdKrwRate;
        }

        const response = await this.getJson(USD_KRW_RATE_URL);
        const rate = Number(response.rate);

        if (!Number.isFinite(rate) || rate <= 0) {
            throw new Error('Invalid USD/KRW exchange rate response');
        }

        this.usdKrwRate = {
            rate,
            date: typeof response.date === 'string' ? response.date : undefined,
            fetchedAt: Date.now(),
        };

        return this.usdKrwRate;
    }

    private getJson(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            https
                .get(url, (res) => {
                    let body = '';

                    res.on('data', (chunk) => {
                        body += chunk;
                    });

                    res.on('end', () => {
                        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                            reject(new Error(`Exchange rate request failed with status ${res.statusCode}`));
                            return;
                        }

                        try {
                            resolve(JSON.parse(body));
                        } catch (err) {
                            reject(err);
                        }
                    });
                })
                .on('error', reject);
        });
    }
}

export default CurrencyService;
