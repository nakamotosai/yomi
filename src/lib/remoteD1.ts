import { D1Database } from './db';

/**
 * 远程 D1 客户端
 * 通过 Cloudflare API 在本地环境操作真实的 D1 数据库
 */
export class RemoteD1Client implements D1Database {
    private apiToken: string;
    private accountId: string;
    private databaseId: string;
    private baseUrl: string;

    constructor(apiToken: string, accountId: string, databaseId: string) {
        this.apiToken = apiToken;
        this.accountId = accountId;
        this.databaseId = databaseId;
        this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
    }

    private async query<T>(sql: string, params: any[] = []): Promise<any> {
        console.log(`[RemoteD1] Query: ${sql}`, params);

        try {
            const response = await fetch(`${this.baseUrl}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sql,
                    params
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[RemoteD1] HTTP ${response.status} Error:`, errorText);
                throw new Error(`D1 Remote Query HTTP Error ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                console.error(`[RemoteD1] D1 API Error:`, data.errors);
                throw new Error(`D1 Remote Query API Error: ${data.errors?.[0]?.message || 'Unknown'}`);
            }

            // Cloudflare D1 Query API returns { result: [ { results, success, meta } ] }
            return data.result[0];
        } catch (err: any) {
            console.error(`[RemoteD1] Fetch/Query Error:`, err.message);
            throw err;
        }
    }

    prepare(query: string): any {
        return {
            bind: (...params: any[]) => ({
                first: async (colName?: string) => {
                    const result = await this.query(query, params);
                    if (!result || !result.results || result.results.length === 0) return null;
                    const row = result.results[0];
                    return colName ? row[colName] : row;
                },
                run: async () => {
                    const result = await this.query(query, params);
                    return { success: result.success, meta: result.meta };
                },
                all: async () => {
                    const result = await this.query(query, params);
                    return { results: result.results, success: result.success, meta: result.meta };
                },
                raw: async () => {
                    const result = await this.query(query, params);
                    return result.results.map((row: any) => Object.values(row));
                }
            })
        };
    }

    async batch(statements: any[]): Promise<any[]> {
        // Simple sequential implementation for now
        const results = [];
        for (const stmt of statements) {
            results.push(await stmt.run());
        }
        return results;
    }

    async exec(query: string): Promise<any> {
        return this.query(query);
    }
}
